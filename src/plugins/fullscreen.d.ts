/**
 * Fullscreen plugin — toggle fullscreen mode.
 * @returns {import('../types').ExposePlugin}
 */
import type { ExposePlugin } from '../types.js'
export interface FullscreenPlugin extends ExposePlugin { toggle(): Promise<void> }
export function createFullscreen(): FullscreenPlugin;
