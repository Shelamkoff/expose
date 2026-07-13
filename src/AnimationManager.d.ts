import type { AnimationObject } from './types.js'

export class AnimationManager {
  constructor(duration?: number)
  static register(name: string, animation: AnimationObject): void
  static get(name: string): AnimationObject | undefined
  setDuration(duration: number): void
  enter(overlay: HTMLElement, animationName: string, signal?: AbortSignal): Promise<void>
  exit(overlay: HTMLElement, animationName: string, signal?: AbortSignal): Promise<void>
  transition(
    current: HTMLElement,
    next: HTMLElement,
    direction: 1 | -1,
    animationName: string,
    signal?: AbortSignal,
  ): Promise<void>
}
