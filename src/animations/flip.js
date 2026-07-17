import { cssTransition } from './_helpers.js'
import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('flip', {
  enter(overlay, duration, signal) {
    overlay.style.perspective = '1200px'
    return cssTransition(overlay,
      () => { overlay.style.opacity = '0'; overlay.style.transform = 'rotateY(-90deg)' },
      () => { overlay.style.opacity = '1'; overlay.style.transform = 'rotateY(0)' },
      duration,
      'transform,opacity',
      signal,
    )
  },
  exit(overlay, duration, signal) {
    return cssTransition(overlay,
      () => { overlay.style.opacity = '1'; overlay.style.transform = 'rotateY(0)' },
      () => { overlay.style.opacity = '0'; overlay.style.transform = 'rotateY(90deg)' },
      duration,
      'transform,opacity',
      signal,
    ).then(() => { overlay.style.perspective = '' })
  },
  transition(current, next, direction, duration, signal) {
    const parent = current.parentElement
    if (parent) parent.style.perspective = '1200px'

    const halfDuration = duration / 2
    next.style.display = ''
    next.style.opacity = '0'
    next.style.transform = `rotateY(${direction === 1 ? '-90' : '90'}deg)`

    return cssTransition(current,
      () => { current.style.opacity = '1'; current.style.transform = 'rotateY(0)' },
      () => { current.style.opacity = '0'; current.style.transform = `rotateY(${direction === 1 ? '90' : '-90'}deg)` },
      halfDuration,
      'transform,opacity',
      signal,
    ).then(() => {
      current.style.display = 'none'
      current.style.transform = ''
      current.style.opacity = ''
      return cssTransition(next,
        () => {},
        () => { next.style.opacity = '1'; next.style.transform = 'rotateY(0)' },
        halfDuration,
        'transform,opacity',
        signal,
      )
    }).then(() => {
      next.style.transform = ''
      next.style.opacity = ''
      if (parent) parent.style.perspective = ''
    })
  },
})
