import { useEffect, useRef } from 'react'

/* The full write-up behind the model's pick. Closes on Esc, backdrop
   click, or the × — focus moves in on open and back to the trigger on
   close (handled by the caller re-focusing via onClose). */
export default function ReasoningModal({ open, onClose, prediction, pick, flagSrc, meta }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title-wrap">
            <img className="modal-flag" src={flagSrc} alt="" aria-hidden="true" />
            <div>
              <div className="modal-kicker">The model&rsquo;s reasoning</div>
              <h2 id="modal-title">{pick.label} to win</h2>
            </div>
          </div>
          <button className="modal-close" ref={closeRef} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="modal-lead">{prediction.blurb}</p>

        <div className="modal-grid">
          {prediction.reasoning.map((r) => (
            <div className="reason" key={r.title}>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </div>
          ))}
        </div>

        <div className="modal-desk">
          <h3>The desk — four independent agents</h3>
          {prediction.agents.map((a) => (
            <div className="agent" key={a.id}>
              <span className="id">{a.id}</span>
              <span className="desc">{a.desc}</span>
              <span className="lean">{a.lean}</span>
            </div>
          ))}
        </div>

        <div className="modal-foot">
          <span>
            {prediction.source} · Updated {meta.updated}
          </span>
          <span>Model estimates, for entertainment only — not betting advice</span>
        </div>
      </div>
    </div>
  )
}
