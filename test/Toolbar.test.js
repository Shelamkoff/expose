import test from 'node:test'
import assert from 'node:assert/strict'
import { Toolbar } from '../src/Toolbar.js'

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase()
    this.children = []
    this.style = {}
    this.dataset = {}
    this.attributes = new Map()
    this.classList = { add() {}, toggle() {} }
    this._textContent = ''
  }
  appendChild(child) { this.children.push(child); return child }
  append(...children) { this.children.push(...children) }
  addEventListener() {}
  setAttribute(name, value) { this.attributes.set(name, value) }
  remove() {}
  get offsetHeight() { return 1 }
  set innerHTML(value) { this._innerHTML = value; if (value === '') this.children = [] }
  get innerHTML() { return this._innerHTML ?? '' }
  set textContent(value) { this._textContent = String(value) }
  get textContent() { return this._textContent }
}

test('counter always rolls upward, including last to first', () => {
  const previousDocument = globalThis.document
  globalThis.document = { createElement: tag => new FakeElement(tag) }
  try {
    const toolbar = new Toolbar({ toolbar: ['counter'] }, { close() {} })
    toolbar.updateCounter(2, 3)
    toolbar.updateCounter(0, 3)
    const counter = toolbar.element.children[0]
    const number = counter.children[1]
    assert.equal(number.style.transform, 'translateY(-100%)')
    toolbar.destroy()
  } finally {
    globalThis.document = previousDocument
  }
})

test('counterFormat controls prefix, number and suffix', () => {
  const previousDocument = globalThis.document
  globalThis.document = { createElement: tag => new FakeElement(tag) }
  try {
    const toolbar = new Toolbar(
      { toolbar: ['counter'], counterFormat: 'Slide {current} of {total}' },
      { close() {} },
    )
    toolbar.updateCounter(1, 5)
    const [prefix, number, suffix] = toolbar.element.children[0].children
    assert.equal(prefix.textContent, 'Slide ')
    assert.equal(number.textContent, '2')
    assert.equal(suffix.textContent, ' of 5')
    toolbar.destroy()
  } finally {
    globalThis.document = previousDocument
  }
})

test('counter total updates without changing the active index', () => {
  const previousDocument = globalThis.document
  globalThis.document = { createElement: tag => new FakeElement(tag) }
  try {
    const toolbar = new Toolbar({ toolbar: ['counter'] }, { close() {} })
    toolbar.updateCounter(0, 1)
    toolbar.updateCounter(0, 2)
    assert.equal(toolbar.element.children[0].children[2].textContent, ' / 2')
    toolbar.destroy()
  } finally {
    globalThis.document = previousDocument
  }
})

test('toolbar rejects duplicate and malformed extension buttons', () => {
  const previousDocument = globalThis.document
  globalThis.document = { createElement: tag => new FakeElement(tag) }
  try {
    const toolbar = new Toolbar({ toolbar: [] }, { close() {} })
    const config = { name: 'action', icon: '<span></span>', onClick() {} }
    toolbar.addButton(config)
    assert.throws(() => toolbar.addButton(config), /already exists/)
    assert.throws(() => toolbar.addButton({ name: '', icon: '', onClick() {} }), TypeError)
    toolbar.destroy()
  } finally {
    globalThis.document = previousDocument
  }
})
