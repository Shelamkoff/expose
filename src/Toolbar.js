/**
 * Toolbar — always-present core component.
 * Plugins register buttons via PluginContext.toolbar.add().
 */
export class Toolbar {
  /** @type {HTMLElement} */
  #el

  /** @type {HTMLElement | null} */
  #counterEl = null

  /** @type {HTMLElement | null} */
  #counterNum = null

  /** @type {HTMLElement | null} */
  #counterPrefix = null

  /** @type {HTMLElement | null} */
  #counterSuffix = null

  /** @type {number} */
  #lastIndex = -1

  /** @type {number} */
  #counterAnimId = 0

  /** @type {import('./types').ExposeOptions} */
  #options

  /** @type {Map<string, HTMLButtonElement>} */
  #buttons = new Map()

  /** @type {Map<string, boolean>} */
  #toggleStates = new Map()

  /** @type {Map<string, (slide: import('./types').SlideData) => boolean>} */
  #visibilityRules = new Map()

  /** @type {Map<string, import('./types').ToolbarButtonConfig>} */
  #buttonConfigs = new Map()

  /** @type {Map<string, AbortController>} */
  #buttonControllers = new Map()

  /** @type {(() => void) | null} */
  #onClose

  /** @type {AbortController | null} */
  #closeController = null

  /** @type {ReturnType<typeof setTimeout> | null} */
  #counterTimer = null

  #destroyed = false

  /**
   * @param {import('./types').ExposeOptions} options
   * @param {{ close(): void }} callbacks
   */
  constructor(options, callbacks) {
    this.#options = options
    this.#el = document.createElement('div')
    this.#el.className = 'expose__toolbar'

    // Build initial toolbar items from options
    for (const item of (options.toolbar || [])) {
      if (typeof item === 'string' && item === 'counter') {
        this.#buildCounter()
      } else if (typeof item === 'object' && item !== null) {
        this.addButton(item)
      }
    }

    this.#onClose = callbacks.close
  }

  /** Append the close button — call after all plugin buttons are added. */
  appendCloseButton() {
    this.#buildCloseButton(this.#onClose)
  }

  /** @returns {HTMLElement} */
  get element() { return this.#el }

  /**
   * Add a button to the toolbar.
   * @param {import('./types').ToolbarButtonConfig} config
   */
  addButton(config) {
    if (this.#destroyed) throw new Error('Toolbar is destroyed')
    if (!config || typeof config.name !== 'string' || config.name.trim() === ''
      || typeof config.icon !== 'string' || typeof config.onClick !== 'function') {
      throw new TypeError('Toolbar button requires a non-empty name, an icon, and onClick()')
    }
    if (this.#buttons.has(config.name)) throw new Error(`Toolbar button "${config.name}" already exists`)

    this.#buttonConfigs.set(config.name, config)

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'expose__toolbar-btn'
    if (config.className) btn.className += ' ' + config.className
    btn.dataset.name = config.name
    if (config.title) {
      btn.title = config.title
    }
    btn.setAttribute('aria-label', config.title || config.name)
    btn.innerHTML = config.icon

    if (config.toggle) {
      this.#toggleStates.set(config.name, config.active || false)
      if (config.active) btn.classList.add('expose__toolbar-btn--active')
    }

    const controller = new AbortController()
    this.#buttonControllers.set(config.name, controller)
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const reportError = error => {
        console.error(`Expose: toolbar action "${config.name}" failed`, error)
      }
      try {
        if (config.toggle) {
          const active = !this.#toggleStates.get(config.name)
          this.#toggleStates.set(config.name, active)
          btn.classList.toggle('expose__toolbar-btn--active', active)
          if (config.onStateChange) {
            const newIcon = config.onStateChange(active)
            if (newIcon) btn.innerHTML = newIcon
          }
        }
        const result = config.onClick()
        if (result && typeof result.then === 'function') {
          Promise.resolve(result).catch(reportError)
        }
      } catch (error) {
        reportError(error)
      }
    }, { signal: controller.signal })

    this.#buttons.set(config.name, btn)

    if (config.visible) {
      this.#visibilityRules.set(config.name, config.visible)
    }

    this.#el.appendChild(btn)
  }

  /**
   * Remove a button from the toolbar.
   * @param {string} name
   */
  removeButton(name) {
    const btn = this.#buttons.get(name)
    if (btn) {
      this.#buttonControllers.get(name)?.abort()
      this.#buttonControllers.delete(name)
      btn.remove()
      this.#buttons.delete(name)
      this.#toggleStates.delete(name)
      this.#visibilityRules.delete(name)
      this.#buttonConfigs.delete(name)
    }
  }

  /**
   * Update counter with rolling number animation (only current number rolls).
   * @param {number} current — 0-based index
   * @param {number} total
   */
  updateCounter(current, total) {
    if (!this.#counterEl) return

    const num = current + 1
    const format = this.#options.counterFormat || '{current} / {total}'
    const currentMarker = '{current}'
    const currentPosition = format.indexOf(currentMarker)

    // A format without {current} is valid, but has no number to animate.
    if (currentPosition === -1) {
      this.#counterEl.textContent = format.replaceAll('{total}', String(total))
      this.#counterPrefix = null
      this.#counterNum = null
      this.#counterSuffix = null
      this.#lastIndex = current
      return
    }

    const prefix = format.slice(0, currentPosition).replaceAll('{total}', String(total))
    const suffix = format.slice(currentPosition + currentMarker.length).replaceAll('{total}', String(total))

    // First render — build structure
    if (this.#lastIndex === -1) {
      this.#counterEl.innerHTML = ''

      this.#counterPrefix = document.createElement('span')
      this.#counterPrefix.textContent = prefix

      this.#counterNum = document.createElement('span')
      this.#counterNum.className = 'expose__counter-num'
      this.#counterNum.textContent = String(num)

      this.#counterSuffix = document.createElement('span')
      this.#counterSuffix.textContent = suffix

      this.#counterEl.appendChild(this.#counterPrefix)
      this.#counterEl.appendChild(this.#counterNum)
      this.#counterEl.appendChild(this.#counterSuffix)

      this.#lastIndex = current
      return
    }

    // Same index — no animation
    // Update surrounding text in case the total changed.
    if (this.#counterPrefix) {
      this.#counterPrefix.textContent = prefix
    }
    if (this.#counterSuffix) {
      this.#counterSuffix.textContent = suffix
    }

    // Same index: update total text without animating the current number.
    if (this.#lastIndex === current) return

    this.#lastIndex = current

    const el = this.#counterNum
    if (!el) return

    const animId = ++this.#counterAnimId
    const dur = 150

    // Phase 1: roll out current number
    el.style.transition = `transform ${dur}ms ease-in, opacity ${dur}ms ease-in`
    // The counter always rolls upward, including a last -> first loop.
    el.style.transform = 'translateY(-100%)'
    el.style.opacity = '0'

    if (this.#counterTimer) clearTimeout(this.#counterTimer)
    this.#counterTimer = setTimeout(() => {
      this.#counterTimer = null
      if (this.#counterAnimId !== animId || !this.#counterNum) return

      // Swap number, position at entry
      el.style.transition = 'none'
      el.textContent = String(num)
      el.style.transform = 'translateY(100%)'

      // Force reflow, then phase 2: roll in
      el.offsetHeight // eslint-disable-line no-unused-expressions
      el.style.transition = `transform ${dur}ms ease-out, opacity ${dur}ms ease-out`
      el.style.transform = ''
      el.style.opacity = ''
    }, dur)
  }

  /**
   * Update toggle button state.
   * @param {string} name
   * @param {boolean} active
   */
  setToggleState(name, active) {
    this.#toggleStates.set(name, active)
    const btn = this.#buttons.get(name)
    if (btn) btn.classList.toggle('expose__toolbar-btn--active', active)

    const config = this.#buttonConfigs.get(name)
    if (config?.onStateChange) {
      const newIcon = config.onStateChange(active)
      if (newIcon && btn) btn.innerHTML = newIcon
    }
  }

  /**
   * Update visibility of all buttons based on the current slide.
   * @param {import('./types').SlideData} slide
   */
  updateVisibility(slide) {
    for (const [name, rule] of this.#visibilityRules) {
      const btn = this.#buttons.get(name)
      if (!btn) continue
      try {
        btn.style.display = rule(slide) ? '' : 'none'
      } catch (error) {
        btn.style.display = 'none'
        console.error(`Expose: toolbar visibility rule "${name}" failed`, error)
      }
    }
  }

  destroy() {
    if (this.#destroyed) return
    this.#destroyed = true
    for (const controller of this.#buttonControllers.values()) controller.abort()
    this.#buttonControllers.clear()
    this.#closeController?.abort()
    this.#closeController = null
    if (this.#counterTimer) clearTimeout(this.#counterTimer)
    this.#counterTimer = null
    this.#buttons.clear()
    this.#toggleStates.clear()
    this.#visibilityRules.clear()
    this.#buttonConfigs.clear()
    this.#counterEl = null
    this.#counterPrefix = null
    this.#counterNum = null
    this.#counterSuffix = null
    this.#lastIndex = -1
    this.#counterAnimId += 1
    this.#onClose = null
    this.#el.innerHTML = ''
    this.#el.remove()
  }

  #buildCounter() {
    const el = document.createElement('span')
    el.className = 'expose__counter'
    el.setAttribute('aria-live', 'polite')
    el.setAttribute('aria-atomic', 'true')
    this.#counterEl = el
    this.#el.appendChild(el)
  }

  /** @param {() => void} onClose */
  #buildCloseButton(onClose) {
    if (this.#closeController) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'expose__toolbar-btn'
    btn.title = 'Close'
    btn.setAttribute('aria-label', 'Close')
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
    this.#closeController = new AbortController()
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      onClose()
    }, { signal: this.#closeController.signal })
    this.#el.appendChild(btn)
  }
}
