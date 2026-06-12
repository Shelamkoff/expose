import type { SlideData } from './types'

export interface ThumbnailsCallbacks {
  goTo(index: number): void | Promise<void>
}

export interface ThumbnailsOptions {
  thumbnailWidth?: number
  thumbnailHeight?: number
}

export class Thumbnails {
  constructor(callbacks: ThumbnailsCallbacks, options: ThumbnailsOptions)
  get element(): HTMLElement
  build(slides: SlideData[]): void
  setActive(index: number): void
  destroy(): void
}
