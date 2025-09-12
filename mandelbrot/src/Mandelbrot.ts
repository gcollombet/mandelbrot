export interface MandelbrotParams {
    scale: number;
    cx: number;
    cy: number;
    mu: number;
    epsilon: number;
    angle: number;
    maxIterations: number,
    antialiasLevel: number,
    palettePeriod: number,
}
