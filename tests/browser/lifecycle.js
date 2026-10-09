function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function installDocumentListenerTracker() {
  const add = EventTarget.prototype.addEventListener
  const remove = EventTarget.prototype.removeEventListener
  const records = []
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    add.call(this, type, listener, options)
    if (this === document && listener) records.push({ type, listener, active: true })
  }
  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    remove.call(this, type, listener, options)
    if (this !== document || !listener) return
    const record = records.find(item => item.active && item.type === type && item.listener === listener)
    if (record) record.active = false
  }
  return () => records.filter(record => record.active).length
}

const activeDocumentListeners = installDocumentListenerTracker()
const { Expose } = await import('../../src/index.js')
const { ZoomManager } = await import('../../src/ZoomManager.js')
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+Av7lWQAAAABJRU5ErkJggg=='
const slides = [1, 2, 3].map(index => ({ src: pixel, alt: `Image ${index}` }))

async function run() {
  const baselineListeners = activeDocumentListeners()

  const zoomContainer = document.createElement('div')
  zoomContainer.style.width = '100px'
  zoomContainer.style.height = '100px'
  const zoomImage = document.createElement('img')
  zoomImage.className = 'expose__image'
  zoomImage.style.width = '100px'
  zoomImage.style.height = '100px'
  zoomContainer.appendChild(zoomImage)
  document.body.appendChild(zoomContainer)
  const captures = new Set()
  zoomContainer.setPointerCapture = id => captures.add(id)
  zoomContainer.releasePointerCapture = id => captures.delete(id)
  zoomContainer.hasPointerCapture = id => captures.has(id)
  const zoom = new ZoomManager({ emit() {} }, { zoomMin: 1, zoomMax: 4, zoomStep: 0.5 })
  zoom.attach(zoomContainer)
  const pointer = (type, id, x, y) => zoomContainer.dispatchEvent(new PointerEvent(type, {
    pointerId: id, pointerType: 'touch', isPrimary: id === 1, button: 0, clientX: x, clientY: y,
  }))
  pointer('pointerdown', 1, 10, 10)
  assert(captures.has(1), 'zoom did not capture its pointer')
  zoom.reset()
  assert(captures.size === 0, 'zoom reset lost an active pointer capture')
  pointer('pointerdown', 1, 10, 10)
  pointer('pointerdown', 2, 10, 10)
  pointer('pointermove', 2, 20, 10)
  pointer('pointermove', 2, 30, 10)
  assert(zoom.getScale() > 1, 'zero-distance pinch could not recover')
  pointer('pointerup', 2, 30, 10)
  const beforePan = zoomImage.style.transform
  pointer('pointermove', 1, 15, 10)
  assert(zoomImage.style.transform !== beforePan, 'remaining pinch pointer did not resume pan')
  zoom.destroy()
  zoomContainer.remove()

  const highMinContainer = document.createElement('div')
  highMinContainer.style.width = '100px'
  highMinContainer.style.height = '100px'
  const highMinImage = document.createElement('img')
  highMinImage.className = 'expose__image'
  highMinImage.style.width = '100px'
  highMinImage.style.height = '100px'
  highMinContainer.appendChild(highMinImage)
  document.body.appendChild(highMinContainer)
  highMinContainer.setPointerCapture = () => {}
  highMinContainer.releasePointerCapture = () => {}
  highMinContainer.hasPointerCapture = () => false
  const highMinZoom = new ZoomManager({ emit() {} }, { zoomMin: 2, zoomMax: 4, zoomStep: 0.5 })
  highMinZoom.attach(highMinContainer)
  assert(highMinImage.style.transform.includes('scale(2)'), 'zoomMin was not applied on attach')
  highMinContainer.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 50, bubbles: true }))
  highMinContainer.dispatchEvent(new MouseEvent('click', { clientX: 50, clientY: 50, bubbles: true }))
  assert(highMinZoom.getScale() === 2.5, 'double-click zoom ignored a configured minimum at 2x')
  highMinZoom.destroy()
  highMinContainer.remove()

  const persistentPlugin = {
    name: 'persistent-button',
    install(context) {
      context.toolbar.add({ name: 'persistent', icon: 'P', title: 'Persistent', onClick() {} })
    },
  }
  const gallery = new Expose(slides, {
    animation: 'none',
    toolbar: ['counter'],
    plugins: [persistentPlugin],
  })
  await gallery.open(2)
  let latePluginRejected = false
  try { gallery.use({ name: 'late', install() {} }) } catch { latePluginRejected = true }
  assert(latePluginRejected, 'plugin installation while open was partially accepted')
  assert(document.querySelector('[data-name="persistent"]'), 'plugin toolbar button is missing on first open')
  await gallery.next()
  const counter = document.querySelector('.expose__counter-num')
  assert(counter?.style.transform === 'translateY(-100%)', 'last-to-first counter did not roll upward')
  await gallery.close()
  await gallery.open(0)
  assert(document.querySelector('[data-name="persistent"]'), 'plugin toolbar button disappeared after reopen')
  await gallery.close()
  gallery.destroy()

  const dynamic = new Expose([slides[0]], { animation: 'none', toolbar: ['counter'] })
  await dynamic.open()
  assert(!document.querySelector('.expose__nav'), 'single-slide gallery rendered navigation')
  dynamic.addSlide(slides[1])
  assert(document.querySelector('.expose__nav--next'), 'navigation was not added with the second slide')
  assert(document.querySelector('.expose__counter')?.textContent === '1 / 2', 'counter total did not update')
  dynamic.removeSlide(1)
  assert(!document.querySelector('.expose__nav'), 'navigation remained after returning to one slide')
  dynamic.setSlides([])
  await new Promise(resolve => setTimeout(resolve, 0))
  assert(!dynamic.isOpen(), 'empty slide replacement did not close the gallery')
  dynamic.destroy()

  const noArrowNavigation = new Expose(slides, { animation: 'none', navigation: false })
  await noArrowNavigation.open()
  assert(!document.querySelector('.expose__nav'), 'navigation:false rendered arrow controls')
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  await new Promise(resolve => setTimeout(resolve, 0))
  assert(noArrowNavigation.getIndex() === 1, 'navigation:false disabled keyboard navigation')
  await noArrowNavigation.close()
  noArrowNavigation.destroy()

  Expose.registerAnimation('hanging-test', {
    enter(_overlay, _duration, signal) {
      return new Promise(resolve => signal?.addEventListener('abort', resolve, { once: true }))
    },
    exit() {},
    transition() {},
  })
  const interruptible = new Expose([slides[0]], { animation: 'hanging-test' })
  const opening = interruptible.open()
  await new Promise(resolve => setTimeout(resolve, 10))
  await interruptible.close()
  assert(!interruptible.isOpen(), 'close was ignored during the enter animation')
  assert(await Promise.race([
    opening.then(() => 'closed'),
    new Promise(resolve => setTimeout(() => resolve('timeout'), 500)),
  ]) === 'closed', 'cancelled open promise remained pending')
  interruptible.destroy()

  const doubleClose = new Expose([slides[0]], { animation: 'fade', animationDuration: 100 })
  let closeEvents = 0
  let reentrantClose = null
  let reentrantMutationRejected = false
  doubleClose.on('close', () => {
    closeEvents++
    reentrantClose = doubleClose.close()
    try { doubleClose.addSlide(slides[1]) } catch { reentrantMutationRejected = true }
  })
  await doubleClose.open()
  const firstClose = doubleClose.close()
  const secondClose = doubleClose.close()
  assert(firstClose === secondClose, 'repeated close did not share one lifecycle operation')
  let closingMutationRejected = false
  try { doubleClose.setSlides([slides[1]]) } catch { closingMutationRejected = true }
  assert(closingMutationRejected, 'slide mutation was accepted during close')
  await Promise.all([firstClose, secondClose])
  assert(reentrantClose === firstClose, 'close listener did not receive the shared lifecycle operation')
  assert(reentrantMutationRejected, 'close listener mutated slides during teardown')
  assert(closeEvents === 1 && !doubleClose.isOpen(), 'repeated close notified plugins more than once')
  doubleClose.destroy()

  const first = new Expose([slides[0]], { animation: 'none' })
  const second = new Expose([slides[1]], { animation: 'none' })
  await first.open()
  await second.open()
  await first.close()
  assert(document.documentElement.classList.contains('expose-noscroll'), 'closing one gallery released another gallery scroll lock')
  await second.close()
  assert(!document.documentElement.classList.contains('expose-noscroll'), 'final gallery close kept the scroll lock')
  first.destroy()
  second.destroy()

  Expose.registerAnimation('broken-test', {
    enter() { throw new Error('enter') },
    exit() { throw new Error('exit') },
    transition() { throw new Error('transition') },
  })
  const resilient = new Expose(slides.slice(0, 2), { animation: 'broken-test' })
  await resilient.open()
  await resilient.next()
  assert(resilient.getIndex() === 1, 'failed custom transition locked navigation')
  await resilient.close()
  assert(!resilient.isOpen(), 'failed custom exit locked close')
  resilient.destroy()

  const noPreload = new Expose(slides, { animation: 'none', preload: 0 })
  await noPreload.open()
  assert(document.querySelectorAll('.expose__slide').length === 1, 'preload: 0 rendered neighboring slides')
  noPreload.removeSlide(0)
  assert(noPreload.getSlide() === slides[1], 'removing active slide selected incorrect data')
  assert(document.querySelectorAll('.expose__slide').length === 1, 'removing active slide left empty DOM')
  assert(document.querySelector('.expose__image')?.src.includes('image/png'), 'replacement image was not rendered')
  noPreload.destroy()

  const manySlides = Array.from({ length: 75 }, (_, i) => ({ src: pixel, alt: String(i) }))
  const bounded = new Expose(manySlides, { animation: 'none', preload: 1, loop: false })
  await bounded.open()
  for (let index = 1; index < manySlides.length; index++) {
    await bounded.goTo(index)
    assert(document.querySelectorAll('.expose__slide').length <= 3, 'visited slides were never evicted')
  }
  bounded.destroy()

  const deferred = new Expose([
    { src: { type: 'iframe', url: '/styles/expose.css' } },
    slides[0],
  ], { animation: 'none', preload: 1 })
  await deferred.open(1)
  const iframe = document.querySelector('.expose__iframe')
  assert(iframe?.src === 'about:blank', 'preloaded iframe was navigated before activation')
  await deferred.goTo(0)
  assert(iframe.src.includes('/styles/expose.css'), 'selected iframe was not activated')
  await deferred.goTo(1)
  assert(iframe.src === 'about:blank', 'outgoing iframe reloaded instead of stopping')
  deferred.destroy()

  const blinds = new Expose(slides.slice(0, 2), { animation: 'blinds', animationDuration: 40, preload: 0 })
  await blinds.open()
  const activeBefore = document.querySelector('.expose__slide')
  const moving = blinds.next()
  await new Promise(resolve => setTimeout(resolve, 50))
  assert(activeBefore.style.opacity !== '0', 'blinds hid its own tile layer')
  await moving
  blinds.destroy()

  const originalMatchMedia = window.matchMedia
  window.matchMedia = () => ({ matches: true })
  try {
    const reducedMotion = new Expose(slides.slice(0, 2), { animation: 'blinds', animationDuration: 2_000 })
    await reducedMotion.open()
    const started = performance.now()
    await reducedMotion.next()
    assert(performance.now() - started < 500, 'reduced motion did not bypass animations')
    reducedMotion.destroy()
  } finally {
    window.matchMedia = originalMatchMedia
  }

  const unsafe = new Expose([{ src: { type: 'iframe', url: 'javascript:alert(1)' } }], { animation: 'none' })
  await unsafe.open()
  assert(!document.querySelector('.expose iframe'), 'active iframe URL reached the DOM')
  unsafe.destroy()

  assert(activeDocumentListeners() === baselineListeners, 'Expose leaked document listeners')
  assert(!document.querySelector('.expose'), 'Expose leaked an overlay')
  assert(!document.documentElement.classList.contains('expose-noscroll'), 'Expose leaked the body scroll lock')
  return { flows: 12, listeners: activeDocumentListeners() }
}

try {
  const summary = await run()
  document.body.dataset.status = 'pass'
  document.querySelector('#result').textContent = JSON.stringify(summary)
} catch (error) {
  document.body.dataset.status = 'fail'
  document.querySelector('#result').textContent = error.stack || error.message
  throw error
}
