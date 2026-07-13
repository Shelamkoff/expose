# Expose: подписи

```js
import { createCaptions } from '@shelamkoff/expose'
const plugin = createCaptions()
```

Выводит непустой `slide.caption` через `textContent`, обновляет после навигации и удаляет DOM при close.
