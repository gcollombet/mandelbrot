## 1. Specification and UI contract

- [ ] 1.1 Add the `stop-preset-dropdown-preview` capability spec describing the compact dropdown, 32x32 preview rows, and inline actions.
- [ ] 1.2 Validate that the new spec is aligned with the existing stop preset apply, favorite, delete, export, and admin upload behaviors.

## 2. Dropdown structure

- [ ] 2.1 Replace the native stop preset `<select>` in `PaletteEditor.vue` with a custom dropdown container.
- [ ] 2.2 Render stop preset rows with a compact layout that includes a preview area, the preset name, and inline action icons.
- [ ] 2.3 Keep the dropdown scrollable and visually denser than the existing preset dropdowns.

## 3. Preview generation

- [ ] 3.1 Add a local 32x32 preview generator for stop presets based on preset values.
- [ ] 3.2 Ensure preview generation fails gracefully so rows still render if a preview cannot be produced.

## 4. Row actions

- [ ] 4.1 Wire the favorite action to the existing stop preset favorite toggle logic.
- [ ] 4.2 Wire the upload action to the existing remote stop preset upload path and keep it admin-only.
- [ ] 4.3 Preserve the existing apply, delete, and export actions for the selected stop preset.

## 5. Interaction and verification

- [ ] 5.1 Add keyboard and pointer interactions for opening, selecting, and closing the custom dropdown.
- [ ] 5.2 Verify the row layout does not overlap the preview, label, or action icons.
- [ ] 5.3 Test guest, signed-in admin, and non-admin states to confirm the correct action visibility.
