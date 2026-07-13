export { Expose } from './Expose.js'
export { AnimationManager } from './AnimationManager.js'
export const exposeStylesUrl: string

export type {
  SlideData,
  SlideSource,
  SourceObject,
  ImageSource,
  VideoSource,
  IFrameSource,
  RenderFunction,
  SlideType,
  AnimationObject,
  ToolbarButtonConfig,
  ToolbarItem,
  ExposeOptions,
  ExposeEventMap,
  ExposeEventName,
  PluginContext,
  ExposePlugin,
} from './types.js'

/* ── Plugin factories ── */
export { createCaptions } from './plugins/captions.js'
export { createZoom } from './plugins/zoom.js'
export { createThumbnails } from './plugins/thumbnails.js'
export { createAutoplay } from './plugins/autoplay.js'
export { createTransform } from './plugins/transform.js'
export { createDownload } from './plugins/download.js'
export { createFullscreen } from './plugins/fullscreen.js'
export type { AutoplayPlugin } from './plugins/autoplay.js'
export type { DownloadPlugin } from './plugins/download.js'
export type { FullscreenPlugin } from './plugins/fullscreen.js'
export type { TransformPlugin } from './plugins/transform.js'
export type { ZoomPlugin } from './plugins/zoom.js'
