/**
 * Thumbnails plugin — thumbnail strip at the bottom.
 *
 * @param {object} [options]
 * @param {number} [options.width=60]
 * @param {number} [options.height=45]
 * @returns {import('../types').ExposePlugin}
 */
export function createThumbnails(options?: {
    width?: number | undefined;
    height?: number | undefined;
}): import("../types.js").ExposePlugin;
