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

  /** @type {() => void} */
  #onClose

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
    if (this.#buttons.has(config.name)) return

    this.#buttonConfigs.set(config.name, config)

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'expose__toolbar-btn'
    if (config.className) btn.className += ' ' + config.className
    btn.dataset.name = config.name
    if (config.title) btn.title = config.title
    btn.innerHTML = config.icon

    if (config.toggle) {
      this.#toggleStates.set(config.name, config.active || false)
      if (config.active) btn.classList.add('expose__toolbar-btn--active')
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation()

      if (config.toggle) {
        const active = !this.#toggleStates.get(config.name)
        this.#toggleStates.set(config.name, active)
        btn.classList.toggle('expose__toolbar-btn--active', active)

        if (config.onStateChange) {
          const newIcon = config.onStateChange(active)
          if (newIcon) btn.innerHTML = newIcon
        }
      }

      config.onClick()
    })

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

    // First render — build structure
    if (this.#lastIndex === -1) {
      this.#counterEl.innerHTML = ''

      this.#counterNum = document.createElement('span')
      this.#counterNum.className = 'expose__counter-num'
      this.#counterNum.textContent = String(num)

      this.#counterSuffix = document.createElement('span')
      this.#counterSuffix.textContent = ` / ${total}`

      this.#counterEl.appendChild(this.#counterNum)
      this.#counterEl.appendChild(this.#counterSuffix)

      this.#lastIndex = current
      return
    }

    // Same index — no animation
    if (this.#lastIndex === current) return

    // Update suffix (in case total changed)
    if (this.#counterSuffix) {
      this.#counterSuffix.textContent = ` / ${total}`
    }

    const dir = current > this.#lastIndex ? 1 : -1
    this.#lastIndex = current

    const el = this.#counterNum
    if (!el) return

    const animId = ++this.#counterAnimId
    const dur = 150

    // Phase 1: roll out current number
    el.style.transition = `transform ${dur}ms ease-in, opacity ${dur}ms ease-in`
    el.style.transform = `translateY(${-dir * 100}%)`
    el.style.opacity = '0'

    setTimeout(() => {
      if (this.#counterAnimId !== animId || !this.#counterNum) return

      // Swap number, position at entry
      el.style.transition = 'none'
      el.textContent = String(num)
      el.style.transform = `translateY(${dir * 100}%)`

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
      if (btn) btn.style.display = rule(slide) ? '' : 'none'
    }
  }

  destroy() {
    this.#buttons.clear()
    this.#toggleStates.clear()
    this.#visibilityRules.clear()
    this.#buttonConfigs.clear()
    this.#counterEl = null
    this.#counterNum = null
    this.#counterSuffix = null
    this.#lastIndex = -1
    this.#counterAnimId = 0
    this.#el.innerHTML = ''
  }

  #buildCounter() {
    const el = document.createElement('span')
    el.className = 'expose__counter'
    this.#counterEl = el
    this.#el.appendChild(el)
  }

  /** @param {() => void} onClose */
  #buildCloseButton(onClose) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'expose__toolbar-btn'
    btn.title = 'Close'
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      onClose()
    })
    this.#el.appendChild(btn)
  }
}
