export interface ZoomEmitter {
  emit(event: string, data?: any): void
  setSwipeBlocked?(blocked: boolean): void
}

export interface ZoomManagerOptions {
  zoomMin?: number
  zoomMax?: number
  zoomStep?: number
}

export class ZoomManager {
  constructor(emitter: ZoomEmitter, options: ZoomManagerOptions)
  attach(container: HTMLElement): void
  detach(): void
  reset(): void
  zoomIn(): void
  zoomOut(): void
  getScale(): number
  destroy(): void
}
