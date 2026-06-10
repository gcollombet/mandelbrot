## Context

The renderer currently exposes texture mapping through `textureMappingMode`, a numeric selector with three hard-coded shader branches. The user wants to move away from the fixed mode list and instead choose the texture X and Y coordinate sources independently, with per-axis logarithmic scale controls and an explicit mirror switch.

Two existing looks matter for compatibility: Screen Space and Dragon Scales / Escape Z. The existing `c`-based Ray-Potential mode is not part of this first version and can be reintroduced later if needed. The app already has local-first catalog patterns for complete presets, palettes, stop presets, and textures, including GUID identity, favorites, remote metadata, and admin upload controls.

## Goals / Non-Goals

**Goals:**

- Replace `textureMappingMode` with a structured texture mapping object in render state.
- Support per-axis variable selection, per-axis logarithmic scale from `0.01` to `100`, and explicit mirror behavior.
- Preserve Screen Space and Dragon Scales as built-in/default mapping presets.
- Provide a texture mapping preset catalog with local IndexedDB persistence, favorites, remote sync, and admin upload.
- Persist the active texture mapping in complete presets and palette presets.
- Migrate legacy `textureMappingMode` values into equivalent structured mappings where possible.

**Non-Goals:**

- Reintroducing or preserving the `c`-based Ray-Potential mode in v1.
- Building a formula editor or allowing arbitrary mathematical expressions.
- Adding per-axis offsets, sign inversion controls, or multi-source arithmetic beyond built-in composed variables.
- Changing texture image upload/normalization behavior.
- Changing palette color stop semantics.

## Decisions

### 1. Use a structured `TextureMappingConfig`

Represent the active mapping as a value object instead of a numeric enum:

```ts
type TextureMappingVariable =
  | 'screenXWithDepth'
  | 'screenYWithDepth'
  | 'dragonScaleU'
  | 'derivativeAngleSin'
  | 'screenX'
  | 'screenY'
  | 'iterSmooth'
  | 'distance';

type TextureMappingConfig = {
  xVariable: TextureMappingVariable;
  yVariable: TextureMappingVariable;
  xScale: number;
  yScale: number;
  mirrored: boolean;
};
```

Alternative considered: keep `textureMappingMode` and add more enum values. That would keep implementation small but would not let users combine sources freely.

### 2. Preserve complex legacy formulas as composed variables

The user-facing v1 remains “one source per axis plus one coefficient per axis,” but two variables are composed to preserve the current important modes:

- `screenXWithDepth` / `screenYWithDepth` reproduce the current screen-space mapping that blends screen coordinate with smooth-depth displacement.
- `dragonScaleU` reproduces the current Escape Z U coordinate, including the normalized log-radius minus raw iteration term.
- `derivativeAngleSin` drives the Dragon Scales V coordinate from `sin(angle_der)` to avoid the iteration-boundary jumps produced by raw `arg(z)`.

Alternative considered: expose raw `argZ`. That preserves the older Escape Z angular mapping, but produces visible discontinuities at iteration-boundary changes. The derivative-angle sine field is smoother for the texture V coordinate.

### 3. Remove the `c`-based mode from v1 defaults and UI

The current third mode depends on a reconstructed complex point `c`. The user explicitly deprioritized that mode, so v1 should not include `argC` or `c`-derived variables. If needed later, it can be added as a new mapping variable without changing the preset catalog shape.

Alternative considered: include hidden legacy support for mode 2. That would add shader and migration complexity for a mode the user does not currently value.

### 4. Pack mapping fields into color uniforms

The color shader should receive numeric IDs for `xVariable` and `yVariable`, plus `xScale`, `yScale`, and `mirrored`. The current uniform buffer has already grown beyond the original 36-float padding layout, so implementation should use an explicit struct/index map and resize the buffer if needed rather than relying on spare slots.

Alternative considered: pass mapping values through a separate uniform buffer. That is cleaner in isolation but adds binding churn for a small amount of scalar data.

### 5. Make mirroring explicit and independent of mapping variable

The current shader behavior ties mirror handling to the mapping mode. The new `mirrored` flag should control texture mirror behavior for every mapping, including Dragon Scales and custom mappings. Built-in Dragon Scales should set `mirrored: true` because that is required to recreate the intended legacy look.

Alternative considered: keep mirror behavior implicit by selected variable. That would be surprising once users can save and combine custom mappings.

### 6. Add a dedicated texture mapping preset catalog

Texture mapping presets should be stored separately from complete presets and palette presets:

```ts
type TextureMappingPresetRecord = {
  guid: string;
  name: string;
  mapping: TextureMappingConfig;
  date: string;
  lastUpdated: string;
  favorite?: boolean;
  remote?: CatalogRemoteState;
};
```

The store should follow existing catalog conventions: GUID identity, IndexedDB local persistence, favorite state preserved locally, name uniqueness, remote metadata merge by GUID, and no remote deletion mirroring.

Alternative considered: store mappings only inside complete presets and palettes. That would persist state but would not let users build a reusable mapping library or upload shared mapping presets.

### 7. Keep presets and palettes self-contained

Complete presets and palette presets should embed the active `TextureMappingConfig`. They may also optionally carry a selected mapping preset GUID/name for UI continuity, but rendering and loading must not depend on resolving that GUID. This prevents remote or deleted mapping catalog entries from breaking old complete presets.

Alternative considered: store only a mapping preset GUID. That keeps records smaller but makes preset loading dependent on catalog availability and later local renames.

## Risks / Trade-offs

- Legacy mode 2 presets lose exact visual compatibility -> Migrate mode 2 to a safe fallback, likely Screen Space, and document that `c`-based mapping is intentionally out of v1.
- Uniform layout mistakes can break rendering -> Define a single ordered uniform packing map in `Engine.ts` and keep WGSL struct fields in the same order.
- “One source per axis” may still feel limiting -> Use composed variables for the two important existing looks and leave offsets/formulas for later.
- Variable value ranges differ widely -> The per-axis logarithmic scale controls give coarse control, while built-in variables should be normalized where needed for usable defaults.
- New catalog type increases sync/upload surface -> Reuse the existing remote catalog pattern and keep rendering local-first.

## Migration Plan

1. Add new texture mapping types and default built-in mappings.
2. Convert active defaults from `textureMappingMode: 0` to the Screen Space mapping object.
3. Migrate legacy complete preset and palette records:
   - `textureMappingMode: 0` -> Screen Space mapping.
   - `textureMappingMode: 1` -> Dragon Scales mapping.
   - `textureMappingMode: 2` or unknown -> Screen Space mapping.
4. Keep reading `textureMappingMode` as a legacy fallback during transition, but write the new mapping object.
5. Add the IndexedDB texture mapping preset store and remote sync/upload integration.
6. If rollout fails, keep the default Screen Space mapping as the fallback so rendering remains usable even without custom mapping catalog data.

## Open Questions

- Should the UI display the selected built-in mappings as immutable presets, or allow saving edited copies under user names only?
- Should applying a mapping preset also select the associated texture image, or should mapping presets strictly affect coordinates/mirror only?
