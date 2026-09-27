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
  | { type: 'clearHistory' }

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

/** Scale the live grid is computed at: the cycle's live scale mid-zoom,
 *  the display scale otherwise. */
export function liveGridScale(state: ZoomState, displayScale: number): number {
  return state.kind === 'reprojecting' && state.liveScale > 0 ? state.liveScale : displayScale
}

/** Ratios frozen/display and live/display scale read by the colour pass
 *  (both 1 outside a reprojection cycle). */
export function displayZoomFactors(state: ZoomState, displayScale: number): { frozen: number; live: number } {
  return state.kind === 'reprojecting'
    ? { frozen: state.frozenScale / displayScale, live: state.liveScale / displayScale }
    : { frozen: 1, live: 1 }
}

export type FrameChange = {
  /** Scale of the last rendered frame, null when there is none (first frame,
   *  after a resize or an expmap block). */
  previousScale: number | null
  scale: number
  /** The navigator re-anchored its reference orbit since the last frame. */
  orbitWasReset: boolean
  muChanged: boolean
  /** Export pumps render() repeatedly at a FIXED camera until the frame
   *  converges: an unchanged scale there is a repeat, not a zoom stop. */
  repeatPump: boolean
}

/**
 * The zoom event a frame represents, or null when it carries none.
 *
 * A missing previous frame or a re-anchored orbit invalidates the history
 * (`referenceReset`), as does a new mu. Otherwise a different scale is a zoom
 * step, and an identical one means the user stopped zooming — except in an
 * export, where the second pump of a frame would otherwise tear the cycle
 * down and rebuild it on every frame.
 */
export function classifyFrame(change: FrameChange): ZoomEvent | null {
  const hasPrevious = change.previousScale !== null
  if (!hasPrevious || change.orbitWasReset || change.muChanged) {
    return { type: 'referenceReset', muChanged: change.muChanged, orbitWasReset: change.orbitWasReset }
  }
  if (change.previousScale !== change.scale) {
    return { type: 'scaleChanged', scale: change.scale, prevScale: change.previousScale! }
  }
  return change.repeatPump ? null : { type: 'scaleStable' }
}

/**
 * Small-zoom stop: the scale just stabilised while the machine stayed idle
 * (the zoom was too small to start a cycle). The previous frame had an
 * un-snapped centre (the navigator snaps only once zooming stops), so its
 * delta to this snapped frame is fractional: the live grid is rebuilt from
 * the snapped position instead of being shifted by a sub-texel amount. In an
 * export a "scale that just stabilised" is a second pump on the same frame,
 * and clearing there would discard the field the pump is converging.
 */
export function smallZoomStopNeedsClear(input: {
  wasZoomActive: boolean
  previousFrameScaleChanged: boolean
  scaleChanged: boolean
  repeatPump: boolean
}): boolean {
  return !input.wasZoomActive && input.previousFrameScaleChanged && !input.scaleChanged && !input.repeatPump
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
      effects.push({ type: 'clearHistory' })
      return { state, effects }

    case 'scaleChanged':
      if (event.scale !== event.prevScale) {
        const zoomingIn = event.scale < event.prevScale
        const frozenScale = event.prevScale
        const liveScale = zoomingIn
          ? frozenScale / ctx.threshold
          : frozenScale * ctx.threshold

        effects.push({ type: 'copyResolvedToFrozen' })
        effects.push({ type: 'clearHistory' })

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
          effects: [{ type: 'clearHistory' }],
        }
      }
      // The frozen texture holds resolved display values, which do not depend
      // on the reference orbit: it survives the reset untouched and the cycle
      // continues. Only the live history is invalid (dx/dy jumped) and is
      // cleared. Swaps and the final merge stay enabled because the engine
      // refreshes the frozen texture by min-step merge, never by a raw copy,
      // so a freshly cleared live can never degrade it.
      effects.push({ type: 'clearHistory' })
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
        effects.push({ type: 'clearHistory' })

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
      effects.push({ type: 'clearHistory' })

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
