import type {ColorStop} from "./ColorStop.ts";

export type InterpolationMode = 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix';

export interface MandelbrotParams {
    activateSmoothness: boolean;
    activateZebra: boolean;
    tessellationLevel: number;
    shadingLevel: number;
    lightAngle: number;
    displacementAmount: number;
    specularPower: number;
    scale: string;
    cx: string;
    cy: string;
    mu: number;
    epsilon: number;
    angle: number;
    maxIterations: number,
    maxIterationMultiplier: number,
    antialiasLevel: number,
    palettePeriod: number,
    paletteOffset: number,
    dprMultiplier: number,
    targetFps: number,
    gpuLoadMultiplier: number,
    activateWebcam: boolean,
    activateTessellation: boolean,
    activateShading: boolean,
    activatePalette: boolean,
    activateSkybox: boolean,
    activateAnimate: boolean,
    colorStops: ColorStop[],
    interpolationMode: InterpolationMode,
}
