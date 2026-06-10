# openid-admin-upload Specification

## Purpose
Defines user authentication via Google OpenID Connect, role resolution (`guest` vs `admin`), and catalog upload authorization rules.

## Requirements

### Requirement: Google OpenID Connect sign-in
The system SHALL provide a Google OpenID Connect sign-in control for users who want to authenticate.

#### Scenario: User signs in with Google
- **WHEN** a user activates the Google sign-in control and completes authentication
- **THEN** the system stores the authenticated session state for the current browser session according to the authentication provider behavior

#### Scenario: User signs out
- **WHEN** a signed-in user activates sign-out
- **THEN** the system clears the local authenticated user state and treats the user as `guest`

### Requirement: Role lookup
The system SHALL call a role endpoint for authenticated users and SHALL support exactly two application roles: `guest` and `admin`.

#### Scenario: Authenticated user has admin role
- **WHEN** a signed-in user's role endpoint response is `admin`
- **THEN** the system treats the user as an admin for admin-only UI affordances

#### Scenario: Authenticated user has guest role
- **WHEN** a signed-in user's role endpoint response is `guest`
- **THEN** the system treats the user as a non-admin user

#### Scenario: Role lookup fails
- **WHEN** the role endpoint cannot be reached or returns an invalid role
- **THEN** the system treats the user as `guest`

### Requirement: Admin-only upload affordance
The system SHALL show a catalog upload icon on each catalog dropdown row next to the favorite heart only for users whose resolved role is `admin`.

#### Scenario: Admin views catalog entry controls
- **WHEN** an admin views controls for a complete preset, palette preset, stop preset, or texture
- **THEN** the upload icon appears on each dropdown row next to the favorite heart for that item type

#### Scenario: Guest views catalog entry controls
- **WHEN** a guest or unsigned user views controls for a complete preset, palette preset, stop preset, or texture
- **THEN** the upload icon is not visible

### Requirement: Admin catalog upload
The system SHALL allow admins to upload complete presets, palette presets, stop presets, and textures to the remote Firebase catalog.

#### Scenario: Admin uploads a complete preset
- **WHEN** an admin uploads a complete preset
- **THEN** the system writes the preset to the remote catalog by GUID and creates or updates the remote version for that complete preset

#### Scenario: Admin uploads a palette preset
- **WHEN** an admin uploads a palette preset
- **THEN** the system writes the palette preset to the remote catalog by GUID and creates or updates the remote version for that palette preset

#### Scenario: Admin uploads a stop preset
- **WHEN** an admin uploads a stop preset
- **THEN** the system writes the stop preset to the remote catalog by GUID and creates or updates the remote version for that stop preset

#### Scenario: Admin uploads a texture
- **WHEN** an admin uploads a texture
- **THEN** the system writes the texture metadata and blob data to the remote catalog by GUID and creates or updates the remote version for that texture

### Requirement: Remote upload name uniqueness
The system SHALL reject admin uploads when another remote entry of the same catalog type already uses the submitted name with a different GUID.

#### Scenario: Admin uploads local entry with conflicting remote name
- **WHEN** an admin uploads a local-only entry named `Gold`
- **AND** Firebase already contains another entry of the same type named `Gold` with a different GUID
- **THEN** the upload is rejected and the admin must rename the local entry before uploading

#### Scenario: Admin updates existing remote entry without name conflict
- **WHEN** an admin uploads an entry whose GUID already exists remotely
- **AND** no other remote entry of the same type uses its submitted name
- **THEN** the upload updates the remote entry for that GUID

### Requirement: Server-owned upload timestamp
The system SHALL set `lastUpdated` for remote catalog uploads on the trusted remote side and SHALL store the returned `lastUpdated` locally after a successful upload.

#### Scenario: Upload succeeds
- **WHEN** an admin upload succeeds
- **THEN** the remote catalog entry receives a new trusted `lastUpdated` value and the local entry stores that value

### Requirement: Upload authorization enforcement
The system SHALL reject remote catalog upload attempts unless the request is authenticated and authorized as `admin`.

#### Scenario: Guest attempts upload through client code
- **WHEN** a guest or unsigned user attempts to call the upload path directly
- **THEN** the remote write is rejected

#### Scenario: Admin token is accepted
- **WHEN** an authenticated admin uploads a catalog entry with a valid token
- **THEN** the remote write is accepted
