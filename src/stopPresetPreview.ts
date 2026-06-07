import {hsl as d3hsl, rgb as d3rgb} from 'd3-color';
import {DEFAULT_VALUES, EFFECT_FIELD_CONFIG, EFFECT_FIELD_NAMES} from './effectFieldConfig';
import {getStopTransferCurve, type StopTransferCurve} from './ColorStop';
import type {StopPresetValues} from './stopPresetStore';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function safeHexColor(value: string, fallback: string): string {
  const color = d3rgb(value);
  if (![color.r, color.g, color.b].every(Number.isFinite)) return fallback;
  return color.formatHex();
}

function normalizeEffectValue(field: (typeof EFFECT_FIELD_NAMES)[number], value: number | undefined): number {
  const meta = EFFECT_FIELD_CONFIG[field];
  const effective = value ?? DEFAULT_VALUES[field];
  const span = meta.max - meta.min || 1;
  return clamp01((Math.max(meta.min, Math.min(meta.max, effective)) - meta.min) / span);
}

export function getStopPresetPreviewEffectStrength(values: StopPresetValues): number {
  let total = 0;
  for (const field of EFFECT_FIELD_NAMES) {
    total += normalizeEffectValue(field, values[field]);
  }
  return total / EFFECT_FIELD_NAMES.length;
}

export function buildStopPresetPreviewSpec(values: StopPresetValues): {
  startColor: string;
  endColor: string;
  curve: StopTransferCurve;
  effectStrength: number;
} {
  const startColor = safeHexColor(values.color, '#777777');
  const curve = getStopTransferCurve({
    color: startColor,
    position: 0,
    transferCurve: values.transferCurve,
  });
  const effectStrength = getStopPresetPreviewEffectStrength(values);

  if (values.iridescenceColor) {
    return {
      startColor,
      endColor: safeHexColor(values.iridescenceColor, startColor),
      curve,
      effectStrength,
    };
  }

  const accent = d3hsl(startColor);
  const curveBias = curve === 'square' ? -0.08 : curve === 'gaussian' ? 0.05 : curve === 'exponential' ? 0.08 : 0;
  const lightnessShift = (effectStrength - 0.5) * 0.36 + curveBias;
  if (Number.isFinite(accent.l)) {
    accent.l = clamp01((accent.l ?? 0.5) + lightnessShift);
  }

  return {
    startColor,
    endColor: accent.formatHex(),
    curve,
    effectStrength,
  };
}
