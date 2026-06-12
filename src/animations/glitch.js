import { fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('glitch', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration) {
    const STEPS = 8
    const step = duration / STEPS
    next.style.display = ''
    next.style.opacity = '0'

    return new Promise(resolve => {
      let i = 0
      let start = null

      function tick(ts) {
        if (!start) start = ts
        const elapsed = ts - start
        const newI = Math.min(STEPS, Math.floor(elapsed / step) + 1)

        if (newI > i) {
          i = newI
          const progress = i / STEPS
          const showNext = progress > 0.4 && (progress > 0.7 || Math.random() > 0.4)
          const jx = (Math.random() - 0.5) * 20 * (1 - progress)
          const jy = (Math.random() - 0.5) * 10 * (1 - progress)

          if (showNext) {
            next.style.opacity = '1'
            next.style.transform = i < STEPS ? `translate(${jx}px,${jy}px)` : ''
            current.style.opacity = String(Math.max(0, 1 - progress * 1.5))
          } else {
            next.style.opacity = '0'
            current.style.opacity = '1'
            current.style.transform = `translate(${jx}px,${jy}px)`
          }
        }

        if (i >= STEPS) {
          current.style.display = 'none'
          current.style.opacity = ''
          current.style.transform = ''
          next.style.opacity = ''
          next.style.transform = ''
          resolve()
        } else {
          requestAnimationFrame(tick)
        }
      }

      requestAnimationFrame(tick)
    })
  },
})
