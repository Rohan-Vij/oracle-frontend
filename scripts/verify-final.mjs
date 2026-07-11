import { chromium } from 'playwright'

const b = await chromium.launch({
  channel: 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
})

/* real page: seeded prediction time, two-way vibrant ballot, no draw */
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4173', { waitUntil: 'load' })
await p.waitForTimeout(3000)
const real = await p.evaluate(() => ({
  choices: [...document.querySelectorAll('.choice')].map((c) => c.textContent.trim()),
  kicker: document.querySelector('.modelrow-kicker')?.textContent,
  noScroll: document.documentElement.scrollHeight === document.documentElement.clientHeight,
}))
console.log(JSON.stringify(real))
await p.screenshot({ path: 'shots/final-real.png' })
await p.close()

/* mocked live feed: prove the GCP-fed ticker and scoreboard render */
const m = await b.newPage({ viewport: { width: 1440, height: 900 } })
await m.route('**/api/live', (route) =>
  route.fulfill({
    json: {
      fixtures: [
        { id: 1, minute: 67, status: '2H', league: 'World Cup', home: 'Norway', away: 'England', homeGoals: 1, awayGoals: 2 },
        { id: 2, minute: 44, status: '1H', league: 'World Cup', home: 'France', away: 'Brazil', homeGoals: 0, awayGoals: 0 },
        { id: 3, minute: null, status: 'HT', league: 'World Cup', home: 'Germany', away: 'Spain', homeGoals: 2, awayGoals: 2 },
      ],
    },
  })
)
await m.goto('http://localhost:4173', { waitUntil: 'load' })
await m.waitForTimeout(2500)
console.log(
  JSON.stringify(
    await m.evaluate(() => ({
      ticker: document.querySelector('.ticker-track')?.textContent?.slice(0, 90),
      scoreboard: document.querySelector('.where')?.textContent?.trim(),
    }))
  )
)
await m.screenshot({ path: 'shots/final-mockedlive.png' })
await b.close()
