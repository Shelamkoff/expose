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
