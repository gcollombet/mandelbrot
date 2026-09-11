## ADDED Requirements

### Requirement: Direct authenticated personal persistence
The system SHALL persist personal presets, manifests, usage data, texture metadata, import batches, and texture blobs directly through the Firebase Web SDK without invoking Firebase Cloud Functions.

#### Scenario: Signed-in user synchronizes a preset
- **WHEN** the official client creates, updates, or deletes a personal preset
- **THEN** it atomically updates the owner preset, compact manifest, usage counter, and revision state directly in Firestore

#### Scenario: Signed-in user synchronizes a texture
- **WHEN** the official client creates, replaces, or deletes a normalized personal texture
- **THEN** it performs the owner Firestore reservation/finalization transaction and Firebase Storage operation directly

### Requirement: Existing personal data remains canonical
The system SHALL retain the existing `users/{uid}` Firestore paths and `users/{uid}/textures/{guid}.webp` Storage paths and SHALL require a one-time metadata migration rather than runtime callable compatibility.

#### Scenario: Existing account is migrated
- **WHEN** the migration scans an existing account
- **THEN** it reconstructs and validates that account's preset manifest and usage counters without rewriting preset payloads or texture objects

#### Scenario: New account initializes
- **WHEN** an authenticated account with no personal records first synchronizes
- **THEN** the client atomically creates an empty preset manifest and zeroed usage document

### Requirement: Owner-only Firebase access
The system SHALL allow authenticated users to access only their own personal Firestore documents and Storage objects, and SHALL reject cross-account access and public-catalog privilege escalation.

#### Scenario: Owner writes valid personal data
- **WHEN** an authenticated user writes a schema-valid document or WebP object under their own UID
- **THEN** Firebase Security Rules permit the operation

#### Scenario: User targets another UID
- **WHEN** an authenticated user reads or writes a personal document or object under another UID
- **THEN** Firebase Security Rules reject the operation

### Requirement: Direct-client quota safeguards
The official client SHALL transactionally enforce a combined limit of 400 personal presets and 10 personal textures, and Firebase rules SHALL bound counter values and individual payload/object sizes.

#### Scenario: New preset exceeds normal-client quota
- **WHEN** the official client observes 400 existing personal preset slots and attempts to create a new GUID
- **THEN** it rejects the write before committing any preset, manifest, or usage change

#### Scenario: New texture exceeds normal-client quota
- **WHEN** the official client observes 10 counted textures/reservations and attempts to reserve a new GUID
- **THEN** it rejects the reservation and performs no upload

#### Scenario: Deliberately modified client manipulates counters
- **WHEN** an authenticated client bypasses the official transaction implementation
- **THEN** owner, schema, counter-range, MIME, and per-object-size rules still apply, but the system does not claim an aggregate abuse-proof quota without a trusted backend

### Requirement: Direct texture lifecycle recovery
The system SHALL preserve idempotent texture reservations, Storage metadata validation, deletion, and abandoned-reservation repair without callable functions.

#### Scenario: Texture finalizes successfully
- **WHEN** an owner uploads a bounded WebP whose Storage metadata matches the declared normalized metadata
- **THEN** the client writes the next texture revision and removes the reservation transactionally

#### Scenario: Texture reservation expires
- **WHEN** the owner repairs a reservation that expired without finalized metadata
- **THEN** the client releases any counted slot, deletes the reservation, and best-effort deletes the orphaned object

### Requirement: No Functions runtime dependency
The application SHALL contain no browser request to the HTTP role endpoint or personal-library callable functions, and the Firebase deployment configuration SHALL not deploy an obsolete Functions runtime.

#### Scenario: Local application starts
- **WHEN** the app runs from `http://localhost:5173`
- **THEN** personal-library and role operations use Firestore/Storage directly and emit no Cloud Functions CORS request

#### Scenario: Firebase deployment runs
- **WHEN** the project Firebase configuration is deployed
- **THEN** it deploys Firestore and Storage configuration without redeploying removed callable endpoints
