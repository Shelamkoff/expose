import { extractUrl, safeMediaUrl } from '../utils.js'
import { SlideRenderer } from '../SlideRenderer.js'

const ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>'

/** @type {Record<string, string>} */
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
}

const renderer = new SlideRenderer()

/**
 * Download plugin - download current slide via fetch -> blob.
 * @returns {import('../types').ExposePlugin}
 */
export function createDownload() {
  /** @type {import('../types').PluginContext | null} */
  let ctx = null
  /** @type {AbortController | null} */
  let request = null
  /** @type {Array<() => void>} */
  let unsubs = []

  function abortRequest() {
    request?.abort()
    request = null
  }

  async function download() {
    if (!ctx) return
    const slide = ctx.getSlide()
    if (!slide) return

    const url = renderer.getDownloadUrl(slide) || safeMediaUrl(extractUrl(slide.src), 'download')
    if (!url) return

    request?.abort()
    request = new AbortController()
    const signal = request.signal
    /** @type {string | undefined} */
    let blobUrl
    try {
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`)
      const blob = await response.blob()
      if (signal.aborted || !ctx) return
      blobUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      const ext = MIME_EXT[blob.type] || ''
      a.download = 'image' + ext
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      if (!signal.aborted && ctx) window.open(url, '_blank', 'noopener')
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      if (request?.signal === signal) request = null
    }
  }

  return {
    name: 'download',

    install(context) {
      ctx = context

      context.toolbar.add({
        name: 'download',
        icon: ICON,
        title: 'Download',
        visible: (slide) => {
          return !!slide.download
            || context.resolveType(slide.src) === 'image'
            || context.resolveType(slide.src) === 'video'
        },
        onClick: () => download(),
      })
      unsubs.push(context.on('close', abortRequest))
    },

    destroy() {
      abortRequest()
      unsubs.forEach(unsubscribe => unsubscribe())
      unsubs = []
      ctx?.toolbar.remove('download')
      ctx = null
    },

    download,
  }
}
