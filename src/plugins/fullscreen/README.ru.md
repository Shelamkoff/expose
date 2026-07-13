# Expose: fullscreen

```js
import { createFullscreen } from '@shelamkoff/expose'
const fullscreen = createFullscreen()
```

Добавляет кнопку Fullscreen API и shortcut F для верхней галереи. `fullscreen:change` следует браузерному событию; rejected request логируется без ложного active state.
