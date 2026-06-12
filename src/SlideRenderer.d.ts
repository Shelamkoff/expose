import type { SlideData } from './types'

export class SlideRenderer {
  render(slide: SlideData): { element: HTMLElement; cleanup?: () => void }
  getThumbUrl(slide: SlideData): string | null
  getDownloadUrl(slide: SlideData): string | null
}
