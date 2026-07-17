import { cssTransition, fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('iris', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration, signal) {
    next.style.display = ''
    next.style.opacity = '1'
    next.style.zIndex = '2'
    next.style.clipPath = 'circle(0% at 50% 50%)'

    return cssTransition(next,
      () => {},
      () => { next.style.clipPath = 'circle(75% at 50% 50%)' },
      duration,
      'clip-path',
      signal,
    ).then(() => {
      current.style.display = 'none'
      next.style.clipPath = ''
      next.style.zIndex = ''
    })
  },
})
