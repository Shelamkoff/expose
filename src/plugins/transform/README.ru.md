# Expose: transform

```js
import { createTransform } from '@shelamkoff/expose'
const transform = createTransform()
```

Добавляет image-only rotation по 90° и horizontal/vertical flip. API: `rotateCW`, `rotateCCW`, `flipH`, `flipV`. State хранится при навигации и очищается при close или замене slides.
