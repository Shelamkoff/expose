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

  function toggle() {
    if (!ctx) return
    const overlay = ctx.getOverlay()
    if (!overlay) return

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
      ctx.emit('fullscreen:change', { active: false })
    } else {
      overlay.requestFullscreen().catch(() => {})
      ctx.emit('fullscreen:change', { active: true })
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
