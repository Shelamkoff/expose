import test from 'node:test'
import assert from 'node:assert/strict'
import { Expose } from '../src/Expose.js'

// Small DOM fixture for deterministic lifecycle assertions; browser gestures
// and layout remain covered by tests/browser/lifecycle.js.
class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase()
    this.children = []
    this.parentElement = null
    this.className = ''
    this.dataset = {}
    this.attributes = new Map()
    this.handlers = new Map()
    this.style = {
      removeProperty(property) {
        const name = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
        this[name] = ''
      },
    }
    this.classList = {
      add: name => { this.className += ' ' + name },
      remove: name => { this.className = this.className.split(' ').filter(value => value !== name).join(' ') },
      contains: name => this.className.split(' ').includes(name),
      toggle: (name, enabled) => {
        if (enabled) this.classList.add(name)
        else this.classList.remove(name)
      },
    }
  }

  appendChild(element) {
    element.remove()
    element.parentElement = this
    this.children.push(element)
    return element
  }

  remove() {
    if (!this.parentElement) return
    this.parentElement.children = this.parentElement.children.filter(child => child !== this)
    this.parentElement = null
  }

  setAttribute(name, value) { this.attributes.set(name, value) }
  removeAttribute(name) { this.attributes.delete(name) }
  addEventListener(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type).add(handler)
  }
  removeEventListener(type, handler) { this.handlers.get(type)?.delete(handler) }
  dispatchEvent(event) {
    event.target ??= this
    for (const handler of this.handlers.get(event.type) ?? []) handler(event)
  }
  get offsetHeight() { return 100 }
  get offsetWidth() { return 100 }
  get offsetParent() { return this.parentElement }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 } }
  get isConnected() {
    let node = this
    while (node) {
      if (node === globalThis.document?.body) return true
      node = node.parentElement
    }
    return false
  }
  contains(node) {
    while (node) {
      if (node === this) return true
      node = node.parentElement
    }
    return false
  }
  focus() { globalThis.document.activeElement = this }
  pause() { this.paused = true }
  play() { this.paused = false; return Promise.resolve() }
  load() {}
  scrollBy() {}
  get innerHTML() { return this._html ?? '' }
  set innerHTML(value) { this._html = value; if (value === '') this.children = [] }
  get textContent() { return this._text ?? '' }
  set textContent(value) { this._text = value }

  #matches(selector) {
    const match = /^(\w+)?(?:\.([\w-]+))?(?:\[data-([\w-]+)\])?$/.exec(selector)
    if (!match) return false
    if (match[1] && this.tagName !== match[1].toUpperCase()) return false
    if (match[2] && !this.classList.contains(match[2])) return false
    if (match[3]) {
      const key = match[3].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      return Object.hasOwn(this.dataset, key)
    }
    return true
  }

  querySelectorAll(selector) {
    const results = []
    const visit = node => {
      for (const child of node.children) {
        if (child.#matches(selector)) results.push(child)
        visit(child)
      }
    }
    visit(this)
    return results
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null }
}

async function withDOM(run) {
  const old = { document: globalThis.document, HTMLElement: globalThis.HTMLElement, location: globalThis.location, matchMedia: globalThis.matchMedia }
  const root = new Element('html')
  const body = new Element('body')
  root.appendChild(body)
  const document = {
    body,
    documentElement: root,
    baseURI: 'https://example.test/',
    activeElement: null,
    fullscreenElement: null,
    createElement: name => new Element(name),
    addEventListener() {},
    removeEventListener() {},
    querySelector: selector => body.querySelector(selector),
    querySelectorAll: selector => body.querySelectorAll(selector),
    exitFullscreen: async () => {},
  }
  const button = new Element('button')
  body.appendChild(button)
  document.activeElement = button
  globalThis.document = document
  globalThis.HTMLElement = Element
  globalThis.location = { href: document.baseURI }
  globalThis.matchMedia = () => ({ matches: false })
  try { return await run({ document, button }) } finally {
    Object.assign(globalThis, old)
  }
}

const slides = count => Array.from({ length: count }, (_, index) => ({ src: `/image-${index}.jpg` }))

test('removeSlide keeps an open non-preloaded gallery visible', async () => withDOM(async ({ document }) => {
  const gallery = new Expose(slides(3), { preload: 0, animation: 'none' })
  try {
    await gallery.open(0)
    gallery.removeSlide(0)
    assert.equal(gallery.getIndex(), 0)
    assert.equal(gallery.getSlide().src, '/image-1.jpg')
    assert.equal(document.querySelectorAll('.expose__slide').length, 1)
    assert.equal(document.querySelector('.expose__slide').style.display, '')
    await gallery.goTo(1)
    gallery.removeSlide(1)
    assert.equal(gallery.getIndex(), 0)
    assert.equal(gallery.getSlide().src, '/image-1.jpg')
    assert.equal(document.querySelectorAll('.expose__slide').length, 1)
  } finally { gallery.destroy() }
}))

test('rendered slide count remains limited when traversing a large gallery', async () => withDOM(async ({ document }) => {
  const gallery = new Expose(slides(80), { preload: 1, animation: 'none', loop: false })
  try {
    await gallery.open()
    for (let index = 1; index < 80; index++) {
      await gallery.goTo(index)
      assert.ok(document.querySelectorAll('.expose__slide').length <= 3, `too many slides after ${index}`)
    }
  } finally { gallery.destroy() }
}))

test('evicted custom renderers release their owned resources', async () => withDOM(async ({ document }) => {
  let destroyed = 0
  const custom = Array.from({ length: 9 }, () => ({
    src: () => ({ element: document.createElement('article'), destroy: () => { destroyed++ } }),
  }))
  const gallery = new Expose(custom, { preload: 0, animation: 'none' })
  try {
    await gallery.open()
    await gallery.goTo(5)
    assert.equal(destroyed, 1)
    assert.equal(document.querySelectorAll('.expose__slide').length, 1)
  } finally { gallery.destroy() }
  assert.equal(destroyed, 2)
}))

test('only the active iframe is loaded; outgoing iframe becomes inert', async () => withDOM(async ({ document }) => {
  const gallery = new Expose([
    { src: { type: 'iframe', url: 'https://example.test/embed' } },
    { src: '/image.jpg' },
  ], { animation: 'none', preload: 1 })
  try {
    await gallery.open(1)
    let iframe = document.querySelector('iframe')
    assert.equal(iframe.src, 'about:blank')
    await gallery.goTo(0)
    iframe = document.querySelector('iframe')
    assert.equal(iframe.src, 'https://example.test/embed')
    await gallery.goTo(1)
    assert.equal(iframe.src, 'about:blank')
  } finally { gallery.destroy() }
}))

test('close prevents navigation during its same-tick microtask gap', async () => withDOM(async () => {
  const gallery = new Expose(slides(2), { animation: 'none' })
  try {
    await gallery.open()
    const closing = gallery.close()
    await gallery.next()
    assert.equal(gallery.getIndex(), 0)
    await closing
    assert.equal(gallery.isOpen(), false)
  } finally { gallery.destroy() }
}))

test('failed custom animation cannot leave selected slide invisible', async () => withDOM(async ({ document }) => {
  Expose.registerAnimation('broken-styles-test', {
    enter(overlay) { overlay.style.opacity = '1' },
    exit(overlay) { overlay.style.opacity = '0' },
    transition(_from, to) {
      to.style.opacity = '0'
      to.style.filter = 'blur(10px)'
      throw new Error('broken animation')
    },
  })
  const old = console.error
  console.error = () => {}
  const gallery = new Expose(slides(2), { animation: 'broken-styles-test', preload: 0 })
  try {
    await gallery.open()
    await gallery.goTo(1)
    assert.equal(gallery.getIndex(), 1)
    const wrapper = document.querySelector('.expose__slide')
    assert.equal(wrapper.style.opacity, '')
    assert.equal(wrapper.style.filter, '')
    assert.equal(wrapper.style.display, '')
  } finally {
    gallery.destroy()
    console.error = old
  }
}))

test('last gallery restores focus even if underlying gallery closed first', async () => withDOM(async ({ document, button }) => {
  const first = new Expose(slides(1), { animation: 'none' })
  const second = new Expose(slides(1), { animation: 'none' })
  try {
    await first.open()
    await second.open()
    await first.close()
    assert.equal(second.isOpen(), true)
    await second.close()
    assert.equal(document.activeElement, button)
  } finally {
    first.destroy()
    second.destroy()
  }
}))

test('plugin swipe claim prevents navigation and is released on cleanup', async () => withDOM(async ({ document }) => {
  let gestures
  const gallery = new Expose(slides(2), {
    animation: 'none',
    plugins: [{ name: 'gesture-test', install(context) { gestures = context.gestures } }],
  })
  const swipe = (target, type, touches, changedTouches = touches) => target.dispatchEvent({
    type, touches, changedTouches, preventDefault() {},
  })
  try {
    await gallery.open()
    const track = document.querySelector('.expose__slides')
    gestures.setSwipeBlocked(true)
    swipe(track, 'touchstart', [{ clientX: 90, clientY: 10 }])
    swipe(track, 'touchmove', [{ clientX: 0, clientY: 10 }])
    swipe(track, 'touchend', [], [{ clientX: 0, clientY: 10 }])
    assert.equal(gallery.getIndex(), 0)
    gestures.setSwipeBlocked(false)
    swipe(track, 'touchstart', [{ clientX: 90, clientY: 10 }])
    swipe(track, 'touchmove', [{ clientX: 0, clientY: 10 }])
    swipe(track, 'touchcancel', [], [{ clientX: 0, clientY: 10 }])
    swipe(track, 'touchend', [], [{ clientX: 0, clientY: 10 }])
    assert.equal(gallery.getIndex(), 0)
    swipe(track, 'touchstart', [{ clientX: 90, clientY: 10 }])
    swipe(track, 'touchmove', [{ clientX: 0, clientY: 10 }])
    swipe(track, 'touchend', [], [{ clientX: 0, clientY: 10 }])
    await Promise.resolve()
    assert.equal(gallery.getIndex(), 1)
  } finally { gallery.destroy() }
}))
