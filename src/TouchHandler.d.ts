import type { Expose } from './Expose'

export class TouchHandler {
  constructor(gallery: Expose, el: HTMLElement, threshold?: number)
  bind(): void
  unbind(): void
  destroy(): void
}
