import { scatterTiles, fadeEnter, fadeExit, fadeFallback } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('blinds', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration) {
    const STRIPS = 8
    const img = current.querySelector('img')

    if (!img) return fadeFallback(current, next, duration)

    next.style.display = ''
    next.style.opacity = '1'

    const { grid, tiles } = scatterTiles(img, current, STRIPS, 1)
    current.style.opacity = '0'
    grid.style.perspective = '800px'

    return new Promise(resolve => {
      requestAnimationFrame(() => {
        tiles.forEach(({ el, col }) => {
          const idx = direction === 1 ? col : STRIPS - 1 - col
          const delay = idx * (duration / STRIPS) * 0.5
          el.style.transformOrigin = direction === 1 ? 'left center' : 'right center'
          el.style.transition =
            `transform ${duration * 0.5}ms ease ${delay}ms,` +
            `opacity ${duration * 0.3}ms ease ${delay + duration * 0.15}ms`
          el.style.transform = `rotateY(${direction * 90}deg)`
          el.style.opacity = '0'
        })
      })

      setTimeout(() => {
        grid.remove()
        current.style.display = 'none'
        current.style.opacity = ''
        resolve()
      }, duration)
    })
  },
})
