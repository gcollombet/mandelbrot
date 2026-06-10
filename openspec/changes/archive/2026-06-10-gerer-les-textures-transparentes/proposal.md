## Why

Imported PNG/WebP textures can contain transparent pixels, but the current rendering path ignores the alpha channel and treats every sampled texel as fully opaque. This makes transparent texture assets render with unwanted black, white, or hidden RGB backgrounds instead of blending naturally with the Mandelbrot palette.

## What Changes

- Preserve and use the alpha channel from loaded tile/tessellation textures during fractal color blending.
- Blend texture color over the existing Mandelbrot color according to both the texture alpha and the existing Image Blend control.
- Keep fully opaque textures visually compatible with the current behavior.
- Keep the final WebGPU canvas opaque unless a future change explicitly introduces transparent canvas output.
- Ensure texture-derived bump/relief behavior remains stable for transparent or partially transparent texels.

## Capabilities

### New Capabilities
- `transparent-textures`: Defines how imported texture alpha affects image-texture blending in the renderer.

### Modified Capabilities

## Impact

- Affects WebGPU shader sampling and color blending in `src/assets/color.wgsl`.
- May require TypeScript-side texture loading adjustments in `src/Engine.ts` if image bitmap alpha handling needs explicit options.
- Affects visual behavior for uploaded or catalog textures with alpha channels.
- No new runtime dependencies are expected.
