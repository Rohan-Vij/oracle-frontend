import { chromium } from 'playwright'

const b = await chromium.launch({
  channel: 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
})

const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4173', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
const tickerText = await p.evaluate(() => {
  const t = document.querySelector('.ticker-track')
  return t ? t.textContent.slice(0, 120) : 'NO TICKER'
})
const noScroll = await p.evaluate(
  () => document.documentElement.scrollHeight === document.documentElement.clientHeight
)
console.log('real ticker:', tickerText)
console.log('no-scroll:', noScroll)
await p.screenshot({ path: 'shots/ticker-real.png' })

const m = await b.newPage({ viewport: { width: 1440, height: 900 } })
await m.route('**/fixtures?live=all', (route) =>
  route.fulfill({
    json: {
      response: [
        {
          fixture: { id: 1, status: { short: '2H', elapsed: 67 } },
          league: { name: 'World Cup' },
          teams: { home: { name: 'Norway' }, away: { name: 'England' } },
          goals: { home: 1, away: 2 },
        },
      ],
    },
  })
)
await m.goto('http://localhost:4173', { waitUntil: 'networkidle' })
await m.waitForTimeout(1500)
const sb = await m.evaluate(() => {
  const w = document.querySelector('.where')
  return w ? w.textContent.trim() : 'NONE'
})
console.log('scoreboard:', sb)
await m.screenshot({ path: 'shots/ticker-ourgame.png', clip: { x: 380, y: 55, width: 680, height: 160 } })
await b.close()
