import { scatterTiles, fadeEnter, fadeExit, fadeFallback } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('puzzle', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration) {
    const COLS = 6, ROWS = 4
    const dur = Math.max(duration * 2, 700)
    const half = dur / 2
    const img = current.querySelector('img')

    if (!img) return fadeFallback(current, next, duration)

    const { grid, tiles } = scatterTiles(img, current, COLS, ROWS)
    img.style.visibility = 'hidden'
    const maxDist = COLS + ROWS - 2

    return new Promise(resolve => {
      requestAnimationFrame(() => {
        tiles.forEach(({ el, col, row }) => {
          const dist = direction === 1 ? col + row : (COLS - 1 - col) + (ROWS - 1 - row)
          const delay = (dist / maxDist) * half * 0.7
          el.style.transition = `transform ${half * 0.5}ms ease ${delay}ms, opacity ${half * 0.4}ms ease ${delay}ms`
          el.style.transform = 'scale(0.3) rotate(15deg)'
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
        t2.forEach(({ el }) => {
          el.style.transform = 'scale(0.3) rotate(-15deg)'
          el.style.opacity = '0'
        })

        requestAnimationFrame(() => {
          t2.forEach(({ el, col, row }) => {
            const dist = direction === 1 ? col + row : (COLS - 1 - col) + (ROWS - 1 - row)
            const delay = (dist / maxDist) * half * 0.7
            el.style.transition = `transform ${half * 0.5}ms ease ${delay}ms, opacity ${half * 0.4}ms ease ${delay}ms`
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
