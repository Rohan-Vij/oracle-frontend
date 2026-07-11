import { useState } from 'react'

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export default function Avatar({ name, src, size }) {
  /* track which URL failed so a future src change (live feed refresh)
     gets a fresh attempt instead of being stuck on initials */
  const [failedSrc, setFailedSrc] = useState(null)
  const resolved = src && !/^https?:/.test(src) ? import.meta.env.BASE_URL + src : src
  if (!resolved || failedSrc === resolved) {
    return (
      <span
        className="ava-fallback"
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
    )
  }
  return (
    <img
      className="ava"
      src={resolved}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(resolved)}
    />
  )
}
