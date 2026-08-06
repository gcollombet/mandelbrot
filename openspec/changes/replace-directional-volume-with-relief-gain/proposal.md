## Why

The current per-stop `directionalVolume` adds a slope opposite to the cached analytic distance gradient, so it can flatten or invert measured relief and make reflections respond differently from AO, shadows, and ridge cues. Now that the renderer has an analytic geometry cache, the material control should amplify or attenuate that geometry without changing its direction.

## What Changes

- Replace the additive angle-derived `directionalVolume` term with a strictly positive per-stop analytic relief gain.
- Give the control a neutral value of `1` and an exponential response so attenuation and amplification are perceptually balanced without allowing a normal flip.
- Apply the effective analytic relief consistently to the surface normal/reflections, analytic AO curvature, local shadows, ridge emphasis, and slope-driven iridescence.
- Restore the shared derivative-angle flow of anisotropic environment reflections with a reflection-only normal, driven by material anisotropy, while keeping the analytic geometry normal unchanged.
- Keep environment reflection to its existing single skybox sample; the directional anisotropy offset does not depend on roughness, while roughness continues to select the existing isotropic mip level.
- Keep global `reliefDepth` as the scene-wide master and keep stripe, coherence, and texture bumps as separate material fields.
- Rename the UI and serialized material field to `reliefGain`, while accepting legacy `directionalVolume` values during preset import.
- **BREAKING (visual semantics)** Existing presets that explicitly used `directionalVolume` remain loadable but no longer reproduce its opposing artificial slope; their value is interpreted as an attenuation-to-neutral relief-gain control.

## Capabilities

### New Capabilities

- `material-relief-gain`: Defines a positive, per-palette-stop gain over cached analytic geometry and its coherent use by material-lighting cues.

### Modified Capabilities

None.

## Impact

- Affects the color shader's analytic-gradient, curvature, geometric normal, reflection-only normal, shadow, ridge, iridescence, and reflection inputs.
- Affects the `ColorStop` material schema, effect-field configuration, palette texture row 6 channel R, palette editor labels/help, preset import compatibility, and preset serialization.
- Does not change the cached geometry MRT layout, iteration/resolve passes, global `reliefDepth` setting, or GPU resource count.
