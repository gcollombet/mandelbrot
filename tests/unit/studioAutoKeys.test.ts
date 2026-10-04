import { describe, expect, it } from 'vitest'
import { detectAutoKeyTimes, pickPeaks } from '../../src/studioAutoKeys'
import type { AudioAnalysis } from '../../src/audioAnalysis'

const rate = 100
/** A flat envelope with one bump per requested [second, height]. */
function envelope(seconds: number, hits: [number, number][]): Float32Array {
    const values = new Float32Array(seconds * rate).fill(0.05)
    for (const [at, height] of hits) for (let d = -3; d <= 3; d++) values[Math.round(at * rate) + d] = height * (1 - Math.abs(d) / 4)
    return values
}
const analysisOf = (kick: Float32Array): AudioAnalysis => ({
    version: 1, sampleRate: 44100, rate, durationSeconds: kick.length / rate, frames: kick.length,
    features: { rms: kick, kick, snare: kick, hats: kick, centroid: kick, onset: kick },
    bpm: 120, beats: [0.5, 1, 1.5, 2, 2.5, 3, 3.5], sections: [2],
})

describe('automatic keyframe instants', () => {
    it('finds the hits, and sensitivity lets the weak ones in', () => {
        const kick = envelope(6, [[1, 1], [2, 0.3], [3, 0.9], [4.1, 0.25]])
        expect(pickPeaks(kick, rate, 0.2, 0.25)).toEqual([1, 3])
        expect(pickPeaks(kick, rate, 0.9, 0.25)).toEqual([1, 2, 3, 4.1])
    })
    it('keeps the strongest of two hits closer than the minimum gap', () => {
        const kick = envelope(4, [[1, 0.7], [1.15, 1], [3, 0.9]])
        expect(pickPeaks(kick, rate, 0.9, 0.5)).toEqual([1.15, 3])
    })
    it('reads beats and sections, inside a range', () => {
        const analysis = analysisOf(envelope(4, [[1, 1]]))
        const base = { sensitivity: 0.5, minGapSeconds: 0.25, beatDivision: 2 }
        expect(detectAutoKeyTimes(analysis, { ...base, detector: 'beats' })).toEqual([0.5, 1.5, 2.5, 3.5])
        expect(detectAutoKeyTimes(analysis, { ...base, detector: 'beats', beatDivision: 1, from: 1, to: 2 })).toEqual([1, 1.5, 2])
        expect(detectAutoKeyTimes(analysis, { ...base, detector: 'sections' })).toEqual([0, 2])
        expect(detectAutoKeyTimes(analysis, { ...base, detector: 'kick' })).toEqual([1])
    })
})
