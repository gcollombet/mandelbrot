import type {ColorStop} from "./ColorStop.ts";

export type InterpolationMode = 'lab' | 'rgb' | 'hcl' | 'hsl' | 'cubehelix';

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
    dprMultiplier: number;
    targetFps: number;
    gpuLoadMultiplier: number;
    activateAnimate: boolean;
    colorStops: ColorStop[];
    interpolationMode: InterpolationMode;

    // ── Legacy / UI convenience fields ──
    // These are kept for backward compatibility with saved presets and as
    // UI convenience state (global toggles that set values on ALL stops).
    // The rendering pipeline ignores them — effects are read from palette
    // texture channels encoded per-stop in colorStops.
    activateSmoothness?: boolean;
    activateZebra?: boolean;
    activateTessellation?: boolean;
    activateShading?: boolean;
    activateSkybox?: boolean;
    activatePalette?: boolean;
    activateWebcam?: boolean;
    tessellationLevel?: number;
    shadingLevel?: number;
    lightAngle?: number;
    displacementAmount?: number;
    specularPower?: number;
    animationSpeed?: number;
    textureName?: string;
}
