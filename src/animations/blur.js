import { cssTransition, fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('blur', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration, signal) {
    next.style.display = ''
    next.style.opacity = '0'
    next.style.filter = 'blur(6px)'

    return Promise.all([
      cssTransition(current,
        () => { current.style.filter = 'blur(0)' },
        () => { current.style.opacity = '0'; current.style.filter = 'blur(6px)' },
        duration,
        'opacity,filter',
        signal,
      ),
      cssTransition(next,
        () => {},
        () => { next.style.opacity = '1'; next.style.filter = 'blur(0)' },
        duration,
        'opacity,filter',
        signal,
      ),
    ]).then(() => {
      current.style.display = 'none'
      current.style.opacity = ''
      current.style.filter = ''
      next.style.opacity = ''
      next.style.filter = ''
    })
  },
})
