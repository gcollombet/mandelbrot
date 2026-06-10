## 1. Shader Sampling

- [x] 1.1 Update tile texture sampling in `src/assets/color.wgsl` so the color blend path can read RGBA instead of RGB only.
- [x] 1.2 Apply texture contribution as `Image Blend * sampledAlpha` while preserving current output for alpha `1`.
- [x] 1.3 Ensure alpha `0` leaves the existing Mandelbrot color unchanged even when hidden RGB values are present.

## 2. Relief and Lighting

- [x] 2.1 Update texture-derived bump or luminance sampling so fully transparent texels do not create visible relief from hidden RGB.
- [x] 2.2 Verify partially transparent texels produce proportional visual contribution without destabilizing lighting.

## 3. Texture Loading

- [x] 3.1 Review `src/Engine.ts` image loading and `createImageBitmap` usage to confirm alpha is preserved for PNG/WebP inputs.
- [x] 3.2 Add explicit bitmap alpha handling options only if browser behavior or tests show alpha is not preserved reliably.

## 4. Validation

- [x] 4.1 Add or update focused coverage using a small transparent texture fixture for alpha `0`, partial alpha, and alpha `1` behavior.
- [x] 4.2 Run `npx vue-tsc -b` to verify TypeScript integration still passes.
- [x] 4.3 Run relevant Playwright visual or interaction tests when a WebGPU-capable browser is available.
