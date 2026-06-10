## Context

The stop preset chooser currently uses a native `<select>` in `src/components/PaletteEditor.vue`, which is efficient but too limited for rich row content. Stop presets already exist as local records with `values`, `favorite`, `remote`, and `guid` fields in `src/stopPresetStore.ts`, and the app already has Firebase-backed upload support plus favorite toggles for these presets.

The design goal is not to change the storage model or the remote catalog flow. The goal is to improve the chooser UX so users can see what each stop preset looks like at a glance while keeping the picker compact and functional.

## Goals / Non-Goals

**Goals:**

- Replace the native stop preset select with a compact custom dropdown.
- Show a 32x32 preview per row that is generated locally from preset data.
- Keep favorite and remote upload actions functional in the list.
- Preserve current stop preset behaviors for apply, delete, export, and local-first storage.
- Keep the chooser dense enough that it feels closer to a compact menu than a card list.

**Non-Goals:**

- Changing the stop preset storage format.
- Adding new server APIs or new Firebase data structures.
- Reworking the palette editor itself beyond the stop preset chooser surface.
- Introducing remote previews stored in Firebase.

## Decisions

1. Use a custom dropdown instead of trying to extend the native select.

   A native select cannot render per-option preview graphics or inline action buttons. A custom dropdown is the only practical way to show 32x32 previews and keep the favorite/upload actions inside each row.

   Alternative considered: keep the native select and add a separate preview panel. That would reduce implementation work, but it would not satisfy the line-by-line browsing experience and it would force users to look back and forth between controls.

2. Generate the preview locally from stop preset values.

   The preview should be a small raster generated from the preset's stored stop data, not a stored asset. That keeps previews always in sync with the preset and avoids adding preview fields to local storage or Firebase.

   Alternative considered: persist a preview image alongside each preset. That would complicate import/export, require extra invalidation logic, and duplicate data that can already be derived.

3. Keep the preview compact at 32x32 and optimize for recognition, not fidelity.

   A 32x32 swatch is large enough to distinguish a preset visually, but small enough that rows remain dense. The goal is a quick visual cue, not a full-resolution preview of the palette curve.

   Alternative considered: larger thumbnails. That would improve fidelity but would make the dropdown feel heavy and less usable with long lists.

4. Reuse the existing favorite and upload behaviors at the row level.

   The picker should not invent new semantics for favorite or cloud upload. It should expose the same local favorite toggle and the same admin-only remote upload path, just moved into the row UI.

   Alternative considered: split actions into a toolbar outside the dropdown. That would keep rows cleaner, but it would weaken the per-item workflow and make it harder to act on a single preset while browsing.

5. Keep the dropdown scrollable and narrow enough to feel compact.

   The menu should expand wider than the current select so the preview has room, but the row height should stay tight and the list should scroll once it exceeds a practical viewport fraction.

   Alternative considered: card-style rows with generous padding. That would be easier to scan, but it would consume too much vertical space and no longer match the "compact but richer" target.

## Risks / Trade-offs

- [Preview generation cost] Generating previews on the fly can add work when the dropdown opens. Mitigation: keep previews small, derive them locally, and avoid rebuilding them unless the preset list changes.
- [Accessibility complexity] Replacing a native select means keyboard navigation, focus handling, and escape-to-close behavior must be implemented explicitly. Mitigation: keep the interaction model simple and test it against keyboard use.
- [UI density vs readability] A compact row can become cramped if too many actions are shown. Mitigation: prioritize name and preview, keep actions icon-only, and hide the upload action for non-admin users.
- [Preview ambiguity] A 32x32 swatch may not fully represent a complex stop preset. Mitigation: treat the preview as a quick identifier, not as a substitute for opening the editor.

## Migration Plan

1. Replace the stop preset select with a custom dropdown container and row renderer.
2. Add a local preview generator that converts stop preset values into a 32x32 raster.
3. Reuse the existing favorite toggle and upload handler inside each row.
4. Preserve current apply, delete, and export actions.
5. Verify keyboard navigation, list scrolling, and remote/admin visibility behavior.
6. If the custom dropdown proves too heavy in practice, fall back to a simpler preview-only row and keep the actions outside the list.

## Open Questions

- Should the 32x32 preview be a horizontal strip, a square swatch, or a square with a centered strip inside it?
- Should the row preview reflect only color stops, or also the transfer curve and iridescence state?
- Should the dropdown close immediately after choosing a preset, or stay open while the user is using favorite/upload actions?
