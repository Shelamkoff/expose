/* ── Slide source types ── */

export interface ImageSource {
  url: string
  type?: 'image'
  srcset?: string
  sizes?: string
}

export interface VideoSource {
  url: string
  type?: 'video'
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  poster?: string
}

export interface IFrameSource {
  url: string
  type?: 'iframe'
  allow?: string
  sandbox?: string
}

export type RenderFunction = () => HTMLElement | { element: HTMLElement; destroy?: () => void }

export type SourceObject = ImageSource | VideoSource | IFrameSource

export type SlideSource = string | SourceObject | RenderFunction

export type SlideType = 'image' | 'video' | 'iframe' | 'render'

/* ── Slide data ── */

export interface SlideData {
  src: SlideSource
  caption?: string
  thumb?: string
  alt?: string
  download?: string | boolean
  preview?: string | (() => HTMLElement)
}

/* ── Animation ── */

export interface AnimationObject {
  enter(overlay: HTMLElement, duration: number): Promise<void> | void
  exit(overlay: HTMLElement, duration: number): Promise<void> | void
  transition(
    current: HTMLElement,
    next: HTMLElement,
    direction: 1 | -1,
    duration: number,
  ): Promise<void> | void
}

/* ── Toolbar ── */

export interface ToolbarButtonConfig {
  name: string
  icon: string
  title?: string
  className?: string
  toggle?: boolean
  active?: boolean
  visible?(slide: SlideData): boolean
  onClick(): void
  onStateChange?(active: boolean): string | void
}

export type ToolbarItem = string | ToolbarButtonConfig

/* ── Plugin system ── */

export interface PluginContext {
  // Events
  on<K extends ExposeEventName>(event: K, handler: (...args: ExposeEventMap[K]) => void): () => void
  on(event: string, handler: (...args: any[]) => void): () => void
  once<K extends ExposeEventName>(event: K, handler: (...args: ExposeEventMap[K]) => void): () => void
  once(event: string, handler: (...args: any[]) => void): () => void
  emit<K extends ExposeEventName>(event: K, ...args: ExposeEventMap[K]): void
  emit(event: string, data?: unknown): void

  // Navigation
  next(): Promise<void>
  prev(): Promise<void>
  goTo(index: number): Promise<void>
  close(): Promise<void>

  // Read-only state
  getIndex(): number
  getSlide(): SlideData | null
  getSlides(): SlideData[]
  isOpen(): boolean
  options: Readonly<ExposeOptions>

  // DOM access
  getOverlay(): HTMLElement | null
  getSlideContainer(): HTMLElement | null
  getSlideElement(index?: number): { el: HTMLElement; transformEl: HTMLElement } | null

  // Toolbar
  toolbar: {
    add(button: ToolbarButtonConfig): void
    remove(name: string): void
    setToggleState(name: string, active: boolean): void
  }

  // Utilities
  resolveType(src: SlideSource): SlideType
}

export interface ExposePlugin {
  name: string
  install(context: PluginContext): void
  destroy?(): void
  [key: string]: unknown
}

/* ── Options ── */

export interface ExposeOptions {
  loop?: boolean
  closeOnBackdrop?: boolean
  animation?: string
  animationDuration?: number
  preload?: number
  startIndex?: number
  toolbar?: ToolbarItem[]
  counterFormat?: string
  plugins?: ExposePlugin[]
}

/* ── Events ── */

export interface ExposeEventMap {
  'open': [payload: { index: number }]
  'open:complete': [payload: { index: number }]
  'close': []
  'close:complete': []
  'slide:change': [payload: { index: number; slide: SlideData }]
  'slide:load': [payload: { index: number; element: HTMLElement }]
  'slides:change': [payload: { slides: SlideData[] }]
  'zoom:change': [payload: { scale: number }]
  'fullscreen:change': [payload: { active: boolean }]
  'rotate': [payload: { rotation: number }]
  'flip': [payload: { flipH: boolean; flipV: boolean }]
  'autoplay:start': []
  'autoplay:stop': []
  'destroy': []
}

export type ExposeEventName = keyof ExposeEventMap
