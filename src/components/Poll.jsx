import { useRef, useState } from 'react'

const ORDER = ['NOR', 'DRW', 'ENG']
/* Seeded crowd counts stand in for the poll service until the backend
   endpoint exists; the visitor's own vote is layered on top locally. */
const SEED = { NOR: 5214, DRW: 1544, ENG: 7409 }
const KEY = 'whowins-poll-nor-eng-qf'

/* localStorage throws when storage is blocked (sandboxed iframe, cookies
   disabled, some private modes). The poll must degrade to session-only
   voting, never take the page down. */
const storage = {
  get() {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(v) {
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* vote still counts for this session */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing to clear */
    }
  },
}

export default function Poll({ outcomes }) {
  const [vote, setVote] = useState(() => {
    const v = storage.get()
    return ORDER.includes(v) ? v : null
  })
  const resultsRef = useRef(null)
  const firstChoiceRef = useRef(null)

  const cast = (k) => {
    storage.set(k)
    setVote(k)
    requestAnimationFrame(() => resultsRef.current?.focus())
  }
  const clear = () => {
    storage.clear()
    setVote(null)
    requestAnimationFrame(() => firstChoiceRef.current?.focus())
  }

  const counts = { ...SEED }
  if (vote) counts[vote] += 1
  const total = ORDER.reduce((s, k) => s + counts[k], 0)

  return (
    <div className="poll">
      <h4>Who wins? Cast your vote</h4>
      {!vote ? (
        <div className="choices">
          {ORDER.map((k, i) => (
            <button
              key={k}
              ref={i === 0 ? firstChoiceRef : undefined}
              className="choice"
              onClick={() => cast(k)}
            >
              {outcomes[k].label}
            </button>
          ))}
        </div>
      ) : (
        <div className="results-wrap" role="status" ref={resultsRef} tabIndex={-1}>
          <div className="results">
            {ORDER.map((k) => (
              <div className="result" key={k}>
                <span className="lbl">
                  {outcomes[k].label}
                  {k === vote ? ' ✓' : ''}
                </span>
                <span className="track">
                  <span
                    className="fill"
                    style={{ width: `${(counts[k] / total) * 100}%`, background: outcomes[k].color }}
                  />
                </span>
                <span className="val">{Math.round((counts[k] / total) * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="pollmeta">
            <span>
              {total.toLocaleString()} votes · You picked {outcomes[vote].label}
            </span>
            <button className="change" onClick={clear}>
              Change vote
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
