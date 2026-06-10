## Context

The renderer already loads tile and skybox images into `rgba8unorm` GPU textures, so alpha data can reach the GPU texture. The color shader currently samples tile textures as RGB only and mixes that color into the Mandelbrot color using the existing Image Blend value, which makes transparent source pixels behave as opaque hidden RGB pixels.

The canvas output is configured as opaque and the color pass returns fully opaque pixels. This change is about using imported texture alpha as a local blend mask, not about making the application canvas itself transparent.

## Goals / Non-Goals

**Goals:**
- Use source texture alpha when applying the Image Blend texture effect.
- Preserve current visual output for fully opaque textures.
- Treat fully transparent texels as no image-texture contribution to the final color.
- Keep bump/relief sampling stable when the source texture contains transparent pixels.

**Non-Goals:**
- Do not introduce transparent WebGPU canvas output or DOM compositing changes.
- Do not change palette, skybox, webcam, or texture catalog storage formats.
- Do not add new UI controls unless implementation discovers that existing Image Blend semantics are insufficient.

## Decisions

1. Sample tile textures as RGBA for color blending.

   The tile sampling helper should expose alpha for the image-source blend path. This keeps alpha handling inside the shader where the current texture mix already happens. Alternative considered: pre-process uploaded images on the CPU to flatten transparency. That would lose the user's intended alpha mask and make future edits harder.

2. Combine texture alpha with the existing Image Blend weight.

   The effective blend should be `Image Blend * sampledAlpha`, clamped to the normal `[0, 1]` range. Fully opaque textures keep the current behavior, partially transparent pixels contribute proportionally, and fully transparent pixels leave the existing Mandelbrot color unchanged. Alternative considered: replace Image Blend with alpha. That would make existing presets harder to control and break expected slider behavior.

3. Keep final framebuffer alpha opaque.

   The fragment shader should continue returning alpha `1.0`, and `alphaMode: 'opaque'` should stay unchanged. This avoids changing page compositing, screenshot output, and existing visual tests. Alternative considered: enabling canvas transparency. That is a larger rendering contract change and not required for texture masking.

4. Use alpha-aware luminance only where needed for texture-derived relief.

   Bump/relief sampling should avoid transparent hidden RGB creating visible surface detail. The sampled texture used for bump calculation should either be premultiplied by alpha or otherwise reduce contribution as alpha approaches zero. Alternative considered: leaving bump based on RGB only. That would still let invisible texels affect lighting, which is surprising for transparent texture assets.

## Risks / Trade-offs

- Existing transparent textures may appear different if users relied on hidden RGB in transparent pixels -> This is the intended correction; opaque textures remain unchanged.
- Edge filtering could show hard transitions because current tile sampling uses `textureLoad` nearest-style coordinates -> Keep this change scoped to alpha semantics; filtering improvements can be a separate change.
- Browser image decode behavior may premultiply or preserve alpha differently depending on `createImageBitmap` options -> Verify with a small transparent texture; set explicit options only if needed.
- Visual screenshot tests may need baseline updates where transparent textures are used -> Add focused coverage or update fixtures only for affected scenes.
