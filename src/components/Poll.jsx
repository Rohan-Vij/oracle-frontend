import { useEffect, useRef, useState } from 'react'
import {
  readVote,
  persistVote,
  clearVote,
  fetchCounts,
  castVote,
  localCounts,
} from '../services/poll.js'

const ORDER = ['NOR', 'ENG'] /* two-way ballot: draw removed */

/* Optimistically move a vote between buckets while the POST is in flight. */
function shifted(live, from, to) {
  if (!live) return live
  const counts = { ...live.counts }
  if (from && counts[from] > 0) counts[from] -= 1
  if (to) counts[to] = (counts[to] || 0) + 1
  return { ...live, counts, total: ORDER.reduce((s, k) => s + (counts[k] || 0), 0) }
}

export default function Poll({ outcomes, flagSrcs, modelPick, prediction, updated }) {
  const [vote, setVote] = useState(() => {
    const v = readVote()
    return ORDER.includes(v) ? v : null
  })
  /* null until the backend answers; localCounts() covers the gap/offline. */
  const [live, setLive] = useState(null)
  const resultsRef = useRef(null)
  const firstChoiceRef = useRef(null)

  /* Guards against out-of-order responses: only the latest request may
     write counts (e.g. slow initial GET landing after a vote POST). */
  const reqSeq = useRef(0)
  const applyIfCurrent = (seq) => (d) => {
    if (d && seq === reqSeq.current) setLive(d)
  }

  useEffect(() => {
    const seq = reqSeq.current
    fetchCounts().then(applyIfCurrent(seq))
  }, [])

  /* live tally: refresh every 15s while the tab is visible */
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      const seq = reqSeq.current
      fetchCounts().then(applyIfCurrent(seq))
    }, 15_000)
    return () => clearInterval(id)
  }, [])

  const cast = (k) => {
    persistVote(k)
    setLive((p) => shifted(p, vote, k))
    setVote(k)
    const seq = ++reqSeq.current
    castVote(k).then(applyIfCurrent(seq))
    requestAnimationFrame(() => resultsRef.current?.focus())
  }
  const clear = () => {
    clearVote()
    setLive((p) => shifted(p, vote, null))
    setVote(null)
    const seq = ++reqSeq.current
    castVote(null).then(applyIfCurrent(seq))
    requestAnimationFrame(() => firstChoiceRef.current?.focus())
  }

  const counts = live?.counts ?? localCounts(vote)
  const total = ORDER.reduce((s, k) => s + (counts[k] || 0), 0)
  const pct = (k) => (total > 0 ? (counts[k] / total) * 100 : 0)
  const withModel = vote === modelPick

  return (
    <div className="poll">
      <h4>Who wins? Cast your vote</h4>
      {!vote ? (
        <div className="choices">
          {ORDER.map((k, i) => (
            <button
              key={k}
              ref={i === 0 ? firstChoiceRef : undefined}
              className={`choice ${k.toLowerCase()}`}
              onClick={() => cast(k)}
            >
              <img className="cflag" src={flagSrcs[k]} alt="" aria-hidden="true" />
              {outcomes[k].label}
            </button>
          ))}
        </div>
      ) : (
        <div className="results-wrap" role="status" ref={resultsRef} tabIndex={-1}>
          <div className="results">
            {ORDER.map((k) => (
              <div
                className={`result${k === vote ? ' mine' : ''}`}
                key={k}
                title={`${counts[k].toLocaleString()} votes`}
              >
                <span className="lbl">
                  <img className="rflag" src={flagSrcs[k]} alt="" aria-hidden="true" />
                  {outcomes[k].label}
                  {k === vote && (
                    <span className="pickbadge" title="Your pick">
                      <svg viewBox="0 0 12 12" aria-hidden="true">
                        <path
                          d="M2.5 6.2 5 8.7 9.5 3.6"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </span>
                <span className="track">
                  <span
                    className="fill"
                    style={{
                      width: `${pct(k)}%`,
                      background: `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 50%), ${outcomes[k].color}`,
                    }}
                  />
                </span>
                <span className="val">{Math.round(pct(k))}%</span>
              </div>
            ))}
          </div>
          <div className="agreement">
            {withModel
              ? `You and Hermes agree: ${outcomes[vote].label}.`
              : `You're going against Hermes. It has ${outcomes[modelPick].label}.`}
          </div>
          <div className="pollmeta">
            <span className="livecount">
              <span className="livedot" aria-hidden="true" />
              {total.toLocaleString()} votes
            </span>
            <button className="change" onClick={clear}>
              Change vote
            </button>
          </div>
        </div>
      )}

      <div className="poll-divider" />

      <div className="modelblock">
        <div className="modelrow">
          <img className="modelrow-flag" src={flagSrcs[modelPick]} alt="" aria-hidden="true" />
          <span className="modelrow-pick">
            <span className="modelrow-kicker">The Hermes agent&rsquo;s pick: updated {updated}</span>
            {outcomes[modelPick].label} to win
          </span>
        </div>
        <p className="tldr">{prediction.blurb}</p>

        <div className="reasoning-inline">
          <div className="rgrid">
            {prediction.reasoning.map((r) => (
              <div className="rpoint" key={r.title}>
                <h5>{r.title}</h5>
                <p>{r.body}</p>
              </div>
            ))}
          </div>
          <div className="rdesk">
            {prediction.agents.map((a) => (
              <div className="ragent" key={a.id}>
                <span className="id">{a.id}</span>
                <span className="desc">{a.desc}</span>
                <span className="lean">{a.lean}</span>
              </div>
            ))}
          </div>
          <div className="rmeta">
            {prediction.source} · For entertainment, not betting advice
          </div>
        </div>
      </div>
    </div>
  )
}
