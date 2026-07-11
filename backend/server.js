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
  res.set('Access-Control-Allow-Headers', 'Content-Type')
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

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`poll api listening on :${port}`))
