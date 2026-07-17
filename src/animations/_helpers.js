/**
 * Run a CSS transition via inline styles.
 * @param {HTMLElement} el
 * @param {() => void} setup — set initial styles
 * @param {() => void} go — set target styles (triggers transition)
 * @param {number} duration
 * @param {string} [props='transform,opacity']
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function cssTransition(el, setup, go, duration, props = 'transform,opacity', signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    let timer = null
    const cleanup = () => {
      if (timer !== null) clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      el.style.transition = ''
    }
    const onAbort = () => {
      cleanup()
      reject(createAbortError())
    }

    setup()
    el.offsetHeight // eslint-disable-line no-unused-expressions
    el.style.transition = props.split(',').map(p => `${p.trim()} ${duration}ms ease`).join(',')
    go()
    signal?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => {
      cleanup()
      resolve()
    }, duration)
  })
}

/**
 * Run a callback on the next animation frame, unless the operation is aborted.
 * @param {() => void} callback
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function animationFrame(callback, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    let frame = 0
    const cleanup = () => signal?.removeEventListener('abort', onAbort)
    const onAbort = () => {
      cancelAnimationFrame(frame)
      cleanup()
      reject(createAbortError())
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    frame = requestAnimationFrame(() => {
      cleanup()
      callback()
      resolve()
    })
  })
}

/**
 * Wait for a duration, unless the operation is aborted.
 * @param {number} duration
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function animationDelay(duration, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    let timer = null
    const cleanup = () => {
      if (timer !== null) clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      reject(createAbortError())
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => {
      cleanup()
      resolve()
    }, duration)
  })
}

/** @returns {Error} */
export function createAbortError() {
  if (typeof DOMException === 'function') return new DOMException('Animation aborted', 'AbortError')
  const error = new Error('Animation aborted')
  error.name = 'AbortError'
  return error
}

/**
 * Create a grid of tile divs over an image, each showing a portion via background-image.
 * @param {HTMLImageElement} img
 * @param {HTMLElement} container
 * @param {number} cols
 * @param {number} rows
 */
export function scatterTiles(img, container, cols, rows) {
  const cr = container.getBoundingClientRect()
  const ir = img.getBoundingClientRect()
  const grid = document.createElement('div')
  grid.style.cssText = 'position:absolute;inset:0;z-index:5;pointer-events:none'
  const tw = ir.width / cols, th = ir.height / rows
  const ox = ir.left - cr.left, oy = ir.top - cr.top
  const tiles = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const el = document.createElement('div')
      el.style.cssText =
        `position:absolute;left:${ox + c * tw}px;top:${oy + r * th}px;` +
        `width:${tw}px;height:${th}px;will-change:transform,opacity;backface-visibility:hidden`
      el.style.backgroundImage = `url("${img.src}")`
      el.style.backgroundSize = `${ir.width}px ${ir.height}px`
      el.style.backgroundPosition = `${-c * tw}px ${-r * th}px`
      grid.appendChild(el)
      tiles.push({ el, cx: c - cols / 2 + 0.5, cy: r - rows / 2 + 0.5, col: c, row: r })
    }
  }
  container.appendChild(grid)
  return { grid, tiles }
}

export function scatterTransform(cx, cy, dir) {
  const spread = 100 + Math.random() * 120
  const tx = cx * spread * dir + (Math.random() - 0.5) * 60
  const ty = cy * spread + (Math.random() - 0.5) * 60
  const rot = (Math.random() - 0.5) * 120
  const sc = 0.2 + Math.random() * 0.3
  return `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sc})`
}

/**
 * Fade enter reused by tile-based animations.
 * @param {HTMLElement} overlay
 * @param {number} duration
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function fadeEnter(overlay, duration, signal) {
  return cssTransition(overlay,
    () => { overlay.style.opacity = '0' },
    () => { overlay.style.opacity = '1' },
    duration,
    'transform,opacity',
    signal,
  )
}

/**
 * Fade exit reused by tile-based animations.
 * @param {HTMLElement} overlay
 * @param {number} duration
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function fadeExit(overlay, duration, signal) {
  return cssTransition(overlay,
    () => { overlay.style.opacity = '1' },
    () => { overlay.style.opacity = '0' },
    duration,
    'transform,opacity',
    signal,
  )
}

/**
 * Fade fallback for tile animations when no image is available.
 * @param {HTMLElement} current
 * @param {HTMLElement} next
 * @param {number} duration
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
export function fadeFallback(current, next, duration, signal) {
  next.style.display = ''
  next.style.opacity = '0'
  return Promise.all([
    cssTransition(current,
      () => { current.style.opacity = '1' },
      () => { current.style.opacity = '0' },
      duration,
      'transform,opacity',
      signal,
    ),
    cssTransition(next,
      () => {},
      () => { next.style.opacity = '1' },
      duration,
      'transform,opacity',
      signal,
    ),
  ]).then(() => {
    current.style.display = 'none'
    current.style.opacity = ''
    next.style.opacity = ''
  })
}
