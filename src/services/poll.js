/**
 * Poll service. Currently a seeded local stand-in; the UI is written
 * against this interface so the backend swap is contained to this file.
 *
 * TODO(backend): replace getCounts/castVote with the real endpoint —
 *   GET  /api/poll/:matchId          → { counts: {NOR, DRW, ENG}, closesAt }
 *   POST /api/poll/:matchId { pick } → same shape, deduped server-side
 * and delete SEED.
 */
const SEED = { NOR: 5214, DRW: 1544, ENG: 7409 }
const KEY = 'whowins-poll-nor-eng-qf'

/* localStorage throws when storage is blocked (sandboxed iframe, cookies
   disabled, some private modes). Voting must degrade to session-only,
   never take the page down. */
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

export function getCounts(vote) {
  const counts = { ...SEED }
  if (vote) counts[vote] += 1
  return counts
}
