/**
 * Zoom plugin — zoom, pan, pinch for image slides.
 *
 * @param {object} [options]
 * @param {number} [options.min=1]
 * @param {number} [options.max=4]
 * @param {number} [options.step=0.5]
 * @returns {import('../types').ExposePlugin}
 */
export function createZoom(options?: {
    min?: number | undefined;
    max?: number | undefined;
    step?: number | undefined;
}): import("../types").ExposePlugin;
