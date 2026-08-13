## 1. Palette Schema and UI

- [x] 1.1 Add the neutral `protrusion` field to `ColorStop` and the effect-field metadata in palette row 6 alpha.
- [x] 1.2 Expose the effect with French label and description in the palette editor and update row-layout documentation.

## 2. Shader Material Effect

- [x] 2.1 Decode protrusion from the existing row-6 sample and compute the fixed smooth-escape lobe.
- [x] 2.2 Route the styled analytic relief scale through normals, AO, local shadows, ridge accents, and slope-driven iridescence while preserving canonical geometry consumers.

## 3. Verification

- [x] 3.1 Add unit coverage for neutral defaults, stop interpolation, row-6 packing, and the shader contract.
- [x] 3.2 Run the focused unit tests, TypeScript build check, and non-browser shader validation available in the repository.

## 4. Global Lobe Shape Controls

- [x] 4.1 Add persisted global `protrusionPhase` and `protrusionSharpness` fields with legacy defaults and surface-panel controls.
- [x] 4.2 Propagate both values through component props and the existing color and palette-preview uniform padding slots.
- [x] 4.3 Parameterize the WGSL protrusion lobe with wrapped phase and bounded sharpness.
- [x] 4.4 Extend unit contracts and rerun TypeScript, unit, WGSL, and OpenSpec validation.

## 5. Geometric Height-Warp Variant

- [x] 5.1 Add persisted geometric mix and period controls with legacy defaults and surface-panel fields.
- [x] 5.2 Propagate both values through the component chain and color/preview uniform slots 70 and 71 without growing the buffers.
- [x] 5.3 Implement the scalar height-gradient profile and continuous blend with the iteration-phase profile.
- [x] 5.4 Extend contracts and rerun TypeScript, unit, WGSL, and OpenSpec validation.

## 6. Iteration-Profile Amplification

- [x] 6.1 Restore geometric mix to `[0, 1]` and add a persisted iteration-profile strength control in `[1, 4]` using reserved uniform slot 93.
- [x] 6.2 Amplify the iteration multiplier's departure from neutral, keeping strength `1` identical to the original effect and avoiding exponential over-amplification.
- [x] 6.3 Extend regression contracts and rerun TypeScript, unit, WGSL, and strict OpenSpec validation.
