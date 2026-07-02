import type {ColorStop} from "./ColorStop.ts";
import type {TextureMappingConfig} from "./TextureMapping.ts";
import type {AnimationConfig} from "./AnimationConfig.ts";

export type InterpolationMode = 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix';
export type ApproximationMode = 'perturbation' | 'bla' | 'pade' | 'jet';

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
    aaAuto?: boolean;
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
    // Block-skipping diagnostic overlay: 0 off, 1 cost, 2 skip, 3 mix, 4 probes.
    debugView?: number;
    colorStops: ColorStop[];
    interpolationMode: InterpolationMode;
    approximationMode?: ApproximationMode;
    blaEpsilon?: number;
    maxBlaSkip?: number;
    // Navigation precision budget as a target scale (e.g. "1e-30"). Max zoom depth the
    // reference stays precise at; persisted per preset. See fix-reference-precision-budget.
    precisionBudget?: string;

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
    'aaAuto',
    'targetFps',
    'gpuLoadMultiplier',
    'zoomMinBrushStep',
    'sentinelSeedStep',
] as const satisfies readonly (keyof MandelbrotParams)[];

export const EXPLORATION_STATE_FIELDS = [
    'showPresetPins',
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

export function stripExplorationStateFields<T extends object>(value: T): T {
    const record = value as Record<string, unknown>;
    for (const field of EXPLORATION_STATE_FIELDS) {
        delete record[field];
    }
    return value;
}

/**
 * Sub-pixel AA jitter offset for a given sample index.
 *
 * Uses the R2 low-discrepancy sequence (plastic constant) for even sample
 * placement, warped through a tent filter so offsets are importance-sampled
 * for a tent reconstruction kernel. Output components are in roughly [-1, 1]
 * (texel units). Sample 0 returns {0, 0} (the unjittered base sample).
 */
export function computeAaJitterOffset(sampleIndex: number): { x: number; y: number } {
    if (sampleIndex <= 0) {
        return { x: 0, y: 0 };
    }
    // Plastic constant: real root of x³ = x + 1.
    const phi = 1.22074408460575947536;
    const phi1 = 1 / phi;
    const phi2 = 1 / (phi * phi);
    const r2x = (sampleIndex * phi1) % 1;
    const r2y = (sampleIndex * phi2) % 1;
    // Tent-filter warp: maps uniform [0,1] → triangular [-1,1] via inverse CDF.
    const tent = (u: number): number => {
        const x2 = 2 * u - 1;
        if (x2 === 0) return 0;
        return x2 / Math.sqrt(Math.abs(x2)) - Math.sign(x2);
    };
    return { x: tent(r2x), y: tent(r2y) };
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
        aaAuto: current.aaAuto,
        targetFps: current.targetFps,
        gpuLoadMultiplier: current.gpuLoadMultiplier,
        zoomMinBrushStep: current.zoomMinBrushStep,
        sentinelSeedStep: current.sentinelSeedStep,
    };
}
