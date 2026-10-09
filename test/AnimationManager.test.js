import test from 'node:test'
import assert from 'node:assert/strict'
import { AnimationManager } from '../src/AnimationManager.js'
import { animationDelay, animationFrame, cssTransition } from '../src/animations/_helpers.js'

test('animation extension boundary validates duration and contract', () => {
  assert.throws(() => new AnimationManager(-1), RangeError)
  assert.throws(() => AnimationManager.register('', {}), TypeError)
  assert.throws(() => AnimationManager.register('broken', { enter() {}, exit() {} }), TypeError)
})

test('aborting an animation settles the manager even when the extension never does', async () => {
  AnimationManager.register('pending', {
    enter() { return new Promise(() => {}) },
    exit() {},
    transition() {},
  })
  const controller = new AbortController()
  const pending = new AnimationManager().enter({ style: {} }, 'pending', controller.signal)
  controller.abort()
  await pending
})

test('built-in animation primitives cancel pending DOM work on abort', async () => {
  const transitionController = new AbortController()
  const element = {
    style: {},
    get offsetHeight() { return 1 },
  }
  const transition = cssTransition(
    element,
    () => { element.style.opacity = '0' },
    () => { element.style.opacity = '1' },
    1_000,
    'opacity',
    transitionController.signal,
  )

  transitionController.abort()
  await assert.rejects(transition, { name: 'AbortError' })
  assert.equal(element.style.transition, '')

  const delayController = new AbortController()
  const delay = animationDelay(1_000, delayController.signal)
  delayController.abort()
  await assert.rejects(delay, { name: 'AbortError' })
})

test('requestAnimationFrame helper rejects thrown callback errors', async () => {
  const previous = globalThis.requestAnimationFrame
  globalThis.requestAnimationFrame = callback => {
    queueMicrotask(() => callback(0))
    return 1
  }
  try {
    await assert.rejects(
      animationFrame(() => { throw new Error('frame exception') }),
      /frame exception/,
    )
  } finally {
    globalThis.requestAnimationFrame = previous
  }
})
