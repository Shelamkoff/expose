# Expose: Transform

```js
import { createTransform } from '@shelamkoff/expose'
const transform = createTransform()
```

Adds image-only controls for clockwise/counter-clockwise rotation in 90-degree steps and horizontal/vertical flipping. The returned plugin exposes `rotateCW()`, `rotateCCW()`, `flipH()`, and `flipV()`. Per-slide transform state is kept while navigating and cleared on close or whenever the slide collection changes.
