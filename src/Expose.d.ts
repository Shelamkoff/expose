import type {
  SlideData,
  ExposeOptions,
  ExposePlugin,
  AnimationObject,
  ExposeEventMap,
} from './types.js'

type Handler<T extends any[]> = (...args: T) => void

export class Expose {
  constructor(slides: SlideData[], options?: Partial<ExposeOptions>)

  static registerAnimation(name: string, animation: AnimationObject): void

  /* ── Plugin system ── */
  use(plugin: ExposePlugin): this
  getPlugin(name: string): ExposePlugin | undefined

  /* ── Events ── */
  on<E extends keyof ExposeEventMap & string>(
    event: E,
    handler: Handler<ExposeEventMap[E]>,
  ): () => void

  off<E extends keyof ExposeEventMap & string>(
    event: E,
    handler: Handler<ExposeEventMap[E]>,
  ): void

  once<E extends keyof ExposeEventMap & string>(
    event: E,
    handler: Handler<ExposeEventMap[E]>,
  ): () => void

  /* ── Lifecycle ── */
  open(index?: number): Promise<void>
  close(): Promise<void>
  destroy(): void

  /* ── Navigation ── */
  next(): Promise<void>
  prev(): Promise<void>
  goTo(index: number): Promise<void>

  /* ── Slide management ── */
  getIndex(): number
  getSlide(): SlideData | null
  getSlides(): SlideData[]
  setSlides(slides: SlideData[]): void
  addSlide(slide: SlideData): void
  removeSlide(index: number): void
  isOpen(): boolean
}
