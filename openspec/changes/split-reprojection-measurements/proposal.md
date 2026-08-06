## Why

The GPU timing currently grouped under “Reprojection” can include several distinct operations: raw-cache translation during pan, raw-cache clearing, and display snapshot copies performed around zoom. This makes intermittent spikes impossible to attribute reliably and prevents evidence-based optimization of the actual bottleneck.

## What Changes

- Report raw-cache pan reprojection and raw-cache clearing as distinct GPU measurements even though they share the same utility pipeline.
- Attribute resolved/frozen display snapshot copies to an explicit zoom-snapshot measurement instead of the following shader pass.
- Keep the existing zoom merge measurement separate from snapshot-copy cost.
- Preserve the current asynchronous timestamp-query behavior and expose the new categories through the existing performance statistics interface.
- Make no changes to rendering results, cache contents, dispatch dimensions, texture formats, layer counts, or reprojection algorithms.

## Capabilities

### New Capabilities
- `gpu-pass-measurement-attribution`: Defines distinct and truthful GPU timing attribution for pan reprojection, raw-cache clear, zoom snapshot copy, and zoom merge work.

### Modified Capabilities

None.

## Impact

- Affects GPU pass-slot definitions, timestamp/query bookkeeping, render command encoding around raw-cache utility work and zoom snapshot copies, and the existing statistics display.
- May add a minimal GPU timestamp boundary or marker for copy-only command regions; it SHALL NOT introduce a rendering or cache-state change.
- No API, saved-setting, shader-output, or dependency changes.
