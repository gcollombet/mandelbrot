// ── State machine for the frozen/live zoom reprojection cycle ──
// Separates transition logic from GPU effects in Engine.ts.

export type ZoomState =
  | { kind: 'idle' }
  | {
      kind: 'reprojecting'
      frozenScale: number
      liveScale: number
      zoomingIn: boolean
    }

export type ZoomEvent =
  | { type: 'referenceReset'; muChanged: boolean; orbitWasReset: boolean }
  | { type: 'scaleChanged'; scale: number; prevScale: number }
  | { type: 'scaleStable' }

export type ZoomEffect =
  /** Refresh the frozen texture from the resolved (live) one. The engine
   *  implements this as a min-step merge whenever a usable frozen texture
   *  exists, and as a raw copy only when it does not. */
  | { type: 'copyResolvedToFrozen' }
  | { type: 'mergeResolvedAndFrozen' }
  | { type: 'clearHistoryNextFrame' }

export type ZoomStep = {
  state: ZoomState
  effects: ZoomEffect[]
}

export type ZoomContext = {
  threshold: number
}

export function isZoomActive(state: ZoomState): boolean {
  return state.kind === 'reprojecting'
}

export function getFrozenScale(state: ZoomState): number {
  return state.kind === 'reprojecting' ? state.frozenScale : 0
}

export function getLiveScale(state: ZoomState): number {
  return state.kind === 'reprojecting' ? state.liveScale : 0
}

export function getZoomingIn(state: ZoomState): boolean {
  return state.kind !== 'reprojecting' || state.zoomingIn
}

export function reduceZoomState(
  state: ZoomState,
  event: ZoomEvent,
  ctx: ZoomContext,
): ZoomStep {
  switch (state.kind) {
    case 'idle':
      return reduceIdle(state, event, ctx)
    case 'reprojecting':
      return reduceReprojecting(state, event, ctx)
  }
}

function reduceIdle(
  state: ZoomState,
  event: ZoomEvent,
  ctx: ZoomContext,
): ZoomStep {
  const effects: ZoomEffect[] = []

  switch (event.type) {
    case 'referenceReset':
      if (event.orbitWasReset && !event.muChanged) {
        effects.push({ type: 'copyResolvedToFrozen' })
      }
      effects.push({ type: 'clearHistoryNextFrame' })
      return { state, effects }

    case 'scaleChanged':
      if (event.scale !== event.prevScale) {
        const zoomingIn = event.scale < event.prevScale
        const frozenScale = event.prevScale
        const liveScale = zoomingIn
          ? frozenScale / ctx.threshold
          : frozenScale * ctx.threshold

        effects.push({ type: 'copyResolvedToFrozen' })
        effects.push({ type: 'clearHistoryNextFrame' })

        return {
          state: {
            kind: 'reprojecting',
            frozenScale,
            liveScale,
            zoomingIn,
          },
          effects,
        }
      }
      return { state, effects }

    case 'scaleStable':
      return { state, effects }
  }
}

function reduceReprojecting(
  state: ZoomState & { kind: 'reprojecting' },
  event: ZoomEvent,
  ctx: ZoomContext,
): ZoomStep {
  const effects: ZoomEffect[] = []

  switch (event.type) {
    case 'referenceReset':
      if (event.muChanged) {
        return {
          state: { kind: 'idle' },
          effects: [{ type: 'clearHistoryNextFrame' }],
        }
      }
      // The frozen texture holds resolved display values, which do not depend
      // on the reference orbit: it survives the reset untouched and the cycle
      // continues. Only the live history is invalid (dx/dy jumped) and is
      // cleared. Swaps and the final merge stay enabled because the engine
      // refreshes the frozen texture by min-step merge, never by a raw copy,
      // so a freshly cleared live can never degrade it.
      effects.push({ type: 'clearHistoryNextFrame' })
      return { state, effects }

    case 'scaleChanged': {
      const zoomFactor = state.frozenScale / event.scale
      const shouldSwap = state.zoomingIn
        ? zoomFactor >= ctx.threshold
        : zoomFactor <= 1 / ctx.threshold

      if (shouldSwap) {
        const nextFrozenScale = state.liveScale
        const nextLiveScale = state.zoomingIn
          ? event.scale / ctx.threshold
          : event.scale * ctx.threshold

        effects.push({ type: 'copyResolvedToFrozen' })
        effects.push({ type: 'clearHistoryNextFrame' })

        return {
          state: {
            kind: 'reprojecting',
            frozenScale: nextFrozenScale,
            liveScale: nextLiveScale,
            zoomingIn: state.zoomingIn,
          },
          effects,
        }
      }

      return { state, effects }
    }

    case 'scaleStable': {
      effects.push({ type: 'mergeResolvedAndFrozen' })
      effects.push({ type: 'clearHistoryNextFrame' })

      return {
        state: { kind: 'idle' },
        effects,
      }
    }
  }
}

/** Reset all zoom state to idle (used on resize, hard reset, etc.). */
export function resetZoomState(): ZoomState {
  return { kind: 'idle' }
}
