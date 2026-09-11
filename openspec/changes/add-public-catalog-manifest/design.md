## Context

The browser keeps public catalogue entries in owner-scoped IndexedDB stores and already compares each remote GUID/`lastUpdated` pair before fetching a full payload. The current metadata step defeats that design: `getDocs()` lists each of six Firestore entry collections, transfers every complete document, and only then maps the received data to lightweight metadata. It also leaves public cache entries behind after their remote document is removed.

The application uses the Firebase Web SDK, which does not expose field projections for these queries. A separate compact document is therefore required to reduce both billed reads and transferred bytes. The existing personal-preset synchronizer already demonstrates the desired complete-manifest reconciliation pattern.

## Goals / Non-Goals

**Goals:**
- Reduce every unchanged page-load catalogue check to one small Firestore document read.
- Preserve the existing GUID/`lastUpdated` freshness rule and local-first IndexedDB behavior.
- Fetch complete payloads and texture blobs only for missing or newer entries.
- Treat absence from the complete manifest as deletion for cached public-origin entries only.
- Keep catalogue publication and the manifest consistent in one Firestore transaction.
- Provide and execute a validated one-time migration before relying on the manifest.
- Remove the production collection-list fallback entirely.

**Non-Goals:**
- Move public payloads out of Firestore or Firebase Storage.
- Add App Check, change Cloud Functions regions, or change billing alerts.
- Delete built-in, guest, or personal records when reconciling public entries.
- Add live listeners or mid-session catalogue refresh.
- Add a new administrator deletion UI.

## Decisions

### D1 - Store one complete manifest document

Use `catalogManifest/current` with schema version 1:

```text
{
  schemaVersion: 1,
  entries: [
    { type: "completePreset", guid: "...", lastUpdated: Timestamp },
    ...
  ],
  updatedAt: Timestamp
}
```

The list is sorted by type then GUID for deterministic migration output. `type`, `guid`, and `lastUpdated` are the only per-entry fields: names and payload fields are obtained from the complete entry only when the cache needs it. The migration validates the serialized manifest remains comfortably below Firestore's document-size limit.

Alternative considered: one metadata document per catalogue entry. Rejected because it would reduce bandwidth but retain one billed read per entry. Alternative considered: a callable function using server-side projections. Rejected because it would still read every entry on the server and add another request path.

### D2 - Require the manifest and never list public collections

`listAllRemoteCatalogMetadata()` is replaced by a single `getPublicCatalogManifest()` read. The client validates the schema, supported catalogue types, non-empty GUIDs, parseable timestamps, and uniqueness of each type/GUID pair. Missing, malformed, oversized, or unsupported manifests cause the existing non-blocking synchronization failure behavior; local IndexedDB data and built-ins remain available.

There is deliberately no runtime migration or collection-list fallback. This prevents an invalid deployment from silently restoring the expensive behavior.

### D3 - Maintain payload and manifest atomically during publication

Admin publication continues through `uploadRemoteCatalogEntry`, but the function uses a Firestore transaction after the existing admin-only name-conflict check. It reads the manifest, assigns one shared `Timestamp.now()` value to the payload's `lastUpdated`, replaces or appends that type/GUID entry, and writes both documents atomically. The manifest is required; publication fails if migration has not created a valid manifest.

Using the same timestamp object in both writes avoids a manifest/payload freshness mismatch. A callable function was considered but would broaden this migration into a new backend API for an infrequent admin-only operation.

### D4 - Reconcile remote absence only for public-origin cache records

For every catalogue type, synchronization builds the remote GUID set and removes local records that are marked `origin: 'public'` (or normalize as legacy remote-origin records) but are absent from the manifest. Existing store deletion functions are used so texture metadata and blobs are removed together. Built-ins, guest records, personal records, pending writes, and tombstones are never candidates.

The previous retention behavior is intentionally replaced because the manifest is a complete authoritative snapshot, not a partial query result.

### D5 - Migrate with an Admin SDK script and publish the manifest last

Add `functions/scripts/migrate-public-catalog-manifest.js`. It reads the six existing entry collections with Admin SDK privileges, validates document GUID/type/timestamp invariants and duplicate keys, sorts the entries, checks encoded size, and prints a summary. Dry-run is the default; `--apply` writes only `catalogManifest/current` after all validation succeeds. It does not rewrite payload documents.

Publishing the manifest last makes a partial migration harmless. The script is idempotent: re-running it reconstructs the complete manifest from canonical payload documents.

### D6 - Prevent public collection enumeration after cutover

Firestore rules allow anonymous `get` on `catalogManifest/current` and individual catalogue entry documents. Public `list` is denied; authenticated admins retain `list` so the existing name-conflict query continues to work. Manifest writes remain admin-only and validate the top-level schema shape. Catalogue deletes use a separate admin-only rule because deleted documents have no `request.resource.data`.

## Risks / Trade-offs

- [The manifest approaches Firestore's 1 MiB document limit] -> Fail migration and publication before writing an oversized manifest; shard by type only in a future explicit schema migration if measured growth requires it.
- [An admin's local clock is incorrect] -> Publication uses one Firestore `Timestamp.now()` value consistently for payload and manifest; timestamps remain monotonic in normal admin operation, and the repair migration can rebuild inconsistencies.
- [An invalid manifest would hide a remote update] -> Fail synchronization visibly in logs while preserving local data; provide an idempotent reconstruction script and no destructive fallback.
- [Old cached clients still issue list queries] -> Deploy the manifest and new client before denying public list; after denial, old clients retain their local-first fallback rather than generating reads.
- [A GUID absent from the manifest is deleted from the wrong local layer] -> Require public origin/legacy remote metadata in addition to absence, with focused tests for built-in, guest, and personal collisions.
- [Direct console edits bypass manifest maintenance] -> Treat the Admin SDK reconstruction command as the repair path and document that normal publication must use the application transaction.

## Migration Plan

1. Add the manifest contracts, validator, one-document reader, atomic publication update, deletion reconciliation, migration script, and tests.
2. Run the migration script in dry-run mode against `gcollombet-mandelbrot`; compare per-type counts and validate size.
3. Run it with `--apply` to create `catalogManifest/current` without modifying existing payloads.
4. Deploy the manifest-only application while the old read rules still permit existing cached clients.
5. Deploy Firestore rules that deny anonymous collection listing but retain anonymous individual gets and admin listing.
6. Verify Firestore document-read and outbound-transfer metrics after deployment.

Rollback can restore the previous client and public list rule; the additive manifest document can remain. No payload or local personal data needs to be reverted.

## Open Questions

None blocking. App Check remains a separate follow-up after the manifest's billing impact is measured.
