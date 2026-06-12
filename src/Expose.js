import { EventBus } from '../../event-bus/index.js'
import { SlideRenderer } from './SlideRenderer.js'
import { AnimationManager } from './AnimationManager.js'
import './animations/index.js'
import { Toolbar } from './Toolbar.js'
import { lockBodyScroll, unlockBodyScroll, resolveType } from './utils.js'

/** @type {import('./types').ExposeOptions} */
const DEFAULTS = {
  loop: true,
  closeOnBackdrop: true,
  animation: 'fade',
  animationDuration: 300,
  preload: 1,
  startIndex: 0,
  toolbar: [],
  counterFormat: '{current} / {total}',
}

/**
 * ExposeJS — Lightweight, plugin-based lightbox gallery.
 * Core handles: lifecycle, navigation, slides, DOM skeleton, toolbar, events.
 * Everything else (zoom, keyboard, touch, etc.) is a plugin.
 */
export class Expose {
  /** @type {EventBus} */
  #events = new EventBus()

  /** @type {import('./types').SlideData[]} */
  #slides

  /** @type {import('./types').ExposeOptions} */
  #options

  /** @type {number} */
  #currentIndex = -1

  /** @type {boolean} */
  #isOpen = false

  /** @type {boolean} */
  #isAnimating = false

  /** @type {boolean} */
  #destroyed = false

  /* ── DOM ── */
  /** @type {HTMLElement | null} */
  #overlay = null

  /** @type {HTMLElement | null} */
  #slideContainer = null

  /** @type {HTMLElement | null} */
  #navPrev = null

  /** @type {HTMLElement | null} */
  #navNext = null

  /** @type {((e: KeyboardEvent) => void) | null} */
  #keyHandler = null

  /* ── Touch/swipe state ── */
  /** @type {{ x: number, y: number, time: number } | null} */
  #touchStart = null

  /** @type {boolean} */
  #swiping = false

  /* ── Slide DOM elements ── */
  /** @type {Map<number, { el: HTMLElement, transformEl: HTMLElement, cleanup?: () => void }>} */
  #slideElements = new Map()

  /* ── Core modules ── */
  /** @type {SlideRenderer} */
  #renderer

  /** @type {AnimationManager} */
  #animationManager

  /** @type {Toolbar | null} */
  #toolbar = null

  /** @type {import('./types').ToolbarButtonConfig[]} */
  #pendingButtons = []

  /* ── Plugins ── */
  /** @type {Map<string, { plugin: import('./types').ExposePlugin, context: import('./types').PluginContext }>} */
  #plugins = new Map()

  /**
   * Register a custom animation globally.
   * @param {string} name
   * @param {import('./types').AnimationObject} animation
   */
  static registerAnimation(name, animation) {
    AnimationManager.register(name, animation)
  }

  /**
   * @param {import('./types').SlideData[]} slides
   * @param {Partial<import('./types').ExposeOptions>} [options]
   */
  constructor(slides, options = {}) {
    this.#slides = [...slides]
    this.#options = { ...DEFAULTS, ...options }
    this.#renderer = new SlideRenderer()
    this.#animationManager = new AnimationManager(this.#options.animationDuration)

    if (options.plugins) {
      for (const plugin of options.plugins) {
        this.use(plugin)
      }
    }
  }

  /* ═══════════════ Plugin System ═══════════════ */

  /**
   * Install a plugin.
   * @param {import('./types').ExposePlugin} plugin
   * @returns {this}
   */
  use(plugin) {
    if (this.#plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already installed`)
    }

    const context = this.#createPluginContext()
    this.#plugins.set(plugin.name, { plugin, context })
    plugin.install(context)
    return this
  }

  /**
   * Get a plugin by name.
   * @param {string} name
   * @returns {import('./types').ExposePlugin | undefined}
   */
  getPlugin(name) {
    return this.#plugins.get(name)?.plugin
  }

  /**
   * Create a frozen PluginContext facade.
   * @returns {import('./types').PluginContext}
   */
  #createPluginContext() {
    return Object.freeze({
      // Events
      on: (event, handler) => this.#events.on(event, handler),
      once: (event, handler) => this.#events.once(event, handler),
      emit: (event, data) => this.#events.emit(event, data),

      // Navigation
      next: () => this.next(),
      prev: () => this.prev(),
      goTo: (index) => this.goTo(index),
      close: () => this.close(),

      // Read-only state
      getIndex: () => this.#currentIndex,
      getSlide: () => this.getSlide(),
      getSlides: () => this.getSlides(),
      isOpen: () => this.#isOpen,
      options: Object.freeze({ ...this.#options }),

      // DOM access (live getters)
      getOverlay: () => this.#overlay,
      getSlideContainer: () => this.#slideContainer,
      getSlideElement: (index) => {
        const i = index ?? this.#currentIndex
        return this.#slideElements.get(i) ?? null
      },

      // Toolbar (buffers buttons if toolbar not yet created)
      toolbar: Object.freeze({
        add: (button) => {
          if (this.#toolbar) {
            this.#toolbar.addButton(button)
          } else {
            this.#pendingButtons.push(button)
          }
        },
        remove: (name) => {
          this.#pendingButtons = this.#pendingButtons.filter(b => b.name !== name)
          this.#toolbar?.removeButton(name)
        },
        setToggleState: (name, active) => this.#toolbar?.setToggleState(name, active),
      }),

      // Utilities
      resolveType,
    })
  }

  /* ═══════════════ Events ═══════════════ */

  /**
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void}
   */
  on(event, handler) { return this.#events.on(event, handler) }

  /**
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) { this.#events.off(event, handler) }

  /**
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void}
   */
  once(event, handler) { return this.#events.once(event, handler) }

  /* ═══════════════ Public API ═══════════════ */

  /**
   * Open the gallery at the given index.
   * @param {number} [index]
   * @returns {Promise<void>}
   */
  async open(index) {
    if (this.#isOpen || this.#destroyed || this.#slides.length === 0) return

    const raw = index ?? this.#options.startIndex ?? 0
    this.#currentIndex = Math.max(0, Math.min(raw, this.#slides.length - 1))
    this.#isOpen = true

    this.#buildDOM()
    lockBodyScroll()

    // Render current + preload neighbors
    this.#renderSlide(this.#currentIndex)
    this.#showSlide(this.#currentIndex)
    this.#preloadNeighbors()

    // Notify plugins — they add their DOM here
    this.#events.emit('open', { index: this.#currentIndex })

    // Update toolbar after plugins have registered their buttons
    this.#updateToolbar()

    // Enter animation
    this.#isAnimating = true
    await this.#animationManager.enter(this.#overlay, this.#options.animation)
    this.#isAnimating = false

    this.#events.emit('open:complete', { index: this.#currentIndex })
  }

  /** Close the gallery. */
  async close() {
    if (!this.#isOpen || this.#isAnimating) return

    // Notify plugins — they clean up their DOM here
    this.#events.emit('close')

    this.#isAnimating = true
    await this.#animationManager.exit(this.#overlay, this.#options.animation)
    this.#isAnimating = false

    this.#teardownDOM()
    unlockBodyScroll()

    this.#isOpen = false
    this.#events.emit('close:complete')
  }

  /** Navigate to the next slide. */
  async next() {
    if (!this.#isOpen || this.#isAnimating) return
    const next = this.#resolveIndex(this.#currentIndex + 1)
    if (next === null) return
    await this.#goToAnimated(next, 1)
  }

  /** Navigate to the previous slide. */
  async prev() {
    if (!this.#isOpen || this.#isAnimating) return
    const prev = this.#resolveIndex(this.#currentIndex - 1)
    if (prev === null) return
    await this.#goToAnimated(prev, -1)
  }

  /**
   * Go to a specific slide by index.
   * @param {number} index
   */
  async goTo(index) {
    if (!this.#isOpen || this.#isAnimating) return
    if (index < 0 || index >= this.#slides.length || index === this.#currentIndex) return
    const direction = index > this.#currentIndex ? 1 : -1
    await this.#goToAnimated(index, direction)
  }

  /** @returns {number} */
  getIndex() { return this.#currentIndex }

  /** @returns {import('./types').SlideData | null} */
  getSlide() {
    return this.#currentIndex >= 0 ? this.#slides[this.#currentIndex] : null
  }

  /** @returns {import('./types').SlideData[]} */
  getSlides() { return [...this.#slides] }

  /**
   * Replace all slides.
   * @param {import('./types').SlideData[]} slides
   */
  setSlides(slides) {
    this.#slides = [...slides]
    if (this.#isOpen) {
      this.#clearSlideElements()
      this.#currentIndex = Math.min(this.#currentIndex, this.#slides.length - 1)
      this.#renderSlide(this.#currentIndex)
      this.#showSlide(this.#currentIndex)
      this.#preloadNeighbors()
      this.#updateToolbar()
      this.#events.emit('slides:change', { slides: this.#slides })
    }
  }

  /**
   * Add a slide at the end.
   * @param {import('./types').SlideData} slide
   */
  addSlide(slide) {
    this.#slides.push(slide)
    if (this.#isOpen) {
      this.#updateToolbar()
      this.#events.emit('slides:change', { slides: this.#slides })
    }
  }

  /**
   * Remove a slide by index.
   * @param {number} index
   */
  removeSlide(index) {
    if (index < 0 || index >= this.#slides.length || this.#isAnimating) return

    const removed = this.#slideElements.get(index)
    if (removed) {
      removed.cleanup?.()
      removed.el.remove()
      this.#slideElements.delete(index)
    }

    this.#slides.splice(index, 1)

    if (this.#slides.length === 0) {
      this.close()
      return
    }

    if (this.#currentIndex >= this.#slides.length) {
      this.#currentIndex = this.#slides.length - 1
    }

    // Re-index slide elements
    const newMap = new Map()
    for (const [i, val] of this.#slideElements) {
      const newIdx = i > index ? i - 1 : i
      newMap.set(newIdx, val)
    }
    this.#slideElements = newMap

    if (this.#isOpen) {
      this.#showSlide(this.#currentIndex)
      this.#updateToolbar()
      this.#events.emit('slides:change', { slides: this.#slides })
    }
  }

  /** @returns {boolean} */
  isOpen() { return this.#isOpen }

  /** Clean up everything. */
  destroy() {
    if (this.#destroyed) return
    this.#destroyed = true

    // Emit before clearing — plugins and consumers can hear this
    this.#events.emit('destroy')

    // Destroy all plugins
    for (const { plugin } of this.#plugins.values()) {
      plugin.destroy?.()
    }
    this.#plugins.clear()

    if (this.#isOpen) {
      this.#teardownDOM()
      unlockBodyScroll()
    }

    this.#isOpen = false
    this.#events.clear()
  }

  /* ═══════════════ DOM ═══════════════ */

  #buildDOM() {
    // Overlay (root)
    this.#overlay = document.createElement('div')
    this.#overlay.className = 'expose'
    this.#overlay.style.opacity = '0'

    if (this.#options.closeOnBackdrop) {
      this.#overlay.addEventListener('click', (e) => {
        if (e.target === this.#overlay || e.target === this.#slideContainer) {
          this.close()
        }
      })
    }

    // Slide container
    this.#slideContainer = document.createElement('div')
    this.#slideContainer.className = 'expose__slides'
    this.#overlay.appendChild(this.#slideContainer)

    // Navigation arrows
    if (this.#slides.length > 1) {
      this.#navPrev = this.#createNavButton('prev', '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"/></svg>', () => this.prev())
      this.#navNext = this.#createNavButton('next', '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg>', () => this.next())
      this.#overlay.appendChild(this.#navPrev)
      this.#overlay.appendChild(this.#navNext)
    }

    // Keyboard
    this.#keyHandler = (e) => {
      if (e.isComposing) return
      switch (e.key) {
        case 'Escape': e.preventDefault(); this.close(); break
        case 'ArrowLeft': e.preventDefault(); this.prev(); break
        case 'ArrowRight': e.preventDefault(); this.next(); break
        case 'f': case 'F':
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault()
            this.#events.emit('fullscreen:toggle')
          }
          break
      }
    }
    document.addEventListener('keydown', this.#keyHandler)

    // Touch/swipe
    this.#bindTouch()

    // Toolbar
    this.#toolbar = new Toolbar(this.#options, { close: () => this.close() })
    for (const btn of this.#pendingButtons) {
      this.#toolbar.addButton(btn)
    }
    this.#pendingButtons = []
    this.#toolbar.appendCloseButton()
    this.#overlay.appendChild(this.#toolbar.element)

    document.body.appendChild(this.#overlay)
  }

  #teardownDOM() {
    // Keyboard
    if (this.#keyHandler) {
      document.removeEventListener('keydown', this.#keyHandler)
      this.#keyHandler = null
    }

    // Touch/swipe
    this.#unbindTouch()

    this.#toolbar?.destroy()
    this.#toolbar = null

    this.#clearSlideElements()

    if (document.fullscreenElement === this.#overlay) {
      document.exitFullscreen().catch(() => {})
    }

    this.#overlay?.remove()
    this.#overlay = null
    this.#slideContainer = null
    this.#navPrev = null
    this.#navNext = null
  }

  #clearSlideElements() {
    for (const [, entry] of this.#slideElements) {
      entry.cleanup?.()
      entry.el.remove()
    }
    this.#slideElements.clear()
  }

  /* ═══════════════ Slides ═══════════════ */

  /**
   * @param {number} index
   */
  #renderSlide(index) {
    if (this.#slideElements.has(index)) return

    const slide = this.#slides[index]
    if (!slide) return

    const { element, cleanup } = this.#renderer.render(slide)

    const transformEl = document.createElement('div')
    transformEl.className = 'expose__slide-transform'
    transformEl.appendChild(element)

    const wrapper = document.createElement('div')
    wrapper.className = 'expose__slide'
    wrapper.style.display = 'none'
    wrapper.appendChild(transformEl)

    this.#slideContainer.appendChild(wrapper)
    this.#slideElements.set(index, { el: wrapper, transformEl, cleanup })

    this.#events.emit('slide:load', { index, element: wrapper })
  }

  /**
   * @param {number} index
   */
  #showSlide(index) {
    for (const [i, entry] of this.#slideElements) {
      entry.el.style.display = i === index ? '' : 'none'
    }
  }

  #preloadNeighbors() {
    const preload = this.#options.preload || 1
    for (let offset = 1; offset <= preload; offset++) {
      const next = this.#resolveIndex(this.#currentIndex + offset)
      const prev = this.#resolveIndex(this.#currentIndex - offset)
      if (next !== null) this.#renderSlide(next)
      if (prev !== null) this.#renderSlide(prev)
    }
  }

  /**
   * @param {number} index
   * @param {1 | -1} direction
   */
  async #goToAnimated(index, direction) {
    const prevIndex = this.#currentIndex

    this.#renderSlide(index)

    const currentEntry = this.#slideElements.get(prevIndex)
    const nextEntry = this.#slideElements.get(index)

    if (!currentEntry || !nextEntry) {
      this.#currentIndex = index
      this.#showSlide(index)
      this.#updateToolbar()
      return
    }

    // Stop media on the current slide
    this.#stopMedia(currentEntry.el)

    this.#isAnimating = true
    this.#currentIndex = index

    await this.#animationManager.transition(
      currentEntry.el, nextEntry.el, direction, this.#options.animation,
    )

    this.#isAnimating = false
    this.#preloadNeighbors()
    this.#updateToolbar()

    this.#events.emit('slide:change', { index, slide: this.#slides[index] })
  }

  #updateToolbar() {
    if (!this.#toolbar) return
    const slide = this.#slides[this.#currentIndex]
    this.#toolbar.updateCounter(this.#currentIndex, this.#slides.length)
    this.#toolbar.updateVisibility(slide)

    // Navigation arrows visibility (only relevant when loop is off)
    if (!this.#options.loop) {
      if (this.#navPrev) this.#navPrev.style.display = this.#currentIndex <= 0 ? 'none' : ''
      if (this.#navNext) this.#navNext.style.display = this.#currentIndex >= this.#slides.length - 1 ? 'none' : ''
    }
  }

  /**
   * @param {string} dir
   * @param {string} html
   * @param {() => void} onClick
   * @returns {HTMLButtonElement}
   */
  #createNavButton(dir, html, onClick) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `expose__nav expose__nav--${dir}`
    btn.innerHTML = html
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick()
    })
    return btn
  }

  /**
   * @param {HTMLElement} el
   */
  #stopMedia(el) {
    for (const video of el.querySelectorAll('video')) {
      video.pause()
    }
    for (const iframe of el.querySelectorAll('iframe')) {
      const src = iframe.src
      iframe.src = ''
      iframe.src = src
    }
  }

  /* ── Touch/swipe ── */

  #onTouchStart = (e) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    this.#touchStart = { x: t.clientX, y: t.clientY, time: Date.now() }
    this.#swiping = false
  }

  #onTouchMove = (e) => {
    if (!this.#touchStart || e.touches.length !== 1) return
    const t = e.touches[0]
    const dx = t.clientX - this.#touchStart.x
    const dy = t.clientY - this.#touchStart.y
    if (!this.#swiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      this.#swiping = true
    }
    if (this.#swiping) e.preventDefault()
  }

  #onTouchEnd = (e) => {
    if (!this.#touchStart || !this.#swiping) { this.#touchStart = null; return }
    const t = e.changedTouches[0]
    const dx = t.clientX - this.#touchStart.x
    const elapsed = Date.now() - this.#touchStart.time
    this.#touchStart = null
    this.#swiping = false
    if (Math.abs(dx) >= 50 || (Math.abs(dx) > 30 && elapsed < 300)) {
      if (dx < 0) this.next(); else this.prev()
    }
  }

  #bindTouch() {
    if (!this.#slideContainer) return
    this.#slideContainer.addEventListener('touchstart', this.#onTouchStart, { passive: true })
    this.#slideContainer.addEventListener('touchmove', this.#onTouchMove, { passive: false })
    this.#slideContainer.addEventListener('touchend', this.#onTouchEnd, { passive: true })
  }

  #unbindTouch() {
    if (!this.#slideContainer) return
    this.#slideContainer.removeEventListener('touchstart', this.#onTouchStart)
    this.#slideContainer.removeEventListener('touchmove', this.#onTouchMove)
    this.#slideContainer.removeEventListener('touchend', this.#onTouchEnd)
    this.#touchStart = null
    this.#swiping = false
  }

  /**
   * @param {number} index
   * @returns {number | null}
   */
  #resolveIndex(index) {
    const len = this.#slides.length
    if (len === 0) return null

    if (this.#options.loop) {
      return ((index % len) + len) % len
    }

    if (index < 0 || index >= len) return null
    return index
  }
}
