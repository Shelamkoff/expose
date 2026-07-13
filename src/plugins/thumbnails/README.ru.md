# Expose: миниатюры

```js
import { createThumbnails } from '@shelamkoff/expose'
const plugin = createThumbnails({ width: 60, height: 45 })
```

Создаёт доступную auto-scroll ленту. Thumb, image fallback и video poster проходят URL policy. Размеры положительные; лента перестраивается после `slides:change` и удаляется при close.
