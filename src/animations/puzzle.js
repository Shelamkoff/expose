import { animationDelay, animationFrame, scatterTiles, fadeEnter, fadeExit, fadeFallback } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('puzzle', {
  enter: fadeEnter,
  exit: fadeExit,
  async transition(current, next, direction, duration, signal) {
    const COLS = 6, ROWS = 4
    const dur = Math.max(duration * 2, 700)
    const half = dur / 2
    const img = current.querySelector('img')

    if (!img) return fadeFallback(current, next, duration, signal)

    const { grid, tiles } = scatterTiles(img, current, COLS, ROWS)
    img.style.visibility = 'hidden'
    const maxDist = COLS + ROWS - 2

    let nextGrid = null
    let nextImg = null
    try {
      await animationFrame(() => {
        tiles.forEach(({ el, col, row }) => {
          const dist = direction === 1 ? col + row : (COLS - 1 - col) + (ROWS - 1 - row)
          const delay = (dist / maxDist) * half * 0.7
          el.style.transition = `transform ${half * 0.5}ms ease ${delay}ms, opacity ${half * 0.4}ms ease ${delay}ms`
          el.style.transform = 'scale(0.3) rotate(15deg)'
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
      second.tiles.forEach(({ el }) => {
        el.style.transform = 'scale(0.3) rotate(-15deg)'
        el.style.opacity = '0'
      })

      await animationFrame(() => {
        second.tiles.forEach(({ el, col, row }) => {
          const dist = direction === 1 ? col + row : (COLS - 1 - col) + (ROWS - 1 - row)
          const delay = (dist / maxDist) * half * 0.7
          el.style.transition = `transform ${half * 0.5}ms ease ${delay}ms, opacity ${half * 0.4}ms ease ${delay}ms`
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
