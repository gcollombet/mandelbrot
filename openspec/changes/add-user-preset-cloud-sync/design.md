## Context

The application currently stores user-created records and texture blobs in several browser IndexedDB databases. Firebase is used as an anonymously readable shared catalog whose writes are restricted to admins; remote catalog records are downloaded into the same local stores as local records and marked with `remote` publication metadata. Authentication currently resolves only `guest` and `admin`, so an authenticated non-admin is indistinguishable from an unsigned guest for application behavior.

This change introduces a second remote domain: private per-user libraries. Firebase becomes the durable source of truth for authenticated personal presets and imported textures, while IndexedDB remains the responsive offline cache. The shared catalog remains separate and keeps its explicit admin publication workflow. Legacy browser records with no owner scope are treated as the persistent guest library.

The change crosses authentication, UI, every preset store, texture normalization, Firestore, Storage, Cloud Functions, security rules, synchronization, and migration. Quotas must be enforced by trusted server-side operations rather than by UI counts alone.

## Goals / Non-Goals

**Goals:**
- Synchronize all personal preset categories, thumbnails, favorites, and up to ten normalized personal textures across authenticated devices.
- Limit each account to 400 combined personal presets and 10 combined tile/skybox textures.
- Keep guest data durable and device-local, and offer a simple all-or-nothing copy into a signed-in account without deleting the guest source.
- Isolate local caches between guest and account identities.
- Preserve the public catalog as a distinct layer and keep admins on the same personal synchronization path as ordinary users.
- Restrict JSON file tools to admins while preserving image import for everyone.
- Maintain useful offline behavior and idempotent retry semantics.

**Non-Goals:**
- Providing item-level selection during guest import.
- Deleting or assigning exclusive ownership to guest records after import.
- Making the public catalog consume personal quota or copying every public default into each account.
- Adding collaborative editing, sharing between user accounts, version history, or field-level conflict merging.
- Hiding or restricting ordinary tile/skybox image import as an admin feature.

## Decisions

### D1 - Separate authentication identity from publication privilege

Use three application roles: `guest`, `user`, and `admin`. The authenticated UID selects the personal data scope; the role only controls privileged features. An admin therefore uses the same personal cache, quota, synchronization, and guest-import mechanics as any other signed-in user, with additional catalog publication and JSON debug affordances.

Alternative considered: keep `guest | admin` and inspect `user != null` independently everywhere. Rejected because the existing role value would continue to misdescribe authenticated users and invite inconsistent authorization checks.

### D2 - Keep three data layers explicit

Present a unified library view built from distinct sources:

```
visible library = personal(owner UID) + public catalog + built-ins
```

Personal records carry personal sync metadata; public records carry publication metadata; built-ins remain application assets. Public records are never copied into `users/{uid}` merely because they were displayed or cached. Saving a variant of a public record creates a new personal GUID. Admin publication copies/upserts a personal payload into the existing `catalog/...` namespace and records publication state without changing personal ownership.

Alternative considered: use one remote collection and an owner/public flag. Rejected because public read rules, personal privacy, quotas, deletion semantics, and admin publication become harder to reason about and secure.

### D3 - Use a unified personal preset namespace and separate texture namespace

Store combined personal preset types under an owner path such as:

```
users/{uid}/presets/{guid}       // includes a type discriminator
users/{uid}/textures/{guid}      // metadata only
users/{uid}/usage/current        // trusted counters/revisions
```

Store blobs under:

```
users/{uid}/textures/{guid}.webp
```

The unified preset collection makes the combined 400-record quota unambiguous across complete, palette, stop, texture-mapping, and animation presets. Texture metadata remains separate because blob lifecycle, quota reservation, and reference resolution differ. Documents retain stable GUIDs, content timestamps/revisions, thumbnails where applicable, favorite state, and type-specific payloads.

Alternative considered: one collection per preset type. Rejected because atomically enforcing and explaining a combined 400-record quota would require more distributed counters and reconciliation.

### D4 - Enforce quotas through trusted transactional operations

Use callable HTTPS functions or equivalent trusted endpoints for personal record creation/deletion and texture quota reservation/finalization. In a transaction, a new GUID checks and increments the appropriate usage counter; updating an existing GUID does not increment it; confirmed deletion decrements it. Security rules restrict direct writes that could bypass the counter. App Check can be enabled as defense in depth, but authentication and server-side counters remain authoritative.

Texture upload uses an idempotent reservation keyed by GUID, then uploads the owner-scoped normalized blob and finalizes metadata. Failed or abandoned reservations must expire or be repairable so they do not consume permanent quota. Replacement by existing GUID reuses the slot.

Alternative considered: count local records and rely on UI disabling. Rejected because modified clients could bypass it and generate unbounded billed storage. Alternative considered: query collection count in security rules. Rejected because rules cannot provide the required atomic aggregate quota behavior.

### D5 - Treat IndexedDB as an owner-scoped write-through cache with an outbox

Every local store operation is scoped by `guest` or authenticated UID. Existing unscoped records migrate to `guest`. Authenticated writes update the UI/cache immediately and create an idempotent pending operation keyed by owner, type, GUID, and local revision. A synchronizer submits pending operations, acknowledges trusted server revisions, and pulls newer cloud records. Deletes use tombstone/outbox state so an older cloud copy cannot reappear while offline.

Cache partitioning can use scope-aware compound keys or per-scope database names, but store APIs must require a scope and no UI query may fall back across scopes. Public catalog cache entries remain distinguishable from personal entries.

Whole-record last-write-wins reconciliation is used for acknowledged revisions. A cloud pull may replace a clean cache record; it must not silently discard a newer pending local operation. This matches the document-like preset payloads and avoids brittle field-level merging.

Alternative considered: write Firebase first and update IndexedDB only after success. Rejected because it would make saving feel slow and remove useful offline behavior.

### D6 - Preserve thumbnails in personal cloud documents

Personal preset thumbnails remain synchronized with their records, as requested, rather than being regenerated or kept local-only. The list and sync design must account for the additional transfer size and avoid repeatedly downloading unchanged documents by using GUID/revision metadata. Public thumbnails remain in the public catalog. Thumbnail cost and payload size should be observable so a future optimization can split or compress them without changing preset identity.

Alternative considered: omit personal thumbnails from Firebase. Rejected because the product decision is to retain cross-device previews initially and revisit only if measured usage becomes problematic.

### D7 - Normalize texture assets once before both local and remote persistence

All guest and authenticated image imports follow the same pipeline: decode with orientation applied, proportionally fit inside 1024x1024 without upscaling, encode WebP, generate the thumbnail from the normalized image, then persist that normalized blob. The original file is not retained. A default WebP quality near 0.82 balances appearance and size; encoding failure rejects the import.

Storage metadata records MIME type, byte size, width, and height. Rules enforce owner paths and WebP content type. Because Storage rules cannot reliably inspect decoded dimensions, trusted upload finalization validates declared metadata and the application only publishes/finalizes normalized blobs. The account count limit is enforced independently from file normalization.

Existing local textures larger than 1024 are normalized lazily before their first personal upload or republished catalog upload. Existing public catalog blobs remain readable; they are brought under the new limit when explicitly republished rather than rewritten in bulk.

Alternative considered: retain originals locally and upload a separate derivative. Rejected because it doubles storage, complicates identity, and makes local and cross-device rendering diverge.

### D8 - Model guest import as a non-destructive, all-or-nothing copy

After authentication and initial account usage sync, detect guest GUIDs absent from that account. Show only `Import all` and `Not now`; do not provide item selection or deletion. Before starting, preflight the number of missing presets and textures against both remaining quotas and validate that guest textures can be normalized. If either complete set cannot fit, start no new import and explain the blocking quota.

The user decision is all-or-nothing, while network execution is resumable rather than a cross-service distributed transaction. An import job/batch ID records progress; retries skip account records already present by GUID and finish remaining entries. Guest source records are never modified, removed, relabeled, or hidden. On sign-out the same guest scope is restored, and another account may independently import it.

Alternative considered: claim or move guest records into the first signed-in account. Rejected because login may use the wrong account, the device may be shared, and implicit deletion is surprising. Alternative considered: per-item selection. Deferred to keep the initial experience simple.

### D9 - Gate JSON file tooling in rendering and route imports through normal persistence

All `.json` file input elements, per-entry export actions, bulk export actions, and performance JSON export controls are rendered only for `admin`. Child panels receive explicit role/admin capability rather than independently inferring it. Admin JSON imports enter the admin's personal scope and use normal GUID validation and quotas; admin role does not bypass personal quotas. Image file inputs remain governed by texture rules and are visible to guests/users.

UI gating is not a security boundary. Firebase ownership, quota, and catalog-publication rules continue to reject unauthorized direct calls.

Alternative considered: leave JSON controls visible but disabled. Rejected because the requested behavior is to remove end-user clutter and treat these commands as debug tools.

## Risks / Trade-offs

- [Thumbnail payloads make initial account sync expensive] -> Fetch by revision, avoid re-reading unchanged documents, instrument transferred counts/bytes, and retain the option to split thumbnails later.
- [A client bypasses image resizing] -> Restrict owner paths and MIME types, validate upload metadata/finalization, enforce count quotas server-side, and reject malformed records.
- [Texture upload succeeds but metadata finalization fails] -> Use idempotent reservations, cleanup/repair for orphaned objects, and retry by GUID.
- [Offline edits conflict across devices] -> Use trusted revisions and whole-record resolution; never discard pending local writes silently.
- [Cache scope bug exposes another user's data] -> Make scope a required store API parameter, partition keys/databases, clear active in-memory lists on auth transitions, and add account-switch regression tests.
- [Guest import partially traverses the network] -> Track an import batch and resume idempotently; preserve all guest sources until completion and never present item-level partial choice.
- [Combined quota counters drift from stored documents] -> Provide an admin repair/recount operation and reconciliation tests; make create/delete endpoints transactional and idempotent.
- [Public and personal records with the same name confuse users] -> Use GUID and origin as identity, retain origin badges/permissions, and apply unique display-name behavior without changing GUID.

## Migration Plan

1. Deploy trusted personal-library endpoints, owner-only Firestore/Storage rules, usage documents, and any required indexes while leaving the client feature disabled.
2. Add the `user` role and identity-scoped local store APIs. Migrate all legacy unscoped local records into the `guest` scope; do not upload them automatically.
3. Introduce personal preset sync and quota reconciliation behind a feature flag, then texture reservation/upload/finalization and 1024 WebP normalization.
4. Add the sign-in import offer after account counts and guest inventory are available. Preserve guest data through every path.
5. Merge personal, public, and built-in sources in UI lists and gate JSON tools/admin publication using the resolved role.
6. Exercise account switching, offline retries, quota boundaries, existing oversized textures, import interruption, and catalog publication before enabling the feature broadly.

Rollback disables new client synchronization and guest-import prompts while leaving private cloud data intact. Existing IndexedDB guest and account caches remain readable. Server endpoints and restrictive rules can remain deployed; no rollback deletes user data. A later re-enable reconciles by GUID/revision.

## Open Questions

- No product decisions remain blocking. Thumbnail transfer volume and normalized texture byte sizes should be measured after release to decide whether an additional per-object byte ceiling or thumbnail split is warranted.
