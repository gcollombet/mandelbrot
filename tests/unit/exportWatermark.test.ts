import { describe, expect, it } from 'vitest'
import { applyWatermark, watermarkWaves } from '../../src/exportWatermark'

describe('export watermark', () => {
    const width = 320, height = 180, stride = width * 4
    const flat = () => new Uint8Array(height * stride).fill(128)
    /** Green alternates every other pixel pair: busy everywhere. */
    const busy = () => { const p = flat(); for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) p[y * stride + x * 4 + 1] = (x >> 1) % 2 ? 160 : 96; return p }
    const blueAmplitude = (pixels: Uint8Array) => {
        let c1 = 0, c2 = 0
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const d = pixels[y * stride + x * 4 + 2] - 128, [w1, w2] = watermarkWaves(x, y, width, height)
            c1 += d * w1; c2 += d * w2
        }
        return [2 * c1 / (width * height), 2 * c2 / (width * height)]
    }
    it('leaves the frame alone when disabled', () => {
        const pixels = busy(), before = pixels.slice()
        applyWatermark(pixels, width, height, stride, { enabled: false, amplitude: 4, flatShare: 0.15 })
        expect(pixels).toEqual(before)
    })
    it('only moves blue, at the requested amplitude where the image is busy', () => {
        const pixels = busy(), before = pixels.slice()
        applyWatermark(pixels, width, height, stride, { enabled: true, amplitude: 2, flatShare: 0.15 })
        for (let i = 0; i < pixels.length; i += 4) {
            expect(pixels[i]).toBe(before[i]); expect(pixels[i + 1]).toBe(before[i + 1]); expect(pixels[i + 3]).toBe(before[i + 3])
        }
        const [a1, a2] = blueAmplitude(pixels)
        expect(a1).toBeGreaterThan(1.8); expect(a1).toBeLessThan(2.2)
        expect(a2).toBeGreaterThan(1.8); expect(a2).toBeLessThan(2.2)
    })
    it('keeps only a fraction of it on flat areas', () => {
        const pixels = flat()
        applyWatermark(pixels, width, height, stride, { enabled: true, amplitude: 2, flatShare: 0.15 })
        const [a1, a2] = blueAmplitude(pixels)
        expect(a1).toBeCloseTo(0.3, 1)
        expect(a2).toBeCloseTo(0.3, 1)
    })
    it('writes the blue byte of a BGRA frame', () => {
        const pixels = busy(), before = pixels.slice()
        applyWatermark(pixels, width, height, stride, { enabled: true, amplitude: 2, flatShare: 0.15 }, 0)
        let changed = 0
        for (let i = 0; i < pixels.length; i += 4) { expect(pixels[i + 2]).toBe(before[i + 2]); if (pixels[i] !== before[i]) changed++ }
        expect(changed).toBeGreaterThan(1000)
    })
})
