# Expose: zoom

```js
import { createZoom } from '@shelamkoff/expose'
const zoom = createZoom({ min: 1, max: 4, step: 0.5 })
```

Добавляет toolbar, wheel zoom, pan, pinch и double-click для image slides. Проверяет `1 <= min <= max` и `step > 0`; scale сбрасывается при смене слайда и освобождается при close.
