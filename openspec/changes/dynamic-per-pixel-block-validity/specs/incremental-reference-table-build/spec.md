## ADDED Requirements

### Requirement: Incremental aligned dyadic construction
The reference-table builder SHALL consume newly appended reference-orbit steps and compose each newly complete aligned dyadic block exactly once. A level with skip `S` SHALL contain `floor(availableSteps / S)` blocks starting at `1 + slot * S`; the builder SHALL NOT construct sliding blocks for unaligned starts.

#### Scenario: First 1024 steps complete
- **WHEN** 1024 reference steps have been appended
- **THEN** the builder has one complete skip-1024 block, two skip-512 blocks, four skip-256 blocks, and the corresponding aligned blocks at lower levels

#### Scenario: Next chunk arrives
- **WHEN** a later orbit chunk extends the available prefix
- **THEN** only blocks newly completed by that extension are composed and every previously completed block retains its coefficient and envelope data

### Requirement: One-shot parity
For the same orbit prefix, epsilon, certified reference domain, and maximum skip, incremental construction SHALL produce the same level geometry and coefficient records as one-shot construction, and envelopes that are byte-identical or conservatively equivalent after serialization.

#### Scenario: Random chunk boundaries
- **WHEN** one orbit is fed through multiple random chunk partitions and also through the one-shot builder
- **THEN** every complete slot has matching coefficients, no weaker serialized certificate, identical level counts, and no duplicate or missing block

### Requirement: Partial table publication
The worker SHALL publish append-only table ranges with reference identity, generation, level, starting slot, slot count, and covered orbit length. The Engine SHALL expose a range to dispatch only after matching coefficient and validity payloads are written and its directory count is committed.

#### Scenario: Coefficients arrive without matching envelope data
- **WHEN** one half of an incremental range is available but the other is not
- **THEN** the directory excludes that range and the shader uses an older complete range or exact perturbation

#### Scenario: Complete prefix is published
- **WHEN** matching payloads for new slots have been uploaded
- **THEN** the directory count advances atomically and subsequent continuations may use those slots without clearing render history

### Requirement: Sound partial-prefix dispatch
Jet, Möbius, and Auto modes SHALL be allowed to accelerate the table-covered orbit prefix while the uncovered tail executes exact perturbation. BLA and Padé debug modes MAY retain their existing full-coverage gate until equivalent partial-prefix safety is implemented.

#### Scenario: Pixel reaches the end of the published prefix
- **WHEN** no published block fits before the table-covered reference limit
- **THEN** dispatch performs exact perturbation and never reads a block beyond the published level count

### Requirement: Cooperative priority and cancellation
The worker SHALL prioritize visible reference-orbit chunks over table extension, SHALL bound table work between event-loop yields, and SHALL cancel stale incremental work by job, reference, and table generation before transfer.

#### Scenario: View update arrives during table extension
- **WHEN** a newer reference job or table generation is queued while background merges are running
- **THEN** the worker yields, discards stale unpublished results, and resumes work for the newest visible job without posting stale ranges

#### Scenario: Visible orbit is incomplete
- **WHEN** both a visible orbit chunk and optional headroom/table work are pending
- **THEN** the next scheduled unit advances the visible orbit first

### Requirement: Capacity growth is frame-coherent
GPU storage SHALL reserve level-contiguous ranges for a power-of-two iteration capacity. When capacity grows, existing ranges SHALL remain active until replacement buffers have been copied, populated, and bound atomically.

#### Scenario: Maximum iteration target crosses capacity
- **WHEN** the required target exceeds current table capacity
- **THEN** the Engine doubles capacity, preserves all complete ranges, and swaps buffers without exposing shifted offsets or a partially copied directory

### Requirement: Incremental build observability and budget
Debug output SHALL report orbit-covered iterations, table-covered iterations, new blocks per level, merge time, envelope time, transferred bytes, worker yield count, cancellations, and capacity growth. Performance tests SHALL compare incremental total work with one-shot work and verify that no individual cooperative table unit exceeds the configured worker responsiveness budget.

#### Scenario: Chunked build benchmark
- **WHEN** a benchmark orbit is delivered in production-sized chunks
- **THEN** the final table matches one-shot parity, cumulative construction metrics are reported, and every cooperative unit stays within the configured responsiveness budget

