import type { ExposeOptions, SlideData, ToolbarButtonConfig } from './types.js'

export class Toolbar {
  constructor(options: ExposeOptions, callbacks: { close(): void | Promise<void> })
  get element(): HTMLElement
  appendCloseButton(): void
  addButton(button: ToolbarButtonConfig): void
  removeButton(name: string): void
  updateCounter(current: number, total: number): void
  setToggleState(name: string, active: boolean): void
  updateVisibility(slide: SlideData): void
  destroy(): void
}
