## Why

Texture mapping is currently exposed as a fixed list of modes, which makes the UI simple but hides the coordinate formulas and blocks useful combinations. Artists need a freer mapping model that preserves the important existing looks while allowing each texture axis to be driven by a selected fractal or screen variable.

## What Changes

- Replace the fixed `textureMappingMode` selection with a configurable texture mapping model.
- Let users choose an X-axis source variable and a Y-axis source variable for texture coordinates.
- Add logarithmic per-axis scale controls from `0.01` to `100`.
- Add an explicit mirror switch stored as part of the texture mapping.
- Preserve the two important existing modes as default mapping presets:
  - Screen Space
  - Dragon Scales / Escape Z
- Drop the current `c`-based Ray-Potential mode from the first version of the new UI/model.
- Add a saved texture mapping preset catalog with local persistence, favorites, and admin cloud upload/sync following the existing catalog patterns.
- Save and restore the active texture mapping in complete presets and palette presets.

## Capabilities

### New Capabilities
- `free-texture-mapping`: Configurable per-axis texture coordinate mapping, scale, mirror behavior, and built-in mappings that reproduce the current Screen Space and Dragon Scales looks.
- `texture-mapping-preset-catalog`: Local-first saved texture mapping presets with favorites and optional admin upload to the shared remote catalog.

### Modified Capabilities
- `preset-management`: Complete presets and palette presets must persist and restore the new texture mapping object instead of only the legacy numeric mapping mode.

## Impact

- Affected frontend state/types: `MandelbrotParams`, `RenderOptions`, palette preset records, complete preset records.
- Affected renderer: `Engine.ts` color uniform packing and `src/assets/color.wgsl` texture coordinate calculation.
- Affected UI: `Settings.vue` image/environment controls and catalog dropdown patterns.
- Affected storage: new IndexedDB store/module for texture mapping presets, plus migrations/default handling for legacy `textureMappingMode` records.
- Affected remote catalog: `remoteCatalog.ts`, `remoteCatalogSync.ts`, upload controls, and catalog type definitions.
- No new runtime dependency is expected.
