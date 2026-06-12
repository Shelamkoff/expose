import { cssTransition, fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('stack', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration) {
    next.style.display = ''
    next.style.opacity = '0'
    next.style.transform = 'scale(1.15)'

    return Promise.all([
      cssTransition(current,
        () => { current.style.transform = 'scale(1)'; current.style.opacity = '1' },
        () => { current.style.transform = 'scale(0.75)'; current.style.opacity = '0' },
        duration,
      ),
      cssTransition(next,
        () => {},
        () => { next.style.opacity = '1'; next.style.transform = 'scale(1)' },
        duration,
      ),
    ]).then(() => {
      current.style.display = 'none'
      current.style.transform = ''
      current.style.opacity = ''
      next.style.transform = ''
      next.style.opacity = ''
    })
  },
})
