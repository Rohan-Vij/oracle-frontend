import { FEED } from './data/feed.js'
import Roster from './components/Roster.jsx'
import Poll from './components/Poll.jsx'

const BASE = import.meta.env.BASE_URL

/* Flags come from a third-party CDN; hide the box rather than show a
   broken-image glyph beside the headline if it ever fails. */
function Flag({ className = 'flag', src, alt }) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden'
      }}
    />
  )
}

export default function App() {
  const { meta, prediction, outcomes, teams } = FEED
  const pick = outcomes[prediction.pick]
  const pickTeam = teams[prediction.pick]

  return (
    <div className="app">
      <header>
        <span className="brand">
          Who wins<i>?</i>
        </span>
        <span className="tag">
          {meta.competition} — {meta.stage}
        </span>
        <span className="tag right">{meta.date}</span>
      </header>

      <main>
        <Roster team={teams.NOR} />

        <section className="core">
          <img className="cutout left" src={`${BASE}cutouts/haaland.webp`} alt="" aria-hidden="true" />
          <img className="cutout right" src={`${BASE}cutouts/kane.webp`} alt="" aria-hidden="true" />

          <div className="matchline">
            <div className="tie">
              <Flag src={teams.NOR.flag} alt="Norway flag" />
              <span className="nm">Norway</span>
              <span className="vs">vs</span>
              <span className="nm">England</span>
              <Flag src={teams.ENG.flag} alt="England flag" />
            </div>
            <div className="where">
              {meta.venue} · Kickoff {meta.kickoff} · {meta.kickoffLocal}
            </div>
          </div>

          <div className="hero">
            <div className="pick-label">The model&rsquo;s pick</div>
            <Flag className="pick-flag" src={pickTeam.flag} alt={`${pick.label} flag`} />
            <div className="pick">{pick.label} to win</div>
            <p className="blurb">
              {prediction.blurb}
              <span className="src">
                {prediction.source} · Updated {meta.updated}
              </span>
            </p>
          </div>

          <div className="pollzone">
            <Poll outcomes={outcomes} />
          </div>

          <div className="betrow">
            <a
              className="bet polymarket"
              href="https://polymarket.com/sports"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={`${BASE}logos/polymarket.png`} alt="" aria-hidden="true" />
              Bet on Polymarket ↗
            </a>
            <a className="bet kalshi" href="https://kalshi.com" target="_blank" rel="noopener noreferrer">
              Bet on{' '}
              <img className="wordmark" src={`${BASE}logos/kalshi.png`} alt="Kalshi" /> ↗
            </a>
          </div>
        </section>

        <Roster team={teams.ENG} />
      </main>

      <footer>
        <span>whowins.soccer — quant desk</span>
        <span className="mid">Model estimates, for entertainment only — not betting advice</span>
        <span>Imagery: official squad renders · Wikimedia · Flagcdn</span>
      </footer>
    </div>
  )
}
