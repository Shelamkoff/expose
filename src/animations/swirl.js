import { cssTransition, fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('swirl', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration, signal) {
    next.style.display = ''
    next.style.opacity = '0'
    next.style.transform = `scale(0) rotate(${-direction * 180}deg)`

    return Promise.all([
      cssTransition(current,
        () => { current.style.transform = 'scale(1) rotate(0)' },
        () => { current.style.opacity = '0'; current.style.transform = `scale(0) rotate(${direction * 180}deg)` },
        duration,
        'transform,opacity',
        signal,
      ),
      cssTransition(next,
        () => {},
        () => { next.style.opacity = '1'; next.style.transform = 'scale(1) rotate(0)' },
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
