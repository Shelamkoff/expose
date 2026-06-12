/**
 * Captions plugin — displays slide caption at the bottom.
 * @returns {import('../types').ExposePlugin}
 */
export function createCaptions() {
  /** @type {import('../types').PluginContext | null} */
  let ctx = null
  /** @type {Array<() => void>} */
  let unsubs = []
  /** @type {HTMLElement | null} */
  let captionEl = null

  function update() {
    if (!captionEl || !ctx) return
    const slide = ctx.getSlide()
    if (slide?.caption) {
      captionEl.textContent = slide.caption
      captionEl.style.display = ''
    } else {
      captionEl.style.display = 'none'
    }
  }

  return {
    name: 'captions',

    install(context) {
      ctx = context

      unsubs.push(
        context.on('open', () => {
          const overlay = context.getOverlay()
          if (!overlay) return

          captionEl = document.createElement('div')
          captionEl.className = 'expose__caption'
          overlay.appendChild(captionEl)
          update()
        }),

        context.on('slide:change', update),

        context.on('close', () => {
          captionEl?.remove()
          captionEl = null
        }),
      )
    },

    destroy() {
      unsubs.forEach(fn => fn())
      unsubs = []
      captionEl?.remove()
      captionEl = null
      ctx = null
    },
  }
}
