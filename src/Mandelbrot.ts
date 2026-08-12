import type {ColorStop} from "./ColorStop.ts";
import type {TextureMappingConfig} from "./TextureMapping.ts";
import type {AnimationConfig} from "./AnimationConfig.ts";

export type InterpolationMode = 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix';
export type ApproximationMode = 'perturbation' | 'bla' | 'pade' | 'jet' | 'mobius' | 'auto';

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
    aaAdaptive?: boolean;
    palettePeriod: number;
    paletteOffset: number;
    heightPaletteShift: number;
    paletteMirror: boolean;
    dprMultiplier: number;
    targetFps: number;
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
    reliefDepth?: number;
    protrusionPhase?: number;
    protrusionSharpness?: number;
    protrusionGeometryMix?: number;
    protrusionPeriod?: number;
    localShadowStrength?: number;
    varnishStrength?: number;
    gradeContrast?: number;
    gradeSaturation?: number;
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
    'aaAdaptive',
    'targetFps',
] as const satisfies readonly (keyof MandelbrotParams)[];

export const EXPLORATION_STATE_FIELDS = [
    'showPresetPins',
] as const satisfies readonly (keyof MandelbrotParams)[];

const OBSOLETE_RENDER_FIELDS = [
    'gpuLoadMultiplier',
    'zoomMinBrushStep',
    'sentinelSeedStep',
    'taylorSuperpixelEnabled',
    'taylorFreezeEnabled',
    'taylorFreezeStep',
] as const;

export function stripSessionPerformanceFields<T extends object>(value: T): T {
    const record = value as Record<string, unknown>;
    for (const field of SESSION_PERFORMANCE_FIELDS) {
        delete record[field];
    }
    for (const field of OBSOLETE_RENDER_FIELDS) {
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
 * placement, uniform over the pixel footprint — a BOX reconstruction kernel.
 * Box matches the sharpness reference of a DPR×N render downscaled to a
 * DPR-1 display (regular-grid box supersampling): the accumulated average
 * converges to the exact box integral of the pixel footprint. (The earlier
 * tent warp traded sharpness for smoother reconstruction; field round
 * 2026-07-07 chose the box.) Output components are in [-0.5, 0.5] texel
 * units. Sample 0 returns {0, 0} (the unjittered base sample).
 */
export function computeAaJitterOffset(sampleIndex: number): { x: number; y: number } {
    if (sampleIndex <= 0) {
        return { x: 0, y: 0 };
    }
    // Plastic constant: real root of x³ = x + 1. (A long-standing bug had
    // 1.22074408460575947536 here — the root of x⁴ = x + 1, i.e. the R3
    // sequence's constant. The resulting 2D pair loses the low-discrepancy
    // guarantee: at 4–16 samples the positions cluster in one corner of the
    // pixel instead of stratifying it, which quantized band transitions
    // unevenly regardless of the reconstruction kernel.)
    const phi = 1.32471795724474602596;
    const phi1 = 1 / phi;
    const phi2 = 1 / (phi * phi);
    // Seed 0.5 keeps sample 0 at exactly (0, 0) as a NATURAL member of the
    // sequence, so small prefixes stay uniformly distributed (a hors-série
    // center point biases low sample counts toward the pixel center).
    const r2x = (0.5 + sampleIndex * phi1) % 1;
    const r2y = (0.5 + sampleIndex * phi2) % 1;
    return { x: r2x - 0.5, y: r2y - 0.5 };
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
        aaAdaptive: current.aaAdaptive,
        targetFps: current.targetFps,
    };
}
