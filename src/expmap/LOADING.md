# ExpMap playback loading

The GPU cache retains 14 layers. Uploading one octave overlaps the worker's
read/hash/decode of the next octave. There is at most one decoded lookahead,
in addition to the bitmap currently uploading. Codec internals and compressed
input buffers consume additional memory.

Compressed read-ahead adapts to observed octave velocity and loading latency:
1–4 physical octaves, at most 64 MiB of cached compressed bytes. A seek resets
the anticipation to one octave. Required reads take precedence over speculative
reads. Cancellation is cooperative between I/O, hashing and decoding; a native
createImageBitmap already in progress cannot be interrupted, but its result is
closed if obsolete. Repeated identical prefetch windows are not resubmitted.

The cache can copy a resident physical octave between GPU layers, including
when different virtual octaves refer to it in radial/loop modes. The shader's
virtual-layer mapping and reverse sampling remain unchanged. GPU uploads use
4 MiB bands grouped in pairs, with one queue fence per group and pacing only
for speculative uploads. Aborted partial uploads are never marked resident.

Library playback opens complete document metadata without enumerating every
image first. Every requested image still passes its length and SHA-256 checks
before decoding. The worker checks file presence/length in small idle batches
and reports failures even while playback is paused. Incomplete checkpoint
recovery and explicit document attachment retain full enumeration.

`ExpmapGpuPlayer.loadingMetrics` and `ExpmapGpuRenderer.loadingMetrics` return
bounded aggregates (`count`, `lastMs`, `totalMs`, `maxMs`) for read, hash, decode,
upload, required-window wait and worker opening. Upload timings include queue
fences and pacing; read timings include ZIP extraction/CRC when applicable.
These are elapsed timings, not isolated GPU timestamps. Worker-open time excludes
the library's initial metadata/catalogue work. No per-frame history is retained.

Validation: ExpMap unit tests, TypeScript and Vite worker compilation. These
checks do not establish target-browser fluidity or a measured GPU speedup.
