import {
  Expose,
  createAutoplay,
  createDownload,
  createFullscreen,
  createTransform,
  createZoom,
  type PluginContext,
  type ExposePlugin,
} from '../src/index.js'
import { Toolbar } from '../src/Toolbar.js'

const autoplay = createAutoplay()
const started: boolean = autoplay.start()
const stopped: boolean = autoplay.stop()
const download: Promise<void> = createDownload().download()
const fullscreen: Promise<void> = createFullscreen().toggle()
const rotation: void = createTransform().rotateCW()
const scale: number = createZoom().getScale()

const gallery = new Expose([{ src: '/photo.jpg' }], { preload: 1, animation: 'none' })
gallery.on('slide:change', ({ index, slide }) => {
  const next: number = index
  const source = slide.src
  void [next, source]
})
const off = gallery.once('custom:event', (value: string, count: number) => {
  void [value, count]
})
gallery.on('custom:event', (text: string) => { void text })
gallery.off('custom:event', () => {})
off()

const plugin: ExposePlugin = {
  name: 'custom',
  install(ctx: PluginContext) {
    ctx.emit('custom:event', 'value', 10)
    ctx.gestures.setSwipeBlocked(true)
    ctx.gestures.setSwipeBlocked(false)
    ctx.toolbar.add({
      name: 'async',
      icon: '<svg></svg>',
      async onClick() { await Promise.resolve() },
    })
  },
}
gallery.use(plugin)

const toolbar = new Toolbar({ toolbar: ['counter'] }, { close: () => gallery.close() })
toolbar.appendCloseButton()
toolbar.addButton({ name: 'example', icon: '<svg></svg>', onClick() {} })
toolbar.removeButton('example')
toolbar.destroy()

void [started, stopped, download, fullscreen, rotation, scale]
