## ADDED Requirements

### Requirement: Texture alpha controls image texture contribution
The renderer SHALL use the alpha channel of imported tile/tessellation textures as a per-pixel contribution mask when applying the Image Blend texture effect.

#### Scenario: Fully transparent texel
- **WHEN** the active tile texture sample has alpha `0` and Image Blend is greater than `0`
- **THEN** the rendered pixel color MUST match the Mandelbrot color that would be produced without the tile texture contribution

#### Scenario: Partially transparent texel
- **WHEN** the active tile texture sample has alpha between `0` and `1` and Image Blend is greater than `0`
- **THEN** the renderer MUST blend the texture color over the Mandelbrot color using the sampled alpha multiplied by the Image Blend value

#### Scenario: Fully opaque texel
- **WHEN** the active tile texture sample has alpha `1`
- **THEN** the renderer MUST preserve the existing Image Blend behavior for that sampled texture color

### Requirement: Transparent texture pixels do not create hidden relief
The renderer SHALL prevent fully transparent texture pixels from contributing visible texture-derived bump or relief detail.

#### Scenario: Transparent texel with hidden RGB
- **WHEN** a tile texture sample has alpha `0` but non-zero RGB values
- **THEN** texture-derived lighting, bump, or relief MUST NOT expose those hidden RGB values as visible surface detail

### Requirement: Canvas output remains opaque
The renderer SHALL keep the final Mandelbrot canvas output opaque while using texture alpha only for internal texture compositing.

#### Scenario: Rendering with transparent source texture
- **WHEN** the scene is rendered with a tile texture containing transparent pixels
- **THEN** the WebGPU canvas output MUST remain fully opaque and visually show the underlying Mandelbrot color through transparent texture regions
