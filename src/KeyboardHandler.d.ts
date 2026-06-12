import type { Expose } from './Expose'

export class KeyboardHandler {
  constructor(gallery: Expose)
  bind(): void
  unbind(): void
  destroy(): void
}
