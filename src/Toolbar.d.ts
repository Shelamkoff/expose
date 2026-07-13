import type { Expose } from './Expose.js'
import type { ExposeOptions } from './types.js'

export class Toolbar {
  constructor(gallery: Expose, options: ExposeOptions)
  get element(): HTMLElement
  updateCounter(current: number, total: number): void
  setToggleState(name: string, active: boolean): void
  updateVisibility(slide: import('./types').SlideData): void
  destroy(): void
}
