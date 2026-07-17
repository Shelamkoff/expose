import { cssTransition } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('fade', {
  enter(overlay, duration, signal) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '0' },
      () => { overlay.style.opacity = '1' },
      duration,
      'transform,opacity',
      signal,
    )
  },
  exit(overlay, duration, signal) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '1' },
      () => { overlay.style.opacity = '0' },
      duration,
      'transform,opacity',
      signal,
    )
  },
  transition(current, next, direction, duration, signal) {
    next.style.opacity = '0'
    next.style.display = ''

    return Promise.all([
      cssTransition(current,
        () => { current.style.opacity = '1' },
        () => { current.style.opacity = '0' },
        duration,
        'transform,opacity',
        signal,
      ),
      cssTransition(next,
        () => { next.style.opacity = '0' },
        () => { next.style.opacity = '1' },
        duration,
        'transform,opacity',
        signal,
      ),
    ]).then(() => {
      current.style.display = 'none'
      current.style.opacity = ''
      next.style.opacity = ''
    })
  },
})
