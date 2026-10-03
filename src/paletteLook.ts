import type { MandelbrotParams } from './Mandelbrot'
import type { PaletteRecord } from './paletteStore'
import { normalizeIterationPaletteCurve } from './IterationPaletteCurve'
import { normalizeOrbitTrapFromLegacy } from './OrbitTrap'
import { normalizeTextureMappingFromLegacy } from './TextureMapping'

// ── What selecting a saved palette writes onto the scene ──
// Shared by the palette editor (Settings.vue) and the studio's palette grid,
// so a palette picked in either place produces the same look.

/** Relief, lighting and effect fields a palette carries, with the defaults the
 *  editor has always used for the ones an older palette lacks. */
export function paletteLookFields(source: Partial<PaletteRecord>): Partial<MandelbrotParams> {
  const orbitTrap = normalizeOrbitTrapFromLegacy(source)
  const out: Partial<MandelbrotParams> = {
    iterationPaletteCurve: normalizeIterationPaletteCurve(source.iterationPaletteCurve),
    tessellationLevel: source.tessellationLevel ?? 0,
    displacementAmount: source.displacementAmount ?? 0,
    microBumpStrength: source.microBumpStrength ?? 0,
    reliefDepth: source.reliefDepth ?? 1,
    protrusionPhase: source.protrusionPhase ?? 0,
    protrusionSharpness: source.protrusionSharpness ?? 2,
    protrusionStrength: source.protrusionStrength ?? 1,
    protrusionGeometryMix: source.protrusionGeometryMix ?? 0,
    protrusionPeriod: source.protrusionPeriod ?? 1,
    protrusionTerrace: source.protrusionTerrace ?? 0,
    ambientOcclusionStrength: source.ambientOcclusionStrength ?? 0,
    localShadowStrength: source.localShadowStrength ?? 0,
    castShadowStrength: source.castShadowStrength ?? 0,
    castShadowLength: source.castShadowLength ?? 4,
    castShadowSoftness: source.castShadowSoftness ?? 0.35,
    horizonOcclusionStrength: source.horizonOcclusionStrength ?? 0,
    horizonOcclusionRadius: source.horizonOcclusionRadius ?? 0.1,
    indirectLightStrength: source.indirectLightStrength ?? 0,
    reliefClosing: source.reliefClosing ?? 0,
    varnishStrength: source.varnishStrength ?? 0,
    gradeContrast: source.gradeContrast ?? 1.18,
    gradeSaturation: source.gradeSaturation ?? 1.12,
    orbitTrap,
    orbitTrapStrength: orbitTrap.strength,
    phaseColoringStrength: source.phaseColoringStrength ?? 0,
    stripeFrequency: source.stripeFrequency ?? 8,
    textureMapping: normalizeTextureMappingFromLegacy(source),
  }
  if (source.lightAngle != null) out.lightAngle = source.lightAngle
  return out
}

/** Everything a saved palette sets: stops, palette placement, look fields and
 *  the textures it names. Texture loading is left to the caller. */
export function paletteRecordAppearance(palette: PaletteRecord): Partial<MandelbrotParams> {
  const out: Partial<MandelbrotParams> = {
    colorStops: JSON.parse(JSON.stringify(palette.colorStops)),
    paletteScreenShiftX: palette.paletteScreenShiftX ?? 0,
    paletteScreenShiftY: palette.paletteScreenShiftY ?? 0,
    heightPaletteShift: palette.heightPaletteShift ?? 0,
    paletteMirror: palette.paletteMirror ?? false,
    ...paletteLookFields(palette),
  }
  if (palette.interpolationMode) out.interpolationMode = palette.interpolationMode
  if (palette.palettePeriod != null) out.palettePeriod = palette.palettePeriod
  if (palette.paletteOffset != null) out.paletteOffset = palette.paletteOffset
  if (palette.textureGuid || palette.textureName) { out.textureGuid = palette.textureGuid; out.textureName = palette.textureName }
  if (palette.skyboxGuid || palette.skyboxName) { out.skyboxGuid = palette.skyboxGuid; out.skyboxName = palette.skyboxName }
  return out
}
