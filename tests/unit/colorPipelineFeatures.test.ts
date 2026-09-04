import {describe, expect, it} from 'vitest'
import {needsSurfaceColorPipeline} from '../../src/colorPipelineFeatures'
import type {ColorStop} from '../../src/ColorStop'

const base: ColorStop = {color: '#ffcc00', position: 0}

describe('color pipeline family selection', () => {
    it('keeps palette weights, zebra, smoothness and dormant materials on the simple family', () => {
        expect(needsSurfaceColorPipeline([
            {...base, palette: 0.4, zebra: 1, smoothness: 0, metallic: 1, skybox: 1},
            {...base, position: 1, iridescencePower: 1, protrusion: 1},
        ])).toBe(false)
    })

    it.each(['shading', 'tessellation', 'webcam', 'stripeAverage', 'rotationMean',
        'stripeReliefTilt', 'directionCoherenceReliefTilt', 'stripeRelief', 'directionCoherenceRelief'])(
        'uses the full family when a later stop enables %s, including legacy relief', field => {
            expect(needsSurfaceColorPipeline([base, {...base, position: 1, [field]: 0.5}])).toBe(true)
        },
    )

    it('does not approximate tiny nonzero activation weights or unknown input', () => {
        expect(needsSurfaceColorPipeline([{...base, shading: 0.00001}])).toBe(true)
        expect(needsSurfaceColorPipeline([{...base, shading: NaN}])).toBe(true)
        expect(needsSurfaceColorPipeline([])).toBe(true)
    })
})
