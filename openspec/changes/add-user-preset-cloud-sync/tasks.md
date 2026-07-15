## 1. Authentication and Personal Data Contracts

- [x] 1.1 Extend `UserRole` and role resolution to distinguish unsigned `guest`, authenticated `user`, and authenticated `admin`, preserving the authenticated UID through auth-state callbacks.
- [x] 1.2 Add tests for non-admin sign-in, admin sign-in, role-endpoint failure, sign-out, and account switching.
- [x] 1.3 Define shared personal-record, texture-metadata, usage-counter, trusted-revision, pending-operation, and import-batch TypeScript contracts.
- [x] 1.4 Define origin/scope helpers that distinguish guest, personal, public-catalog, and built-in records without overloading existing publication metadata.

## 2. Trusted Firebase Persistence and Quotas

- [x] 2.1 Implement owner-scoped Firestore paths for unified typed personal presets, personal texture metadata, usage counters, and import-batch state.
- [x] 2.2 Implement idempotent trusted create/update/delete operations for personal presets with transactional enforcement of the combined 400-record quota.
- [x] 2.3 Implement idempotent texture quota reservation, metadata finalization, replacement, deletion, and abandoned-reservation repair for the combined 10-texture quota.
- [x] 2.4 Add owner-scoped Storage handling for personal WebP texture blobs while keeping public catalog paths anonymous-read/admin-write.
- [x] 2.5 Update Firestore and Storage rules to reject cross-account access, direct quota bypass, unauthorized public publication, and unsupported personal texture content types.
- [x] 2.6 Add emulator or function-level tests covering quota boundaries, duplicate GUID retries, update-without-increment, delete/decrement, reservation recovery, cross-account denial, and admin catalog writes.

## 3. Owner-Scoped IndexedDB Caches

- [x] 3.1 Make complete-preset storage require a guest or UID scope and persist cache revision, dirty state, tombstones, origin, and stable GUID metadata.
- [x] 3.2 Apply the same scope and synchronization metadata model to palette, stop, texture-mapping, and animation preset stores.
- [x] 3.3 Scope texture metadata and blob stores so guest and account caches cannot resolve or enumerate each other's assets.
- [x] 3.4 Migrate existing unscoped personal records and imported texture blobs into the persistent `guest` scope without changing GUIDs or deleting data.
- [x] 3.5 Keep public catalog cache entries origin-tagged and excluded from personal cache counts and upload queues.
- [x] 3.6 Add IndexedDB regression tests for migration, scope isolation, account switching, origin separation, pending writes, and offline delete tombstones.

## 4. Personal Preset Synchronization

- [x] 4.1 Implement an owner-aware personal sync service that pulls cloud metadata/revisions, fetches changed records, and populates the active UID cache.
- [x] 4.2 Implement an IndexedDB outbox that submits personal preset creates, updates, favorites, thumbnails, and deletes idempotently through trusted endpoints.
- [x] 4.3 Implement whole-record revision reconciliation that accepts newer cloud data for clean records without silently discarding pending local writes.
- [x] 4.4 Wire save, quick snapshot, rename, favorite, delete, and per-category preset operations to the active guest or authenticated scope.
- [x] 4.5 Surface pending, synchronized, quota-rejected, and retryable-error states without blocking offline local use.
- [x] 4.6 Add synchronization tests for first-device hydration, cross-device updates, offline create/update/delete, retry after interruption, thumbnail/favorite transfer, and 400-record rejection.

## 5. Personal Texture Normalization and Synchronization

- [x] 5.1 Change the shared image normalization pipeline to proportionally fit tile and skybox imports within 1024x1024, avoid upscaling, encode WebP, and derive thumbnails from the normalized blob.
- [x] 5.2 Ensure decode or WebP encode failure saves neither the original image nor a partial texture record.
- [x] 5.3 Normalize existing oversized guest textures lazily before their first personal-cloud upload while preserving GUID references.
- [x] 5.4 Implement personal texture upload/download/replacement/deletion against owner-scoped metadata and Storage paths with quota reservation/finalization.
- [x] 5.5 Resolve personal texture and skybox references by owner plus GUID, download missing cached blobs on demand, and retain the reference while applying a visible safe fallback on failure.
- [x] 5.6 Keep admin publication buttons uploading the same normalized WebP blob to the separate public catalog path and recording publication metadata independently.
- [x] 5.7 Add tests for landscape/portrait resizing, no-upscale conversion, WebP MIME, thumbnail source, 10-texture quota, replacement, deletion, cross-device fetch, fallback, and admin publication.

## 6. Guest-to-Account Import

- [x] 6.1 Inventory guest records missing from the signed-in account by type and GUID after account sync completes.
- [x] 6.2 Build quota preflight that counts only missing GUIDs and blocks the entire import when either the 400-preset or 10-texture limit cannot accommodate the full guest library.
- [x] 6.3 Add the sign-in dialog with only `Import all` and `Not now`, including counts and quota-blocking explanations and no item-selection or deletion controls.
- [x] 6.4 Implement a resumable import batch that copies all missing guest textures and preset categories into the account, preserves GUID references, skips completed GUIDs, and never mutates guest source records.
- [x] 6.5 Ensure sign-out immediately restores the unchanged guest library and allow a different account to independently accept the same guest import.
- [x] 6.6 Add tests for accept, decline, over-quota rejection, interrupted retry, duplicate GUIDs, two-account import, texture-reference preservation, and post-sign-out guest restoration.

## 7. Unified Library UI and Admin Debug Tools

- [x] 7.1 Merge active-scope personal records, public catalog entries, and built-ins in library views while preserving origin-specific edit/delete/publication permissions and quota counts.
- [x] 7.2 Ensure saving a modified public default creates a new personal GUID and never writes the public record through personal sync.
- [x] 7.3 Pass explicit role/admin capability to Settings child panels and hide every JSON file input and import/export action from guests and ordinary users.
- [x] 7.4 Gate navigation/complete preset JSON actions, palette JSON actions, stop-preset JSON actions, and performance JSON export behind admin rendering.
- [x] 7.5 Route admin JSON imports through the admin's normal personal persistence and quota validation without granting a quota bypass.
- [x] 7.6 Keep tile and skybox image import visible to guests and authenticated users and preserve the existing explicit admin buttons for publishing defaults.
- [x] 7.7 Add UI tests for role-specific visibility, absence of hidden JSON inputs in the DOM, image-import availability, origin permissions, quota feedback, and admin upload behavior.

## 8. Migration, Resilience, and Release Verification

- [x] 8.1 Add feature flags or rollout guards so trusted endpoints/rules, scoped cache migration, preset sync, texture sync, and guest import can be enabled in dependency order.
- [x] 8.2 Add usage-counter recount/repair tooling for admins and diagnostics for orphaned texture reservations or blobs.
- [ ] 8.3 Verify first load, anonymous catalog consumption, account hydration, offline reload, account switching, sign-out, and rollback with existing local and public data.
- [x] 8.4 Run TypeScript typecheck and production build, accounting for the build command's documented `docs/` auto-staging side effect before choosing the verification command.
- [x] 8.5 Run focused unit tests and Playwright navigation/visual suites with the required WebGPU-capable headed browser, and record any environment-only limitations.
- [ ] 8.6 Review Firebase indexes, rules, function deployment order, quota repair path, logging, and measured thumbnail/texture transfer volume before broad enablement.

Verification note: the new guest/admin visibility E2E passes. The full navigation suite is currently blocked by legacy `.settings-popup` assertions after the existing dense-panel migration; live account-switch/rollback and transfer-volume checks require a deployed Firebase staging environment.
