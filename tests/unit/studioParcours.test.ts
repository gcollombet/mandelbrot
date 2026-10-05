import { describe, expect, it } from 'vitest'
import {
  addStudioKeyframe, blendedLook, cameraClockAt, cameraDistance, cameraKnots, cameraSegmentAt, lookStateAt, STUDIO_CUT_SECONDS, keyframeDisplayTime, moveStudioKeyframe, newStudioParcours,
  parcoursTimeOfCameraTime, rampedTime, snapshotStudioLook, validateStudioParcours,
} from '../../src/studioParcours'

const camera = (scale: string) => ({ cx: '-0.75', cy: '0.1', scale, angle: 0 })
const look = snapshotStudioLook({ colorStops: [{ position: 0, color: '#123456' }, { position: 1, color: '#abcdef' }] } as never)

describe('studio parcours: one track per keyframe', () => {
  it('splits a legacy keyframe pinning both tracks', () => {
    const legacy = { ...newStudioParcours('x'), keyframes: [{ id: 'k', time: 2, camera: camera('1e-3'), look, curve: 'linear', hold: 0.2, ease: 'easeIn' }] }
    const p = validateStudioParcours(legacy)
    expect(p.keyframes).toHaveLength(2)
    const [cam, lk] = [p.keyframes.find(k => k.camera)!, p.keyframes.find(k => k.look)!]
    expect(cam).toMatchObject({ id: 'k', time: 2, ease: 'easeIn' })
    expect(cam.look).toBeUndefined()
    expect(lk).toMatchObject({ id: 'k:look', time: 2, curve: 'linear', hold: 0.2 })
    expect(lk.camera).toBeUndefined()
    // Validating twice is stable.
    expect(validateStudioParcours(p).keyframes.map(k => k.id).sort()).toEqual(['k', 'k:look'])
  })

  it('adds one keyframe per track and merges only within a track', () => {
    const p = newStudioParcours('x')
    expect(addStudioKeyframe(p, 3, { camera: camera('1e-2'), look })).toHaveLength(2)
    expect(p.keyframes).toHaveLength(2)
    addStudioKeyframe(p, 3.1, { look })
    expect(p.keyframes).toHaveLength(2)
    addStudioKeyframe(p, 6, { camera: camera('1e-3') }, 5)
    expect(p.keyframes.find(k => k.camera && k.time === 5)).toBeTruthy()
  })

  it('moves a keyframe between the neighbours of its own track only', () => {
    const p = newStudioParcours('x')
    const [cam] = addStudioKeyframe(p, 2, { camera: camera('1e-2') })
    addStudioKeyframe(p, 10, { camera: camera('1e-3') })
    addStudioKeyframe(p, 5, { look })
    // Crosses the look keyframe freely, stops before the next camera keyframe.
    expect(moveStudioKeyframe(p, cam.id, 8)).toBe(8)
    expect(moveStudioKeyframe(p, cam.id, 12)).toBeCloseTo(9.75)
  })

  it('a camera keyframe sits under the playhead where the ramped clock reaches it', () => {
    const p = { ...newStudioParcours('x'), easeInSeconds: 4, easeOutSeconds: 4 }
    for (const t of [0, 1.5, 7, 15, 29, 30]) expect(parcoursTimeOfCameraTime(p, rampedTime(p, t))).toBeCloseTo(t, 3)
    const [cam] = addStudioKeyframe(p, 9, { camera: camera('1e-2') }, rampedTime(p, 9))
    addStudioKeyframe(p, 20, { camera: camera('1e-4') }, rampedTime(p, 20))
    expect(keyframeDisplayTime(p, cam)).toBeCloseTo(9, 3)
    expect(cameraClockAt(p, 9).time).toBeCloseTo(cam.time, 3)
  })
})

describe('studio look: tilted 3D view', () => {
  const stops = [{ position: 0, color: '#123456' }, { position: 1, color: '#abcdef' }]
  it('is saved with the look and defaults to top-down for older looks', () => {
    expect(snapshotStudioLook({ colorStops: stops } as never)).toMatchObject({ tiltViewTilt: 0, tiltViewHeading: 0, tiltViewRelief: 10, tiltViewInteriorDepth: 1 })
    expect(snapshotStudioLook({ colorStops: stops, tiltViewTilt: 30, tiltViewHeading: 350 } as never)).toMatchObject({ tiltViewTilt: 30, tiltViewHeading: 350 })
  })
  it('mixes between two looks, the heading through the shortest arc', () => {
    const a = snapshotStudioLook({ colorStops: stops, tiltViewTilt: 10, tiltViewHeading: 350 } as never)
    const b = snapshotStudioLook({ colorStops: stops, tiltViewTilt: 30, tiltViewHeading: 10, tiltViewRelief: 20 } as never)
    const mid = blendedLook({ a, b, w: 0.5, fromId: 'a', toId: 'b' })
    expect(mid.tiltViewTilt).toBe(20)
    expect(mid.tiltViewHeading).toBeCloseTo(0)
    expect(mid.tiltViewRelief).toBe(15)
  })
})

describe('studio double keyframes', () => {
  const stops = (color: string) => [{ position: 0, color }, { position: 1, color: '#ffffff' }]
  const lookOf = (color: string) => snapshotStudioLook({ colorStops: stops(color) } as never)
  it('camera: glides to the arrival side, then cuts to the departure side', () => {
    const p = { ...newStudioParcours('x'), durationSeconds: 20, easeInSeconds: 0, easeOutSeconds: 0 }
    addStudioKeyframe(p, 0, { camera: camera('1e-1') })
    const [b] = addStudioKeyframe(p, 10, { camera: camera('1e-5') })
    addStudioKeyframe(p, 20, { camera: camera('1e-6') })
    b.cameraIn = camera('1e-2')
    const knots = cameraKnots(p)
    expect(knots.map(k => k.camera.scale)).toEqual(['1e-1', '1e-2', '1e-5', '1e-6'])
    expect(knots[2].time - knots[1].time).toBeCloseTo(STUDIO_CUT_SECONDS)
    expect(knots[2].ease).toBe('hold')
    // Half-way through the first plan the camera heads for the arrival side.
    expect(cameraSegmentAt(p, 5)!.to.scale).toBe('1e-2')
    // On the keyframe the clock has jumped onto the departure side.
    expect(cameraClockAt(p, 10).time).toBeCloseTo(10)
    expect(cameraClockAt(p, 10 - STUDIO_CUT_SECONDS / 2).time).toBeCloseTo(10 - STUDIO_CUT_SECONDS)
    expect(cameraSegmentAt(p, 12)!.from.scale).toBe('1e-5')
    expect(validateStudioParcours(JSON.parse(JSON.stringify(p))).keyframes[1].cameraIn?.scale).toBe('1e-2')
  })
  it('look: blends to the arrival side, rests on it, then the departure side takes over', () => {
    const p = { ...newStudioParcours('x'), durationSeconds: 20 }
    addStudioKeyframe(p, 0, { look: lookOf('#000000') })
    const [b] = addStudioKeyframe(p, 10, { look: lookOf('#00ff00') })
    b.curve = 'linear'
    b.lookIn = lookOf('#ff0000')
    const mid = lookStateAt(p, 5)!
    expect(mid.b.colorStops[0].color).toBe('#ff0000')
    expect(mid.w).toBeGreaterThan(0.45)
    expect(lookStateAt(p, 9.995)).toMatchObject({ w: 1, toId: `${b.id}:in` })
    const after = lookStateAt(p, 10)!
    expect(after.a.colorStops[0].color).toBe('#00ff00')
    expect(after.w).toBe(0)
  })
})

describe('camera distance', () => {
  it('sees a pan at any depth, and nothing when the camera did not move', () => {
    const at = (cx: string, scale: string) => ({ cx, cy: '0.11', scale, angle: 0 })
    expect(cameraDistance(at('-0.7436', '1e-30'), at('-0.7436', '1e-30'))).toBe(0)
    // 2e-31 at scale 1e-30: a fifth of a half-height.
    expect(cameraDistance(at('-0.7436', '1e-30'), at('-0.7435999999999999999999999999998', '1e-30'))).toBeCloseTo(0.2, 6)
    expect(cameraDistance(at('-0.745', '2e-3'), at('-0.743', '2e-3'))).toBeCloseTo(1, 6)
    expect(cameraDistance(at('1e-400', '1e-400'), at('3e-400', '1e-400'))).toBeCloseTo(2, 6)
  })
})
