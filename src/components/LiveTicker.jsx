const clock = (f) => (f.minute ? `${f.minute}′` : f.status)

/* Slim strip of everything in play right now, worldwide. Renders
   nothing when no matches are live (or the API is unreachable). */
export default function LiveTicker({ fixtures }) {
  if (!fixtures?.length) return null
  return (
    <div className="ticker" aria-label="Live matches">
      <span className="ticker-label">
        <span className="ticker-dot" aria-hidden="true" />
        Live
      </span>
      <div className="ticker-track">
        {fixtures.slice(0, 12).map((f) => (
          <span className="ticker-item" key={f.id}>
            <b>{f.home}</b> {f.homeGoals}–{f.awayGoals} <b>{f.away}</b>
            <span className="ticker-min"> {clock(f)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
