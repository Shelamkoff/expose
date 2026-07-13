# Expose: autoplay

```js
import { createAutoplay } from '@shelamkoff/expose'
const autoplay = createAutoplay({ interval: 3000 })
```

Добавляет toggle и progress. Запускается пользователем или `start()` в открытой галерее, ждёт Promise навигации, останавливается на последнем non-loop слайде и очищает timeout при close/destroy.
