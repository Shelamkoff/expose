# @shelamkoff/expose

Framework-agnostic fullscreen gallery with image, video, iframe, and custom-render slides; named animations; an owned toolbar; and composable plugins.

## Install

```bash
npm install @shelamkoff/expose @shelamkoff/event-bus
```

```js
import {
  Expose,
  createCaptions,
  createFullscreen,
  createZoom,
} from '@shelamkoff/expose'
import '@shelamkoff/expose/styles.css'

const gallery = new Expose([
  { src: '/photo.jpg', alt: 'Photo', caption: 'Caption' },
  { src: { type: 'video', url: '/clip.mp4', poster: '/poster.jpg' } },
], {
  toolbar: ['counter'],
  counterFormat: '{current} / {total}',
  plugins: [createCaptions(), createZoom(), createFullscreen()],
})

await gallery.open(0)
await gallery.next()
await gallery.close()
gallery.destroy()
```

`exposeStylesUrl` exposes the packaged stylesheet. The counter always rolls upward, including a loop from the last slide to the first. Multiple open galleries share a reference-counted scroll lock, and only the top gallery handles global keyboard input.

## Plugins

- [Captions](dist/src/plugins/captions/README.md)
- [Zoom](dist/src/plugins/zoom/README.md)
- [Thumbnails](dist/src/plugins/thumbnails/README.md)
- [Autoplay](dist/src/plugins/autoplay/README.md)
- [Transform](dist/src/plugins/transform/README.md)
- [Download](dist/src/plugins/download/README.md)
- [Fullscreen](dist/src/plugins/fullscreen/README.md)

Plugin installation is allowed only while the gallery is closed. If installation fails, Expose invokes `plugin.destroy()` and removes context-owned subscriptions and toolbar registrations. Each stateful plugin instance has one owner at a time; destroying the owner releases core ownership so a reusable plugin implementation may be installed again. Registered buttons and subscriptions survive close/open cycles and are released on `destroy()`. A failing custom animation falls back to a stable visual state rather than locking the instance.

Custom animation methods receive an optional `AbortSignal` as their final argument. Use it to stop animation-owned timers, frames, or other resources when the gallery closes, replaces slides, or is destroyed.

## Creating a plugin

An Expose plugin is an object with a unique `name`, `install(context)`, and optional `destroy()`. Use a factory so state is not shared between gallery instances:

```js
export function createSharePlugin() {
  let context = null

  return {
    name: 'share',

    install(pluginContext) {
      context = pluginContext
      pluginContext.toolbar.add({
        name: 'share',
        title: 'Share image',
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true">...</svg>',
        visible: slide => pluginContext.resolveType(slide.src) === 'image',
        async onClick() {
          const slide = pluginContext.getSlide()
          const source = slide && typeof slide.src === 'object' ? slide.src.url : slide?.src
          if (typeof source === 'string' && navigator.share) {
            try {
              await navigator.share({ url: source })
            } catch {
              // The user cancelled the native share sheet.
            }
          }
        },
      })
    },

    destroy() {
      context = null
    },
  }
}
```

Register through constructor options or call `gallery.use(createSharePlugin())` while the gallery is closed. `getPlugin(name)` returns the installed public plugin object. Installation while open is rejected because plugin toolbar registrations and open-cycle listeners must exist before overlay construction.

### Plugin context

The frozen context provides:

- owned `on`, `once`, and `emit` methods;
- asynchronous navigation and close commands;
- read-only current slide, slide list, index, count, open state, and resolved options;
- live overlay, slide-container, and rendered-slide getters;
- owned toolbar `add`, `remove`, and `setToggleState` methods;
- `resolveType(source)` for image, video, iframe, and custom-render sources.

Context subscriptions and toolbar registrations are automatically removed after failed installation and on gallery destruction. Plugin-owned DOM inside an open overlay should normally be created on `open`, removed on `close`, and also released from `destroy()` for partial or exceptional lifecycles.

### Authoring rules

- Create a fresh stateful plugin object for every concurrently active gallery.
- Keep names and toolbar button names unique within an Expose instance.
- Do not retain the `Expose` object; use the capability-limited context.
- Release global listeners, observers, timers, animation frames, object URLs, and third-party instances in `destroy()`.
- Handle rejected async browser APIs inside toolbar callbacks when the rejection is expected user behavior.
- Treat toolbar icon HTML and custom-render callbacks as trusted developer code; never interpolate untrusted content into them.

## Security boundary

Media URLs are checked before DOM assignment. Active schemes are rejected; iframe slides allow only relative, HTTP, and HTTPS URLs (not `data:` or `blob:` documents). A custom `sandbox` value remains the host application's responsibility. Custom render functions and toolbar icon HTML are trusted developer code. Validate or sanitize untrusted application data before using those extension points.

The current package version is `1.0.0`. It is ESM, depends on `@shelamkoff/event-bus`, and is released under the MIT License.
