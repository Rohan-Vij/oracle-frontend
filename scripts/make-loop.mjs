/**
 * Renders a 10s seamless "stadium atmosphere" loop to public/video/
 * using a canvas animation recorded in Chrome. Every motion channel is
 * periodic in t (sin/cos of one full cycle) so the loop has no seam.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const DURATION = 10_000
const W = 1280
const H = 720

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: W, height: H } })

await page.setContent(`<canvas id="c" width="${W}" height="${H}"></canvas>`)

const b64 = await page.evaluate(
  async ({ DURATION, W, H }) => {
    const ctx = document.getElementById('c').getContext('2d')
    const TAU = Math.PI * 2
    // fixed pseudo-random constellation for the crowd-flash bokeh
    const rng = (i, s) => {
      const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
      return x - Math.floor(x)
    }
    const bokeh = Array.from({ length: 46 }, (_, i) => ({
      x: rng(i, 1) * W,
      y: rng(i, 2) * H * 0.42,
      r: 3 + rng(i, 3) * 8,
      ph: rng(i, 4) * TAU,
      warm: rng(i, 5) > 0.7,
    }))

    function draw(t) {
      // sky-to-pitch base
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#101b2e')
      g.addColorStop(0.42, '#17263c')
      g.addColorStop(0.46, '#1d5c35')
      g.addColorStop(1, '#2a7a45')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      // slow lateral camera pan, seamless
      const pan = Math.sin(t * TAU) * 70

      // pitch stripes (mowing pattern), perspective-ish
      for (let i = -2; i < 12; i++) {
        if (i % 2) continue
        const y0 = H * 0.46
        const x = ((i * 190 + pan) % (W + 380)) - 190
        ctx.fillStyle = 'rgba(255,255,255,0.045)'
        ctx.beginPath()
        ctx.moveTo(x, H)
        ctx.lineTo(x + 130, H)
        ctx.lineTo(x + 78, y0)
        ctx.lineTo(x + 30, y0)
        ctx.closePath()
        ctx.fill()
      }

      // halfway line + center circle, panning with the field
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 3
      const cx = W / 2 + pan * 1.6
      const cy = H * 0.74
      ctx.beginPath()
      ctx.moveTo(cx, H * 0.47)
      ctx.lineTo(cx, H)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(cx, cy, 150, 52, 0, 0, TAU)
      ctx.stroke()

      // crowd bokeh, twinkling
      for (const s of bokeh) {
        const a = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * TAU * 2 + s.ph))
        ctx.fillStyle = s.warm ? 'rgba(255,205,140,' + a + ')' : 'rgba(220,235,255,' + a + ')'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, TAU)
        ctx.fill()
      }

      // drifting color washes (brand blue / amber), lissajous paths
      const blob = (x, y, r, color) => {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
        rg.addColorStop(0, color)
        rg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = rg
        ctx.fillRect(0, 0, W, H)
      }
      blob(
        W * 0.3 + Math.sin(t * TAU) * 120,
        H * 0.5 + Math.cos(t * TAU) * 60,
        340,
        'rgba(64,140,230,0.16)'
      )
      blob(
        W * 0.72 + Math.cos(t * TAU) * 130,
        H * 0.55 + Math.sin(t * TAU * 2) * 50,
        320,
        'rgba(220,150,20,0.14)'
      )

      // sweeping broadcast light beams
      for (const [ph, alpha] of [
        [0, 0.05],
        [0.5, 0.04],
      ]) {
        const ang = -0.5 + 0.12 * Math.sin((t + ph) * TAU)
        ctx.save()
        ctx.translate(W / 2, -100)
        ctx.rotate(ang)
        const lg = ctx.createLinearGradient(-90, 0, 90, 0)
        lg.addColorStop(0, 'rgba(255,255,255,0)')
        lg.addColorStop(0.5, 'rgba(255,255,255,' + alpha + ')')
        lg.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = lg
        ctx.fillRect(-160, 0, 320, H + 300)
        ctx.restore()
      }
    }

    const stream = document.getElementById('c').captureStream(30)
    const rec = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5_000_000,
    })
    const chunks = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise((res) => (rec.onstop = res))
    rec.start()

    const t0 = performance.now()
    await new Promise((res) => {
      const tick = () => {
        const el = performance.now() - t0
        draw((el % DURATION) / DURATION)
        if (el >= DURATION) return res()
        requestAnimationFrame(tick)
      }
      tick()
    })
    rec.stop()
    await done

    const blob = new Blob(chunks, { type: 'video/webm' })
    const buf = await blob.arrayBuffer()
    let bin = ''
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    }
    return btoa(bin)
  },
  { DURATION, W, H }
)

await browser.close()
mkdirSync('public/video', { recursive: true })
writeFileSync('public/video/stadium-loop.webm', Buffer.from(b64, 'base64'))
console.log('public/video/stadium-loop.webm', Buffer.from(b64, 'base64').length, 'bytes')
