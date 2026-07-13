const ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>'

/**
 * Fullscreen plugin — toggle fullscreen mode.
 * @returns {import('../types').ExposePlugin}
 */
export function createFullscreen() {
  /** @type {import('../types').PluginContext | null} */
  let ctx = null
  /** @type {Array<() => void>} */
  let unsubs = []

  async function toggle() {
    if (!ctx) return
    const overlay = ctx.getOverlay()
    if (!overlay) return

    try {
      if (document.fullscreenElement === overlay) {
        await document.exitFullscreen()
      } else {
        if (document.fullscreenElement) await document.exitFullscreen()
        await overlay.requestFullscreen()
      }
    } catch (error) {
      console.error('Expose: fullscreen request failed', error)
    }
  }

  return {
    name: 'fullscreen',

    install(context) {
      ctx = context

      context.toolbar.add({
        name: 'fullscreen',
        icon: ICON,
        title: 'Fullscreen',
        onClick: () => toggle(),
      })

      unsubs.push(
        context.on('fullscreen:toggle', () => toggle()),

        context.on('close', () => {
          const overlay = context.getOverlay()
          if (document.fullscreenElement === overlay) {
            document.exitFullscreen().catch(() => {})
          }
        }),
      )

      const onFullscreenChange = () => {
        const overlay = context.getOverlay()
        context.emit('fullscreen:change', { active: document.fullscreenElement === overlay })
      }
      document.addEventListener('fullscreenchange', onFullscreenChange)
      unsubs.push(() => document.removeEventListener('fullscreenchange', onFullscreenChange))
    },

    destroy() {
      unsubs.forEach(fn => fn())
      unsubs = []
      ctx?.toolbar.remove('fullscreen')
      ctx = null
    },

    toggle,
  }
}
