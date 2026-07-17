import { cssTransition, fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('rotate', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration, signal) {
    next.style.display = ''
    next.style.opacity = '0'
    next.style.transform = `rotate(${-direction * 90}deg) scale(0.5)`

    return Promise.all([
      cssTransition(current,
        () => { current.style.transform = 'rotate(0) scale(1)' },
        () => { current.style.opacity = '0'; current.style.transform = `rotate(${direction * 90}deg) scale(0.5)` },
        duration,
        'transform,opacity',
        signal,
      ),
      cssTransition(next,
        () => {},
        () => { next.style.opacity = '1'; next.style.transform = 'rotate(0) scale(1)' },
        duration,
        'transform,opacity',
        signal,
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
