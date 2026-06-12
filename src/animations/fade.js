import { cssTransition } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('fade', {
  enter(overlay, duration) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '0' },
      () => { overlay.style.opacity = '1' },
      duration,
    )
  },
  exit(overlay, duration) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '1' },
      () => { overlay.style.opacity = '0' },
      duration,
    )
  },
  transition(current, next, direction, duration) {
    next.style.opacity = '0'
    next.style.display = ''

    return Promise.all([
      cssTransition(current,
        () => { current.style.opacity = '1' },
        () => { current.style.opacity = '0' },
        duration,
      ),
      cssTransition(next,
        () => { next.style.opacity = '0' },
        () => { next.style.opacity = '1' },
        duration,
      ),
    ]).then(() => {
      current.style.display = 'none'
      current.style.opacity = ''
      next.style.opacity = ''
    })
  },
})
