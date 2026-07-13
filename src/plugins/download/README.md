# Expose: Download

```js
import { createDownload } from '@shelamkoff/expose'
const download = createDownload()
```

Downloads the current image or video through `fetch` and a temporary object URL, falling back to a `noopener` new tab when direct download is unavailable. The returned plugin exposes async `download()`. Starting another download aborts the previous request; gallery close or plugin destroy also aborts it, and temporary object URLs are always revoked.
