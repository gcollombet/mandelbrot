import { describe, expect, it } from 'vitest'
import { Palette } from '../../src/Palette'
import { compareColorStops, flipLinkSide, linkedStopIndex, type ColorStop } from '../../src/ColorStop'

describe('double colour stops', () => {
    // Listed right side first: the palette order must not depend on array order.
    const stops: ColorStop[] = [
        { position: 0, color: '#000000' },
        { position: 0.5, color: '#00ff00', link: 'x', linkSide: 'out' },
        { position: 0.5, color: '#ff0000', link: 'x', linkSide: 'in' },
        { position: 1, color: '#0000ff' },
    ]
    it('ends the gradient on the left side and restarts on the right side', () => {
        const palette = new Palette(stops, 'rgb')
        expect(palette.getColorAt(0.25)).toBe('#800000')
        expect(palette.getColorAt(0.5)).toBe('#ff0000')
        expect(palette.getColorAt(0.5001).startsWith('#00ff')).toBe(true)
        expect(palette.getColorAt(0.75)).toBe('#008080')
    })
    it('finds the other side, and a lost partner makes a single stop', () => {
        expect(linkedStopIndex(stops, 1)).toBe(2)
        expect(linkedStopIndex(stops, 0)).toBe(-1)
        expect(linkedStopIndex([stops[0], stops[1]], 1)).toBe(-1)
    })
    it('keeps left before right when sorted, and swaps sides when reflected', () => {
        expect([...stops].sort(compareColorStops).map(s => s.color)).toEqual(['#000000', '#ff0000', '#00ff00', '#0000ff'])
        const reflected = stops.map(s => flipLinkSide({ ...s, position: 1 - s.position })).sort(compareColorStops)
        expect(reflected.map(s => s.color)).toEqual(['#0000ff', '#00ff00', '#ff0000', '#000000'])
    })
})
