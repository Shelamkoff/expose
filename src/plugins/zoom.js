import { ZoomManager } from '../ZoomManager.js'

const ICONS = {
  zoomIn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>',
  zoomOut: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>',
}

/**
 * Zoom plugin — zoom, pan, pinch for image slides.
 *
 * @param {object} [options]
 * @param {number} [options.min=1]
 * @param {number} [options.max=4]
 * @param {number} [options.step=0.5]
 * @returns {import('../types').ExposePlugin}
 */
export function createZoom(options = {}) {
  /** @type {import('../types').PluginContext | null} */
  let ctx = null
  /** @type {Array<() => void>} */
  let unsubs = []
  /** @type {ZoomManager | null} */
  let zoomManager = null

  const min = options.min ?? 1
  const max = options.max ?? 4
  const step = options.step ?? 0.5
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step)
    || min < 1 || max < min || step <= 0) {
    throw new RangeError('Expose zoom options must satisfy 1 <= min <= max and step > 0')
  }

  /** @param {import('../types').SlideData} slide */
  const isImage = (slide) => ctx?.resolveType(slide.src) === 'image'

  function attachZoom() {
    if (!zoomManager || !ctx) return
    const entry = ctx.getSlideElement()
    if (!entry) return
    const slide = ctx.getSlide()
    if (slide && ctx.resolveType(slide.src) === 'image') {
      zoomManager.attach(entry.el)
    } else {
      zoomManager.detach()
    }
  }

  function zoomIn() { zoomManager?.zoomIn() }
  function zoomOut() { zoomManager?.zoomOut() }
  function getScale() { return zoomManager?.getScale() ?? min }

  return {
    name: 'zoom',

    install(context) {
      ctx = context

      context.toolbar.add({
        name: 'zoom-in', icon: ICONS.zoomIn, title: 'Zoom in',
        visible: isImage, onClick: () => zoomIn(),
      })
      context.toolbar.add({
        name: 'zoom-out', icon: ICONS.zoomOut, title: 'Zoom out',
        visible: isImage, onClick: () => zoomOut(),
      })

      unsubs.push(
        context.on('open', () => {
          zoomManager = new ZoomManager(context, { zoomMin: min, zoomMax: max, zoomStep: step })
          attachZoom()
        }),

        context.on('slide:change', () => {
          zoomManager?.reset()
          attachZoom()
        }),

        context.on('close', () => {
          zoomManager?.destroy()
          zoomManager = null
        }),
      )
    },

    destroy() {
      unsubs.forEach(fn => fn())
      unsubs = []
      zoomManager?.destroy()
      zoomManager = null
      ctx?.toolbar.remove('zoom-in')
      ctx?.toolbar.remove('zoom-out')
      ctx = null
    },

    zoomIn,
    zoomOut,
    getScale,
  }
}
