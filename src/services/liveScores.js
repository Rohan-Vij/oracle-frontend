/**
 * Live fixtures via our own backend (/api/live), which proxies
 * API-Football behind a shared 60s cache — one upstream request serves
 * every visitor, and the API key never ships to the client.
 */
import { API_BASE } from './poll.js'

export async function fetchLiveFixtures() {
  try {
    const r = await fetch(`${API_BASE}/api/live`)
    if (!r.ok) return null
    const data = await r.json()
    return data.fixtures || []
  } catch {
    return null
  }
}
