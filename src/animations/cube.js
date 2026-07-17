import { cssTransition } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('cube', {
  enter(overlay, duration, signal) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '0'; overlay.style.transform = 'scale(.9)' },
      () => { overlay.style.opacity = '1'; overlay.style.transform = '' },
      duration,
      'transform,opacity',
      signal,
    )
  },
  exit(overlay, duration, signal) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '1' },
      () => { overlay.style.opacity = '0'; overlay.style.transform = 'scale(.9)' },
      duration,
      'transform,opacity',
      signal,
    ).then(() => { overlay.style.transform = '' })
  },
  transition(current, next, direction, duration, signal) {
    const parent = current.parentElement
    if (parent) parent.style.perspective = '1200px'

    const angle = 90 * direction
    next.style.display = ''
    next.style.opacity = '1'
    next.style.transformOrigin = direction === 1 ? 'left center' : 'right center'
    next.style.transform = `rotateY(${-angle}deg)`

    current.style.transformOrigin = direction === 1 ? 'right center' : 'left center'

    return Promise.all([
      cssTransition(current,
        () => { current.style.transform = 'rotateY(0)' },
        () => { current.style.transform = `rotateY(${angle}deg)` },
        duration,
        'transform,opacity',
        signal,
      ),
      cssTransition(next,
        () => {},
        () => { next.style.transform = 'rotateY(0)' },
        duration,
        'transform,opacity',
        signal,
      ),
    ]).then(() => {
      current.style.display = 'none'
      current.style.transform = ''
      current.style.transformOrigin = ''
      current.style.opacity = ''
      next.style.transform = ''
      next.style.transformOrigin = ''
      if (parent) parent.style.perspective = ''
    })
  },
})
