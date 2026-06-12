import { cssTransition, fadeEnter, fadeExit } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('fold', {
  enter: fadeEnter,
  exit: fadeExit,
  transition(current, next, direction, duration) {
    const parent = current.parentElement
    if (parent) parent.style.perspective = '1200px'

    const half = duration / 2
    next.style.display = ''
    next.style.opacity = '0'
    next.style.transform = 'rotateX(90deg)'
    next.style.transformOrigin = 'center bottom'

    current.style.transformOrigin = 'center top'

    return cssTransition(current,
      () => { current.style.transform = 'rotateX(0)' },
      () => { current.style.opacity = '0'; current.style.transform = 'rotateX(-90deg)' },
      half,
    ).then(() => {
      current.style.display = 'none'
      current.style.transform = ''
      current.style.transformOrigin = ''
      current.style.opacity = ''

      return cssTransition(next,
        () => {},
        () => { next.style.opacity = '1'; next.style.transform = 'rotateX(0)' },
        half,
      )
    }).then(() => {
      next.style.transform = ''
      next.style.transformOrigin = ''
      next.style.opacity = ''
      if (parent) parent.style.perspective = ''
    })
  },
})
