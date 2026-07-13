import test from 'node:test'
import assert from 'node:assert/strict'
import { AnimationManager } from '../src/AnimationManager.js'

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
