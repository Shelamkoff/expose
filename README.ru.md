# @shelamkoff/expose

Независимая от UI-фреймворков полноэкранная галерея для изображений, видео, встроенных страниц и контента приложения. Она предоставляет асинхронную навигацию, именованные анимации, управляемую панель действий, типизированные события, управление фокусом и прокруткой, а также подключаемые плагины. Версия `1.0.0` поставляется как ESM-пакет для современных браузеров.

[English README](./README.md)

## Установка

```bash
npm install @shelamkoff/expose @shelamkoff/event-bus
```

Один раз подключите обязательные стили:

```js
import '@shelamkoff/expose/styles.css'
```

Экспорт `exposeStylesUrl` позволяет приложению самостоятельно создать элемент `<link>`.

## Быстрый старт

```js
import {
  Expose,
  createCaptions,
  createFullscreen,
  createThumbnails,
  createZoom,
} from '@shelamkoff/expose'
import '@shelamkoff/expose/styles.css'

const gallery = new Expose([
  {
    src: '/photos/forest.jpg',
    thumb: '/photos/forest-thumb.jpg',
    alt: 'Лес',
    caption: 'Зимний лес',
  },
  {
    src: {
      type: 'video',
      url: '/video/trailer.mp4',
      poster: '/video/poster.jpg',
    },
  },
], {
  toolbar: ['counter'],
  counterFormat: '{current} / {total}',
  plugins: [
    createCaptions(),
    createThumbnails(),
    createZoom(),
    createFullscreen(),
  ],
})

const unsubscribe = gallery.on('slide:change', ({ index, slide }) => {
  console.log(index, slide.caption)
})

await gallery.open(0)

// При освобождении ресурсов:
unsubscribe()
await gallery.close()
gallery.destroy()
```

Методы `open()`, `close()`, `next()`, `prev()` и `goTo()` асинхронны, потому что ожидают завершения текущей анимации. Используйте `await`, если последующее состояние приложения зависит от завершения операции.

## Источники слайда

```ts
interface SlideData {
  src: string | ImageSource | VideoSource | IFrameSource | RenderFunction
  caption?: string
  thumb?: string
  alt?: string
  download?: string | boolean
  preview?: string | (() => HTMLElement)
}
```

### Изображение

```js
const imageSlide = {
  src: {
    type: 'image',
    url: '/photo.jpg',
    srcset: '/photo-640.jpg 640w, /photo-1280.jpg 1280w',
    sizes: '100vw',
  },
  alt: 'Доступное описание',
}
```

### Видео

```js
const videoSlide = {
  src: {
    type: 'video',
    url: '/clip.mp4',
    autoplay: false,
    muted: false,
    loop: false,
    poster: '/poster.jpg',
  },
}
```

### Встроенная страница

```js
const iframeSlide = {
  src: {
    type: 'iframe',
    url: 'https://example.com/embed',
    allow: 'fullscreen',
    sandbox: 'allow-scripts allow-same-origin',
  },
}
```

### Пользовательский рендеринг

```js
const customSlide = {
  src: () => {
    const element = document.createElement('article')
    element.textContent = 'Контент приложения'

    return {
      element,
      destroy() {
        // Освободите ресурсы рендерера здесь.
      },
    }
  },
}
```

Тип строкового адреса определяется по расширению. Если адрес неоднозначен, передавайте объект с явным `type`. Функция рендеринга может вернуть `HTMLElement` или объект `{ element, destroy }`.

## Конфигурация

| Поле | Тип | По умолчанию | Назначение |
| --- | --- | --- | --- |
| `loop` | `boolean` | `true` | Переносит навигацию через границы списка. |
| `navigation` | `boolean` | `true` | Показывает стрелки назад и вперёд. Клавиатура и жесты настраиваются отдельно. |
| `closeOnBackdrop` | `boolean` | `true` | Закрывает галерею при нажатии на фон. |
| `animation` | `string` | `'fade'` | Имя зарегистрированной анимации. |
| `animationDuration` | `number` | `300` | Неотрицательная длительность в миллисекундах. |
| `preload` | `number` | `1` | Количество соседних слайдов для предварительной отрисовки с каждой стороны. |
| `startIndex` | `number` | `0` | Начальный индекс, если `open()` вызван без аргумента. |
| `toolbar` | `ToolbarItem[]` | `[]` | Счётчик `'counter'` и пользовательские кнопки. |
| `counterFormat` | `string` | `'{current} / {total}'` | Шаблон счётчика. |
| `plugins` | `ExposePlugin[]` | `[]` | Плагины, устанавливаемые при создании. |

Некорректная конфигурация или структура слайда приводит к синхронному исключению при создании или изменении данных. Счётчик всегда прокручивается вверх, включая переход с последнего слайда на первый.

## Публичный API

| Метод | Результат | Назначение |
| --- | --- | --- |
| `Expose.registerAnimation(name, animation)` | `void` | Регистрирует глобальную именованную анимацию. |
| `use(plugin)` | `this` | Устанавливает плагин, пока галерея закрыта. |
| `getPlugin(name)` | плагин или `undefined` | Возвращает публичный объект установленного плагина. |
| `open(index?)` | `Promise<void>` | Создаёт и открывает оверлей. Для пустой галереи ничего не делает. |
| `close()` | `Promise<void>` | Закрывает оверлей. Повторные вызовы используют уже выполняющуюся операцию. |
| `next()` / `prev()` | `Promise<void>` | Переходит на один слайд, если галерея открыта и не анимируется. |
| `goTo(index)` | `Promise<void>` | Переходит к допустимому индексу. |
| `getIndex()` | `number` | Возвращает текущий индекс или `-1`, если слайд не выбран. |
| `getSlide()` | слайд или `null` | Возвращает текущий слайд. |
| `getSlides()` | `SlideData[]` | Возвращает защитную копию массива. |
| `setSlides(slides)` | `void` | Заменяет все слайды. Пустой массив закрывает открытую галерею. |
| `addSlide(slide)` | `void` | Добавляет слайд в конец. |
| `removeSlide(index)` | `void` | Удаляет слайд, если переход не выполняется. Удаление последнего закрывает галерею. |
| `isOpen()` | `boolean` | Возвращает состояние оверлея. |
| `on` / `off` / `once` | подписка на события | Управляет обработчиками; `on` и `once` возвращают функции отписки. |
| `destroy()` | `void` | Навсегда освобождает анимации, плагины, DOM оверлея, блокировку прокрутки и обработчики. |

Слайды разрешено менять в открытой галерее, кроме этапа закрытия и указанного ограничения `removeSlide()`. После `destroy()` экземпляр использовать нельзя.

Несколько галерей совместно используют блокировку прокрутки документа со счётчиком владельцев. Глобальные клавиши обрабатывает только верхняя открытая галерея. После закрытия библиотека по возможности восстанавливает фокус.

## События

| Событие | Данные |
| --- | --- |
| `open` / `open:complete` | `{ index }` |
| `close` / `close:complete` | без данных |
| `slide:change` | `{ index, slide }` |
| `slide:load` | `{ index, element }` |
| `slides:change` | `{ slides }` |
| `zoom:change` | `{ scale }` |
| `fullscreen:change` | `{ active }` |
| `rotate` | `{ rotation }` |
| `flip` | `{ flipH, flipV }` |
| `autoplay:start` / `autoplay:stop` | без данных |
| `destroy` | без данных |

## Кнопки панели действий

```js
const gallery = new Expose(slides, {
  toolbar: [
    'counter',
    {
      name: 'copy-link',
      title: 'Копировать ссылку',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true">...</svg>',
      visible: slide => typeof slide.src === 'string',
      async onClick() {
        await navigator.clipboard.writeText(location.href)
      },
    },
  ],
})
```

Кнопка также может определять `className`, `toggle`, `active` и `onStateChange(active)`. Имена кнопок должны быть уникальны. Строка `icon` вставляется как доверенный HTML.

## Анимации

Анимация реализует `enter`, `exit` и `transition`. Каждый метод может вернуть промис и получает необязательный `AbortSignal` последним аргументом:

```js
Expose.registerAnimation('instant', {
  enter(overlay) {
    overlay.style.opacity = '1'
  },
  exit(overlay) {
    overlay.style.opacity = '0'
  },
  transition(current, next) {
    current.hidden = true
    next.hidden = false
  },
})
```

При отмене сигнала остановите принадлежащие анимации таймеры и кадры. Исключение пользовательской анимации перехватывается, после чего галерея восстанавливает устойчивое визуальное состояние.

## Встроенные плагины

- [Подписи](dist/src/plugins/captions/README.ru.md) — подписи слайдов.
- [Зум](dist/src/plugins/zoom/README.ru.md) — масштабирование и перемещение изображений.
- [Миниатюры](dist/src/plugins/thumbnails/README.ru.md) — навигация по миниатюрам.
- [Автовоспроизведение](dist/src/plugins/autoplay/README.ru.md) — интервальное переключение.
- [Преобразования](dist/src/plugins/transform/README.ru.md) — поворот и отражение.
- [Скачивание](dist/src/plugins/download/README.ru.md) — скачивание или открытие источника.
- [Полный экран](dist/src/plugins/fullscreen/README.ru.md) — интеграция с Fullscreen API.

Плагины разрешено устанавливать только при закрытой галерее. Один экземпляр плагина с состоянием может принадлежать только одной активной галерее.

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
          const source = typeof slide?.src === 'object' ? slide.src.url : slide?.src
          if (typeof source === 'string' && navigator.share) {
            try {
              await navigator.share({ url: source })
            } catch {
              // Отмена пользователем ожидаема.
            }
          }
        },
      })
    },

    destroy() {
      context = null
    },
  }
}
```

Замороженный контекст плагина предоставляет подписки с автоматическим владением, асинхронную навигацию, состояние и настройки только для чтения, актуальные ссылки на DOM оверлея и слайда, управляемую регистрацию кнопок и `resolveType(source)`. При ошибке установки и при уничтожении галереи подписки и кнопки удаляются автоматически. Глобальные обработчики, наблюдатели, таймеры, кадры, объектные URL, сторонние объекты и DOM за пределами управляемого оверлея остаются ответственностью плагина.

## Граница безопасности

Адреса медиа проверяются до назначения DOM. Активные схемы отклоняются. Встроенные страницы допускают относительные, HTTP- и HTTPS-адреса, но не документы `data:` и `blob:`. Политика пользовательского `sandbox` остаётся ответственностью приложения. Функции рендеринга и HTML иконок считаются доверенным кодом разработчика; проверяйте или очищайте используемые там данные приложения.

## Демо

Из каталога пакета:

```bash
npm install
npm run demo
```

Или из корня рабочего пространства:

```bash
npm run demo:expose
```

Откройте `http://127.0.0.1:4173/expose/demo.html`. Страница демонстрирует разные типы слайдов, анимации, кнопки панели и встроенные плагины.

## Экспорты пакета

- `@shelamkoff/expose` — JavaScript API и объявления TypeScript.
- `@shelamkoff/expose/styles.css` — обязательные стили галереи.
- `@shelamkoff/expose/package.json` — метаданные пакета.

## Лицензия

MIT.
