import {describe, expect, it, vi} from 'vitest'
import {
    DEFAULT_VIDEO_EXPORT_PREFERENCES,
    VIDEO_EXPORT_PREFERENCES_KEY,
    loadVideoExportPreferences,
    normalizeVideoExportPreferences,
    saveVideoExportPreferences,
} from '../../src/videoExportPreferences'

const LOCATION = {cx: '-0.743643887037151', cy: '0.13182590420533', scale: '1e-9', angle: 0.7}

function fakeStorage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial))
    return {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => { map.set(k, v) },
        raw: map,
    }
}

describe('normalizeVideoExportPreferences', () => {
    it('keeps a well-formed payload', () => {
        const value = {...DEFAULT_VIDEO_EXPORT_PREFERENCES, pinnedStart: LOCATION, durationSeconds: 42}
        expect(normalizeVideoExportPreferences(value)).toEqual(value)
    })

    it.each([null, undefined, 42, 'nope', []])('falls back on %s', (value) => {
        expect(normalizeVideoExportPreferences(value)).toEqual(DEFAULT_VIDEO_EXPORT_PREFERENCES)
    })

    it.each([
        ['an unknown codec', 'divx'],
        ['a numeric codec', 3],
        ['a codec MP4 does not carry', 'vp8'],
    ])('falls back to the default codec on %s', (_label, codec) => {
        expect(normalizeVideoExportPreferences({codec}).codec)
            .toBe(DEFAULT_VIDEO_EXPORT_PREFERENCES.codec)
    })

    it.each(['av1', 'avc', 'hevc', 'vp9'] as const)('keeps the %s codec', (codec) => {
        expect(normalizeVideoExportPreferences({codec}).codec).toBe(codec)
    })

    it('defaults to AV1', () => {
        expect(DEFAULT_VIDEO_EXPORT_PREFERENCES.codec).toBe('av1')
    })

    // A deep view sits far below what f64 can represent, so a location whose
    // coordinates round-tripped through a number would silently point somewhere
    // else. Reject rather than coerce.
    it.each([
        ['numeric cx', {...LOCATION, cx: -0.743643887037151}],
        ['numeric scale', {...LOCATION, scale: 1e-9}],
        ['empty cy', {...LOCATION, cy: '  '}],
        ['missing scale', {cx: '0', cy: '0', angle: 0}],
        ['not an object', 'here'],
    ])('drops a location with %s rather than coercing it', (_label, pinnedStart) => {
        expect(normalizeVideoExportPreferences({pinnedStart}).pinnedStart).toBeNull()
    })

    it('preserves a deep scale string exactly', () => {
        const deep = {...LOCATION, scale: '1e-320'}
        expect(normalizeVideoExportPreferences({pinnedEnd: deep}).pinnedEnd?.scale).toBe('1e-320')
    })

    it('defaults a non-finite angle to zero rather than dropping the point', () => {
        const result = normalizeVideoExportPreferences({pinnedStart: {...LOCATION, angle: Number.NaN}})
        expect(result.pinnedStart).toEqual({...LOCATION, angle: 0})
    })

    it('repairs field by field instead of discarding the whole payload', () => {
        const result = normalizeVideoExportPreferences({
            pinnedStart: LOCATION,
            durationSeconds: 'twenty',
            fps: 60,
        })
        expect(result.pinnedStart).toEqual(LOCATION)
        expect(result.durationSeconds).toBe(DEFAULT_VIDEO_EXPORT_PREFERENCES.durationSeconds)
        expect(result.fps).toBe(DEFAULT_VIDEO_EXPORT_PREFERENCES.fps)
    })
})

describe('load / save round trip', () => {
    it('restores what was saved', () => {
        const storage = fakeStorage()
        const value = {...DEFAULT_VIDEO_EXPORT_PREFERENCES, pinnedStart: LOCATION, pinnedEnd: LOCATION}
        saveVideoExportPreferences(value, storage)
        expect(loadVideoExportPreferences(storage)).toEqual(value)
    })

    it('writes under a dedicated key, leaving the view settings alone', () => {
        const storage = fakeStorage({mandelbrot_last_settings: '{"cx":"0"}'})
        saveVideoExportPreferences(DEFAULT_VIDEO_EXPORT_PREFERENCES, storage)
        expect(storage.raw.get('mandelbrot_last_settings')).toBe('{"cx":"0"}')
        expect(storage.raw.has(VIDEO_EXPORT_PREFERENCES_KEY)).toBe(true)
    })

    it('returns defaults on an empty store', () => {
        expect(loadVideoExportPreferences(fakeStorage())).toEqual(DEFAULT_VIDEO_EXPORT_PREFERENCES)
    })

    // Corrupt or unavailable storage must never keep the panel from opening.
    it('survives malformed JSON', () => {
        const storage = fakeStorage({[VIDEO_EXPORT_PREFERENCES_KEY]: '{not json'})
        expect(loadVideoExportPreferences(storage)).toEqual(DEFAULT_VIDEO_EXPORT_PREFERENCES)
    })

    it('survives a throwing storage on both read and write', () => {
        const throwing = {
            getItem: () => { throw new Error('denied') },
            setItem: () => { throw new Error('quota') },
        }
        expect(loadVideoExportPreferences(throwing)).toEqual(DEFAULT_VIDEO_EXPORT_PREFERENCES)
        expect(() => saveVideoExportPreferences(DEFAULT_VIDEO_EXPORT_PREFERENCES, throwing)).not.toThrow()
    })

    it('tolerates storage being absent entirely', () => {
        expect(loadVideoExportPreferences(undefined)).toEqual(DEFAULT_VIDEO_EXPORT_PREFERENCES)
        expect(() => saveVideoExportPreferences(DEFAULT_VIDEO_EXPORT_PREFERENCES, undefined)).not.toThrow()
        vi.restoreAllMocks()
    })
})
