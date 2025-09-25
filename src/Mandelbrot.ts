import type {ColorStop} from "./ColorStop.ts";

export interface MandelbrotParams {
    tessellationLevel: number;
    shadingLevel: number;
    scale: string;
    cx: string;
    cy: string;
    mu: number;
    epsilon: number;
    angle: string;
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
