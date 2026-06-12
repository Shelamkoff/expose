import { AnimationManager } from '../AnimationManager.js'

AnimationManager.register('none', {
  enter(overlay) { overlay.style.opacity = '1' },
  exit(overlay) { overlay.style.opacity = '0' },
  transition(current, next) {
    current.style.display = 'none'
    next.style.display = ''
  },
})
