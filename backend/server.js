/**
 * whowins.soccer poll API — Cloud Run + Firestore.
 *
 *   GET  /api/poll/:matchId                    → { counts, total, closesAt? }
 *   POST /api/poll/:matchId { pick, voterId }  → same shape; pick=null retracts
 *
 * One vote per voterId (client UUID); changing a pick moves the count in a
 * transaction. IP + user agent are stored on each vote doc for auditing.
 *
 * Firestore layout:
 *   whowins_polls/{matchId}                 { counts: {NOR,DRW,ENG}, closesAt? }
 *   whowins_polls/{matchId}/votes/{voterId} { pick, ip, firstIp, userAgent, ... }
 *
 * Counts live on a single doc (~1 sustained write/sec). Fine for this poll;
 * shard the counter before putting this in front of real traffic.
 */
import express from 'express'
import { Firestore, FieldValue } from '@google-cloud/firestore'

const db = new Firestore()
const app = express()
app.use(express.json())

const PICKS = ['NOR', 'DRW', 'ENG']
const ZERO = { NOR: 0, DRW: 0, ENG: 0 }
const MATCH_ID_RE = /^[a-z0-9-]{1,64}$/
const VOTER_ID_RE = /^[A-Za-z0-9-]{8,64}$/

/* Public poll: any origin may read and vote. */
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

/* Cloud Run appends the connecting client's IP as the last entry of
   X-Forwarded-For; earlier entries are client-supplied and untrusted. */
function clientIp(req) {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length) {
    const parts = xff.split(',')
    return parts[parts.length - 1].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

function pollRef(matchId) {
  return db.collection('whowins_polls').doc(matchId)
}

function shape(counts, closesAt) {
  const total = PICKS.reduce((s, k) => s + (counts[k] || 0), 0)
  return { counts, total, ...(closesAt ? { closesAt } : {}) }
}

/* /healthz is reserved by Google's frontend on run.app and never reaches
   the container — keep the health probe under /api. */
app.get('/api/health', (req, res) => res.json({ ok: true }))

/* ---------------------------------------------------------------------
 * Live scores: proxy API-Football through a shared 60s cache so every
 * visitor draws from ONE upstream request budget (free tier: 100/day).
 * Single-flight guard collapses concurrent misses into one upstream call.
 * ------------------------------------------------------------------- */
const FOOTBALL_KEY = process.env.APIFOOTBALL_KEY || ''
const LIVE_TTL_MS = 60_000
let liveCache = { at: 0, data: null }
let liveInflight = null

async function fetchUpstreamLive() {
  const r = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
    headers: { 'x-rapidapi-key': FOOTBALL_KEY },
  })
  if (!r.ok) throw new Error(`upstream ${r.status}`)
  const body = await r.json()
  /* API-Sports reports auth/quota/suspension failures as HTTP 200 with
     an errors object — never cache those as "no live games" */
  if (body.errors && Object.keys(body.errors).length) {
    throw new Error(`upstream error: ${JSON.stringify(body.errors)}`)
  }
  const fixtures = (body.response || []).map((f) => ({
    id: f.fixture?.id,
    minute: f.fixture?.status?.elapsed ?? null,
    status: f.fixture?.status?.short ?? '',
    league: f.league?.name ?? '',
    home: f.teams?.home?.name ?? '',
    away: f.teams?.away?.name ?? '',
    homeGoals: f.goals?.home ?? 0,
    awayGoals: f.goals?.away ?? 0,
  }))
  liveCache = { at: Date.now(), data: { fixtures, fetchedAt: new Date().toISOString() } }
  return liveCache.data
}

app.get('/api/live', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=30')
  if (!FOOTBALL_KEY) return res.status(503).json({ error: 'live scores not configured' })
  if (liveCache.data && Date.now() - liveCache.at < LIVE_TTL_MS) {
    return res.json(liveCache.data)
  }
  try {
    if (!liveInflight) {
      liveInflight = fetchUpstreamLive().finally(() => {
        liveInflight = null
      })
    }
    res.json(await liveInflight)
  } catch (err) {
    console.error('live proxy failed', err)
    /* stale beats nothing */
    if (liveCache.data) return res.json(liveCache.data)
    res.status(502).json({ error: 'upstream failed' })
  }
})

app.get('/api/poll/:matchId', async (req, res) => {
  const { matchId } = req.params
  if (!MATCH_ID_RE.test(matchId)) return res.status(400).json({ error: 'bad matchId' })
  try {
    const snap = await pollRef(matchId).get()
    const data = snap.exists ? snap.data() : {}
    res.json(shape({ ...ZERO, ...data.counts }, data.closesAt))
  } catch (err) {
    console.error('GET poll failed', err)
    res.status(500).json({ error: 'internal' })
  }
})

app.post('/api/poll/:matchId', async (req, res) => {
  const { matchId } = req.params
  const { pick = null, voterId } = req.body || {}
  if (!MATCH_ID_RE.test(matchId)) return res.status(400).json({ error: 'bad matchId' })
  if (typeof voterId !== 'string' || !VOTER_ID_RE.test(voterId))
    return res.status(400).json({ error: 'bad voterId' })
  if (pick !== null && !PICKS.includes(pick)) return res.status(400).json({ error: 'bad pick' })

  const ip = clientIp(req)
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 256)

  try {
    const result = await db.runTransaction(async (tx) => {
      const pRef = pollRef(matchId)
      const vRef = pRef.collection('votes').doc(voterId)
      const [pSnap, vSnap] = await Promise.all([tx.get(pRef), tx.get(vRef)])
      const data = pSnap.exists ? pSnap.data() : {}
      const counts = { ...ZERO, ...data.counts }

      if (data.closesAt && Date.now() > new Date(data.closesAt).getTime()) {
        return { closed: true, counts, closesAt: data.closesAt }
      }

      const prev = vSnap.exists ? vSnap.data().pick : null
      if (prev !== pick) {
        if (prev) counts[prev] = Math.max(0, counts[prev] - 1)
        if (pick) counts[pick] += 1
        tx.set(pRef, { counts, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
        if (pick) {
          tx.set(
            vRef,
            {
              pick,
              ip,
              userAgent,
              updatedAt: FieldValue.serverTimestamp(),
              ...(vSnap.exists ? {} : { firstIp: ip, createdAt: FieldValue.serverTimestamp() }),
            },
            { merge: true }
          )
        } else {
          tx.delete(vRef)
        }
      }
      return { counts, closesAt: data.closesAt }
    })

    if (result.closed) return res.status(409).json({ error: 'closed', ...shape(result.counts, result.closesAt) })
    res.json(shape(result.counts, result.closesAt))
  } catch (err) {
    console.error('POST vote failed', err)
    res.status(500).json({ error: 'internal' })
  }
})

/* ---------------------------------------------------------------------
 * Hermes prediction: JSON document the in-game Hermes agent pushes to.
 * Reads are public; writes need the PREDICTION_TOKEN bearer secret.
 *
 *   GET  /api/prediction/:matchId → { pick, blurb, reasoning, agents, updatedAt }
 *   POST /api/prediction/:matchId (Authorization: Bearer <token>) → { ok }
 * ------------------------------------------------------------------- */
const PREDICTION_TOKEN = process.env.PREDICTION_TOKEN || ''
const predRef = (matchId) => db.collection('whowins_predictions').doc(matchId)
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null)

function sanitizePrediction(body) {
  const pick = body?.pick
  if (!PICKS.includes(pick)) return null
  const blurb = str(body.blurb, 500)
  if (!blurb) return null
  const reasoning = Array.isArray(body.reasoning)
    ? body.reasoning
        .slice(0, 8)
        .map((r) => ({ title: str(r?.title, 80), body: str(r?.body, 600) }))
        .filter((r) => r.title && r.body)
    : []
  const agents = Array.isArray(body.agents)
    ? body.agents
        .slice(0, 8)
        .map((a) => ({ id: str(a?.id, 40), desc: str(a?.desc, 120), lean: str(a?.lean, 80) }))
        .filter((a) => a.id && a.lean)
    : []
  const source = str(body.source, 120) || 'Hermes'
  return { pick, blurb, reasoning, agents, source }
}

app.get('/api/prediction/:matchId', async (req, res) => {
  const { matchId } = req.params
  if (!MATCH_ID_RE.test(matchId)) return res.status(400).json({ error: 'bad matchId' })
  try {
    const snap = await predRef(matchId).get()
    if (!snap.exists) return res.status(404).json({ error: 'no prediction yet' })
    const d = snap.data()
    res.json({
      ...d.payload,
      updatedAt: d.updatedAt?.toDate?.().toISOString() ?? null,
    })
  } catch (err) {
    console.error('GET prediction failed', err)
    res.status(500).json({ error: 'internal' })
  }
})

app.post('/api/prediction/:matchId', async (req, res) => {
  const { matchId } = req.params
  if (!MATCH_ID_RE.test(matchId)) return res.status(400).json({ error: 'bad matchId' })
  const auth = req.headers.authorization || ''
  if (!PREDICTION_TOKEN || auth !== `Bearer ${PREDICTION_TOKEN}`)
    return res.status(401).json({ error: 'unauthorized' })
  const payload = sanitizePrediction(req.body)
  if (!payload) return res.status(400).json({ error: 'bad prediction payload' })
  try {
    await predRef(matchId).set({ payload, updatedAt: FieldValue.serverTimestamp() })
    res.json({ ok: true })
  } catch (err) {
    console.error('POST prediction failed', err)
    res.status(500).json({ error: 'internal' })
  }
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`poll api listening on :${port}`))
