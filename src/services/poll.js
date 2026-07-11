/**
 * Poll service backed by the Cloud Run API (backend/):
 *   GET  /api/poll/:matchId                    → { counts, total, closesAt? }
 *   POST /api/poll/:matchId { pick, voterId }  → same shape, deduped by voterId
 *
 * Every network call resolves to null on failure — the UI falls back to
 * localCounts() so voting degrades to session-only, never takes the page down.
 */
export const MATCH_ID = 'nor-eng-qf'

const API_BASE =
  import.meta.env.VITE_POLL_API || 'https://whowins-poll-api-176753051774.us-central1.run.app'

const KEY = 'whowins-poll-nor-eng-qf'
const VOTER_KEY = 'whowins-voter-id'

/* Offline fallback only — real counts come from the backend. */
const SEED = { NOR: 5214, DRW: 1544, ENG: 7409 }

/* localStorage throws when storage is blocked (sandboxed iframe, cookies
   disabled, some private modes). */
export function readVote() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function persistVote(pick) {
  try {
    localStorage.setItem(KEY, pick)
  } catch {
    /* vote still counts for this session */
  }
}

export function clearVote() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}

function uuid() {
  try {
    return crypto.randomUUID()
  } catch {
    return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  }
}

/* Stable anonymous id so the server can dedupe and let you change your vote.
   Falls back to a per-session id when storage is blocked. */
let sessionVoterId = null
function getVoterId() {
  try {
    let id = localStorage.getItem(VOTER_KEY)
    if (!id) {
      id = uuid()
      localStorage.setItem(VOTER_KEY, id)
    }
    return id
  } catch {
    if (!sessionVoterId) sessionVoterId = uuid()
    return sessionVoterId
  }
}

export async function fetchCounts() {
  try {
    const r = await fetch(`${API_BASE}/api/poll/${MATCH_ID}`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

/* pick = 'NOR' | 'DRW' | 'ENG' to vote, null to retract. */
export async function castVote(pick) {
  try {
    const r = await fetch(`${API_BASE}/api/poll/${MATCH_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pick, voterId: getVoterId() }),
    })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export function localCounts(vote) {
  const counts = { ...SEED }
  if (vote) counts[vote] += 1
  return counts
}
