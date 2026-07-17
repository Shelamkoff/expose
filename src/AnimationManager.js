/**
 * Registry of named animations + orchestration of enter/exit/transition.
 * Animations self-register via AnimationManager.register() from animations/*.js
 */
export class AnimationManager {
  /** @type {Map<string, import('./types').AnimationObject>} */
  static #registry = new Map()

  /** @type {number} */
  #duration

  /**
   * @param {number} duration — animation duration in ms
   */
  constructor(duration = 300) {
    AnimationManager.#validateDuration(duration)
    this.#duration = duration
  }

  /**
   * Register a named animation globally.
   * @param {string} name
   * @param {import('./types').AnimationObject} animation
   */
  static register(name, animation) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new TypeError('Animation name must be a non-empty string')
    }
    if (!animation || ['enter', 'exit', 'transition'].some(method => typeof animation[method] !== 'function')) {
      throw new TypeError('Animation must implement enter, exit, and transition')
    }
    AnimationManager.#registry.set(name, animation)
  }

  /**
   * Get a registered animation by name.
   * @param {string} name
   * @returns {import('./types').AnimationObject | undefined}
   */
  static get(name) {
    return AnimationManager.#registry.get(name)
  }

  /** @param {number} duration */
  setDuration(duration) {
    AnimationManager.#validateDuration(duration)
    this.#duration = duration
  }

  /**
   * Run enter animation (opening the gallery).
   * @param {HTMLElement} overlay
   * @param {string} animationName
   * @param {AbortSignal} [signal]
   * @returns {Promise<void>}
   */
  async enter(overlay, animationName, signal) {
    const anim = AnimationManager.#registry.get(animationName)
    if (!anim) {
      overlay.style.opacity = '1'
      return
    }
    await this.#run(() => anim.enter(overlay, this.#duration, signal), signal)
  }

  /**
   * Run exit animation (closing the gallery).
   * @param {HTMLElement} overlay
   * @param {string} animationName
   * @param {AbortSignal} [signal]
   * @returns {Promise<void>}
   */
  async exit(overlay, animationName, signal) {
    const anim = AnimationManager.#registry.get(animationName)
    if (!anim) {
      overlay.style.opacity = '0'
      return
    }
    await this.#run(() => anim.exit(overlay, this.#duration, signal), signal)
  }

  /**
   * Run transition animation between slides.
   * @param {HTMLElement} current
   * @param {HTMLElement} next
   * @param {1 | -1} direction
   * @param {string} animationName
   * @param {AbortSignal} [signal]
   * @returns {Promise<void>}
   */
  async transition(current, next, direction, animationName, signal) {
    const anim = AnimationManager.#registry.get(animationName)
    if (!anim) {
      current.style.display = 'none'
      next.style.display = ''
      return
    }
    await this.#run(() => anim.transition(current, next, direction, this.#duration, signal), signal)
  }

  async #run(task, signal) {
    if (signal?.aborted) return
    await new Promise((resolve, reject) => {
      let settled = false
      const finish = (callback, value) => {
        if (settled) return
        settled = true
        signal?.removeEventListener('abort', onAbort)
        callback(value)
      }
      const onAbort = () => finish(resolve)
      signal?.addEventListener('abort', onAbort, { once: true })
      Promise.resolve()
        .then(() => signal?.aborted ? undefined : task())
        .then(value => finish(resolve, value), error => finish(reject, error))
    })
  }

  static #validateDuration(duration) {
    if (!Number.isFinite(duration) || duration < 0) {
      throw new RangeError('Animation duration must be a non-negative finite number')
    }
  }
}
