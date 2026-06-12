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
    this.#duration = duration
  }

  /**
   * Register a named animation globally.
   * @param {string} name
   * @param {import('./types').AnimationObject} animation
   */
  static register(name, animation) {
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
    this.#duration = duration
  }

  /**
   * Run enter animation (opening the gallery).
   * @param {HTMLElement} overlay
   * @param {string} animationName
   * @returns {Promise<void>}
   */
  async enter(overlay, animationName) {
    const anim = AnimationManager.#registry.get(animationName)
    if (!anim) {
      overlay.style.opacity = '1'
      return
    }
    await anim.enter(overlay, this.#duration)
  }

  /**
   * Run exit animation (closing the gallery).
   * @param {HTMLElement} overlay
   * @param {string} animationName
   * @returns {Promise<void>}
   */
  async exit(overlay, animationName) {
    const anim = AnimationManager.#registry.get(animationName)
    if (!anim) {
      overlay.style.opacity = '0'
      return
    }
    await anim.exit(overlay, this.#duration)
  }

  /**
   * Run transition animation between slides.
   * @param {HTMLElement} current
   * @param {HTMLElement} next
   * @param {1 | -1} direction
   * @param {string} animationName
   * @returns {Promise<void>}
   */
  async transition(current, next, direction, animationName) {
    const anim = AnimationManager.#registry.get(animationName)
    if (!anim) {
      current.style.display = 'none'
      next.style.display = ''
      return
    }
    await anim.transition(current, next, direction, this.#duration)
  }
}
