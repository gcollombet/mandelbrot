// ── State machine for the frozen/live zoom reprojection cycle ──
// Separates transition logic from GPU effects in Engine.ts.

export type ZoomState =
  | { kind: 'idle' }
  | {
      kind: 'reprojecting'
      frozenScale: number
      liveScale: number
      zoomingIn: boolean
      referenceResetDuringZoom: boolean
    }

export type ZoomEvent =
  | { type: 'referenceReset'; muChanged: boolean; orbitWasReset: boolean }
  | { type: 'scaleChanged'; scale: number; prevScale: number }
  | { type: 'scaleStable' }

export type ZoomEffect =
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

export function getReferenceResetDuringZoom(state: ZoomState): boolean {
  return state.kind === 'reprojecting' && state.referenceResetDuringZoom
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
            referenceResetDuringZoom: false,
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
      effects.push({ type: 'clearHistoryNextFrame' })
      return {
        state: { ...state, referenceResetDuringZoom: true },
        effects,
      }

    case 'scaleChanged': {
      // Once the clear triggered by a reference reset has been consumed
      // (one frame later), re-enable swap so the zoom cycle continues.
      let nextState: ZoomState & { kind: 'reprojecting' } = state
      if (state.referenceResetDuringZoom) {
        nextState = { ...state, referenceResetDuringZoom: false }
      }

      const zoomFactor = nextState.frozenScale / event.scale
      const shouldSwap = nextState.zoomingIn
        ? zoomFactor >= ctx.threshold
        : zoomFactor <= 1 / ctx.threshold

      if (shouldSwap && !nextState.referenceResetDuringZoom) {
        const nextFrozenScale = nextState.liveScale
        const nextLiveScale = nextState.zoomingIn
          ? event.scale / ctx.threshold
          : event.scale * ctx.threshold

        effects.push({ type: 'copyResolvedToFrozen' })
        effects.push({ type: 'clearHistoryNextFrame' })

        return {
          state: {
            kind: 'reprojecting',
            frozenScale: nextFrozenScale,
            liveScale: nextLiveScale,
            zoomingIn: nextState.zoomingIn,
            referenceResetDuringZoom: false,
          },
          effects,
        }
      }

      return { state: nextState, effects }
    }

    case 'scaleStable': {
      // If a reference reset occurred during this cycle, skip merge
      // (the frozen data is from a different reference epoch).
      if (!state.referenceResetDuringZoom) {
        effects.push({ type: 'mergeResolvedAndFrozen' })
      }
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