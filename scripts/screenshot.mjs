import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:4173'
const sizes = [
  [1440, 900],
  [1280, 720],
]

mkdirSync('shots', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `shots/oracle-${width}x${height}.png` })
  console.log(`shots/oracle-${width}x${height}.png`)
  await page.close()
}
await browser.close()
