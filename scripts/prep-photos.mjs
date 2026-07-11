/**
 * Turns the official squad renders in /photos into web-ready assets:
 *  - public/players/<slug>.webp   128px face crops for roster avatars
 *  - public/cutouts/<slug>.webp   900px-tall full-body cutouts for the hero
 * Renders are standardized standing poses on transparent backgrounds, so a
 * fixed head-crop ratio (top square, 55% of trimmed width) works across the set.
 */
import sharp from 'sharp'
import { readdirSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const PHOTOS = 'photos'
const AVATARS = [
  // [output slug, filename fragment to match]
  ['orjan-nyland', 'norway_01'],
  ['julian-ryerson', 'norway_26'],
  ['kristoffer-ajer', 'norway_03'],
  ['leo-ostigard', 'norway_04'],
  ['david-moller-wolfe', 'norway_05'],
  ['sander-berge', 'norway_08'],
  ['patrick-berg', 'norway_06'],
  ['martin-odegaard', 'norway_10'],
  ['antonio-nusa', 'norway_20'],
  ['erling-haaland', 'norway_09'],
  ['alexander-sorloth', 'norway_07'],
  ['jordan-pickford', 'england_01'],
  ['reece-james', 'england_24'],
  ['john-stones', 'england_05'],
  ['marc-guehi', 'england_06'],
  ['nico-oreilly', 'england_03'],
  ['declan-rice', 'england_04'],
  ['jude-bellingham', 'england_10'],
  ['eberechi-eze', 'england_21'],
  ['bukayo-saka', 'england_07'],
  ['marcus-rashford', 'england_11'],
  ['harry-kane', 'england_09'],
]
const CUTOUTS = [
  ['haaland', 'norway_09'],
  ['kane', 'england_09'],
]

const files = readdirSync(PHOTOS)
const fileFor = (frag) => {
  const f = files.find((f) => f.startsWith(frag))
  if (!f) throw new Error(`no photo matches ${frag}`)
  return path.join(PHOTOS, f)
}

mkdirSync('public/players', { recursive: true })
mkdirSync('public/cutouts', { recursive: true })

for (const [slug, frag] of AVATARS) {
  const trimmed = await sharp(fileFor(frag)).trim().toBuffer()
  const { width } = await sharp(trimmed).metadata()
  const side = Math.round(width * 0.55)
  await sharp(trimmed)
    .extract({ left: Math.round((width - side) / 2), top: 0, width: side, height: side })
    .resize(128, 128)
    .flatten({ background: '#f1efea' })
    .webp({ quality: 80 })
    .toFile(`public/players/${slug}.webp`)
  console.log(`players/${slug}.webp`)
}

for (const [slug, frag] of CUTOUTS) {
  await sharp(fileFor(frag))
    .trim()
    .resize({ height: 900 })
    .webp({ quality: 82 })
    .toFile(`public/cutouts/${slug}.webp`)
  console.log(`cutouts/${slug}.webp`)
}
