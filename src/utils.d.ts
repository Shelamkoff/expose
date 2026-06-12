export function clamp(value: number, min: number, max: number): number
export function uid(): string
export function lockBodyScroll(): void
export function unlockBodyScroll(): void
export function detectType(url: string): 'image' | 'video' | 'iframe'
export function extractUrl(src: import('./types').SlideSource): string | null
export function resolveType(src: import('./types').SlideSource): import('./types').SlideType
