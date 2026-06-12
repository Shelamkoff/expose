/**
 * Autoplay plugin - automatic slide progression with progress bar.
 *
 * @param {object} [options]
 * @param {number} [options.interval=3000] - ms between slides
 * @returns {import('../types').ExposePlugin}
 */
export function createAutoplay(options?: {
    interval?: number | undefined;
}): import("../types").ExposePlugin;
