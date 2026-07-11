import { useEffect, useRef, useState } from 'react'
import { FEED } from './data/feed.js'
import Roster from './components/Roster.jsx'
import Poll from './components/Poll.jsx'
import ReasoningModal from './components/ReasoningModal.jsx'

const BASE = import.meta.env.BASE_URL
const resolve = (src) => (src && !/^https?:/.test(src) ? BASE + src : src)

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
  const pick = outcomes[prediction.pick]
  const pickTeam = teams[prediction.pick]
  /* /reasoning deep-links straight to the model's write-up */
  const atReasoning = () =>
    window.location.pathname.endsWith('/reasoning') || window.location.hash === '#reasoning'
  const [modalOpen, setModalOpen] = useState(atReasoning)
  const modelBarRef = useRef(null)

  const openModal = () => {
    setModalOpen(true)
    window.history.pushState({}, '', '/reasoning')
  }
  const closeModal = () => {
    setModalOpen(false)
    if (atReasoning()) window.history.pushState({}, '', '/')
    modelBarRef.current?.focus()
  }
  useEffect(() => {
    const onPop = () => setModalOpen(atReasoning())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className="app">
      <div className="videobg" aria-hidden="true">
        <video autoPlay muted loop playsInline src={`${BASE}video/bg.mp4`} />
      </div>
      <header>
        <span className="brand">
          <span>
            whowins<i>.soccer</i>
          </span>
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
            closesAt={meta.kickoff}
            onOpenReasoning={openModal}
            reasoningBtnRef={modelBarRef}
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

      <ReasoningModal
        open={modalOpen}
        onClose={closeModal}
        prediction={prediction}
        pick={pick}
        flagSrc={resolve(pickTeam.flag)}
        meta={meta}
      />
    </div>
  )
}
