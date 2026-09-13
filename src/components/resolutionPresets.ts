export interface ResolutionPreset { width: number; height: number; label: string }
export const VIDEO_RESOLUTIONS: ResolutionPreset[] = [
  { width: 1280, height: 720, label: '720p — 1280×720' },
  { width: 1920, height: 1080, label: '1080p — 1920×1080' },
  { width: 2560, height: 1440, label: '1440p — 2560×1440' },
  { width: 3840, height: 2160, label: '4K — 3840×2160' },
]
/** Whole-image exports: angle horizontal, depth vertical, so portrait ratios are the norm. */
export const IMAGE_RESOLUTIONS: ResolutionPreset[] = [
  { width: 1024, height: 2048, label: '1024×2048 — 2 Mpx' },
  { width: 2048, height: 4096, label: '2048×4096 — 8 Mpx' },
  { width: 4096, height: 8192, label: '4096×8192 — 32 Mpx' },
  { width: 2048, height: 2048, label: '2048×2048 — carré' },
  { width: 4096, height: 4096, label: '4096×4096 — carré' },
]
