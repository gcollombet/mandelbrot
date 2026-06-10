## Why

Introduce new artistic texture mapping modes to the Mandelbrot WebGPU renderer. Currently, tile textures are mapped solely in screen space. Mapping textures using the values of $z$ at escape allows for conformal, self-similar, and infinitely repeating patterns that wrap directly around the Mandelbrot set bulges and cardioid, unlocking premium fractal art capabilities.

## What Changes

- Add a new parameter `textureMappingMode` in the rendering options.
- support 3 modes: Screen Space (Default), Cartesian Escape Z (dragon scales/mosaic effect), and Polar Ray-Potential (smooth continuous skin).
- Expose the new setting in the user interface under the "Image Sources" section in the settings tab.
- Update WebGPU color uniform packing and the fragment shader (`color.wgsl`) to implement mapping calculations.
- Ensure the selected mapping mode is correctly saved and restored within presets and custom palettes.

## Capabilities

### New Capabilities
- `escape-z-texture-mapping`: Introduces configurable texture mapping modes using escape coordinates ($z$ value at escape, or polar ray-potential fields) to deform 2D tile textures conformally onto the Mandelbrot set.

### Modified Capabilities
- `preset-management`: Support saving and restoring the `textureMappingMode` field in presets and custom palettes.

## Impact

- `src/Mandelbrot.ts`: Extend `MandelbrotParams` type.
- `src/Engine.ts`: Extend `RenderOptions` type, update the uniform buffer packaging for the color pass.
- `src/assets/color.wgsl`: Update the `Uniforms` struct and modify the `palette()` function to compute the texture coordinates based on the selected mode.
- `src/components/Settings.vue`: Add default value in the model definition, include saving/loading logic in presets/palettes, and add dropdown selector for texture mapping mode in the UI.
