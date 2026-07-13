/**
 * Autoplay plugin - automatic slide progression with progress bar.
 *
 * @param {object} [options]
 * @param {number} [options.interval=3000] - ms between slides
 * @returns {import('../types').ExposePlugin}
 */
import type { ExposePlugin } from '../types.js'

export interface AutoplayPlugin extends ExposePlugin {
    start(): void
    stop(): void
    toggle(): void
    isActive(): boolean
}

export function createAutoplay(options?: {
    interval?: number | undefined;
}): AutoplayPlugin;
