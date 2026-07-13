/**
 * Download plugin - download current slide via fetch -> blob.
 * @returns {import('../types').ExposePlugin}
 */
import type { ExposePlugin } from '../types.js'
export interface DownloadPlugin extends ExposePlugin { download(): Promise<void> }
export function createDownload(): DownloadPlugin;
