# Expose: Captions

```js
import { createCaptions } from '@shelamkoff/expose'
const plugin = createCaptions()
```

Displays a non-empty `slide.caption` as text, hides the caption for missing/empty values, updates it after navigation, and removes caption DOM on close. Caption values are assigned through `textContent`, not HTML.
