import { describe, expect, it } from 'vitest'
import { TRANSITION_DEFAULTS } from '../../src/presetTransition'
import { STUDIO_VIEW3D_DEFAULTS } from '../../src/studioParcours'
import { formatQuick, loadQuickPins, QUICK_DEFAULT_PINS, QUICK_PARAMS, quickFromSlider, quickToSlider, saveQuickPins, scaleTimes, wrapDegrees } from '../../src/studioQuickParams'

describe('studio quick controls', () => {
    it('only lists fields a look keyframe stores, with a default inside the range', () => {
        const stored = new Set([...Object.keys(TRANSITION_DEFAULTS), ...Object.keys(STUDIO_VIEW3D_DEFAULTS)])
        for (const p of QUICK_PARAMS) {
            expect(stored.has(p.field), p.field).toBe(true)
            expect(p.default >= p.min && p.default <= p.max, p.field).toBe(true)
        }
        expect(new Set(QUICK_PARAMS.map(p => p.field)).size).toBe(QUICK_PARAMS.length)
        expect(QUICK_DEFAULT_PINS.every(f => QUICK_PARAMS.some(p => p.field === f))).toBe(true)
    })
    it('remembers the pinned fields, in catalogue order, dropping unknown ones', () => {
        const store = new Map<string, string>()
        const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) } }
        expect(loadQuickPins(storage)).toEqual(QUICK_DEFAULT_PINS)
        saveQuickPins(['gradeContrast', 'gone', 'paletteOffset'], storage)
        expect(loadQuickPins(storage)).toEqual(['paletteOffset', 'gradeContrast'])
    })
    it('runs the palette period on a log slider and formats values', () => {
        const period = QUICK_PARAMS.find(p => p.field === 'palettePeriod')!
        expect(quickToSlider(period, 1000)).toBeCloseTo(3)
        expect(quickFromSlider(period, 2)).toBe(100)
        expect(formatQuick(period, 25000)).toBe('25K')
        expect(formatQuick(QUICK_PARAMS.find(p => p.field === 'lightAngle')!, Math.PI)).toBe('180°')
    })
    it('scales a deep view and wraps angles', () => {
        expect(Number(scaleTimes('2e-3', 0.5))).toBeCloseTo(1e-3, 15)
        expect(scaleTimes('1e-400', 0.1)).toBe('1e-401')
        expect(wrapDegrees(Math.PI * 1.5)).toBeCloseTo(-90)
        expect(wrapDegrees(Math.PI)).toBe(180)
    })
})
