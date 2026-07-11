import { useEffect, useState } from 'react'
import { FEED } from './data/feed.js'
import Roster from './components/Roster.jsx'
import Poll from './components/Poll.jsx'
import LiveTicker from './components/LiveTicker.jsx'
import { fetchLiveFixtures } from './services/liveScores.js'
import { fetchPrediction, fetchPredictionHistory } from './services/prediction.js'

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
  const { meta, outcomes, teams } = FEED
  /* skip the 5MB backdrop video on phones: bandwidth, battery, and the
     glass has little room to shine there anyway */
  const showVideo = window.matchMedia('(min-width: 901px)').matches

  /* live scores — backend caches upstream for 60s, so polling every
     60s costs at most one API-Football request per minute in total */
  const [liveFixtures, setLiveFixtures] = useState(null)
  useEffect(() => {
    const load = () => {
      if (document.hidden) return
      fetchLiveFixtures().then((f) => {
        if (f) setLiveFixtures(f.fixtures)
      })
    }
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  /* if our fixture is in play, the matchline becomes the scoreboard */
  const ourMatch = liveFixtures?.find(
    (f) =>
      /norway/i.test(f.home + f.away) && /england/i.test(f.home + f.away)
  )

  /* Hermes updates its prediction mid-game; poll for the latest push
     and keep the timestamped archive of its earlier calls */
  const [livePrediction, setLivePrediction] = useState(null)
  const [predictionHistory, setPredictionHistory] = useState([])
  useEffect(() => {
    const load = () => {
      if (document.hidden) return
      fetchPrediction().then((p) => {
        if (p) setLivePrediction(p)
      })
      fetchPredictionHistory().then((h) => {
        if (h) setPredictionHistory(h)
      })
    }
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  const prediction = livePrediction ?? FEED.prediction
  const updatedLabel = livePrediction?.updatedAt
    ? new Date(livePrediction.updatedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : meta.updated

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

      <LiveTicker fixtures={liveFixtures} />

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
                {ourMatch ? (
                  <span className="scorechip">
                    {ourMatch.homeGoals}
                    <span className="scoredash">–</span>
                    {ourMatch.awayGoals}
                  </span>
                ) : (
                  <span className="vs">vs</span>
                )}
                <span className="nm">England</span>
                <Flag src={teams.ENG.flag} alt="England flag" />
              </div>
              {ourMatch ? (
                ourMatch.events?.length > 0 && (
                  <div className="events-row">
                    {ourMatch.events.slice(-4).map((e, i) => (
                      <span className="ev" key={i}>
                        <span className="ev-ico" aria-hidden="true">
                          {e.type === 'Goal' ? '⚽' : /yellow/i.test(e.detail) ? '🟨' : '🟥'}
                        </span>
                        {e.minute}
                        {e.extra ? `+${e.extra}` : ''}′ {e.player}
                        <span className="ev-side">{e.side === 'home' ? 'NOR' : 'ENG'}</span>
                      </span>
                    ))}
                  </div>
                )
              ) : (
                <div className="where">
                  {meta.venue} · Kickoff {meta.kickoff} · {meta.kickoffLocal}
                </div>
              )}
            </div>
          </div>

          <Poll
            outcomes={outcomes}
            flagSrcs={{ NOR: resolve(teams.NOR.flag), ENG: resolve(teams.ENG.flag) }}
            modelPick={prediction.pick}
            prediction={prediction}
            updated={updatedLabel}
            history={predictionHistory.filter((h) => h.updatedAt !== livePrediction?.updatedAt)}
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
