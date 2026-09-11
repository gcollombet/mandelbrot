## Context

The signed-in personal library already stores canonical records in Firestore and WebP blobs in Firebase Storage, but all mutations pass through Gen 2 callable functions. With billing disabled those functions and Storage are unavailable; the user has chosen Blaze so Storage can remain, while asking to remove the Functions dependency. Existing document and object paths can be retained.

The browser currently maintains an owner-scoped IndexedDB cache, a compact preset manifest, whole-record revisions, usage counters, texture reservations, resumable guest-import batches, and offline retry state. The migration must preserve those contracts without a compatibility fallback to callable endpoints.

## Goals / Non-Goals

**Goals:**
- Remove every runtime dependency on Firebase Functions and the HTTP role endpoint.
- Preserve direct owner-only Firestore/Storage persistence and the current paths/data.
- Keep atomic preset/manifest/usage updates and texture reservation/finalization transactions.
- Keep normal-client 400-preset and 10-texture limits, validation, revisions, cleanup, and repair.
- Strengthen Firestore/Storage rules enough to reject cross-owner writes, malformed records, oversized/non-WebP blobs, and public-catalog escalation.
- Provide deployment and rollback sequencing that never exposes owner data publicly.

**Non-Goals:**
- Guarantee an abuse-proof aggregate quota against a deliberately modified authenticated client without any trusted backend.
- Change IndexedDB scoping, public catalogue synchronization, texture normalization, or UI behavior.
- Move blobs into Firestore or change existing Firebase paths.
- Preserve callable-function compatibility after cutover.

## Decisions

### D1 - Use current Firebase Authentication as the write identity

Every mutation obtains `auth.currentUser.uid` from the initialized Firebase services. Caller-provided UIDs remain accepted only by read helpers that already need an explicit owner path, and those reads are still constrained by rules. Mutations never trust a UID supplied as payload data.

Role resolution reads `admins/{uid}` directly. An existing document grants `admin`; any authenticated user without one is `user`; failed reads are fail-closed to `user`. The HTTP endpoint and role environment variable are removed.

### D2 - Port callable preset operations to Firestore transactions

`getPersonalPresetManifest` reads `users/{uid}/manifests/presets`; a new account atomically creates an empty manifest and zeroed usage document. Existing accounts are expected to have been migrated before cutover and there is no collection-list compatibility reconstruction in the runtime.

Preset upsert and delete transactions read the target, usage, and manifest documents; validate GUID/type/payload; calculate count and record revision; and commit target, manifest, and usage together with server timestamps. The existing manifest normalization helpers move into shared browser code so synchronization behavior stays unchanged.

### D3 - Keep the reservation/upload/finalize texture protocol

Reservation remains a Firestore transaction keyed by `<guid>.webp`, increments the texture counter only when neither metadata nor a reservation already consumes a slot, and expires after 30 minutes. Storage upload remains direct and is already constrained to owner paths.

Finalization reads Storage object metadata in the browser, validates WebP MIME and byte size against the normalized metadata, then transactionally writes the texture document and removes the reservation. Deletion transactionally updates metadata/reservation/usage and then deletes the owner object. Object-not-found is idempotent. Expired reservation repair becomes an owner query plus per-reservation transaction and best-effort object cleanup.

### D4 - Make Firebase rules the authorization and shape boundary

Firestore rules allow an authenticated owner to read/list and write only their subtree. Preset, manifest, usage, texture, reservation, and import-batch writes validate immutable owner/GUID/path fields, supported types/statuses, revisions, counter ranges, manifest size, WebP metadata, and timestamps. Public catalogue authorization remains unchanged.

Storage rules allow the owner to create/update/delete only `users/{uid}/textures/{guid}.webp`, with WebP MIME and 5 MiB maximum on writes. Reads remain owner-only.

These rules stop cross-account access and bound each object/document, but Firestore rules cannot atomically count an arbitrary collection. Consequently, the 400/10 aggregate counters are a safety invariant of the official transactional client, not a hard anti-abuse boundary. Restoring an adversarial hard quota would require a trusted backend or a fixed-slot data model.

### D5 - Remove deployable Functions while retaining maintenance scripts

The `functions` deployment block, `functions/index.js`, and `firebase-functions` dependency are removed. `functions/` remains as a local Admin SDK tools package for catalogue/personal migration and pure tests. This avoids accidentally redeploying obsolete endpoints while preserving operational scripts.

### D6 - Preserve current data and migrate metadata before client cutover

Because document and blob paths do not change, existing personal payloads and textures require no copy. A dry-run-first Admin SDK script enumerates existing user preset/texture documents, validates them, and creates or repairs each user's preset manifest and usage counters. It does not modify payload documents or Storage objects.

## Risks / Trade-offs

- [A modified authenticated client lowers counters or omits manifest entries] -> Rules bound per-document/object writes and owner scope; document this limitation and use App Check or restore a trusted backend if public abuse appears.
- [Client crashes after blob upload but before metadata finalization] -> Reservation repair releases the counter and deletes the known object; retries are idempotent by GUID.
- [Client crashes after Firestore texture delete but before Storage delete] -> Deletion is retried from local tombstone and Storage object-not-found is accepted.
- [Rules deploy before the new client] -> Existing callable functions use Admin SDK and remain unaffected, but Storage delete behavior changes; deploy rules, then client, verify, and only then delete old functions.
- [Client deploys before owner-write rules] -> All direct writes fail safely and remain pending locally; deploy rules before enabling/deploying the direct client.
- [Legacy account lacks a manifest] -> Run the migration script before cutover; runtime creates an empty manifest only for genuinely empty/new accounts and does not perform an expensive collection fallback.

## Migration Plan

1. Re-enable Blaze billing and confirm Firestore and Firebase Storage access.
2. Run the personal-library metadata migration in dry-run mode, review per-user counts and quota violations, then apply it.
3. Deploy Firestore and Storage rules that authorize validated owner writes.
4. Deploy the direct-client build with role/callable endpoint variables removed.
5. Verify sign-in, preset create/update/delete, texture upload/download/delete, cross-device hydration, guest import, and public admin publication.
6. Delete the obsolete deployed Cloud Functions only after direct flows pass.
7. Monitor Firestore reads/writes, Storage bytes/operations, and billing alerts.

Rollback restores the prior client and Functions deployment while leaving the same Firestore/Storage data intact. Rules can temporarily retain both owner direct writes and Admin SDK access because Admin SDK bypasses rules.

## Open Questions

None blocking. App Check and a fixed-slot hard-quota schema remain optional security follow-ups if the app becomes open to untrusted high-volume accounts.
