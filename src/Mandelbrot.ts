import type {ColorStop} from "./ColorStop.ts";

export interface MandelbrotParams {
    activateSmoothness: boolean;
    activateZebra: boolean;
    tessellationLevel: number;
    shadingLevel: number;
    scale: string;
    cx: string;
    cy: string;
    mu: number;
    epsilon: number;
    angle: number;
    maxIterations: number,
    antialiasLevel: number,
    palettePeriod: number,
    activateWebcam: boolean,
    activateTessellation: boolean,
    activateShading: boolean,
    activatePalette: boolean,
    activateSkybox: boolean,
    colorStops: ColorStop[],
}
