import { interpolateLab, interpolateRgb, interpolateHcl, interpolateHsl, interpolateCubehelix } from 'd3-interpolate';
import { rgb } from 'd3-color';
import type { ColorStop } from './ColorStop.ts';
import { COLOR_STOP_DEFAULTS, PARAM_DIVISORS, getEffectValue } from './ColorStop.ts';
import type { InterpolationMode } from './Mandelbrot.ts';

const interpolators: Record<InterpolationMode, (a: string, b: string) => (t: number) => string> = {
  lab: interpolateLab,
  rgb: interpolateRgb,
  hcl: interpolateHcl,
  hsl: interpolateHsl,
  cubehelix: interpolateCubehelix,
};

/** Width of the palette texture (one texel per iteration bucket). */
const TEXTURE_WIDTH = 4096;

/** Height of the palette texture (4 rows for RGB+effects). */
const TEXTURE_HEIGHT = 4;

/**
 * Linearly interpolate a single effect field between two stops.
 */
function lerpEffect(a: ColorStop, b: ColorStop, field: keyof typeof COLOR_STOP_DEFAULTS, t: number): number {
  const va = getEffectValue(a, field);
  const vb = getEffectValue(b, field);
  return va + (vb - va) * t;
}

/**
 * Clamp a value to [0, 255] and round to nearest integer.
 */
function toByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export class Palette {
  points: ColorStop[];
  private interpolate: (a: string, b: string) => (t: number) => string;

  constructor(points: ColorStop[], mode: InterpolationMode = 'lab') {
    this.points = points.slice().sort((a, b) => a.position - b.position);
    this.interpolate = interpolators[mode] ?? interpolateLab;
  }

  /**
   * Get the interpolated CSS color at position t in [0, 1].
   * Uses the configured color-space interpolation (Lab, RGB, etc.).
   */
  getColorAt(t: number): string {
    if (this.points.length === 0) return '#000';
    if (t <= this.points[0].position) return this.points[0].color;
    if (t >= this.points[this.points.length - 1].position) return this.points[this.points.length - 1].color;
    for (let i = 0; i < this.points.length - 1; ++i) {
      const a = this.points[i];
      const b = this.points[i + 1];
      if (t >= a.position && t <= b.position) {
        const localT = (t - a.position) / (b.position - a.position);
        const interp = this.interpolate(a.color, b.color);
        return rgb(interp(localT)).formatHex();
      }
    }
    return '#000';
  }

  /**
   * Get the interpolated value of an effect field at position t in [0, 1].
   * Uses linear interpolation between the two surrounding stops.
   */
  getEffectAt(t: number, field: keyof typeof COLOR_STOP_DEFAULTS): number {
    if (this.points.length === 0) return COLOR_STOP_DEFAULTS[field];
    if (t <= this.points[0].position) return getEffectValue(this.points[0], field);
    if (t >= this.points[this.points.length - 1].position) {
      return getEffectValue(this.points[this.points.length - 1], field);
    }
    for (let i = 0; i < this.points.length - 1; ++i) {
      const a = this.points[i];
      const b = this.points[i + 1];
      if (t >= a.position && t <= b.position) {
        const localT = (t - a.position) / (b.position - a.position);
        return lerpEffect(a, b, field, localT);
      }
    }
    return COLOR_STOP_DEFAULTS[field];
  }

  /**
   * Generate a 4096 x 4 rgba8unorm ImageData encoding both colors and effects.
   *
   * Row 0 (y=0.125): R, G, B, palette (weight of RGB source)
   * Row 1 (y=0.375): zebra, tessellation, shading, skybox
   * Row 2 (y=0.625): webcam, smoothness, shadingLevel/3, specularPower/64
   * Row 3 (y=0.875): lightAngle/2pi, tessellationLevel/10, displacementAmount/0.1, 0 (reserved)
   */
  generateTexture(): ImageData {
    const width = TEXTURE_WIDTH;
    const height = TEXTURE_HEIGHT;
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    for (let x = 0; x < width; ++x) {
      const t = x / (width - 1);
      const color = rgb(this.getColorAt(t));

      // ── Row 0: R, G, B, palette weight ──
      const row0 = (0 * width + x) * 4;
      data[row0]     = toByte(color.r);
      data[row0 + 1] = toByte(color.g);
      data[row0 + 2] = toByte(color.b);
      data[row0 + 3] = toByte(this.getEffectAt(t, 'palette') * 255);

      // ── Row 1: zebra, tessellation, shading, skybox ──
      const row1 = (1 * width + x) * 4;
      data[row1]     = toByte(this.getEffectAt(t, 'zebra') * 255);
      data[row1 + 1] = toByte(this.getEffectAt(t, 'tessellation') * 255);
      data[row1 + 2] = toByte(this.getEffectAt(t, 'shading') * 255);
      data[row1 + 3] = toByte(this.getEffectAt(t, 'skybox') * 255);

      // ── Row 2: webcam, smoothness, shadingLevel/3, specularPower/64 ──
      const row2 = (2 * width + x) * 4;
      data[row2]     = toByte(this.getEffectAt(t, 'webcam') * 255);
      data[row2 + 1] = toByte(this.getEffectAt(t, 'smoothness') * 255);
      data[row2 + 2] = toByte((this.getEffectAt(t, 'shadingLevel') / PARAM_DIVISORS.shadingLevel) * 255);
      data[row2 + 3] = toByte((this.getEffectAt(t, 'specularPower') / PARAM_DIVISORS.specularPower) * 255);

      // ── Row 3: lightAngle/2pi, tessellationLevel/10, displacementAmount/0.1, reserved ──
      const row3 = (3 * width + x) * 4;
      data[row3]     = toByte((this.getEffectAt(t, 'lightAngle') / PARAM_DIVISORS.lightAngle) * 255);
      data[row3 + 1] = toByte((this.getEffectAt(t, 'tessellationLevel') / PARAM_DIVISORS.tessellationLevel) * 255);
      data[row3 + 2] = toByte((this.getEffectAt(t, 'displacementAmount') / PARAM_DIVISORS.displacementAmount) * 255);
      data[row3 + 3] = 0; // reserved
    }

    return imageData;
  }
}
