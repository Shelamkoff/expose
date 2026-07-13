/**
 * Transform plugin — rotation and flip for image slides.
 * @returns {import('../types').ExposePlugin}
 */
import type { ExposePlugin } from '../types.js'
export interface TransformPlugin extends ExposePlugin {
    rotateCW(): void
    rotateCCW(): void
    flipH(): void
    flipV(): void
}
export function createTransform(): TransformPlugin;
