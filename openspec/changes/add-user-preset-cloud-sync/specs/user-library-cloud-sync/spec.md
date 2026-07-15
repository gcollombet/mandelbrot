## ADDED Requirements

### Requirement: Authenticated personal library synchronization
The system SHALL use Firebase as the durable source of truth for an authenticated user's personal complete, palette, stop, texture-mapping, and animation presets, including user-visible thumbnails and favorites, while serving the active UI from an owner-scoped IndexedDB cache.

#### Scenario: Signed-in user creates a preset
- **WHEN** an authenticated user saves a new personal preset
- **THEN** the system writes it to the current user's local cache and schedules it for persistence in that user's Firebase library

#### Scenario: User opens the application on another device
- **WHEN** an authenticated user opens the application on a device whose cache does not contain the user's cloud presets
- **THEN** the system downloads the user's personal records and populates the owner-scoped cache with their content, thumbnails, favorites, and stable GUIDs

#### Scenario: Firebase is temporarily unavailable
- **WHEN** an authenticated user changes a personal preset while Firebase is unavailable
- **THEN** the system retains the change in the user's cache as pending and retries synchronization without blocking local use

### Requirement: Account-scoped cache isolation
The system SHALL isolate the guest library and every authenticated user's cache so that switching identities never exposes another scope's personal records.

#### Scenario: User signs out
- **WHEN** an authenticated user signs out
- **THEN** the system stops displaying that user's cached library and restores the unchanged guest library for the browser

#### Scenario: A different user signs in
- **WHEN** a second account signs in on a browser that previously cached another account
- **THEN** the system displays only the second account's personal cache plus shared public catalog entries

### Requirement: Personal preset quota
The system SHALL enforce a combined maximum of 400 personal preset records per authenticated account across complete, palette, stop, texture-mapping, and animation preset categories.

#### Scenario: User creates a preset below the quota
- **WHEN** an account contains fewer than 400 personal presets and the user creates a new one
- **THEN** the trusted persistence path accepts the creation and increments the account's preset usage

#### Scenario: User reaches the quota
- **WHEN** an account already contains 400 personal presets and the user attempts to create another
- **THEN** the system rejects the creation with a quota message and does not create a cloud or durable local-only personal record

#### Scenario: User updates an existing preset
- **WHEN** an account at the quota updates a preset whose GUID already exists in that account
- **THEN** the system accepts the update without consuming another quota slot

#### Scenario: User deletes a personal preset
- **WHEN** deletion of a personal preset is confirmed by the trusted persistence path
- **THEN** the preset usage decreases and the freed slot can be reused

#### Scenario: Shared catalog entries are displayed
- **WHEN** public default presets are merged into the visible library
- **THEN** those shared records do not count toward the user's 400 personal preset limit

### Requirement: Guest library remains device-local
The system SHALL keep unsigned guest presets and textures in a persistent browser-local guest scope and SHALL NOT synchronize them automatically before the user consents to import.

#### Scenario: Guest creates local content
- **WHEN** an unsigned guest creates a preset or imports a texture
- **THEN** the system stores it in the browser's guest scope and does not write it to a user Firebase path

#### Scenario: Guest reloads the application
- **WHEN** the guest returns using the same browser storage
- **THEN** the guest library remains available

### Requirement: All-or-nothing guest library import offer
The system SHALL offer an authenticated user a single choice to import all eligible guest-library content into the account or leave the guest library unchanged, without item-level selection or automatic deletion.

#### Scenario: User signs in with guest content present
- **WHEN** a user signs in and the browser guest scope contains records not already present in that account by GUID
- **THEN** the system displays an offer to import the complete missing guest library with actions to import everything or decline

#### Scenario: User declines import
- **WHEN** the user declines the guest-library import offer
- **THEN** no guest record is copied or removed and the guest library remains available after sign-out

#### Scenario: User accepts import within quota
- **WHEN** the user accepts import and all missing guest presets and textures fit within the account's remaining quotas
- **THEN** the system copies all missing guest records to the account while preserving the guest source records

#### Scenario: Complete import exceeds quota
- **WHEN** the full set of missing guest records would exceed either personal quota
- **THEN** the system does not offer a partial selection, does not start a new import, and explains which quota prevents the complete import

#### Scenario: Import is retried
- **WHEN** a guest-library import is retried after interruption
- **THEN** the system uses owner scope and GUID identity to resume without duplicating records already persisted for that account

### Requirement: Whole-record conflict handling
The system SHALL reconcile personal records by owner scope, GUID, trusted revision, and update timestamp while preserving pending local changes until they are acknowledged or explicitly superseded.

#### Scenario: Cloud record is newer and no local write is pending
- **WHEN** synchronization finds a newer cloud revision for a cached GUID with no pending local change
- **THEN** the system replaces the cached personal payload with the cloud payload

#### Scenario: Local write is pending
- **WHEN** synchronization sees a cloud revision while a newer local write for the same GUID is pending
- **THEN** the system does not silently discard the pending local write and resolves the whole-record update through the trusted synchronization path

#### Scenario: Delete is queued offline
- **WHEN** an authenticated user deletes a personal preset while offline
- **THEN** the cache hides the record, retains a pending deletion, and prevents an older cloud copy from reappearing before the deletion is resolved

### Requirement: Personal and public libraries remain distinct
The system SHALL present personal records and public catalog defaults as a combined view without copying public defaults into personal Firebase collections.

#### Scenario: User views a public default
- **WHEN** a guest or authenticated user views a public catalog preset
- **THEN** the entry remains a public read-only record and consumes no personal quota

#### Scenario: User saves a variant of a public default
- **WHEN** a non-admin user modifies a public default and saves it
- **THEN** the system creates a new personal record with a new GUID instead of overwriting the public entry

#### Scenario: Admin publishes a personal preset
- **WHEN** an admin activates the existing publication action on a personal preset
- **THEN** the system publishes or updates the separate public catalog entry without changing the personal synchronization mechanics
