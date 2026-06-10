import type {ColorStop} from "./ColorStop.ts";
import type {TextureMappingConfig} from "./TextureMapping.ts";
import type {AnimationConfig} from "./AnimationConfig.ts";

export type InterpolationMode = 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix';
export type ApproximationMode = 'perturbation' | 'bla';

export interface MandelbrotParams {
    scale: string;
    cx: string;
    cy: string;
    mu: number;
    epsilon: number;
    angle: number;
    showPresetPins?: boolean;
    maxIterations: number;
    maxIterationMultiplier: number;
    antialiasLevel: number;
    zoomMinBrushStep: number;
    sentinelSeedStep: number;
    palettePeriod: number;
    paletteOffset: number;
    heightPaletteShift: number;
    paletteMirror: boolean;
    dprMultiplier: number;
    targetFps: number;
    gpuLoadMultiplier: number;
    stripeFrequency: number;
    activateAnimate: boolean;
    debugShading: boolean;
    colorStops: ColorStop[];
    interpolationMode: InterpolationMode;
    approximationMode?: ApproximationMode;

    tessellationLevel?: number;
    lightAngle?: number;
    displacementAmount?: number;
    animation?: AnimationConfig;
    animationSpeed?: number;
    ambientOcclusionStrength?: number;
    microBumpStrength?: number;
    subsurfaceStrength?: number;
    reliefDepth?: number;
    localShadowStrength?: number;
    varnishStrength?: number;
    orbitTrapStrength?: number;
    phaseColoringStrength?: number;
    textureName?: string;
    textureGuid?: string;
    skyboxName?: string;
    skyboxGuid?: string;
    textureMapping?: TextureMappingConfig;
    textureMappingMode?: number;
}

export const SESSION_PERFORMANCE_FIELDS = [
    'dprMultiplier',
    'maxIterationMultiplier',
    'antialiasLevel',
    'targetFps',
    'gpuLoadMultiplier',
    'zoomMinBrushStep',
    'sentinelSeedStep',
] as const satisfies readonly (keyof MandelbrotParams)[];

export function normalizePowerOfTwoStep(value: number | undefined, defaultValue: number, minValue: number, maxValue: number): number {
    const raw = typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
    const normalized = 2 ** Math.floor(Math.log2(Math.max(1, Math.floor(raw))));
    return Math.min(Math.max(normalized, minValue), maxValue);
}

export function stripSessionPerformanceFields<T extends object>(value: T): T {
    const record = value as Record<string, unknown>;
    for (const field of SESSION_PERFORMANCE_FIELDS) {
        delete record[field];
    }
    return value;
}

export function preserveSessionPerformanceFields<T extends Partial<MandelbrotParams>>(
    next: T,
    current: Pick<MandelbrotParams, typeof SESSION_PERFORMANCE_FIELDS[number]>,
): T & Pick<MandelbrotParams, typeof SESSION_PERFORMANCE_FIELDS[number]> {
    return {
        ...next,
        dprMultiplier: current.dprMultiplier,
        maxIterationMultiplier: current.maxIterationMultiplier,
        antialiasLevel: current.antialiasLevel,
        targetFps: current.targetFps,
        gpuLoadMultiplier: current.gpuLoadMultiplier,
        zoomMinBrushStep: current.zoomMinBrushStep,
        sentinelSeedStep: current.sentinelSeedStep,
    };
}
