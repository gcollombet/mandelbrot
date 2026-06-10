## Context

Currently, the Mandelbrot WebGPU rendering engine (`Engine.ts`) supports dynamic texture loading (`tileTex` / `tileTexture`) to overlay textures onto the fractal, but it is mapped in screen coordinates (`uv_neutral` coordinates shifted by `v_smooth` depth). 
This proposal aims to introduce a conformal mapping mode where the texture coordinates are determined by the complex value $z = (zx, zy)$ at the moment of escape, or by the polar coordinates $(v\_smooth, stripePhase)$ derived from the potential and average angle.

## Goals / Non-Goals

**Goals:**
- Implement `textureMappingMode` config in `MandelbrotParams`, `RenderOptions`, and `Uniforms` struct.
- Adapt the color fragment shader `color.wgsl` to compute $u, v$ texture coordinates dynamically based on the selected mode:
  - Mode 0: Screen space (current mapping).
  - Mode 1: Cartesian Escape $z$ coordinates, scaled by displacement.
  - Mode 2: Polar Ray-Potential mapping (continuous flow).
- Expose this setting in the Vue user interface settings panel.
- Ensure mapping mode is saved in and loaded from presets and palettes.

**Non-Goals:**
- Creating custom textures (using existing textures like Gold, Lava, Webcam, etc.).
- Modifying the core perturbation loop in `mandelbrot.wgsl` (the escape $z$ value is already stored in raw layers 2 and 3 and can be read by `color.wgsl`).

## Decisions

### 1. Reusing the 36th slot in the Color Uniform Buffer
- **Choice**: Map `textureMappingMode` directly into index 35 of the Float32Array in `Engine.ts`, which corresponds to `uniformBufferColor` (which is allocated at size `4 * 36` bytes, leaving index 35 free as padding).
- **Alternative**: Resizing the buffer or creating a separate uniform buffer.
- **Rationale**: Reusing the existing padding slot avoids buffer size modifications and extra binding overhead, keeping performance optimal.

### 2. Texture Coordinate Modulo / Tiling
- **Choice**: Reuse `tile_tessellation()` helper function in `color.wgsl` which handles out-of-bounds mapping using manual wrapping (`fract`) and mirroring (`select(tileUV.x, 1.0 - tileUV.x, mirrorX)`).
- **Alternative**: Binding a sampler with `addressModeU: 'repeat'` and `addressModeV: 'repeat'`.
- **Rationale**: Reusing `tile_tessellation` avoids modifying sampler bindings or having conflicts when different texture sources (webcam, custom textures) are loaded.

---

## Risks / Trade-offs

- **Discontinuity in Cartesian Escape $z$ Mapping**
  - *Risk*: Pixels at the borders of iteration bands will show sharp jumps in texture coordinates.
  - *Mitigation*: This is the expected behavior for Cartesian Escape $z$ (dragon scales/feather effect). If the user wants a smooth flow, they can switch to Mode 2 (Ray-Potential Polar), which is continuous.
- **WebGPU Uniform Buffer Alignment**
  - *Risk*: Incorrect buffer sizes or padding in WGSL vs TS can cause rendering errors or mismatching variables.
  - *Mitigation*: Ensure the WGSL `Uniforms` struct order matches the Float32Array in `Engine.ts` precisely, and verify that the 36-float size is correctly populated.
