import { nextTick, ref } from 'vue'
import type { MandelbrotParams } from './Mandelbrot'
import {
  addStudioKeyframe, blendedLook, cameraSegmentAt, discreteLookFields, lookStateAt,
  snapshotStudioCamera, snapshotStudioLook,
  type StudioKeyframe, type StudioLook, type StudioParcours,
} from './studioParcours'

// ── Studio player: turns the parcours evaluator into engine and navigator calls ──
//
// Camera: every camera segment is one navigator EXPORT transition (linear in
// the supplied time, exponential scale, centre linear in scale, unwrapped
// angle), placed at an absolute local time through the controller's export
// clock. That is the video export's own deterministic path, so the preview
// and a future export see the same camera for the same parcours time.
//
// Look: continuous fields go through `interpolatePresetAppearance`, the colour
// stops through the engine's GPU preset transition (textures resolved on the
// way), exactly like a preset travel. Discrete fields switch at the keyframe.
//
// Recording: the clock runs, the user navigates freely, and each capture pins
// the live camera and look at the current time.

/** The slice of the WASM navigator the player drives. Structural, so this
 *  module does not depend on the generated package types. */
export interface StudioNavigator {
  cancel_transition(): void
  origin(cx: string, cy: string): void
  scale(scale: string): void
  angle(angle: number): void
  start_export_transition(cx: string, cy: string, scale: string, angle: number, duration: number): void
  step_at_transition_time(width: number | undefined, height: number | undefined, elapsed: number): unknown
  get_params(): unknown
}

export interface StudioController {
  getNavigator(): StudioNavigator | null
  /** Camera clock in seconds; the animation clock follows `animationSeconds`
   *  (defaults to the camera clock). Null hands both back to wall time. */
  setExportTime(elapsedSeconds: number | null, animationSeconds?: number): void
  resetReferenceTo(cx: string, cy: string, scale: string, angle: number): void
  isExporting(): boolean
}

export interface StudioEngine {
  preparePresetTransition(
    start: Pick<MandelbrotParams, 'colorStops' | 'interpolationMode'>,
    end: Pick<MandelbrotParams, 'colorStops' | 'interpolationMode'>,
    tile: { url: string; key: string }, sky: { url: string; key: string },
  ): Promise<boolean>
  setPresetTransitionProgress(progress: number): void
  finishPresetTransition(): void
  cancelPresetTransition(): void
  readonly isPresetTransitionActive: boolean
  isTileTextureSourceCurrent(sourceKey: string): boolean
  isSkyboxTextureSourceCurrent(sourceKey: string): boolean
  updateTileTexture(url: string, sourceKey?: string): Promise<void>
  updateSkyboxTexture(url: string, sourceKey?: string): Promise<void>
}

export type StudioTextures = { tile: { url: string; key: string }; sky: { url: string; key: string }; release(): void }

export type StudioPlayerDeps = {
  getEngine(): StudioEngine | null
  getController(): StudioController | null
  /** The viewer's live params. Mutated in place, like a preset travel does. */
  params: { readonly value: MandelbrotParams }
  /** Resolve the tile and skybox textures a look refers to. */
  resolveTextures(look: StudioLook): Promise<StudioTextures>
}

export type StudioCaptureScope = 'both' | 'camera' | 'look'

export function createStudioPlayer(deps: StudioPlayerDeps) {
  const time = ref(0)
  const playing = ref(false)
  const recording = ref(false)
  /** Set while the player owns the camera (play, seek, scrub). */
  const driving = ref(false)
  let parcours: StudioParcours | null = null
  let frame: ReturnType<typeof setTimeout> | null = null
  let wallStart = 0, timeAtStart = 0
  // Camera segment currently handed to the navigator and its local clock.
  let cameraKey = ''
  let cameraClock: { parcoursTime: number; localElapsed: number } | null = null
  // Look segment the GPU transition is prepared for.
  let lookKey = ''
  let lookPrepared = false
  let lookGeneration = 0
  let heldTextures: StudioTextures | null = null

  function setParcours(next: StudioParcours | null) {
    parcours = next
    cameraKey = ''
    lookKey = ''
  }

  function readParams(navigator: StudioNavigator): { cx: string; cy: string; scale: string; angle: number } | null {
    const raw = navigator.get_params() as unknown
    if (!Array.isArray(raw) || raw.length < 4) return null
    return { cx: String(raw[0]), cy: String(raw[1]), scale: String(raw[2]), angle: parseFloat(String(raw[3])) }
  }

  // ── Camera ──

  /** Snap the navigator onto the exact camera of parcours time `t` and, when
   *  playing, hand it the rest of the segment as an export transition. */
  function placeCamera(t: number, continueSegment: boolean) {
    if (!parcours) return
    const controller = deps.getController(), navigator = controller?.getNavigator()
    if (!controller || !navigator) return
    const segment = cameraSegmentAt(parcours, t)
    if (!segment) return
    navigator.cancel_transition()
    navigator.origin(segment.from.cx, segment.from.cy)
    navigator.scale(segment.from.scale)
    navigator.angle(segment.from.angle)
    if (segment.duration > 0 && segment.localElapsed > 0) {
      // Let the navigator's own deep-safe interpolation compute the in-between
      // point, then read it back as decimal strings.
      navigator.start_export_transition(segment.to.cx, segment.to.cy, segment.to.scale, segment.to.angle, segment.duration)
      navigator.step_at_transition_time(undefined, undefined, Math.min(segment.localElapsed, segment.duration))
    }
    const here = readParams(navigator) ?? segment.from
    // Teleport with a fresh reference orbit at the exact point (cold-start state).
    controller.resetReferenceTo(here.cx, here.cy, here.scale, here.angle)
    cameraKey = `${segment.index}`
    if (continueSegment && segment.duration > segment.localElapsed) {
      navigator.start_export_transition(segment.to.cx, segment.to.cy, segment.to.scale, segment.to.angle, segment.duration - segment.localElapsed)
      cameraClock = { parcoursTime: t, localElapsed: 0 }
      controller.setExportTime(0, t)
    } else {
      cameraClock = null
      controller.setExportTime(continueSegment ? 0 : null, t)
    }
  }

  function driveCamera(t: number) {
    if (!parcours) return
    const controller = deps.getController()
    if (!controller) return
    const segment = cameraSegmentAt(parcours, t)
    if (!segment) return
    const key = `${segment.index}`
    if (key !== cameraKey || !cameraClock) {
      // New segment: the previous transition landed exactly on its target,
      // which is this segment's start. Re-anchor and hand over the next leg.
      placeCamera(t, true)
      return
    }
    // Camera time elapsed since the hand-over, in the segment's own clock.
    cameraClock.localElapsed = Math.max(0, rampDelta(cameraClock.parcoursTime, t))
    controller.setExportTime(cameraClock.localElapsed, t)
  }

  /** Camera-time distance between two parcours times (ramps applied). */
  function rampDelta(fromParcoursTime: number, toParcoursTime: number): number {
    if (!parcours) return toParcoursTime - fromParcoursTime
    const a = cameraSegmentAt(parcours, fromParcoursTime), b = cameraSegmentAt(parcours, toParcoursTime)
    if (!a || !b || a.index !== b.index) return toParcoursTime - fromParcoursTime
    return b.localElapsed - a.localElapsed
  }

  // ── Look ──

  function releaseTextures() {
    heldTextures?.release()
    heldTextures = null
  }

  function applyLook(t: number) {
    if (!parcours) return
    const state = lookStateAt(parcours, t)
    if (!state) return
    const engine = deps.getEngine()
    const params = deps.params.value
    const key = `${state.fromId}>${state.toId}`
    const resting = state.w <= 0 || state.w >= 1 || state.fromId === state.toId
    if (key !== lookKey) {
      lookKey = key
      lookPrepared = false
      ++lookGeneration
      releaseTextures()
      engine?.cancelPresetTransition()
    }
    Object.assign(params, blendedLook(state))
    if (resting) {
      if (engine?.isPresetTransitionActive) {
        if (state.w >= 1) engine.finishPresetTransition()
        else engine.cancelPresetTransition()
      }
      lookPrepared = false
      Object.assign(params, discreteLookFields(state.w >= 1 ? state.b : state.a))
      return
    }
    // Mid-transition: the GPU blends the colour stops of a and b while the
    // params keep a's discrete fields, as a preset travel does.
    if (!lookPrepared && engine) {
      lookPrepared = true
      const generation = lookGeneration
      void (async () => {
        try {
          const textures = await deps.resolveTextures(state.b)
          if (generation !== lookGeneration) { textures.release(); return }
          heldTextures = textures
          const ok = await engine.preparePresetTransition(state.a as MandelbrotParams, state.b as MandelbrotParams, textures.tile, textures.sky)
          if (generation !== lookGeneration) { engine.cancelPresetTransition(); return }
          if (!ok) lookPrepared = false
        } catch (error) {
          console.warn('Studio: look transition could not be prepared', error)
          if (generation === lookGeneration) lookPrepared = false
        }
      })()
    }
    if (engine?.isPresetTransitionActive) engine.setPresetTransitionProgress(state.w)
  }

  // ── Clock ──

  // A timer rather than requestAnimationFrame: the clock must keep advancing
  // while the engine spends several compositor frames on one deep render.
  const TICK_MS = 16
  function tick() {
    frame = null
    if (!playing.value && !recording.value) return
    const now = performance.now()
    let t = timeAtStart + (now - wallStart) / 1000
    if (parcours && playing.value && t >= parcours.durationSeconds) {
      t = parcours.durationSeconds
      time.value = t
      if (driving.value) { driveCamera(t); applyLook(t) }
      pause()
      return
    }
    time.value = t
    if (playing.value) { driveCamera(t); applyLook(t) }
    // A recording that runs past the end stretches the parcours with it.
    else if (parcours && t > parcours.durationSeconds) parcours.durationSeconds = Math.round(t * 10) / 10
    frame = setTimeout(tick, TICK_MS)
  }

  function startClock() {
    wallStart = performance.now()
    timeAtStart = time.value
    if (frame === null) frame = setTimeout(tick, TICK_MS)
  }

  function play() {
    if (!parcours || playing.value) return
    const controller = deps.getController()
    if (!controller || controller.isExporting()) return
    recording.value = false
    if (deps.params.value.palettePath?.enabled) {
      // The timeline owns the appearance while it plays.
      deps.params.value.palettePath = { ...deps.params.value.palettePath, enabled: false }
    }
    if (time.value >= parcours.durationSeconds) time.value = 0
    driving.value = true
    playing.value = true
    cameraKey = ''
    lookKey = ''
    placeCamera(time.value, true)
    applyLook(time.value)
    startClock()
  }

  /** Stop the clock, hand the camera back to the user where it stands. */
  function pause() {
    const wasDriving = driving.value
    playing.value = false
    recording.value = false
    if (frame !== null) { clearTimeout(frame); frame = null }
    const controller = deps.getController(), navigator = controller?.getNavigator()
    if (controller && wasDriving) {
      controller.setExportTime(null)
      // The transition's own frames moved the camera without resetting the
      // reference; snap onto the current point like a travel does on arrival.
      if (navigator) {
        const here = readParams(navigator)
        navigator.cancel_transition()
        if (here) controller.resetReferenceTo(here.cx, here.cy, here.scale, here.angle)
      }
    }
    const engine = deps.getEngine()
    if (engine?.isPresetTransitionActive) {
      // Landed past a look change: adopt it. Stopped inside one: drop the GPU
      // blend so the palette editor shows what the params hold (look a).
      const state = parcours ? lookStateAt(parcours, time.value) : null
      if (state && state.w >= 1) engine.finishPresetTransition()
      else engine.cancelPresetTransition()
      lookKey = ''
    }
    releaseTextures()
    driving.value = false
    cameraClock = null
    cameraKey = ''
  }

  /** Jump to a parcours time: exact camera, exact look, clock stopped. */
  function seek(t: number) {
    if (!parcours) return
    const clamped = Math.max(0, Math.min(parcours.durationSeconds, t))
    const wasPlaying = playing.value
    if (wasPlaying) {
      time.value = clamped
      cameraKey = ''
      placeCamera(clamped, true)
      applyLook(clamped)
      startClock()
      return
    }
    recording.value = false
    if (frame !== null) { clearTimeout(frame); frame = null }
    const controller = deps.getController()
    if (!controller || controller.isExporting()) { time.value = clamped; return }
    time.value = clamped
    driving.value = true
    placeCamera(clamped, false)
    // Scrubbing inside a look transition leaves the GPU blend up as the still
    // image: it is what the frame looks like at this time. pause() settles it.
    applyLook(clamped)
    driving.value = false
  }

  /** Re-evaluate the current time after the parcours was edited. */
  function refresh() {
    if (!parcours || playing.value || recording.value) return
    lookKey = ''
    seek(time.value)
  }

  // ── Recording ──

  function record() {
    if (!parcours || recording.value) return
    const controller = deps.getController()
    if (controller?.isExporting()) return
    if (playing.value) pause()
    recording.value = true
    startClock()
  }

  function stopRecording() {
    if (!recording.value) return
    recording.value = false
    if (frame !== null) { clearTimeout(frame); frame = null }
  }

  /** Pin the live camera and/or look at the current time. */
  function capture(scope: StudioCaptureScope = 'both'): StudioKeyframe | null {
    if (!parcours) return null
    const params = deps.params.value
    const keyframe = addStudioKeyframe(parcours, time.value, {
      camera: scope !== 'look' ? snapshotStudioCamera(params) : undefined,
      look: scope !== 'camera' ? snapshotStudioLook(params) : undefined,
    })
    return keyframe
  }

  function destroy() {
    pause()
    setParcours(null)
  }

  return { time, playing, recording, driving, setParcours, play, pause, seek, refresh, record, stopRecording, capture, destroy }
}

export type StudioPlayer = ReturnType<typeof createStudioPlayer>

// ── Export frame driver ──
//
// The video export places every frame at an ABSOLUTE parcours time and pumps
// the render until it converges, so a frame may be placed once and drawn many
// times. `placeFrame` is therefore idempotent for a given time, awaits every
// texture load it depends on (nothing is left to a watcher that may land a
// frame late), and never touches the wall clock. The navigator is placed
// through its own calls only, as the two-point export does: the engine
// re-anchors its reference through the ordinary update path.

export type StudioFrameDriver = {
  placeFrame(parcoursTime: number): Promise<void>
  /** Release textures and settle the GPU transition. Safe to call twice. */
  finish(): void
}

export function createStudioFrameDriver(deps: StudioPlayerDeps, parcours: StudioParcours): StudioFrameDriver {
  let cameraIndex = -1
  let cameraSegmentActive = false
  let lookKey = ''
  let lookPreparedKey = ''
  let heldTextures: StudioTextures | null = null
  let restoredPalettePath: MandelbrotParams['palettePath'] | undefined
  let palettePathSuspended = false
  let finished = false

  function releaseTextures() {
    heldTextures?.release()
    heldTextures = null
  }

  async function ensureTextures(look: StudioLook, engine: StudioEngine) {
    const textures = await deps.resolveTextures(look)
    try {
      if (!engine.isTileTextureSourceCurrent(textures.tile.key)) await engine.updateTileTexture(textures.tile.url, textures.tile.key)
      if (!engine.isSkyboxTextureSourceCurrent(textures.sky.key)) await engine.updateSkyboxTexture(textures.sky.url, textures.sky.key)
    } finally {
      textures.release()
    }
  }

  async function placeFrame(t: number) {
    if (finished) return
    const controller = deps.getController(), navigator = controller?.getNavigator(), engine = deps.getEngine()
    if (!controller || !navigator) throw new Error('Studio export: navigator unavailable')
    const params = deps.params.value
    if (!palettePathSuspended) {
      palettePathSuspended = true
      if (params.palettePath?.enabled) {
        restoredPalettePath = params.palettePath
        params.palettePath = { ...params.palettePath, enabled: false }
      }
    }

    // Camera: one export transition per segment, re-armed at every hand-over.
    const segment = cameraSegmentAt(parcours, t)
    if (segment) {
      const needsPlacement = segment.index !== cameraIndex || (segment.duration > 0) !== cameraSegmentActive
      if (needsPlacement) {
        navigator.cancel_transition()
        navigator.origin(segment.from.cx, segment.from.cy)
        navigator.scale(segment.from.scale)
        navigator.angle(segment.from.angle)
        if (segment.duration > 0) {
          navigator.start_export_transition(segment.to.cx, segment.to.cy, segment.to.scale, segment.to.angle, segment.duration)
        }
        cameraIndex = segment.index
        cameraSegmentActive = segment.duration > 0
      }
      controller.setExportTime(segment.duration > 0 ? Math.min(segment.localElapsed, segment.duration) : 0, t)
    } else {
      controller.setExportTime(0, t)
    }

    // Look: continuous fields through the preset mixer, stops through the
    // engine's GPU transition, discrete fields at the keyframe.
    const state = lookStateAt(parcours, t)
    if (state && engine) {
      const key = `${state.fromId}>${state.toId}`
      const resting = state.w <= 0 || state.w >= 1 || state.fromId === state.toId
      if (key !== lookKey) {
        lookKey = key
        if (engine.isPresetTransitionActive) engine.cancelPresetTransition()
        lookPreparedKey = ''
        releaseTextures()
      }
      Object.assign(params, blendedLook(state))
      if (resting) {
        const side = state.w >= 1 ? state.b : state.a
        if (engine.isPresetTransitionActive) {
          if (state.w >= 1) engine.finishPresetTransition()
          else engine.cancelPresetTransition()
          lookPreparedKey = ''
          releaseTextures()
        }
        Object.assign(params, discreteLookFields(side))
        await ensureTextures(side, engine)
      } else {
        if (lookPreparedKey !== key) {
          releaseTextures()
          heldTextures = await deps.resolveTextures(state.b)
          const ok = await engine.preparePresetTransition(state.a as MandelbrotParams, state.b as MandelbrotParams, heldTextures.tile, heldTextures.sky)
          if (!ok) throw new Error('Studio export: look transition could not be prepared')
          lookPreparedKey = key
        }
        engine.setPresetTransitionProgress(state.w)
      }
    }
    // Let the params reach the renderer's props before the frame is drawn.
    await nextTick()
  }

  function finish() {
    if (finished) return
    finished = true
    const engine = deps.getEngine()
    if (engine?.isPresetTransitionActive) engine.cancelPresetTransition()
    releaseTextures()
    if (restoredPalettePath) deps.params.value.palettePath = restoredPalettePath
    restoredPalettePath = undefined
  }

  return { placeFrame, finish }
}
