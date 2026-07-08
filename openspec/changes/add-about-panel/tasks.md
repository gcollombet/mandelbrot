## 1. Prep

- [x] 1.1 Confirm a free, mnemonic keyboard-shortcut letter for the About tab against the current keymap (`settingsTabs`, movement/rotation/zoom bindings, global keydown handler in `MandelbrotViewer.vue`) and pick it.
- [x] 1.2 Extract the shortcut-groups data (Move/Rotate/Zoom/Settings/Snapshot labels and keys currently in `.shortcut-hint`) into a shared shape (computed/prop) that both the About panel and the splash screen can consume without duplicating the list.

## 2. About panel

- [x] 2.1 Add `about` to `settingsTabs` (label, icon, the shortcut chosen in 1.1) and to `densePortedTabs` in `MandelbrotViewer.vue`.
- [x] 2.2 Create `src/components/AboutPanel.vue` with three sections: Aide (shortcut groups from 1.2, structured so more help content can be appended later), Crédits (WebGPU credit/link, GitHub link, creator/tech-stack blurb), and a Présentation call-to-action linking to `./presentation/`.
- [x] 2.3 Wire `AboutPanel.vue` into the dense-popup body in `MandelbrotViewer.vue` for `tab.key === 'about'`, alongside the existing `<Settings :active-tab="tab.key" />` usage for the other tabs.
- [x] 2.4 Verify the About tab opens/closes/drags/z-orders identically to the existing five tabs (reusing `toggleTab`/`closeTab`/`popupStyle`/`bringToFront`/`startDrag` as-is, no new panel-management code).

## 3. Panel-header auth control

- [x] 3.1 Add `authConfigured`/`authUserEmail` props and `login`/`logout` emits to `DenseTopbar.vue`; render a right-aligned Login/Logout control (label + click handling) when `authConfigured` is true.
- [x] 3.2 Pass `authConfigured`/`authUserEmail` and handle the `login`/`logout` emits (calling the existing `loginWithGoogle()`/`logoutUser()`) at every `DenseTopbar` usage site in `MandelbrotViewer.vue` (Presets, Navigation, Palettes, Animation, Performance, About).
- [x] 3.3 Remove the `.top-tab-btn.auth-btn` markup and its dedicated styles from `top-settings-bar`.
- [x] 3.4 Verify Login/Logout appears and behaves identically across all six panel headers, and that the top settings bar no longer shows any auth control.

## 4. Splash screen shortcuts + auto-dismiss

- [x] 4.1 Add the shortcut-groups content (from 1.2) to `SplashScreen.vue`'s template, positioned so it doesn't crowd out the existing logo/title/"Toucher pour explorer" prompt.
- [x] 4.2 Add a 10-second `setTimeout` in `SplashScreen.vue` that calls the existing `dismiss()`; clear the timer if the user dismisses manually first (on click/touchend) to avoid a no-op late call.
- [x] 4.3 Verify: splash dismisses immediately on tap/click before 10s, and auto-dismisses at 10s with no interaction.

## 5. Remove old chrome

- [x] 5.1 Remove the `.footer-love` block (WebGPU credit, GitHub link, Présentation link, footer Login button) and its styles from `MandelbrotViewer.vue`.
- [x] 5.2 Remove the `.shortcut-hint` block and its styles from `MandelbrotViewer.vue`.
- [x] 5.3 Remove the now-unused `bottomBarVisible` state, its 10-second timer, and any remaining references (e.g. `.footer-love`/`.shortcut-hint` bounding-rect lookups used by discovery-radar layout math — replace or drop as needed).
- [x] 5.4 Grep the file for any leftover references to removed classes/refs to confirm no dangling bindings remain.

## 6. Verification

- [x] 6.1 Run the dev server and manually walk through: opening each of the six panels and confirming consistent Login/Logout placement; opening About and reviewing Aide/Crédits/Présentation CTA; reloading the app and observing the splash screen's shortcuts + auto-dismiss at 10s and on manual dismiss.
- [x] 6.2 Confirm no console errors/warnings introduced by the changes (missing props, removed refs still referenced, etc.).
- [x] 6.3 Ran `vitest run tests/unit` (63/63 pass) and `playwright test tests/navigation.spec.ts`. Fixed the one test tied to this change (top-bar tab count/labels: 5→6 tabs, Screenshot→About, dropped the dead `:not(.auth-btn)` filter). The other 7 failures in that file all assert on `.settings-popup` (the legacy, pre-dense popup chrome) — confirmed via `git stash` that they fail identically on the unmodified base commit, so they're pre-existing debt from the in-progress `adopt-dense-shell` migration, not caused by this change.
