/**
 * Zoom plugin — zoom, pan, pinch for image slides.
 *
 * @param {object} [options]
 * @param {number} [options.min=1]
 * @param {number} [options.max=4]
 * @param {number} [options.step=0.5]
 * @returns {import('../types').ExposePlugin}
 */
import type { ExposePlugin } from '../types.js'
export interface ZoomPlugin extends ExposePlugin {
    zoomIn(): void
    zoomOut(): void
    getScale(): number
}
export function createZoom(options?: {
    min?: number | undefined;
    max?: number | undefined;
    step?: number | undefined;
}): ZoomPlugin;
