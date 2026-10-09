const ICONS = {
  play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16l13 -8l-13 -8"/></svg>',
  pause: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12"/><path d="M14 6a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1l0 -12"/></svg>',
}

/**
 * Autoplay plugin - automatic slide progression with progress bar.
 *
 * @param {object} [options]
 * @param {number} [options.interval=3000] - ms between slides
 * @returns {import('../types').ExposePlugin}
 */
export function createAutoplay(options = {}) {
  /** @type {import('../types').PluginContext | null} */
  let ctx = null
  /** @type {Array<() => void>} */
  let unsubs = []
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null
  let active = false
  /** @type {HTMLElement | null} */
  let bar = null

  const interval = options.interval ?? 3000
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new RangeError('Expose autoplay interval must be a positive number')
  }

  function showBar() {
    if (!bar) return
    bar.style.display = ''
    bar.style.animationDuration = interval + 'ms'
    bar.classList.remove('expose__autoplay-bar--active')
    void bar.offsetWidth
    bar.classList.add('expose__autoplay-bar--active')
  }

  function hideBar() {
    if (!bar) return
    bar.classList.remove('expose__autoplay-bar--active')
    bar.style.display = 'none'
  }

  function restartBar() {
    if (!bar || !active) return
    bar.classList.remove('expose__autoplay-bar--active')
    void bar.offsetWidth
    bar.style.animationDuration = interval + 'ms'
    bar.classList.add('expose__autoplay-bar--active')
  }

  function syncInactiveUi() {
    ctx?.toolbar.setToggleState('autoplay', false)
    hideBar()
  }

  function isAtEnd(context) {
    const count = context.getSlideCount()
    return count <= 1 || (!context.options?.loop && context.getIndex() >= count - 1)
  }

  function start() {
    if (active) return true
    if (!ctx?.isOpen() || isAtEnd(ctx)) {
      syncInactiveUi()
      return false
    }
    active = true
    const c = ctx
    schedule(c)
    c.toolbar.setToggleState('autoplay', true)
    showBar()
    c.emit('autoplay:start')
    return true
  }

  function stop() {
    if (!active) {
      syncInactiveUi()
      return false
    }
    active = false
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    ctx?.toolbar.setToggleState('autoplay', false)
    hideBar()
    ctx?.emit('autoplay:stop')
    return true
  }

  function toggle() {
    if (active) stop()
    else start()
  }

  /** @param {import('../types').PluginContext} context */
  function schedule(context) {
    if (timer) clearTimeout(timer)
    if (!active) return
    timer = setTimeout(async () => {
      timer = null
      if (!active || !context.isOpen()) return
      if (isAtEnd(context)) {
        stop()
        return
      }
      await context.next()
      if (active && !timer) schedule(context)
    }, interval)
  }

  return {
    name: 'autoplay',

    install(context) {
      ctx = context

      context.toolbar.add({
        name: 'autoplay',
        icon: ICONS.play,
        title: 'Autoplay',
        toggle: true,
        onClick: () => toggle(),
        onStateChange: (isActive) => isActive ? ICONS.pause : ICONS.play,
      })

      unsubs.push(
        context.on('open', () => {
          const overlay = context.getOverlay()
          if (!overlay) return

          bar = document.createElement('div')
          bar.className = 'expose__autoplay-bar'
          bar.style.display = 'none'
          overlay.appendChild(bar)
        }),

        context.on('slide:change', () => {
          if (!active) return
          if (isAtEnd(context)) {
            stop()
            return
          }
          schedule(context)
          restartBar()
        }),

        context.on('slides:change', () => {
          if (!active) return
          if (isAtEnd(context)) {
            stop()
            return
          }
          schedule(context)
          restartBar()
        }),

        context.on('close', () => {
          stop()
          bar?.remove()
          bar = null
        }),
      )
    },

    destroy() {
      stop()
      unsubs.forEach(fn => fn())
      unsubs = []
      bar?.remove()
      bar = null
      ctx?.toolbar.remove('autoplay')
      ctx = null
    },

    start,
    stop,
    toggle,
    isActive() { return active },
  }
}
