/**
 * Hermes's live prediction from the backend. The in-game Hermes agent
 * POSTs updates to /api/prediction/:matchId (bearer-token protected);
 * the site polls the public GET and falls back to the static FEED copy
 * until the first push lands.
 */
import { API_BASE, MATCH_ID } from './poll.js'

export async function fetchPrediction() {
  try {
    const r = await fetch(`${API_BASE}/api/prediction/${MATCH_ID}`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export async function fetchPredictionHistory() {
  try {
    const r = await fetch(`${API_BASE}/api/prediction/${MATCH_ID}/history`)
    if (!r.ok) return null
    const data = await r.json()
    return data.entries || []
  } catch {
    return null
  }
}
