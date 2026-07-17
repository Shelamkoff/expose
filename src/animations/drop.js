import { cssTransition, fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('drop', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration, signal) {
    next.style.display = ''
    next.style.transform = 'translate3d(0, -100%, 0)'
    next.style.opacity = '1'

    return Promise.all([
      cssTransition(current,
        () => { current.style.transform = 'translate3d(0,0,0)' },
        () => { current.style.transform = 'translate3d(0,100%,0)'; current.style.opacity = '0' },
        duration,
        'transform,opacity',
        signal,
      ),
      cssTransition(next,
        () => {},
        () => { next.style.transform = 'translate3d(0,0,0)' },
        duration,
        'transform,opacity',
        signal,
      ),
    ]).then(() => {
      current.style.display = 'none'
      current.style.transform = ''
      current.style.opacity = ''
      next.style.transform = ''
    })
  },
})
