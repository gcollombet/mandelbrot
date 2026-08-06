## ADDED Requirements

### Requirement: Distinct raw-cache utility measurements
The system SHALL report raw-cache translation and raw-cache clearing under independent GPU timing categories named `Reprojection (pan)` and `Clear cache`.

#### Scenario: Integer pan translation
- **WHEN** the raw-cache utility pass gathers texels for a non-zero integer pan shift without clearing history
- **THEN** `Reprojection (pan)` is active for the frame and `Clear cache` is inactive

#### Scenario: Raw-cache reset
- **WHEN** the raw-cache utility pass runs with history clearing active
- **THEN** `Clear cache` is active for the frame and `Reprojection (pan)` is inactive

#### Scenario: Clear and translation requested together
- **WHEN** history clearing and a non-zero integer translation are both present in one frame
- **THEN** the utility work is attributed to `Clear cache`, matching the clear-first shader behavior

### Requirement: Explicit zoom snapshot-copy measurement
The system SHALL report the complete resolved-to-frozen display copy region under a GPU timing category named `Snapshot (zoom)` and SHALL NOT attribute that copy region to the following shader pass.

#### Scenario: Freeze snapshot is captured
- **WHEN** the renderer copies the resolved value, geometry, and metadata textures into the frozen display set
- **THEN** `Snapshot (zoom)` reports the GPU interval spanning all three copy commands

#### Scenario: No freeze snapshot is captured
- **WHEN** a frame does not execute resolved-to-frozen display copies
- **THEN** `Snapshot (zoom)` is inactive for that frame

#### Scenario: Shader follows a snapshot copy
- **WHEN** a timed utility, iteration, resolve, or color pass follows the snapshot-copy region
- **THEN** the snapshot-copy duration is not included again in that following pass's reported duration

### Requirement: Separate end-to-end zoom merge measurement
The system SHALL continue to report the end-to-end frozen/resolved merge operation under `Merge (zoom)`, independently of `Snapshot (zoom)`.

#### Scenario: Zoom merge executes
- **WHEN** the renderer prepares merge scratch textures and runs the merge shader at zoom completion
- **THEN** `Merge (zoom)` reports that complete merge operation and `Snapshot (zoom)` does not absorb it

#### Scenario: Snapshot and merge are absent
- **WHEN** neither a snapshot capture nor a zoom merge runs in a frame
- **THEN** both `Snapshot (zoom)` and `Merge (zoom)` are inactive

### Requirement: Non-invasive asynchronous measurement
The measurement split SHALL preserve rendering behavior and SHALL resolve and read GPU timestamps asynchronously without waiting on the GPU in the render path.

#### Scenario: Timestamp queries are supported
- **WHEN** the adapter supports timestamp queries and the separated measurements run
- **THEN** timestamp data is resolved through the existing asynchronous readback path with no synchronous queue wait

#### Scenario: Timestamp queries are unavailable
- **WHEN** the adapter does not support timestamp queries
- **THEN** no copy-boundary marker passes are encoded, the separated metrics remain unavailable, and rendering behavior is unchanged

#### Scenario: Instrumented and uninstrumented rendering
- **WHEN** the same scene and interactions are rendered with timestamp measurement enabled and unavailable
- **THEN** raw-cache contents, display textures, convergence state, pan alignment, and zoom output remain equivalent

### Requirement: Coherent performance statistics
The system SHALL expose labels, help text, active state, smoothed duration, aggregate pass time, and total measured GPU span coherently for the expanded timing categories.

#### Scenario: Performance panel displays separated work
- **WHEN** timing samples for clear, pan reprojection, snapshot, or merge become available
- **THEN** the existing performance statistics interface displays each active category with its own duration and descriptive help text

#### Scenario: Snapshot duration contributes once
- **WHEN** a frame contains a snapshot copy followed by other timed passes
- **THEN** the snapshot interval contributes exactly once to aggregate pass time and the chronological GPU span remains consistent
