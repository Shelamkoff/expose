import test from 'node:test'
import assert from 'node:assert/strict'
import { lockBodyScroll, safeMediaUrl, unlockBodyScroll } from '../src/utils.js'

test('body scroll locks are reference counted across gallery instances', () => {
  const classes = new Set()
  const previousDocument = globalThis.document
  globalThis.document = {
    baseURI: 'https://example.test/gallery/',
    documentElement: {
      classList: {
        add: value => classes.add(value),
        remove: value => classes.delete(value),
        contains: value => classes.has(value),
      },
    },
  }
  try {
    lockBodyScroll()
    lockBodyScroll()
    unlockBodyScroll()
    assert.equal(classes.has('expose-noscroll'), true)
    unlockBodyScroll()
    assert.equal(classes.has('expose-noscroll'), false)
  } finally {
    globalThis.document = previousDocument
  }
})

test('body scroll locking preserves a class owned by the host page', () => {
  const classes = new Set(['expose-noscroll'])
  const previousDocument = globalThis.document
  globalThis.document = {
    documentElement: {
      classList: {
        add: value => classes.add(value),
        remove: value => classes.delete(value),
        contains: value => classes.has(value),
      },
    },
  }
  try {
    lockBodyScroll()
    unlockBodyScroll()
    assert.equal(classes.has('expose-noscroll'), true)
  } finally {
    globalThis.document = previousDocument
  }
})

test('media URL policy allows expected sources and blocks active schemes', () => {
  assert.equal(safeMediaUrl('/image.jpg', 'image'), '/image.jpg')
  assert.equal(safeMediaUrl('data:image/png;base64,AA==', 'image'), 'data:image/png;base64,AA==')
  assert.equal(safeMediaUrl('data:text/html,<script>', 'iframe'), null)
  assert.equal(safeMediaUrl('blob:https://example.test/id', 'iframe'), null)
  assert.equal(safeMediaUrl('blob:https://example.test/id', 'image'), 'blob:https://example.test/id')
  assert.equal(safeMediaUrl('javascript:alert(1)', 'iframe'), null)
})
