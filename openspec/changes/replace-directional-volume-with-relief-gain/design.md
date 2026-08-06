## Context

`color.wgsl` currently reconstructs the analytic distance gradient and Laplacian from the packed geometry cache, then adds stripe, direction-coherence, and texture gradients before constructing the final normal. The per-stop `directionalVolume` field is different: it adds a fixed-magnitude vector opposite to the analytic gradient direction. Its effect therefore depends inversely on the measured slope and can cancel or reverse shallow analytic geometry, while AO, local shadows, ridges, and slope-driven iridescence continue to use the unreversed analytic fields.

The field is stored in palette texture row 6 channel R and is editable per palette stop. `reliefDepth` is a separate render-wide uniform. The replacement must retain the existing cache/MRT layout and avoid any new resolve or neighbour-sampling work.

## Goals / Non-Goals

**Goals:**

- Preserve the direction and singular structure of the cached analytic gradient while offering per-material attenuation and amplification.
- Make every lighting cue derived from the analytic distance field use the same effective analytic-relief scale.
- Preserve the visually important alignment between derivative-angle anisotropy and the base environment reflection without reintroducing that directional slope into geometric relief.
- Keep the control neutral by default, smooth between palette stops, positive for its full range, and inexpensive in the color pass.
- Preserve preset readability and reuse the existing palette-texture channel.

**Non-Goals:**

- Recompute or repack the geometry cache, add an MRT, or change the iteration/resolve passes.
- Scale stripe, direction-coherence, texture bump, or texture-coordinate warp fields with the analytic relief gain.
- Make a palette-varying gain a globally integrable height field; it is an explicitly material-driven modulation of analytic geometry.
- Reproduce the old `directionalVolume` appearance exactly, including its cancellation and normal inversion.
- Implement a multi-sample or roughness-dependent anisotropic environment convolution.

## Decisions

### Store a bounded control and decode a positive exponential gain

Replace `directionalVolume` with a per-stop `reliefGain` control `r` in `[0, 2]`, with default and neutral value `1`. After palette interpolation, the shader decodes:

```text
gain(r) = exp2(2 * (r - 1))
```

This produces a strictly positive multiplier in `[0.25, 4]`, with balanced powers-of-two around the neutral value. Interpolation remains in control/log space, so transitions between stops are perceptually smoother than linear interpolation of the decoded multiplier.

Alternatives considered:

- Keep the additive angle-derived vector: rejected because a fixed opposing magnitude can cancel or flip the analytic slope.
- Use a signed or zero-reaching multiplier: rejected because it reintroduces flat degeneracy or direction reversal.
- Store a direct linear multiplier: rejected because attenuation occupies little useful slider travel while amplification dominates the range.

### Define one effective scale for analytic geometry consumers

Let the existing analytic relief be:

```text
analyticRelief = clamp(reliefDepth * effectiveShading, 0, 2)
effectiveAnalyticRelief = analyticRelief * gain(reliefGain)
```

Use `effectiveAnalyticRelief` for:

- the cached analytic-gradient contribution to the final surface normal, and therefore direct lighting and reflections;
- cached analytic curvature in ambient occlusion;
- analytic local-height shadowing;
- analytic ridge emphasis;
- analytic slope-driven iridescence.

The final normal remains the sum of the scaled analytic gradient and the independently controlled stripe, coherence, and texture gradients. Analytic direction data used only for orientation, such as the anisotropy tangent, remains unchanged.

This is preferred over scaling only the final normal because the latter would preserve the present mismatch: reflections would react to the control while AO and shadow cues would not.

### Use a reflection-only anisotropic normal for the base environment

Removing the old angle-derived surface-gradient term also removed an important visual coupling: the base environment reflection no longer follows the same derivative-angle flow that orients the anisotropic direct highlight. Restore that coupling after constructing the geometric `surfaceGradient`, without feeding it back into geometry:

```text
reflectionGradient = surfaceGradient - angleDir * (2 * anisotropy)
reflectionNormal = normal_from_gradient(reflectionGradient)
baseReflectDir = reflect(-viewDir, reflectionNormal)
```

The coefficient `2` reproduces the historical flat-zone directional tilt at full anisotropy: the old `normalize(vec3(angleDir, 0.5))` response is equivalent to a unit-Z normal with an XY slope of magnitude `2`. At zero anisotropy, `reflectionNormal` is exactly the geometric normal. The derivative angle is rotated into world/screen space through the same existing scene rotation as the geometric normal.

Only the base environment lookup uses `baseReflectDir`. Direct/diffuse lighting, analytic AO, local shadows, ridges, iridescence slope, and the clearcoat environment retain the geometric normal; the clearcoat remains an independent isotropic top layer. The environment reflection keeps one skybox sample. Material roughness still selects the existing mip level, but it does not scale or rotate the anisotropic directional offset. This is an intentional single-representative-direction approximation, not a multi-sample anisotropic BRDF convolution.

### Reuse palette texture row 6 channel R

Row 6 channel R changes meaning from a normalized additive-volume amount to the normalized/log-domain `reliefGain` control. No geometry attachment, palette row, bind group, pass, or texture read is added. The shader performs one inexpensive `exp2` after the existing palette sample.

### Migrate legacy presets at the material boundary

`ColorStop` gains `reliefGain`; `directionalVolume` remains accepted only as a deprecated input alias. When a stop has no `reliefGain` but has a finite `directionalVolume`, migration clamps the legacy value to `[0, 1]` and uses it as the new control. Thus the former default/maximum `1` becomes neutral gain, while lower legacy values become attenuation. When neither field is present, the new default is `1`.

New edits and serialized presets emit `reliefGain` only. Centralizing migration before palette interpolation prevents local, cloud, built-in, and imported presets from acquiring different behavior.

An exact visual migration is impossible because the old operation depended on local slope magnitude and could reverse its direction. The chosen mapping is deterministic, bounded, and preserves the user's broad intent of reducing the former volume control.

### Rename the user-facing control

The palette editor labels the field `Gain de relief` and explains that it scales analytic relief per material stop. `reliefDepth` remains `Profondeur relief` and continues to act as the render-wide analytic-relief master. Keeping the two names distinct communicates their scope.

## Risks / Trade-offs

- [Existing presets can look materially different] → Accept the visual break explicitly, migrate deterministically, and compare representative reflective, diffuse, AO, and iridescent presets during validation.
- [A gain varying with palette phase is not generally the gradient of one global scalar height] → Keep the gain positive and smoothly interpolated; document it as material modulation rather than cached geometry.
- [Large gains can saturate AO or shadows] → Bound the decoded gain to `[0.25, 4]` and retain the existing clamps/smoothsteps in each lighting cue.
- [Migration can diverge across import and storage paths] → Put legacy resolution in a shared ColorStop/palette normalization helper and cover local/imported record shapes with unit tests.
- [Scaling unrelated bump fields would make the control unpredictable] → Apply it only to cached analytic gradient, slope, and curvature consumers.
- [A single reflection direction cannot reproduce an anisotropically blurred BRDF] → Accept the bounded one-sample approximation to restore directional coherence without extra texture reads; keep the existing roughness mip behavior independent.
- [The reflection-only tilt could leak into the clearcoat and make the top film inherit base anisotropy] → Use a separate geometric `coatReflectDir` for clearcoat.

## Migration Plan

1. Introduce `reliefGain` and shared legacy-stop normalization while retaining read compatibility for `directionalVolume`.
2. Switch palette texture row 6 channel R and the shader material structure to the new meaning.
3. Replace every analytic-relief consumer with `effectiveAnalyticRelief`, then remove the additive directional gradient.
4. Rename the editor field and help text; ensure new saves/exported presets contain only `reliefGain`.
5. Add the one-sample, reflection-only anisotropic direction and retain the geometric normal for every non-base-environment consumer.
6. Validate unit/static contracts and representative runtime looks. Rollback consists of reverting the change; no persistent database schema migration is required because legacy input remains readable and palette records are schemaless.

## Open Questions

None. The control range, mapping, migration rule, and affected lighting cues are fixed by this design.
