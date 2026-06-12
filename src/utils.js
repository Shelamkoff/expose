/**
 * Clamps a number between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Generates a short unique ID.
 * @returns {string}
 */
export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

/** Lock body scrolling via overflow:hidden. */
export function lockBodyScroll() {
  document.documentElement.classList.add('expose-noscroll')
}

/** Unlock body scrolling. */
export function unlockBodyScroll() {
  document.documentElement.classList.remove('expose-noscroll')
}

/**
 * Detect slide type from a URL string.
 * Checks extension first, then known iframe/embed hosts.
 * Defaults to 'image' — most common lightbox use case.
 * @param {string} url
 * @returns {'image' | 'video' | 'iframe'}
 */
export function detectType(url) {
  try {
    const parsed = new URL(url, location.href)
    const pathname = parsed.pathname.toLowerCase()
    const host = parsed.hostname.toLowerCase()

    if (/\.(jpe?g|png|webp|gif|svg|avif|bmp|ico)$/.test(pathname)) return 'image'
    if (/\.(mp4|webm|ogg|mov|m4v)$/.test(pathname)) return 'video'
    if (/\.(html?)$/.test(pathname)) return 'iframe'

    // Known embed/iframe hosts
    if (/youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|codesandbox\.io|codepen\.io/.test(host)) return 'iframe'
    if (pathname.includes('/embed')) return 'iframe'
  } catch { /* invalid URL */ }

  return 'image'
}

/**
 * Extract the URL string from a SlideData.src value.
 * @param {import('./types').SlideSource} src
 * @returns {string | null}
 */
export function extractUrl(src) {
  if (typeof src === 'string') return src
  if (typeof src === 'object' && src !== null && typeof src.url === 'string') return src.url
  return null
}

/**
 * Resolve the effective type of a slide source.
 * @param {import('./types').SlideSource} src
 * @returns {'image' | 'video' | 'iframe' | 'render'}
 */
export function resolveType(src) {
  if (typeof src === 'function') return 'render'
  if (typeof src === 'object' && src !== null) {
    if (src.type) return src.type
    return detectType(src.url)
  }
  return detectType(src)
}
