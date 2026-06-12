import { scatterTiles, scatterTransform, fadeEnter, fadeExit, fadeFallback } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('scatter', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration) {
    const COLS = 5, ROWS = 4
    const dur = Math.max(duration * 2, 600)
    const half = dur / 2
    const img = current.querySelector('img')

    if (!img) return fadeFallback(current, next, duration)

    const { grid, tiles } = scatterTiles(img, current, COLS, ROWS)
    img.style.visibility = 'hidden'

    return new Promise(resolve => {
      requestAnimationFrame(() => {
        tiles.forEach(({ el, cx, cy }) => {
          const delay = Math.random() * half * 0.25
          el.style.transition =
            `transform ${half}ms cubic-bezier(.4,0,.7,.4) ${delay}ms,` +
            `opacity ${half * 0.5}ms ease ${delay + half * 0.4}ms`
          el.style.transform = scatterTransform(cx, cy, direction)
          el.style.opacity = '0'
        })
      })

      setTimeout(() => {
        grid.remove()
        img.style.visibility = ''
        current.style.display = 'none'
        next.style.display = ''

        const nextImg = next.querySelector('img')
        if (!nextImg) { resolve(); return }

        const { grid: g2, tiles: t2 } = scatterTiles(nextImg, next, COLS, ROWS)
        nextImg.style.visibility = 'hidden'

        t2.forEach(({ el, cx, cy }) => {
          el.style.transform = scatterTransform(cx, cy, -direction)
          el.style.opacity = '0'
        })

        requestAnimationFrame(() => {
          t2.forEach(({ el }) => {
            const delay = Math.random() * half * 0.25
            el.style.transition =
              `transform ${half}ms cubic-bezier(.3,.6,.6,1) ${delay}ms,` +
              `opacity ${half * 0.4}ms ease ${delay}ms`
            el.style.transform = 'none'
            el.style.opacity = '1'
          })
        })

        setTimeout(() => {
          nextImg.style.visibility = ''
          g2.remove()
          resolve()
        }, half)
      }, half)
    })
  },
})
