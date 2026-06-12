export { Expose } from './Expose'
export { AnimationManager } from './AnimationManager'

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
} from './types'

/* ── Plugin factories ── */
export { createCaptions } from './plugins/captions'
export { createZoom } from './plugins/zoom'
export { createThumbnails } from './plugins/thumbnails'
export { createAutoplay } from './plugins/autoplay'
export { createTransform } from './plugins/transform'
export { createDownload } from './plugins/download'
export { createFullscreen } from './plugins/fullscreen'
