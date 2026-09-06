import type { Engine } from '../Engine'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
/** A reader/export lease does not allocate a fractal rendering session. */
export function parkExpmapSession(engine?: Pick<Engine, 'suspendForExpmapPlayback'> | null, controller?: Pick<MandelbrotExposed, 'getParams' | 'getNavigator'> | null) {
  const camera = controller?.getParams(), navigator = controller?.getNavigator()
  const release = engine?.suspendForExpmapPlayback()
  navigator?.cancel_transition()
  let restored = false
  return () => {
    if (restored) return
    restored = true
    try {
      if (navigator && camera) {
        navigator.cancel_transition(); navigator.origin(camera[0], camera[1]); navigator.scale(camera[2]); navigator.angle(Number(camera[3]))
      }
    } finally { release?.() }
  }
}
