import { animationDelay, animationFrame, scatterTiles, scatterTransform, fadeEnter, fadeExit, fadeFallback } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('scatter', {
  enter: fadeEnter,
  exit: fadeExit,
  async transition(current, next, direction, duration, signal) {
    const COLS = 5, ROWS = 4
    const dur = Math.max(duration * 2, 600)
    const half = dur / 2
    const img = current.querySelector('img')

    if (!img) return fadeFallback(current, next, duration, signal)

    const { grid, tiles } = scatterTiles(img, current, COLS, ROWS)
    img.style.visibility = 'hidden'

    let nextGrid = null
    let nextImg = null
    try {
      await animationFrame(() => {
        tiles.forEach(({ el, cx, cy }) => {
          const delay = Math.random() * half * 0.25
          el.style.transition =
            `transform ${half}ms cubic-bezier(.4,0,.7,.4) ${delay}ms,` +
            `opacity ${half * 0.5}ms ease ${delay + half * 0.4}ms`
          el.style.transform = scatterTransform(cx, cy, direction)
          el.style.opacity = '0'
        })
      }, signal)
      await animationDelay(half, signal)
      grid.remove()
      img.style.visibility = ''
      current.style.display = 'none'
      next.style.display = ''

      nextImg = next.querySelector('img')
      if (!nextImg) return

      const second = scatterTiles(nextImg, next, COLS, ROWS)
      nextGrid = second.grid
      nextImg.style.visibility = 'hidden'

      second.tiles.forEach(({ el, cx, cy }) => {
          el.style.transform = scatterTransform(cx, cy, -direction)
          el.style.opacity = '0'
      })

      await animationFrame(() => {
        second.tiles.forEach(({ el }) => {
          const delay = Math.random() * half * 0.25
          el.style.transition =
            `transform ${half}ms cubic-bezier(.3,.6,.6,1) ${delay}ms,` +
            `opacity ${half * 0.4}ms ease ${delay}ms`
          el.style.transform = 'none'
          el.style.opacity = '1'
        })
      }, signal)
      await animationDelay(half, signal)
    } finally {
      grid.remove()
      img.style.visibility = ''
      if (nextImg) nextImg.style.visibility = ''
      nextGrid?.remove()
    }
  },
})
