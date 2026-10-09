import { EventBus } from '@shelamkoff/event-bus'
import { SlideRenderer } from './SlideRenderer.js'
import { AnimationManager } from './AnimationManager.js'
import { Toolbar } from './Toolbar.js'
import { lockBodyScroll, unlockBodyScroll, resolveType } from './utils.js'

const ownedPluginInstances = new WeakSet()

/** @type {import('./types').ExposeOptions} */
const DEFAULTS = {
  loop: true,
  navigation: true,
  closeOnBackdrop: true,
  animation: 'fade',
  animationDuration: 300,
  preload: 1,
  startIndex: 0,
  toolbar: [],
  counterFormat: '{current} / {total}',
}

function validateOptions(options) {
  if (!Number.isFinite(options.animationDuration) || options.animationDuration < 0) {
    throw new RangeError('Expose: animationDuration must be a non-negative number')
  }
  if (!Number.isInteger(options.preload) || options.preload < 0) {
    throw new RangeError('Expose: preload must be a non-negative integer')
  }
  if (!Number.isInteger(options.startIndex) || options.startIndex < 0) {
    throw new RangeError('Expose: startIndex must be a non-negative integer')
  }
  if (typeof options.loop !== 'boolean'
    || typeof options.navigation !== 'boolean'
    || typeof options.closeOnBackdrop !== 'boolean') {
    throw new TypeError('Expose: loop, navigation, and closeOnBackdrop must be booleans')
  }
  if (typeof options.animation !== 'string' || options.animation.trim() === '') {
    throw new TypeError('Expose: animation must be a non-empty string')
  }
  if (!Array.isArray(options.toolbar)) throw new TypeError('Expose: toolbar must be an array')
  if (options.plugins !== undefined && !Array.isArray(options.plugins)) {
    throw new TypeError('Expose: plugins must be an array')
  }
  const toolbarNames = new Set()
  for (const item of options.toolbar) {
    if (item === 'counter') {
      if (toolbarNames.has('counter')) throw new TypeError('Expose: duplicate toolbar item "counter"')
      toolbarNames.add('counter')
      continue
    }
    if (!item || typeof item !== 'object' || typeof item.name !== 'string' || item.name.trim() === ''
      || typeof item.icon !== 'string' || typeof item.onClick !== 'function') {
      throw new TypeError('Expose: toolbar items must be "counter" or valid button configs')
    }
    if (toolbarNames.has(item.name)) throw new TypeError(`Expose: duplicate toolbar item "${item.name}"`)
    toolbarNames.add(item.name)
  }
  if (typeof options.counterFormat !== 'string') throw new TypeError('Expose: counterFormat must be a string')
  return options
}

function validateSlide(slide) {
  if (!slide || typeof slide !== 'object') throw new TypeError('Expose: each slide must be an object')
  const source = slide.src
  if (slide.caption !== undefined && typeof slide.caption !== 'string') throw new TypeError('Expose: caption must be a string')
  if (slide.thumb !== undefined && typeof slide.thumb !== 'string') throw new TypeError('Expose: thumb must be a string')
  if (slide.alt !== undefined && typeof slide.alt !== 'string') throw new TypeError('Expose: alt must be a string')
  if (slide.download !== undefined && typeof slide.download !== 'string' && typeof slide.download !== 'boolean') {
    throw new TypeError('Expose: download must be a string or boolean')
  }
  if (typeof source === 'function') return
  if (typeof source === 'string' && source.trim() !== '') return
  if (source && typeof source === 'object' && typeof source.url === 'string' && source.url.trim() !== '') {
    if (source.type !== undefined && !['image', 'video', 'iframe'].includes(source.type)) {
      throw new TypeError('Expose: unsupported slide source type')
    }
    for (const field of ['srcset', 'sizes', 'poster', 'allow', 'sandbox']) {
      if (source[field] !== undefined && typeof source[field] !== 'string') {
        throw new TypeError(`Expose: source ${field} must be a string`)
      }
    }
    for (const field of ['autoplay', 'muted', 'loop']) {
      if (source[field] !== undefined && typeof source[field] !== 'boolean') {
        throw new TypeError(`Expose: source ${field} must be a boolean`)
      }
    }
    return
  }
  throw new TypeError('Expose: slide source must be a URL, source object, or render function')
}

/**
 * ExposeJS — Lightweight, plugin-based lightbox gallery.
 * Core handles: lifecycle, navigation, slides, DOM skeleton, toolbar, events.
 * Everything else (zoom, keyboard, touch, etc.) is a plugin.
 */
export class Expose {
  /** @type {Expose[]} */
  static #openInstances = []

  static #rootFocus = null

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

  /** Invalidates continuations from obsolete asynchronous animations. */
  #lifecycleVersion = 0

  /** @type {AbortController | null} */
  #animationController = null

  /** @type {Promise<void> | null} */
  #closePromise = null

  /** Synchronous guard for close reentrancy before the lifecycle task starts. */
  #closing = false

  /** @type {boolean} */
  #bodyScrollLocked = false

  /** @type {HTMLElement | null} */
  #previousFocus = null

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

  /** @type {AbortController | null} */
  #domController = null

  /* ── Touch/swipe state ── */
  /** @type {{ x: number, y: number, time: number } | null} */
  #touchStart = null

  /** @type {boolean} */
  #swiping = false

  /** Plugin-scoped claims which prevent swipe navigation during zoom/pinch. */
  #swipeBlocks = new Set()

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

  /** Persistent plugin toolbar registry, reused on every open. */
  /** @type {Map<string, import('./types').ToolbarButtonConfig>} */
  #toolbarButtons = new Map()

  /* ── Plugins ── */
  /** @type {Map<string, { plugin: import('./types').ExposePlugin, context: import('./types').PluginContext, cleanupContext: () => void }>} */
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
    if (!Array.isArray(slides)) throw new TypeError('Expose: slides must be an array')
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('Expose: options must be an object')
    }
    slides.forEach(validateSlide)
    this.#slides = [...slides]
    this.#options = validateOptions({
      ...DEFAULTS,
      ...options,
      toolbar: (options.toolbar ?? DEFAULTS.toolbar).map(item => (
        typeof item === 'object' && item !== null ? { ...item } : item
      )),
      plugins: options.plugins ? [...options.plugins] : undefined,
    })
    this.#renderer = new SlideRenderer()
    this.#animationManager = new AnimationManager(this.#options.animationDuration)

    if (options.plugins) {
      try {
        for (const plugin of options.plugins) this.use(plugin)
      } catch (error) {
        this.destroy()
        throw error
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
    if (this.#destroyed) {
      throw new Error('Cannot install a plugin on a destroyed Expose instance')
    }
    if (this.#isOpen) {
      throw new Error('Cannot install a plugin while Expose is open')
    }
    if (!plugin || typeof plugin.name !== 'string' || !plugin.name || typeof plugin.install !== 'function') {
      throw new TypeError('Plugin must define a non-empty name and an install(context) function')
    }
    if (this.#plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already installed`)
    }
    if (ownedPluginInstances.has(plugin)) {
      throw new Error(`Plugin "${plugin.name}" is already owned by another Expose instance`)
    }

    const { context, cleanup } = this.#createPluginContext()
    ownedPluginInstances.add(plugin)
    try {
      const installed = plugin.install(context)
      // use() is synchronous by design. Silently accepting Promise-returning
      // installers would leak asynchronous failures and late registrations.
      if (installed && typeof installed.then === 'function') {
        void Promise.resolve(installed).catch(() => {})
        throw new TypeError('Expose: plugin install() must be synchronous (Promise returned)')
      }
      this.#plugins.set(plugin.name, { plugin, context, cleanupContext: cleanup })
    } catch (error) {
      try { plugin.destroy?.() } catch { /* preserve the installation error */ }
      cleanup()
      ownedPluginInstances.delete(plugin)
      throw error
    }
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
   * @returns {{ context: import('./types').PluginContext, cleanup: () => void }}
   */
  #createPluginContext() {
    const subscriptions = new Set()
    const toolbarButtons = new Set()
    const swipeClaim = Symbol('swipe-claim')
    const trackSubscription = (unsubscribe) => {
      let active = true
      const tracked = () => {
        if (!active) return
        active = false
        subscriptions.delete(tracked)
        unsubscribe()
      }
      subscriptions.add(tracked)
      return tracked
    }

    const { plugins: _plugins, ...publicOptions } = this.#options
    publicOptions.toolbar = Object.freeze((publicOptions.toolbar ?? []).map(item => (
      typeof item === 'object' && item !== null ? Object.freeze({ ...item }) : item
    )))
    const context = Object.freeze({
      // Events
      on: (event, handler) => trackSubscription(this.#events.on(event, handler)),
      once: (event, handler) => {
        let tracked
        const unsubscribe = this.#events.once(event, (...args) => {
          tracked?.()
          return handler(...args)
        })
        tracked = trackSubscription(unsubscribe)
        return tracked
      },
      emit: (event, ...args) => this.#events.emit(event, ...args),

      // Navigation
      next: () => this.next(),
      prev: () => this.prev(),
      goTo: (index) => this.goTo(index),
      close: () => this.close(),

      // Read-only state
      getIndex: () => this.#currentIndex,
      getSlide: () => this.getSlide(),
      getSlides: () => this.getSlides(),
      getSlideCount: () => this.#slides.length,
      isOpen: () => this.#isOpen,
      options: Object.freeze(publicOptions),

      // DOM access (live getters)
      getOverlay: () => this.#overlay,
      getSlideContainer: () => this.#slideContainer,
      getSlideElement: (index) => {
        const i = index ?? this.#currentIndex
        return this.#slideElements.get(i) ?? null
      },

      // Toolbar (the registry survives close/open cycles)
      toolbar: Object.freeze({
        add: (button) => {
          if (!button || typeof button.name !== 'string' || button.name.trim() === ''
            || typeof button.icon !== 'string' || typeof button.onClick !== 'function') {
            throw new TypeError('Toolbar button requires a non-empty name, an icon, and onClick()')
          }
          if (this.#toolbarButtons.has(button.name) || this.#options.toolbar.some(
            item => typeof item === 'object' && item !== null && item.name === button.name,
          )) {
            throw new Error(`Toolbar button "${button.name}" is already registered`)
          }
          const config = { ...button }
          toolbarButtons.add(config.name)
          this.#toolbarButtons.set(config.name, config)
          this.#toolbar?.addButton(config)
        },
        remove: (name) => {
          if (!toolbarButtons.has(name)) return
          toolbarButtons.delete(name)
          this.#toolbarButtons.delete(name)
          this.#toolbar?.removeButton(name)
        },
        setToggleState: (name, active) => {
          if (toolbarButtons.has(name)) this.#toolbar?.setToggleState(name, active)
        },
      }),

      // Scoped gesture ownership; all claims are released on plugin cleanup.
      gestures: Object.freeze({
        setSwipeBlocked: blocked => {
          if (blocked) this.#swipeBlocks.add(swipeClaim)
          else this.#swipeBlocks.delete(swipeClaim)
        },
      }),
      // Utilities
      resolveType,
    })

    return {
      context,
      cleanup: () => {
        for (const unsubscribe of [...subscriptions]) unsubscribe()
        for (const name of toolbarButtons) {
          this.#toolbarButtons.delete(name)
          this.#toolbar?.removeButton(name)
        }
        toolbarButtons.clear()
        this.#swipeBlocks.delete(swipeClaim)
      },
    }
  }

  /* ═══════════════ Events ═══════════════ */

  /**
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void}
   */
  on(event, handler) {
    this.#assertAlive()
    return this.#events.on(event, handler)
  }

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
  once(event, handler) {
    this.#assertAlive()
    return this.#events.once(event, handler)
  }

  /* ═══════════════ Public API ═══════════════ */

  /**
   * Open the gallery at the given index.
   * @param {number} [index]
   * @returns {Promise<void>}
   */
  async open(index) {
    this.#assertAlive()
    if (this.#isOpen || this.#slides.length === 0) return

    const raw = index ?? this.#options.startIndex ?? 0
    if (!Number.isInteger(raw)) throw new TypeError('Expose: open index must be an integer')
    this.#currentIndex = Math.max(0, Math.min(raw, this.#slides.length - 1))
    this.#isOpen = true
    ++this.#lifecycleVersion
    this.#previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (Expose.#openInstances.length === 0) Expose.#rootFocus = this.#previousFocus

    Expose.#openInstances.push(this)
    try {
      this.#buildDOM()
      lockBodyScroll()
      this.#bodyScrollLocked = true

    // Render current + preload neighbors
      this.#renderSlide(this.#currentIndex)
      this.#showSlide(this.#currentIndex)
      this.#preloadNeighbors()
      this.#evictOutsideWindow()
      this.#activateMedia(this.#currentIndex)

    // Notify plugins — they add their DOM here
      this.#events.emit('open', { index: this.#currentIndex })

    // Update toolbar after plugins have registered their buttons
      this.#updateToolbar()
    } catch (error) {
      this.#releaseOpenResources()
      this.#isOpen = false
      throw error
    }

    // A synchronous open listener may replace slides, close or destroy the
    // instance; do not animate a discarded overlay or steal a new transition.
    if (this.#destroyed || !this.#isOpen || this.#closing || !this.#overlay) return
    const openingOverlay = this.#overlay
    if (this.#animationController) {
      openingOverlay.style.opacity = '1'
      this.#events.emit('open:complete', { index: this.#currentIndex })
      return
    }

    this.#isAnimating = true
    const animationController = new AbortController()
    this.#animationController = animationController
    try {
      await this.#animationManager.enter(openingOverlay, this.#getAnimationName(), animationController.signal)
    } catch (error) {
      if (this.#overlay === openingOverlay) openingOverlay.style.opacity = '1'
      console.error('Expose: enter animation failed', error)
    } finally {
      // A cancelled enter must not unlock a newer navigation transition.
      if (this.#animationController === animationController) {
        this.#animationController = null
        this.#isAnimating = false
      }
    }

    if (this.#destroyed || !this.#isOpen || this.#closing || this.#overlay !== openingOverlay) return
    if (animationController.signal.aborted) openingOverlay.style.opacity = '1'
    this.#events.emit('open:complete', { index: this.#currentIndex })
  }

  /** Close the gallery. */
  close() {
    if (!this.#isOpen) return Promise.resolve()
    if (this.#closing && this.#closePromise) return this.#closePromise
    this.#closing = true
    // Start in a microtask so the shared promise exists before close listeners
    // can re-enter close() or mutate the slide collection.
    const operation = Promise.resolve().then(() => this.#performClose())
    this.#closePromise = operation
    const clear = () => {
      if (this.#closePromise !== operation) return
      this.#closePromise = null
      this.#closing = false
    }
    operation.then(clear, clear)
    return operation
  }

  async #performClose() {
    if (this.#destroyed || !this.#isOpen) return
    const interruptingAnimation = this.#isAnimating
    const lifecycleVersion = ++this.#lifecycleVersion
    this.#animationController?.abort()
    this.#animationController = null

    // Notify plugins — they clean up their DOM here
    this.#events.emit('close')
    // Application code may dispose the gallery from a close listener.
    if (this.#destroyed || !this.#isOpen || !this.#overlay) return

    this.#isAnimating = !interruptingAnimation
    if (!interruptingAnimation) {
      const animationController = new AbortController()
      this.#animationController = animationController
      try {
        await this.#animationManager.exit(this.#overlay, this.#getAnimationName(), animationController.signal)
      } catch (error) {
        console.error('Expose: exit animation failed', error)
      } finally {
        if (this.#animationController === animationController) this.#animationController = null
        if (this.#lifecycleVersion === lifecycleVersion) this.#isAnimating = false
      }
    }

    if (this.#destroyed || this.#lifecycleVersion !== lifecycleVersion) return
    this.#releaseOpenResources()

    this.#isOpen = false
    this.#events.emit('close:complete')
  }

  /** Navigate to the next slide. */
  async next() {
    if (!this.#isOpen || this.#isAnimating || this.#closing) return
    const next = this.#resolveIndex(this.#currentIndex + 1)
    if (next === null || next === this.#currentIndex) return
    await this.#goToAnimated(next, 1)
  }

  /** Navigate to the previous slide. */
  async prev() {
    if (!this.#isOpen || this.#isAnimating || this.#closing) return
    const prev = this.#resolveIndex(this.#currentIndex - 1)
    if (prev === null || prev === this.#currentIndex) return
    await this.#goToAnimated(prev, -1)
  }

  /**
   * Go to a specific slide by index.
   * @param {number} index
   */
  async goTo(index) {
    if (!Number.isInteger(index)) throw new TypeError('Expose: slide index must be an integer')
    if (!this.#isOpen || this.#isAnimating || this.#closing) return
    if (index < 0 || index >= this.#slides.length || index === this.#currentIndex) return
    const direction = index > this.#currentIndex ? 1 : -1
    await this.#goToAnimated(index, direction)
  }

  /** @returns {number} */
  getIndex() { return this.#currentIndex }

  /** @returns {import('./types').SlideData | null} */
  getSlide() {
    return this.#currentIndex >= 0 ? this.#slides[this.#currentIndex] ?? null : null
  }

  /** @returns {import('./types').SlideData[]} */
  getSlides() { return [...this.#slides] }

  /**
   * Replace all slides.
   * @param {import('./types').SlideData[]} slides
   */
  setSlides(slides) {
    this.#assertAlive()
    this.#assertNotClosing()
    if (!Array.isArray(slides)) throw new TypeError('Expose: slides must be an array')
    slides.forEach(validateSlide)
    this.#slides = [...slides]
    // Closed galleries retain the selection, but it must remain valid after
    // replacing the collection with a shorter (or empty) one.
    if (!this.#isOpen) {
      this.#currentIndex = this.#slides.length === 0
        ? -1 : Math.min(this.#currentIndex, this.#slides.length - 1)
    }
    if (this.#isOpen) {
      // Invalidate a transition that may still complete against the old slide set.
      this.#lifecycleVersion += 1
      this.#animationController?.abort()
      this.#animationController = null
      this.#isAnimating = false
      this.#clearSlideElements()
      // An interrupted 3D transition may leave the shared container tilted.
      this.#slideContainer?.style.removeProperty('perspective')
      if (this.#slides.length === 0) {
        this.#currentIndex = -1
        this.#events.emit('slides:change', { slides: [] })
        void this.close()
        return
      }
      this.#currentIndex = Math.min(this.#currentIndex, this.#slides.length - 1)
      this.#renderSlide(this.#currentIndex)
      this.#showSlide(this.#currentIndex)
      this.#preloadNeighbors()
      this.#evictOutsideWindow()
      this.#activateMedia(this.#currentIndex)
      this.#syncNavigation()
      this.#updateToolbar()
      this.#events.emit('slide:change', {
        index: this.#currentIndex,
        slide: this.#slides[this.#currentIndex],
      })
    }
    this.#events.emit('slides:change', { slides: this.getSlides() })
  }

  /**
   * Add a slide at the end.
   * @param {import('./types').SlideData} slide
   */
  addSlide(slide) {
    this.#assertAlive()
    this.#assertNotClosing()
    validateSlide(slide)
    this.#slides.push(slide)
    if (this.#isOpen) {
      this.#preloadNeighbors()
      this.#evictOutsideWindow()
      this.#syncNavigation()
      this.#updateToolbar()
    }
    this.#events.emit('slides:change', { slides: this.getSlides() })
  }

  /**
   * Remove a slide by index.
   * @param {number} index
   */
  removeSlide(index) {
    this.#assertAlive()
    this.#assertNotClosing()
    if (!Number.isInteger(index)) throw new TypeError('Expose: slide index must be an integer')
    if (index < 0 || index >= this.#slides.length || this.#isAnimating) return

    const removed = this.#slideElements.get(index)
    if (removed) {
      try { removed.cleanup?.() } catch (error) {
        console.error('Expose: slide cleanup failed', error)
      }
      removed.el.remove()
      this.#slideElements.delete(index)
    }

    this.#slides.splice(index, 1)

    if (this.#slides.length === 0) {
      this.#currentIndex = -1
      this.#events.emit('slides:change', { slides: [] })
      void this.close()
      return
    }

    if (index < this.#currentIndex) {
      this.#currentIndex -= 1
    } else if (this.#currentIndex >= this.#slides.length) {
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
      this.#renderSlide(this.#currentIndex)
      this.#showSlide(this.#currentIndex)
      this.#preloadNeighbors()
      this.#evictOutsideWindow()
      this.#activateMedia(this.#currentIndex)
      this.#syncNavigation()
      this.#updateToolbar()
      this.#events.emit('slide:change', {
        index: this.#currentIndex,
        slide: this.#slides[this.#currentIndex],
      })
    }
    this.#events.emit('slides:change', { slides: this.getSlides() })
  }

  /** @returns {boolean} */
  isOpen() { return this.#isOpen }

  /** Clean up everything. */
  destroy() {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#lifecycleVersion += 1
    this.#animationController?.abort()
    this.#animationController = null
    this.#closePromise = null
    this.#closing = false
    this.#isAnimating = false

    // Emit before clearing — plugins and consumers can hear this
    this.#events.emit('destroy')

    // Destroy all plugins
    const plugins = [...this.#plugins.values()]
    for (let i = plugins.length - 1; i >= 0; i--) {
      const { plugin, cleanupContext } = plugins[i]
      try {
        plugin.destroy?.()
      } catch (error) {
        console.error(`Expose: plugin "${plugin.name}" failed to destroy`, error)
      } finally {
        cleanupContext()
        ownedPluginInstances.delete(plugin)
      }
    }
    this.#plugins.clear()

    if (this.#isOpen) {
      this.#releaseOpenResources()
    }

    this.#isOpen = false
    this.#toolbarButtons.clear()
    this.#slides = []
    this.#options = {}
    this.#swipeBlocks.clear()
    this.#events.clear()
  }

  #assertAlive() {
    if (this.#destroyed) throw new Error('Expose is destroyed')
  }

  #assertNotClosing() {
    if (this.#closing) throw new Error('Expose is closing')
  }

  /* ═══════════════ DOM ═══════════════ */

  #buildDOM() {
    this.#domController = new AbortController()
    const signal = this.#domController.signal
    // Overlay (root)
    this.#overlay = document.createElement('div')
    this.#overlay.className = 'expose'
    this.#overlay.style.opacity = '0'
    this.#overlay.setAttribute('role', 'dialog')
    this.#overlay.setAttribute('aria-modal', 'true')
    this.#overlay.setAttribute('aria-label', 'Image gallery')
    this.#overlay.tabIndex = -1

    if (this.#options.closeOnBackdrop) {
      this.#overlay.addEventListener('click', (e) => {
        if (e.target === this.#overlay || e.target === this.#slideContainer) {
          this.close()
        }
      }, { signal })
    }

    // Slide container
    this.#slideContainer = document.createElement('div')
    this.#slideContainer.className = 'expose__slides'
    this.#overlay.appendChild(this.#slideContainer)

    this.#syncNavigation()

    // Keyboard
    this.#keyHandler = (e) => {
      if (Expose.#openInstances.at(-1) !== this || e.isComposing || e.defaultPrevented) return
      if (e.key === 'Escape') {
        e.preventDefault()
        void this.close()
        return
      }
      if (e.key === 'Tab') {
        this.#trapFocus(e)
        return
      }
      // Inputs and application editors own their keyboard interactions,
      // including elements nested within a shadow root.
      if (e.ctrlKey || e.altKey || e.metaKey) return
      const target = e.composedPath?.()[0] ?? e.target
      if (target?.isContentEditable || target?.closest?.(
        'input, textarea, select, [contenteditable], [role="textbox"]',
      )) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          void this.prev()
          break
        case 'ArrowRight':
          e.preventDefault()
          void this.next()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          this.#events.emit('fullscreen:toggle')
          break
      }
    }
    document.addEventListener('keydown', this.#keyHandler)

    // Touch/swipe
    this.#bindTouch()

    // Toolbar
    this.#toolbar = new Toolbar(this.#options, { close: () => this.close() })
    for (const btn of this.#toolbarButtons.values()) {
      this.#toolbar.addButton(btn)
    }
    this.#toolbar.appendCloseButton()
    this.#overlay.appendChild(this.#toolbar.element)

    document.body.appendChild(this.#overlay)
    this.#overlay.focus({ preventScroll: true })
  }

  #teardownDOM() {
    // Keyboard
    if (this.#keyHandler) {
      document.removeEventListener('keydown', this.#keyHandler)
      this.#keyHandler = null
    }

    // Touch/swipe
    this.#unbindTouch()
    this.#domController?.abort()
    this.#domController = null

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
    this.#previousFocus = null
  }

  #syncNavigation() {
    if (!this.#overlay) return
    if (!this.#options.navigation || this.#slides.length <= 1) {
      this.#navPrev?.remove()
      this.#navNext?.remove()
      this.#navPrev = null
      this.#navNext = null
      return
    }
    if (!this.#navPrev) {
      this.#navPrev = this.#createNavButton('prev', '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"/></svg>', () => this.prev())
      this.#overlay.appendChild(this.#navPrev)
    }
    if (!this.#navNext) {
      this.#navNext = this.#createNavButton('next', '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg>', () => this.next())
      this.#overlay.appendChild(this.#navNext)
    }
  }

  /** @param {KeyboardEvent} event */
  #trapFocus(event) {
    if (!this.#overlay) return
    const focusable = [...this.#overlay.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => element instanceof HTMLElement && element.offsetParent !== null)
    if (focusable.length === 0) {
      event.preventDefault()
      this.#overlay.focus({ preventScroll: true })
      return
    }
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!this.#overlay.contains(document.activeElement)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === this.#overlay)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  #releaseOpenResources() {
    const wasTopmost = Expose.#openInstances.at(-1) === this
    const previousFocus = this.#previousFocus
    this.#teardownDOM()
    const index = Expose.#openInstances.lastIndexOf(this)
    if (index !== -1) Expose.#openInstances.splice(index, 1)
    if (this.#bodyScrollLocked) {
      unlockBodyScroll()
      this.#bodyScrollLocked = false
    }

    if (wasTopmost) {
      const underneath = Expose.#openInstances.at(-1)
      if (underneath?.#overlay) {
        const target = previousFocus?.isConnected && underneath.#overlay.contains(previousFocus)
          ? previousFocus : underneath.#overlay
        target.focus({ preventScroll: true })
      } else if (Expose.#rootFocus?.isConnected) {
        Expose.#rootFocus.focus({ preventScroll: true })
      }
    }
    if (Expose.#openInstances.length === 0) Expose.#rootFocus = null
  }

  #clearSlideElements() {
    for (const [, entry] of this.#slideElements) {
      try {
        entry.cleanup?.()
      } catch (error) {
        console.error('Expose: slide cleanup failed', error)
      }
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
    const preload = Math.min(this.#options.preload ?? 1, Math.max(0, this.#slides.length - 1))
    for (let offset = 1; offset <= preload; offset++) {
      const next = this.#resolveIndex(this.#currentIndex + offset)
      const prev = this.#resolveIndex(this.#currentIndex - offset)
      if (next !== null) this.#renderSlide(next)
      if (prev !== null) this.#renderSlide(prev)
    }
  }

  /** Keep only the selected slide and its configured preload window. */
  #evictOutsideWindow() {
    if (this.#currentIndex < 0) return
    const keep = new Set([this.#currentIndex])
    const preload = Math.min(this.#options.preload ?? 1, Math.max(0, this.#slides.length - 1))
    for (let offset = 1; offset <= preload; offset++) {
      const next = this.#resolveIndex(this.#currentIndex + offset)
      const prev = this.#resolveIndex(this.#currentIndex - offset)
      if (next !== null) keep.add(next)
      if (prev !== null) keep.add(prev)
    }
    for (const [index, entry] of this.#slideElements) {
      if (keep.has(index)) continue
      try { entry.cleanup?.() } catch (error) {
        console.error('Expose: slide cleanup failed', error)
      }
      entry.el.remove()
      this.#slideElements.delete(index)
    }
  }

  #activateMedia(index) {
    const entry = this.#slideElements.get(index)
    if (!entry) return
    for (const iframe of entry.el.querySelectorAll('iframe[data-expose-src]')) {
      if (iframe.dataset.exposeActive === 'true') continue
      iframe.src = iframe.dataset.exposeSrc
      iframe.dataset.exposeActive = 'true'
    }
    for (const video of entry.el.querySelectorAll('video[data-expose-autoplay]')) {
      try {
        const pending = video.play()
        if (pending?.catch) pending.catch(() => {})
      } catch { /* autoplay may be denied by browser policy */ }
    }
  }

  /**
   * @param {number} index
   * @param {1 | -1} direction
   */
  async #goToAnimated(index, direction) {
    const prevIndex = this.#currentIndex
    const lifecycleVersion = this.#lifecycleVersion
    this.#isAnimating = true

    let currentEntry
    let nextEntry
    try {
      this.#renderSlide(index)
      // slide:load callbacks may replace the entire collection or close the
      // overlay. Never resume navigation with entries from a newer generation.
      if (this.#lifecycleVersion !== lifecycleVersion || this.#destroyed
        || !this.#isOpen || this.#closing) return
      currentEntry = this.#slideElements.get(prevIndex)
      nextEntry = this.#slideElements.get(index)
      if (!nextEntry) throw new Error('Expose: navigation target could not be rendered')

      if (currentEntry) this.#stopMedia(currentEntry.el)
      this.#currentIndex = index
      this.#activateMedia(index)

      if (currentEntry && currentEntry !== nextEntry) {
        const animationController = new AbortController()
        this.#animationController = animationController
        try {
          await this.#animationManager.transition(
            currentEntry.el, nextEntry.el, direction, this.#getAnimationName(), animationController.signal,
          )
        } finally {
          if (this.#animationController === animationController) this.#animationController = null
        }
      }
    } catch (error) {
      console.error('Expose: slide transition failed', error)
    } finally {
      const stillCurrent = this.#lifecycleVersion === lifecycleVersion
      this.#resetTransitionStyles(currentEntry?.el, nextEntry?.el, stillCurrent)
      if (stillCurrent) this.#isAnimating = false
    }

    if (this.#destroyed || !this.#isOpen || this.#lifecycleVersion !== lifecycleVersion) return
    if (this.#slideElements.has(this.#currentIndex)) {
      this.#showSlide(this.#currentIndex)
      this.#preloadNeighbors()
      this.#evictOutsideWindow()
      this.#updateToolbar()
      this.#events.emit('slide:change', {
        index: this.#currentIndex,
        slide: this.#slides[this.#currentIndex],
      })
    }
  }

  #resetTransitionStyles(current, next, resetContainer) {
    for (const element of [current, next]) {
      if (!element) continue
      for (const prop of ['opacity', 'transform', 'transform-origin', 'filter', 'clip-path', 'z-index']) {
        element.style.removeProperty(prop)
      }
    }
    if (resetContainer && this.#slideContainer) this.#slideContainer.style.removeProperty('perspective')
  }

  #getAnimationName() {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'none' : this.#options.animation
  }

  #updateToolbar() {
    if (!this.#toolbar) return
    const slide = this.#slides[this.#currentIndex]
    if (!slide) return
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
    btn.setAttribute('aria-label', dir === 'prev' ? 'Previous slide' : 'Next slide')
    btn.innerHTML = html
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick()
    }, { signal: this.#domController?.signal })
    return btn
  }

  /**
   * @param {HTMLElement} el
   */
  #stopMedia(el) {
    for (const video of el.querySelectorAll('video')) video.pause()
    for (const iframe of el.querySelectorAll('iframe[data-expose-src]')) {
      iframe.dataset.exposeActive = 'false'
      iframe.src = 'about:blank'
    }
  }

  /* ── Touch/swipe ── */

  #onTouchStart = (e) => {
    if (e.touches.length !== 1 || this.#swipeBlocks.size > 0) {
      this.#touchStart = null
      this.#swiping = false
      return
    }
    const t = e.touches[0]
    this.#touchStart = { x: t.clientX, y: t.clientY, time: Date.now() }
    this.#swiping = false
  }

  #onTouchMove = (e) => {
    if (e.touches.length !== 1 || this.#swipeBlocks.size > 0) {
      this.#touchStart = null
      this.#swiping = false
      return
    }
    if (!this.#touchStart) return
    const t = e.touches[0]
    const dx = t.clientX - this.#touchStart.x
    const dy = t.clientY - this.#touchStart.y
    if (!this.#swiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      this.#swiping = true
    }
    if (this.#swiping) e.preventDefault()
  }

  #onTouchEnd = (e) => {
    if (!this.#touchStart || !this.#swiping || this.#swipeBlocks.size > 0) {
      this.#touchStart = null
      this.#swiping = false
      return
    }
    const t = e.changedTouches[0]
    if (!t) {
      this.#touchStart = null
      this.#swiping = false
      return
    }
    const dx = t.clientX - this.#touchStart.x
    const elapsed = Date.now() - this.#touchStart.time
    this.#touchStart = null
    this.#swiping = false
    if (Math.abs(dx) >= 50 || (Math.abs(dx) > 30 && elapsed < 300)) {
      if (dx < 0) this.next(); else this.prev()
    }
  }

  #onTouchCancel = () => {
    this.#touchStart = null
    this.#swiping = false
  }

  #bindTouch() {
    if (!this.#slideContainer) return
    const signal = this.#domController?.signal
    this.#slideContainer.addEventListener('touchstart', this.#onTouchStart, { passive: true, signal })
    this.#slideContainer.addEventListener('touchmove', this.#onTouchMove, { passive: false, signal })
    this.#slideContainer.addEventListener('touchend', this.#onTouchEnd, { passive: true, signal })
    this.#slideContainer.addEventListener('touchcancel', this.#onTouchCancel, { passive: true, signal })
  }

  #unbindTouch() {
    if (!this.#slideContainer) return
    this.#slideContainer.removeEventListener('touchstart', this.#onTouchStart)
    this.#slideContainer.removeEventListener('touchmove', this.#onTouchMove)
    this.#slideContainer.removeEventListener('touchend', this.#onTouchEnd)
    this.#slideContainer.removeEventListener('touchcancel', this.#onTouchCancel)
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
