import { interpolateLab, interpolateRgb, interpolateHcl, interpolateHsl, interpolateCubehelix } from 'd3-interpolate';
import { rgb } from 'd3-color';
import type { ColorStop } from './ColorStop.ts';
import { applyStopTransferCurve, getEffectValue, getStopTransferCurve } from './ColorStop.ts';
import { DEFAULT_VALUES, EFFECT_FIELD_CONFIG } from './effectFieldConfig';
import type { EffectFieldName } from './effectFieldConfig';
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

/** Height of the palette texture (6 rows for RGB+effects+iridescence+orbit metrics). */
const TEXTURE_HEIGHT = 7;

/** Effect-only texture rows (1, 2, 3, 5, 6) — fields grouped by row. */
const EFFECT_ROWS: Array<{ row: number; fields: EffectFieldName[] }> = [];
{
  const rowFields = new Map<number, EffectFieldName[]>();
  for (const name of Object.keys(EFFECT_FIELD_CONFIG) as EffectFieldName[]) {
    const { textureRow } = EFFECT_FIELD_CONFIG[name];
    if (textureRow === 0 || textureRow === 4) continue;
    if (!rowFields.has(textureRow)) rowFields.set(textureRow, []);
    rowFields.get(textureRow)!.push(name);
  }
  for (const [row, fields] of rowFields) {
    EFFECT_ROWS.push({ row, fields });
  }
  EFFECT_ROWS.sort((a, b) => a.row - b.row);
}

function lerpEffect(a: ColorStop, b: ColorStop, field: EffectFieldName, t: number): number {
  const va = getEffectValue(a, field);
  const vb = getEffectValue(b, field);
  return va + (vb - va) * t;
}

function getStopColor(stop: ColorStop, field: 'color' | 'iridescenceColor'): string | null {
  return stop[field] ?? null;
}

export class Palette {
  points: ColorStop[];
  private interpolate: (a: string, b: string) => (t: number) => string;

  constructor(points: ColorStop[], mode: InterpolationMode = 'lab') {
    this.points = points.slice().sort((a, b) => a.position - b.position);
    this.interpolate = interpolators[mode] ?? interpolateLab;
  }

  getColorAt(t: number): string {
    if (this.points.length === 0) return '#000';
    if (t <= this.points[0].position) return this.points[0].color;
    if (t >= this.points[this.points.length - 1].position) return this.points[this.points.length - 1].color;
    for (let i = 0; i < this.points.length - 1; ++i) {
      const a = this.points[i];
      const b = this.points[i + 1];
      if (t >= a.position && t <= b.position) {
        const localT = (t - a.position) / (b.position - a.position);
        const curvedT = applyStopTransferCurve(getStopTransferCurve(a), localT);
        const interp = this.interpolate(a.color, b.color);
        return rgb(interp(curvedT)).formatHex();
      }
    }
    return '#000';
  }

  getEffectAt(t: number, field: EffectFieldName): number {
    if (this.points.length === 0) return DEFAULT_VALUES[field];
    if (t <= this.points[0].position) return getEffectValue(this.points[0], field);
    if (t >= this.points[this.points.length - 1].position) {
      return getEffectValue(this.points[this.points.length - 1], field);
    }
    for (let i = 0; i < this.points.length - 1; ++i) {
      const a = this.points[i];
      const b = this.points[i + 1];
      if (t >= a.position && t <= b.position) {
        const localT = (t - a.position) / (b.position - a.position);
        const curvedT = applyStopTransferCurve(getStopTransferCurve(a), localT);
        return lerpEffect(a, b, field, curvedT);
      }
    }
    return DEFAULT_VALUES[field];
  }

  getIridescenceAt(t: number): { color: string; strength: number } {
    if (this.points.length === 0) return { color: '#000000', strength: 0 };
    if (this.points.length === 1) {
      return {
        color: this.points[0].iridescenceColor ?? this.points[0].color,
        strength: this.points[0].iridescenceColor ? getEffectValue(this.points[0], 'iridescencePower') : 0,
      };
    }

    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    if (t <= first.position) {
      return {
        color: first.iridescenceColor ?? first.color,
        strength: first.iridescenceColor ? getEffectValue(first, 'iridescencePower') : 0,
      };
    }
    if (t >= last.position) {
      return {
        color: last.iridescenceColor ?? last.color,
        strength: last.iridescenceColor ? getEffectValue(last, 'iridescencePower') : 0,
      };
    }

    for (let i = 0; i < this.points.length - 1; ++i) {
      const a = this.points[i];
      const b = this.points[i + 1];
      if (t >= a.position && t <= b.position) {
        const localT = (t - a.position) / (b.position - a.position);
        const curvedT = applyStopTransferCurve(getStopTransferCurve(a), localT);
        const aIridescence = getStopColor(a, 'iridescenceColor');
        const bIridescence = getStopColor(b, 'iridescenceColor');
        if (!aIridescence && !bIridescence) return { color: '#000000', strength: 0 };
        const aColor = aIridescence ?? a.color;
        const bColor = bIridescence ?? b.color;
        const aStrength = aIridescence ? getEffectValue(a, 'iridescencePower') : 0;
        const bStrength = bIridescence ? getEffectValue(b, 'iridescencePower') : 0;
        const strength = aStrength + (bStrength - aStrength) * curvedT;
        return { color: rgb(this.interpolate(aColor, bColor)(curvedT)).formatHex(), strength };
      }
    }

    return { color: '#000000', strength: 0 };
  }

  /**
   * Generate a 4096 x 7 float texture as a Float32Array.
   * All values are stored in their natural ranges — no normalization.
   * The Engine will encode these as float16 for the GPU texture.
   *
   * Layout (7 rows of 4096 RGBA texels):
   *   Row 0: R [0,1], G [0,1], B [0,1], palette weight [0,1]
   *   Row 1: zebra, tessellation, shading, skybox
   *   Row 2: webcam, smoothness, shadingLevel, specularPower
   *   Row 3: dielectric F0, metallic, roughness, anisotropy
   *   Row 4: iridescence R, G, B, strength
   *   Row 5: stripeAverage, rotationMean, stripeRelief, directionCoherenceRelief
   *   Row 6: directionalVolume, metalReflectance, metalEnvironmentTint, reserved
   */
  generateTexture(): { data: Float32Array; width: number; height: number } {
    const width = TEXTURE_WIDTH;
    const height = TEXTURE_HEIGHT;
    const data = new Float32Array(width * height * 4);

    for (let x = 0; x < width; ++x) {
      const t = x / (width - 1);
      const color = rgb(this.getColorAt(t));

      // Row 0: R, G, B, palette weight
      const row0 = (0 * width + x) * 4;
      data[row0]     = (color.r ?? 0) / 255;
      data[row0 + 1] = (color.g ?? 0) / 255;
      data[row0 + 2] = (color.b ?? 0) / 255;
      data[row0 + 3] = this.getEffectAt(t, 'palette');

      // Effect-only rows (1, 2, 3, 5): driven by config
      for (const { row, fields } of EFFECT_ROWS) {
        const base = (row * width + x) * 4;
        for (const field of fields) {
          const ch = EFFECT_FIELD_CONFIG[field].textureChannel;
          data[base + ch] = this.getEffectAt(t, field);
        }
      }

      // Row 4: iridescence R, G, B, strength
      const iridescence = this.getIridescenceAt(t);
      const iridescenceColor = rgb(iridescence.color);
      const row4 = (4 * width + x) * 4;
      data[row4]     = (iridescenceColor.r ?? 0) / 255;
      data[row4 + 1] = (iridescenceColor.g ?? 0) / 255;
      data[row4 + 2] = (iridescenceColor.b ?? 0) / 255;
      data[row4 + 3] = Math.max(0, Math.min(1, iridescence.strength));
    }

    return { data, width, height };
  }

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
