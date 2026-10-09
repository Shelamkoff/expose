import test from 'node:test'
import assert from 'node:assert/strict'
import { ZoomManager } from '../src/ZoomManager.js'

class FakeImage {
  style = {}
  offsetWidth = 100
  offsetHeight = 100

  getBoundingClientRect() {
    const match = /translate3d\(([^,]+)px, ([^,]+)px, 0\) scale\(([^)]+)\)/.exec(this.style.transform ?? '')
    const tx = Number(match?.[1] ?? 0)
    const ty = Number(match?.[2] ?? 0)
    const scale = Number(match?.[3] ?? 1)
    return { left: 50 + tx - 50 * scale, top: 50 + ty - 50 * scale, width: 100 * scale, height: 100 * scale }
  }
}

class FakeContainer {
  style = {}
  handlers = new Map()
  captures = new Set()
  image = new FakeImage()

  querySelector() { return this.image }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 } }
  addEventListener(type, handler) { this.handlers.set(type, handler) }
  removeEventListener(type, handler) {
    if (this.handlers.get(type) === handler) this.handlers.delete(type)
  }
  setPointerCapture(id) { this.captures.add(id) }
  releasePointerCapture(id) { this.captures.delete(id) }
  hasPointerCapture(id) { return this.captures.has(id) }
  dispatch(type, values = {}) {
    const event = { type, pointerId: 1, pointerType: 'touch', button: 0, clientX: 50, clientY: 50, deltaY: 0, preventDefault() {}, ...values }
    this.handlers.get(type)?.(event)
    return event
  }
}

test('configured minimum zoom is applied immediately, then released on destroy', () => {
  const container = new FakeContainer()
  const manager = new ZoomManager({ emit() {} }, { zoomMin: 2, zoomMax: 4 })
  manager.attach(container)
  assert.match(container.image.style.transform, /scale\(2\)/)
  assert.equal(container.style.touchAction, 'none')
  manager.destroy()
  assert.equal(container.style.touchAction, '')
  assert.equal(container.handlers.size, 0)
})

test('wheel zoom maintains the displayed anchor after panning', () => {
  const container = new FakeContainer()
  const manager = new ZoomManager({ emit() {} }, { zoomMin: 1, zoomMax: 4, zoomStep: 0.5 })
  manager.attach(container)
  manager.zoomIn()
  container.dispatch('pointerdown')
  container.dispatch('pointermove', { clientX: 60 })
  assert.match(container.image.style.transform, /translate3d\(10px, 0px, 0\)/)
  container.dispatch('wheel', { clientX: 60, clientY: 50, deltaY: -100 })
  assert.equal(manager.getScale(), 2)
  assert.match(container.image.style.transform, /translate3d\(10px, 0px, 0\)/)
  manager.destroy()
})

test('pinching acquires and releases a swipe-navigation claim', () => {
  const container = new FakeContainer()
  const claims = []
  const manager = new ZoomManager({
    emit() {},
    setSwipeBlocked(value) { claims.push(value) },
  }, { zoomMin: 1, zoomMax: 4 })
  manager.attach(container)
  container.dispatch('pointerdown', { pointerId: 1, clientX: 10 })
  container.dispatch('pointerdown', { pointerId: 2, clientX: 20 })
  assert.equal(claims.at(-1), true)
  container.dispatch('pointerup', { pointerId: 2, clientX: 20 })
  assert.equal(claims.at(-1), false)
  manager.destroy()
  assert.equal(claims.at(-1), false)
})

test('a zoomMin above one still permits panning and owns horizontal gestures', () => {
  const container = new FakeContainer()
  const claims = []
  const manager = new ZoomManager({
    emit() {},
    setSwipeBlocked(blocked) { claims.push(blocked) },
  }, { zoomMin: 2, zoomMax: 4 })
  try {
    manager.attach(container)
    assert.equal(claims.at(-1), true, 'a magnified image should own swipe gestures')
    container.dispatch('pointerdown', { clientX: 50 })
    container.dispatch('pointermove', { clientX: 75 })
    assert.match(container.image.style.transform, /translate3d\(25px, 0px, 0\)/,
      'base 2x image must support panning within cropped image bounds')
    container.dispatch('pointerup', { clientX: 75 })
    assert.equal(claims.at(-1), true, 'zoomed image must keep its swipe claim after pan')
  } finally {
    manager.destroy()
    assert.equal(claims.at(-1), false)
  }
})
