import type {ColorStop} from "./ColorStop.ts";

export type InterpolationMode = 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix';
export type ApproximationMode = 'perturbation' | 'bla';

export interface MandelbrotParams {
    scale: string;
    cx: string;
    cy: string;
    mu: number;
    epsilon: number;
    angle: number;
    maxIterations: number;
    maxIterationMultiplier: number;
    antialiasLevel: number;
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
}



