## Context

The app currently loads shared defaults from bundled JSON or TypeScript constants, migrates older `localStorage` entries, and persists user content in browser storage. Complete presets, palette presets, and textures use IndexedDB stores; stop presets currently use `localStorage`. This change moves all catalog types, including stop presets, into IndexedDB. Favorites are local user state and must remain local.

The requested change adds Firebase as a remote source of shared catalog entries for complete presets, palette presets, stop presets, and textures. Remote entries are not used directly by the renderer or editors. The app fetches remote metadata at page load, diffs entries by GUID and `lastUpdated`, fetches only missing or changed payloads/blobs, then saves them into local IndexedDB so existing UI loading paths continue to work.

Authentication is only required for upload and remote catalog mutation. All users can read shared catalog data without signing in. Signed-in users get their role from an endpoint; only `admin` users see upload affordances and can create or update remote catalog entries.

## Goals / Non-Goals

**Goals:**

- Keep the app local-first after page-load synchronization.
- Support remote catalog synchronization for complete presets, palette presets, stop presets, and textures.
- Store every catalog type in IndexedDB.
- Use GUIDs as the stable identity for local entries, remote entries, and cross-entry references.
- Track freshness per catalog entry with `lastUpdated` and fetch only missing or changed payloads/blobs.
- Preserve local user data, including favorites, local renames, and user-created entries, when remote entries are merged.
- Add Google OpenID Connect sign-in and role-based admin upload controls.
- Allow admins to create or update remote entries by GUID while rejecting remote name conflicts.

**Non-Goals:**

- Real-time catalog updates during an active session.
- General user accounts, user-owned private presets, or cloud backup of personal favorites.
- Offline-first upload queues.
- Admin role management UI.
- Replacing the existing local storage APIs with Firebase reads at render time.
- Deleting local entries just because they were deleted from Firebase.

## Decisions

1. Use a small catalog service layer between UI/storage modules and Firebase.

   The app should add a `remoteCatalog` service responsible for Firebase initialization, version metadata reads, entry reads, uploads, and local sync bookkeeping. This keeps Firebase-specific code out of `Settings.vue`, palette editors, and the existing storage modules.

   Alternative considered: add Firebase calls directly to each store module. That would minimize files initially but would duplicate version checks and auth/error handling across four stores.

2. Use GUIDs as the only catalog identity.

   Every complete preset, palette preset, stop preset, and texture gets a GUID. Existing local entries without GUIDs are migrated by assigning `crypto.randomUUID()` values. Firebase stores entries by the same GUID, and complete presets reference textures/environment textures by GUID when available. Names remain user-facing labels, not stable references.

   Alternative considered: maintain a separate remote id in addition to local ids. A single GUID is simpler and avoids mapping tables while still preventing collisions without coordination.

3. Keep names unique per catalog type but do not use names as identity.

   Local stores and Firebase should reject duplicate names within the same catalog type. When a remote import conflicts with a different local GUID that already uses the same name, the importer assigns a unique local display name such as `Gold (2)` while preserving the imported GUID. Local display names are local catalog state and are preserved across later remote updates, so users can rename conflict-resolved entries without fighting synchronization. If an admin uploads a local entry whose submitted name conflicts with a different remote GUID, Firebase rejects the upload and the admin must rename locally first.

   Alternative considered: use names as merge keys. This breaks texture references and remote preset dependencies when local conflict resolution changes display names.

4. Use metadata-first per-entry diffing.

   Firebase will expose metadata lists containing at least GUID, name, and `lastUpdated` for every catalog type. The browser compares each remote metadata item with its local entry by GUID. Full preset payloads and texture blobs are fetched only when the local entry is missing or older than the remote metadata.

   Alternative considered: keep only a per-type `lastUpdated` and fetch the whole type when newer. This is simpler but wastes bandwidth and is especially expensive for textures.

5. Store imported remote entries through local IndexedDB stores.

   Complete presets, palettes, stop presets, and textures should all be imported through IndexedDB-backed APIs. Existing UI lists should continue to call local `getAll...` functions after the storage modules are updated.

   Alternative considered: display Firebase entries directly in UI alongside local entries. That would require each UI surface to handle mixed remote/local data and would make offline behavior inconsistent.

6. Restrict remote-origin mutations for non-admin users.

   Non-admin users can favorite remote-origin entries and rename them locally for display, but they cannot overwrite remote-managed payload fields or delete remote-origin entries from the local catalog. Users who want a custom version should create a local variant with a new GUID. This prevents local edits from being overwritten by later admin updates and keeps sync semantics simple.

   Alternative considered: allow arbitrary local edits to remote-origin entries and resolve conflicts during sync. That creates unclear behavior when Firebase later publishes an update for the same GUID.

7. Gate upload UI and upload calls by resolved role.

   The UI should show an upload icon on each catalog dropdown row next to the favorite heart only when the signed-in user role is `admin`. The upload service must still require an authenticated token and successful admin role server check before writing remote catalog data, because hidden UI is not security.

   Alternative considered: rely on Firebase security rules alone without a role endpoint. The request explicitly requires an endpoint that returns `guest` or `admin`, and the UI needs this role to decide whether to show upload controls.

8. Do not mirror remote deletions into local deletion.

   If a remote entry disappears from Firebase metadata, local entries with that GUID remain in IndexedDB. This keeps user libraries stable and avoids destructive sync surprises. Remote deletion can be treated as stopping future distribution rather than retracting content from browsers that already imported it.

   Alternative considered: delete local entries when absent remotely. That is a true mirror model, but it can remove content users still expect to have locally.

## Risks / Trade-offs

- Remote import duplicates local entries -> Use GUID as the only stable identity and merge by GUID.
- Remote import overwrites local favorites -> Preserve local-only fields when updating records from remote catalog data.
- Texture sync becomes expensive -> Fetch metadata first and fetch blobs only for missing or changed texture GUIDs.
- Upload appears for non-admin users due to stale role state -> Default to `guest`, clear role on sign-out/token failure, and enforce role on the upload endpoint.
- Firebase/network failure blocks startup -> Treat sync as best-effort, log failures, and continue with local stored entries.
- Existing stop presets use `localStorage` -> Migrate them to IndexedDB with GUIDs and stop reading from localStorage afterward.
- Admin upload of a duplicate name creates ambiguous remote labels -> Enforce remote name uniqueness per type and reject uploads whose name is already used by another GUID.
- Remote deletion unexpectedly removes local content -> Do not delete local entries solely because they are absent from remote metadata.

## Migration Plan

1. Add GUID fields and migrations for existing complete presets, palettes, stop presets, and textures.
2. Migrate stop presets from localStorage to IndexedDB.
3. Add remote catalog configuration and service code behind environment-driven Firebase settings.
4. Add metadata-first sync for each catalog type using GUID and per-entry `lastUpdated`.
5. Add GUID-based texture and skybox references for complete presets, with name fallback for legacy records.
6. Add Google sign-in, role lookup, and admin-only upload controls.
7. Add admin upload paths for all catalog types that create/update by GUID, enforce remote name uniqueness, and store trusted remote `lastUpdated` values locally.
8. If rollout fails, disable Firebase configuration or remote sync initialization; local bundled/default behavior remains usable.

## Open Questions

- What exact endpoint URL and response schema will provide the `guest`/`admin` role?
- What maximum texture size should uploads allow?
- Should local conflict names use `Name (2)` or another generated suffix pattern?
