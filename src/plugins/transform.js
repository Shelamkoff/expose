const ICONS = {
  rotateCW: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5"/></svg>',
  rotateCCW: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.95 11a8 8 0 1 0 -.5 4m.5 5v-5h-5"/></svg>',
  flipH: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l18 0"/><path d="M7 16l10 0l-10 5l0 -5"/><path d="M7 8l10 0l-10 -5l0 5"/></svg>',
  flipV: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l0 18"/><path d="M16 7l0 10l5 0l-5 -10"/><path d="M8 7l0 10l-5 0l5 -10"/></svg>',
}

/**
 * Transform plugin — rotation and flip for image slides.
 * @returns {import('../types').ExposePlugin}
 */
export function createTransform() {
  /** @type {import('../types').PluginContext | null} */
  let ctx = null
  /** @type {Array<() => void>} */
  let unsubs = []
  /** @type {Map<number, { rotation: number, flipH: boolean, flipV: boolean }>} */
  const transforms = new Map()

  /** @param {import('../types').SlideData} slide */
  const isImage = (slide) => ctx?.resolveType(slide.src) === 'image'

  /**
   * @param {number} index
   * @returns {{ rotation: number, flipH: boolean, flipV: boolean }}
   */
  function getState(index) {
    let state = transforms.get(index)
    if (!state) {
      state = { rotation: 0, flipH: false, flipV: false }
      transforms.set(index, state)
    }
    return state
  }

  function apply() {
    if (!ctx) return
    const entry = ctx.getSlideElement()
    if (!entry?.transformEl) return
    const t = getState(ctx.getIndex())
    entry.transformEl.style.transform =
      `rotate(${t.rotation}deg) scaleX(${t.flipH ? -1 : 1}) scaleY(${t.flipV ? -1 : 1})`
  }

  function rotateCW() {
    if (!ctx) return
    const t = getState(ctx.getIndex())
    t.rotation += 90
    apply()
    ctx.emit('rotate', { rotation: t.rotation })
  }

  function rotateCCW() {
    if (!ctx) return
    const t = getState(ctx.getIndex())
    t.rotation -= 90
    apply()
    ctx.emit('rotate', { rotation: t.rotation })
  }

  function flipH() {
    if (!ctx) return
    const t = getState(ctx.getIndex())
    t.flipH = !t.flipH
    apply()
    ctx.emit('flip', { flipH: t.flipH, flipV: t.flipV })
  }

  function flipV() {
    if (!ctx) return
    const t = getState(ctx.getIndex())
    t.flipV = !t.flipV
    apply()
    ctx.emit('flip', { flipH: t.flipH, flipV: t.flipV })
  }

  return {
    name: 'transform',

    install(context) {
      ctx = context

      context.toolbar.add({
        name: 'rotate-cw', icon: ICONS.rotateCW, title: 'Rotate clockwise',
        visible: isImage, onClick: () => rotateCW(),
      })
      context.toolbar.add({
        name: 'rotate-ccw', icon: ICONS.rotateCCW, title: 'Rotate counter-clockwise',
        visible: isImage, onClick: () => rotateCCW(),
      })
      context.toolbar.add({
        name: 'flip-h', icon: ICONS.flipH, title: 'Flip horizontal',
        visible: isImage, onClick: () => flipH(),
      })
      context.toolbar.add({
        name: 'flip-v', icon: ICONS.flipV, title: 'Flip vertical',
        visible: isImage, onClick: () => flipV(),
      })

      unsubs.push(
        context.on('close', () => transforms.clear()),
        context.on('slide:change', () => apply()),
        context.on('slides:change', () => {
          transforms.clear()
          for (let index = 0; index < context.getSlideCount(); index++) {
            const entry = context.getSlideElement(index)
            if (entry?.transformEl) entry.transformEl.style.transform = ''
          }
        }),
      )
    },

    destroy() {
      unsubs.forEach(fn => fn())
      unsubs = []
      transforms.clear()
      ctx?.toolbar.remove('rotate-cw')
      ctx?.toolbar.remove('rotate-ccw')
      ctx?.toolbar.remove('flip-h')
      ctx?.toolbar.remove('flip-v')
      ctx = null
    },

    rotateCW,
    rotateCCW,
    flipH,
    flipV,
  }
}
