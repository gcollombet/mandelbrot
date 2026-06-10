## 1. Firebase And Remote Catalog Setup

- [x] 1.1 Add Firebase client dependency and environment-based configuration for the Vite app.
- [x] 1.2 Create a remote catalog service module with typed catalog types for complete presets, palette presets, stop presets, and textures.
- [x] 1.3 Implement anonymous remote metadata reads that return GUID, name, and `lastUpdated` for each entry in each catalog type.
- [x] 1.4 Implement remote entry reads by GUID for each catalog type, including texture metadata and blob retrieval only when needed.
- [x] 1.5 Implement remote upload writes that create or update entries by GUID and reject same-type name conflicts with other GUIDs.

## 2. Local IndexedDB And GUID Migration

- [x] 2.1 Add GUID fields and migrations for existing complete presets without breaking existing local preset reads.
- [x] 2.2 Add GUID fields and migrations for existing palette presets without breaking existing local palette reads.
- [x] 2.3 Replace stop preset localStorage reads with an IndexedDB-backed stop preset store.
- [x] 2.4 Migrate legacy stop preset localStorage entries into IndexedDB with GUIDs.
- [x] 2.5 Add GUID fields and migrations for existing textures without breaking existing texture reads.
- [x] 2.6 Enforce non-empty names and local same-type name uniqueness for complete presets, palette presets, stop presets, and textures.
- [x] 2.7 Implement default naming rules: date-based complete preset names, required palette/stop names, and texture file name without extension.
- [x] 2.8 Add local favorite support for stop presets and textures.
- [x] 2.9 Add GUID-based texture and skybox references for complete presets with legacy name fallback.

## 3. Page-Load Catalog Synchronization

- [x] 3.1 Add a page-load synchronization entry point that runs after existing local migrations/default seeding.
- [x] 3.2 Fetch remote metadata lists for each catalog type and compare entries by GUID and per-entry `lastUpdated`.
- [x] 3.3 Import fetched complete presets into the existing local preset store.
- [x] 3.4 Import fetched palette presets into the existing local palette store.
- [x] 3.5 Import fetched stop presets into the existing stop preset store.
- [x] 3.6 Import fetched textures into the existing local texture metadata/blob stores.
- [x] 3.7 Skip full payload/blob downloads for local entries whose GUID and `lastUpdated` are current.
- [x] 3.8 Resolve local name conflicts on import by generating a unique local display name without changing the GUID.
- [x] 3.9 Preserve local-only fields such as favorites and local display renames when updating remote-origin entries.
- [x] 3.10 Keep local entries when their GUIDs are absent from remote metadata.
- [x] 3.11 Handle remote metadata or entry fetch failures as non-blocking startup failures while continuing to show local data.

## 4. Authentication And Role Resolution

- [x] 4.1 Add Google OpenID Connect sign-in and sign-out controls to the UI.
- [x] 4.2 Track authenticated user state and default unresolved or signed-out users to `guest`.
- [x] 4.3 Call the configured role endpoint for signed-in users and accept only `guest` or `admin` roles.
- [x] 4.4 Treat role endpoint failures or invalid responses as `guest`.

## 5. Admin Upload UI And Writes

- [x] 5.1 Add favorite hearts and per-row admin upload icons for complete preset dropdown rows.
- [x] 5.2 Add favorite hearts and per-row admin upload icons for palette preset dropdown rows.
- [x] 5.3 Replace or augment stop preset selection UI so stop presets have favorite hearts and per-row admin upload icons.
- [x] 5.4 Add favorite hearts and per-row admin upload icons for texture dropdown rows.
- [x] 5.5 Hide all upload icons for unsigned users and users resolved as `guest`.
- [x] 5.6 Prevent non-admin users from overwriting remote-origin payload fields while still allowing favorites and local display renames.
- [x] 5.7 Prevent non-admin users from deleting remote-origin catalog entries locally.
- [x] 5.8 Implement admin upload for complete presets by GUID and store the trusted returned `lastUpdated` locally.
- [x] 5.9 Implement admin upload for palette presets by GUID and store the trusted returned `lastUpdated` locally.
- [x] 5.10 Implement admin upload for stop presets by GUID and store the trusted returned `lastUpdated` locally.
- [x] 5.11 Implement admin upload for textures by GUID, including metadata/blob data, and store the trusted returned `lastUpdated` locally.
- [x] 5.12 Surface remote upload name-conflict rejections so admins know they must rename locally before uploading.
- [x] 5.13 Ensure upload attempts require authenticated admin authorization server-side or through Firebase rules backed by the admin role.

## 6. Verification

- [x] 6.1 Add unit-level tests or focused store/service tests for GUID migration and IndexedDB stop preset migration.
- [x] 6.2 Add tests for metadata-first freshness decisions by GUID and per-entry `lastUpdated`.
- [x] 6.3 Add tests for merge safety: no duplicates by GUID, favorites preserved, local renames preserved, and user-created name collisions disambiguated.
- [x] 6.4 Add tests proving GUID-based texture/skybox references keep working when local display names differ after conflict resolution.
- [x] 6.5 Add UI or component tests for upload icon visibility for unsigned, `guest`, and `admin` states.
- [x] 6.6 Add tests for non-admin remote-origin restrictions: no payload overwrite and no local deletion, but favorites and local renames allowed.
- [x] 6.7 Add tests or mocks proving remote sync failures do not prevent local preset and texture lists from loading.
- [ ] 6.8 Run `npx vue-tsc -b`.
- [ ] 6.9 Run relevant Playwright tests if a WebGPU-capable dev server is available.
