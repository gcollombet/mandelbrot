## MODIFIED Requirements

### Requirement: Role lookup
The system SHALL resolve application access as exactly one of three roles: unsigned `guest`, authenticated non-admin `user`, or authenticated `admin`.

#### Scenario: Authenticated user has admin role
- **WHEN** a signed-in user's trusted claims or role lookup identify the account as `admin`
- **THEN** the system treats the user as an admin for admin-only UI affordances and as a normal authenticated owner for personal-library behavior

#### Scenario: Authenticated user is not an admin
- **WHEN** a signed-in user has no trusted admin authorization
- **THEN** the system assigns the `user` role and enables authenticated personal-library behavior without admin affordances

#### Scenario: Role lookup fails for a signed-in user
- **WHEN** admin role resolution cannot be reached or returns an invalid result for an otherwise authenticated user
- **THEN** the system assigns the safe non-admin `user` role rather than treating the authenticated identity as unsigned

#### Scenario: No user is authenticated
- **WHEN** the authentication provider reports no signed-in user
- **THEN** the system assigns the `guest` role and uses the device-local guest library

### Requirement: Admin-only upload affordance
The system SHALL show a catalog upload icon on each catalog dropdown row next to the favorite heart only for users whose resolved role is `admin`.

#### Scenario: Admin views catalog entry controls
- **WHEN** an admin views controls for a complete preset, palette preset, stop preset, animation preset, texture-mapping preset, or texture
- **THEN** the upload icon appears on each supported dropdown row next to the favorite heart for that item type

#### Scenario: Non-admin views catalog entry controls
- **WHEN** an authenticated `user` or unsigned `guest` views controls for a complete preset, palette preset, stop preset, animation preset, texture-mapping preset, or texture
- **THEN** the upload icon is not visible
