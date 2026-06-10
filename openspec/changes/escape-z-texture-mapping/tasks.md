## 1. Type Definitions and Engine Integration

- [x] 1.1 Add `textureMappingMode?: number` to `MandelbrotParams` in `src/Mandelbrot.ts`.
- [x] 1.2 Add `textureMappingMode: number` to `RenderOptions` in `src/Engine.ts`.
- [x] 1.3 Pack `renderOptions.textureMappingMode` at index 35 of `colorShaderData` in `src/Engine.ts`.

## 2. WebGPU Shader Calculations

- [x] 2.1 Declare `textureMappingMode: f32` in the `Uniforms` struct in `src/assets/color.wgsl`.
- [x] 2.2 Update `palette` function in `src/assets/color.wgsl` to compute `tess_u` and `tess_v` dynamically based on the mapping mode: Screen Space (0), Cartesian Escape Z (1), and Polar Ray-Potential (2).

## 3. UI and Persistence

- [x] 3.1 Declare `textureMappingMode: 0` default value in `model` definition inside `src/components/Settings.vue`.
- [x] 3.2 Update `savePreset`, `quickSnapshot`, `selectPreset`, and `selectPresetLocation` methods in `src/components/Settings.vue` to save and restore `textureMappingMode`.
- [x] 3.3 Update `savePalette`, `selectPalette`, and `applyPaletteLookFields` in `src/components/Settings.vue` to serialize and restore `textureMappingMode`.
- [x] 3.4 Add dropdown control in the Vue template of `src/components/Settings.vue` to let users choose between Screen, Cartesian Escape Z, and Polar mapping modes.

## 4. Verification

- [x] 4.1 Run typechecking with `npx vue-tsc -b` and verify no compiler warnings/errors are introduced.
- [x] 4.2 Start development server and manually verify the new mapping modes render correctly in a WebGPU-capable browser.
