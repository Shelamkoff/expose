# @shelamkoff/expose

Полноэкранная галерея без привязки к фреймворку: изображения, видео, iframe и пользовательские слайды, именованные анимации, принадлежащий экземпляру toolbar и подключаемые плагины.

[English README](./README.md)

## Установка

```bash
npm install @shelamkoff/expose @shelamkoff/event-bus
```

```js
import { Expose, createCaptions, createFullscreen, createZoom } from '@shelamkoff/expose'
import '@shelamkoff/expose/styles.css'

const gallery = new Expose([
  { src: '/photo.jpg', alt: 'Фото', caption: 'Подпись' },
  { src: { type: 'video', url: '/clip.mp4', poster: '/poster.jpg' } },
], {
  toolbar: ['counter'],
  counterFormat: '{current} / {total}',
  plugins: [createCaptions(), createZoom(), createFullscreen()],
})

await gallery.open(0)
await gallery.next()
await gallery.close()
gallery.destroy()
```

`exposeStylesUrl` содержит URL package CSS. Счётчик всегда прокручивается вверх, включая loop с последнего слайда на первый. Несколько открытых галерей совместно владеют scroll lock; глобальную клавиатуру обрабатывает верхний экземпляр.

## Плагины

- [Подписи](./src/plugins/captions/README.ru.md)
- [Zoom](./src/plugins/zoom/README.ru.md)
- [Миниатюры](./src/plugins/thumbnails/README.ru.md)
- [Autoplay](./src/plugins/autoplay/README.ru.md)
- [Transform](./src/plugins/transform/README.ru.md)
- [Download](./src/plugins/download/README.ru.md)
- [Fullscreen](./src/plugins/fullscreen/README.ru.md)

Плагины устанавливаются только в закрытую галерею. Ошибка установки вызывает `destroy()` и удаляет context subscriptions и toolbar registrations. Stateful-экземпляр имеет одного владельца. Кнопки и подписки переживают циклы close/open и окончательно освобождаются в `destroy()`. Ошибка пользовательской анимации возвращает стабильное визуальное состояние.

Методы анимации получают необязательный `AbortSignal` последним аргументом. Используйте его для остановки timers, frames и других ресурсов при закрытии, замене слайдов или уничтожении.

## Создание плагина

```js
export function createSharePlugin() {
  let context = null
  return {
    name: 'share',
    install(pluginContext) {
      context = pluginContext
      pluginContext.toolbar.add({
        name: 'share',
        title: 'Поделиться',
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true">...</svg>',
        visible: slide => pluginContext.resolveType(slide.src) === 'image',
        async onClick() {
          const slide = pluginContext.getSlide()
          const source = slide && typeof slide.src === 'object' ? slide.src.url : slide?.src
          if (typeof source === 'string' && navigator.share) {
            try { await navigator.share({ url: source }) } catch {}
          }
        },
      })
    },
    destroy() { context = null },
  }
}
```

Frozen context предоставляет `on`, `once`, `emit`, асинхронную навигацию и close, read-only состояние, DOM-getters, toolbar `add/remove/setToggleState` и `resolveType()`. Context очищает собственные подписки и регистрации; плагин освобождает свой DOM, listeners, observers, timers, frames, object URLs и внешние экземпляры.

Media URL проверяются до назначения DOM. Активные схемы запрещены; iframe принимает относительные, HTTP и HTTPS URL. `sandbox`, custom render и HTML иконок остаются ответственностью приложения. Недоверенные данные валидируйте или очищайте до передачи.

Пакет `1.0.0` распространяется как ESM, зависит от `@shelamkoff/event-bus` и использует лицензию MIT.
