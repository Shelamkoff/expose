export function clamp(value: number, min: number, max: number): number
export function lockBodyScroll(): void
export function unlockBodyScroll(): void
export function safeMediaUrl(value: unknown, kind: 'image' | 'video' | 'iframe' | 'download'): string | null
export function safeImageSrcset(value: unknown): string | null
export function detectType(url: string): 'image' | 'video' | 'iframe'
export function extractUrl(src: import('./types').SlideSource): string | null
export function resolveType(src: import('./types').SlideSource): import('./types').SlideType
