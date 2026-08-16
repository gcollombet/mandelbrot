import {describe, expect, it} from 'vitest'
import {
    describeOutputWarnings,
    describeParcoursWarnings,
    estimatedWorkingBytes,
    formatVideoPathProblems,
    MAX_MAGNIFICATION_THRESHOLD,
    MIN_MAGNIFICATION_THRESHOLD,
    neutralSizeFor,
    validateVideoOutput,
    validateVideoPath,
    type VideoOutputSpec,
    type VideoPathLocation,
} from '../../src/videoPath'

const OUTPUT: VideoOutputSpec = {
    width: 1920, height: 1080, fps: 30, supersample: 2, magnificationThreshold: 2,
}

function location(overrides: Partial<VideoPathLocation> = {}): VideoPathLocation {
    return {cx: '-0.5', cy: '0.6', scale: '1.0', angle: 0, ...overrides}
}

describe('validateVideoPath', () => {
    it('accepts two distinct locations', () => {
        expect(validateVideoPath({
            from: location(),
            to: location({cx: '-0.743643887037151', cy: '0.13182590420533', scale: '1e-9', angle: 0.7}),
            durationSeconds: 30,
        })).toEqual([])
    })

    // A parcours is now two pinned camera positions and nothing else — there is
    // no second parameter set to reconcile, so nothing about appearance can
    // refuse a run.
    it('accepts endpoints regardless of any render settings', () => {
        expect(validateVideoPath({
            from: location(),
            to: location({scale: '1e-9'}),
            durationSeconds: 5,
        })).toEqual([])
    })

    it('accepts a deep scale that no f64 could hold', () => {
        expect(validateVideoPath({
            from: location(),
            to: location({scale: '1e-320'}),
            durationSeconds: 5,
        })).toEqual([])
    })

    it.each([
        ['zero', 0],
        ['negative', -3],
        ['NaN', Number.NaN],
        ['infinite', Number.POSITIVE_INFINITY],
    ])('refuses a %s duration', (_label, durationSeconds) => {
        const problems = validateVideoPath({from: location(), to: location({scale: '0.5'}), durationSeconds})
        expect(problems.some(p => p.kind === 'duration')).toBe(true)
    })

    it.each(['cx', 'cy', 'scale'] as const)('refuses a start missing %s', (field) => {
        const from = location()
        delete (from as Record<string, unknown>)[field]
        const problems = validateVideoPath({from, to: location({scale: '0.5'}), durationSeconds: 5})
        expect(problems.map(p => p.field)).toContain(field)
    })

    it.each(['cx', 'cy', 'scale'] as const)('refuses an end missing %s', (field) => {
        const to = location({scale: '0.5'})
        delete (to as Record<string, unknown>)[field]
        const problems = validateVideoPath({from: location(), to, durationSeconds: 5})
        expect(problems.map(p => p.field)).toContain(field)
    })

    it('refuses a non-numeric coordinate', () => {
        const problems = validateVideoPath({
            from: location({cx: 'not a number'}),
            to: location({scale: '0.5'}),
            durationSeconds: 5,
        })
        expect(problems.map(p => p.field)).toContain('cx')
    })
})

describe('describeParcoursWarnings', () => {
    it('says nothing when the two ends differ', () => {
        expect(describeParcoursWarnings(location(), location({scale: '1e-9'}))).toEqual([])
    })

    // Renderable, so not a refusal — but the result would be N identical frames,
    // which is never what someone meant to export.
    it('warns when both ends sit at the same place', () => {
        const [warning] = describeParcoursWarnings(location(), location())
        expect(warning.kind).toBe('degenerate')
        expect(warning.message).toContain('image fixe')
    })

    it('treats a differing angle alone as a real parcours', () => {
        expect(describeParcoursWarnings(location(), location({angle: 0.5}))).toEqual([])
    })
})

describe('neutralSizeFor', () => {
    // The engine allocates a square of the viewport diagonal so rotation stays
    // covered; that diagonal, not the pixel count, is what meets the limit.
    it('returns the diagonal of the render surface', () => {
        expect(neutralSizeFor(1920, 1080)).toBe(2203)
        expect(neutralSizeFor(3840, 2160)).toBe(4406)
        expect(neutralSizeFor(7680, 4320)).toBe(8812)
    })
})

describe('validateVideoOutput', () => {
    it('accepts 1080p at 2x on an 8192 device', () => {
        expect(validateVideoOutput(OUTPUT, 8192)).toEqual([])
    })

    it('accepts 1440p at 2x', () => {
        expect(validateVideoOutput({...OUTPUT, width: 2560, height: 1440}, 8192)).toEqual([])
    })

    // The wall this validation exists for: resize() clamps the surface but not
    // the derived square, so an oversized request fails allocation outright.
    it('refuses 4K at 2x on an 8192 device, naming the needed size', () => {
        const problems = validateVideoOutput({...OUTPUT, width: 3840, height: 2160}, 8192)
        expect(problems).toHaveLength(1)
        expect(problems[0].message).toContain('8812²')
        expect(problems[0].message).toContain('8192')
    })

    it('accepts 4K once the supersample drops to 1', () => {
        expect(validateVideoOutput(
            {...OUTPUT, width: 3840, height: 2160, supersample: 1, magnificationThreshold: 1.5},
            8192,
        ).filter(p => p.kind === 'output')).toEqual([])
    })

    // Deliberately independent knobs: the threshold governs how often a full
    // reconvergence is paid (the main lever on export speed), the supersample
    // governs sampling density. Coupling them forbade the fast configurations.
    describe('threshold is independent of supersample', () => {
        it.each([2, 4, 8, 16, 32])('accepts threshold %s at supersample 1', (magnificationThreshold) => {
            expect(validateVideoOutput(
                {...OUTPUT, supersample: 1, magnificationThreshold}, 8192,
            )).toEqual([])
        })

        it.each([
            ['below the minimum', MIN_MAGNIFICATION_THRESHOLD - 1],
            ['above the maximum', MAX_MAGNIFICATION_THRESHOLD + 1],
            ['not finite', Number.NaN],
        ])('refuses a threshold %s', (_label, magnificationThreshold) => {
            const problems = validateVideoOutput({...OUTPUT, magnificationThreshold}, 8192)
            expect(problems.some(p => p.kind === 'threshold')).toBe(true)
        })
    })

    describe('describeOutputWarnings', () => {
        it('says nothing while the threshold stays within the supersample', () => {
            expect(describeOutputWarnings({...OUTPUT, supersample: 2, magnificationThreshold: 2}))
                .toEqual([])
        })

        // Not a refusal: a soft periphery bought at a large speed gain is the
        // user's call, so it must be stated rather than forbidden.
        it('warns — without blocking — when the threshold exceeds the supersample', () => {
            const spec = {...OUTPUT, supersample: 2, magnificationThreshold: 16}
            const [warning] = describeOutputWarnings(spec)
            expect(warning.kind).toBe('softness')
            expect(warning.message).toContain('périphérie')
            expect(validateVideoOutput(spec, 8192)).toEqual([])
        })
    })

    it.each([1, 2, 3, 4, 6, 8])('accepts supersample x%s when it fits the device', (supersample) => {
        // 720p keeps every offered factor inside a 16384 limit.
        expect(validateVideoOutput(
            {...OUTPUT, width: 1280, height: 720, supersample, magnificationThreshold: 2},
            16384,
        )).toEqual([])
    })

    it('refuses a supersample outside the offered set', () => {
        expect(validateVideoOutput({...OUTPUT, supersample: 5}, 16384)
            .some(p => p.field === 'supersample')).toBe(true)
    })

    // The working texture is a square of the surface diagonal, so cost grows
    // quadratically: x8 is 64x the texels of x1, which is what makes the
    // estimate worth showing before someone starts a two-hour render.
    it('grows the working set quadratically with the supersample', () => {
        const at = (supersample: number) => estimatedWorkingBytes({...OUTPUT, supersample})
        expect(at(2) / at(1)).toBeCloseTo(4, 1)
        expect(at(8) / at(1)).toBeCloseTo(64, 0)
    })

    it('refuses 1080p at x8 on a 16384 device, naming the size', () => {
        const problems = validateVideoOutput({...OUTPUT, supersample: 8}, 16384)
        expect(problems).toHaveLength(1)
        expect(problems[0].message).toContain('16384')
    })

    it.each([
        ['fractional supersample', {supersample: 1.5}],
        ['zero fps', {fps: 0}],
        ['non-integer width', {width: 1920.5}],
        ['negative height', {height: -1}],
    ])('refuses %s', (_label, override) => {
        expect(validateVideoOutput({...OUTPUT, ...override}, 8192).length).toBeGreaterThan(0)
    })
})
