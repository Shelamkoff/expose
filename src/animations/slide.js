import { cssTransition } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('slide', {
  enter(overlay, duration) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '0'; overlay.style.transform = 'translate3d(0, 30px, 0)' },
      () => { overlay.style.opacity = '1'; overlay.style.transform = 'translate3d(0, 0, 0)' },
      duration,
    )
  },
  exit(overlay, duration) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '1'; overlay.style.transform = 'translate3d(0, 0, 0)' },
      () => { overlay.style.opacity = '0'; overlay.style.transform = 'translate3d(0, 30px, 0)' },
      duration,
    )
  },
  transition(current, next, direction, duration) {
    const offset = direction === 1 ? '100%' : '-100%'
    const offsetReverse = direction === 1 ? '-100%' : '100%'

    next.style.display = ''
    next.style.transform = `translate3d(${offset}, 0, 0)`
    next.style.opacity = '1'

    return Promise.all([
      cssTransition(current,
        () => { current.style.transform = 'translate3d(0, 0, 0)' },
        () => { current.style.transform = `translate3d(${offsetReverse}, 0, 0)` },
        duration,
      ),
      cssTransition(next,
        () => { next.style.transform = `translate3d(${offset}, 0, 0)` },
        () => { next.style.transform = 'translate3d(0, 0, 0)' },
        duration,
      ),
    ]).then(() => {
      current.style.display = 'none'
      current.style.transform = ''
      current.style.opacity = ''
      next.style.transform = ''
    })
  },
})
