import { Thumbnails } from '../Thumbnails.js'

/**
 * Thumbnails plugin — thumbnail strip at the bottom.
 *
 * @param {object} [options]
 * @param {number} [options.width=60]
 * @param {number} [options.height=45]
 * @returns {import('../types').ExposePlugin}
 */
export function createThumbnails(options = {}) {
  /** @type {import('../types').PluginContext | null} */
  let ctx = null
  /** @type {Array<() => void>} */
  let unsubs = []
  /** @type {import('../Thumbnails.js').Thumbnails | null} */
  let thumbnails = null

  const width = options.width ?? 60
  const height = options.height ?? 45
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError('Expose thumbnail dimensions must be positive numbers')
  }

  return {
    name: 'thumbnails',

    install(context) {
      ctx = context

      unsubs.push(
        context.on('open', () => {
          const overlay = context.getOverlay()
          if (!overlay) return

          thumbnails = new Thumbnails(
            { goTo: (index) => context.goTo(index) },
            { thumbnailWidth: width, thumbnailHeight: height },
          )
          thumbnails.build(context.getSlides())
          thumbnails.setActive(context.getIndex())
          overlay.appendChild(thumbnails.element)
        }),

        context.on('slide:change', ({ index }) => {
          thumbnails?.setActive(index)
        }),

        context.on('slides:change', () => {
          if (thumbnails && ctx) {
            thumbnails.build(ctx.getSlides())
            thumbnails.setActive(ctx.getIndex())
          }
        }),

        context.on('close', () => {
          thumbnails?.destroy()
          thumbnails = null
        }),
      )
    },

    destroy() {
      unsubs.forEach(fn => fn())
      unsubs = []
      thumbnails?.destroy()
      thumbnails = null
      ctx = null
    },
  }
}
