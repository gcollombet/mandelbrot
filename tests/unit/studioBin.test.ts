import { describe, expect, it } from 'vitest'
import { distributeBinItems, loadStudioBin, saveStudioBin, validateStudioBin } from '../../src/studioBin'

const camera = { cx: '-0.75', cy: '0.1', scale: '1e-3', angle: 0 }

describe('studio bin', () => {
    it('keeps valid items and drops malformed ones', () => {
        const bin = validateStudioBin({ collections: [{ id: 'c', name: ' Chorus ', items: [
            { id: 'a', kind: 'place', name: 'A', camera },
            { id: 'a', kind: 'place', name: 'duplicate', camera },
            { id: 'b', kind: 'place', name: 'no camera' },
            { id: 'd', kind: 'look', name: 'broken', look: { colorStops: 'x' } },
        ] }, { name: 'no id', items: [] }] })
        expect(bin.collections).toHaveLength(1)
        expect(bin.collections[0].name).toBe('Chorus')
        expect(bin.collections[0].items.map(i => i.id)).toEqual(['a'])
    })
    it('round-trips through storage', () => {
        const store = new Map<string, string>()
        const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) } }
        saveStudioBin({ version: 1, collections: [{ id: 'c', name: 'x', items: [{ id: 'a', kind: 'place', name: 'A', camera }] }] }, storage)
        expect(loadStudioBin(storage).collections[0].items[0].camera).toEqual(camera)
    })
    it('distributes in sequence, or shuffled without immediate repeats', () => {
        expect(distributeBinItems(['a', 'b'], 5, 'sequence')).toEqual(['a', 'b', 'a', 'b', 'a'])
        let seed = 7
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
        const out = distributeBinItems(['a', 'b', 'c'], 60, 'shuffle', random)
        expect(out).toHaveLength(60)
        expect(out.every((v, i) => i === 0 || v !== out[i - 1])).toBe(true)
        expect(new Set(out.slice(0, 3)).size).toBe(3)
        expect(distributeBinItems([], 4, 'shuffle')).toEqual([])
    })
})
