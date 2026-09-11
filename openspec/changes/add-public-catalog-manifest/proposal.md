## Why

The public catalogue synchronizer intends to compare lightweight GUID and `lastUpdated` metadata with IndexedDB before downloading changed payloads, but its metadata queries currently download every complete Firestore document on every page load. This produces avoidable document reads and network transfer, while remote deletions are not reconciled into the public cache.

## What Changes

- Add one authoritative public catalogue manifest document containing only each entry's type, GUID, and `lastUpdated` timestamp.
- Replace the six public collection-list queries with one manifest-document read during page-load synchronization.
- Fetch complete Firestore documents and texture blobs only for manifest entries that are missing locally or newer than their cached public entry.
- Remove cached public entries whose type/GUID pair is absent from the complete manifest, without deleting built-in, guest, or personal entries.
- Update the manifest atomically whenever an administrator publishes, updates, or deletes a public catalogue entry.
- Add an explicit administrative migration that builds and validates the manifest before the manifest-only client is deployed.
- **BREAKING**: Remove the legacy collection-list synchronization path. A missing, invalid, or unsupported manifest is a non-blocking remote-sync failure and never falls back to listing full catalogue collections.
- Keep App Check and Cloud Functions regional changes outside this migration so its billing effect remains independently measurable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `remote-preset-catalog`: Make a complete lightweight manifest authoritative for metadata-first public catalogue synchronization and reconcile remote deletions from the public IndexedDB cache.

## Impact

- Public catalogue Firestore schema and security rules.
- `src/remoteCatalog.ts`, `src/remoteCatalogSync.ts`, catalogue publication/deletion paths, and the six IndexedDB-backed catalogue stores.
- A one-time Admin SDK migration/validation command and focused unit/function tests.
- Deployment order becomes migration first, manifest-only client second, and public collection-list denial last.
