## ADDED Requirements

### Requirement: Budgeted polar passes
The exporter SHALL choose the number N of useful octaves from an automatic or manual memory budget, reserving two additional octaves for a standard sliding zoom and accounting for filtering halos, rendering, AA, transfers, center and safety margin.

#### Scenario: Budget decreases
- **WHEN** a lower budget cannot hold the previous N
- **THEN** the planner increases the number of passes without reducing requested resolution or AA quality

#### Scenario: One octave does not fit
- **WHEN** one useful octave plus its reserves and auxiliaries exceeds the budget
- **THEN** the planner subdivides source data further or reports an explicit unsupported budget before allocating

### Requirement: Complete sliding coverage
The exporter SHALL render a frame only when all its source contributions are available, and SHALL keep a physical slot alive until all CPU and GPU consumers have finished.

#### Scenario: Loading is slower than rendering
- **WHEN** the next required octave is not ready
- **THEN** export waits without substituting an incomplete frame or changing timestamps

#### Scenario: A deformation samples distant ranges
- **WHEN** a creative transform reads beyond the standard N+2 range
- **THEN** additional passes cover those ranges under the same budget

### Requirement: Seamless synchronized composition
All rings SHALL use the same frame schedule, camera and material time. Composition SHALL sum correctly weighted linear-light AA contributions with sufficient overlap and an explicit finite center before final encoding.

#### Scenario: An AA footprint crosses a ring boundary
- **WHEN** a pixel contains samples from two ring passes
- **THEN** each sample contributes exactly once with the same position and weight as the reference full-frame reconstruction

### Requirement: Bounded intermediate storage lifecycle
The exporter SHALL encode intermediate ring colors as compressed videos with a configurable bitrate, preserve coverage weights with lossless compression, bound in-memory queues and delete only session-owned consumed temporaries. It SHALL disclose that color is encoded again in the final video.

#### Scenario: Composition is cancelled
- **WHEN** a user cancels composition
- **THEN** resources are released, persistent source data remain intact and retained intermediates are identified for resume or explicit cleanup

#### Scenario: A ring encode is interrupted
- **WHEN** encoding an intermediate ring fails or is cancelled
- **THEN** resume reuses finalized ring videos and restarts the unfinished ring, without persisting raw color frames
