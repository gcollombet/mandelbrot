// The affine BLA is only as accurate as exact stepping for ε ≤ 1e-4 (see
// Engine.BLA_LINEARIZATION_EPSILON). Presets and stored settings from builds
// whose default was 1e-3 are folded back into the safe band.
export const BLA_EPSILON_DEFAULT = 1e-6
export const BLA_EPSILON_MIN = 1e-12
export const BLA_EPSILON_MAX = 1e-4

export function clampBlaEpsilon(raw: unknown): number {
    const eps = typeof raw === 'number' && isFinite(raw) && raw > 0 ? raw : BLA_EPSILON_DEFAULT
    return Math.min(BLA_EPSILON_MAX, Math.max(BLA_EPSILON_MIN, eps))
}
