## Why

The current stop preset chooser is a native select, which is too narrow to show what a stop preset actually looks like. Users also need the favorite and remote upload actions to remain usable on the same row without turning the menu into a tall, bulky panel.

## What Changes

- Replace the native stop preset select with a custom compact dropdown that can render richer row content.
- Show a 32x32 visual preview for each stop preset row so users can recognize a preset by appearance instead of name alone.
- Keep the dropdown denser than the other preset dropdowns while still supporting readable names and inline actions.
- Expose functional per-row favorite and remote upload actions inside the stop preset list.
- Preserve the current stop preset selection, apply, delete, and export behaviors.

## Capabilities

### New Capabilities
- `stop-preset-dropdown-preview`: Defines the compact stop preset dropdown, 32x32 row previews, and inline row actions for stop presets.

### Modified Capabilities

## Impact

- Affects `src/components/PaletteEditor.vue`, where the stop preset selector is rendered today.
- Affects stop preset preview generation logic, which will need a local rasterized representation of each preset.
- Reuses existing favorite and Firebase upload services, but changes how those actions are exposed in the UI.
- Requires keyboard and pointer interaction handling for a custom dropdown instead of a native select.
