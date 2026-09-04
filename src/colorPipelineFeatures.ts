import {getEffectValue, type ColorStop, type EffectFieldName} from './ColorStop'

const SURFACE_EFFECTS: EffectFieldName[] = [
    'tessellation', 'shading', 'webcam', 'stripeAverage', 'rotationMean',
    'stripeReliefTilt', 'directionCoherenceReliefTilt',
]

/** Check every stop, including those reached by palette-offset animation.
 * Global animation tracks move parameters, not these activation weights.
 * Only exact zero qualifies, so quantization cannot activate a skipped effect.
 */
export function needsSurfaceColorPipeline(stops: ColorStop[]): boolean {
    return stops.length === 0 || stops.some(stop =>
        SURFACE_EFFECTS.some(field => getEffectValue(stop, field) !== 0),
    )
}
