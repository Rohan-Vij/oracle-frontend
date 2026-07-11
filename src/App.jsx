import { FEED } from './data/feed.js'
import Roster from './components/Roster.jsx'
import Poll from './components/Poll.jsx'

const BASE = import.meta.env.BASE_URL
const resolve = (src) => (src && !/^https?:/.test(src) ? BASE + src : src)

/* Flags: hide the box rather than show a broken-image glyph if one fails. */
function Flag({ className = 'flag', src, alt }) {
  return (
    <img
      className={className}
      src={resolve(src)}
      alt={alt}
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden'
      }}
    />
  )
}

export default function App() {
  const { meta, prediction, outcomes, teams } = FEED
  /* skip the 5MB backdrop video on phones: bandwidth, battery, and the
     glass has little room to shine there anyway */
  const showVideo = window.matchMedia('(min-width: 901px)').matches

  return (
    <div className="app">
      {showVideo && (
        <div className="videobg" aria-hidden="true">
          <video autoPlay muted loop playsInline src={`${BASE}video/bg.mp4`} />
        </div>
      )}
      <header>
        <span className="brand">
          <span>
            whowins<i>.soccer</i>
          </span>
        </span>
        <span className="tag">
          <b>{meta.competition}</b> — {meta.stage}
        </span>
        <span className="tag right">{meta.date}</span>
      </header>

      <main>
        <Roster team={teams.NOR} />

        <section className="core">
          <img className="cutout left" src={`${BASE}cutouts/haaland.webp`} alt="" aria-hidden="true" />
          <img className="cutout right" src={`${BASE}cutouts/kane.webp`} alt="" aria-hidden="true" />
          <div className="zone top">
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
          </div>

          <Poll
            outcomes={outcomes}
            flagSrcs={{ NOR: resolve(teams.NOR.flag), ENG: resolve(teams.ENG.flag) }}
            modelPick={prediction.pick}
            prediction={prediction}
            updated={meta.updated}
          />

          <div className="zone bottom">
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
                <span>Bet on</span>
                <img className="wordmark" src={`${BASE}logos/kalshi.png`} alt="Kalshi" />
                <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        <Roster team={teams.ENG} />
      </main>
    </div>
  )
}
