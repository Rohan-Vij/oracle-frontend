import { useRef, useState } from 'react'
import { readVote, persistVote, clearVote, getCounts } from '../services/poll.js'

const ORDER = ['NOR', 'DRW', 'ENG']

export default function Poll({
  outcomes,
  flagSrcs,
  modelPick,
  closesAt,
  onOpenReasoning,
  reasoningBtnRef,
}) {
  const [vote, setVote] = useState(() => {
    const v = readVote()
    return ORDER.includes(v) ? v : null
  })
  const resultsRef = useRef(null)
  const firstChoiceRef = useRef(null)

  const cast = (k) => {
    persistVote(k)
    setVote(k)
    requestAnimationFrame(() => resultsRef.current?.focus())
  }
  const clear = () => {
    clearVote()
    setVote(null)
    requestAnimationFrame(() => firstChoiceRef.current?.focus())
  }

  const counts = getCounts(vote)
  const total = ORDER.reduce((s, k) => s + counts[k], 0)
  const withModel = vote === modelPick

  return (
    <div className="poll">
      <h4>Who wins? Cast your vote</h4>
      <div className="closes">Voting closes at kickoff · {closesAt}</div>
      {!vote ? (
        <div className="choices">
          {ORDER.map((k, i) => (
            <button
              key={k}
              ref={i === 0 ? firstChoiceRef : undefined}
              className="choice"
              onClick={() => cast(k)}
            >
              {flagSrcs[k] ? (
                <img className="cflag" src={flagSrcs[k]} alt="" aria-hidden="true" />
              ) : (
                <span className="cswatch" aria-hidden="true" />
              )}
              {outcomes[k].label}
            </button>
          ))}
        </div>
      ) : (
        <div className="results-wrap" role="status" ref={resultsRef} tabIndex={-1}>
          <div className="results">
            {ORDER.map((k) => (
              <div className="result" key={k} title={`${counts[k].toLocaleString()} votes`}>
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
          <div className="agreement">
            {withModel
              ? `You and the model agree — ${outcomes[vote].label}.`
              : `You're going against the model — it has ${outcomes[modelPick].label}.`}
          </div>
          <div className="pollmeta">
            <span>{total.toLocaleString()} votes</span>
            <button className="change" onClick={clear}>
              Change vote
            </button>
          </div>
        </div>
      )}

      <div className="poll-divider" />
      <button className="modelrow" ref={reasoningBtnRef} onClick={onOpenReasoning}>
        <img className="modelrow-flag" src={flagSrcs[modelPick]} alt="" aria-hidden="true" />
        <span className="modelrow-pick">
          <span className="modelrow-kicker">The model&rsquo;s pick</span>
          {outcomes[modelPick].label} to win
        </span>
        <span className="modelrow-cta">Read the reasoning →</span>
      </button>
    </div>
  )
}
