## MODIFIED Requirements

### Requirement: Role lookup
The system SHALL resolve exactly three application roles, `guest`, `user`, and `admin`, using Firebase Authentication state and an owner-readable Firestore admin marker without calling an HTTP role endpoint.

#### Scenario: Authenticated user has admin marker
- **WHEN** a signed-in user has an `admins/{uid}` document readable under the Firestore rules
- **THEN** the system treats the user as `admin` for admin-only UI affordances

#### Scenario: Authenticated user has no admin marker
- **WHEN** a signed-in user has no `admins/{uid}` document
- **THEN** the system treats the user as `user`

#### Scenario: Role lookup fails
- **WHEN** the Firestore admin-marker lookup fails
- **THEN** the system treats the authenticated user as `user` and grants no admin capability

#### Scenario: User is signed out
- **WHEN** Firebase Authentication has no current user
- **THEN** the system treats the user as `guest`
