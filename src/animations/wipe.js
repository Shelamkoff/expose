import { cssTransition, fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('wipe', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration, signal) {
    next.style.display = ''
    next.style.opacity = '1'
    next.style.zIndex = '2'
    next.style.clipPath = direction === 1 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)'

    return cssTransition(next,
      () => {},
      () => { next.style.clipPath = 'inset(0)' },
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
