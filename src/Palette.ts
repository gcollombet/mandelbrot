import { interpolateLab, interpolateRgb, interpolateHcl, interpolateHsl, interpolateCubehelix } from 'd3-interpolate';
import { rgb } from 'd3-color';
import type { ColorStop } from './ColorStop.ts';
import { COLOR_STOP_DEFAULTS, getEffectValue } from './ColorStop.ts';
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
   * Generate a 4096 x 4 float texture as a Float32Array.
   * All values are stored in their natural ranges — no normalization.
   * The Engine will encode these as float16 for the GPU texture.
   *
   * Layout (4 rows of 4096 RGBA texels):
   *   Row 0 (y=0.125): R [0,1], G [0,1], B [0,1], palette weight [0,1]
   *   Row 1 (y=0.375): zebra [0,1], tessellation [0,1], shading [0,1], skybox [0,1]
   *   Row 2 (y=0.625): webcam [0,1], smoothness [0,1], shadingLevel [0,3], specularPower [1,64]
   *   Row 3 (y=0.875): lightAngle [0,2pi], tessellationLevel [0,10], displacementAmount [0,0.1], 0 (reserved)
   *
   * @returns {{ data: Float32Array, width: number, height: number }}
   */
  generateTexture(): { data: Float32Array; width: number; height: number } {
    const width = TEXTURE_WIDTH;
    const height = TEXTURE_HEIGHT;
    const data = new Float32Array(width * height * 4);

    for (let x = 0; x < width; ++x) {
      const t = x / (width - 1);
      const color = rgb(this.getColorAt(t));

      // ── Row 0: R, G, B, palette weight ──
      const row0 = (0 * width + x) * 4;
      data[row0]     = (color.r ?? 0) / 255;
      data[row0 + 1] = (color.g ?? 0) / 255;
      data[row0 + 2] = (color.b ?? 0) / 255;
      data[row0 + 3] = this.getEffectAt(t, 'palette');

      // ── Row 1: zebra, tessellation, shading, skybox ──
      const row1 = (1 * width + x) * 4;
      data[row1]     = this.getEffectAt(t, 'zebra');
      data[row1 + 1] = this.getEffectAt(t, 'tessellation');
      data[row1 + 2] = this.getEffectAt(t, 'shading');
      data[row1 + 3] = this.getEffectAt(t, 'skybox');

      // ── Row 2: webcam, smoothness, shadingLevel, specularPower ──
      const row2 = (2 * width + x) * 4;
      data[row2]     = this.getEffectAt(t, 'webcam');
      data[row2 + 1] = this.getEffectAt(t, 'smoothness');
      data[row2 + 2] = this.getEffectAt(t, 'shadingLevel');
      data[row2 + 3] = this.getEffectAt(t, 'specularPower');

      // ── Row 3: lightAngle, reserved, reserved, reserved ──
      const row3 = (3 * width + x) * 4;
      data[row3]     = this.getEffectAt(t, 'lightAngle');
      data[row3 + 1] = 0; // reserved (tessellationLevel is now a global uniform)
      data[row3 + 2] = 0; // reserved (displacementAmount is now a global uniform)
      data[row3 + 3] = 0; // reserved
    }

    return { data, width, height };
  }

  /**
   * Generate a 1-row ImageData (4096 x 1) containing only the RGB color row.
   * Used for palette thumbnails in the UI (always opaque).
   */
  generateThumbnailRow(): ImageData {
    const width = TEXTURE_WIDTH;
    const imageData = new ImageData(width, 1);
    const dst = imageData.data;
    for (let x = 0; x < width; ++x) {
      const t = x / (width - 1);
      const color = rgb(this.getColorAt(t));
      const i = x * 4;
      dst[i]     = Math.max(0, Math.min(255, Math.round(color.r ?? 0)));
      dst[i + 1] = Math.max(0, Math.min(255, Math.round(color.g ?? 0)));
      dst[i + 2] = Math.max(0, Math.min(255, Math.round(color.b ?? 0)));
      dst[i + 3] = 255;
    }
    return imageData;
  }
}
