import { describe, expect, it } from 'vitest'
import {
  addStudioKeyframe, cameraClockAt, keyframeDisplayTime, moveStudioKeyframe, newStudioParcours,
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
