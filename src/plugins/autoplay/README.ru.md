# Expose: autoplay

```js
import { createAutoplay } from '@shelamkoff/expose'
const autoplay = createAutoplay({ interval: 3000 })
```

Добавляет toggle и progress. Запускается пользователем или `start()` в открытой галерее, ждёт Promise навигации, сразу останавливается на последнем non-loop слайде или при сокращении галереи до одного слайда и очищает timeout при close/destroy. Ошибка навигации останавливает автопоказ и выводится в консоль.
