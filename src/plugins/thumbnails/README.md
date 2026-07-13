# Expose: Thumbnails

```js
import { createThumbnails } from '@shelamkoff/expose'
const plugin = createThumbnails({ width: 60, height: 45 })
```

Creates an accessible, auto-scrolling thumbnail strip. Explicit `slide.thumb`, image-source fallbacks, and video poster fallbacks pass through the gallery URL policy; a video URL itself is not used as an image thumbnail. Width and height default to `60 × 45` and must be positive finite numbers. The strip rebuilds after `slides:change` and is removed on close.
