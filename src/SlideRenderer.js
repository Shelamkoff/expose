import { resolveType, extractUrl, safeImageSrcset, safeMediaUrl } from './utils.js'

/**
 * Creates DOM elements for each slide type.
 * Handles image/video/iframe/render sources.
 */
export class SlideRenderer {
  /**
   * Create the slide content element.
   * @param {import('./types').SlideData} slide
   * @returns {{ element: HTMLElement, cleanup?: () => void }}
   */
  render(slide) {
    const type = resolveType(slide.src)

    switch (type) {
      case 'image': return this.#renderImage(slide)
      case 'video': return this.#renderVideo(slide)
      case 'iframe': return this.#renderIframe(slide)
      case 'render': return this.#renderCustom(slide)
      default: return this.#renderImage(slide)
    }
  }

  /**
   * Get the thumbnail URL for a slide.
   * Uses explicit thumb, falls back to auto-generation.
   * @param {import('./types').SlideData} slide
   * @returns {string | null}
   */
  getThumbUrl(slide) {
    if (slide.thumb) return safeMediaUrl(slide.thumb, 'image')

    const type = resolveType(slide.src)
    const url = extractUrl(slide.src)

    if (type === 'image' && url) return safeMediaUrl(url, 'image')
    if (type === 'video') {
      const src = slide.src
      if (typeof src === 'object' && src !== null && src.poster) return safeMediaUrl(src.poster, 'image')
    }

    return null
  }

  /**
   * Get the download URL for a slide.
   * @param {import('./types').SlideData} slide
   * @returns {string | null}
   */
  getDownloadUrl(slide) {
    if (!slide.download) return null
    if (typeof slide.download === 'string') return safeMediaUrl(slide.download, 'download')
    return safeMediaUrl(extractUrl(slide.src), 'download')
  }

  /**
   * @param {import('./types').SlideData} slide
   */
  #renderImage(slide) {
    const url = safeMediaUrl(extractUrl(slide.src), 'image')
    const el = document.createElement('div')
    el.className = 'expose__slide-content expose__slide-content--image'

    if (!url) return { element: el }

    const img = document.createElement('img')
    img.className = 'expose__image'
    img.src = url
    img.alt = slide.alt || ''
    img.draggable = false

    if (typeof slide.src === 'object' && slide.src !== null) {
      const srcset = safeImageSrcset(slide.src.srcset)
      if (srcset) img.srcset = srcset
      if (slide.src.sizes) img.sizes = slide.src.sizes
    }

    el.appendChild(img)
    return { element: el }
  }

  /**
   * @param {import('./types').SlideData} slide
   */
  #renderVideo(slide) {
    const src = slide.src
    const url = safeMediaUrl(extractUrl(src), 'video')
    const el = document.createElement('div')
    el.className = 'expose__slide-content expose__slide-content--video'

    if (!url) return { element: el }

    const video = document.createElement('video')
    video.className = 'expose__video'
    video.src = url
    video.controls = true
    video.playsInline = true
    video.preload = 'metadata'

    if (typeof src === 'object' && src !== null) {
      if (src.autoplay) video.dataset.exposeAutoplay = 'true'
      if (src.muted) video.muted = true
      if (src.loop) video.loop = true
      const poster = safeMediaUrl(src.poster, 'image')
      if (poster) video.poster = poster
    }

    el.appendChild(video)

    const cleanup = () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }

    return { element: el, cleanup }
  }

  /**
   * @param {import('./types').SlideData} slide
   */
  #renderIframe(slide) {
    const src = slide.src
    const url = safeMediaUrl(extractUrl(src), 'iframe')
    const el = document.createElement('div')
    el.className = 'expose__slide-content expose__slide-content--iframe'

    if (!url) return { element: el }

    const iframe = document.createElement('iframe')
    iframe.className = 'expose__iframe'
    // Never load preloaded embeds until their slide becomes active.
    iframe.dataset.exposeSrc = url
    iframe.dataset.exposeActive = 'false'
    iframe.src = 'about:blank'
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute('allowfullscreen', '')

    if (typeof src === 'object' && src !== null) {
      if (src.allow) iframe.setAttribute('allow', src.allow)
      if (src.sandbox !== undefined) iframe.setAttribute('sandbox', src.sandbox)
    }

    el.appendChild(iframe)

    const cleanup = () => {
      iframe.src = 'about:blank'
    }

    return { element: el, cleanup }
  }

  /**
   * @param {import('./types').SlideData} slide
   */
  #renderCustom(slide) {
    const el = document.createElement('div')
    el.className = 'expose__slide-content expose__slide-content--custom'

    let cleanup
    try {
      const result = slide.src()
      if (result && typeof result.then === 'function') {
        // The renderer contract is synchronous. Observe rejections from a
        // returned Promise rather than leaking unhandledRejection events.
        void Promise.resolve(result).catch(() => {})
        throw new TypeError('Render function must return synchronously, not a Promise')
      }

      let child
      if (result instanceof HTMLElement) {
        child = result
      } else if (result?.element instanceof HTMLElement) {
        child = result.element
        cleanup = typeof result.destroy === 'function' ? () => result.destroy() : undefined
      } else {
        throw new TypeError('Render function must return an HTMLElement or { element, destroy? }')
      }

      el.appendChild(child)
    } catch (e) {
      el.textContent = 'Render error'
      console.error('Expose: render function failed', e)
    }

    return { element: el, cleanup }
  }
}
