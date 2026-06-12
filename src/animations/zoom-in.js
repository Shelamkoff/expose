import { cssTransition } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('zoom-in', {
  enter(overlay, duration) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '0'; overlay.style.transform = 'scale3d(0.8, 0.8, 1)' },
      () => { overlay.style.opacity = '1'; overlay.style.transform = 'scale3d(1, 1, 1)' },
      duration,
    )
  },
  exit(overlay, duration) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '1'; overlay.style.transform = 'scale3d(1, 1, 1)' },
      () => { overlay.style.opacity = '0'; overlay.style.transform = 'scale3d(0.8, 0.8, 1)' },
      duration,
    )
  },
  transition(current, next, direction, duration) {
    next.style.display = ''
    next.style.opacity = '0'
    next.style.transform = `scale3d(${direction === 1 ? '1.1, 1.1' : '0.9, 0.9'}, 1)`

    return Promise.all([
      cssTransition(current,
        () => { current.style.opacity = '1'; current.style.transform = 'scale3d(1, 1, 1)' },
        () => { current.style.opacity = '0'; current.style.transform = `scale3d(${direction === 1 ? '0.9, 0.9' : '1.1, 1.1'}, 1)` },
        duration,
      ),
      cssTransition(next,
        () => {},
        () => { next.style.opacity = '1'; next.style.transform = 'scale3d(1, 1, 1)' },
        duration,
      ),
    ]).then(() => {
      current.style.display = 'none'
      current.style.opacity = ''
      current.style.transform = ''
      next.style.opacity = ''
      next.style.transform = ''
    })
  },
})
