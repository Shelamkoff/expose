import { clamp } from './utils.js'

/**
 * Zoom, pan, and pinch handler for image slides.
 * - Wheel: zoom in/out from cursor position
 * - Pinch: two-finger zoom from center of touches
 * - Pan: drag when zoomed in (scale > 1)
 * - Double-click: toggle between 1x and 2x
 * Resets on slide change.
 */
export class ZoomManager {
  /** @type {{ emit(event: string, data?: any): void }} */
  #emitter

  /** @type {HTMLElement | null} */
  #container = null

  /** @type {HTMLElement | null} */
  #target = null

  /** @type {number} */
  #scale = 1

  /** @type {number} */
  #translateX = 0

  /** @type {number} */
  #translateY = 0

  /** @type {number} */
  #minScale

  /** @type {number} */
  #maxScale

  /** @type {number} */
  #step

  /* ── Pan state ── */
  /** @type {boolean} */
  #isPanning = false

  /** @type {number} */
  #panStartX = 0

  /** @type {number} */
  #panStartY = 0

  /** @type {number} */
  #panStartTX = 0

  /** @type {number} */
  #panStartTY = 0

  /* ── Pinch state ── */
  /** @type {Map<number, PointerEvent>} */
  #pointers = new Map()

  /** @type {number} */
  #pinchStartDist = 0

  /** @type {number} */
  #pinchStartScale = 1

  /* ── Double-click ── */
  /** @type {number} */
  #lastClickTime = 0

  /* ── Bound handlers ── */
  #onWheel
  #onPointerDown
  #onPointerMove
  #onPointerUp
  #onClick

  /**
   * @param {{ emit(event: string, data?: any): void }} emitter
   * @param {import('./types').ExposeOptions} options
   */
  constructor(emitter, options) {
    this.#emitter = emitter
    this.#minScale = options.zoomMin ?? 1
    this.#maxScale = options.zoomMax ?? 4
    this.#step = options.zoomStep ?? 0.5

    this.#onWheel = (e) => this.#handleWheel(e)
    this.#onPointerDown = (e) => this.#handlePointerDown(e)
    this.#onPointerMove = (e) => this.#handlePointerMove(e)
    this.#onPointerUp = (e) => this.#handlePointerUp(e)
    this.#onClick = (e) => this.#handleClick(e)
  }

  /**
   * Attach zoom to a slide container.
   * @param {HTMLElement} container — the .expose__slide element
   */
  attach(container) {
    this.detach()
    this.#container = container
    this.#target = container.querySelector('.expose__image')

    if (!this.#target) return

    this.#container.addEventListener('wheel', this.#onWheel, { passive: false })
    this.#container.addEventListener('pointerdown', this.#onPointerDown)
    this.#container.addEventListener('pointermove', this.#onPointerMove)
    this.#container.addEventListener('pointerup', this.#onPointerUp)
    this.#container.addEventListener('pointercancel', this.#onPointerUp)
    this.#container.addEventListener('click', this.#onClick)

    this.#container.style.touchAction = 'none'
  }

  detach() {
    if (!this.#container) return

    this.#container.removeEventListener('wheel', this.#onWheel)
    this.#container.removeEventListener('pointerdown', this.#onPointerDown)
    this.#container.removeEventListener('pointermove', this.#onPointerMove)
    this.#container.removeEventListener('pointerup', this.#onPointerUp)
    this.#container.removeEventListener('pointercancel', this.#onPointerUp)
    this.#container.removeEventListener('click', this.#onClick)

    this.#container.style.touchAction = ''
    this.#container = null
    this.#target = null
    this.#pointers.clear()
  }

  reset() {
    this.#scale = 1
    this.#translateX = 0
    this.#translateY = 0
    this.#isPanning = false
    this.#pointers.clear()
    this.#applyTransform()
  }

  /** Zoom in by one step. */
  zoomIn() {
    this.#setScale(this.#scale + this.#step)
  }

  /** Zoom out by one step. */
  zoomOut() {
    this.#setScale(this.#scale - this.#step)
  }

  /** @returns {number} current scale */
  getScale() { return this.#scale }

  destroy() {
    this.detach()
  }

  /**
   * @param {number} newScale
   * @param {number} [originX] — viewport X of zoom origin
   * @param {number} [originY] — viewport Y of zoom origin
   */
  #setScale(newScale, originX, originY) {
    const prev = this.#scale
    this.#scale = clamp(newScale, this.#minScale, this.#maxScale)

    if (this.#scale === prev) return

    // Adjust translation to zoom towards origin point
    if (originX !== undefined && originY !== undefined && this.#target) {
      const rect = this.#target.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2

      const factor = this.#scale / prev
      this.#translateX = originX - factor * (originX - cx) - cx + this.#translateX * factor
      this.#translateY = originY - factor * (originY - cy) - cy + this.#translateY * factor
    }

    // Reset translation if zoomed back to 1x
    if (this.#scale <= this.#minScale) {
      this.#translateX = 0
      this.#translateY = 0
    }

    this.#clampTranslation()
    this.#applyTransform()
    this.#emitter.emit('zoom:change', { scale: this.#scale })
  }

  #applyTransform() {
    if (!this.#target) return
    this.#target.style.transform =
      `translate3d(${this.#translateX}px, ${this.#translateY}px, 0) scale(${this.#scale})`
    this.#target.style.transformOrigin = 'center center'
  }

  #clampTranslation() {
    if (!this.#target || !this.#container || this.#scale <= 1) {
      this.#translateX = 0
      this.#translateY = 0
      return
    }

    const rect = this.#container.getBoundingClientRect()
    const maxTX = (this.#scale - 1) * rect.width / 2
    const maxTY = (this.#scale - 1) * rect.height / 2

    this.#translateX = clamp(this.#translateX, -maxTX, maxTX)
    this.#translateY = clamp(this.#translateY, -maxTY, maxTY)
  }

  /* ── Wheel zoom ── */
  /** @param {WheelEvent} e */
  #handleWheel(e) {
    if (!this.#target) return
    e.preventDefault()

    const delta = -Math.sign(e.deltaY) * this.#step
    this.#setScale(this.#scale + delta, e.clientX, e.clientY)
  }

  /* ── Pointer events (pan + pinch) ── */
  /** @param {PointerEvent} e */
  #handlePointerDown(e) {
    if (!this.#target) return

    this.#pointers.set(e.pointerId, e)

    if (this.#pointers.size === 1 && this.#scale > 1) {
      // Start pan
      this.#isPanning = true
      this.#panStartX = e.clientX
      this.#panStartY = e.clientY
      this.#panStartTX = this.#translateX
      this.#panStartTY = this.#translateY
      this.#container.setPointerCapture(e.pointerId)
    } else if (this.#pointers.size === 2) {
      // Start pinch
      this.#isPanning = false
      const [p1, p2] = [...this.#pointers.values()]
      this.#pinchStartDist = this.#pointerDist(p1, p2)
      this.#pinchStartScale = this.#scale
    }
  }

  /** @param {PointerEvent} e */
  #handlePointerMove(e) {
    if (!this.#target) return

    this.#pointers.set(e.pointerId, e)

    if (this.#pointers.size === 2) {
      // Pinch zoom
      const [p1, p2] = [...this.#pointers.values()]
      const dist = this.#pointerDist(p1, p2)
      const ratio = dist / this.#pinchStartDist

      const cx = (p1.clientX + p2.clientX) / 2
      const cy = (p1.clientY + p2.clientY) / 2

      this.#setScale(this.#pinchStartScale * ratio, cx, cy)
    } else if (this.#isPanning && this.#pointers.size === 1) {
      // Pan
      this.#translateX = this.#panStartTX + (e.clientX - this.#panStartX)
      this.#translateY = this.#panStartTY + (e.clientY - this.#panStartY)
      this.#clampTranslation()
      this.#applyTransform()
    }
  }

  /** @param {PointerEvent} e */
  #handlePointerUp(e) {
    this.#pointers.delete(e.pointerId)

    if (this.#pointers.size < 2) {
      this.#pinchStartDist = 0
    }
    if (this.#pointers.size === 0) {
      this.#isPanning = false
    }
  }

  /* ── Double-click toggle ── */
  /** @param {MouseEvent} e */
  #handleClick(e) {
    const now = Date.now()
    if (now - this.#lastClickTime < 300) {
      // Double click
      e.preventDefault()
      if (this.#scale > this.#minScale) {
        this.#setScale(this.#minScale)
      } else {
        this.#setScale(2, e.clientX, e.clientY)
      }
      this.#lastClickTime = 0
    } else {
      this.#lastClickTime = now
    }
  }

  /**
   * @param {PointerEvent} p1
   * @param {PointerEvent} p2
   * @returns {number}
   */
  #pointerDist(p1, p2) {
    const dx = p1.clientX - p2.clientX
    const dy = p1.clientY - p2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }
}
