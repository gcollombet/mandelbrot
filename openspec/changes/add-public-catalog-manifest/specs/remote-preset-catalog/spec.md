## ADDED Requirements

### Requirement: Authoritative public catalogue manifest
The system SHALL represent the complete shared public catalogue with one versioned Firestore manifest document containing only each entry's catalogue type, GUID, and `lastUpdated` value.

#### Scenario: Catalogue synchronization begins
- **WHEN** the application performs its page-load public catalogue synchronization
- **THEN** it reads and validates exactly one public catalogue manifest document before considering any complete payload fetch

#### Scenario: Manifest is invalid or unavailable
- **WHEN** the manifest is missing, malformed, duplicated by type/GUID, or uses an unsupported schema version
- **THEN** synchronization fails non-blockingly, preserves local data, and does not list any public catalogue entry collection

### Requirement: Atomic manifest publication
The system SHALL update a public entry document and its manifest metadata atomically whenever an administrator publishes or updates that entry through the supported application path.

#### Scenario: Administrator publishes an entry
- **WHEN** an authorized administrator publishes a new or changed public catalogue entry
- **THEN** the entry document and matching manifest type/GUID/`lastUpdated` metadata are committed in one Firestore transaction with the same timestamp

#### Scenario: Manifest has not been migrated
- **WHEN** an administrator attempts publication before a valid manifest exists
- **THEN** publication fails without writing either a payload document or partial manifest state

### Requirement: Explicit catalogue manifest migration
The system SHALL provide an idempotent administrative migration that validates all canonical public entries and writes the complete manifest only after validation succeeds.

#### Scenario: Migration dry-run succeeds
- **WHEN** the administrator runs the migration without apply mode
- **THEN** it reports per-type entry counts and manifest size without changing Firestore

#### Scenario: Migration is applied
- **WHEN** the validated migration runs in apply mode
- **THEN** it replaces `catalogManifest/current` with a deterministic complete manifest and does not rewrite public payload documents

#### Scenario: Migration validation fails
- **WHEN** an entry has an invalid GUID, unsupported type, invalid timestamp, duplicate type/GUID pair, or the manifest exceeds its size ceiling
- **THEN** the migration fails without writing the manifest

### Requirement: Public catalogue read boundaries
The system SHALL allow anonymous reads of the manifest and individual public entry documents while denying anonymous collection-list queries after cutover.

#### Scenario: Unsigned client reads supported catalogue data
- **WHEN** an unsigned client gets `catalogManifest/current` or a known individual public entry document
- **THEN** Firestore rules allow the read

#### Scenario: Unsigned client lists a catalogue collection
- **WHEN** an unsigned client attempts to enumerate public entry documents
- **THEN** Firestore rules deny the list operation

#### Scenario: Administrator checks for a name conflict
- **WHEN** an authenticated administrator queries a public entry collection during publication
- **THEN** Firestore rules allow the list operation

## MODIFIED Requirements

### Requirement: Catalog types
The system SHALL support remote catalogue synchronization for complete presets, palette presets, stop presets, textures, texture-mapping presets, and animation presets.

#### Scenario: All catalogue types are eligible for sync
- **WHEN** the application performs remote catalogue synchronization
- **THEN** it evaluates complete presets, palette presets, stop presets, textures, texture-mapping presets, and animation presets independently

### Requirement: Metadata-first synchronization
The system SHALL fetch the complete public catalogue manifest before fetching full catalogue entry payloads or texture blobs, and SHALL use its type/GUID/`lastUpdated` metadata to decide which payloads to download and which cached public entries to remove.

#### Scenario: Manifest is fetched
- **WHEN** the application performs remote catalogue synchronization
- **THEN** it performs one manifest-document read and does not list any public entry collection

#### Scenario: Unchanged entry is skipped
- **WHEN** a local public entry has the same type and GUID as a manifest entry and its `lastUpdated` value is equal to or later than the manifest value
- **THEN** the system does not fetch the complete remote entry payload or texture blob

#### Scenario: Missing entry is fetched
- **WHEN** the manifest contains a type/GUID pair that does not exist in the matching local public cache
- **THEN** the system fetches the complete remote entry payload for that GUID

#### Scenario: Changed entry is fetched
- **WHEN** the manifest contains a type/GUID pair whose `lastUpdated` value is newer than its matching local public cache entry
- **THEN** the system fetches the complete remote entry payload for that GUID

### Requirement: Remote deletion retention
The system SHALL remove a locally cached public-origin catalogue entry when its type/GUID pair is absent from the complete validated remote manifest, while preserving every built-in, guest, and personal record.

#### Scenario: Remote public entry is removed
- **WHEN** a previously synchronized public-origin entry no longer appears in the complete manifest
- **THEN** the system removes that entry from the matching local public cache, including its cached texture blob when applicable

#### Scenario: Non-public entry shares an absent GUID
- **WHEN** a built-in, guest, personal, pending, or tombstoned record has a type/GUID pair absent from the manifest
- **THEN** public catalogue reconciliation does not delete or modify that record

### Requirement: Best-effort synchronization
The system SHALL continue loading local catalogue data if the manifest or an individual entry fetch fails, without falling back to public collection-list queries.

#### Scenario: Firebase or manifest is unavailable
- **WHEN** the page loads and the public catalogue manifest cannot be read or validated
- **THEN** the system logs a non-blocking synchronization failure, performs no public collection listing, and continues using local stored entries

#### Scenario: Individual changed entry fails
- **WHEN** a manifest entry requires a complete payload fetch and that fetch fails
- **THEN** the system preserves the existing local entry when present, continues best-effort processing, and can retry on the next page load
