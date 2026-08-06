## 1. Material Field and Compatibility

- [x] 1.1 Replace the active `directionalVolume` effect field with `reliefGain` in `ColorStop` and effect-field configuration, using range `[0, 2]` and neutral default `1` while retaining a deprecated legacy input type.
- [x] 1.2 Add a shared ColorStop normalization helper that gives `reliefGain` precedence, maps finite legacy `directionalVolume` values into `[0, 1]`, defaults missing values to `1`, and removes the legacy key from normalized output.
- [x] 1.3 Apply the shared normalization at palette construction, editing/cloning, local persistence, cloud/catalog import, and export boundaries so every preset source has the same migration behavior.
- [x] 1.4 Update palette texture layout names and comments so row 6 channel R carries the interpolated `reliefGain` control without changing texture dimensions or bindings.

## 2. Coherent Shader Relief

- [x] 2.1 Rename the shader material field and row-6 sampling path to `reliefGain`, clamp the control to `[0, 2]`, and decode `exp2(2 * (reliefGain - 1))`.
- [x] 2.2 Compute one `effectiveAnalyticRelief` from global `reliefDepth`, effective shading, and the decoded gain, preserving zero global relief and a strictly positive material multiplier.
- [x] 2.3 Remove the additive `directionalVolumeGradient` and scale only the cached analytic-gradient contribution to the final surface normal with `effectiveAnalyticRelief`.
- [x] 2.4 Use `effectiveAnalyticRelief` consistently for cached-curvature AO, local-height shadows, ridge emphasis, and analytic slope-driven iridescence.
- [x] 2.5 Verify that stripe, direction-coherence, texture-bump, texture-warp, and orientation-only uses of the analytic angle remain independent of `reliefGain`.
- [x] 2.6 Add a reflection-only gradient `surfaceGradient - angleDir * (2 * anisotropy)` for the base environment direction, keep it independent of roughness, retain one skybox sample, and keep clearcoat on the geometric reflection direction.

## 3. Palette Editor and Preset Output

- [x] 3.1 Rename the per-stop editor control to `Gain de relief` and update its help text to distinguish it from global `Profondeur relief`.
- [x] 3.2 Ensure newly created/interpolated stops and built-in/default material data use `reliefGain: 1` when no explicit per-stop modulation is requested.
- [x] 3.3 Ensure saved, exported, and synchronized preset payloads emit `reliefGain` only and do not reintroduce `directionalVolume`.

## 4. Verification

- [x] 4.1 Add unit coverage for neutral/attenuated/amplified gain decoding, stop interpolation, legacy migration, new-field precedence, missing-field defaults, and legacy-key removal on serialization.
- [x] 4.2 Add a color-shader contract test covering the exponential positive mapping, absence of the opposing additive gradient, reuse of row 6 channel R, and shared effective scale across normal, AO, shadow, ridge, and iridescence paths.
- [x] 4.3 Run the focused relief-gain unit tests, the complete unit suite, and `npx vue-tsc -b`; distinguish these static checks from GPU visual validation.
- [x] 4.4 Perform a user-guided WebGPU visual comparison on reflective, diffuse, AO/local-shadow, and iridescent materials at gain controls below, at, and above `1`, and confirm palette-only edits do not trigger geometry recomputation.
- [x] 4.5 Extend the shader contract test to cover the anisotropy-zero identity, derivative-angle reflection offset, roughness independence, single base skybox sample, and geometric clearcoat direction.
- [x] 4.6 Compare anisotropy `0` and `1` in WebGPU on a reflective preset, confirm the environment reflection follows derivative-angle flow without changing analytic relief, and distinguish the visual check from performance measurement.
