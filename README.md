# @shelamkoff/expose

[![npm version](https://img.shields.io/npm/v/%40shelamkoff%2Fexpose)](https://www.npmjs.com/package/@shelamkoff/expose)
[![Live demo](https://img.shields.io/badge/demo-live-4357b4)](https://shelamkoff.github.io/expose/)
[![MIT license](https://img.shields.io/badge/license-MIT-2ea44f)](./LICENSE)

Framework-agnostic fullscreen lightbox and media gallery for images, video, iframes, and application-rendered content. It provides asynchronous navigation, named animations, an owned toolbar, typed events, focus and scroll management, and composable plugins as an ESM package for modern browsers.

[Live demo](https://shelamkoff.github.io/expose/) · [npm](https://www.npmjs.com/package/@shelamkoff/expose) · [Русская версия](./README.ru.md)

## Highlights

- Image, video, iframe, and application-rendered slides.
- Named transitions plus zoom, thumbnails, captions, autoplay, transform, download, and fullscreen plugins.
- Keyboard, swipe, focus restoration, and reference-counted scroll locking.
- Framework-independent JavaScript API with TypeScript declarations.

## Installation

```bash
npm install @shelamkoff/expose @shelamkoff/event-bus
```

Import the required stylesheet once:

```js
import '@shelamkoff/expose/styles.css'
```

`exposeStylesUrl` is exported for hosts that create their own `<link>` element.

## Quick start

```js
import {
  Expose,
  createCaptions,
  createFullscreen,
  createThumbnails,
  createZoom,
} from '@shelamkoff/expose'
import '@shelamkoff/expose/styles.css'

const gallery = new Expose([
  {
    src: '/photos/forest.jpg',
    thumb: '/photos/forest-thumb.jpg',
    alt: 'Forest',
    caption: 'Winter forest',
  },
  {
    src: {
      type: 'video',
      url: '/video/trailer.mp4',
      poster: '/video/poster.jpg',
    },
  },
], {
  toolbar: ['counter'],
  counterFormat: '{current} / {total}',
  plugins: [
    createCaptions(),
    createThumbnails(),
    createZoom(),
    createFullscreen(),
  ],
})

const unsubscribe = gallery.on('slide:change', ({ index, slide }) => {
  console.log(index, slide.caption)
})

await gallery.open(0)

// Later:
unsubscribe()
await gallery.close()
gallery.destroy()
```

`open()`, `close()`, `next()`, `prev()`, and `goTo()` are asynchronous because they wait for the active animation. Await them when application state depends on completion.

## Slide sources

```ts
interface SlideData {
  src: string | ImageSource | VideoSource | IFrameSource | RenderFunction
  caption?: string
  thumb?: string
  alt?: string
  download?: string | boolean
  preview?: string | (() => HTMLElement)
}
```

### Image

```js
const imageSlide = {
  src: {
    type: 'image',
    url: '/photo.jpg',
    srcset: '/photo-640.jpg 640w, /photo-1280.jpg 1280w',
    sizes: '100vw',
  },
  alt: 'Accessible description',
}
```

### Video

```js
const videoSlide = {
  src: {
    type: 'video',
    url: '/clip.mp4',
    autoplay: false,
    muted: false,
    loop: false,
    poster: '/poster.jpg',
  },
}
```

### Iframe

```js
const iframeSlide = {
  src: {
    type: 'iframe',
    url: 'https://example.com/embed',
    allow: 'fullscreen',
    sandbox: 'allow-scripts allow-same-origin',
  },
}
```

### Custom renderer

```js
const customSlide = {
  src: () => {
    const element = document.createElement('article')
    element.textContent = 'Application-owned content'

    return {
      element,
      destroy() {
        // Release renderer-owned resources here.
      },
    }
  },
}
```

A plain string is classified from its URL extension; use an explicit source object when the URL is ambiguous. A custom renderer may return an `HTMLElement` directly or `{ element, destroy }`.

## Configuration

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `loop` | `boolean` | `true` | Wraps previous/next navigation at the ends. |
| `navigation` | `boolean` | `true` | Displays previous and next arrow buttons. Keyboard and swipe navigation remain separate. |
| `closeOnBackdrop` | `boolean` | `true` | Closes when the backdrop is clicked. |
| `animation` | `string` | `'fade'` | Registered animation name. |
| `animationDuration` | `number` | `300` | Non-negative duration in milliseconds. |
| `preload` | `number` | `1` | Number of neighboring slides to render ahead on each side. |
| `startIndex` | `number` | `0` | Initial index used when `open()` receives no index. |
| `toolbar` | `ToolbarItem[]` | `[]` | `'counter'` and custom button definitions. |
| `counterFormat` | `string` | `'{current} / {total}'` | Counter template. |
| `plugins` | `ExposePlugin[]` | `[]` | Plugins installed during construction. |

Invalid option and slide shapes throw synchronously during construction or mutation. The counter rolls upward for every change, including the loop from the last slide to the first.

## Public API

| Method | Result | Description |
| --- | --- | --- |
| `Expose.registerAnimation(name, animation)` | `void` | Registers a global named animation. |
| `use(plugin)` | `this` | Installs a plugin while the gallery is closed. |
| `getPlugin(name)` | plugin or `undefined` | Returns an installed public plugin object. |
| `open(index?)` | `Promise<void>` | Builds and opens the overlay. No-op for an empty gallery. |
| `close()` | `Promise<void>` | Closes the overlay. Repeated calls share the in-flight close operation. |
| `next()` / `prev()` | `Promise<void>` | Navigates one slide when open and not already animating. |
| `goTo(index)` | `Promise<void>` | Navigates to a valid slide index. |
| `getIndex()` | `number` | Returns the current index, or `-1` when no slide is selected. |
| `getSlide()` | slide or `null` | Returns the current slide. |
| `getSlides()` | `SlideData[]` | Returns a defensive array copy. |
| `setSlides(slides)` | `void` | Replaces all slides. An empty array closes an open gallery. |
| `addSlide(slide)` | `void` | Appends a slide. |
| `removeSlide(index)` | `void` | Removes a slide unless a transition is active. Removing the last slide closes the gallery. |
| `isOpen()` | `boolean` | Reports overlay state. |
| `on` / `off` / `once` | subscription API | Manages event handlers; `on` and `once` return unsubscribe functions. |
| `destroy()` | `void` | Permanently releases animations, plugins, overlay DOM, scroll lock, and listeners. |

Slide mutations are supported while open, except during closing and the guarded removal case above. Do not use the instance after `destroy()`.

Multiple galleries share a reference-counted body scroll lock. Only the topmost open gallery handles global keyboard input, and focus is restored after closing when possible.

## Events

| Event | Payload |
| --- | --- |
| `open` / `open:complete` | `{ index }` |
| `close` / `close:complete` | no payload |
| `slide:change` | `{ index, slide }` |
| `slide:load` | `{ index, element }` |
| `slides:change` | `{ slides }` |
| `zoom:change` | `{ scale }` |
| `fullscreen:change` | `{ active }` |
| `rotate` | `{ rotation }` |
| `flip` | `{ flipH, flipV }` |
| `autoplay:start` / `autoplay:stop` | no payload |
| `destroy` | no payload |

## Toolbar buttons

```js
const gallery = new Expose(slides, {
  toolbar: [
    'counter',
    {
      name: 'copy-link',
      title: 'Copy link',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true">...</svg>',
      visible: slide => typeof slide.src === 'string',
      async onClick() {
        await navigator.clipboard.writeText(location.href)
      },
    },
  ],
})
```

A button may also define `className`, `toggle`, `active`, and `onStateChange(active)`. Button names must be unique. Icon strings are inserted as trusted HTML.

## Animations

An animation implements `enter`, `exit`, and `transition`. Each method may return a promise and receives an optional `AbortSignal` as its final argument:

```js
Expose.registerAnimation('instant', {
  enter(overlay) {
    overlay.style.opacity = '1'
  },
  exit(overlay) {
    overlay.style.opacity = '0'
  },
  transition(current, next) {
    current.hidden = true
    next.hidden = false
  },
})
```

Stop animation-owned timers and frames when the signal aborts. A failing custom animation is caught and the gallery restores a stable visual state instead of becoming locked.

## Built-in plugins

- [Captions](src/plugins/captions/README.md) — slide captions.
- [Zoom](src/plugins/zoom/README.md) — image zoom and pan.
- [Thumbnails](src/plugins/thumbnails/README.md) — thumbnail navigation.
- [Autoplay](src/plugins/autoplay/README.md) — interval playback.
- [Transform](src/plugins/transform/README.md) — rotation and horizontal/vertical flip.
- [Download](src/plugins/download/README.md) — slide download/open action.
- [Fullscreen](src/plugins/fullscreen/README.md) — Fullscreen API integration.

Plugins may only be installed while the gallery is closed. A stateful plugin instance may belong to one live gallery at a time.

## Creating a plugin

```js
export function createSharePlugin() {
  let context = null

  return {
    name: 'share',

    install(pluginContext) {
      context = pluginContext
      pluginContext.toolbar.add({
        name: 'share',
        title: 'Share',
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true">...</svg>',
        visible: slide => pluginContext.resolveType(slide.src) === 'image',
        async onClick() {
          const slide = pluginContext.getSlide()
          const source = typeof slide?.src === 'object' ? slide.src.url : slide?.src
          if (typeof source === 'string' && navigator.share) {
            try {
              await navigator.share({ url: source })
            } catch {
              // User cancellation is expected.
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

The frozen plugin context exposes owned event subscriptions, asynchronous navigation, read-only state and options, live overlay/slide DOM getters, owned toolbar registration, and `resolveType(source)`. Context subscriptions and toolbar registrations are rolled back after failed installation and removed on destruction. The plugin still owns its global listeners, observers, timers, frames, object URLs, third-party objects, and any DOM it creates outside the managed overlay lifecycle.

## Security boundary

Media URLs are validated before DOM assignment. Active schemes are rejected. Iframe slides accept relative, HTTP, and HTTPS URLs, but not `data:` or `blob:` documents. The host remains responsible for a custom iframe `sandbox` policy. Custom render functions and toolbar icon HTML are trusted developer code; validate or sanitize any application data used there.

## Demo

[Open the live demo](https://shelamkoff.github.io/expose/) to try mixed slide types, animations, toolbar actions, and built-in plugins.

To run the same demo locally:

```bash
npm install
npm run demo
```

Open `http://127.0.0.1:4173/demo.html`.

## Package exports

- `@shelamkoff/expose` — JavaScript API and TypeScript declarations.
- `@shelamkoff/expose/styles.css` — required gallery styles.
- `@shelamkoff/expose/package.json` — package metadata.

## License

MIT.
