import { nextTick, ref, shallowRef } from 'vue'
import type { MandelbrotParams } from './Mandelbrot'
import type { ModulatorBank } from './studioAudio'
import {
  addStudioKeyframe, blendedLook, cameraClockAt, copyPlain, cameraPathSpec, discreteLookFields, lookStateAt, rampedTime,
  snapshotStudioCamera, snapshotStudioLook,
  type StudioCamera, type StudioKeyframe, type StudioLook, type StudioParcours,
} from './studioParcours'

// ── Studio player: turns the parcours evaluator into engine and navigator calls ──
//
// Camera: the camera keyframes are handed to the navigator as ONE path
// (camera_path.rs: per-leg exponential scale and centre linear in scale, as
// the two-point export, with each interior corner rounded over a window in
// DBig), placed at an absolute camera time through the controller's export
// clock. Preview and export evaluate the same path at the same time.
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
  /** Arm a multi-keyframe path (`cx|cy|scale|angle|time;…`), corners rounded over `cornerSeconds`. */
  start_export_path(spec: string, cornerSeconds: number): boolean
  has_export_path(): boolean
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

export type StudioTextureRef = { url: string; key: string }
/** A null slot means the library has no such texture: keep the engine's. */
export type StudioTextures = { tile: StudioTextureRef | null; sky: StudioTextureRef | null; release(): void }

export type StudioPlayerDeps = {
  getEngine(): StudioEngine | null
  getController(): StudioController | null
  /** The viewer's live params. Mutated in place, like a preset travel does. */
  params: { readonly value: MandelbrotParams }
  /** Resolve the tile and skybox textures a look refers to. */
  resolveTextures(look: StudioLook): Promise<StudioTextures>
  /** The clock stopped and the params hold the parcours' state at `time`
   *  (after a seek, a refresh or a pause). */
  onSettled?(): void
}

export type StudioCaptureScope = 'both' | 'camera' | 'look'

/** Decoded music bound to the parcours: the buffer plays in the preview, the
 *  bank drives the modulators (precomputed envelopes, deterministic). */
export type StudioAudioSource = { buffer: AudioBuffer; bank: ModulatorBank }

export function createStudioPlayer(deps: StudioPlayerDeps) {
  const time = ref(0)
  const playing = ref(false)
  const recording = ref(false)
  /** Set while the player owns the camera (play, seek, scrub). */
  const driving = ref(false)
  /** Camera the player last placed (the parcours' camera at the playhead),
   *  null without camera keyframes. Navigation is measured against it. */
  const placedCamera = shallowRef<StudioCamera | null>(null)
  let parcours: StudioParcours | null = null
  let frame: ReturnType<typeof setTimeout> | null = null
  let wallStart = 0, timeAtStart = 0
  // Whether the navigator currently holds the parcours' camera path.
  let cameraKey = ''
  // Segment the camera is held on (ease `hold`), -1 otherwise: leaving it is a cut.
  let heldSegment = -1
  // Look segment the GPU transition is prepared for.
  let lookKey = ''
  let lookPrepared = false
  let lookGpuBlend = true
  let lookGeneration = 0
  let heldTextures: StudioTextures | null = null
  // Music: a Web Audio source started at the parcours time on every play.
  let audio: StudioAudioSource | null = null
  let audioContext: AudioContext | null = null
  let audioNode: AudioBufferSourceNode | null = null

  function setParcours(next: StudioParcours | null) {
    parcours = next
    cameraKey = ''
    lookKey = ''
  }

  function setAudio(next: StudioAudioSource | null) {
    stopAudio()
    audio = next
    if (playing.value || recording.value) startAudio(time.value)
  }

  function startAudio(at: number) {
    stopAudio()
    if (!audio) return
    try {
      audioContext ??= new AudioContext()
      if (audioContext.state === 'suspended') void audioContext.resume()
      const node = audioContext.createBufferSource()
      node.buffer = audio.buffer
      node.connect(audioContext.destination)
      if (at < audio.buffer.duration) node.start(0, Math.max(0, at))
      audioNode = node
    } catch (error) {
      console.warn('Studio: audio playback unavailable', error)
    }
  }

  function stopAudio() {
    if (!audioNode) return
    try { audioNode.stop() } catch { /* already stopped */ }
    audioNode.disconnect()
    audioNode = null
  }

  /** Music-driven offsets on top of the keyframe values for this time. */
  function applyModulators(t: number) {
    if (!audio || !parcours?.modulators.length) return
    audio.bank.apply(deps.params.value, parcours.modulators, t)
  }

  function readParams(navigator: StudioNavigator): { cx: string; cy: string; scale: string; angle: number } | null {
    const raw = navigator.get_params() as unknown
    if (!Array.isArray(raw) || raw.length < 4) return null
    return { cx: String(raw[0]), cy: String(raw[1]), scale: String(raw[2]), angle: parseFloat(String(raw[3])) }
  }

  // ── Camera ──

  /** Snap the navigator onto the exact camera of parcours time `t` and, when
   *  playing, leave the path armed so the export clock drives it. */
  function placeCamera(t: number, continuePath: boolean) {
    if (!parcours) return
    const controller = deps.getController(), navigator = controller?.getNavigator()
    if (!controller || !navigator) return
    const path = cameraPathSpec(parcours)
    if (!path) { placedCamera.value = null; return }
    const clock = cameraClockAt(parcours, t)
    const cameraTime = clock.time
    heldSegment = clock.hold ? clock.index : -1
    // The navigator's own deep-safe path evaluation gives the point; read it
    // back as decimal strings and teleport there with a fresh reference orbit
    // (cold-start state). The teleport cancels the path.
    if (!navigator.start_export_path(path.spec, parcours.cornerSeconds)) return
    navigator.step_at_transition_time(undefined, undefined, cameraTime)
    const here = readParams(navigator)
    if (here) controller.resetReferenceTo(here.cx, here.cy, here.scale, here.angle)
    placedCamera.value = here
    if (continuePath) {
      navigator.start_export_path(path.spec, parcours.cornerSeconds)
      cameraKey = path.spec
      controller.setExportTime(cameraTime, t)
    } else {
      cameraKey = ''
      controller.setExportTime(null, t)
    }
  }

  function driveCamera(t: number) {
    if (!parcours) return
    const controller = deps.getController(), navigator = controller?.getNavigator()
    if (!controller || !navigator) return
    if (!cameraKey || !navigator.has_export_path()) { placeCamera(t, true); return }
    const clock = cameraClockAt(parcours, t)
    // The end of a held segment is a cut: teleport with a fresh reference
    // instead of letting the path jump under the running one.
    if (heldSegment >= 0 && clock.index !== heldSegment) { placeCamera(t, true); return }
    heldSegment = clock.hold ? clock.index : -1
    controller.setExportTime(clock.time, t)
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
      lookGpuBlend = true
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
    // params keep a's discrete fields, as a preset travel does. Without both
    // textures in the library there is no GPU blend: the stops cut half-way.
    if (!lookPrepared && engine) {
      lookPrepared = true
      const generation = lookGeneration
      void (async () => {
        try {
          const textures = await deps.resolveTextures(state.b)
          if (generation !== lookGeneration) { textures.release(); return }
          if (!textures.tile || !textures.sky) { textures.release(); lookGpuBlend = false; return }
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
    else if (!lookGpuBlend) Object.assign(params, discreteLookFields(state.w >= 0.5 ? state.b : state.a))
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
      if (driving.value) { driveCamera(t); applyLook(t); applyModulators(t) }
      pause()
      return
    }
    time.value = t
    if (playing.value) { driveCamera(t); applyLook(t); applyModulators(t) }
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
      // A plain copy: spreading the reactive object keeps nested proxies the
      // engine's structuredClone rejects.
      deps.params.value.palettePath = { ...copyPlain(deps.params.value.palettePath), enabled: false }
    }
    if (time.value >= parcours.durationSeconds) time.value = 0
    driving.value = true
    playing.value = true
    cameraKey = ''
    lookKey = ''
    placeCamera(time.value, true)
    applyLook(time.value)
    startAudio(time.value)
    startClock()
  }

  /** Stop the clock, hand the camera back to the user where it stands. */
  function pause() {
    const wasDriving = driving.value
    playing.value = false
    recording.value = false
    stopAudio()
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
    cameraKey = ''
    deps.onSettled?.()
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
      startAudio(clamped)
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
    deps.onSettled?.()
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
    startAudio(time.value)
    startClock()
  }

  function stopRecording() {
    if (!recording.value) return
    recording.value = false
    stopAudio()
    if (frame !== null) { clearTimeout(frame); frame = null }
  }

  /** Pin the live camera and/or look at the current time: one keyframe per
   *  track. The camera one is placed on the camera clock, so the camera passes
   *  through this view exactly when the playhead is here. */
  function capture(scope: StudioCaptureScope = 'both'): StudioKeyframe[] {
    if (!parcours) return []
    const params = deps.params.value
    const created = addStudioKeyframe(parcours, time.value, {
      camera: scope !== 'look' ? snapshotStudioCamera(params) : undefined,
      look: scope !== 'camera' ? snapshotStudioLook(params) : undefined,
    }, rampedTime(parcours, time.value))
    if (scope !== 'look') placedCamera.value = snapshotStudioCamera(params)
    return created
  }

  function destroy() {
    pause()
    setParcours(null)
    audio = null
    void audioContext?.close().catch(() => undefined)
    audioContext = null
  }

  return { time, playing, recording, driving, placedCamera, setParcours, setAudio, play, pause, seek, refresh, record, stopRecording, capture, destroy }
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

export function createStudioFrameDriver(deps: StudioPlayerDeps, parcours: StudioParcours, audio?: { bank: ModulatorBank } | null): StudioFrameDriver {
  let pathArmed = false
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
      if (textures.tile && !engine.isTileTextureSourceCurrent(textures.tile.key)) await engine.updateTileTexture(textures.tile.url, textures.tile.key)
      if (textures.sky && !engine.isSkyboxTextureSourceCurrent(textures.sky.key)) await engine.updateSkyboxTexture(textures.sky.url, textures.sky.key)
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
        params.palettePath = { ...copyPlain(params.palettePath), enabled: false }
      }
    }

    // Camera: the whole parcours is one navigator path, armed once; every
    // frame is then an absolute camera time (ramps applied).
    const path = cameraPathSpec(parcours)
    if (path) {
      if (!pathArmed || !navigator.has_export_path()) {
        if (!navigator.start_export_path(path.spec, parcours.cornerSeconds)) throw new Error('Studio export: camera path rejected by the navigator')
        pathArmed = true
      }
      controller.setExportTime(cameraClockAt(parcours, t).time, t)
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
          const textures = await deps.resolveTextures(state.b)
          if (textures.tile && textures.sky) {
            heldTextures = textures
            const ok = await engine.preparePresetTransition(state.a as MandelbrotParams, state.b as MandelbrotParams, textures.tile, textures.sky)
            if (!ok) throw new Error('Studio export: look transition could not be prepared')
          } else {
            // No GPU blend without both textures: the stops cut half-way.
            textures.release()
          }
          lookPreparedKey = key
        }
        if (engine.isPresetTransitionActive) engine.setPresetTransitionProgress(state.w)
        else Object.assign(params, discreteLookFields(state.w >= 0.5 ? state.b : state.a))
      }
    }
    // Music: deterministic offsets from the precomputed envelopes.
    if (audio && parcours.modulators.length) audio.bank.apply(params, parcours.modulators, t)
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
