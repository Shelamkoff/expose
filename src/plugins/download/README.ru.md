# Expose: скачивание

```js
import { createDownload } from '@shelamkoff/expose'
const download = createDownload()
```

Скачивает image/video через fetch и временный object URL; при невозможности открывает noopener tab. Новый вызов, close и destroy отменяют запрос, object URL всегда освобождается.
