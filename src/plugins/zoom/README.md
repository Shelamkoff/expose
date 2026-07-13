# Expose: Zoom

```js
import { createZoom } from '@shelamkoff/expose'
const zoom = createZoom({ min: 1, max: 4, step: 0.5 })
```

Adds toolbar controls, wheel zoom, pointer pan, two-pointer pinch, and double-click toggle between the configured minimum and a higher available scale for image slides. The plugin exposes `zoomIn()`, `zoomOut()`, and `getScale()`; outside an open session `getScale()` returns the configured minimum. Defaults are `min: 1`, `max: 4`, and `step: 0.5`; finite options must satisfy `1 <= min <= max` and `step > 0`. Zoom resets on slide change and is released on close.
