import { SlideRenderer } from './SlideRenderer.js'

/**
 * Thumbnail strip at the bottom of the gallery.
 * Supports click navigation and auto-scroll to active item.
 */
export class Thumbnails {
  /** @type {{ goTo(index: number): void }} */
  #callbacks

  /** @type {HTMLElement} */
  #el

  /** @type {HTMLElement} */
  #track

  /** @type {HTMLElement[]} */
  #thumbs = []

  /** @type {number} */
  #activeIndex = -1

  /** @type {number} */
  #width

  /** @type {number} */
  #height

  /** @type {SlideRenderer} */
  #renderer

  /**
   * @param {{ goTo(index: number): void }} callbacks
   * @param {{ thumbnailWidth?: number, thumbnailHeight?: number }} options
   */
  constructor(callbacks, options) {
    this.#callbacks = callbacks
    this.#width = options.thumbnailWidth || 60
    this.#height = options.thumbnailHeight || 45
    this.#renderer = new SlideRenderer()

    this.#el = document.createElement('div')
    this.#el.className = 'expose__thumbnails'

    this.#track = document.createElement('div')
    this.#track.className = 'expose__thumbnails-track'
    this.#el.appendChild(this.#track)
  }

  /** @returns {HTMLElement} */
  get element() { return this.#el }

  /**
   * Build thumbnails for all slides.
   * @param {import('./types').SlideData[]} slides
   */
  build(slides) {
    this.#track.innerHTML = ''
    this.#thumbs = []

    for (let i = 0; i < slides.length; i++) {
      const thumb = this.#createThumb(slides[i], i)
      this.#thumbs.push(thumb)
      this.#track.appendChild(thumb)
    }
  }

  /**
   * Set the active thumbnail.
   * @param {number} index
   */
  setActive(index) {
    if (this.#activeIndex >= 0 && this.#activeIndex < this.#thumbs.length) {
      this.#thumbs[this.#activeIndex].classList.remove('expose__thumb--active')
    }

    this.#activeIndex = index

    if (index >= 0 && index < this.#thumbs.length) {
      this.#thumbs[index].classList.add('expose__thumb--active')
      this.#scrollToActive()
    }
  }

  destroy() {
    this.#track.innerHTML = ''
    this.#thumbs = []
    this.#activeIndex = -1
  }

  /**
   * @param {import('./types').SlideData} slide
   * @param {number} index
   * @returns {HTMLElement}
   */
  #createThumb(slide, index) {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'expose__thumb'
    el.style.width = this.#width + 'px'
    el.style.height = this.#height + 'px'

    const thumbUrl = this.#renderer.getThumbUrl(slide)

    if (thumbUrl) {
      const safeUrl = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(thumbUrl) : thumbUrl.replace(/"/g, '\\"')
      el.style.backgroundImage = `url("${safeUrl}")`
      el.style.backgroundSize = 'cover'
      el.style.backgroundPosition = 'center'
    } else {
      el.classList.add('expose__thumb--placeholder')
    }

    el.addEventListener('click', (e) => {
      e.stopPropagation()
      this.#callbacks.goTo(index)
    })

    return el
  }

  #scrollToActive() {
    const thumb = this.#thumbs[this.#activeIndex]
    if (!thumb) return

    const trackRect = this.#el.getBoundingClientRect()
    const thumbRect = thumb.getBoundingClientRect()

    const thumbCenter = thumbRect.left + thumbRect.width / 2
    const trackCenter = trackRect.left + trackRect.width / 2
    const offset = thumbCenter - trackCenter

    this.#el.scrollBy({ left: offset, behavior: 'smooth' })
  }
}
