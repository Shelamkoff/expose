# Expose: Autoplay

```js
import { createAutoplay } from '@shelamkoff/expose'
const autoplay = createAutoplay({ interval: 3000 })
```

Adds a toggle button and progress bar; autoplay starts only when the user toggles it or `start()` is called while the gallery is open and has more than one slide. The returned plugin exposes `start()`, `stop()`, `toggle()`, and `isActive()`. It waits for each navigation Promise before scheduling the next timeout, stops at the final non-loop slide, and clears its timer when the gallery closes or the plugin is destroyed. `interval` must be positive.
