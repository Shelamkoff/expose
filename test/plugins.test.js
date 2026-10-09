import test from 'node:test'
import assert from 'node:assert/strict'
import { Expose } from '../src/Expose.js'
import { createAutoplay } from '../src/plugins/autoplay.js'
import { createDownload } from '../src/plugins/download.js'

test('a failed plugin installation is atomic', () => {
  const gallery = new Expose([])
  assert.throws(() => gallery.use({
    name: 'plugin',
    install(context) {
      context.toolbar.add({ name: 'owned-button', icon: '', onClick() {} })
      context.on('open', () => {})
      throw new Error('installation failed')
    },
  }), /installation failed/)

  assert.doesNotThrow(() => gallery.use({ name: 'plugin', install() {} }))
  assert.equal(gallery.getPlugin('plugin')?.name, 'plugin')
  gallery.destroy()
})

test('plugin context preserves variadic custom events and deeply protects options', () => {
  const toolbarItem = { name: 'host', icon: 'H', onClick() {} }
  const gallery = new Expose([], { toolbar: [toolbarItem] })
  let received = null
  let toolbarMutationRejected = false
  gallery.use({
    name: 'contract',
    install(context) {
      context.on('custom:event', (...args) => { received = args })
      context.emit('custom:event', 1, 2)
      try { context.options.toolbar[0].name = 'mutated' } catch { toolbarMutationRejected = true }
    },
  })
  assert.deepEqual(received, [1, 2])
  assert.equal(toolbarMutationRejected, true)
  assert.equal(toolbarItem.name, 'host')
  gallery.destroy()
})

test('slide metadata and source flags reject coercive values', () => {
  assert.throws(() => new Expose([{ src: '/image.jpg', alt: 1 }]), TypeError)
  assert.throws(() => new Expose([{ src: { url: '/video.mp4', type: 'video', autoplay: 'yes' } }]), TypeError)
  assert.throws(() => new Expose([{ src: '/image.jpg', download: {} }]), TypeError)
})

test('a plugin instance has one owner and can be reused after destroy', () => {
  const plugin = { name: 'single-owner', install() {} }
  const first = new Expose([])
  const second = new Expose([])
  first.use(plugin)
  assert.throws(() => second.use(plugin), /already owned/)
  first.destroy()
  assert.doesNotThrow(() => second.use(plugin))
  second.destroy()
})

test('download request is aborted when the gallery closes', async () => {
  const handlers = new Map()
  let aborted = false
  const previousFetch = globalThis.fetch
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      aborted = true
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
  const plugin = createDownload()
  try {
    plugin.install({
      getSlide: () => ({ src: 'https://example.test/image.jpg', download: true }),
      resolveType: () => 'image',
      toolbar: { add() {}, remove() {} },
      on(event, handler) {
        handlers.set(event, handler)
        return () => handlers.delete(event)
      },
    })
    const pending = plugin.download()
    await Promise.resolve()
    handlers.get('close')?.()
    await pending
    assert.equal(aborted, true)
  } finally {
    plugin.destroy()
    globalThis.fetch = previousFetch
  }
})

test('autoplay keeps its toolbar toggle inactive when there is only one slide', () => {
  let toggleState = null
  const plugin = createAutoplay()
  plugin.install({
    getSlideCount: () => 1,
    isOpen: () => true,
    emit() {},
    on: () => () => {},
    toolbar: {
      add() {},
      remove() {},
      setToggleState(_name, active) { toggleState = active },
    },
  })

  assert.equal(plugin.start(), false)
  assert.equal(plugin.isActive(), false)
  assert.equal(toggleState, false)
  plugin.destroy()
})

test('toolbar collisions are rejected at configuration and plugin installation time', () => {
  const button = { name: 'shared-action', icon: 'x', onClick() {} }
  assert.throws(() => new Expose([], { toolbar: [button, button] }), /duplicate toolbar item/)
  const gallery = new Expose([], { toolbar: [button] })
  const conflicting = {
    name: 'conflicting-plugin',
    install(context) {
      context.toolbar.add({ name: 'shared-action', icon: 'P', onClick() {} })
    },
  }
  assert.throws(() => gallery.use(conflicting), /already registered/)
  assert.equal(gallery.getPlugin(conflicting.name), undefined)
  assert.doesNotThrow(() => gallery.use({ name: 'valid-after-failure', install() {} }))
  gallery.destroy()
})

test('asynchronous plugin installation is rejected rather than silently detached', () => {
  const gallery = new Expose([])
  const rejected = Promise.reject(new Error('asynchronous installation rejected'))
  void rejected.catch(() => {}) // do not let the intentionally rejected fixture escape the test
  const faulty = {
    name: 'async-install',
    install(context) {
      context.on('open', () => {})
      context.toolbar.add({ name: 'transient', icon: 'x', onClick() {} })
      return rejected
    },
  }
  try {
    assert.throws(() => gallery.use(faulty), /synchronous|Promise|async/i)
    assert.equal(gallery.getPlugin('async-install'), undefined)
    assert.doesNotThrow(() => gallery.use({ name: 'fresh', install() {} }))
  } finally { gallery.destroy() }
})

test('autoplay stops immediately when slides are reduced to one', () => {
  const listeners = new Map()
  const state = { count: 3, index: 0, open: true }
  const changes = []
  const plugin = createAutoplay({ interval: 10000 })
  plugin.install({
    options: { loop: false },
    isOpen: () => state.open,
    getSlideCount: () => state.count,
    getIndex: () => state.index,
    next: async () => {},
    emit: event => changes.push(event),
    on(event, handler) { listeners.set(event, handler); return () => listeners.delete(event) },
    toolbar: { add() {}, remove() {}, setToggleState() {} },
  })
  try {
    assert.equal(plugin.start(), true)
    state.count = 1
    listeners.get('slides:change')?.()
    assert.equal(plugin.isActive(), false)
    assert.equal(changes.filter(event => event === 'autoplay:stop').length, 1)
  } finally { plugin.destroy() }
})
