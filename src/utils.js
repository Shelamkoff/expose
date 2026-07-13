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

let bodyScrollLockCount = 0
let bodyScrollClassWasPresent = false

/** Lock body scrolling via overflow:hidden. Locks are reference-counted. */
export function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    bodyScrollClassWasPresent = document.documentElement.classList.contains('expose-noscroll')
  }
  bodyScrollLockCount += 1
  document.documentElement.classList.add('expose-noscroll')
}

/** Release one body scroll lock. */
export function unlockBodyScroll() {
  if (bodyScrollLockCount === 0) return
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
  if (bodyScrollLockCount === 0) {
    if (!bodyScrollClassWasPresent) document.documentElement.classList.remove('expose-noscroll')
    bodyScrollClassWasPresent = false
  }
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
    const embedHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'codesandbox.io', 'codepen.io']
    if (embedHosts.some(domain => host === domain || host.endsWith(`.${domain}`))) return 'iframe'
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
 * Validate an externally supplied URL before assigning it to a media element.
 * Relative URLs are allowed. Active schemes are rejected rather than rewritten.
 * @param {unknown} value
 * @param {'image' | 'video' | 'iframe' | 'download'} kind
 * @returns {string | null}
 */
export function safeMediaUrl(value, kind) {
  if (typeof value !== 'string' || value.trim() === '') return null
  const url = value.trim()

  try {
    const base = typeof document !== 'undefined'
      ? document.baseURI
      : (typeof location !== 'undefined' ? location.href : 'https://localhost/')
    const protocol = new URL(url, base).protocol.toLowerCase()
    if (protocol === 'http:' || protocol === 'https:') return url
    // Blob documents are active content. Keep them available for media and
    // downloads, but never inject them into an unsandboxed iframe.
    if (protocol === 'blob:' && kind !== 'iframe') return url
    if (protocol === 'data:' && (kind === 'image' || kind === 'download') && /^data:image\//i.test(url)) return url
    if (protocol === 'data:' && (kind === 'video' || kind === 'download') && /^data:video\//i.test(url)) return url
  } catch { /* invalid URL */ }

  return null
}

/**
 * Reject active schemes in an image srcset while preserving the browser's parser.
 * @param {unknown} value
 * @returns {string | null}
 */
export function safeImageSrcset(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  if (/(?:^|,\s*)\s*(?:javascript|vbscript):/i.test(value)) return null
  if (/(?:^|,\s*)\s*data:(?!image\/)/i.test(value)) return null
  return value
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
