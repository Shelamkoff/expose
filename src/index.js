import './animations/index.js'

export { Expose } from './Expose.js'
export { AnimationManager } from './AnimationManager.js'
export const exposeStylesUrl = new URL('../styles/expose.css', import.meta.url).href

export {
  createCaptions,
  createZoom,
  createThumbnails,
  createAutoplay,
  createTransform,
  createDownload,
  createFullscreen,
} from './plugins/index.js'
