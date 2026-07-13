# Expose: Fullscreen

```js
import { createFullscreen } from '@shelamkoff/expose'
const fullscreen = createFullscreen()
```

Adds a Fullscreen API button and handles the top gallery's unmodified `F` shortcut. State is emitted through `fullscreen:change` from the browser's `fullscreenchange` event. The returned plugin exposes async `toggle()`; rejected browser requests are logged and do not emit a false active state. Closing exits fullscreen only when this gallery owns the fullscreen element.
