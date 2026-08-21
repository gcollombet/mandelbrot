import type {ColorStop} from "./ColorStop.ts";
import type {TextureMappingConfig} from "./TextureMapping.ts";
import type {AnimationConfig} from "./AnimationConfig.ts";
import type {OrbitTrapConfig} from "./OrbitTrap.ts";
import type {IterationPaletteCurve} from "./IterationPaletteCurve.ts";

export type InterpolationMode = 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix';
export type ApproximationMode = 'perturbation' | 'bla' | 'pade' | 'jet' | 'mobius' | 'auto';

/** Maximum interactive/export AA accumulation budget. */
export const MAX_ANTIALIAS_LEVEL = 256;

export function normalizeAntialiasLevel(value: number | undefined): number {
    const rounded = Math.round(value ?? 1);
    if (!Number.isFinite(rounded)) return 1;
    return Math.min(MAX_ANTIALIAS_LEVEL, Math.max(1, rounded));
}

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
    iterationPaletteCurve: IterationPaletteCurve;
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
    protrusionStrength?: number;
    protrusionGeometryMix?: number;
    protrusionPeriod?: number;
    localShadowStrength?: number;
    varnishStrength?: number;
    gradeContrast?: number;
    gradeSaturation?: number;
    orbitTrapStrength?: number;
    orbitTrap?: OrbitTrapConfig;
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

type AaJitterOffset = { x: number; y: number };

// Plastic constant: real root of x³ = x + 1. (A long-standing bug had
// 1.22074408460575947536 here — the root of x⁴ = x + 1, i.e. the R3
// sequence's constant.)
const AA_R2_PHI = 1.32471795724474602596;
const AA_R2_PHI_1 = 1 / AA_R2_PHI;
const AA_R2_PHI_2 = 1 / (AA_R2_PHI * AA_R2_PHI);
// Cranley-Patterson phases chosen against the ACTUAL finite prefixes consumed
// by the 4×..64× slider. They cap either prefix-centroid component below 0.05
// texel over that whole range, versus peaks of 0.164/0.145 for the old 0.5
// phase, while retaining the pure R2 distribution (unlike forced ± pairing,
// which leaves half of a 4×4 stratification empty at 16×).
const AA_R2_PHASE_X = 0.0535;
const AA_R2_PHASE_Y = 0.354;

function r2BoxPoint(index: number): AaJitterOffset {
    return {
        x: (AA_R2_PHASE_X + index * AA_R2_PHI_1) % 1 - 0.5,
        y: (AA_R2_PHASE_Y + index * AA_R2_PHI_2) % 1 - 0.5,
    };
}

/**
 * Screen-pixel sub-pixel AA jitter for a given sample index.
 *
 * Uses a finite-prefix-balanced R2 low-discrepancy sequence, uniform over the
 * pixel footprint — a BOX reconstruction kernel. Box matches the sharpness
 * reference of a DPR×N render downscaled to DPR 1: the accumulated average
 * converges to the box integral of the screen pixel. The earlier tent warp
 * traded sharpness for smoother reconstruction; the 2026-07-07 field round
 * chose box.
 *
 * The phase is selected for the finite 4×..64× prefixes the UI actually uses,
 * avoiding the coherent ~0.1 px shift of the old 0.5 phase without sacrificing
 * R2 stratification. Components remain in [-0.5, 0.5] screen-texel units.
 * Sample 0 returns {0, 0} (the unjittered base sample).
 */
export function computeAaJitterOffset(sampleIndex: number): AaJitterOffset {
    if (sampleIndex <= 0) {
        return { x: 0, y: 0 };
    }
    return r2BoxPoint(sampleIndex);
}

/** Rotate a screen-aligned jitter into the scene/local_rot coordinate frame. */
export function rotateAaJitterToScene(offset: AaJitterOffset, sceneAngle: number): AaJitterOffset {
    const sin = Math.sin(sceneAngle);
    const cos = Math.cos(sceneAngle);
    return {
        x: cos * offset.x - sin * offset.y,
        y: sin * offset.x + cos * offset.y,
    };
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
