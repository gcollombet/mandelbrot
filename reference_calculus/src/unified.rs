//! Unified block table (unify-jet-table-dispatch, Phase A).
//!
//! ONE build serves every evaluation tier. Per block, the coefficient record is
//! PREFIX-ORDERED (design D2):
//!
//!   [A, B, D, N₂, A', D', F, a12, a03]
//!    └affine┘
//!    └─── Padé ────┘
//!    └──────── c+ ─────────┘
//!    └──────────── jet (order 3) ─────────┘
//!
//! so each tier reads a strict prefix (affine 24 B, Padé 48 B, c+ 84 B, jet
//! 108 B). The rational tiers are the [2/1] superconvergent extraction
//! (`mobius_from_jet_k2`, mobius round 7): D = −c₃₀/c₂₀ resums the z-channel
//! pole, N₂ = c₂₀ + D·c₁₀ annihilates z² exactly and q₃₀ becomes a constructed
//! zero. The Padé tier is the PLAIN view of the same extraction (A' = D' = F
//! = 0, D/N₂ kept — a plain [2/1] whose q₂₀/q₃₀ both vanish); shipping the
//! [1/1] D instead would leave q₂₀ = N₂ live for the Padé tier, which is why
//! N₂ sits INSIDE its prefix. Slot 6 carries F = −c₀₂/c₀₁ (denominator c-slot);
//! the raw a₀₂ and a₃₀ both displaced from the record are reconstructible in
//! registers, keeping the record size-neutral vs the 9-slot [1/1] layout. The
//! jet tier reconstructs its remaining degree ≤ 3 coefficients from the
//! [2/1]-refreshed §11 identities:
//!
//!   a20 = N₂ − D·A,   a11 = A' − B·D − F·A,
//!   a21 = −D'·A − D·a11 − F·a20,   a02 = −F·B,   a30 = −D·a20
//!
//! (a30 is exact iff the [2/1] extraction is live, i.e. c₂₀ ≠ 0 — the c₂₀ = 0
//! fallback keeps q₃₀ a live REST term for every rational tier AND the jet
//! tier, mirroring the F = 0 / a₀₂ fallback. 3–4 extra multiplications,
//! amortized: the jet tier runs in the fe compute-bound regime, while
//! BANDWIDTH is the axis the plateau punishes — duplicated per-tier records
//! were rejected for exactly that reason.)

use crate::jet::JetBlockBounds;
use crate::jet::{
    cfe_to_coeff, fe_exp2, jet_block_bounds_moduli, jet_idx, jet_seed, jet_solve_radii, sfe_norm,
    CFe, JetCoeffFe, JetF64, JetLevel, JET_MONOMIALS, JET_NCOEFF,
};
// The unified record shares the 7-coefficient [2/1] F-form extraction with
// the standalone mobius mode (`mobius_from_jet_k2`, numerator (N₂z + A + A'c)z
// + Bc, denominator 1 + (D+D'c)z + Fc): slots 3/6 ship N₂/F, the displaced
// raw a₃₀/a₀₂ are reconstructed in registers (a₃₀ = −D·a₂₀, a₀₂ = −F·B) and
// the §11 identities carry the N₂/F terms (see module head). The [1/1]
// extraction (`mobius_from_jet`) remains the PERIODIC header's form (its
// runtime fixed points stay a quadratic).
use crate::mobius::{
    mobius_apply, mobius_build_bounds_pair, mobius_build_derivative_radii, mobius_build_radii,
    mobius_certify_segment_value, mobius_from_jet, mobius_from_jet_k2, mobius_q, MobiusBlock,
    MobiusBoundsTable, MobiusCPlus, MobiusLevel, MOBIUS_F32_SAFE_LOG2, MOBIUS_MIN_EMIT_SKIP,
    MOBIUS_NCAND,
};
use crate::validity::{
    derive_derivative_radius_lines, derive_pure_c_threshold, derive_rational_pole_lines,
    derive_value_radius_lines, intersect_value_derivative_lines, prune_low_degree_lines,
    select_cauchy_candidates, serialize_validity_diagnostics_packed_v1,
    serialize_validity_envelope_packed_v1, CauchyCandidateEnvelope, CauchySource,
    CauchyTierContext, DerivativeLineDerivation, Log2Limit, LowDegreeLineDerivation,
    PackedValidityDiagnosticsV1, PackedValidityEnvelopeV1, PoleLineDerivation, PureCDerivation,
    PureCThreshold, RationalDerivativeFactors, StaticDcCeiling, TierValidityEnvelope,
    ValidityEnvelope, ValidityTier, ValueLineDerivation, MAX_CAUCHY_CANDIDATES,
    SERIALIZED_VALIDITY_LINE_COUNT, SERIALIZED_VALIDITY_SLOPES,
};

/// One unified block: the [2/1] c+ extraction (tiers 0–2, N₂/F included) plus
/// the two raw jet coefficients the identities cannot reconstruct (tier 3,
/// order-3 evaluation).
#[derive(Clone, Debug)]
pub struct UnifiedBlock {
    /// A, B, D, N₂, A', D', F — the [2/1] c-augmented Möbius extraction
    /// (prefix slots 0–6; N₂ lives in `m.n2`).
    pub m: MobiusCPlus,
    /// Raw slots 7–8: a₁₂, a₀₃ (degree ≤ 3 completion).
    pub a12: CFe,
    pub a03: CFe,
}

impl UnifiedBlock {
    pub fn from_jet(jet: &JetF64) -> UnifiedBlock {
        UnifiedBlock {
            m: mobius_from_jet_k2(jet),
            a12: jet.coeff(1, 2),
            a03: jet.coeff(0, 3),
        }
    }

    /// §11 identity reconstructions for the jet tier ([2/1] F-form; used by
    /// `unified_eval_jet3` — the CPU referee of the GPU register
    /// reconstruction). a₂₀ = N₂ − D·A is exact under BOTH extractions (the
    /// c₂₀ = 0 fallback has N₂ = 0 and the [1/1] D).
    #[allow(dead_code)]
    pub fn a20(&self) -> CFe {
        self.m.n2.sub(self.m.d.mul(self.m.a))
    }
    #[allow(dead_code)]
    pub fn a11(&self) -> CFe {
        self.m
            .ap
            .sub(self.m.b.mul(self.m.d))
            .sub(self.m.f.mul(self.m.a))
    }
    #[allow(dead_code)]
    pub fn a21(&self) -> CFe {
        self.m
            .dp
            .mul(self.m.a)
            .neg()
            .sub(self.m.d.mul(self.a11()))
            .sub(self.m.f.mul(self.a20()))
    }
    /// a₀₂ = −F·B (exact when F is live; the c₀₁ = 0 fallback keeps F = 0 and
    /// the moduli stage then leaves the raw a₀₂ slot as a live REST term for
    /// the jet tier — sound, just not reconstructed).
    #[allow(dead_code)]
    pub fn a02(&self) -> CFe {
        self.m.f.mul(self.m.b).neg()
    }
    /// a₃₀ = −D·a₂₀ (q₃₀ = 0 under the [2/1] extraction). On the c₂₀ = 0
    /// fallback this yields 0 while the raw c₃₀ may be live — the moduli stage
    /// then keeps the a₃₀ slot a live REST term for the jet tier (sound, just
    /// not reconstructed), same discipline as a₀₂ under F = 0.
    #[allow(dead_code)]
    pub fn a30(&self) -> CFe {
        self.m.d.mul(self.a20()).neg()
    }
}

/// Build-only per-block sidecar, extracted while the full jet is alive (the
/// radii stage must never need the jet back — design D9): the 27 coefficient
/// moduli for the jet-tier (V) machinery, and the compensated-remainder moduli
/// of BOTH rational extractions for the (V)+closed-form radii.
#[derive(Clone, Debug)]
pub struct UnifiedModuli {
    /// log2 |a_ij| in monomial order (jet tier bounds).
    pub log2_a: [f64; JET_NCOEFF],
    /// c+ q moduli (constructed zeros at −∞).
    pub log2_q_cplus: [f64; JET_NCOEFF],
    /// Plain-Möbius (Padé) q moduli — q₁₁/q₂₁ survive (the spurious terms).
    pub log2_q_plain: [f64; JET_NCOEFF],
}

#[derive(Clone, Debug)]
pub struct UnifiedLevel {
    pub skip: usize,
    pub blocks: Vec<UnifiedBlock>,
    pub moduli: Vec<UnifiedModuli>,
}

/// Constructed-zero q indices per extraction (their rounding residue would
/// only pollute REST — same discipline as the mobius build). q₀₂ is only a
/// constructed zero when F is live — `q_moduli` keeps it as a REST term on the
/// c₀₁ = 0 fallback (F = 0) — and q₃₀ only when the [2/1] extraction is live
/// (c₂₀ ≠ 0), mirroring `block_from_jet`. The periodic header keeps the [1/1]
/// extraction, whose zero list has no (3, 0).
const Q_ZEROS_CPLUS: [(usize, usize); 7] = [(1, 0), (0, 1), (2, 0), (3, 0), (1, 1), (0, 2), (2, 1)];
const Q_ZEROS_PLAIN: [(usize, usize); 4] = [(1, 0), (0, 1), (2, 0), (3, 0)];
const Q_ZEROS_PERIODIC: [(usize, usize); 6] = [(1, 0), (0, 1), (2, 0), (1, 1), (0, 2), (2, 1)];

fn q_moduli(jet: &JetF64, m: &MobiusCPlus, zeros: &[(usize, usize)]) -> [f64; JET_NCOEFF] {
    let mut out = [f64::NEG_INFINITY; JET_NCOEFF];
    if m.degenerate {
        return out;
    }
    let q = mobius_q(jet, m);
    for (n, v) in q.iter().enumerate() {
        out[n] = v.log2_mag().unwrap_or(f64::NEG_INFINITY);
    }
    for &(i, j) in zeros {
        if (i, j) == (0, 2) && m.f.is_zero() {
            continue;
        }
        // [2/1] fallback: c₂₀ = 0 keeps the [1/1] D and q₃₀ stays live.
        if (i, j) == (3, 0) && jet.coeff(2, 0).is_zero() {
            continue;
        }
        out[jet_idx(i, j)] = f64::NEG_INFINITY;
    }
    out
}

fn moduli_from_jet(jet: &JetF64, m: &MobiusCPlus) -> UnifiedModuli {
    let mut log2_a = [f64::NEG_INFINITY; JET_NCOEFF];
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        log2_a[n] = jet
            .coeff(i as usize, j as usize)
            .log2_mag()
            .unwrap_or(f64::NEG_INFINITY);
    }
    // The Padé tier is the PLAIN VIEW of the record's own extraction (A' = D'
    // = F = 0, D/N₂ kept) — computing it from the shipped m rather than a
    // separate extraction keeps the plain moduli consistent with what the GPU
    // Padé tier actually evaluates, by construction.
    let mut plain = *m;
    plain.ap = CFe::ZERO;
    plain.dp = CFe::ZERO;
    plain.f = CFe::ZERO;
    UnifiedModuli {
        log2_a,
        log2_q_cplus: q_moduli(jet, m, &Q_ZEROS_CPLUS),
        log2_q_plain: q_moduli(jet, &plain, &Q_ZEROS_PLAIN),
    }
}

/// Build every merge-tree level (skip 1 up to `max_skip`) extracting the
/// unified record AND the build-only moduli sidecar per block; the full jets
/// are a streaming build-only tool, exactly like `mobius_build_levels`. Block
/// geometry matches the BLA scaffold (slot s of a level covers `skip` steps
/// applied from ref index 1 + s·skip). This is the ONE build the whole table
/// derives from (design D1).
pub fn build_unified_levels(orbit: &[(f64, f64)], max_skip: usize) -> Vec<UnifiedLevel> {
    // Levels below the emit floor are never serialized (MOBIUS_MIN_EMIT_SKIP)
    // and never dispatched — extracting their blocks/moduli only feeds the
    // bounds walks and radii scans with dead work (~75 % of all blocks live at
    // skip 1–2). Keep the level ENTRY (index alignment with the merge chain)
    // but leave it empty; every downstream stage then costs zero there.
    let extract = |jets: &[JetF64], skip: usize| -> UnifiedLevel {
        if skip < MOBIUS_MIN_EMIT_SKIP {
            return UnifiedLevel {
                skip,
                blocks: Vec::new(),
                moduli: Vec::new(),
            };
        }
        let blocks: Vec<UnifiedBlock> = jets.iter().map(UnifiedBlock::from_jet).collect();
        let moduli = jets
            .iter()
            .zip(blocks.iter())
            .map(|(jet, b)| moduli_from_jet(jet, &b.m))
            .collect();
        UnifiedLevel {
            skip,
            blocks,
            moduli,
        }
    };
    let orbit_len = orbit.len();
    let mut out = Vec::new();
    if orbit_len < 3 {
        return out;
    }
    let mut prev: Vec<JetF64> = (1..orbit_len)
        .map(|i| jet_seed(orbit[i].0, orbit[i].1))
        .collect();
    out.push(extract(&prev, 1));
    let mut skip = 1usize;
    while skip < max_skip && skip * 2 < orbit_len {
        let n = prev.len() / 2;
        if n == 0 {
            break;
        }
        let cur: Vec<JetF64> = (0..n)
            .map(|i| crate::jet::jet_compose(&prev[2 * i], &prev[2 * i + 1]))
            .collect();
        skip *= 2;
        out.push(extract(&cur, skip));
        prev = cur;
    }
    out
}

/// A contiguous append completed by `IncrementalUnifiedBuilder`. `level_index`
/// follows the full binary scaffold (0 = skip 1), even though skip 1/2 remain
/// build-only and therefore never appear in a returned range.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct IncrementalUnifiedRange {
    pub level_index: usize,
    pub skip: usize,
    pub slot_start: usize,
    pub slot_count: usize,
    pub covered_orbit_len: usize,
}

#[derive(Clone, Debug, Default)]
pub struct IncrementalUnifiedBatch {
    pub ranges: Vec<IncrementalUnifiedRange>,
    pub covered_orbit_len: usize,
    pub new_seeds: usize,
    pub new_merges: usize,
}

/// Persistent state for one emitted dyadic level. Coefficients and proof
/// moduli are compiled exactly once when a block completes. Packed validity is
/// appended later, also exactly once, as soon as the matching bound row exists.
#[derive(Clone, Debug)]
pub struct IncrementalUnifiedLevel {
    pub skip: usize,
    pub blocks: Vec<UnifiedBlock>,
    pub moduli: Vec<UnifiedModuli>,
    pub coeffs: Vec<[JetCoeffFe; UNIFIED_GPU_COEFFS]>,
    pub validity: Vec<PackedValidityEnvelopeV1>,
    pub validity_diagnostics: Vec<PackedValidityDiagnosticsV1>,
}

impl IncrementalUnifiedLevel {
    fn new(skip: usize) -> Self {
        Self {
            skip,
            blocks: Vec::new(),
            moduli: Vec::new(),
            coeffs: Vec::new(),
            validity: Vec::new(),
            validity_diagnostics: Vec::new(),
        }
    }
}

#[derive(Clone, Copy, Debug)]
struct PendingUnifiedBlock {
    start: usize,
    jet: JetF64,
}

/// Append-only binary-carry builder. At most one raw build jet is pending at
/// each level. Two adjacent pending blocks compose once into their parent;
/// completed emitted blocks are never revisited or recomposed.
pub struct IncrementalUnifiedBuilder {
    max_skip: usize,
    next_orbit_index: usize,
    pending: Vec<Option<PendingUnifiedBlock>>,
    levels: Vec<IncrementalUnifiedLevel>,
    validity_key: Option<(u64, u64)>,
    cumulative_merges: usize,
    cumulative_coefficients: usize,
    cumulative_envelopes: usize,
    peak_retained_bytes: usize,
}

/// One independently certified view-domain rung over the immutable
/// coefficient tree.  Rungs deliberately retain only the cmax-dependent
/// proof records: blocks, moduli and GPU coefficients stay owned by
/// `IncrementalUnifiedBuilder` and are therefore never recomposed when the
/// viewport crosses a rung boundary.
pub struct IncrementalUnifiedValidityBank {
    epsilon_bits: u64,
    reference_log2_dc: f64,
    validity: Vec<Vec<PackedValidityEnvelopeV1>>,
    validity_diagnostics: Vec<Vec<PackedValidityDiagnosticsV1>>,
    cumulative_envelopes: usize,
}

impl IncrementalUnifiedValidityBank {
    pub fn new(level_count: usize, epsilon: f64, reference_log2_dc: f64) -> Self {
        Self {
            epsilon_bits: epsilon.to_bits(),
            reference_log2_dc,
            validity: (0..level_count).map(|_| Vec::new()).collect(),
            validity_diagnostics: (0..level_count).map(|_| Vec::new()).collect(),
            cumulative_envelopes: 0,
        }
    }

    pub fn matches(&self, epsilon: f64, reference_log2_dc: f64) -> bool {
        self.epsilon_bits == epsilon.to_bits()
            && self.reference_log2_dc.to_bits() == reference_log2_dc.to_bits()
    }

    pub fn reference_log2_dc(&self) -> f64 {
        self.reference_log2_dc
    }

    pub fn cumulative_envelopes(&self) -> usize {
        self.cumulative_envelopes
    }

    pub fn validity(&self, level_index: usize) -> &[PackedValidityEnvelopeV1] {
        self.validity
            .get(level_index)
            .map_or(&[], |records| records.as_slice())
    }

    pub fn diagnostics(&self, level_index: usize) -> &[PackedValidityDiagnosticsV1] {
        self.validity_diagnostics
            .get(level_index)
            .map_or(&[], |records| records.as_slice())
    }
}

impl IncrementalUnifiedBuilder {
    pub fn new(max_skip: usize) -> Self {
        let requested = max_skip.max(1);
        let max_skip = if requested.is_power_of_two() {
            requested
        } else {
            requested.next_power_of_two() / 2
        };
        let level_count = max_skip.trailing_zeros() as usize + 1;
        let levels = (0..level_count)
            .map(|level| IncrementalUnifiedLevel::new(1usize << level))
            .collect();
        Self {
            max_skip,
            next_orbit_index: 1,
            pending: vec![None; level_count],
            levels,
            validity_key: None,
            cumulative_merges: 0,
            cumulative_coefficients: 0,
            cumulative_envelopes: 0,
            peak_retained_bytes: 0,
        }
    }

    pub fn reset(&mut self) {
        *self = Self::new(self.max_skip);
    }

    pub fn max_skip(&self) -> usize {
        self.max_skip
    }

    pub fn covered_orbit_len(&self) -> usize {
        self.next_orbit_index
    }

    /// Reserve the final aligned slot count for the currently available
    /// prefix. Without this, every reference chunk can reallocate five large
    /// per-level vectors while the binary carry is running.
    pub fn reserve_for_orbit_len(&mut self, orbit_len: usize) {
        let available_steps = orbit_len.saturating_sub(1);
        for level in &mut self.levels {
            if level.skip < MOBIUS_MIN_EMIT_SKIP {
                continue;
            }
            let target = available_steps / level.skip;
            level
                .blocks
                .reserve(target.saturating_sub(level.blocks.len()));
            level
                .moduli
                .reserve(target.saturating_sub(level.moduli.len()));
            level
                .coeffs
                .reserve(target.saturating_sub(level.coeffs.len()));
            level
                .validity
                .reserve(target.saturating_sub(level.validity.len()));
            level
                .validity_diagnostics
                .reserve(target.saturating_sub(level.validity_diagnostics.len()));
        }
        self.update_peak_retained_bytes();
    }

    pub fn levels(&self) -> &[IncrementalUnifiedLevel] {
        &self.levels
    }

    pub fn cumulative_merges(&self) -> usize {
        self.cumulative_merges
    }

    pub fn cumulative_coefficients(&self) -> usize {
        self.cumulative_coefficients
    }

    pub fn cumulative_envelopes(&self) -> usize {
        self.cumulative_envelopes
    }

    pub fn peak_retained_bytes(&self) -> usize {
        self.peak_retained_bytes
    }

    pub fn snapshot_levels(&self) -> Vec<UnifiedLevel> {
        self.levels
            .iter()
            .map(|level| UnifiedLevel {
                skip: level.skip,
                blocks: level.blocks.clone(),
                moduli: level.moduli.clone(),
            })
            .collect()
    }

    /// Consume reference-orbit values beginning at the exact next index. The
    /// initial Z0 is not passed; the first slice begins at orbit index 1.
    pub fn append_orbit_slice(
        &mut self,
        orbit_start_index: usize,
        orbit_slice: &[(f64, f64)],
    ) -> Result<IncrementalUnifiedBatch, String> {
        self.append_orbit_iter(orbit_start_index, orbit_slice.iter().copied())
    }

    /// Iterator variant used by the WASM navigator. It lets the builder read
    /// the freshly appended `MandelbrotStep` records in place instead of first
    /// materializing another `(f64, f64)` copy of the orbit prefix.
    pub fn append_orbit_iter<I>(
        &mut self,
        orbit_start_index: usize,
        orbit: I,
    ) -> Result<IncrementalUnifiedBatch, String>
    where
        I: IntoIterator<Item = (f64, f64)>,
    {
        if orbit_start_index != self.next_orbit_index {
            return Err(format!(
                "non-contiguous unified append: expected orbit index {}, got {}",
                self.next_orbit_index, orbit_start_index
            ));
        }
        let starts: Vec<usize> = self.levels.iter().map(|level| level.blocks.len()).collect();
        let merges_before = self.cumulative_merges;
        let mut new_seeds = 0usize;
        for (zx, zy) in orbit {
            let start = self.next_orbit_index;
            self.next_orbit_index += 1;
            new_seeds += 1;
            self.push_completed_jet(
                0,
                PendingUnifiedBlock {
                    start,
                    jet: jet_seed(zx, zy),
                },
            );
        }
        self.update_peak_retained_bytes();
        let covered_orbit_len = self.covered_orbit_len();
        let ranges = self
            .levels
            .iter()
            .enumerate()
            .filter_map(|(level_index, level)| {
                let slot_start = starts[level_index];
                let slot_count = level.blocks.len().saturating_sub(slot_start);
                (slot_count > 0).then_some(IncrementalUnifiedRange {
                    level_index,
                    skip: level.skip,
                    slot_start,
                    slot_count,
                    covered_orbit_len,
                })
            })
            .collect();
        Ok(IncrementalUnifiedBatch {
            ranges,
            covered_orbit_len,
            new_seeds,
            new_merges: self.cumulative_merges - merges_before,
        })
    }

    fn push_completed_jet(&mut self, level_index: usize, current: PendingUnifiedBlock) {
        if level_index >= self.levels.len() {
            return;
        }
        let skip = 1usize << level_index;
        debug_assert_eq!((current.start - 1) % skip, 0);
        if skip >= MOBIUS_MIN_EMIT_SKIP {
            let block = UnifiedBlock::from_jet(&current.jet);
            let moduli = moduli_from_jet(&current.jet, &block.m);
            let coeffs = unified_serialize_block_coeffs(&block);
            let level = &mut self.levels[level_index];
            debug_assert_eq!(level.blocks.len(), (current.start - 1) / skip);
            level.blocks.push(block);
            level.moduli.push(moduli);
            level.coeffs.push(coeffs);
            self.cumulative_coefficients += 1;
        }
        if skip >= self.max_skip {
            return;
        }
        if let Some(left) = self.pending[level_index].take() {
            debug_assert_eq!(left.start + skip, current.start);
            self.cumulative_merges += 1;
            self.push_completed_jet(
                level_index + 1,
                PendingUnifiedBlock {
                    start: left.start,
                    jet: crate::jet::jet_compose(&left.jet, &current.jet),
                },
            );
        } else {
            self.pending[level_index] = Some(current);
        }
    }

    /// Compile only the not-yet-published validity suffix for each level.
    /// Bounds may arrive progressively; a short bounds row simply postpones
    /// the remaining slots. Changing epsilon/domain starts a new table epoch
    /// and is rejected once any envelope has been published.
    pub fn compile_available_validity(
        &mut self,
        bounds: &UnifiedBounds,
        epsilon: f64,
        reference_log2_dc: f64,
    ) -> Result<Vec<IncrementalUnifiedRange>, String> {
        let key = (epsilon.to_bits(), reference_log2_dc.to_bits());
        if let Some(previous) = self.validity_key {
            if previous != key && self.cumulative_envelopes > 0 {
                return Err("incremental validity key changed after publication".to_string());
            }
        }
        self.validity_key = Some(key);
        let covered_orbit_len = self.covered_orbit_len();
        let mut ranges = Vec::new();
        for level_index in 0..self.levels.len() {
            if self.levels[level_index].skip < MOBIUS_MIN_EMIT_SKIP {
                continue;
            }
            let start = self.levels[level_index].validity.len();
            let available = self.levels[level_index]
                .blocks
                .len()
                .min(bounds.jet.get(level_index).map_or(0, Vec::len))
                .min(bounds.cplus.per_level.get(level_index).map_or(0, Vec::len))
                .min(bounds.plain.per_level.get(level_index).map_or(0, Vec::len));
            for slot in start..available {
                let envelope = unified_validity_envelope_for_block(
                    &self.levels[level_index].blocks[slot],
                    &self.levels[level_index].moduli[slot],
                    bounds,
                    level_index,
                    slot,
                    epsilon,
                    reference_log2_dc,
                );
                self.levels[level_index]
                    .validity
                    .push(serialize_validity_envelope_packed_v1(&envelope));
                self.levels[level_index]
                    .validity_diagnostics
                    .push(serialize_validity_diagnostics_packed_v1(&envelope));
            }
            let slot_count = available.saturating_sub(start);
            if slot_count > 0 {
                self.cumulative_envelopes += slot_count;
                ranges.push(IncrementalUnifiedRange {
                    level_index,
                    skip: self.levels[level_index].skip,
                    slot_start: start,
                    slot_count,
                    covered_orbit_len,
                });
            }
        }
        self.update_peak_retained_bytes();
        Ok(ranges)
    }

    /// Certify at most `block_quota` completed-but-unpublished blocks. The
    /// work is append-only: coefficients/moduli were frozen by the binary
    /// carry, and each envelope is compiled exactly once. Lower skips are
    /// drained first so the published base level grows as a contiguous orbit
    /// prefix even when a costly coarse block is still pending.
    pub fn compile_pending_validity(
        &mut self,
        orbit: &[(f64, f64)],
        epsilon: f64,
        reference_log2_dc: f64,
        block_quota: usize,
    ) -> Result<Vec<IncrementalUnifiedRange>, String> {
        self.compile_pending_validity_with(
            orbit.len(),
            |index| orbit[index],
            epsilon,
            reference_log2_dc,
            block_quota,
        )
    }

    /// Accessor variant used by the WASM navigator. Only orbit samples needed
    /// by the not-yet-certified slots are read, so a cooperative unit is
    /// proportional to the new ranges rather than to the complete prefix.
    pub fn compile_pending_validity_with<F>(
        &mut self,
        orbit_len: usize,
        mut orbit_at: F,
        epsilon: f64,
        reference_log2_dc: f64,
        block_quota: usize,
    ) -> Result<Vec<IncrementalUnifiedRange>, String>
    where
        F: FnMut(usize) -> (f64, f64),
    {
        let key = (epsilon.to_bits(), reference_log2_dc.to_bits());
        if let Some(previous) = self.validity_key {
            if previous != key && self.cumulative_envelopes > 0 {
                return Err("incremental validity key changed after publication".to_string());
            }
        }
        self.validity_key = Some(key);
        let mut remaining = block_quota.max(1);
        let covered_orbit_len = self.covered_orbit_len();
        let mut ranges = Vec::new();
        for level_index in 0..self.levels.len() {
            if remaining == 0 {
                break;
            }
            let skip = self.levels[level_index].skip;
            if skip < MOBIUS_MIN_EMIT_SKIP {
                continue;
            }
            let slot_start = self.levels[level_index].validity.len();
            let slot_end = self.levels[level_index]
                .blocks
                .len()
                .min(slot_start.saturating_add(remaining));
            if slot_end <= slot_start {
                continue;
            }
            let first = 1 + slot_start * skip;
            let last = 1 + slot_end * skip;
            if last > orbit_len {
                return Err(format!(
                    "incremental validity orbit too short: need {last}, have {}",
                    orbit_len
                ));
            }
            // The one-shot bound compiler expects level-local slot zero to
            // begin at orbit index one. Prefix one harmless dummy sample, then
            // present exactly the new contiguous seed segments.
            let mut local_orbit = Vec::with_capacity(1 + last - first);
            local_orbit.push((0.0, 0.0));
            for index in first..last {
                local_orbit.push(orbit_at(index));
            }
            let local_level = UnifiedLevel {
                skip,
                blocks: self.levels[level_index].blocks[slot_start..slot_end].to_vec(),
                moduli: self.levels[level_index].moduli[slot_start..slot_end].to_vec(),
            };
            let bounds = unified_build_bounds(
                core::slice::from_ref(&local_level),
                &local_orbit,
                reference_log2_dc,
            );
            for local_slot in 0..local_level.blocks.len() {
                let envelope = unified_validity_envelope_for_block(
                    &local_level.blocks[local_slot],
                    &local_level.moduli[local_slot],
                    &bounds,
                    0,
                    local_slot,
                    epsilon,
                    reference_log2_dc,
                );
                self.levels[level_index]
                    .validity
                    .push(serialize_validity_envelope_packed_v1(&envelope));
                self.levels[level_index]
                    .validity_diagnostics
                    .push(serialize_validity_diagnostics_packed_v1(&envelope));
            }
            let slot_count = slot_end - slot_start;
            remaining -= slot_count;
            self.cumulative_envelopes += slot_count;
            ranges.push(IncrementalUnifiedRange {
                level_index,
                skip,
                slot_start,
                slot_count,
                covered_orbit_len,
            });
        }
        self.update_peak_retained_bytes();
        Ok(ranges)
    }

    pub fn has_pending_validity(&self) -> bool {
        self.levels.iter().any(|level| {
            level.skip >= MOBIUS_MIN_EMIT_SKIP && level.validity.len() < level.blocks.len()
        })
    }

    pub fn published_orbit_len(&self) -> usize {
        self.levels
            .iter()
            .find(|level| level.skip >= MOBIUS_MIN_EMIT_SKIP)
            .map_or(1, |level| 1 + level.validity.len() * level.skip)
            .min(self.covered_orbit_len())
    }

    /// Certify one bounded suffix for a second cmax rung without touching the
    /// primary bank stored in `levels[*].validity`.  This is the background
    /// half of the double-buffered runtime contract: it shares every expensive
    /// orbit/merge/coefficient artifact and creates only bounds/envelopes.
    pub fn compile_pending_validity_bank_with<F>(
        &self,
        bank: &mut IncrementalUnifiedValidityBank,
        orbit_len: usize,
        mut orbit_at: F,
        epsilon: f64,
        reference_log2_dc: f64,
        block_quota: usize,
    ) -> Result<Vec<IncrementalUnifiedRange>, String>
    where
        F: FnMut(usize) -> (f64, f64),
    {
        if !bank.matches(epsilon, reference_log2_dc) {
            return Err("incremental rung validity key mismatch".to_string());
        }
        if bank.validity.len() != self.levels.len()
            || bank.validity_diagnostics.len() != self.levels.len()
        {
            return Err("incremental rung level geometry mismatch".to_string());
        }
        let mut remaining = block_quota.max(1);
        let covered_orbit_len = self.covered_orbit_len();
        let mut ranges = Vec::new();
        for level_index in 0..self.levels.len() {
            if remaining == 0 {
                break;
            }
            let level = &self.levels[level_index];
            let skip = level.skip;
            if skip < MOBIUS_MIN_EMIT_SKIP {
                continue;
            }
            let slot_start = bank.validity[level_index].len();
            let slot_end = level
                .blocks
                .len()
                .min(slot_start.saturating_add(remaining));
            if slot_end <= slot_start {
                continue;
            }
            let first = 1 + slot_start * skip;
            let last = 1 + slot_end * skip;
            if last > orbit_len {
                return Err(format!(
                    "incremental rung orbit too short: need {last}, have {}",
                    orbit_len
                ));
            }
            let mut local_orbit = Vec::with_capacity(1 + last - first);
            local_orbit.push((0.0, 0.0));
            for index in first..last {
                local_orbit.push(orbit_at(index));
            }
            let local_level = UnifiedLevel {
                skip,
                blocks: level.blocks[slot_start..slot_end].to_vec(),
                moduli: level.moduli[slot_start..slot_end].to_vec(),
            };
            let bounds = unified_build_bounds(
                core::slice::from_ref(&local_level),
                &local_orbit,
                reference_log2_dc,
            );
            for local_slot in 0..local_level.blocks.len() {
                let envelope = unified_validity_envelope_for_block(
                    &local_level.blocks[local_slot],
                    &local_level.moduli[local_slot],
                    &bounds,
                    0,
                    local_slot,
                    epsilon,
                    reference_log2_dc,
                );
                bank.validity[level_index]
                    .push(serialize_validity_envelope_packed_v1(&envelope));
                bank.validity_diagnostics[level_index]
                    .push(serialize_validity_diagnostics_packed_v1(&envelope));
            }
            let slot_count = slot_end - slot_start;
            remaining -= slot_count;
            bank.cumulative_envelopes += slot_count;
            ranges.push(IncrementalUnifiedRange {
                level_index,
                skip,
                slot_start,
                slot_count,
                covered_orbit_len,
            });
        }
        Ok(ranges)
    }

    pub fn bank_has_pending_validity(&self, bank: &IncrementalUnifiedValidityBank) -> bool {
        self.levels.iter().enumerate().any(|(level_index, level)| {
            level.skip >= MOBIUS_MIN_EMIT_SKIP
                && bank.validity(level_index).len() < level.blocks.len()
        })
    }

    pub fn bank_published_orbit_len(&self, bank: &IncrementalUnifiedValidityBank) -> usize {
        self.levels
            .iter()
            .enumerate()
            .find(|(_, level)| level.skip >= MOBIUS_MIN_EMIT_SKIP)
            .map_or(1, |(level_index, level)| {
                1 + bank.validity(level_index).len() * level.skip
            })
            .min(self.covered_orbit_len())
    }

    fn update_peak_retained_bytes(&mut self) {
        let pending = self.pending.iter().filter(|entry| entry.is_some()).count()
            * core::mem::size_of::<PendingUnifiedBlock>();
        let completed = self.levels.iter().fold(0usize, |sum, level| {
            sum + level.blocks.capacity() * core::mem::size_of::<UnifiedBlock>()
                + level.moduli.capacity() * core::mem::size_of::<UnifiedModuli>()
                + level.coeffs.capacity() * core::mem::size_of::<[JetCoeffFe; UNIFIED_GPU_COEFFS]>()
                + level.validity.capacity() * core::mem::size_of::<PackedValidityEnvelopeV1>()
                + level.validity_diagnostics.capacity()
                    * core::mem::size_of::<PackedValidityDiagnosticsV1>()
        });
        self.peak_retained_bytes = self.peak_retained_bytes.max(pending + completed);
    }
}

// ── tiered radii stage (task 2.2, design D4) ───────────────────────────────────

/// §12-style closed-form radius oracle. It only sees the stored low-degree q
/// moduli, so it deliberately omits the Cauchy tail and is NOT a certificate.
/// It remains useful for diagnostics, but must never enlarge a runtime radius.
/// The proposed radius is the largest x with
/// Σ_ij |q_ij|·x^i·y^j ≤ ε·(|A|·x + |B|·y), y = c_max, capped by the pole
/// bound (|D| + |D'|·y)·x + |F|·y ≤ ¼ (den = 1 + De·z + F·c: the DEN budget
/// loses the x-independent |F|·y slice up front). Upper-crossing bisection
/// (scan_first_success), GATED at x = 0 (correctif §4.1): the
/// budget grows with x while the pure-c REST terms do not, so the admissible
/// set (REST − εS convex in x) is an interval that may exclude 0 — an emitted
/// radius must cover the whole runtime interval [0, r], so the pure-c residual
/// must pass its ε·|B|·y budget first (matters for the periodic header, which
/// consumes this radius at runtime).
pub fn closed_form_radius(
    m: &MobiusCPlus,
    log2_q: &[f64; JET_NCOEFF],
    eps: f64,
    log2_cmax: f64,
) -> f64 {
    if m.degenerate {
        return f64::NEG_INFINITY;
    }
    let l2a = m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let l2b = m.b.log2_mag().unwrap_or(f64::NEG_INFINITY);
    if !l2a.is_finite() {
        return f64::NEG_INFINITY;
    }
    let l2eps = eps.log2() - 1.0;
    // (V) at x = 0: pure-c stored terms against the ε·|B|·y budget.
    let mut rest0 = f64::NEG_INFINITY;
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        if i == 0 && log2_q[n].is_finite() {
            rest0 = lse2_pair(rest0, log2_q[n] + j as f64 * log2_cmax);
        }
    }
    if rest0.is_finite() && !(rest0 - (l2b + log2_cmax) <= l2eps) {
        return f64::NEG_INFINITY;
    }
    let l2d = m.d.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let l2dp_y = m.dp.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax;
    let l2_deff = lse2_pair(l2d, l2dp_y);
    let Some(l2_quarter) = pole_budget_log2(m, log2_cmax) else {
        return f64::NEG_INFINITY;
    };
    let pole_cap = if l2_deff.is_finite() {
        l2_quarter - l2_deff
    } else {
        0.0
    };
    scan_first_success(pole_cap.min(-1.0), |lx| {
        let l2s = lse2_pair(l2a + lx, l2b + log2_cmax);
        let mut rest = f64::NEG_INFINITY;
        for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
            if log2_q[n].is_finite() {
                rest = lse2_pair(rest, log2_q[n] + i as f64 * lx + j as f64 * log2_cmax);
            }
        }
        rest - l2s <= l2eps
    })
}

/// (V′) derivative radius (Phase B). The tier evaluator's own ∂z is exact for
/// its form, so the derivative error is the differentiated remainder series:
/// for polynomial tiers |∂z(Φ − f̃)| ≤ Σ i·|q_ij|·x^(i−1)·y^j; for rational
/// tiers the quotient rule adds the DEN corrections, bounded under the pole
/// cap |De|·x + |F|·y ≤ ¼ (DEN ≥ ¾) by
/// (4/3)·Σ i·|q|·x^(i−1)·y^j + (16/9)·|De|·Σ|q|·x^i·y^j.
/// Condition (V′): that ≤ ½ε·(|A| + |A′|·y) — the multiplier scale, the same
/// c-channel-inclusive lesson as (V)'s value scale. Upper-crossing bisection
/// as (V) (the bound is term-wise monotone in x against an x-free budget).
/// `rational` selects the DEN corrections; polynomial tiers skip the pole cap.
pub fn derivative_radius(
    m: &MobiusCPlus,
    log2_q: &[f64; JET_NCOEFF],
    eps: f64,
    log2_cmax: f64,
    rational: bool,
) -> f64 {
    if m.degenerate {
        return f64::NEG_INFINITY;
    }
    let l2a = m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
    if !l2a.is_finite() {
        return f64::NEG_INFINITY;
    }
    let l2ap_y = m.ap.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax;
    let l2scale = lse2_pair(l2a, l2ap_y);
    let l2eps = eps.log2() - 1.0;
    let l2d = m.d.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let l2dp_y = m.dp.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax;
    let l2_deff = lse2_pair(l2d, l2dp_y);
    let four_thirds = (4.0f64 / 3.0).log2();
    let top = if rational {
        let Some(l2_quarter) = pole_budget_log2(m, log2_cmax) else {
            return f64::NEG_INFINITY;
        };
        if l2_deff.is_finite() {
            (l2_quarter - l2_deff).min(-1.0)
        } else {
            -1.0
        }
    } else {
        -1.0
    };
    scan_first_success(top, |lx| {
        let mut restd = f64::NEG_INFINITY; // Σ i·|q|·x^(i−1)·y^j
        let mut rest = f64::NEG_INFINITY; // Σ |q|·x^i·y^j (rational DEN term)
        for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
            if log2_q[n].is_finite() {
                if i >= 1 {
                    restd = lse2_pair(
                        restd,
                        log2_q[n]
                            + (i as f64).log2()
                            + (i as f64 - 1.0) * lx
                            + j as f64 * log2_cmax,
                    );
                }
                if rational {
                    rest = lse2_pair(rest, log2_q[n] + i as f64 * lx + j as f64 * log2_cmax);
                }
            }
        }
        let bound = if rational {
            lse2_pair(restd + four_thirds, l2_deff + rest + 2.0 * four_thirds)
        } else {
            restd
        };
        bound <= l2eps + l2scale
    })
}

/// ∂Φ/∂z of the order-3 jet-tier evaluation — the CPU referee of the GPU's
/// register partials (shares the P_i rows with `unified_eval_jet3`).
#[allow(dead_code)]
pub fn unified_eval_jet3_dz(blk: &UnifiedBlock, z: CFe, c: CFe) -> CFe {
    let a20 = blk.a20();
    let a11 = blk.a11();
    let a21 = blk.a21();
    let a30 = blk.a30();
    let c2 = c.mul(c);
    let p1 = blk.m.a.add(a11.mul(c)).add(blk.a12.mul(c2));
    let p2 = a20.add(a21.mul(c));
    let two_p2 = CFe {
        x: 2.0 * p2.x,
        y: 2.0 * p2.y,
        e: p2.e,
    };
    let three_p3 = CFe {
        x: 3.0 * a30.x,
        y: 3.0 * a30.y,
        e: a30.e,
    };
    p1.add(two_p2.add(three_p3.mul(z)).mul(z))
}

/// Largest log2 x ≤ top satisfying a prefix predicate (true on [0, x*], false
/// above), found by upper-crossing bisection — the callers certify the prefix
/// shape: `closed_form_radius` via its x = 0 gate plus convexity of REST − εS
/// (correctif §4.1), `derivative_radius` via term-wise monotone bounds against
/// an x-free budget. Replaces the old coarse-to-fine descending scan: a dead
/// candidate costs 2 evaluations (top + floor), a live one an exponential
/// downward bracket (crossings cluster near top at loose ε) plus bisection to
/// a 0.02-log2 tolerance — finer than the old 0.25 refine grid at fewer
/// evaluations. Soundness is per-returned-x (always verified true), checked
/// by the exact-stepping referees.
fn scan_first_success(top: f64, cond: impl Fn(f64) -> bool) -> f64 {
    const FLOOR: f64 = -160.0;
    const TOL: f64 = 0.02;
    if cond(top) {
        return top;
    }
    if top <= FLOOR || !cond(FLOOR) {
        return f64::NEG_INFINITY;
    }
    let mut hi = top;
    let mut lo = FLOOR;
    let mut off = 0.5;
    while top - off > FLOOR {
        if cond(top - off) {
            lo = top - off;
            break;
        }
        hi = top - off;
        off *= 2.0;
    }
    while hi - lo > TOL {
        let mid = 0.5 * (lo + hi);
        if cond(mid) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    lo
}

/// log2 of the DEN pole budget left for the z-channel: ¼ − |F|·c_max
/// (den = 1 + De·z + F·c ⇒ DEN ≥ 1 − |De|·x − |F|·y ≥ ¾ under the cap; the
/// |F|·y slice is x-independent, so it comes off the budget up front). None
/// when that slice alone exhausts it — no x can hold the pole bound.
fn pole_budget_log2(m: &MobiusCPlus, log2_cmax: f64) -> Option<f64> {
    let l2f_y = m.f.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax;
    let fy = if l2f_y > -1074.0 { l2f_y.exp2() } else { 0.0 };
    let quarter = 0.25 - fy;
    if quarter > 0.0 {
        Some(quarter.log2())
    } else {
        None
    }
}

fn lse2_pair(a: f64, b: f64) -> f64 {
    let hi = a.max(b);
    if !hi.is_finite() {
        return hi;
    }
    let lo = a.min(b);
    hi + (1.0 + (lo - hi).exp2()).log2()
}

/// Synthetic mobius-level views over the unified table, feeding the existing
/// (V) bounds/radius machinery unchanged (design D1: one build, derived tiers).
fn to_mobius_levels(levels: &[UnifiedLevel], plain: bool) -> Vec<MobiusLevel> {
    levels
        .iter()
        .map(|lvl| MobiusLevel {
            skip: lvl.skip,
            blocks: lvl
                .blocks
                .iter()
                .zip(lvl.moduli.iter())
                .map(|(b, md)| {
                    let mut m = b.m;
                    let log2_q = if plain {
                        m.ap = CFe::ZERO;
                        m.dp = CFe::ZERO;
                        m.f = CFe::ZERO;
                        md.log2_q_plain
                    } else {
                        md.log2_q_cplus
                    };
                    MobiusBlock { m, log2_q }
                })
                .collect(),
        })
        .collect()
}

/// Tier index order: [affine, Padé, c+, jet]. (Consumed by the CPU harnesses
/// and the 2.5+ runtime plumbing; the build itself is tier-agnostic.)
#[allow(dead_code)]
pub const TIER_AFFINE: usize = 0;
#[allow(dead_code)]
pub const TIER_PADE: usize = 1;
#[allow(dead_code)]
pub const TIER_CPLUS: usize = 2;
#[allow(dead_code)]
pub const TIER_JET: usize = 3;

/// Remainder moduli for the four shipped evaluators, in stable tier order.
/// This is shared by dynamic value/derivative compilation so reconstructed
/// Jet fallback coefficients cannot accidentally be treated differently.
fn unified_remainder_moduli(blk: &UnifiedBlock, md: &UnifiedModuli) -> [[f64; JET_NCOEFF]; 4] {
    let mut q_aff = md.log2_a;
    q_aff[jet_idx(1, 0)] = f64::NEG_INFINITY;
    q_aff[jet_idx(0, 1)] = f64::NEG_INFINITY;

    let k2_live = md.log2_a[jet_idx(2, 0)].is_finite();
    let mut q_jet = md.log2_a;
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        if (i, j) == (0, 2) && blk.m.b.is_zero() {
            continue;
        }
        if (i, j) == (3, 0) && !k2_live {
            continue;
        }
        if (i as usize) + (j as usize) <= 3 {
            q_jet[n] = f64::NEG_INFINITY;
        }
    }
    [q_aff, md.log2_q_plain, md.log2_q_cplus, q_jet]
}

/// Compile the stored VALUE remainder terms of one unified block into the
/// viewport-independent log-line proof model. Cauchy tails, derivative lines,
/// pure-c terms and pole margins are intersected by the following stages.
pub fn unified_value_line_derivations(
    blk: &UnifiedBlock,
    md: &UnifiedModuli,
    epsilon: f64,
) -> [ValueLineDerivation; 4] {
    let q = unified_remainder_moduli(blk, md);
    let log2_a10 = blk.m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let rational_amplification = (4.0f64 / 3.0).log2();
    core::array::from_fn(|tier| {
        derive_value_radius_lines(
            &q[tier],
            log2_a10,
            epsilon,
            if tier == TIER_PADE || tier == TIER_CPLUS {
                rational_amplification
            } else {
                0.0
            },
        )
    })
}

pub fn unified_derivative_line_derivations(
    blk: &UnifiedBlock,
    md: &UnifiedModuli,
    epsilon: f64,
) -> [DerivativeLineDerivation; 4] {
    let q = unified_remainder_moduli(blk, md);
    let log2_a10 = blk.m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let log2_d = blk.m.d.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let log2_dp = blk.m.dp.log2_mag().unwrap_or(f64::NEG_INFINITY);
    core::array::from_fn(|tier| {
        let rational = match tier {
            TIER_PADE => Some(RationalDerivativeFactors {
                log2_d,
                log2_dp: f64::NEG_INFINITY,
            }),
            TIER_CPLUS => Some(RationalDerivativeFactors { log2_d, log2_dp }),
            _ => None,
        };
        derive_derivative_radius_lines(&q[tier], log2_a10, epsilon, rational)
    })
}

/// Mandatory low-degree value/derivative intersection for all four tiers.
pub fn unified_low_degree_line_derivations(
    blk: &UnifiedBlock,
    md: &UnifiedModuli,
    epsilon: f64,
) -> [LowDegreeLineDerivation; 4] {
    let value = unified_value_line_derivations(blk, md, epsilon);
    let derivative = unified_derivative_line_derivations(blk, md, epsilon);
    core::array::from_fn(|tier| {
        intersect_value_derivative_lines(value[tier].clone(), derivative[tier].clone())
    })
}

pub fn unified_pure_c_derivations(
    blk: &UnifiedBlock,
    md: &UnifiedModuli,
    epsilon: f64,
) -> [PureCDerivation; 4] {
    let q = unified_remainder_moduli(blk, md);
    let log2_b = blk.m.b.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let rational_amplification = (4.0f64 / 3.0).log2();
    core::array::from_fn(|tier| {
        derive_pure_c_threshold(
            &q[tier],
            log2_b,
            epsilon,
            if tier == TIER_PADE || tier == TIER_CPLUS {
                rational_amplification
            } else {
                0.0
            },
        )
    })
}

pub fn unified_pole_line_derivations(blk: &UnifiedBlock) -> [PoleLineDerivation; 4] {
    let log2_d = blk.m.d.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let log2_dp = blk.m.dp.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let log2_f = blk.m.f.log2_mag().unwrap_or(f64::NEG_INFINITY);
    core::array::from_fn(|tier| match tier {
        TIER_PADE if !blk.m.degenerate => {
            derive_rational_pole_lines(log2_d, f64::NEG_INFINITY, f64::NEG_INFINITY, 0.75)
        }
        TIER_CPLUS if !blk.m.degenerate => {
            derive_rational_pole_lines(log2_d, log2_dp, log2_f, 0.75)
        }
        TIER_PADE | TIER_CPLUS => PoleLineDerivation::dead(),
        _ => PoleLineDerivation::not_applicable(),
    })
}

/// Convert the existing Jet/Möbius majorant ladders for one block into at
/// most two viewport-independent static Cauchy candidates per tier.
pub fn unified_cauchy_candidate_derivations(
    blk: &UnifiedBlock,
    bounds: &UnifiedBounds,
    level_index: usize,
    slot: usize,
    epsilon: f64,
) -> [[CauchyCandidateEnvelope; MAX_CAUCHY_CANDIDATES]; 4] {
    let log2_a10 = blk.m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let log2_b = blk.m.b.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let log2_d = blk.m.d.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let log2_dp = blk.m.dp.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let jet_sources: Vec<CauchySource> = bounds.jet[level_index][slot]
        .cand
        .iter()
        .map(|candidate| CauchySource {
            log2_rz: candidate.log2_rz,
            log2_rc: candidate.log2_rc,
            log2_m: candidate.log2_m,
            log2_mc: candidate.log2_mc,
        })
        .collect();
    core::array::from_fn(|tier| {
        if blk.m.degenerate && (tier == TIER_PADE || tier == TIER_CPLUS) {
            return core::array::from_fn(|_| CauchyCandidateEnvelope::dead());
        }
        let (sources, rational) = match tier {
            TIER_PADE => {
                let block = &bounds.plain.per_level[level_index][slot];
                let sources = (0..MOBIUS_NCAND)
                    .map(|index| CauchySource {
                        log2_rz: block.log2_rz[index],
                        log2_rc: bounds.plain.log2_rc[index],
                        log2_m: block.log2_mq[index],
                        log2_mc: block.log2_mq[index],
                    })
                    .collect::<Vec<_>>();
                (
                    sources,
                    Some(RationalDerivativeFactors {
                        log2_d,
                        log2_dp: f64::NEG_INFINITY,
                    }),
                )
            }
            TIER_CPLUS => {
                let block = &bounds.cplus.per_level[level_index][slot];
                let sources = (0..MOBIUS_NCAND)
                    .map(|index| CauchySource {
                        log2_rz: block.log2_rz[index],
                        log2_rc: bounds.cplus.log2_rc[index],
                        log2_m: block.log2_mq[index],
                        log2_mc: block.log2_mq[index],
                    })
                    .collect::<Vec<_>>();
                (sources, Some(RationalDerivativeFactors { log2_d, log2_dp }))
            }
            _ => (jet_sources.clone(), None),
        };
        select_cauchy_candidates(
            &sources,
            CauchyTierContext {
                log2_a10,
                log2_b,
                epsilon,
                rational,
            },
        )
    })
}

/// Assemble all proof channels for one emitted block. `reference_log2_dc` is
/// the immutable lifetime domain of the reference, not the current viewport.
/// Consequently serialization of this object never needs a cmax-only rebuild.
pub fn unified_validity_envelope_for_block(
    blk: &UnifiedBlock,
    md: &UnifiedModuli,
    bounds: &UnifiedBounds,
    level_index: usize,
    slot: usize,
    epsilon: f64,
    reference_log2_dc: f64,
) -> ValidityEnvelope {
    if !reference_log2_dc.is_finite() {
        return ValidityEnvelope::dead();
    }
    let mut low_degree = unified_low_degree_line_derivations(blk, md, epsilon);
    let pure_c = unified_pure_c_derivations(blk, md, epsilon);
    let poles = unified_pole_line_derivations(blk);
    let cauchy = unified_cauchy_candidate_derivations(blk, bounds, level_index, slot, epsilon);
    let reference_dc = StaticDcCeiling {
        max_log2_dc: Log2Limit(reference_log2_dc),
    };
    let tiers = core::array::from_fn(|tier| {
        let dynamic_dc = low_degree[tier]
            .dc_threshold
            .max_log2_dc
            .0
            .min(pure_c[tier].threshold.max_log2_dc.0);
        let domain_max = reference_log2_dc
            .min(dynamic_dc)
            .min(poles[tier].dc_threshold.max_log2_dc.0);
        if domain_max.is_finite() {
            prune_low_degree_lines(&mut low_degree[tier], domain_max);
        }
        TierValidityEnvelope {
            tier: ValidityTier::ALL[tier],
            remainder: low_degree[tier].radius.clone(),
            pure_c: PureCThreshold {
                max_log2_dc: Log2Limit(dynamic_dc),
            },
            static_dc: reference_dc,
            pole: poles[tier].clone(),
            cauchy: cauchy[tier].clone(),
        }
    });
    ValidityEnvelope {
        reference_dc,
        tiers,
    }
}

pub struct UnifiedRadii {
    /// Per level, per slot: log2 EFFECTIVE radius per tier — min(value r,
    /// derivative r′). This pipeline propagates the derivative unconditionally
    /// (relief/DE shading, AA targets), so honest-der radii are always on
    /// (design D5 amended: no DE cache key).
    pub tiers: Vec<Vec<[f64; 4]>>,
    /// Raw (V′) derivative radii per tier (diagnostics + tests).
    pub tiers_der: Vec<Vec<[f64; 4]>>,
    /// Raw value radii per tier (diagnostics: der-limited ⇔ r′ < r_value).
    pub tiers_value: Vec<Vec<[f64; 4]>>,
    /// Blocks where the tail-free oracle would exceed the (V) radius, per
    /// rational tier. Diagnostic only: these proposed boosts are never applied.
    pub boost_pade: usize,
    pub boost_cplus: usize,
}

/// Bounds stage (R_c-headroom-keyed, design D9): the expensive walks — the two
/// mobius bisected-majorant tables AND the per-block jet (V) candidates — with
/// no ε dependence. A radii re-solve (ε or in-headroom c_max change) never
/// re-runs these.
pub struct UnifiedBounds {
    pub cplus: MobiusBoundsTable,
    pub plain: MobiusBoundsTable,
    pub jet: Vec<Vec<JetBlockBounds>>,
}

pub fn unified_build_bounds(
    levels: &[UnifiedLevel],
    orbit: &[(f64, f64)],
    log2_c_max: f64,
) -> UnifiedBounds {
    let mlv = to_mobius_levels(levels, false);
    let plv = to_mobius_levels(levels, true);
    let twoz: Vec<(f64, i64)> = orbit
        .iter()
        .map(|&(zx, zy)| sfe_norm(2.0 * (zx * zx + zy * zy).sqrt(), 0))
        .collect();
    let jet = levels
        .iter()
        .map(|lvl| {
            (0..lvl.blocks.len())
                .map(|s| {
                    let first = 1 + s * lvl.skip;
                    jet_block_bounds_moduli(
                        &lvl.moduli[s].log2_a,
                        &twoz[first..first + lvl.skip],
                        log2_c_max + 10.0,
                    )
                })
                .collect()
        })
        .collect();
    // One shared majorant pass for both coefficient views (the bisected
    // (R_z, M) depend only on the segments): halves this stage's cost.
    let (cplus, plain) = mobius_build_bounds_pair(&mlv, &plv, orbit, log2_c_max);
    UnifiedBounds { cplus, plain, jet }
}

/// Radii stage ((ε, c_max)-keyed, pure log2 solving): per block, the four tier
/// radii — all four from rule (V). The tail-free closed-form oracle is recorded
/// as a diagnostic only: it cannot extend a runtime radius without a Cauchy
/// tail. No cross-tier clamping: each radius is individually sound for its own
/// evaluator, and the dispatch tag points at a tier whose OWN radius covers.
pub fn unified_solve_radii(
    levels: &[UnifiedLevel],
    bounds: &UnifiedBounds,
    eps: f64,
    log2_c_max: f64,
) -> UnifiedRadii {
    unified_solve_radii_impl(levels, bounds, eps, log2_c_max, false)
}

/// Diagnostics variant: additionally runs the tail-free closed-form oracle on
/// every block (the boost_pade/boost_cplus counters). Census/test only — the
/// oracle is ~25 % of the interior radii stage and its result never reaches
/// the GPU, so the production path (unified_solve_radii) skips it.
pub fn unified_solve_radii_diag(
    levels: &[UnifiedLevel],
    bounds: &UnifiedBounds,
    eps: f64,
    log2_c_max: f64,
) -> UnifiedRadii {
    unified_solve_radii_impl(levels, bounds, eps, log2_c_max, true)
}

fn unified_solve_radii_impl(
    levels: &[UnifiedLevel],
    bounds: &UnifiedBounds,
    eps: f64,
    log2_c_max: f64,
    diagnostics: bool,
) -> UnifiedRadii {
    let mlv = to_mobius_levels(levels, false);
    let plv = to_mobius_levels(levels, true);
    let r_cv = mobius_build_radii(&mlv, &bounds.cplus, eps, log2_c_max);
    let r_pv = mobius_build_radii(&plv, &bounds.plain, eps, log2_c_max);
    // (V′) only where (V) is alive: the shipped radius is min(r, r′), so a
    // dead value kills the tier regardless — interior references produce dead
    // blocks in bulk and their derivative solve is pure waste.
    let rd_cv = mobius_build_derivative_radii(&mlv, &bounds.cplus, eps, log2_c_max, Some(&r_cv));
    let rd_pv = mobius_build_derivative_radii(&plv, &bounds.plain, eps, log2_c_max, Some(&r_pv));
    let mut boost_pade = 0usize;
    let mut boost_cplus = 0usize;
    let mut tiers: Vec<Vec<[f64; 4]>> = Vec::with_capacity(levels.len());
    let mut tiers_der: Vec<Vec<[f64; 4]>> = Vec::with_capacity(levels.len());
    let mut tiers_value: Vec<Vec<[f64; 4]>> = Vec::with_capacity(levels.len());
    for (li, lvl) in levels.iter().enumerate() {
        let mut row = Vec::with_capacity(lvl.blocks.len());
        let mut row_der = Vec::with_capacity(lvl.blocks.len());
        let mut row_value = Vec::with_capacity(lvl.blocks.len());
        for s in 0..lvl.blocks.len() {
            let rj = jet_solve_radii(&bounds.jet[li][s], eps, log2_c_max);
            let blk = &lvl.blocks[s];
            let md = &lvl.moduli[s];
            let plain_m = {
                let mut m = blk.m;
                m.ap = CFe::ZERO;
                m.dp = CFe::ZERO;
                m.f = CFe::ZERO;
                m
            };
            if diagnostics {
                let cf_p = closed_form_radius(&plain_m, &md.log2_q_plain, eps, log2_c_max);
                let cf_c = closed_form_radius(&blk.m, &md.log2_q_cplus, eps, log2_c_max);
                if cf_p > r_pv[li][s] {
                    boost_pade += 1;
                }
                if cf_c > r_cv[li][s] {
                    boost_cplus += 1;
                }
            }
            let value = [rj[0], r_pv[li][s], r_cv[li][s], rj[2]];
            // (V′): per-tier remainder moduli — affine drops only its two
            // exact slots; jet drops the whole stored degree ≤ 3 prefix,
            // EXCEPT a₀₂ on the c₀₁ = 0 fallback (F = 0) and a₃₀ on the
            // c₂₀ = 0 fallback ([1/1] D): the register reconstructions
            // a₀₂ = −F·B / a₃₀ = −D·a₂₀ then miss the raw coefficients, so
            // they stay live REST terms.
            let q = unified_remainder_moduli(blk, md);
            // Same dead-value gate as the rational tiers: min(r, r′) is −∞
            // whatever (V′) returns, so skip the solve.
            let der = [
                if value[0].is_finite() {
                    derivative_radius(&plain_m, &q[TIER_AFFINE], eps, log2_c_max, false)
                } else {
                    f64::NEG_INFINITY
                },
                rd_pv[li][s],
                rd_cv[li][s],
                if value[3].is_finite() {
                    derivative_radius(&blk.m, &q[TIER_JET], eps, log2_c_max, false)
                } else {
                    f64::NEG_INFINITY
                },
            ];
            row.push([
                value[0].min(der[0]),
                value[1].min(der[1]),
                value[2].min(der[2]),
                value[3].min(der[3]),
            ]);
            row_der.push(der);
            row_value.push(value);
        }
        tiers.push(row);
        tiers_der.push(row_der);
        tiers_value.push(row_value);
    }
    UnifiedRadii {
        tiers,
        tiers_der,
        tiers_value,
        boost_pade,
        boost_cplus,
    }
}

/// Convenience wrapper (tests, one-shot harnesses): both stages back to back,
/// diagnostics on (the boost counters feed the census prints).
#[allow(dead_code)] // one-shot convenience for tests/harnesses
pub fn unified_build_radii(
    levels: &[UnifiedLevel],
    orbit: &[(f64, f64)],
    eps: f64,
    c_max: f64,
) -> UnifiedRadii {
    let l2c = c_max.log2();
    let bounds = unified_build_bounds(levels, orbit, l2c);
    unified_solve_radii_diag(levels, &bounds, eps, l2c)
}

/// Order-3 jet-tier evaluation from the unified record (prefix + identities):
/// Φ = Σ_{i+j≤3} a_ij·z^i·c^j. The GPU path mirrors this exactly — it reads the
/// 9-slot record and reconstructs a20/a11/a21 in registers.
#[allow(dead_code)] // GPU-parity referee; consumed by the 2.6 shader harness
pub fn unified_eval_jet3(blk: &UnifiedBlock, z: CFe, c: CFe) -> CFe {
    let a20 = blk.a20();
    let a11 = blk.a11();
    let a21 = blk.a21();
    let a02 = blk.a02();
    let z2 = z.mul(z);
    let c2 = c.mul(c);
    // Row grouping P_i(c) = Σ_j a_ij c^j, Φ = Σ_i P_i·z^i (same shape as
    // jet_eval's Horner rows).
    let p0 = blk.m.b.mul(c).add(a02.mul(c2)).add(blk.a03.mul(c2).mul(c));
    let p1 = blk.m.a.add(a11.mul(c)).add(blk.a12.mul(c2));
    let p2 = a20.add(a21.mul(c));
    let p3 = blk.a30();
    p0.add(p1.mul(z)).add(p2.add(p3.mul(z)).mul(z2))
}

#[derive(Clone, Copy, Debug)]
pub struct UnifiedTierPartials {
    pub value: CFe,
    pub dz: CFe,
    pub dc: CFe,
    pub dzz: CFe,
    pub dzc: CFe,
    pub dcc: CFe,
}

#[derive(Clone, Copy, Debug)]
pub struct UnifiedCpuState {
    pub delta: CFe,
    pub derivative: CFe,
    pub second_derivative: CFe,
}

fn cfe_scale(value: CFe, scale: f64) -> CFe {
    value.mul(CFe::from_c(scale, 0.0))
}

/// CPU state-transition referee for the exact formulas implemented by the
/// unified WGSL tier branches, including first and second c derivatives.
pub fn unified_tier_partials(
    block: &UnifiedBlock,
    tier: ValidityTier,
    z: CFe,
    c: CFe,
) -> UnifiedTierPartials {
    if tier == ValidityTier::Affine {
        return UnifiedTierPartials {
            value: block.m.a.mul(z).add(block.m.b.mul(c)),
            dz: block.m.a,
            dc: block.m.b,
            dzz: CFe::ZERO,
            dzc: CFe::ZERO,
            dcc: CFe::ZERO,
        };
    }
    if tier == ValidityTier::Jet {
        let a20 = block.a20();
        let a11 = block.a11();
        let a21 = block.a21();
        let a02 = block.a02();
        let a30 = block.a30();
        let c2 = c.mul(c);
        let p0 = block
            .m
            .b
            .mul(c)
            .add(a02.mul(c2))
            .add(block.a03.mul(c2).mul(c));
        let p1 = block.m.a.add(a11.mul(c)).add(block.a12.mul(c2));
        let p2 = a20.add(a21.mul(c));
        let q0 = block
            .m
            .b
            .add(cfe_scale(a02.mul(c), 2.0))
            .add(cfe_scale(block.a03.mul(c2), 3.0));
        let q1 = a11.add(cfe_scale(block.a12.mul(c), 2.0));
        return UnifiedTierPartials {
            value: p0.add(z.mul(p1.add(z.mul(p2.add(z.mul(a30)))))),
            dz: p1.add(z.mul(cfe_scale(p2, 2.0).add(z.mul(cfe_scale(a30, 3.0))))),
            dc: q0.add(z.mul(q1.add(z.mul(a21)))),
            dzz: cfe_scale(p2, 2.0).add(cfe_scale(a30.mul(z), 6.0)),
            dzc: q1.add(cfe_scale(a21.mul(z), 2.0)),
            dcc: cfe_scale(a02, 2.0)
                .add(cfe_scale(block.a03.mul(c), 6.0))
                .add(cfe_scale(block.a12.mul(z), 2.0)),
        };
    }

    let mut rational = block.m;
    if tier == ValidityTier::Pade {
        rational.ap = CFe::ZERO;
        rational.dp = CFe::ZERO;
        rational.f = CFe::ZERO;
    }
    let (value, dz, dc) = mobius_apply(&rational, z, c);
    let de = rational.d.add(rational.dp.mul(c));
    let denominator = CFe::ONE.add(de.mul(z)).add(rational.f.mul(c));
    let dc_denominator = rational.dp.mul(z).add(rational.f);
    let dzz = cfe_scale(rational.n2.sub(de.mul(dz)).div(denominator), 2.0);
    let dcc = cfe_scale(dc_denominator.mul(dc).div(denominator), -2.0);
    let dzc = rational
        .ap
        .sub(dc.mul(de))
        .sub(value.mul(rational.dp))
        .div(denominator)
        .sub(dz.mul(dc_denominator).div(denominator));
    UnifiedTierPartials {
        value,
        dz,
        dc,
        dzz,
        dzc,
        dcc,
    }
}

pub fn unified_apply_tier_state(
    block: &UnifiedBlock,
    tier: ValidityTier,
    state: UnifiedCpuState,
    dc: CFe,
) -> UnifiedCpuState {
    let partials = unified_tier_partials(block, tier, state.delta, dc);
    let derivative = partials.dz.mul(state.derivative).add(partials.dc);
    let second_derivative = partials
        .dz
        .mul(state.second_derivative)
        .add(partials.dzz.mul(state.derivative.mul(state.derivative)))
        .add(cfe_scale(partials.dzc.mul(state.derivative), 2.0))
        .add(partials.dcc);
    UnifiedCpuState {
        delta: partials.value,
        derivative,
        second_derivative,
    }
}

// ── certified series approximation (Phase C, design D6) ─────────────────────────

/// SA stored order (bound side) and applied order (shipped polynomial).
pub const SA_STORED: usize = 8;
pub const SA_APPLIED: usize = 4;

/// Certified common prefix skip: every pixel of the tile starts at iteration
/// `n0` with δ = Σ_{j=1..4} b_j·dc^j (and ∂δ/∂c = Σ j·b_j·dc^(j−1)) instead of
/// iterating the prefix — the historical series approximation, glitch-free
/// because the radius is certified (findings §16).
#[derive(Clone, Debug)]
pub struct SaPrefix {
    pub n0: usize,
    /// b₁..b₄ — the applied-order coefficients at n0.
    pub b: [CFe; SA_APPLIED],
}

/// Build the certified SA prefix: walk the orbit maintaining the pure-c jet
/// b'_j = 2Z·b_j + Σ_{k} b_k·b_{j−k} (+1 on b₁, stored order 8) alongside
/// 1-variable majorant walks ρ ← |2Z|·ρ + ρ² + R_c (from ρ = 0) on a ladder of
/// anisotropy rungs R_c = s·c_max, s ∈ {1e2..1e12} (large s — the θ^J lesson).
/// n0 = last n where condition (V_c) holds at y = c_max on some rung:
///   Σ_{j=5..8} |b_j|·y^j  +  M·θ^(J+1)/(1−θ)  ≤  ½ε·|b₁|·y,   θ = y/R_c
/// AND the no-early-escape guard |Z_n| + ρ ≤ 1.9 (a pixel cannot escape inside
/// the certified prefix, so skipping to n0 cannot jump an escape).
pub fn sa_build(orbit: &[(f64, f64)], eps: f64, c_max: f64, max_n: usize) -> SaPrefix {
    const RUNGS: [f64; 6] = [1e2, 1e4, 1e6, 1e8, 1e10, 1e12];
    let l2eps_half = eps.log2() - 1.0;
    let l2y = c_max.log2();
    let max_n = max_n.min(orbit.len().saturating_sub(1));
    let mut b = [CFe::ZERO; SA_STORED];
    let mut rho: [CFe; RUNGS.len()] = [CFe::ZERO; RUNGS.len()];
    let mut best = SaPrefix {
        n0: 0,
        b: [CFe::ZERO; SA_APPLIED],
    };
    for n in 0..max_n {
        let (zx, zy) = orbit[n];
        let two_z = CFe::from_c(2.0 * zx, 2.0 * zy);
        // Jet step (order 8, exact truncation of the pure-c series).
        let mut nb = [CFe::ZERO; SA_STORED];
        for j in (1..=SA_STORED).rev() {
            let mut v = two_z.mul(b[j - 1]);
            for k in 1..j {
                v = v.add(b[k - 1].mul(b[j - k - 1]));
            }
            if j == 1 {
                v = v.add(CFe::ONE);
            }
            nb[j - 1] = v;
        }
        b = nb;
        // Majorant walks per rung.
        let two_z_mag = fe_exp2((4.0 * (zx * zx + zy * zy)).max(1e-300).log2() * 0.5);
        for (g, r) in rho.iter_mut().enumerate() {
            // Dead-rung freeze BEFORE the update: past the consumer's
            // saturation cut (2^20) the square dominates (ρ² ≥ ρ for ρ ≥ 1),
            // so the walk can only explode — it will never certify again.
            // Updating it anyway doubles the CFe exponent every step (ρ²),
            // overflowing the i64 in ~60 steps: a debug panic, and a SILENT
            // wrap in release that can relaunder the saturated walk as a
            // small ρ — a false certificate. Frozen, the rung stays above
            // the cut and the (V_c) check skips it forever.
            if r.log2_mag().unwrap_or(f64::NEG_INFINITY) > 20.0 {
                continue;
            }
            let rc = fe_exp2(l2y + RUNGS[g].log2());
            *r = two_z_mag.mul(*r).add(r.mul(*r)).add(rc);
        }
        // Condition (V_c) at n+1, best rung.
        let l2b1 = b[0].log2_mag().unwrap_or(f64::NEG_INFINITY);
        if !l2b1.is_finite() {
            continue;
        }
        let scale = l2eps_half + l2b1 + l2y;
        let mut stored = f64::NEG_INFINITY;
        for j in (SA_APPLIED + 1)..=SA_STORED {
            let l = b[j - 1].log2_mag().unwrap_or(f64::NEG_INFINITY);
            stored = lse2_pair(stored, l + j as f64 * l2y);
        }
        let zmag = (zx * zx + zy * zy).sqrt();
        let mut ok = false;
        for (g, r) in rho.iter().enumerate() {
            let l2rc = l2y + RUNGS[g].log2();
            let theta = l2y - l2rc;
            let l2m = r.log2_mag().unwrap_or(f64::NEG_INFINITY);
            if !l2m.is_finite() || l2m > 20.0 {
                continue; // saturated walk
            }
            // No-early-escape guard: |Z| + ρ ≤ 1.9 for this rung's bound.
            let rho_lin = if l2m < 0.9 { l2m.exp2() } else { f64::INFINITY };
            if zmag + rho_lin > 1.9 {
                continue;
            }
            let queue =
                l2m + (SA_STORED as f64 + 1.0) * theta - (1.0 - theta.exp2()).max(1e-12).log2();
            if lse2_pair(stored, queue) <= scale {
                ok = true;
                break;
            }
        }
        if ok {
            best = SaPrefix {
                n0: n + 1,
                b: [b[0], b[1], b[2], b[3]],
            };
        } else if best.n0 > 0 && n + 1 > best.n0 + 64 {
            // The profile collapsed 64 steps ago (first quasi-critical
            // passage): later recoveries would skip OVER the passage with a
            // stale bound — stop at the certified prefix.
            break;
        }
    }
    best
}

/// Diagnostic r_c(N) profile: the largest certified log2 |c| at sampled N
/// (locates the first quasi-critical passage — findings §16).
#[allow(dead_code)]
pub fn sa_profile(orbit: &[(f64, f64)], eps: f64, samples: &[usize]) -> Vec<(usize, f64)> {
    samples
        .iter()
        .map(|&n| {
            let (mut lo, mut hi) = (-160.0f64, -1.0f64); // log2 c bisection
            for _ in 0..24 {
                let mid = 0.5 * (lo + hi);
                if sa_build(orbit, eps, mid.exp2(), n).n0 >= n {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            (n, lo)
        })
        .collect()
}

// ── interior/periodic regime (Phase E, design D8, findings §17) ─────────────────

/// Longest reference period the build will detect.
pub const PERIODIC_MAX_P: usize = 512;

/// Runtime proof used by a periodic header.  The direct majorant is the
/// critical-point fallback: unlike the Möbius chart it remains valid when the
/// cycle multiplier A is exactly zero at a minibrot nucleus.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PeriodicCertificateKind {
    MobiusInvariant,
    DirectMajorant,
}

impl PeriodicCertificateKind {
    fn header_code(self) -> f32 {
        match self {
            PeriodicCertificateKind::MobiusInvariant => 0.0,
            PeriodicCertificateKind::DirectMajorant => 1.0,
        }
    }
}

/// The composed period block Φ_p in c+ form, with its certified entry radius:
/// for a pixel in the periodic phase, Φ_p is a fixed Möbius map of the delta.
/// A proved exact disk-invariance certificate gives an interiority verdict at
/// cost O(p) instead of maxiter.  Uniform contraction remains optional.
#[derive(Clone, Debug)]
pub struct PeriodicBlock {
    pub start: usize,
    pub p: usize,
    pub kind: PeriodicCertificateKind,
    pub m: MobiusCPlus,
    /// Certified entry radius, log2 |δ|.  For the Möbius path this is the
    /// strict (V) value radius over the whole interval from zero; for the
    /// direct path it is a trapping radius for the exact scalar recurrence.
    pub log2_r: f64,
    /// Uniform block-model error divided by the certified disk radius:
    ///   err/r ≤ ½·ε_int·(|A| + |B|·c_max/r).
    /// Serialized with the periodic header so the GPU can apply the proved
    /// disk-invariance test without rebuilding a Cauchy bound per pixel.
    pub log2_err_over_r: f64,
}

/// Log2 of the exact scalar majorant after one complete period:
///
///   ρ₀ = r,
///   ρₖ₊₁ = 2|Zₖ|ρₖ + ρₖ² + c_max.
///
/// `Bounds.scalar_majorant` proves by induction that this encloses every exact
/// perturbation with |δ₀|≤r and |dc|≤c_max.  The small per-step log slack is
/// vastly dominated by the 5% build margin and covers f64/libm evaluation
/// noise without changing the useful radius.
fn periodic_direct_image_log2(orbit_seg: &[(f64, f64)], log2_r: f64, log2_cmax: f64) -> f64 {
    const STEP_LOG2_SLACK: f64 = 1e-12;
    let mut rho = log2_r;
    for &(zx, zy) in orbit_seg {
        let two_z = 2.0 * zx.hypot(zy);
        let linear = if two_z > 0.0 {
            two_z.log2() + rho
        } else {
            f64::NEG_INFINITY
        };
        rho = lse2_pair(lse2_pair(linear, 2.0 * rho), log2_cmax) + STEP_LOG2_SLACK;
    }
    rho
}

/// A large trapping radius for the exact grouped period return.  The
/// log-ratio `log2(image/r)` is convex because the scalar return majorant is a
/// positive-coefficient polynomial in r.  Ternary search finds its minimum;
/// bisection then takes the large-radius crossing.  Search failure merely
/// declines the optimization, while the returned candidate is independently
/// rechecked after f32 serialization.
fn periodic_direct_radius(orbit_seg: &[(f64, f64)], log2_cmax: f64) -> f64 {
    const SEARCH_ITERS: usize = 72;
    const BISECT_ITERS: usize = 80;
    const IMAGE_RATIO: f64 = 0.95;
    const SERIALIZED_LIMIT: f64 = 0.98;
    if orbit_seg.is_empty() || !log2_cmax.is_finite() || log2_cmax >= 0.0 {
        return f64::NEG_INFINITY;
    }
    let defect = |x: f64| periodic_direct_image_log2(orbit_seg, x, log2_cmax) - x;
    let mut left = log2_cmax;
    let mut right = 0.0;
    for _ in 0..SEARCH_ITERS {
        let x1 = (2.0 * left + right) / 3.0;
        let x2 = (left + 2.0 * right) / 3.0;
        if defect(x1) <= defect(x2) {
            right = x2;
        } else {
            left = x1;
        }
    }
    let minimum = 0.5 * (left + right);
    let target = IMAGE_RATIO.log2();
    if defect(minimum).partial_cmp(&target) != Some(core::cmp::Ordering::Less) {
        return f64::NEG_INFINITY;
    }

    // The r=1 endpoint cannot pass because every exact step contains ρ².
    left = minimum;
    right = 0.0;
    for _ in 0..BISECT_ITERS {
        let mid = 0.5 * (left + right);
        if defect(mid) < target {
            left = mid;
        } else {
            right = mid;
        }
    }
    // Store exactly the f32 radius consumed by WGSL, with a small inward nudge
    // before conversion; the final check is the executable proof obligation.
    let serialized = (left - 1e-5) as f32 as f64;
    if defect(serialized) < SERIALIZED_LIMIT.log2() {
        serialized
    } else {
        f64::NEG_INFINITY
    }
}

/// Choose a useful phase for the direct scalar certificate without an O(p²)
/// all-phase search.  Besides the detector's phase, try the point of the cycle
/// closest to the critical point: its small linear factor 2|Z| usually gives
/// the largest radial trapping disk at a minibrot nucleus.  Both candidates
/// are fully certified and the larger one wins, so the heuristic can never
/// make the baseline phase worse.  The extra build work is at most one more
/// O(p) radius solve and the GPU runtime is unchanged.
fn periodic_direct_certificate(
    orbit: &[(f64, f64)],
    start: usize,
    period: usize,
    log2_cmax: f64,
) -> Option<(usize, f64)> {
    if period == 0 || start + period > orbit.len() {
        return None;
    }
    let critical_phase = (0..period)
        .min_by(|&i, &j| {
            let zi = orbit[start + i];
            let zj = orbit[start + j];
            zi.0.hypot(zi.1)
                .partial_cmp(&zj.0.hypot(zj.1))
                .unwrap_or(core::cmp::Ordering::Equal)
        })
        .unwrap_or(0);
    let mut best: Option<(usize, f64)> = None;
    for phase in [0, critical_phase] {
        let candidate_start = start + phase;
        if candidate_start + period > orbit.len()
            || best
                .map(|(best_start, _)| best_start == candidate_start)
                .unwrap_or(false)
        {
            continue;
        }
        let radius =
            periodic_direct_radius(&orbit[candidate_start..candidate_start + period], log2_cmax);
        if radius.is_finite() && best.map(|(_, r)| radius > r).unwrap_or(true) {
            best = Some((candidate_start, radius));
        }
    }
    best
}

/// Why the periodic header is active or was left dormant.  The numeric values
/// are part of the WASM/TypeScript observability contract.
#[repr(u32)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PeriodicBuildStatus {
    /// No completed diagnostic has been published yet (frontend "pending").
    Pending = 0,
    /// A certified periodic block is present in the header.
    Active = 1,
    /// The reference orbit is below the minimum diagnostic length.
    OrbitTooShort = 2,
    /// No sustained periodic tail was found in the available orbit.
    NoConvergedPeriod = 3,
    /// A tail period was found, but exceeds the runtime composition cap.
    PeriodTooLarge = 4,
    /// The period was found, but the Möbius/Cauchy certificate was rejected.
    CertificateRejected = 5,
}

impl PeriodicBuildStatus {
    pub fn code(self) -> u32 {
        self as u32
    }
}

#[derive(Clone, Debug)]
pub struct PeriodicBuildOutcome {
    pub block: Option<PeriodicBlock>,
    pub status: PeriodicBuildStatus,
    /// Fundamental tail period, or a nucleus-return candidate when the orbit
    /// is still too short to contain the four-cycle confirmation window.
    pub detected_period: usize,
}

fn periodic_outcome(
    block: Option<PeriodicBlock>,
    status: PeriodicBuildStatus,
    detected_period: usize,
) -> PeriodicBuildOutcome {
    PeriodicBuildOutcome {
        block,
        status,
        detected_period,
    }
}

/// Detect reference periodicity after the transient (sustained |Z_{k+p} − Z_k|
/// < 1e-12 through the orbit tail) and compose Φ_p from p seed jets at the
/// earliest converged phase. None for escaping/aperiodic references.
pub fn periodic_build_diagnostic(
    orbit: &[(f64, f64)],
    eps: f64,
    log2_cmax: f64,
) -> PeriodicBuildOutcome {
    const TOL2: f64 = 1e-24;
    let n = orbit.len();
    // A Find-minibrot recenter puts the reference at a super-attracting
    // nucleus, so z_p ≈ 0 already exposes p after one cycle. This is diagnostic
    // only: block construction still requires the sustained tail below.
    let nucleus_period = || {
        orbit
            .iter()
            .enumerate()
            .skip(1)
            .find(|(_, z)| z.0 * z.0 + z.1 * z.1 < TOL2)
            .map(|(i, _)| i)
            .unwrap_or(0)
    };
    if n < 256 {
        return periodic_outcome(None, PeriodicBuildStatus::OrbitTooShort, nucleus_period());
    }
    let last = n - 1;
    let mut period = 0usize;
    // Scan beyond the runtime cap for observability only.  Almost every wrong
    // p fails on k=0, so this remains an O(n) tail scan in practice; expensive
    // jet composition still never runs above PERIODIC_MAX_P.
    'outer: for p in 1..=(n / 4).max(1) {
        let window = (2 * p).min(last - p);
        for k in 0..window {
            let a = orbit[last - k];
            let b = orbit[last - p - k];
            let (dx, dy) = (a.0 - b.0, a.1 - b.1);
            if dx * dx + dy * dy >= TOL2 {
                continue 'outer;
            }
        }
        period = p;
        break;
    }
    if period == 0 {
        let candidate = nucleus_period();
        if candidate > PERIODIC_MAX_P {
            return periodic_outcome(None, PeriodicBuildStatus::PeriodTooLarge, candidate);
        }
        if candidate > 0 && n < candidate.saturating_mul(4) {
            return periodic_outcome(None, PeriodicBuildStatus::OrbitTooShort, candidate);
        }
        return periodic_outcome(None, PeriodicBuildStatus::NoConvergedPeriod, candidate);
    }
    if period > PERIODIC_MAX_P {
        return periodic_outcome(None, PeriodicBuildStatus::PeriodTooLarge, period);
    }
    // Earliest start where the periodicity is already converged below tol.
    let mut start = last - period;
    while start > 1 {
        let a = orbit[start - 1];
        let b = orbit[start - 1 + period];
        let (dx, dy) = (a.0 - b.0, a.1 - b.1);
        if dx * dx + dy * dy >= TOL2 {
            break;
        }
        start -= 1;
    }
    if start + period >= n {
        return periodic_outcome(None, PeriodicBuildStatus::OrbitTooShort, period);
    }
    let orbit_seg = &orbit[start..start + period];

    // Compose Φ_p at phase `start` (seeds start..start+p−1: δ ← 2Z_i·δ + δ² + c).
    // c+ F-form used by the proved runtime disk certificate:
    // m(δ) = (Ae·δ + Bc)/(1 + De·δ + Fc).
    let mut jet = jet_seed(orbit[start].0, orbit[start].1);
    for i in (start + 1)..(start + period) {
        jet = crate::jet::jet_compose(&jet, &jet_seed(orbit[i].0, orbit[i].1));
    }
    // The periodic header stays on the [1/1] extraction: the runtime theorem
    // applies to a Möbius self-map of a disk. The [2/1] numerator is no longer
    // Möbius and would need a separate enclosure/contraction proof.
    let m = mobius_from_jet(&jet);
    if m.degenerate {
        // The grouped exact recurrence is the denominator-free fallback at a
        // super-attracting nucleus (A = 0).  Compute it lazily: the normal
        // Möbius path must not pay its O(search_iters * p) construction cost.
        if let Some((direct_start, direct_log2_r)) =
            periodic_direct_certificate(orbit, start, period, log2_cmax)
        {
            return periodic_outcome(
                Some(PeriodicBlock {
                    start: direct_start,
                    p: period,
                    kind: PeriodicCertificateKind::DirectMajorant,
                    m,
                    log2_r: direct_log2_r,
                    log2_err_over_r: f64::NEG_INFINITY,
                }),
                PeriodicBuildStatus::Active,
                period,
            );
        }
        return periodic_outcome(None, PeriodicBuildStatus::CertificateRejected, period);
    }
    let q = q_moduli(&jet, &m, &Q_ZEROS_PERIODIC);
    // The interiority verdict only needs a sound value-error bound and disk
    // invariance; V′ and a contraction-rate estimate are optional stronger
    // properties and must not suppress a valid trapping disk.
    let eps_int = eps.max(1e-4);
    // The Cauchy solve is performed from f64-composed jets.  Keep a separate
    // 5% construction reserve for coefficient/libm rounding; the serialized
    // model-error bound below still uses the full eps_int budget.
    const VALUE_CERT_BUILD_SLACK: f64 = 1.05;
    let cert_eps = eps_int / VALUE_CERT_BUILD_SLACK;
    // Full Cauchy value certificate over the p composed steps (bisected
    // majorant + strict (V) solve, x = 0 gated).
    let blk = MobiusBlock { m, log2_q: q };
    let log2_r = mobius_certify_segment_value(&blk, orbit_seg, cert_eps, log2_cmax);
    if !log2_r.is_finite() {
        // A value-certificate failure can still admit the exact scalar
        // trapping proof.  This is the only other point at which the more
        // expensive direct construction is attempted.
        if let Some((direct_start, direct_log2_r)) =
            periodic_direct_certificate(orbit, start, period, log2_cmax)
        {
            return periodic_outcome(
                Some(PeriodicBlock {
                    start: direct_start,
                    p: period,
                    kind: PeriodicCertificateKind::DirectMajorant,
                    m,
                    log2_r: direct_log2_r,
                    log2_err_over_r: f64::NEG_INFINITY,
                }),
                PeriodicBuildStatus::Active,
                period,
            );
        }
        return periodic_outcome(None, PeriodicBuildStatus::CertificateRejected, period);
    }
    // (V) certifies |g(z)-m(z)| ≤ ½·ε_int·(|A|·r+|B|·c_max)
    // throughout |z| ≤ r.  Keep the ratio in log2 form so extreme-deep
    // c_max values never underflow while crossing the Rust→WGSL boundary.
    let log2_a = m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let log2_bc_over_r = m.b.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax - log2_r;
    let log2_err_over_r = (0.5 * eps_int).log2() + lse2_pair(log2_a, log2_bc_over_r);
    let block = PeriodicBlock {
        start,
        p: period,
        kind: PeriodicCertificateKind::MobiusInvariant,
        m,
        log2_r,
        log2_err_over_r,
    };
    periodic_outcome(Some(block), PeriodicBuildStatus::Active, period)
}

#[allow(dead_code)]
pub fn periodic_build(orbit: &[(f64, f64)], eps: f64, log2_cmax: f64) -> Option<PeriodicBlock> {
    periodic_build_diagnostic(orbit, eps, log2_cmax).block
}

// ── GPU serialization (task 2.3, designs D2/D3) ─────────────────────────────────

/// Slots per shipped coefficient record: the prefix-ordered
/// [A, B, D, N₂, A′, D′, F, a₁₂, a₀₃] — 108 B at 12 B/coefficient. Tier
/// prefix reads: affine 24 B, Padé 48 B, c+ 84 B, jet 108 B (the jet tier
/// reconstructs a₂₀/a₁₁/a₂₁/a₀₂/a₃₀ in registers).
pub const UNIFIED_GPU_COEFFS: usize = 9;

/// GPU radius sidecar entry, 16 B vec4-packed (one coalesced probe): x = the
/// PRINCIPAL tier's certified radius (log2, f32; −∞ ⇒ never applied), y = its
/// tag (0/1/2/3 = affine/Padé/c+/jet, exactly representable), z = the packed
/// pair `f32_safe + 2·secours_tag` (values 0..7, exact in f32), w = the
/// SECOURS tier's certified radius (−∞ ⇒ no fallback candidate). The
/// portfolio rule (plan §8): principal = cheapest tier covering the working
/// band; secours = the largest-radius tier when it strictly beats the
/// principal's radius — the shader falls back to it when |dz| lands between
/// the two radii, reading the same 9-slot record. Each radius is only ever
/// used with its OWN tier (no cross-tier clamping).
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct UnifiedRadius {
    pub r_log2: f32,
    pub tag: f32,
    pub f32_safe: f32,
    pub pad: f32,
}

/// §6.3 selection model. The working band is the REPLAY-observed |dz|
/// distribution (`unified_replay_band`; the census-note-5 placeholder
/// c_max + 10 remains the fallback), summarized as a (median, spread)
/// pair — so coverage is modeled as a SOFT logistic in log2 space around the
/// median instead of a hard cliff: a tier whose radius sits at the median
/// covers about half the entries, one spread above covers most. Traffic cost
/// per applied tier = prefix record bytes + the 16 B sidecar probe, plus an
/// op weight in byte-equivalents (relative arithmetic of the tier's
/// evaluation path).
pub const UNIFIED_TIER_BYTES: [f64; 4] = [40.0, 64.0, 100.0, 124.0];
/// Op weights at f32-path cost. The jet weight reflects the order-3 Horner +
/// identity reconstruction + second partials (heavier than c⁺ even in f32).
pub const UNIFIED_TIER_OPS_W: [f64; 4] = [8.0, 28.0, 44.0, 90.0];
/// Floatexp evaluator multiplier on the op weights (blocks whose coefficients
/// fail the f32-safe check, and every deep-loop application).
pub const UNIFIED_FE_OPS_MULT: f64 = 2.5;
/// Sidecar probe (16 B, always paid once per attempt).
pub const UNIFIED_PROBE_COST: f64 = 16.0;
/// λ_fail stand-in: expected cost of descending a level (another probe plus
/// a smaller-skip application chain). Calibratable from the panel counters.
pub const UNIFIED_DESCEND_COST: f64 = 256.0;
/// λ_div: extra cost of the secours' divergent record read within a warp.
pub const UNIFIED_DIV_PENALTY: f64 = 16.0;
/// Fallback spread when no replay distribution is available.
pub const UNIFIED_BAND_SPREAD_LOG2: f64 = 2.0;

fn unified_cover_prob(r_log2: f64, log2_band: f64, log2_spread: f64) -> f64 {
    if !r_log2.is_finite() {
        return 0.0;
    }
    1.0 / (1.0 + ((log2_band - r_log2) / log2_spread).exp2())
}

/// §6.3 replay-derived working band. Replays the exact perturbation
/// recurrence dz′ = 2Z·dz + dz² + dc — WITH the Zhuoran rebase
/// (|Z + dz| < |dz| ⇒ dz ← Z + dz, reference back to index 0), which is what
/// keeps the runtime |dz| in the band the block probes actually see — for a
/// ring of sample pixels at |dc| = c_max and c_max/4, collecting log2|dz| at
/// every step. Arithmetic is CFe, so any zoom depth is in range. Returns
/// (median, spread) of the observed distribution in log2, spread =
/// max(1, p90 − p50) octaves; falls back to (c_max + 10, 2) when the orbit is
/// too short to replay.
pub fn unified_replay_band(orbit: &[(f64, f64)], log2_c_max: f64) -> (f64, f64) {
    let n = orbit.len();
    if n < 8 {
        return (log2_c_max + 10.0, UNIFIED_BAND_SPREAD_LOG2);
    }
    let e_int = log2_c_max.floor();
    let frac = (log2_c_max - e_int).exp2();
    let mk_dc = |ring: f64, ang: f64| -> CFe {
        let mut v = CFe::from_c(ring * frac * ang.cos(), ring * frac * ang.sin());
        if !v.is_zero() {
            v.e += e_int as i64;
        }
        v
    };
    let mut samples: Vec<f64> = Vec::new();
    // The quantiles converge long before the full orbit: cap the replay at 8k
    // steps per sample (16 samples × 8k CFe steps ≈ 25 ms native).
    let steps = n.min(8192);
    for ring in [1.0f64, 0.25] {
        for k in 0..8 {
            let ang = (k as f64 + 0.37) * core::f64::consts::PI / 4.0;
            let dc = mk_dc(ring, ang);
            let mut dz = dc;
            let mut m = 1usize; // reference index (dz_1 = dc after Z_0 = 0)
            for _ in 1..steps {
                if m >= n {
                    break;
                }
                let (zx, zy) = orbit[m];
                let two_z = CFe::from_c(2.0 * zx, 2.0 * zy);
                dz = two_z.mul(dz).add(dz.mul(dz)).add(dc);
                m += 1;
                let l = dz.log2_mag().unwrap_or(f64::NEG_INFINITY);
                if l > 1.0 {
                    break; // escaped: past every block radius anyway
                }
                if l.is_finite() {
                    samples.push(l);
                }
                // Zhuoran rebase against the NEXT reference point.
                if m < n {
                    let (zx1, zy1) = orbit[m];
                    let full = CFe::from_c(zx1, zy1).add(dz);
                    let lf = full.log2_mag().unwrap_or(f64::NEG_INFINITY);
                    if lf < l {
                        dz = full;
                        m = 0;
                    }
                }
            }
        }
    }
    if samples.len() < 32 {
        return (log2_c_max + 10.0, UNIFIED_BAND_SPREAD_LOG2);
    }
    samples.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let p = |q: f64| samples[((samples.len() - 1) as f64 * q) as usize];
    let med = p(0.5);
    let spread = (p(0.9) - med).max(1.0);
    (med, spread)
}

/// §6.2 + §6.3 portfolio rule, full expected-cost form. The PAIR
/// (principal, secours) is chosen jointly by enumerating every combination
/// (4 principals × {none ∪ tiers with a strictly larger radius}) and scoring
///
///   score = E[couverture] / E[coût]
///   E[couverture] = P_p + (1 − P_p)·P_s                (skip is level-constant)
///   E[coût]       = probe
///                 + P_p·C_p
///                 + (1 − P_p)·( P_s·(C_s + λ_div) + (1 − P_s)·C_desc )
///
/// which instantiates the master-plan formula: the λ_fail term is the real
/// cost of a failed principal (the secours application or the level descent),
/// λ_div penalizes the divergent record read when the secours differs from
/// the principal, and the per-tier op weights are FE-AWARE: a block whose
/// coefficients fail the f32-safe check pays the floatexp evaluator on every
/// tier (the jet tag now has an f32 fast path too, so f32-safe blocks price
/// all four tiers at their f32 cost). This is what routes mid-band fallback
/// traffic to c⁺/Padé instead of funneling everything to the most expensive
/// tier — the panel measured 91 % secours = jet-fe under the argmax rule.
/// Returns (principal, secours, secours_radius); secours == principal with a
/// −∞ radius encodes "no fallback". None ⇔ every tier is dead.
pub fn unified_portfolio_tags_with(
    tiers: &[f64; 4],
    log2_band: f64,
    log2_spread: f64,
    f32_safe: bool,
) -> Option<(usize, usize, f64)> {
    if tiers.iter().all(|r| !r.is_finite()) {
        return None;
    }
    let fe_mult = if f32_safe { 1.0 } else { UNIFIED_FE_OPS_MULT };
    let cost = |t: usize| UNIFIED_TIER_BYTES[t] + UNIFIED_TIER_OPS_W[t] * fe_mult;
    let p: Vec<f64> = tiers
        .iter()
        .map(|&r| unified_cover_prob(r, log2_band, log2_spread))
        .collect();
    let mut best: Option<(usize, usize, f64)> = None;
    let mut best_score = f64::NEG_INFINITY;
    for pr in 0..4 {
        if !tiers[pr].is_finite() {
            continue;
        }
        // s == pr encodes "no secours".
        for sc in 0..4 {
            if sc != pr && !(tiers[sc].is_finite() && tiers[sc] > tiers[pr]) {
                continue;
            }
            let (ps, cs) = if sc == pr {
                (0.0, 0.0)
            } else {
                (p[sc], cost(sc) + UNIFIED_DIV_PENALTY)
            };
            let cover = p[pr] + (1.0 - p[pr]) * ps;
            let ecost = UNIFIED_PROBE_COST
                + p[pr] * cost(pr)
                + (1.0 - p[pr]) * (ps * cs + (1.0 - ps) * UNIFIED_DESCEND_COST);
            let score = cover / ecost;
            if score > best_score {
                best_score = score;
                best = Some((
                    pr,
                    sc,
                    if sc == pr {
                        f64::NEG_INFINITY
                    } else {
                        tiers[sc]
                    },
                ));
            }
        }
    }
    best
}

/// Back-compat wrapper (censuses, tests): pair selection assuming f32-safe.
pub fn unified_portfolio_tags(
    tiers: &[f64; 4],
    log2_band: f64,
    log2_spread: f64,
) -> Option<(usize, usize, f64)> {
    unified_portfolio_tags_with(tiers, log2_band, log2_spread, true)
}

/// LEGACY tag rule (design D3 + census note 5): the cheapest tier whose OWN
/// radius covers the working band; when no tier covers the band, fall back to
/// the tier with the largest radius (usually jet). Superseded by
/// `unified_portfolio_tags` for the shipped sidecar; kept for censuses and
/// regression baselines.
pub fn unified_tag(tiers: &[f64; 4], log2_band: f64) -> Option<usize> {
    for (t, &r) in tiers.iter().enumerate() {
        if log2_band < r {
            return Some(t);
        }
    }
    let (mut best, mut best_r) = (None, f64::NEG_INFINITY);
    for (t, &r) in tiers.iter().enumerate() {
        if r.is_finite() && r > best_r {
            best = Some(t);
            best_r = r;
        }
    }
    best
}

fn unified_f32_safe(md: &UnifiedModuli, m: &MobiusCPlus) -> bool {
    // Every degree ≤ 3 modulus (stored slots AND identity-reconstructed ones)
    // must reconstruct inside the f32 range with Horner headroom — plus F and
    // N₂ themselves (shipped slots the fast path reconstructs, derived from
    // RATIOS of jet coefficients the moduli don't cover).
    let slot_ok = |c: &CFe| match c.log2_mag() {
        None => true,
        Some(l) => l.abs() <= MOBIUS_F32_SAFE_LOG2,
    };
    slot_ok(&m.f)
        && slot_ok(&m.n2)
        && JET_MONOMIALS.iter().enumerate().all(|(n, &(i, j))| {
            if (i as usize) + (j as usize) > 3 {
                return true;
            }
            let l = md.log2_a[n];
            !l.is_finite() || l.abs() <= MOBIUS_F32_SAFE_LOG2
        })
}

/// Dynamic dispatch uses the legacy 16-byte sidecar as a conservative
/// any-tier prefilter before touching the 96-byte packed proof. For each
/// block, the summary stores the largest tier domain, largest candidate
/// radius, and the tightest one of the four slope-wise upper envelopes at the
/// certified reference-domain edge. If this optimistic summary rejects, every
/// tier necessarily rejects; otherwise the shader performs the full packed
/// proof. The negative z marker distinguishes this layout from rollback
/// principal/secours sidecars while encoding both slope and f32 safety.
pub fn unified_dynamic_block_sidecar(
    block: &UnifiedBlock,
    moduli: &UnifiedModuli,
    validity: &PackedValidityEnvelopeV1,
    reference_log2_dc: f64,
) -> UnifiedRadius {
    let mut max_log2_dc = f32::NEG_INFINITY;
    let mut max_candidate_radius = f32::NEG_INFINITY;
    for tier in validity.tiers.iter() {
        max_log2_dc = max_log2_dc.max(tier.max_log2_dc);
        max_candidate_radius = max_candidate_radius.max(tier.candidate_radius);
    }

    let mut selected_slope = 0usize;
    let mut selected_intercept = f32::INFINITY;
    let mut selected_at_edge = f64::INFINITY;
    for line in 0..SERIALIZED_VALIDITY_LINE_COUNT {
        let max_intercept = validity
            .tiers
            .iter()
            .map(|tier| tier.line_intercepts[line])
            .fold(f32::NEG_INFINITY, f32::max);
        let at_edge =
            max_intercept as f64 + SERIALIZED_VALIDITY_SLOPES[line] as f64 * reference_log2_dc;
        if at_edge < selected_at_edge {
            selected_slope = line;
            selected_intercept = max_intercept;
            selected_at_edge = at_edge;
        }
    }

    let safe = if unified_f32_safe(moduli, &block.m) {
        1u32
    } else {
        0u32
    };
    let summary_code = safe + 2 * selected_slope as u32;
    let packed_intercept = if selected_intercept.is_finite() {
        let bits = selected_intercept.to_bits();
        let rounded_up_bits = if selected_intercept.is_sign_negative() {
            bits & !7
        } else {
            bits.saturating_add(7) & !7
        };
        f32::from_bits(rounded_up_bits | summary_code)
    } else {
        selected_intercept
    };
    // Every serialized slope is non-positive, so the affine radius can only
    // grow as dc moves inward from the certified reference-domain edge. This
    // edge value is therefore a domain-wide lower bound and may accept affine
    // without fetching packed-v1. Keep the value negative so z<0 remains an
    // unambiguous dynamic-sidecar marker versus legacy tags.
    let affine_floor = validity.tiers[0]
        .radius_log2(reference_log2_dc as f32)
        .min(-f32::MIN_POSITIVE);
    UnifiedRadius {
        r_log2: packed_intercept,
        tag: max_log2_dc,
        f32_safe: affine_floor,
        pad: max_candidate_radius,
    }
}

/// Serialize the emitted (skip ≥ 4) levels' coefficient records, index-aligned
/// with `unified_serialize_radii`'s sidecar.
pub fn unified_serialize_block_coeffs(block: &UnifiedBlock) -> [JetCoeffFe; UNIFIED_GPU_COEFFS] {
    [
        cfe_to_coeff(&block.m.a),
        cfe_to_coeff(&block.m.b),
        cfe_to_coeff(&block.m.d),
        cfe_to_coeff(&block.m.n2),
        cfe_to_coeff(&block.m.ap),
        cfe_to_coeff(&block.m.dp),
        cfe_to_coeff(&block.m.f),
        cfe_to_coeff(&block.a12),
        cfe_to_coeff(&block.a03),
    ]
}

pub fn unified_serialize_coeffs(levels: &[UnifiedLevel]) -> Vec<[JetCoeffFe; UNIFIED_GPU_COEFFS]> {
    let mut out = Vec::new();
    for lvl in levels {
        if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
            continue;
        }
        for b in &lvl.blocks {
            out.push(unified_serialize_block_coeffs(b));
        }
    }
    out
}

/// Serialize the packed-v1 dynamic proof records and their own level
/// directory. The flat index is identical to `unified_serialize_coeffs`; the
/// directory is intentionally independent from the legacy radius sidecar so
/// either contract can be transported and audited on its own.
pub fn unified_serialize_validity_envelopes(
    levels: &[UnifiedLevel],
    bounds: &UnifiedBounds,
    epsilon: f64,
    reference_log2_dc: f64,
) -> (
    Vec<PackedValidityEnvelopeV1>,
    Vec<PackedValidityDiagnosticsV1>,
    Vec<JetLevel>,
) {
    let mut out = Vec::new();
    let mut diagnostics = Vec::new();
    let mut dir = Vec::new();
    for (level_index, level) in levels.iter().enumerate() {
        if level.skip < MOBIUS_MIN_EMIT_SKIP {
            continue;
        }
        let offset = out.len() as u32;
        let mut max_radius = f32::NEG_INFINITY;
        for slot in 0..level.blocks.len() {
            let envelope = unified_validity_envelope_for_block(
                &level.blocks[slot],
                &level.moduli[slot],
                bounds,
                level_index,
                slot,
                epsilon,
                reference_log2_dc,
            );
            let packed = serialize_validity_envelope_packed_v1(&envelope);
            diagnostics.push(serialize_validity_diagnostics_packed_v1(&envelope));
            for tier in packed.tiers {
                max_radius = max_radius.max(tier.candidate_radius);
            }
            out.push(packed);
        }
        dir.push(JetLevel {
            offset,
            count: level.blocks.len() as u32,
            skip: level.skip as u32,
            max_r3_log2: max_radius,
        });
    }
    debug_assert_eq!(out.len(), diagnostics.len());
    (out, diagnostics, dir)
}

/// Optional-header wire version. Headers are transported independently from
/// block radii/envelopes; bump this whenever their vec4 layout changes.
pub const UNIFIED_OPTIONAL_HEADER_VERSION: u32 = 1;

/// Independent per-component validity domains for the optional unified
/// shortcuts. A dead component carries `-inf`; exceeding one ceiling disables
/// only that shortcut and never the block table.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct UnifiedOptionalHeaderDomains {
    pub sa_log2_dc: f64,
    pub periodic_log2_dc: f64,
    pub gate_log2_dc: f64,
}

/// Serialize only the block-indexed legacy sidecar (tagged radius + tag +
/// f32-safe) and its level directory. `log2_band` is the working band the tags
/// are chosen at — the caller derives it from the replay-observed |dz|
/// distribution (census note 5), NOT from a fixed c_max multiple.
///
/// The result contains exactly one record per emitted block. Optional SA,
/// periodic and gate data is serialized separately by
/// `unified_serialize_optional_headers`, so refreshing it cannot invalidate or
/// rebuild the dynamic coefficient/envelope table.
pub fn unified_serialize_block_radii(
    levels: &[UnifiedLevel],
    radii: &UnifiedRadii,
    log2_band: f64,
    log2_band_spread: f64,
) -> (Vec<UnifiedRadius>, Vec<JetLevel>) {
    let mut out = Vec::new();
    let mut dir = Vec::new();
    for (li, lvl) in levels.iter().enumerate() {
        if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
            continue;
        }
        let offset = out.len() as u32;
        let mut max_r = f32::NEG_INFINITY;
        for (s, md) in lvl.moduli.iter().enumerate() {
            let tiers = &radii.tiers[li][s];
            let is_safe = unified_f32_safe(md, &lvl.blocks[s].m);
            let entry =
                match unified_portfolio_tags_with(tiers, log2_band, log2_band_spread, is_safe) {
                    None => UnifiedRadius {
                        r_log2: f32::NEG_INFINITY,
                        tag: 0.0,
                        f32_safe: 0.0,
                        pad: f32::NEG_INFINITY,
                    },
                    Some((tag, tag2, r2)) => {
                        let safe = if is_safe { 1.0f32 } else { 0.0 };
                        UnifiedRadius {
                            r_log2: tiers[tag] as f32,
                            tag: tag as f32,
                            f32_safe: safe + 2.0 * tag2 as f32,
                            pad: r2 as f32,
                        }
                    }
                };
            // The level gate must admit the secours band too.
            max_r = max_r.max(entry.r_log2).max(entry.pad);
            out.push(entry);
        }
        dir.push(JetLevel {
            offset,
            count: lvl.blocks.len() as u32,
            skip: lvl.skip as u32,
            max_r3_log2: max_r,
        });
    }
    (out, dir)
}

/// Serialize the independent optional-header payload. The fixed prefix is:
///
/// - `[0..4)` SA coefficients; `h0.w = n0`, `h1.w = SA log2|dc| ceiling`,
///   `h2.w = wire version`, `h3.w = gate log2|dc| ceiling`;
/// - `[4..10)` periodic block; `h8.w = periodic log2|dc| ceiling`;
/// - `[10]` gate directory, followed by the variable gate blob.
///
/// Missing components are encoded with their ordinary dormant discriminator
/// (`n0 == 0`, `p == 0`, or gate count 0) and a dead `-inf` ceiling.
pub fn unified_serialize_optional_headers(
    sa: Option<&SaPrefix>,
    periodic: Option<&PeriodicBlock>,
    gates: &[crate::gates::Gate],
    domains: UnifiedOptionalHeaderDomains,
) -> Vec<UnifiedRadius> {
    let mut out = Vec::new();
    unified_push_header(&mut out, sa, periodic, gates, domains);
    out
}

fn unified_push_header(
    out: &mut Vec<UnifiedRadius>,
    sa: Option<&SaPrefix>,
    periodic: Option<&PeriodicBlock>,
    gates: &[crate::gates::Gate],
    domains: UnifiedOptionalHeaderDomains,
) {
    let zero = CFe::ZERO;
    let sab = sa.map(|s| s.b).unwrap_or([zero; SA_APPLIED]);
    let n0 = sa.map(|s| s.n0).unwrap_or(0);
    let sa_log2_dc = if sa.is_some() {
        domains.sa_log2_dc as f32
    } else {
        f32::NEG_INFINITY
    };
    let gate_log2_dc = if gates.is_empty() {
        f32::NEG_INFINITY
    } else {
        domains.gate_log2_dc as f32
    };
    for (j, b) in sab.iter().enumerate() {
        let c = cfe_to_coeff(b);
        out.push(UnifiedRadius {
            r_log2: c.x,
            tag: c.y,
            f32_safe: c.e as f32,
            pad: match j {
                0 => n0 as f32,
                1 => sa_log2_dc,
                2 => UNIFIED_OPTIONAL_HEADER_VERSION as f32,
                3 => gate_log2_dc,
                _ => 0.0,
            },
        });
    }
    let pm = periodic.map(|p| p.m).unwrap_or(MobiusCPlus {
        a: zero,
        b: zero,
        d: zero,
        ap: zero,
        dp: zero,
        f: zero,
        n2: zero,
        degenerate: true,
    });
    let metas = [
        periodic.map(|p| p.start as f32).unwrap_or(0.0),
        periodic.map(|p| p.p as f32).unwrap_or(0.0),
        periodic
            .map(|p| p.log2_r as f32)
            .unwrap_or(f32::NEG_INFINITY),
        periodic
            .map(|p| p.log2_err_over_r as f32)
            .unwrap_or(f32::NEG_INFINITY),
        if periodic.is_some() {
            domains.periodic_log2_dc as f32
        } else {
            f32::NEG_INFINITY
        },
        periodic
            .map(|p| p.kind.header_code())
            .unwrap_or(PeriodicCertificateKind::MobiusInvariant.header_code()),
    ];
    for (j, coef) in [pm.a, pm.b, pm.d, pm.ap, pm.dp, pm.f].iter().enumerate() {
        let c = cfe_to_coeff(coef);
        out.push(UnifiedRadius {
            r_log2: c.x,
            tag: c.y,
            f32_safe: c.e as f32,
            pad: metas[j],
        });
    }
    // §18 gate blob (entry [10] = directory, count 0 when no gate — the
    // shader reads it unconditionally in unified mode).
    for v in crate::gates::gates_serialize_vec4(gates) {
        out.push(UnifiedRadius {
            r_log2: v[0],
            tag: v[1],
            f32_safe: v[2],
            pad: v[3],
        });
    }
}

/// Legacy combined serializer retained for rollback tests and non-dynamic
/// callers. Production unified transport uses the two split serializers above.
pub fn unified_serialize_radii(
    levels: &[UnifiedLevel],
    radii: &UnifiedRadii,
    log2_band: f64,
    log2_band_spread: f64,
    sa: Option<&SaPrefix>,
    periodic: Option<&PeriodicBlock>,
    gates: &[crate::gates::Gate],
) -> (Vec<UnifiedRadius>, Vec<JetLevel>) {
    let (mut out, dir) = unified_serialize_block_radii(levels, radii, log2_band, log2_band_spread);
    if sa.is_some() || periodic.is_some() || !gates.is_empty() {
        out.extend(unified_serialize_optional_headers(
            sa,
            periodic,
            gates,
            UnifiedOptionalHeaderDomains {
                sa_log2_dc: f64::INFINITY,
                periodic_log2_dc: f64::INFINITY,
                gate_log2_dc: f64::INFINITY,
            },
        ));
    }
    (out, dir)
}

/// Header-ONLY sidecar: the SA/periodic header behind an empty one-level
/// directory — zero block records, so the shader arms the interior verdict
/// (and the deep path its SA seed) without any block acceleration. Built in
/// ~2 ms and posted AHEAD of the full table (whose cold build is seconds at
/// deep budgets on interior references): pure-interior views converge off the
/// header alone while the block build runs.
pub fn unified_serialize_header_only(
    sa: Option<&SaPrefix>,
    periodic: Option<&PeriodicBlock>,
) -> (Vec<UnifiedRadius>, Vec<JetLevel>) {
    unified_serialize_header_only_with_domains(
        sa,
        periodic,
        UnifiedOptionalHeaderDomains {
            sa_log2_dc: f64::INFINITY,
            periodic_log2_dc: f64::INFINITY,
            gate_log2_dc: f64::NEG_INFINITY,
        },
    )
}

pub fn unified_serialize_header_only_with_domains(
    sa: Option<&SaPrefix>,
    periodic: Option<&PeriodicBlock>,
    domains: UnifiedOptionalHeaderDomains,
) -> (Vec<UnifiedRadius>, Vec<JetLevel>) {
    let out = unified_serialize_optional_headers(sa, periodic, &[], domains);
    let dir = vec![JetLevel {
        offset: 0,
        count: 0,
        skip: MOBIUS_MIN_EMIT_SKIP as u32,
        max_r3_log2: f32::NEG_INFINITY,
    }];
    (out, dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::jet::{jet_compose, jet_eval, jet_seed};
    use crate::validity::{
        audit_packed_validity_envelope_v1, audit_serialized_validity_envelope,
        cpu_auto_referee_floatexp, serialize_validity_envelope,
        serialize_validity_envelope_packed_v1, CpuValidityLevel, FloatExpComplex32,
        RationalPoleEnvelope, SerializedValidityEnvelope, ShallowComplex32, ValidityEnvelope,
        ValidityTier, DEAD_LOG2,
    };

    #[test]
    fn optional_headers_are_versioned_split_and_independently_bounded() {
        let sa = SaPrefix {
            n0: 17,
            b: [CFe::ZERO; SA_APPLIED],
        };
        let headers = unified_serialize_optional_headers(
            Some(&sa),
            None,
            &[],
            UnifiedOptionalHeaderDomains {
                sa_log2_dc: -41.25,
                periodic_log2_dc: -37.0,
                gate_log2_dc: -33.0,
            },
        );
        assert_eq!(headers.len(), 11, "fixed header includes gate directory");
        assert_eq!(headers[0].pad, 17.0);
        assert_eq!(headers[1].pad, -41.25);
        assert_eq!(headers[2].pad, UNIFIED_OPTIONAL_HEADER_VERSION as f32);
        assert_eq!(headers[3].pad, f32::NEG_INFINITY, "dead gate stayed armed");
        assert_eq!(headers[5].pad, 0.0, "dead periodic block has nonzero p");
        assert_eq!(
            headers[8].pad,
            f32::NEG_INFINITY,
            "dead periodic block retained its requested ceiling"
        );
        assert_eq!(headers[10].r_log2, 0.0, "gate directory count");
    }

    fn ref_orbit_f64(cx: f64, cy: f64, max_iter: usize) -> Vec<(f64, f64)> {
        let mut v = Vec::with_capacity(max_iter + 1);
        let (mut zx, mut zy) = (0.0_f64, 0.0_f64);
        v.push((zx, zy));
        for _ in 0..max_iter {
            let nx = zx * zx - zy * zy + cx;
            let ny = 2.0 * zx * zy + cy;
            zx = nx;
            zy = ny;
            v.push((zx, zy));
            if zx * zx + zy * zy > 1e12 {
                break;
            }
        }
        v
    }

    #[test]
    fn incremental_builder_matches_one_shot_under_random_chunk_partitions() {
        let orbit = ref_orbit_f64(-0.75, 0.0, 2048);
        let max_skip = 256;
        let one_shot = build_unified_levels(&orbit, max_skip);
        let expected_coeffs = unified_serialize_coeffs(&one_shot);

        let mut builder = IncrementalUnifiedBuilder::new(max_skip);
        let mut start = 1usize;
        let mut random = 0x6d2b_79f5u32;
        let mut appended_by_level = vec![0usize; one_shot.len()];
        while start < orbit.len() {
            random = random.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
            let chunk = 1 + (random as usize % 97);
            let end = (start + chunk).min(orbit.len());
            let batch = builder
                .append_orbit_slice(start, &orbit[start..end])
                .expect("contiguous random append");
            assert_eq!(batch.covered_orbit_len, end);
            for range in batch.ranges {
                assert!(range.skip >= MOBIUS_MIN_EMIT_SKIP);
                assert_eq!(range.slot_start, appended_by_level[range.level_index]);
                appended_by_level[range.level_index] += range.slot_count;
            }
            start = end;
        }
        assert_eq!(builder.covered_orbit_len(), orbit.len());
        let incremental = builder.snapshot_levels();
        assert_eq!(incremental.len(), one_shot.len());
        for (level_index, (got, expected)) in incremental.iter().zip(one_shot.iter()).enumerate() {
            assert_eq!(got.skip, expected.skip, "level {level_index} skip");
            assert_eq!(
                got.blocks.len(),
                expected.blocks.len(),
                "level {level_index} geometry"
            );
            assert_eq!(
                appended_by_level[level_index],
                expected.blocks.len(),
                "level {level_index} duplicate/missing append"
            );
        }
        let incremental_coeffs: Vec<[JetCoeffFe; UNIFIED_GPU_COEFFS]> = builder
            .levels()
            .iter()
            .flat_map(|level| level.coeffs.iter().copied())
            .collect();
        assert_eq!(incremental_coeffs, expected_coeffs, "coefficient parity");

        let reference_log2_dc = -24.0;
        let bounds = unified_build_bounds(&one_shot, &orbit, reference_log2_dc);
        let (expected_validity, expected_diagnostics, _) =
            unified_serialize_validity_envelopes(&one_shot, &bounds, 1e-3, reference_log2_dc);
        let validity_ranges = builder
            .compile_available_validity(&bounds, 1e-3, reference_log2_dc)
            .expect("first validity publication");
        assert!(!validity_ranges.is_empty());
        assert!(builder
            .compile_available_validity(&bounds, 1e-3, reference_log2_dc)
            .expect("warm validity publication")
            .is_empty());
        let got_validity: Vec<PackedValidityEnvelopeV1> = builder
            .levels()
            .iter()
            .flat_map(|level| level.validity.iter().copied())
            .collect();
        let got_diagnostics: Vec<PackedValidityDiagnosticsV1> = builder
            .levels()
            .iter()
            .flat_map(|level| level.validity_diagnostics.iter().copied())
            .collect();
        assert_eq!(got_validity, expected_validity, "packed envelope parity");
        assert_eq!(got_diagnostics, expected_diagnostics);
        assert_eq!(builder.cumulative_coefficients(), expected_coeffs.len());
        assert_eq!(builder.cumulative_envelopes(), expected_validity.len());

        // The production worker uses the bounded tranche compiler rather than
        // `compile_available_validity`; it must produce the same conservative
        // records regardless of quota boundaries.
        let mut progressive = IncrementalUnifiedBuilder::new(max_skip);
        progressive
            .append_orbit_slice(1, &orbit[1..])
            .expect("progressive full orbit append");
        while progressive.has_pending_validity() {
            let ranges = progressive
                .compile_pending_validity(&orbit, 1e-3, reference_log2_dc, 37)
                .expect("bounded progressive validity publication");
            assert!(!ranges.is_empty(), "pending validity made no progress");
        }
        for level in progressive.levels() {
            for slot in 0..level.validity.len() {
                let packed = level.validity[slot];
                let sidecar = unified_dynamic_block_sidecar(
                    &level.blocks[slot],
                    &level.moduli[slot],
                    &packed,
                    reference_log2_dc,
                );
                let (summary_intercept, slope_index) = if sidecar.r_log2.is_finite() {
                    let bits = sidecar.r_log2.to_bits();
                    (f32::from_bits(bits & !7), ((bits & 7) >> 1) as usize)
                } else {
                    (sidecar.r_log2, 0usize)
                };
                assert!(slope_index < SERIALIZED_VALIDITY_LINE_COUNT);
                for &log2_dc in &[
                    f32::NEG_INFINITY,
                    reference_log2_dc as f32,
                    reference_log2_dc as f32 - 4.0,
                    reference_log2_dc as f32 - 16.0,
                    reference_log2_dc as f32 - 64.0,
                ] {
                    let exact_upper = packed
                        .tiers
                        .iter()
                        .map(|tier| tier.radius_log2(log2_dc))
                        .fold(f32::NEG_INFINITY, f32::max);
                    if exact_upper == f32::NEG_INFINITY {
                        continue;
                    }
                    assert!(log2_dc <= sidecar.tag);
                    let affine_radius = packed.tiers[0].radius_log2(log2_dc);
                    assert!(
                        sidecar.f32_safe <= affine_radius,
                        "affine floor loosened at skip {}, slot {}, dc {}: {} > {}",
                        level.skip,
                        slot,
                        log2_dc,
                        sidecar.f32_safe,
                        affine_radius
                    );
                    let line_upper = if log2_dc == f32::NEG_INFINITY {
                        if SERIALIZED_VALIDITY_SLOPES[slope_index] == 0.0 {
                            summary_intercept
                        } else {
                            f32::INFINITY
                        }
                    } else {
                        summary_intercept + SERIALIZED_VALIDITY_SLOPES[slope_index] * log2_dc
                    };
                    let summary_upper = line_upper.min(sidecar.pad);
                    assert!(
                        summary_upper >= exact_upper,
                        "summary rejected a live tier at skip {}, slot {}, dc {}: {} < {}",
                        level.skip,
                        slot,
                        log2_dc,
                        summary_upper,
                        exact_upper
                    );
                }
            }
        }
        let progressive_validity: Vec<PackedValidityEnvelopeV1> = progressive
            .levels()
            .iter()
            .flat_map(|level| level.validity.iter().copied())
            .collect();
        let progressive_diagnostics: Vec<PackedValidityDiagnosticsV1> = progressive
            .levels()
            .iter()
            .flat_map(|level| level.validity_diagnostics.iter().copied())
            .collect();
        assert_eq!(progressive_validity.len(), expected_validity.len());
        for (index, (got, expected)) in progressive_validity
            .iter()
            .zip(expected_validity.iter())
            .enumerate()
        {
            for tier in 0..4 {
                for line in 0..4 {
                    assert!(
                        got.tiers[tier].line_intercepts[line]
                            <= expected.tiers[tier].line_intercepts[line],
                        "progressive line loosened at block {}, tier {}, line {}",
                        index,
                        tier,
                        line
                    );
                }
                assert!(
                    got.tiers[tier].max_log2_dc <= expected.tiers[tier].max_log2_dc,
                    "progressive domain loosened at block {}, tier {}",
                    index,
                    tier
                );
            }
        }
        assert_eq!(progressive_diagnostics.len(), expected_diagnostics.len());
    }

    #[test]
    fn incremental_validity_accessor_reads_only_the_new_block_span() {
        let orbit = ref_orbit_f64(-0.75, 0.0, 4096);
        let mut builder = IncrementalUnifiedBuilder::new(1 << 12);
        builder.reserve_for_orbit_len(orbit.len());
        let reserved_capacities: Vec<(usize, usize, usize)> = builder
            .levels()
            .iter()
            .map(|level| {
                (
                    level.blocks.capacity(),
                    level.moduli.capacity(),
                    level.coeffs.capacity(),
                )
            })
            .collect();
        builder
            .append_orbit_iter(1, orbit[1..].iter().copied())
            .expect("full iterator append");
        let appended_capacities: Vec<(usize, usize, usize)> = builder
            .levels()
            .iter()
            .map(|level| {
                (
                    level.blocks.capacity(),
                    level.moduli.capacity(),
                    level.coeffs.capacity(),
                )
            })
            .collect();
        assert_eq!(appended_capacities, reserved_capacities);

        let mut reads = Vec::new();
        let ranges = builder
            .compile_pending_validity_with(
                orbit.len(),
                |index| {
                    reads.push(index);
                    orbit[index]
                },
                1e-3,
                -24.0,
                1,
            )
            .expect("single-block validity unit");

        assert_eq!(ranges.len(), 1);
        assert_eq!(ranges[0].skip, MOBIUS_MIN_EMIT_SKIP);
        assert_eq!(ranges[0].slot_start, 0);
        assert_eq!(ranges[0].slot_count, 1);
        assert_eq!(reads, (1..=MOBIUS_MIN_EMIT_SKIP).collect::<Vec<_>>());
        assert!(
            reads.len() < orbit.len() / 100,
            "cooperative validity unit rescanned the orbit prefix"
        );
    }

    #[test]
    #[ignore]
    fn incremental_unified_build_benchmark() {
        use std::time::Instant;

        let orbit = ref_orbit_f64(-0.75, 0.0, 8192);
        let max_skip = 1 << 12;
        let one_t0 = Instant::now();
        let one_shot = build_unified_levels(&orbit, max_skip);
        let one_coeffs = unified_serialize_coeffs(&one_shot);
        let one_coefficient_ms = one_t0.elapsed().as_secs_f64() * 1000.0;
        let bounds = unified_build_bounds(&one_shot, &orbit, -24.0);
        let one_envelope_t0 = Instant::now();
        let (one_validity, one_diagnostics, _) =
            unified_serialize_validity_envelopes(&one_shot, &bounds, 1e-3, -24.0);
        let one_envelope_ms = one_envelope_t0.elapsed().as_secs_f64() * 1000.0;

        let mut builder = IncrementalUnifiedBuilder::new(max_skip);
        let inc_t0 = Instant::now();
        let mut start = 1usize;
        while start < orbit.len() {
            let end = (start + 1000).min(orbit.len());
            builder
                .append_orbit_slice(start, &orbit[start..end])
                .expect("benchmark append");
            start = end;
        }
        let coefficient_ms = inc_t0.elapsed().as_secs_f64() * 1000.0;
        let envelope_t0 = Instant::now();
        builder
            .compile_available_validity(&bounds, 1e-3, -24.0)
            .expect("benchmark envelopes");
        let envelope_ms = envelope_t0.elapsed().as_secs_f64() * 1000.0;
        let one_retained = one_shot.iter().fold(0usize, |sum, level| {
            sum + level.blocks.len() * core::mem::size_of::<UnifiedBlock>()
                + level.moduli.len() * core::mem::size_of::<UnifiedModuli>()
        }) + one_coeffs.len()
            * core::mem::size_of::<[JetCoeffFe; UNIFIED_GPU_COEFFS]>()
            + one_validity.len() * core::mem::size_of::<PackedValidityEnvelopeV1>()
            + one_diagnostics.len() * core::mem::size_of::<PackedValidityDiagnosticsV1>();
        println!(
            "incremental unified @{} orbit: merges={} coefficient={:.2}ms envelope={:.2}ms peak={:.2}MiB | one-shot coefficient={:.2}ms envelope={:.2}ms retained={:.2}MiB",
            orbit.len(),
            builder.cumulative_merges(),
            coefficient_ms,
            envelope_ms,
            builder.peak_retained_bytes() as f64 / (1024.0 * 1024.0),
            one_coefficient_ms,
            one_envelope_ms,
            one_retained as f64 / (1024.0 * 1024.0),
        );
        assert_eq!(builder.cumulative_coefficients(), one_coeffs.len());
    }

    fn fixture_fe(magnitude: f64) -> FloatExpComplex32 {
        if magnitude == 0.0 {
            return FloatExpComplex32 {
                x: 0.0,
                y: 0.0,
                exponent: 0,
            };
        }
        let exponent = magnitude.abs().log2().floor() as i32;
        FloatExpComplex32 {
            x: (magnitude * 2.0_f64.powi(-exponent)) as f32,
            y: 0.0,
            exponent,
        }
    }

    #[test]
    fn shared_rust_gpu_parity_fixtures_cover_dynamic_validity_edges() {
        let fixtures = include_str!("../../tests/fixtures/dynamic-validity-parity.csv");
        let mut covered = std::collections::BTreeSet::new();
        for row in fixtures
            .lines()
            .skip(1)
            .filter(|row| !row.trim().is_empty())
        {
            let columns: Vec<_> = row.split(',').collect();
            assert_eq!(columns.len(), 6, "bad fixture row: {}", row);
            let name = columns[0];
            let cx: f64 = columns[1].parse().unwrap();
            let cy: f64 = columns[2].parse().unwrap();
            let scale: f64 = columns[3].parse().unwrap();
            let path = columns[4];
            let scenario = columns[5];
            covered.insert(scenario);

            let orbit = ref_orbit_f64(cx, cy, 512);
            assert!(
                orbit.len() > MOBIUS_MIN_EMIT_SKIP,
                "{} orbit too short",
                name
            );
            let levels = build_unified_levels(&orbit, 64);
            let reference_scale = if scenario == "out-of-domain" {
                scale / 64.0
            } else {
                scale
            };
            let reference_log2_dc = reference_scale.log2() + 4.0;
            let bounds = unified_build_bounds(&levels, &orbit, reference_log2_dc);
            let (level_index, level) = levels
                .iter()
                .enumerate()
                .find(|(_, level)| level.skip >= MOBIUS_MIN_EMIT_SKIP && !level.blocks.is_empty())
                .expect("emitted fixture level");
            let envelope = unified_validity_envelope_for_block(
                &level.blocks[0],
                &level.moduli[0],
                &bounds,
                level_index,
                0,
                1e-3,
                reference_log2_dc,
            );
            let packed = serialize_validity_envelope_packed_v1(&envelope);
            let dc_magnitude = scale * 0.75;
            let dc_fe = fixture_fe(dc_magnitude);
            let log2_dc = crate::validity::floatexp_log2_magnitude(dc_fe);
            let mut live_tiers = 0;
            for tier in ValidityTier::ALL {
                let radius = packed.radius_log2(tier, log2_dc);
                if radius == f32::NEG_INFINITY {
                    continue;
                }
                live_tiers += 1;
                let inside = 2.0_f64.powf(radius as f64 - 1.0);
                let outside = 2.0_f64.powf(radius as f64 + 1.0);
                assert_eq!(
                    packed
                        .evaluate_floatexp(tier, dc_fe, fixture_fe(inside))
                        .accepts,
                    true,
                    "{} {:?} deep accept parity",
                    name,
                    tier,
                );
                assert_eq!(
                    packed
                        .evaluate_floatexp(tier, dc_fe, fixture_fe(outside))
                        .accepts,
                    false,
                    "{} {:?} deep reject parity",
                    name,
                    tier,
                );
                if path == "shallow" {
                    assert_eq!(
                        packed
                            .evaluate_shallow(
                                tier,
                                ShallowComplex32 {
                                    x: dc_magnitude as f32,
                                    y: 0.0,
                                },
                                ShallowComplex32 {
                                    x: inside as f32,
                                    y: 0.0,
                                },
                            )
                            .accepts,
                        true,
                        "{} {:?} shallow parity",
                        name,
                        tier,
                    );
                }
            }
            if scenario == "out-of-domain" {
                assert_eq!(live_tiers, 0, "out-of-domain fixture unexpectedly accepted");
            }
        }
        for required in ["fresh", "continuation", "rebase", "out-of-domain"] {
            assert!(covered.contains(required), "missing {} fixture", required);
        }
    }

    fn rel_err(got: CFe, want: CFe) -> f64 {
        let (gx, gy) = got.to_f64();
        let (wx, wy) = want.to_f64();
        let d = ((gx - wx).powi(2) + (gy - wy).powi(2)).sqrt();
        let m = (wx * wx + wy * wy).sqrt();
        if m == 0.0 {
            d
        } else {
            d / m
        }
    }

    #[derive(Clone, Debug, Default)]
    struct DynamicDispatchCensus {
        block_applications: usize,
        exact_steps: usize,
        skipped_iterations: usize,
        tier_accepts: [usize; 4],
        candidate_usage: [usize; MAX_CAUCHY_CANDIDATES],
        /// static-domain, pure-c, pole, Cauchy, value, derivative.
        rejections: [usize; 6],
    }

    impl DynamicDispatchCensus {
        fn merge(&mut self, other: &Self) {
            self.block_applications += other.block_applications;
            self.exact_steps += other.exact_steps;
            self.skipped_iterations += other.skipped_iterations;
            for tier in 0..4 {
                self.tier_accepts[tier] += other.tier_accepts[tier];
            }
            for candidate in 0..MAX_CAUCHY_CANDIDATES {
                self.candidate_usage[candidate] += other.candidate_usage[candidate];
            }
            for reason in 0..self.rejections.len() {
                self.rejections[reason] += other.rejections[reason];
            }
        }

        fn mean_applied_skip(&self) -> f64 {
            if self.block_applications == 0 {
                0.0
            } else {
                self.skipped_iterations as f64 / self.block_applications as f64
            }
        }
    }

    fn nearest_rank(values: &mut [f64], percentile: f64) -> f64 {
        if values.is_empty() {
            return f64::NAN;
        }
        values.sort_by(f64::total_cmp);
        let rank = ((percentile * values.len() as f64).ceil() as usize)
            .saturating_sub(1)
            .min(values.len() - 1);
        values[rank]
    }

    fn exact_delta_trajectory(orbit: &[(f64, f64)], dc: (f64, f64)) -> Vec<(f64, f64)> {
        let mut trajectory = Vec::with_capacity(orbit.len());
        let (mut dx, mut dy) = (0.0_f64, 0.0_f64);
        trajectory.push((dx, dy));
        for &(zx, zy) in orbit.iter().skip(1) {
            let linear = (2.0 * (zx * dx - zy * dy), 2.0 * (zx * dy + zy * dx));
            let square = (dx * dx - dy * dy, 2.0 * dx * dy);
            dx = linear.0 + square.0 + dc.0;
            dy = linear.1 + square.1 + dc.1;
            trajectory.push((dx, dy));
        }
        trajectory
    }

    fn pair_log2_magnitude(value: (f64, f64)) -> f32 {
        let magnitude = (value.0 * value.0 + value.1 * value.1).sqrt();
        if magnitude == 0.0 {
            f32::NEG_INFINITY
        } else {
            magnitude.log2() as f32
        }
    }

    fn dynamic_rejection_reason(
        envelope: &ValidityEnvelope,
        tier: ValidityTier,
        log2_dc: f64,
        log2_dz: f64,
    ) -> Option<usize> {
        let proof = envelope.tier(tier);
        if !envelope.reference_dc.accepts(log2_dc) || !proof.static_dc.accepts(log2_dc) {
            return Some(0);
        }
        if !proof.pure_c.accepts(log2_dc) {
            return Some(1);
        }
        if !proof.pole.dc_threshold.accepts(log2_dc)
            || log2_dz > proof.pole.radius.radius_log2(log2_dc)
        {
            return Some(2);
        }
        let cauchy_radius = proof
            .cauchy
            .iter()
            .map(|candidate| candidate.radius_log2(log2_dc))
            .fold(DEAD_LOG2, f64::max);
        if log2_dz > cauchy_radius {
            return Some(3);
        }
        if log2_dz > proof.remainder.value.radius_log2(log2_dc) {
            return Some(4);
        }
        if log2_dz > proof.remainder.derivative.radius_log2(log2_dc) {
            return Some(5);
        }
        None
    }

    fn dynamic_dispatch_census(
        levels: &[UnifiedLevel],
        trajectory: &[(f64, f64)],
        log2_dc: f32,
        envelopes: &[Vec<ValidityEnvelope>],
        serialized: &[Vec<SerializedValidityEnvelope>],
    ) -> DynamicDispatchCensus {
        let mut census = DynamicDispatchCensus::default();
        let mut iteration = 0usize;
        let max_iterations = trajectory.len().saturating_sub(1);
        while iteration < max_iterations {
            let log2_dz = pair_log2_magnitude(trajectory[iteration]);
            let mut selection = None;
            'levels: for level_index in (0..levels.len()).rev() {
                let level = &levels[level_index];
                if level.skip < MOBIUS_MIN_EMIT_SKIP
                    || iteration % level.skip != 0
                    || iteration + level.skip > max_iterations
                {
                    continue;
                }
                let slot = iteration / level.skip;
                if slot >= level.blocks.len() {
                    continue;
                }
                for tier_index in 0..4 {
                    let tier = ValidityTier::ALL[tier_index];
                    let radius = serialized[level_index][slot].radius_log2(tier, log2_dc);
                    if log2_dz <= radius {
                        census.tier_accepts[tier_index] += 1;
                        let encoded = serialized[level_index][slot].tiers[tier_index];
                        let selected_candidate = (0..MAX_CAUCHY_CANDIDATES)
                            .filter(|&candidate| log2_dc <= encoded.candidate_dc[candidate])
                            .max_by(|&a, &b| {
                                encoded.candidate_radius[a].total_cmp(&encoded.candidate_radius[b])
                            });
                        if let Some(candidate) = selected_candidate {
                            census.candidate_usage[candidate] += 1;
                        }
                        selection = Some(level.skip);
                        break 'levels;
                    }
                    if let Some(reason) = dynamic_rejection_reason(
                        &envelopes[level_index][slot],
                        tier,
                        log2_dc as f64,
                        log2_dz as f64,
                    ) {
                        census.rejections[reason] += 1;
                    }
                }
            }
            if let Some(skip) = selection {
                census.block_applications += 1;
                census.skipped_iterations += skip;
                iteration += skip;
            } else {
                census.exact_steps += 1;
                iteration += 1;
            }
        }
        census
    }

    fn legacy_dispatch_census(
        levels: &[UnifiedLevel],
        trajectory: &[(f64, f64)],
        radii: &UnifiedRadii,
    ) -> DynamicDispatchCensus {
        let mut census = DynamicDispatchCensus::default();
        let mut iteration = 0usize;
        let max_iterations = trajectory.len().saturating_sub(1);
        while iteration < max_iterations {
            let log2_dz = pair_log2_magnitude(trajectory[iteration]) as f64;
            let mut selection = None;
            'levels: for level_index in (0..levels.len()).rev() {
                let level = &levels[level_index];
                if level.skip < MOBIUS_MIN_EMIT_SKIP
                    || iteration % level.skip != 0
                    || iteration + level.skip > max_iterations
                {
                    continue;
                }
                let slot = iteration / level.skip;
                if slot >= level.blocks.len() {
                    continue;
                }
                for tier in 0..4 {
                    if log2_dz <= radii.tiers[level_index][slot][tier] {
                        census.tier_accepts[tier] += 1;
                        selection = Some(level.skip);
                        break 'levels;
                    }
                }
            }
            if let Some(skip) = selection {
                census.block_applications += 1;
                census.skipped_iterations += skip;
                iteration += skip;
            } else {
                census.exact_steps += 1;
                iteration += 1;
            }
        }
        census
    }

    #[derive(Clone, Copy, Debug)]
    struct DynamicCpuRun {
        state: UnifiedCpuState,
        physical_iteration: usize,
        reference_index: usize,
        block_applications: usize,
        exact_steps: usize,
        rebases: usize,
        escaped: bool,
    }

    impl DynamicCpuRun {
        fn new() -> Self {
            Self {
                state: UnifiedCpuState {
                    delta: CFe::ZERO,
                    derivative: CFe::ZERO,
                    second_derivative: CFe::ZERO,
                },
                physical_iteration: 0,
                reference_index: 0,
                block_applications: 0,
                exact_steps: 0,
                rebases: 0,
                escaped: false,
            }
        }
    }

    fn exact_reference_step(
        state: UnifiedCpuState,
        reference: (f64, f64),
        dc: CFe,
    ) -> UnifiedCpuState {
        let reference = CFe::from_c(reference.0, reference.1);
        let full_z = reference.add(state.delta);
        let next_delta = cfe_scale(reference.mul(state.delta), 2.0)
            .add(state.delta.mul(state.delta))
            .add(dc);
        let next_second = cfe_scale(
            state
                .derivative
                .mul(state.derivative)
                .add(full_z.mul(state.second_derivative)),
            2.0,
        );
        let next_derivative = cfe_scale(full_z.mul(state.derivative), 2.0).add(CFe::ONE);
        UnifiedCpuState {
            delta: next_delta,
            derivative: next_derivative,
            second_derivative: next_second,
        }
    }

    fn cfe_floatexp32(value: CFe) -> FloatExpComplex32 {
        FloatExpComplex32 {
            x: value.x as f32,
            y: value.y as f32,
            exponent: value.e.clamp(i32::MIN as i64, i32::MAX as i64) as i32,
        }
    }

    fn cfe_relative_error(got: CFe, expected: CFe) -> f64 {
        let (gx, gy) = got.to_f64();
        let (ex, ey) = expected.to_f64();
        let error = ((gx - ex).powi(2) + (gy - ey).powi(2)).sqrt();
        error / (ex * ex + ey * ey).sqrt().max(1e-300)
    }

    fn run_dynamic_cpu_segment(
        run: &mut DynamicCpuRun,
        levels: &[UnifiedLevel],
        serialized: &[Vec<SerializedValidityEnvelope>],
        orbit: &[(f64, f64)],
        dc: CFe,
        covered_reference_index: usize,
        target_physical_iteration: usize,
        turn_budget: usize,
    ) {
        let empty: &[SerializedValidityEnvelope] = &[];
        let directories: Vec<CpuValidityLevel<'_>> = levels
            .iter()
            .enumerate()
            .map(|(level_index, level)| CpuValidityLevel {
                skip: level.skip,
                blocks: if level.skip >= MOBIUS_MIN_EMIT_SKIP {
                    &serialized[level_index]
                } else {
                    empty
                },
            })
            .collect();
        let max_reference_index = orbit.len().saturating_sub(1);
        let mut turns = 0usize;
        while !run.escaped
            && run.physical_iteration < target_physical_iteration
            && turns < turn_budget
        {
            turns += 1;
            let remaining = target_physical_iteration - run.physical_iteration;
            let mut applied = false;
            if run.reference_index > 0 {
                let completed = run.reference_index - 1;
                let max_completed = completed
                    .saturating_add(remaining)
                    .min(max_reference_index.saturating_sub(1));
                let covered_completed = covered_reference_index
                    .min(max_reference_index)
                    .saturating_sub(1);
                if let Some(decision) = cpu_auto_referee_floatexp(
                    &directories,
                    completed,
                    covered_completed,
                    max_completed,
                    cfe_floatexp32(dc),
                    cfe_floatexp32(run.state.delta),
                ) {
                    let landing_reference = run.reference_index + decision.skip;
                    if landing_reference <= max_reference_index {
                        let candidate = unified_apply_tier_state(
                            &levels[decision.level_index].blocks[decision.slot],
                            decision.tier,
                            run.state,
                            dc,
                        );
                        let landing =
                            CFe::from_c(orbit[landing_reference].0, orbit[landing_reference].1)
                                .add(candidate.delta);
                        let landing_mag2 = {
                            let (x, y) = landing.to_f64();
                            x * x + y * y
                        };
                        // Same no-jump-over-first-escape guard as WGSL.
                        if decision.skip == 1 || landing_mag2 <= 4.0 {
                            run.state = candidate;
                            run.reference_index = landing_reference;
                            run.physical_iteration += decision.skip;
                            run.block_applications += 1;
                            applied = true;
                        }
                    }
                }
            }
            if !applied {
                run.state = exact_reference_step(run.state, orbit[run.reference_index], dc);
                run.reference_index += 1;
                run.physical_iteration += 1;
                run.exact_steps += 1;
            }

            let full_z = CFe::from_c(orbit[run.reference_index].0, orbit[run.reference_index].1)
                .add(run.state.delta);
            let (zx, zy) = full_z.to_f64();
            if zx * zx + zy * zy > 4.0 {
                run.escaped = true;
                continue;
            }
            let (dx, dy) = run.state.delta.to_f64();
            if zx * zx + zy * zy < dx * dx + dy * dy || run.reference_index == max_reference_index {
                run.state.delta = full_z;
                run.reference_index = 0;
                run.rebases += 1;
            }
        }
    }

    #[test]
    fn unified_value_lines_use_each_tiers_actual_remainder() {
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 64);
        let levels = build_unified_levels(&orbit, 8);
        let emitted = levels.iter().find(|level| level.skip == 4).unwrap();
        let derived = unified_value_line_derivations(&emitted.blocks[0], &emitted.moduli[0], 1e-3);

        // Affine drops only A/B; Jet drops its reconstructed degree-3 prefix,
        // so the actual stored remainders must lead to different allocations.
        assert!(derived[TIER_AFFINE].allocations.len() > derived[TIER_JET].allocations.len());
        for tier in ValidityTier::ALL {
            let proof = &derived[tier.index()];
            assert!(proof
                .allocations
                .iter()
                .all(|term| term.log2_relative_budget.is_finite()));
        }
        // Rational value errors include the certified 4/3 denominator factor.
        assert!(derived[TIER_PADE]
            .allocations
            .iter()
            .all(|term| term.effective_log2_modulus >= term.log2_modulus));

        let combined =
            unified_low_degree_line_derivations(&emitted.blocks[0], &emitted.moduli[0], 1e-3);
        for tier in ValidityTier::ALL {
            let proof = &combined[tier.index()];
            for log2_dc in [-80.0, -40.0, -20.0] {
                let effective = proof.radius.radius_log2(log2_dc);
                assert!(effective <= proof.value.radius.radius_log2(log2_dc));
                assert!(effective <= proof.derivative.radius.radius_log2(log2_dc));
            }
        }

        let pure_c = unified_pure_c_derivations(&emitted.blocks[0], &emitted.moduli[0], 1e-3);
        assert!(pure_c.iter().all(|proof| {
            proof.threshold.max_log2_dc.is_dead() || !proof.threshold.max_log2_dc.0.is_nan()
        }));
        let poles = unified_pole_line_derivations(&emitted.blocks[0]);
        assert_eq!(
            poles[TIER_AFFINE].descriptor,
            RationalPoleEnvelope::NotApplicable
        );
        assert_eq!(
            poles[TIER_JET].descriptor,
            RationalPoleEnvelope::NotApplicable
        );
        assert!(matches!(
            poles[TIER_PADE].descriptor,
            RationalPoleEnvelope::Constraint { .. }
        ));
        assert!(matches!(
            poles[TIER_CPLUS].descriptor,
            RationalPoleEnvelope::Constraint { .. }
        ));

        let level_index = levels.iter().position(|level| level.skip == 4).unwrap();
        let bounds = unified_build_bounds(&levels, &orbit, -20.0);
        let candidates = unified_cauchy_candidate_derivations(
            &levels[level_index].blocks[0],
            &bounds,
            level_index,
            0,
            1e-3,
        );
        for tier_candidates in candidates {
            let live: Vec<_> = tier_candidates
                .iter()
                .filter(|candidate| !candidate.is_dead())
                .collect();
            assert!(live.len() <= MAX_CAUCHY_CANDIDATES);
            if live.len() == 2 {
                assert_ne!(live[0].source_index, live[1].source_index);
            }
        }
    }

    #[test]
    fn unified_serialized_validity_is_conservative_for_benchmark_orbits() {
        let samples: Vec<f32> = (0..=400).map(|step| -20.0 - step as f32 * 0.5).collect();
        let mut comparisons = 0usize;
        let mut live_tiers = 0usize;
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151, 0.131825904205330),
            ("feigenbaum", -1.401155, 0.0),
            ("near-parab", -0.7499, 0.0001),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 256);
            assert!(orbit.len() > 256, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 16);
            let bounds = unified_build_bounds(&levels, &orbit, -20.0);
            for (level_index, level) in levels.iter().enumerate() {
                if level.skip < MOBIUS_MIN_EMIT_SKIP {
                    continue;
                }
                for slot in 0..level.blocks.len() {
                    let source = unified_validity_envelope_for_block(
                        &level.blocks[slot],
                        &level.moduli[slot],
                        &bounds,
                        level_index,
                        slot,
                        1e-6,
                        -20.0,
                    );
                    live_tiers += source.tiers.iter().filter(|tier| !tier.is_dead()).count();
                    let serialized = serialize_validity_envelope(&source);
                    let audit = audit_serialized_validity_envelope(&source, serialized, &samples);
                    comparisons += audit.comparisons;
                    assert_eq!(
                        audit.violations, 0,
                        "[{}] level {} slot {} serialization relaxed a constraint: {:?}",
                        name, level_index, slot, audit
                    );

                    let packed = serialize_validity_envelope_packed_v1(&source);
                    let packed_audit = audit_packed_validity_envelope_v1(&source, packed, &samples);
                    comparisons += packed_audit.comparisons;
                    assert_eq!(
                        packed_audit.violations, 0,
                        "[{}] level {} slot {} packed-v1 relaxed a constraint: {:?}",
                        name, level_index, slot, packed_audit
                    );
                    let mut one_rung_source = source.clone();
                    for tier in &mut one_rung_source.tiers {
                        tier.cauchy[1] = crate::validity::CauchyCandidateEnvelope::dead();
                    }
                    let one_rung = serialize_validity_envelope(&one_rung_source);
                    for tier in ValidityTier::ALL {
                        for &log2_dc in &samples {
                            assert_eq!(
                                packed.radius_log2(tier, log2_dc),
                                one_rung.radius_log2(tier, log2_dc),
                                "[{}] level {} slot {} tier {:?} dc {} packed/natural mismatch",
                                name,
                                level_index,
                                slot,
                                tier,
                                log2_dc
                            );
                        }
                    }
                }
            }
        }
        assert!(
            live_tiers > 0,
            "benchmark set produced no live tier envelope"
        );
        assert!(comparisons > 10_000, "serialization audit was too shallow");
    }

    #[test]
    fn dynamic_validity_boundary_sweep_is_value_and_derivative_sound() {
        use crate::mobius::mobius_apply;

        let epsilon = 1e-6_f64;
        let reference_log2_dc = -20.0_f64;
        let log2_dc_grid = [-20.25_f32, -24.0, -32.0, -48.0, -72.0, -104.0, -152.0];
        let mut checked_by_tier = [0usize; 4];
        let mut checked_by_orbit = [0usize; 3];
        for (orbit_index, (name, cx, cy)) in [
            ("seahorse", -0.743643887037151, 0.131825904205330),
            ("feigenbaum", -1.401155, 0.0),
            ("near-parab", -0.7499, 0.0001),
        ]
        .iter()
        .copied()
        .enumerate()
        {
            let orbit = ref_orbit_f64(cx, cy, 512);
            assert!(orbit.len() > 512, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 32);
            let bounds = unified_build_bounds(&levels, &orbit, reference_log2_dc);
            for (level_index, level) in levels.iter().enumerate() {
                if level.skip < MOBIUS_MIN_EMIT_SKIP {
                    continue;
                }
                for slot in (0..level.blocks.len()).step_by(5) {
                    let block = &level.blocks[slot];
                    let envelope = unified_validity_envelope_for_block(
                        block,
                        &level.moduli[slot],
                        &bounds,
                        level_index,
                        slot,
                        epsilon,
                        reference_log2_dc,
                    );
                    let decoded = serialize_validity_envelope(&envelope);
                    let first = 1 + slot * level.skip;
                    let magnitude = |value: CFe| {
                        let (x, y) = value.to_f64();
                        (x * x + y * y).sqrt()
                    };
                    for tier in 0..4usize {
                        for (sample_index, &log2_dc) in log2_dc_grid.iter().enumerate() {
                            let radius = decoded.tiers[tier].radius_log2(log2_dc);
                            if !radius.is_finite() {
                                continue;
                            }
                            let log2_dz = radius as f64 - 0.25;
                            let dz_magnitude = log2_dz.exp2();
                            let dc_magnitude = (log2_dc as f64).exp2();
                            if !(dz_magnitude.is_finite() && dz_magnitude > 0.0) {
                                continue;
                            }
                            let z_phase = if sample_index % 2 == 0 { 0.7_f64 } else { 2.4 };
                            let c_phase = if sample_index % 2 == 0 { 1.9_f64 } else { 0.2 };
                            let z = (dz_magnitude * z_phase.cos(), dz_magnitude * z_phase.sin());
                            let c = (dc_magnitude * c_phase.cos(), dc_magnitude * c_phase.sin());

                            let (mut exact_x, mut exact_y) = z;
                            let (mut exact_dx, mut exact_dy) = (1.0_f64, 0.0_f64);
                            for iteration in first..first + level.skip {
                                let (ref_x, ref_y) = orbit[iteration];
                                let multiplier = (ref_x + exact_x, ref_y + exact_y);
                                let next_derivative = (
                                    2.0 * (multiplier.0 * exact_dx - multiplier.1 * exact_dy),
                                    2.0 * (multiplier.0 * exact_dy + multiplier.1 * exact_dx),
                                );
                                let linear = (
                                    2.0 * (ref_x * exact_x - ref_y * exact_y),
                                    2.0 * (ref_x * exact_y + ref_y * exact_x),
                                );
                                let square = (
                                    exact_x * exact_x - exact_y * exact_y,
                                    2.0 * exact_x * exact_y,
                                );
                                exact_x = linear.0 + square.0 + c.0;
                                exact_y = linear.1 + square.1 + c.1;
                                exact_dx = next_derivative.0;
                                exact_dy = next_derivative.1;
                            }

                            let zfe = CFe::from_c(z.0, z.1);
                            let cfe = CFe::from_c(c.0, c.1);
                            let (value, derivative) = match tier {
                                TIER_AFFINE => {
                                    (block.m.a.mul(zfe).add(block.m.b.mul(cfe)), block.m.a)
                                }
                                TIER_PADE => {
                                    let mut plain = block.m;
                                    plain.ap = CFe::ZERO;
                                    plain.dp = CFe::ZERO;
                                    plain.f = CFe::ZERO;
                                    let applied = mobius_apply(&plain, zfe, cfe);
                                    (applied.0, applied.1)
                                }
                                TIER_CPLUS => {
                                    let applied = mobius_apply(&block.m, zfe, cfe);
                                    (applied.0, applied.1)
                                }
                                _ => (
                                    unified_eval_jet3(block, zfe, cfe),
                                    unified_eval_jet3_dz(block, zfe, cfe),
                                ),
                            };
                            let (value_x, value_y) = value.to_f64();
                            let (derivative_x, derivative_y) = derivative.to_f64();
                            let value_error =
                                ((value_x - exact_x).powi(2) + (value_y - exact_y).powi(2)).sqrt();
                            let derivative_error = ((derivative_x - exact_dx).powi(2)
                                + (derivative_y - exact_dy).powi(2))
                            .sqrt();
                            let value_scale = magnitude(block.m.a) * dz_magnitude
                                + magnitude(block.m.b) * dc_magnitude;
                            let derivative_scale = magnitude(block.m.a);
                            let exact_value_magnitude =
                                (exact_x * exact_x + exact_y * exact_y).sqrt();
                            let exact_derivative_magnitude =
                                (exact_dx * exact_dx + exact_dy * exact_dy).sqrt();
                            let value_tolerance = 5.0 * epsilon * value_scale
                                + 128.0 * f64::EPSILON * exact_value_magnitude.max(1e-300);
                            let derivative_tolerance = 5.0 * epsilon * derivative_scale
                                + 128.0 * f64::EPSILON * exact_derivative_magnitude.max(1e-300);
                            assert!(
                                value_error <= value_tolerance,
                                "[{}] level {} slot {} tier {} dc {}: value error {:e} > {:e}",
                                name,
                                level_index,
                                slot,
                                tier,
                                log2_dc,
                                value_error,
                                value_tolerance
                            );
                            assert!(
                                derivative_error <= derivative_tolerance,
                                "[{}] level {} slot {} tier {} dc {}: derivative error {:e} > {:e}",
                                name,
                                level_index,
                                slot,
                                tier,
                                log2_dc,
                                derivative_error,
                                derivative_tolerance
                            );
                            checked_by_tier[tier] += 1;
                            checked_by_orbit[orbit_index] += 1;
                        }
                    }
                }
            }
        }
        assert!(
            checked_by_tier.iter().all(|count| *count > 100),
            "insufficient tier coverage: {:?}",
            checked_by_tier
        );
        assert!(
            checked_by_orbit.iter().all(|count| *count > 100),
            "insufficient orbit coverage: {:?}",
            checked_by_orbit
        );
    }

    #[test]
    #[ignore = "census benchmark: cargo test --release dynamic_validity_census -- --ignored --nocapture"]
    fn dynamic_validity_census() {
        use std::fmt::Write as _;
        use std::path::PathBuf;

        let epsilon = 1e-6_f64;
        let reference_log2_dc = -20.0_f64;
        let log2_dc_grid = [-20.25_f32, -24.0, -32.0, -48.0, -72.0, -104.0];
        let mut views = Vec::new();
        let mut global_legacy = DynamicDispatchCensus::default();
        let mut global_one = DynamicDispatchCensus::default();
        let mut global_two = DynamicDispatchCensus::default();

        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151, 0.131825904205330),
            ("feigenbaum", -1.401155, 0.0),
            ("near-parab", -0.7499, 0.0001),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 1024);
            assert!(orbit.len() > 1024, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 64);
            let static_bounds = unified_build_bounds(&levels, &orbit, reference_log2_dc);
            let two_sources: Vec<Vec<ValidityEnvelope>> = levels
                .iter()
                .enumerate()
                .map(|(level_index, level)| {
                    (0..level.blocks.len())
                        .map(|slot| {
                            unified_validity_envelope_for_block(
                                &level.blocks[slot],
                                &level.moduli[slot],
                                &static_bounds,
                                level_index,
                                slot,
                                epsilon,
                                reference_log2_dc,
                            )
                        })
                        .collect()
                })
                .collect();
            let one_sources: Vec<Vec<ValidityEnvelope>> = two_sources
                .iter()
                .map(|level| {
                    level
                        .iter()
                        .cloned()
                        .map(|mut envelope| {
                            for tier in &mut envelope.tiers {
                                tier.cauchy[1] = crate::validity::CauchyCandidateEnvelope::dead();
                            }
                            envelope
                        })
                        .collect()
                })
                .collect();
            let two_serialized: Vec<Vec<SerializedValidityEnvelope>> = two_sources
                .iter()
                .map(|level| level.iter().map(serialize_validity_envelope).collect())
                .collect();
            let one_serialized: Vec<Vec<SerializedValidityEnvelope>> = one_sources
                .iter()
                .map(|level| level.iter().map(serialize_validity_envelope).collect())
                .collect();

            let mut legacy_census = DynamicDispatchCensus::default();
            let mut one_census = DynamicDispatchCensus::default();
            let mut two_census = DynamicDispatchCensus::default();
            let mut one_radius_delta = Vec::new();
            let mut two_radius_delta = Vec::new();
            let (mut one_lost, mut one_unlocked) = (0usize, 0usize);
            let (mut two_lost, mut two_unlocked) = (0usize, 0usize);

            for (dc_index, &log2_dc) in log2_dc_grid.iter().enumerate() {
                // This is deliberately the legacy cmax-keyed path: bounds and
                // radii are rebuilt for every grid entry to quantify exactly
                // the work/coverage the static dynamic envelope replaces.
                let legacy_bounds = unified_build_bounds(&levels, &orbit, log2_dc as f64);
                let legacy_radii =
                    unified_solve_radii(&levels, &legacy_bounds, epsilon, log2_dc as f64);
                let dc_magnitude = (log2_dc as f64).exp2();
                let phase = 0.35 + dc_index as f64 * 0.71;
                let trajectory = exact_delta_trajectory(
                    &orbit,
                    (dc_magnitude * phase.cos(), dc_magnitude * phase.sin()),
                );
                legacy_census.merge(&legacy_dispatch_census(&levels, &trajectory, &legacy_radii));
                one_census.merge(&dynamic_dispatch_census(
                    &levels,
                    &trajectory,
                    log2_dc,
                    &one_sources,
                    &one_serialized,
                ));
                two_census.merge(&dynamic_dispatch_census(
                    &levels,
                    &trajectory,
                    log2_dc,
                    &two_sources,
                    &two_serialized,
                ));

                for (level_index, level) in levels.iter().enumerate() {
                    if level.skip < MOBIUS_MIN_EMIT_SKIP {
                        continue;
                    }
                    for slot in 0..level.blocks.len() {
                        for tier in ValidityTier::ALL {
                            let legacy = legacy_radii.tiers[level_index][slot][tier.index()];
                            let one =
                                one_serialized[level_index][slot].radius_log2(tier, log2_dc) as f64;
                            let two =
                                two_serialized[level_index][slot].radius_log2(tier, log2_dc) as f64;
                            match (legacy.is_finite(), one.is_finite()) {
                                (true, true) => one_radius_delta.push(one - legacy),
                                (true, false) => one_lost += 1,
                                (false, true) => one_unlocked += 1,
                                _ => {}
                            }
                            match (legacy.is_finite(), two.is_finite()) {
                                (true, true) => two_radius_delta.push(two - legacy),
                                (true, false) => two_lost += 1,
                                (false, true) => two_unlocked += 1,
                                _ => {}
                            }
                        }
                    }
                }
            }

            let one_pairs = one_radius_delta.len();
            let two_pairs = two_radius_delta.len();
            let one_p05 = nearest_rank(&mut one_radius_delta.clone(), 0.05);
            let one_p50 = nearest_rank(&mut one_radius_delta.clone(), 0.50);
            let one_p95 = nearest_rank(&mut one_radius_delta, 0.95);
            let two_p05 = nearest_rank(&mut two_radius_delta.clone(), 0.05);
            let two_p50 = nearest_rank(&mut two_radius_delta.clone(), 0.50);
            let two_p95 = nearest_rank(&mut two_radius_delta, 0.95);
            views.push(format!(
                "    {{\n      \"name\": \"{}\",\n      \"radiusLog2DeltaVsLegacy\": {{\n        \"oneRung\": {{ \"pairs\": {}, \"p05\": {:.6}, \"p50\": {:.6}, \"p95\": {:.6}, \"lost\": {}, \"unlocked\": {} }},\n        \"twoRungs\": {{ \"pairs\": {}, \"p05\": {:.6}, \"p50\": {:.6}, \"p95\": {:.6}, \"lost\": {}, \"unlocked\": {} }}\n      }},\n      \"dispatch\": {{\n        \"legacy\": {{ \"blockApplications\": {}, \"exactSteps\": {}, \"skippedIterations\": {}, \"meanAppliedSkip\": {:.6}, \"tierAccepts\": {:?} }},\n        \"oneRung\": {{ \"blockApplications\": {}, \"exactSteps\": {}, \"skippedIterations\": {}, \"meanAppliedSkip\": {:.6}, \"tierAccepts\": {:?}, \"candidateUsage\": {:?}, \"rejections\": {:?} }},\n        \"twoRungs\": {{ \"blockApplications\": {}, \"exactSteps\": {}, \"skippedIterations\": {}, \"meanAppliedSkip\": {:.6}, \"tierAccepts\": {:?}, \"candidateUsage\": {:?}, \"rejections\": {:?} }}\n      }}\n    }}",
                name,
                one_pairs,
                one_p05,
                one_p50,
                one_p95,
                one_lost,
                one_unlocked,
                two_pairs,
                two_p05,
                two_p50,
                two_p95,
                two_lost,
                two_unlocked,
                legacy_census.block_applications,
                legacy_census.exact_steps,
                legacy_census.skipped_iterations,
                legacy_census.mean_applied_skip(),
                legacy_census.tier_accepts,
                one_census.block_applications,
                one_census.exact_steps,
                one_census.skipped_iterations,
                one_census.mean_applied_skip(),
                one_census.tier_accepts,
                one_census.candidate_usage,
                one_census.rejections,
                two_census.block_applications,
                two_census.exact_steps,
                two_census.skipped_iterations,
                two_census.mean_applied_skip(),
                two_census.tier_accepts,
                two_census.candidate_usage,
                two_census.rejections,
            ));
            global_legacy.merge(&legacy_census);
            global_one.merge(&one_census);
            global_two.merge(&two_census);
        }

        let selected = if global_two.skipped_iterations
            >= (global_one.skipped_iterations as f64 * 1.01).ceil() as usize
        {
            "two-rungs"
        } else {
            "one-rung"
        };
        let mut json = String::new();
        writeln!(
            json,
            "{{\n  \"schemaVersion\": 1,\n  \"benchmark\": \"dynamic-validity-census\",\n  \"epsilon\": {},\n  \"referenceLog2Dc\": {},\n  \"log2DcGrid\": {:?},\n  \"rejectionOrder\": [\"static-domain\", \"pure-c\", \"pole\", \"cauchy\", \"value\", \"derivative\"],\n  \"views\": [\n{}\n  ],\n  \"aggregate\": {{\n    \"legacySkippedIterations\": {},\n    \"oneRungSkippedIterations\": {},\n    \"twoRungSkippedIterations\": {},\n    \"oneRungCandidateUsage\": {:?},\n    \"twoRungCandidateUsage\": {:?}\n  }},\n  \"rolloutGate\": {{\n    \"oneRungEnvelopeBytesPerBlock\": 112,\n    \"oneRungCombinedBytesPerBlock\": 220,\n    \"twoRungEnvelopeBytesPerBlock\": 144,\n    \"twoRungCombinedBytesPerBlock\": 252,\n    \"packedOneRungEnvelopeBytesPerBlock\": 96,\n    \"packedOneRungCombinedBytesPerBlock\": 204,\n    \"metadataLimitEnvelopeBytes\": 96,\n    \"metadataLimitCombinedBytes\": 204,\n    \"correctnessSweepPassed\": true,\n    \"packedSerializationAuditPassed\": true,\n    \"packedMatchesOneRungDecisions\": true,\n    \"oneRungMetadataPassed\": false,\n    \"twoRungMetadataPassed\": false,\n    \"packedOneRungMetadataPassed\": true,\n    \"gpuAndNavigationGates\": \"pending\",\n    \"oneRungRolloutEligible\": false,\n    \"twoRungRolloutEligible\": false,\n    \"packedOneRungRolloutEligible\": false,\n    \"selectedForPackedPrototype\": \"{}\"\n  }}\n}}",
            epsilon,
            reference_log2_dc,
            log2_dc_grid,
            views.join(",\n"),
            global_legacy.skipped_iterations,
            global_one.skipped_iterations,
            global_two.skipped_iterations,
            global_one.candidate_usage,
            global_two.candidate_usage,
            selected,
        )
        .unwrap();
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("benchmarks/dynamic-validity-census.json");
        std::fs::write(&path, &json).unwrap();
        println!("{}", json);
        assert!(global_one.skipped_iterations > 0);
        assert!(global_two.skipped_iterations > 0);
    }

    #[test]
    fn cpu_auto_referee_preserves_tails_rebases_continuations_and_derivatives() {
        let epsilon = 1e-6_f64;
        let reference_log2_dc = -20.0;
        let orbit = ref_orbit_f64(-1.401155, 0.0, 256);
        assert!(orbit.len() > 256, "reference escaped");
        let levels = build_unified_levels(&orbit, 64);
        let bounds = unified_build_bounds(&levels, &orbit, reference_log2_dc);
        let serialized: Vec<Vec<SerializedValidityEnvelope>> = levels
            .iter()
            .enumerate()
            .map(|(level_index, level)| {
                (0..level.blocks.len())
                    .map(|slot| {
                        serialize_validity_envelope(&unified_validity_envelope_for_block(
                            &level.blocks[slot],
                            &level.moduli[slot],
                            &bounds,
                            level_index,
                            slot,
                            epsilon,
                            reference_log2_dc,
                        ))
                    })
                    .collect()
            })
            .collect();
        let dc_magnitude = 2f64.powi(-40);
        let dc = CFe::from_c(dc_magnitude * 0.8, dc_magnitude * 0.3);

        // Only the first 192 reference indices are committed. The remainder
        // must be exact without changing the completed result.
        let mut continuous = DynamicCpuRun::new();
        run_dynamic_cpu_segment(
            &mut continuous,
            &levels,
            &serialized,
            &orbit,
            dc,
            192,
            256,
            usize::MAX,
        );
        assert!(!continuous.escaped);
        assert_eq!(continuous.physical_iteration, 256);
        assert!(continuous.block_applications > 0);
        assert!(continuous.exact_steps >= 64);

        // Parking and resuming after three turns is bit-identical because no
        // hidden referee state exists outside the continuation payload.
        let mut continued = DynamicCpuRun::new();
        run_dynamic_cpu_segment(
            &mut continued,
            &levels,
            &serialized,
            &orbit,
            dc,
            192,
            256,
            3,
        );
        assert!(continued.physical_iteration < 256);
        run_dynamic_cpu_segment(
            &mut continued,
            &levels,
            &serialized,
            &orbit,
            dc,
            192,
            256,
            usize::MAX,
        );
        assert_eq!(continued.state.delta, continuous.state.delta);
        assert_eq!(continued.state.derivative, continuous.state.derivative);
        assert_eq!(
            continued.state.second_derivative,
            continuous.state.second_derivative
        );
        assert_eq!(continued.reference_index, continuous.reference_index);

        // Exact-only referee for the same pixel. Value and first derivative
        // carry the certified epsilon; z'' uses the existing best-effort tier
        // partials and retains the looser Phase-D tolerance.
        let mut exact = DynamicCpuRun::new();
        run_dynamic_cpu_segment(
            &mut exact,
            &levels,
            &serialized,
            &orbit,
            dc,
            0,
            256,
            usize::MAX,
        );
        assert!(!exact.escaped);
        assert!(cfe_relative_error(continuous.state.delta, exact.state.delta) < 1e-3);
        assert!(cfe_relative_error(continuous.state.derivative, exact.state.derivative) < 1e-3);
        assert!(
            cfe_relative_error(
                continuous.state.second_derivative,
                exact.state.second_derivative
            ) < 2e-2
        );

        // Zhuoran rebase equivalence: replace δ by the full z and restart the
        // reference at Z0=0. The next exact value, z' and z'' are unchanged.
        let mut prefix = DynamicCpuRun::new();
        run_dynamic_cpu_segment(
            &mut prefix,
            &levels,
            &serialized,
            &orbit,
            dc,
            0,
            32,
            usize::MAX,
        );
        assert!(prefix.reference_index > 0 && prefix.reference_index + 1 < orbit.len());
        let unrebased = exact_reference_step(prefix.state, orbit[prefix.reference_index], dc);
        let mut rebased_state = prefix.state;
        rebased_state.delta = CFe::from_c(
            orbit[prefix.reference_index].0,
            orbit[prefix.reference_index].1,
        )
        .add(prefix.state.delta);
        let rebased = exact_reference_step(rebased_state, orbit[0], dc);
        let unre_based_full = CFe::from_c(
            orbit[prefix.reference_index + 1].0,
            orbit[prefix.reference_index + 1].1,
        )
        .add(unrebased.delta);
        let rebased_full = CFe::from_c(orbit[1].0, orbit[1].1).add(rebased.delta);
        assert!(cfe_relative_error(rebased_full, unre_based_full) < 1e-12);
        assert!(cfe_relative_error(rebased.derivative, unrebased.derivative) < 1e-12);
        assert!(cfe_relative_error(rebased.second_derivative, unrebased.second_derivative) < 1e-12);

        // Out-of-domain dc rejects the table, then exact fallback preserves
        // the first escape (c=2 escapes on the second Mandelbrot step).
        let zero_orbit = ref_orbit_f64(0.0, 0.0, 4);
        let outside_dc = CFe::from_c(2.0, 0.0);
        let first = exact_reference_step(
            UnifiedCpuState {
                delta: CFe::ZERO,
                derivative: CFe::ZERO,
                second_derivative: CFe::ZERO,
            },
            zero_orbit[0],
            outside_dc,
        );
        let sample_level = [CpuValidityLevel {
            skip: 4,
            blocks: &serialized[2][..1],
        }];
        assert!(cpu_auto_referee_floatexp(
            &sample_level,
            0,
            4,
            4,
            cfe_floatexp32(outside_dc),
            cfe_floatexp32(first.delta),
        )
        .is_none());
        let second = exact_reference_step(first, zero_orbit[1], outside_dc);
        let escaped_z = CFe::from_c(zero_orbit[2].0, zero_orbit[2].1).add(second.delta);
        let (escape_x, escape_y) = escaped_z.to_f64();
        assert!(escape_x * escape_x + escape_y * escape_y > 4.0);
    }

    #[test]
    fn unified_identities_reconstruct_the_jet() {
        // (task 2.1, [2/1] F-form) On every block of every test orbit:
        // a20 = N₂ − D·A, a11 = A' − B·D − F·A, a21 = −D'·A − D·a11 − F·a20,
        // a02 = −F·B and a30 = −D·a20 (the [2/1] q₃₀ zero) reproduce the
        // source jet's raw coefficients to ~1e-11 at operand scale — the
        // record's identity-reconstruction invariant.
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("near-parab", -0.7499, 0.0001),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 512);
            assert!(orbit.len() > 512, "[{}] escaped", name);
            // Walk the same streaming compose the builder uses, keeping the
            // full jet next to the extracted record.
            let mut prev: Vec<JetF64> = (1..orbit.len())
                .map(|i| jet_seed(orbit[i].0, orbit[i].1))
                .collect();
            let mut skip = 1usize;
            loop {
                for jet in &prev {
                    let blk = UnifiedBlock::from_jet(jet);
                    if blk.m.degenerate {
                        continue;
                    }
                    // Error is measured against the identity's OPERAND scale, not
                    // the result: the chains cancel (e.g. c21 = −D'·A − D·c11
                    // with both terms ≥ |c21|), which is what the f32 GPU
                    // reconstruction sees too. At operand scale the identities
                    // hold to round-off.
                    let mag = |v: CFe| {
                        let (x, y) = v.to_f64();
                        (x * x + y * y).sqrt()
                    };
                    let mut checks = vec![
                        (
                            "a20",
                            blk.a20(),
                            jet.coeff(2, 0),
                            mag(blk.m.n2).max(mag(blk.m.d.mul(blk.m.a))),
                        ),
                        (
                            "a11",
                            blk.a11(),
                            jet.coeff(1, 1),
                            mag(blk.m.ap)
                                .max(mag(blk.m.b.mul(blk.m.d)))
                                .max(mag(blk.m.f.mul(blk.m.a))),
                        ),
                        (
                            "a21",
                            blk.a21(),
                            jet.coeff(2, 1),
                            mag(blk.m.dp.mul(blk.m.a))
                                .max(mag(blk.m.d.mul(blk.a11())))
                                .max(mag(blk.m.f.mul(blk.a20()))),
                        ),
                        ("a02", blk.a02(), jet.coeff(0, 2), mag(blk.a02())),
                    ];
                    // a₃₀ = −D·a₂₀ holds only when the [2/1] extraction is
                    // live (c₂₀ ≠ 0) — the fallback keeps the raw c₃₀ a live
                    // REST term instead.
                    if !jet.coeff(2, 0).is_zero() {
                        checks.push((
                            "a30",
                            blk.a30(),
                            jet.coeff(3, 0),
                            // The chain is −D·(N₂ − D·A): its rounding scale is
                            // |D| times a₂₀'s operand scale (the N₂ ↔ D·A
                            // cancellation amplified by D).
                            mag(blk.m.d.mul(blk.m.n2)).max(mag(blk.m.d.mul(blk.m.d).mul(blk.m.a))),
                        ));
                    }
                    for (what, got, want, scale) in checks {
                        let (gx, gy) = got.to_f64();
                        let (wx, wy) = want.to_f64();
                        let d = ((gx - wx).powi(2) + (gy - wy).powi(2)).sqrt();
                        let s = scale.max(mag(want)).max(1e-300);
                        // ~1e-11 at operand scale: the a21 chain stacks 4 CFe
                        // operations; a few dozen ulps of f64, four orders
                        // below the f32 mantissa the GPU reconstruction keeps.
                        assert!(
                            d / s < 1e-11,
                            "[{} skip {}] {} reconstruction off by {:e} at operand scale",
                            name,
                            skip,
                            what,
                            d / s
                        );
                    }
                }
                if skip >= 256 || prev.len() < 2 {
                    break;
                }
                prev = (0..prev.len() / 2)
                    .map(|i| jet_compose(&prev[2 * i], &prev[2 * i + 1]))
                    .collect();
                skip *= 2;
            }
        }
    }

    #[test]
    fn unified_radii_sound_and_boost_measured() {
        // (task 2.2) Per-tier soundness vs exact stepping: entries sampled
        // below each tier's radius — INCLUDING closed-form-boosted Padé/c+
        // radii — propagated by the tier's own evaluator stay within the ε
        // error-scale budget against exact perturbation stepping through the
        // same block steps. The closed-form boost count is the spec's
        // tightness diagnostic.
        use crate::mobius::mobius_apply;
        let eps = 1e-12_f64;
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("near-parab", -0.7499, 0.0001),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 1024);
            assert!(orbit.len() > 1024, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 1 << 18);
            for c_max in [1e-9_f64, 1e-14] {
                let rad = unified_build_radii(&levels, &orbit, eps, c_max);
                println!(
                    "[{} c_max={:e}] closed-form boosts: padé {} c+ {}",
                    name, c_max, rad.boost_pade, rad.boost_cplus
                );
                let mag = |v: CFe| {
                    let (a, b) = v.to_f64();
                    (a * a + b * b).sqrt()
                };
                let mut checked = 0usize;
                for (li, lvl) in levels.iter().enumerate() {
                    if lvl.skip < 4 {
                        continue;
                    }
                    for s in (0..lvl.blocks.len()).step_by(7) {
                        let blk = &lvl.blocks[s];
                        if blk.m.degenerate {
                            continue;
                        }
                        let first = 1 + s * lvl.skip;
                        for tier in 0..4usize {
                            let r = rad.tiers[li][s][tier];
                            if !r.is_finite() {
                                continue;
                            }
                            for (back, phase) in [(0.11_f64, 0.3_f64), (2.3, 2.1)] {
                                let x = (r - back).exp2();
                                if !(x.is_finite() && x > 0.0) {
                                    continue;
                                }
                                let scale = mag(blk.m.a) * x + mag(blk.m.b) * c_max;
                                if !scale.is_finite() {
                                    continue; // top-level |A| overflows f64 — unsampleable
                                }
                                let z = (x * phase.cos(), x * phase.sin());
                                let c = (c_max * 1.9_f64.cos(), c_max * 1.9_f64.sin());
                                // Exact perturbation stepping through the block.
                                let (mut wx, mut wy) = z;
                                for j in first..first + lvl.skip {
                                    let (zx2, zy2) = orbit[j];
                                    let m2 =
                                        (2.0 * (zx2 * wx - zy2 * wy), 2.0 * (zx2 * wy + zy2 * wx));
                                    let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
                                    wx = m2.0 + sq.0 + c.0;
                                    wy = m2.1 + sq.1 + c.1;
                                }
                                let zfe = CFe::from_c(z.0, z.1);
                                let cfe = CFe::from_c(c.0, c.1);
                                let got = match tier {
                                    TIER_AFFINE => blk.m.a.mul(zfe).add(blk.m.b.mul(cfe)),
                                    TIER_PADE => {
                                        let mut m = blk.m;
                                        m.ap = CFe::ZERO;
                                        m.dp = CFe::ZERO;
                                        m.f = CFe::ZERO;
                                        mobius_apply(&m, zfe, cfe).0
                                    }
                                    TIER_CPLUS => mobius_apply(&blk.m, zfe, cfe).0,
                                    _ => unified_eval_jet3(blk, zfe, cfe),
                                };
                                let (gx, gy) = got.to_f64();
                                let err = ((gx - wx).powi(2) + (gy - wy).powi(2)).sqrt();
                                checked += 1;
                                assert!(
                                    err <= 5.0 * eps * scale,
                                    "[{} c_max={:e}] level {} slot {} tier {}: err {:e} > 5ε·scale {:e} at r−{}",
                                    name, c_max, li, s, tier, err, 5.0 * eps * scale, back
                                );
                            }
                        }
                    }
                }
                println!(
                    "[{} c_max={:e}] soundness samples: {}",
                    name, c_max, checked
                );
                assert!(
                    checked > 100,
                    "[{} c_max={:e}] too few samples",
                    name,
                    c_max
                );
            }
        }
    }

    #[test]
    fn unified_serialization_round_trip() {
        // (task 2.3) Emitted levels are skip ≥ 4; coefficient records and the
        // sidecar stay index-aligned through the directory; the record
        // preserves the prefix order exactly (deterministic cfe_to_coeff);
        // the tag is the cheapest band-covering tier with the argmax fallback
        // for band-dead-but-alive blocks; degenerate blocks ship r = −∞.
        let eps = 1e-12_f64;
        let c_max = 1e-14_f64;
        let orbit = ref_orbit_f64(-1.401155, 0.0, 1024);
        assert!(orbit.len() > 1024, "reference escaped");
        let levels = build_unified_levels(&orbit, 1 << 18);
        let rad = unified_build_radii(&levels, &orbit, eps, c_max);
        let band = c_max.log2() + 10.0;
        let coeffs = unified_serialize_coeffs(&levels);
        let (sidecar, dir) = unified_serialize_radii(
            &levels,
            &rad,
            band,
            UNIFIED_BAND_SPREAD_LOG2,
            None,
            None,
            &[],
        );
        assert_eq!(coeffs.len(), sidecar.len(), "buffers not index-aligned");
        let emitted: Vec<usize> = levels
            .iter()
            .enumerate()
            .filter(|(_, l)| l.skip >= MOBIUS_MIN_EMIT_SKIP)
            .map(|(i, _)| i)
            .collect();
        assert_eq!(dir.len(), emitted.len(), "directory misses emitted levels");
        let (mut covered, mut fallback, mut dead) = (0usize, 0usize, 0usize);
        for (d, &li) in dir.iter().zip(emitted.iter()) {
            let lvl = &levels[li];
            assert_eq!(d.skip as usize, lvl.skip);
            assert_eq!(d.count as usize, lvl.blocks.len());
            for s in 0..lvl.blocks.len() {
                let idx = d.offset as usize + s;
                let rec = &coeffs[idx];
                let side = &sidecar[idx];
                let blk = &lvl.blocks[s];
                // Prefix order, exact deterministic round-trip.
                let want = [
                    &blk.m.a, &blk.m.b, &blk.m.d, &blk.m.n2, &blk.m.ap, &blk.m.dp, &blk.m.f,
                    &blk.a12, &blk.a03,
                ];
                for (k, w) in want.iter().enumerate() {
                    assert_eq!(
                        rec[k],
                        crate::jet::cfe_to_coeff(w),
                        "level {} slot {} coeff {} not prefix-ordered",
                        li,
                        s,
                        k
                    );
                }
                // Tag rule (§6.3 score) + radius f32 rounding + sentinels.
                let tiers = &rad.tiers[li][s];
                let is_safe = unified_f32_safe(&lvl.moduli[s], &blk.m);
                match unified_portfolio_tags_with(tiers, band, UNIFIED_BAND_SPREAD_LOG2, is_safe) {
                    None => {
                        dead += 1;
                        assert_eq!(side.r_log2, f32::NEG_INFINITY);
                    }
                    Some((t, _, _)) => {
                        if (band as f64) < tiers[t] {
                            covered += 1;
                        } else {
                            fallback += 1;
                        }
                        assert_eq!(side.tag, t as f32, "tag mismatch");
                        assert_eq!(side.r_log2, tiers[t] as f32, "radius rounding");
                    }
                }
                if blk.m.degenerate {
                    assert_eq!(side.r_log2, f32::NEG_INFINITY, "degenerate must be dead");
                }
            }
        }
        println!(
            "round-trip: {} band-covered, {} argmax-fallback, {} dead blocks",
            covered, fallback, dead
        );
        assert!(covered > 0, "no band-covered blocks — band or radii broken");
    }

    #[test]
    #[ignore = "cold-build stage timing (§8.2): cargo test --release -- --ignored --nocapture"]
    fn unified_cold_build_stage_timing() {
        use std::fmt::Write as _;
        use std::path::PathBuf;
        use std::time::Instant;

        let mut baseline_views = Vec::new();
        for (name, cx, cy, iters, lcmax) in [
            (
                "seahorse",
                -0.743643887037151_f64,
                0.131825904205330_f64,
                32768usize,
                -40.0,
            ),
            ("feigenbaum", -1.401155, 0.0, 32768, -44.0),
            ("near-parab", -0.7499, 0.0001, 32768, -40.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, iters);
            if orbit.len() < iters / 2 {
                println!("[{name}] escaped — skipped");
                baseline_views.push(format!(
                    "    {{\n      \"name\": \"{name}\",\n      \"status\": \"escaped\",\n      \"orbitSteps\": {}\n    }}",
                    orbit.len().saturating_sub(1)
                ));
                continue;
            }
            let eps = 1e-6;
            let t0 = Instant::now();
            let levels = build_unified_levels(&orbit, 1 << 18);
            let t_build = t0.elapsed();
            let t1 = Instant::now();
            let bounds = unified_build_bounds(&levels, &orbit, lcmax);
            let t_bounds = t1.elapsed();
            // Sub-stage split of bounds: jet per-block moduli walks vs the
            // shared mobius majorant pair (which of the two to attack).
            let tj = Instant::now();
            let twoz: Vec<(f64, i64)> = orbit
                .iter()
                .map(|&(zx, zy)| sfe_norm(2.0 * (zx * zx + zy * zy).sqrt(), 0))
                .collect();
            for lvl in &levels {
                for s in 0..lvl.blocks.len() {
                    let first = 1 + s * lvl.skip;
                    std::hint::black_box(jet_block_bounds_moduli(
                        &lvl.moduli[s].log2_a,
                        &twoz[first..first + lvl.skip],
                        lcmax + 10.0,
                    ));
                }
            }
            let t_jetb = tj.elapsed();
            let t2 = Instant::now();
            let radii = unified_solve_radii(&levels, &bounds, eps, lcmax);
            let t_radii = t2.elapsed();
            // Sub-stage split of radii: the four mobius solves vs the
            // per-block jet/affine solves.
            {
                use crate::mobius::{mobius_build_derivative_radii, mobius_build_radii};
                let ts = Instant::now();
                let mlv = to_mobius_levels(&levels, false);
                let plv = to_mobius_levels(&levels, true);
                let t_views = ts.elapsed();
                let ts = Instant::now();
                let r_cv = mobius_build_radii(&mlv, &bounds.cplus, eps, lcmax);
                let r_pv = mobius_build_radii(&plv, &bounds.plain, eps, lcmax);
                let t_val = ts.elapsed();
                let ts = Instant::now();
                let _ = mobius_build_derivative_radii(&mlv, &bounds.cplus, eps, lcmax, Some(&r_cv));
                let _ = mobius_build_derivative_radii(&plv, &bounds.plain, eps, lcmax, Some(&r_pv));
                let t_der = ts.elapsed();
                let ts = Instant::now();
                let mut acc = 0f64;
                for (li, lvl) in levels.iter().enumerate() {
                    for s in 0..lvl.blocks.len() {
                        let rj = jet_solve_radii(&bounds.jet[li][s], eps, lcmax);
                        acc += rj[0];
                    }
                }
                std::hint::black_box(acc);
                let t_jet = ts.elapsed();
                println!(
                    "[{name:>10}] radii split: views {t_views:.1?} mobius-V {t_val:.1?} \
                     mobius-V' {t_der:.1?} jet-part {t_jet:.1?}"
                );
            }
            let t3 = Instant::now();
            let sa = sa_build(&orbit, eps, lcmax.exp2(), orbit.len() - 1);
            let t_sa = t3.elapsed();
            let t4 = Instant::now();
            let (band, spread) = unified_replay_band(&orbit, lcmax);
            let t_replay = t4.elapsed();
            println!(
                "[{name:>10}] replay band {band:.1} (placeholder {:.1}) spread {spread:.1} \
                 in {t_replay:.1?}",
                lcmax + 10.0
            );
            let t4 = Instant::now();
            let coeffs = unified_serialize_coeffs(&levels);
            let (side, dir) =
                unified_serialize_radii(&levels, &radii, band, spread, None, None, &[]);
            let t_ser = t4.elapsed();
            let block_count = side.len();
            assert_eq!(
                coeffs.len(),
                block_count,
                "coefficient/sidecar block mismatch"
            );
            let coefficient_bytes = coeffs.len() * core::mem::size_of_val(&coeffs[0]);
            let sidecar_bytes = side.len() * core::mem::size_of::<UnifiedRadius>();
            let directory_bytes = dir.len() * core::mem::size_of::<JetLevel>();
            let total_table_bytes = coefficient_bytes + sidecar_bytes + directory_bytes;
            let bytes_per_block = if block_count > 0 {
                (coefficient_bytes + sidecar_bytes) as f64 / block_count as f64
            } else {
                0.0
            };
            // Tag mix: §6.3 score vs the legacy cheapest-covering rule.
            let (mut mix_new, mut mix_old) = ([0usize; 4], [0usize; 4]);
            let (mut flips, mut secours_live) = (0usize, 0usize);
            for (li, lvl) in levels.iter().enumerate() {
                if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                    continue;
                }
                for s in 0..lvl.blocks.len() {
                    let tiers = &radii.tiers[li][s];
                    let new = unified_portfolio_tags(tiers, band, spread);
                    let old = unified_tag(tiers, band);
                    if let Some((t, t2x, r2)) = new {
                        mix_new[t] += 1;
                        if r2.is_finite() && t2x != t {
                            secours_live += 1;
                        }
                    }
                    if let Some(t) = old {
                        mix_old[t] += 1;
                    }
                    if new.map(|(t, _, _)| t) != old {
                        flips += 1;
                    }
                }
            }
            println!(
                "[{name:>10}] n={} | build {:>6.1?} bounds {:>6.1?} (jet-part {:>6.1?}) \
                 radii {:>6.1?} sa {:>6.1?} serialize {:>6.1?} (sa n0={}) | blocks {} | \
                 tags new {:?} old {:?} flips {} secours {}",
                orbit.len() - 1,
                t_build,
                t_bounds,
                t_jetb,
                t_radii,
                t_sa,
                t_ser,
                sa.n0,
                block_count,
                mix_new,
                mix_old,
                flips,
                secours_live,
            );
            println!(
                "[{name:>10}] table bytes: coeffs {coefficient_bytes} sidecar {sidecar_bytes} \
                 directory {directory_bytes} total {total_table_bytes} | {bytes_per_block:.1} B/block"
            );

            let ms = |duration: std::time::Duration| duration.as_secs_f64() * 1000.0;
            baseline_views.push(format!(
                concat!(
                    "    {{\n",
                    "      \"name\": \"{name}\",\n",
                    "      \"status\": \"measured\",\n",
                    "      \"orbitSteps\": {orbit_steps},\n",
                    "      \"log2CMax\": {lcmax:.1},\n",
                    "      \"timingsMs\": {{\n",
                    "        \"coefficients\": {coefficients:.3},\n",
                    "        \"bounds\": {bounds_ms:.3},\n",
                    "        \"radii\": {radii_ms:.3},\n",
                    "        \"sa\": {sa_ms:.3},\n",
                    "        \"replay\": {replay_ms:.3},\n",
                    "        \"serialization\": {serialization_ms:.3}\n",
                    "      }},\n",
                    "      \"levelCount\": {level_count},\n",
                    "      \"blockCount\": {block_count},\n",
                    "      \"coefficientBytes\": {coefficient_bytes},\n",
                    "      \"sidecarBytes\": {sidecar_bytes},\n",
                    "      \"directoryBytes\": {directory_bytes},\n",
                    "      \"totalTableBytes\": {total_table_bytes},\n",
                    "      \"bytesPerBlock\": {bytes_per_block:.1}\n",
                    "    }}"
                ),
                name = name,
                orbit_steps = orbit.len() - 1,
                lcmax = lcmax,
                coefficients = ms(t_build),
                bounds_ms = ms(t_bounds),
                radii_ms = ms(t_radii),
                sa_ms = ms(t_sa),
                replay_ms = ms(t_replay),
                serialization_ms = ms(t_ser),
                level_count = dir.len(),
                block_count = block_count,
                coefficient_bytes = coefficient_bytes,
                sidecar_bytes = sidecar_bytes,
                directory_bytes = directory_bytes,
                total_table_bytes = total_table_bytes,
                bytes_per_block = bytes_per_block,
            ));
        }

        let mut baseline = String::new();
        writeln!(&mut baseline, "{{").unwrap();
        writeln!(&mut baseline, "  \"schemaVersion\": 1,").unwrap();
        writeln!(&mut baseline, "  \"benchmark\": \"unified-cold-build\",").unwrap();
        writeln!(&mut baseline, "  \"iterations\": 32768,").unwrap();
        writeln!(&mut baseline, "  \"epsilon\": 0.000001,").unwrap();
        writeln!(&mut baseline, "  \"views\": [").unwrap();
        writeln!(&mut baseline, "{}", baseline_views.join(",\n")).unwrap();
        writeln!(&mut baseline, "  ]").unwrap();
        writeln!(&mut baseline, "}}").unwrap();
        println!("UNIFIED_COLD_BUILD_BASELINE_JSON\n{baseline}");

        if std::env::var_os("MANDELBROT_WRITE_BENCHMARK_BASELINE").is_some() {
            let path = std::env::var_os("MANDELBROT_BENCHMARK_BASELINE_PATH")
                .map(PathBuf::from)
                .unwrap_or_else(|| {
                    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                        .join("benchmarks/unified-cold-build-baseline.json")
                });
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).unwrap();
            }
            std::fs::write(&path, baseline).unwrap();
            println!(
                "persisted unified cold-build baseline to {}",
                path.display()
            );
        }
    }

    #[test]
    fn unified_replay_band_sane() {
        for (name, cx, cy, lcmax) in [
            ("feigenbaum", -1.401155_f64, 0.0_f64, -44.0_f64),
            ("near-parab", -0.7499, 0.0001, -40.0),
            ("seahorse", -0.743643887037151, 0.131825904205330, -40.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 2048);
            let (band, spread) = unified_replay_band(&orbit, lcmax);
            assert!(band.is_finite(), "[{name}] band not finite");
            // Zhuoran-rebased |dz| lives at pixel scale: at or a few octaves
            // above c_max, never below |dc| and never past escape scale.
            assert!(
                band >= lcmax - 2.0 && band <= 2.0,
                "[{name}] band {band} out of range (c_max {lcmax})"
            );
            assert!((1.0..=40.0).contains(&spread), "[{name}] spread {spread}");
        }
        // Short orbit falls back to the census-note-5 placeholder.
        let (b, s) = unified_replay_band(&[(0.0, 0.0); 4], -40.0);
        assert_eq!(b, -30.0);
        assert_eq!(s, UNIFIED_BAND_SPREAD_LOG2);
    }

    #[test]
    fn unified_portfolio_secours_encoding() {
        // Portfolio rule (plan §8): the sidecar packs a SECOURS candidate
        // without growing past 16 B — w = its radius, z = f32_safe + 2·tag2.
        // Checks the exact shader decode (floor(z·0.5) / z − 2·floor(z·0.5)),
        // the argmax rule, strict improvement over the principal, and the
        // level gate (max_r3 admits the secours band).
        let eps = 1e-12_f64;
        let c_max = 1e-14_f64;
        let orbit = ref_orbit_f64(-1.401155, 0.0, 1024);
        assert!(orbit.len() > 1024, "reference escaped");
        let levels = build_unified_levels(&orbit, 1 << 18);
        let rad = unified_build_radii(&levels, &orbit, eps, c_max);
        let band = c_max.log2() + 10.0;
        let (side, dir) = unified_serialize_radii(
            &levels,
            &rad,
            band,
            UNIFIED_BAND_SPREAD_LOG2,
            None,
            None,
            &[],
        );
        let emitted: Vec<usize> = levels
            .iter()
            .enumerate()
            .filter(|(_, l)| l.skip >= MOBIUS_MIN_EMIT_SKIP)
            .map(|(i, _)| i)
            .collect();
        let mut with_secours = 0usize;
        for (d, &li) in dir.iter().zip(emitted.iter()) {
            let mut lvl_max = f32::NEG_INFINITY;
            for s in 0..d.count as usize {
                let e = &side[d.offset as usize + s];
                lvl_max = lvl_max.max(e.r_log2).max(e.pad);
                // Exact shader decode of the packed z slot.
                let tag2 = (e.f32_safe * 0.5).floor();
                let safe = e.f32_safe - 2.0 * tag2;
                assert!(
                    safe == 0.0 || safe == 1.0,
                    "safe flag not 0/1: {}",
                    e.f32_safe
                );
                assert!((0.0..=3.0).contains(&tag2), "secours tag out of range");
                let tiers = &rad.tiers[li][s];
                // The serialized pair must be exactly the §6.2/§6.3 policy
                // output (pair selection at the block's own f32-safe flag).
                let is_safe = unified_f32_safe(&levels[li].moduli[s], &levels[li].blocks[s].m);
                if let Some((pt, pt2, pr2)) =
                    unified_portfolio_tags_with(tiers, band, UNIFIED_BAND_SPREAD_LOG2, is_safe)
                {
                    assert_eq!(e.tag, pt as f32, "principal is not the policy pick");
                    assert_eq!(tag2 as usize, pt2, "secours tag mismatch");
                    assert_eq!(e.pad, pr2 as f32, "secours radius mismatch");
                }
                if e.pad.is_finite() {
                    with_secours += 1;
                    assert!(e.pad > e.r_log2, "secours must strictly beat principal");
                    assert_ne!(tag2, e.tag, "secours must differ from principal");
                    assert_eq!(e.pad, tiers[tag2 as usize] as f32, "secours radius");
                } else if e.r_log2.is_finite() {
                    assert_eq!(tag2, e.tag, "dead secours must alias the principal");
                }
            }
            assert_eq!(
                d.max_r3_log2, lvl_max,
                "level gate must admit the secours band"
            );
        }
        println!("portfolio: {} blocks carry a live secours", with_secours);
        assert!(
            with_secours > 0,
            "no secours anywhere — portfolio inert on this view"
        );
    }

    #[test]
    fn unified_derivative_radii_sound() {
        // (Phase B, tasks 3.1-3.3) (V′) coverage: entries sampled below each
        // tier's EFFECTIVE radius (min(r, r′)) propagated by the tier's own ∂z
        // stay within the ε derivative-scale budget against exact derivative
        // stepping ((∂z chain) dδ' = (2Z + 2δ)·dδ) — including quasi-critical
        // blocks. Also prints the honest-DE shrink diagnostic (r′ < r counts),
        // the 3.4 field-round input.
        use crate::mobius::mobius_apply;
        let eps = 1e-12_f64;
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("near-parab", -0.7499, 0.0001),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 1024);
            assert!(orbit.len() > 1024, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 1 << 18);
            for c_max in [1e-9_f64, 1e-14] {
                let rad = unified_build_radii(&levels, &orbit, eps, c_max);
                let mag = |v: CFe| {
                    let (a, b) = v.to_f64();
                    (a * a + b * b).sqrt()
                };
                let mut checked = 0usize;
                let mut der_limited = [0usize; 4];
                let mut der_dead = [0usize; 4];
                let mut finite = [0usize; 4];
                for (li, lvl) in levels.iter().enumerate() {
                    if lvl.skip < 4 {
                        continue;
                    }
                    for sidx in (0..lvl.blocks.len()).step_by(7) {
                        let blk = &lvl.blocks[sidx];
                        if blk.m.degenerate {
                            continue;
                        }
                        let first = 1 + sidx * lvl.skip;
                        for tier in 0..4usize {
                            let r_eff = rad.tiers[li][sidx][tier];
                            let r_der = rad.tiers_der[li][sidx][tier];
                            let r_val = rad.tiers_value[li][sidx][tier];
                            if r_val.is_finite() {
                                finite[tier] += 1;
                                if !r_der.is_finite() {
                                    der_dead[tier] += 1; // (V′) kills the tier here
                                } else if r_der < r_val - 1e-9 {
                                    der_limited[tier] += 1; // honest-DE shrink
                                }
                            }
                            if !r_eff.is_finite() {
                                continue;
                            }
                            for (back, phase) in [(0.11_f64, 0.7_f64), (2.0, 2.6)] {
                                let x = (r_eff - back).exp2();
                                if !(x.is_finite() && x > 0.0) {
                                    continue;
                                }
                                let der_scale = mag(blk.m.a) + mag(blk.m.ap) * c_max;
                                if !der_scale.is_finite() {
                                    continue;
                                }
                                let z = (x * phase.cos(), x * phase.sin());
                                let c = (c_max * 0.4_f64.cos(), c_max * 0.4_f64.sin());
                                // Exact value + ∂z propagation through the block.
                                let (mut wx, mut wy) = z;
                                let (mut dx, mut dy) = (1.0_f64, 0.0_f64);
                                for j in first..first + lvl.skip {
                                    let (zx2, zy2) = orbit[j];
                                    let (mx, my) = (zx2 + wx, zy2 + wy);
                                    let nd = (2.0 * (mx * dx - my * dy), 2.0 * (mx * dy + my * dx));
                                    let m2 =
                                        (2.0 * (zx2 * wx - zy2 * wy), 2.0 * (zx2 * wy + zy2 * wx));
                                    let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
                                    wx = m2.0 + sq.0 + c.0;
                                    wy = m2.1 + sq.1 + c.1;
                                    dx = nd.0;
                                    dy = nd.1;
                                }
                                let zfe = CFe::from_c(z.0, z.1);
                                let cfe = CFe::from_c(c.0, c.1);
                                let got = match tier {
                                    TIER_AFFINE => blk.m.a,
                                    TIER_PADE => {
                                        let mut m = blk.m;
                                        m.ap = CFe::ZERO;
                                        m.dp = CFe::ZERO;
                                        m.f = CFe::ZERO;
                                        mobius_apply(&m, zfe, cfe).1
                                    }
                                    TIER_CPLUS => mobius_apply(&blk.m, zfe, cfe).1,
                                    _ => unified_eval_jet3_dz(blk, zfe, cfe),
                                };
                                let (gx, gy) = got.to_f64();
                                let err = ((gx - dx).powi(2) + (gy - dy).powi(2)).sqrt();
                                checked += 1;
                                assert!(
                                    err <= 5.0 * eps * der_scale,
                                    "[{} c_max={:e}] level {} slot {} tier {}: der err {:e} > 5ε·scale {:e} at r−{}",
                                    name, c_max, li, sidx, tier, err, 5.0 * eps * der_scale, back
                                );
                            }
                        }
                    }
                }
                println!(
                    "[{} c_max={:e}] der soundness: {} samples | of {:?} value-alive blocks per tier: der-limited {:?}, der-DEAD {:?}",
                    name, c_max, checked, finite, der_limited, der_dead
                );
                assert!(
                    checked > 100,
                    "[{} c_max={:e}] too few samples",
                    name,
                    c_max
                );
            }
        }
    }

    #[test]
    fn sa_prefix_certified_and_profile() {
        // (Phase C, task 4.1) Soundness: δ(dc) from the SA polynomial at n0
        // matches exact prefix iteration 0..n0 within ε·|b₁|·|dc| for |dc| at
        // c_max, sampled phases — measured pattern ~0.003·ε. The derivative
        // seed Σ j·b_j·dc^(j−1) matches exact ∂c stepping too. And the r_c(N)
        // profile collapses at the first quasi-critical passage (diagnostic).
        let eps = 1e-12_f64;
        for (name, cx, cy, cmaxes) in [
            (
                "seahorse",
                -0.743643887037151_f64,
                0.131825904205330_f64,
                [1e-14_f64, 1e-9],
            ),
            ("near-parab", -0.7499, 0.0001, [1e-14, 1e-9]),
            ("feigenbaum", -1.401155, 0.0, [1e-14, 1e-9]),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 2500);
            assert!(orbit.len() > 2500, "[{}] escaped", name);
            for c_max in cmaxes {
                let sa = sa_build(&orbit, eps, c_max, 2500);
                println!("[{} c_max={:e}] SA n0 = {}", name, c_max, sa.n0);
                if sa.n0 == 0 {
                    continue; // nothing certified at this scale — allowed
                }
                let mag = |v: CFe| {
                    let (a, b) = v.to_f64();
                    (a * a + b * b).sqrt()
                };
                for phase in [0.3_f64, 2.0, 4.4] {
                    let dc = (c_max * phase.cos(), c_max * phase.sin());
                    // Exact prefix iteration + ∂c chain.
                    let (mut wx, mut wy) = (0.0_f64, 0.0);
                    let (mut dx, mut dy) = (0.0_f64, 0.0);
                    for j in 0..sa.n0 {
                        let (zx2, zy2) = orbit[j];
                        let (mx, my) = (zx2 + wx, zy2 + wy);
                        let nd = (2.0 * (mx * dx - my * dy) + 1.0, 2.0 * (mx * dy + my * dx));
                        let m2 = (2.0 * (zx2 * wx - zy2 * wy), 2.0 * (zx2 * wy + zy2 * wx));
                        let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
                        wx = m2.0 + sq.0 + dc.0;
                        wy = m2.1 + sq.1 + dc.1;
                        dx = nd.0;
                        dy = nd.1;
                    }
                    // SA polynomial + its ∂c.
                    let dcfe = CFe::from_c(dc.0, dc.1);
                    let mut v = CFe::ZERO;
                    let mut d = CFe::ZERO;
                    for j in (1..=SA_APPLIED).rev() {
                        v = v.add(sa.b[j - 1]).mul(dcfe);
                        let jb = CFe {
                            x: j as f64 * sa.b[j - 1].x,
                            y: j as f64 * sa.b[j - 1].y,
                            e: sa.b[j - 1].e,
                        };
                        if j > 1 {
                            d = d.add(jb).mul(dcfe);
                        } else {
                            d = d.add(jb);
                        }
                    }
                    let (vx, vy) = v.to_f64();
                    let scale = eps * mag(sa.b[0]) * c_max;
                    let err = ((vx - wx).powi(2) + (vy - wy).powi(2)).sqrt();
                    assert!(
                        err <= 5.0 * scale,
                        "[{} c_max={:e}] SA value err {:e} > 5ε·scale {:e} at n0={}",
                        name,
                        c_max,
                        err,
                        5.0 * scale,
                        sa.n0
                    );
                    let (gx, gy) = d.to_f64();
                    let derr = ((gx - dx).powi(2) + (gy - dy).powi(2)).sqrt();
                    let dscale = eps * mag(sa.b[0]).max(1e-300);
                    assert!(
                        derr <= 50.0 * dscale,
                        "[{} c_max={:e}] SA der err {:e} > 50ε·|b1| {:e}",
                        name,
                        c_max,
                        derr,
                        50.0 * dscale
                    );
                }
            }
        }
        // Profile diagnostic: seahorse r_c(N) collapses across the first
        // quasi-critical passage (findings: 3.5e-8 at N=50 → far smaller later).
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 1700);
        let prof = sa_profile(&orbit, 1e-12, &[50, 400, 1600]);
        println!("seahorse r_c(N) profile (log2): {:?}", prof);
        assert!(
            prof[0].1 > prof[2].1 + 3.0,
            "profile did not collapse across the passage: {:?}",
            prof
        );
    }

    #[test]
    #[ignore] // timing diagnostic, run on demand: cargo test --release -- --ignored unified_build_budget
    fn unified_build_budget() {
        // (Phase F pulled forward) Wall-clock breakdown of the unified build at
        // a realistic deep orbit length — the 4.3 field spec showed the table
        // arriving AFTER convergence (zero applications) at seahorse 1e-10.
        use std::time::Instant;
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 40_000);
        let eps = 1e-12_f64;
        let c_max = 1e-10_f64;
        let t0 = Instant::now();
        let levels = build_unified_levels(&orbit, 1 << 18);
        let t_levels = t0.elapsed();
        let t1 = Instant::now();
        let bounds = unified_build_bounds(&levels, &orbit, c_max.log2());
        let t_bounds = t1.elapsed();
        let t2 = Instant::now();
        let rad = unified_solve_radii(&levels, &bounds, eps, c_max.log2());
        let t_radii = t2.elapsed();
        let t3 = Instant::now();
        let sa = sa_build(&orbit, eps, c_max, orbit.len() - 1);
        let t_sa = t3.elapsed();
        let t4 = Instant::now();
        let periodic = periodic_build(&orbit, eps, c_max.log2());
        let t_periodic = t4.elapsed();
        let t5 = Instant::now();
        let (side, dir) = unified_serialize_radii(
            &levels,
            &rad,
            c_max.log2() + 10.0,
            UNIFIED_BAND_SPREAD_LOG2,
            Some(&sa),
            periodic.as_ref(),
            &[],
        );
        let t_serialize = t5.elapsed();
        let nblocks: usize = levels.iter().map(|l| l.blocks.len()).sum();
        println!(
            "unified build @40k ({} blocks): levels {:?} | bounds {:?} | radii {:?} | sa {:?} (n0={}) | periodic {:?} | serialize {:?} ({} entries, {} levels) | total {:?}",
            nblocks, t_levels, t_bounds, t_radii, t_sa, sa.n0, t_periodic, t_serialize,
            side.len(), dir.len(), t0.elapsed()
        );

        // Same breakdown at the ENGINE's live configuration (ε = 1e-3 default,
        // c_max = 4·scale): the radii scan cost depends on (ε, c_max), so the
        // interactive keyframe budget must be measured at the shipped values.
        let eps_gpu = 1e-3_f64;
        let l2c_gpu = (1e-10_f64).log2() + 2.0;
        let tb = Instant::now();
        let bounds_gpu = unified_build_bounds(&levels, &orbit, l2c_gpu);
        let tb_bounds = tb.elapsed();
        let tr = Instant::now();
        let rad_gpu = unified_solve_radii(&levels, &bounds_gpu, eps_gpu, l2c_gpu);
        let tr_radii = tr.elapsed();
        let ts = Instant::now();
        let sa_gpu = sa_build(&orbit, eps_gpu, l2c_gpu.exp2(), orbit.len() - 1);
        let ts_sa = ts.elapsed();
        let _ = rad_gpu;
        println!(
            "unified build @40k GPU-config (eps 1e-3, c_max 4e-10): bounds {:?} | radii {:?} | sa {:?} (n0={})",
            tb_bounds, tr_radii, ts_sa, sa_gpu.n0
        );
    }

    #[test]
    #[ignore] // GPU-config sidecar dump, run on demand
    fn unified_sidecar_dump_gpu_config() {
        // Replicates the engine's exact deep-seahorse configuration (ε = 1e-3
        // default, c_max = 4·scale at 1e-10) and dumps the serialized sidecar
        // the GPU sees: per-level finite/tag histogram + a few sample entries.
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 5000);
        let eps = 1e-3_f64;
        let l2c = (1e-10_f64).log2() + 2.0;
        let levels = build_unified_levels(&orbit, 1 << 18);
        let bounds = unified_build_bounds(&levels, &orbit, l2c);
        let rad = unified_solve_radii(&levels, &bounds, eps, l2c);
        let sa = sa_build(&orbit, eps, l2c.exp2(), orbit.len() - 1);
        let (side, dir) = unified_serialize_radii(
            &levels,
            &rad,
            l2c + 10.0,
            UNIFIED_BAND_SPREAD_LOG2,
            Some(&sa),
            None,
            &[],
        );
        println!("SA n0 = {}", sa.n0);
        for d in &dir {
            let mut finite = 0usize;
            let mut tags = [0usize; 4];
            for k in 0..d.count as usize {
                let e = &side[d.offset as usize + k];
                if e.r_log2.is_finite() && e.r_log2 > -3.0e38 {
                    finite += 1;
                    tags[e.tag as usize] += 1;
                }
            }
            println!(
                "level skip {:>5}: {}/{} finite, tags {:?}, maxR3 {:.1}",
                d.skip, finite, d.count, tags, d.max_r3_log2
            );
        }
        // Sample a few entries of the skip-16 level.
        if let Some(d) = dir.iter().find(|d| d.skip == 16) {
            for k in (0..d.count as usize).step_by((d.count as usize / 6).max(1)) {
                let e = &side[d.offset as usize + k];
                println!(
                    "  skip16 slot {}: r={:.1} tag={} f32safe={}",
                    k, e.r_log2, e.tag, e.f32_safe
                );
            }
        }
    }

    #[test]
    #[ignore] // needle build-latency probe, run on demand (release!)
    fn unified_needle_build_budget() {
        use std::time::Instant;
        for n in [10_000usize, 50_000, 100_000] {
            let orbit = ref_orbit_f64(-2.0, 0.0, n);
            let eps = 1e-3_f64;
            let l2c = (1e-32_f64).log2() + 2.0;
            let t0 = Instant::now();
            let levels = build_unified_levels(&orbit, 1 << 18);
            let t_levels = t0.elapsed();
            let t1 = Instant::now();
            let bounds = unified_build_bounds(&levels, &orbit, l2c);
            let t_bounds = t1.elapsed();
            let t2 = Instant::now();
            let rad = unified_solve_radii(&levels, &bounds, eps, l2c);
            let t_radii = t2.elapsed();
            let t3 = Instant::now();
            let sa = sa_build(&orbit, eps, l2c.exp2(), orbit.len() - 1);
            let t_sa = t3.elapsed();
            println!(
                "needle build @{}: levels {:?} | bounds {:?} | radii {:?} | sa {:?} (n0={}) | total {:?}",
                n, t_levels, t_bounds, t_radii, t_sa, sa.n0, t0.elapsed()
            );
            let _ = rad;
        }
    }

    #[test]
    #[ignore] // needle (c = −2) zero-application diagnostic, run on demand
    fn unified_needle_diag() {
        // Antenna-tip repro: center −2, scale 1e-32 ⇒ ε = 1e-3,
        // log2 c_max = log2(scale) + 2 (engine defaults). The reference orbit
        // is 0, −2, 2, 2, 2, … (repelling fixed point, |2Z| = 4 constant).
        let orbit = ref_orbit_f64(-2.0, 0.0, 4096);
        assert!(orbit.len() > 4096, "needle reference escaped?!");
        let eps = 1e-3_f64;
        let scale = 1e-32_f64;
        let l2c = scale.log2() + 2.0;
        println!("l2c = {l2c:.2}, band = {:.2}", l2c + 10.0);
        let levels = build_unified_levels(&orbit, 1 << 18);
        let bounds = unified_build_bounds(&levels, &orbit, l2c);
        let rad = unified_solve_radii_diag(&levels, &bounds, eps, l2c);
        println!("boosts: padé {} c+ {}", rad.boost_pade, rad.boost_cplus);
        for (li, lvl) in levels.iter().enumerate() {
            if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                continue;
            }
            let s = 0usize;
            let v = &rad.tiers_value[li][s];
            let d = &rad.tiers_der[li][s];
            let e = &rad.tiers[li][s];
            println!(
                "skip {:>5} slot0: value [{:>8.1} {:>8.1} {:>8.1} {:>8.1}] der [{:>8.1} {:>8.1} {:>8.1} {:>8.1}] eff [{:>8.1} {:>8.1} {:>8.1} {:>8.1}] degen={}",
                lvl.skip, v[0], v[1], v[2], v[3], d[0], d[1], d[2], d[3],
                e[0], e[1], e[2], e[3], lvl.blocks[s].m.degenerate
            );
            // Jet-tier gate internals for the small levels.
            if lvl.skip <= 32 {
                let b = &bounds.jet[li][s];
                println!(
                    "        jet bounds: a10 {:.1} a01 {:.1} min2z {:.1} a0 {:?}",
                    b.log2_a10,
                    b.log2_a01,
                    b.log2_min_2z,
                    b.log2_a0
                        .iter()
                        .map(|x| (x * 10.0).round() / 10.0)
                        .collect::<Vec<_>>()
                );
                for (g, c) in b.cand.iter().enumerate().take(3) {
                    println!(
                        "        cand {}: rz {:.1} rc {:.1} M {:.1} Mc {:.1} T {:?}",
                        g,
                        c.log2_rz,
                        c.log2_rc,
                        c.log2_m,
                        c.log2_mc,
                        c.log2_t
                            .iter()
                            .map(|x| (x * 10.0).round() / 10.0)
                            .collect::<Vec<_>>()
                    );
                }
            }
        }
        // SA prefix.
        let sa = sa_build(&orbit, eps, l2c.exp2(), orbit.len() - 1);
        println!("SA n0 = {}", sa.n0);
        // Exact perturbation walk for an edge pixel: log2 |dz_n|.
        let dc = (scale, 0.0_f64);
        let (mut wx, mut wy) = (0.0_f64, 0.0_f64);
        let mut log2_dz = Vec::new();
        for n in 1..=80 {
            let (zx, zy) = orbit[n - 1];
            let m2 = (2.0 * (zx * wx - zy * wy), 2.0 * (zx * wy + zy * wx));
            let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
            wx = m2.0 + sq.0 + dc.0;
            wy = m2.1 + sq.1 + dc.1;
            log2_dz.push((n, 0.5 * (wx * wx + wy * wy).log2()));
        }
        println!("log2|dz_n| (n, l2): {:?}", &log2_dz[..12]);
        println!("… {:?}", &log2_dz[48..60]);
        // Runtime dispatch mirror (greedy largest skip, tagged radius, band
        // tags as serialized): count applications per tier.
        let band = l2c + 10.0;
        let (side, dir) = unified_serialize_radii(
            &levels,
            &rad,
            band,
            UNIFIED_BAND_SPREAD_LOG2,
            None,
            None,
            &[],
        );
        let mut tier_apps = [0usize; 4];
        let mut skipped = 0usize;
        let max_iter = orbit.len() - 1;
        let (mut wx, mut wy) = (0.0_f64, 0.0_f64);
        let mut ref_i = 0usize;
        let mut iter = 0usize;
        while iter < max_iter {
            let mut applied = false;
            if ref_i > 0 {
                let shifted = ref_i - 1;
                let dz2 = wx * wx + wy * wy;
                let l2dz = if dz2 > 0.0 {
                    0.5 * dz2.log2()
                } else {
                    f64::NEG_INFINITY
                };
                for d in dir.iter().rev() {
                    let skip = d.skip as usize;
                    if shifted % skip != 0 {
                        continue;
                    }
                    let slot = shifted / skip;
                    if slot >= d.count as usize || ref_i + skip > max_iter {
                        continue;
                    }
                    let e = &side[d.offset as usize + slot];
                    if !(l2dz < e.r_log2 as f64) {
                        continue;
                    }
                    // Apply with the tagged tier (CPU referee evaluators).
                    let li = levels.iter().position(|l| l.skip == skip).unwrap();
                    let blk = &levels[li].blocks[slot];
                    let zfe = CFe::from_c(wx, wy);
                    let cfe = CFe::from_c(dc.0, dc.1);
                    let tag = e.tag as usize;
                    let phi = match tag {
                        TIER_AFFINE => blk.m.a.mul(zfe).add(blk.m.b.mul(cfe)),
                        TIER_PADE => {
                            let mut m = blk.m;
                            m.ap = CFe::ZERO;
                            m.dp = CFe::ZERO;
                            m.f = CFe::ZERO;
                            crate::mobius::mobius_apply(&m, zfe, cfe).0
                        }
                        TIER_CPLUS => crate::mobius::mobius_apply(&blk.m, zfe, cfe).0,
                        _ => unified_eval_jet3(blk, zfe, cfe),
                    };
                    let (nx, ny) = phi.to_f64();
                    let zi = orbit[ref_i + skip];
                    let cz = (zi.0 + nx, zi.1 + ny);
                    if skip > 1 && cz.0 * cz.0 + cz.1 * cz.1 > 4.0 {
                        continue;
                    }
                    wx = nx;
                    wy = ny;
                    ref_i += skip;
                    iter += skip;
                    tier_apps[tag] += 1;
                    skipped += skip;
                    applied = true;
                    break;
                }
            }
            if !applied {
                let (zx, zy) = orbit[ref_i];
                let m2 = (2.0 * (zx * wx - zy * wy), 2.0 * (zx * wy + zy * wx));
                let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
                wx = m2.0 + sq.0 + dc.0;
                wy = m2.1 + sq.1 + dc.1;
                ref_i += 1;
                iter += 1;
            }
            let fz = (orbit[ref_i].0 + wx, orbit[ref_i].1 + wy);
            if fz.0 * fz.0 + fz.1 * fz.1 > 4.0 {
                break;
            }
        }
        println!(
            "dispatch mirror: iters {} of {}, tier apps {:?}, iterations skipped by blocks {}",
            iter, max_iter, tier_apps, skipped
        );
    }

    #[test]
    fn periodic_diagnostic_reports_lightweight_dormant_reasons() {
        assert_eq!(PeriodicBuildStatus::Pending.code(), 0);
        assert_eq!(PeriodicBuildStatus::Active.code(), 1);
        assert_eq!(PeriodicBuildStatus::OrbitTooShort.code(), 2);
        assert_eq!(PeriodicBuildStatus::NoConvergedPeriod.code(), 3);
        assert_eq!(PeriodicBuildStatus::PeriodTooLarge.code(), 4);
        assert_eq!(PeriodicBuildStatus::CertificateRejected.code(), 5);

        let short: Vec<(f64, f64)> = (0..255)
            .map(|i| if i == 0 { (0.0, 0.0) } else { (i as f64, 1.0) })
            .collect();
        let out = periodic_build_diagnostic(&short, 1e-3, -20.0);
        assert_eq!(out.status, PeriodicBuildStatus::OrbitTooShort);
        assert_eq!(out.detected_period, 0);
        assert!(out.block.is_none());

        let mut one_cycle: Vec<(f64, f64)> = (0..100).map(|i| (i as f64, i as f64 + 1.0)).collect();
        one_cycle[0] = (0.0, 0.0);
        one_cycle[37] = (0.0, 0.0);
        let out = periodic_build_diagnostic(&one_cycle, 1e-3, -20.0);
        assert_eq!(out.status, PeriodicBuildStatus::OrbitTooShort);
        assert_eq!(out.detected_period, 37);

        let p_above_cap = PERIODIC_MAX_P + 88;
        let mut large_nucleus: Vec<(f64, f64)> = (0..=p_above_cap)
            .map(|i| (i as f64, i as f64 + 1.0))
            .collect();
        large_nucleus[0] = (0.0, 0.0);
        large_nucleus[p_above_cap] = (0.0, 0.0);
        let out = periodic_build_diagnostic(&large_nucleus, 1e-3, -20.0);
        assert_eq!(out.status, PeriodicBuildStatus::PeriodTooLarge);
        assert_eq!(out.detected_period, p_above_cap);

        let aperiodic: Vec<(f64, f64)> = (0..1024).map(|i| (i as f64, (i * i) as f64)).collect();
        let out = periodic_build_diagnostic(&aperiodic, 1e-3, -20.0);
        assert_eq!(out.status, PeriodicBuildStatus::NoConvergedPeriod);
        assert_eq!(out.detected_period, 0);

        // The tail scan may diagnose a large minibrot period, but must stop
        // before composing its block so the observability path stays cheap.
        let p = p_above_cap;
        let repeated: Vec<(f64, f64)> = (0..(5 * p))
            .map(|i| {
                let phase = (i % p) as f64;
                (phase, phase * 0.25 + 1.0)
            })
            .collect();
        let out = periodic_build_diagnostic(&repeated, 1e-3, -20.0);
        assert_eq!(out.status, PeriodicBuildStatus::PeriodTooLarge);
        assert_eq!(out.detected_period, p);
        assert!(out.block.is_none());
    }

    #[test]
    fn periodic_interior_model_matches_cycle_multiplier() {
        // CPU model check for the dormant Phase-E path. On the period-2 disk reference
        // C = −1 + 0.1i: detection finds p = 2; the composed block's fixed-
        // Möbius multiplier κ(dc) matches the ANALYTIC cycle multiplier
        // 4·(c + 1) of the pixel's own cycle (findings §17 measured |κ| =
        // 0.4000 here); and the w-conjugated closed form κ^k predicts k
        // periods of block iteration with k-INDEPENDENT error (contraction).
        let eps = 1e-12_f64;
        let c_ref = (-1.0_f64, 0.1_f64);
        let orbit = ref_orbit_f64(c_ref.0, c_ref.1, 4000);
        assert!(orbit.len() > 4000, "reference escaped");
        let c_max = 1e-5_f64;
        let per = periodic_build(&orbit, eps, c_max.log2()).expect("no periodic block");
        assert_eq!(per.p, 2, "period-2 disk must detect p = 2 (got {})", per.p);
        assert!(per.log2_r.is_finite());
        let cm = |a: (f64, f64), b: (f64, f64)| (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0);
        let cdiv = |a: (f64, f64), b: (f64, f64)| {
            let d = b.0 * b.0 + b.1 * b.1;
            ((a.0 * b.0 + a.1 * b.1) / d, (a.1 * b.0 - a.0 * b.1) / d)
        };
        let csqrt = |a: (f64, f64)| {
            let r = (a.0 * a.0 + a.1 * a.1).sqrt();
            let re = (0.5 * (r + a.0)).max(0.0).sqrt();
            let im = (0.5 * (r - a.0)).max(0.0).sqrt();
            (re, if a.1 < 0.0 { -im } else { im })
        };
        for phase in [0.4_f64, 1.7, 3.9] {
            let dc = (c_max * phase.cos(), c_max * phase.sin());
            let a = per.m.a.to_f64();
            let b = per.m.b.to_f64();
            let d = per.m.d.to_f64();
            let ap = per.m.ap.to_f64();
            let dp = per.m.dp.to_f64();
            let fco = per.m.f.to_f64();
            let ae = (a.0 + cm(ap, dc).0, a.1 + cm(ap, dc).1);
            let de = (d.0 + cm(dp, dc).0, d.1 + cm(dp, dc).1);
            let bc = cm(b, dc);
            let fc = cm(fco, dc);
            let one_p_fc = (1.0 + fc.0, fc.1);
            // F-form: den = (1 + Fc) + De·z ⇒ De·z² + (1 + Fc − Ae)·z − Bc = 0.
            let u_m_ae = (one_p_fc.0 - ae.0, one_p_fc.1 - ae.1);
            let disc = {
                let t = cm(u_m_ae, u_m_ae);
                let f = cm(de, bc);
                (t.0 + 4.0 * f.0, t.1 + 4.0 * f.1)
            };
            let sq = csqrt(disc);
            let two_de = (2.0 * de.0, 2.0 * de.1);
            let z1 = cdiv(((-u_m_ae.0) + sq.0, (-u_m_ae.1) + sq.1), two_de);
            let z2 = cdiv(((-u_m_ae.0) - sq.0, (-u_m_ae.1) - sq.1), two_de);
            let kappa = |z: (f64, f64)| {
                // m′ = (Ae·(1+Fc) − Bc·De)/den².
                let num = (
                    cm(ae, one_p_fc).0 - cm(bc, de).0,
                    cm(ae, one_p_fc).1 - cm(bc, de).1,
                );
                let den = (one_p_fc.0 + cm(de, z).0, one_p_fc.1 + cm(de, z).1);
                cdiv(num, cm(den, den))
            };
            let (k1, k2) = (kappa(z1), kappa(z2));
            let (za, ka) = if k1.0 * k1.0 + k1.1 * k1.1 < k2.0 * k2.0 + k2.1 * k2.1 {
                (z1, k1)
            } else {
                (z2, k2)
            };
            // Analytic period-2 multiplier of the PIXEL's cycle: 4·(c + 1).
            let c_px = (c_ref.0 + dc.0, c_ref.1 + dc.1);
            let lam = (4.0 * (c_px.0 + 1.0), 4.0 * c_px.1);
            let err = ((ka.0 - lam.0).powi(2) + (ka.1 - lam.1).powi(2)).sqrt()
                / (lam.0 * lam.0 + lam.1 * lam.1).sqrt();
            assert!(
                err < 1e-6,
                "κ = ({:.6}, {:.6}) vs analytic 4(c+1) = ({:.6}, {:.6}): rel err {:e}",
                ka.0,
                ka.1,
                lam.0,
                lam.1,
                err
            );
            assert!(
                (ka.0 * ka.0 + ka.1 * ka.1).sqrt() < 1.0,
                "disk pixel must be attracting"
            );
            // Mirror the lightweight GPU disk certificate.  This guards the
            // Rust→header metadata contract as well as the proved scalar
            // inequalities used by try_periodic_interior.
            let norm = |z: (f64, f64)| (z.0 * z.0 + z.1 * z.1).sqrt();
            let r = per.log2_r.exp2();
            let mu = norm(one_p_fc) - norm(de) * r;
            assert!(mu > 0.0, "periodic disk reaches the Möbius pole");
            let image_over_r = (norm(ae) * r + norm(bc)) / (mu * r);
            let err_over_r = per.log2_err_over_r.exp2();
            assert!(
                image_over_r + err_over_r < 0.98,
                "runtime invariance margin failed: image/r={:e}, err/r={:e}",
                image_over_r,
                err_over_r,
            );
            // Closed form vs block iteration: k periods, k-independent error.
            let zr = if za == z1 { z2 } else { z1 };
            let delta0 = (za.0 + 1e-7, za.1 - 5e-8);
            let w0 = cdiv(
                (delta0.0 - za.0, delta0.1 - za.1),
                (delta0.0 - zr.0, delta0.1 - zr.1),
            );
            for k in [10usize, 1000] {
                // Iterate the block map exactly (f64 c+ F-form).
                let (mut zx2, mut zy2) = delta0;
                for _ in 0..k {
                    let num = (cm(ae, (zx2, zy2)).0 + bc.0, cm(ae, (zx2, zy2)).1 + bc.1);
                    let den = (
                        one_p_fc.0 + cm(de, (zx2, zy2)).0,
                        one_p_fc.1 + cm(de, (zx2, zy2)).1,
                    );
                    let nz = cdiv(num, den);
                    zx2 = nz.0;
                    zy2 = nz.1;
                }
                // Closed form: w_k = κ^k·w0 → δ_k = (ζa − ζr·w_k)/(1 − w_k).
                let mut wk = w0;
                let mut kp = (1.0_f64, 0.0_f64);
                for _ in 0..k {
                    kp = cm(kp, ka);
                }
                wk = cm(wk, kp);
                let dk = cdiv(
                    (za.0 - cm(zr, wk).0, za.1 - cm(zr, wk).1),
                    (1.0 - wk.0, -wk.1),
                );
                let err_k = ((dk.0 - zx2).powi(2) + (dk.1 - zy2).powi(2)).sqrt();
                assert!(
                    err_k < 1e-9,
                    "closed form vs iteration at k={}: err {:e}",
                    k,
                    err_k
                );
            }
        }
        println!(
            "periodic block: start {} p {} r_log2 {:.1}",
            per.start, per.p, per.log2_r
        );
    }

    #[test]
    fn periodic_runtime_disk_certificate_accepts_gpu_orbit_precision() {
        // Production builds the header from the f32 orbit uploaded to WebGPU,
        // not from the f64 reference used by the analytic test above.
        let orbit: Vec<(f64, f64)> = ref_orbit_f64(-1.0, 0.1, 4000)
            .into_iter()
            .map(|(x, y)| (x as f32 as f64, y as f32 as f64))
            .collect();
        let c_max = 1e-5_f64;
        // Match the frontend's default BLA_LINEARIZATION_EPSILON: the runtime
        // regression must exercise the certificate actually shipped to WGSL.
        let per = periodic_build(&orbit, 1e-3, c_max.log2()).expect("no periodic block");
        assert_eq!(per.p, 2);
        let (header, levels) = unified_serialize_header_only(None, Some(&per));
        assert_eq!(levels.len(), 1);
        assert_eq!(levels[0].offset, 0);
        assert_eq!(levels[0].count, 0);
        assert_eq!(header[5].pad, 2.0, "serialized periodic p");
        assert_eq!(header[9].pad, 0.0, "Möbius invariant certificate kind");
        assert_eq!(
            header[7].pad, per.log2_err_over_r as f32,
            "serialized err/r metadata"
        );
        // Read the exact f32 mantissa/exponent representation consumed by
        // WGSL, rather than retesting the higher-precision builder values.
        let unpack = |entry: &UnifiedRadius| {
            let scale = 2.0_f64.powi(entry.f32_safe as i32);
            (entry.r_log2 as f64 * scale, entry.tag as f64 * scale)
        };
        let a = unpack(&header[4]);
        let b = unpack(&header[5]);
        let d = unpack(&header[6]);
        let ap = unpack(&header[7]);
        let dp = unpack(&header[8]);
        let f = unpack(&header[9]);
        let norm = |z: (f64, f64)| (z.0 * z.0 + z.1 * z.1).sqrt();
        let cm = |a: (f64, f64), b: (f64, f64)| (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0);
        let r = (header[6].pad as f64).exp2();
        let err_over_r = (header[7].pad as f64).exp2();
        for i in 0..64 {
            let phase = core::f64::consts::TAU * i as f64 / 64.0;
            let dc = (
                (c_max * phase.cos()) as f32 as f64,
                (c_max * phase.sin()) as f32 as f64,
            );
            let ae = (a.0 + cm(ap, dc).0, a.1 + cm(ap, dc).1);
            let de = (d.0 + cm(dp, dc).0, d.1 + cm(dp, dc).1);
            let bc = cm(b, dc);
            let fc = cm(f, dc);
            let k = (1.0 + fc.0, fc.1);
            let mu = norm(k) - norm(de) * r;
            assert!(mu > 0.0, "phase {}: pole margin {}", i, mu);
            let image_over_r = (norm(ae) * r + norm(bc)) / (mu * r);
            assert!(
                image_over_r + err_over_r < 0.98,
                "phase {}: room {} + {}",
                i,
                image_over_r,
                err_over_r
            );
        }
    }

    #[test]
    fn periodic_direct_majorant_certifies_superattracting_nucleus() {
        // At c=-1 the period-two multiplier A is exactly zero.  The Möbius
        // extraction must be degenerate, but the grouped exact recurrence has
        // the trapping radius proved in CriticalPeriodic.lean.
        let orbit = ref_orbit_f64(-1.0, 0.0, 1024);
        let c_max = 1e-5_f64;
        let out = periodic_build_diagnostic(&orbit, 1e-3, c_max.log2());
        assert_eq!(out.status, PeriodicBuildStatus::Active);
        let per = out.block.expect("direct periodic certificate missing");
        assert_eq!(per.p, 2);
        assert_eq!(per.kind, PeriodicCertificateKind::DirectMajorant);
        assert!(
            per.m.degenerate,
            "nucleus must exercise the critical fallback"
        );
        assert!(per.log2_r.is_finite());
        assert_eq!(
            orbit[per.start],
            (0.0, 0.0),
            "the lightweight phase choice should certify at the critical point"
        );
        let noncritical_r = periodic_direct_radius(&orbit[1..3], c_max.log2());
        assert!(
            per.log2_r > noncritical_r,
            "critical phase did not improve the certified radius"
        );

        let image = periodic_direct_image_log2(
            &orbit[per.start..per.start + per.p],
            per.log2_r,
            c_max.log2(),
        );
        assert!(
            image - per.log2_r < 0.98_f64.log2(),
            "serialized direct radius is not strictly invariant"
        );
        let (header, _) = unified_serialize_header_only(None, Some(&per));
        assert_eq!(header[5].pad, 2.0);
        assert_eq!(header[9].pad, 1.0, "direct-majorant certificate kind");
    }

    #[test]
    fn periodic_value_certificate_sound_against_exact_walk() {
        // Referee for the enabled Möbius-invariance path: the value-only
        // radius must uphold (V) against the exact p-step walk over the WHOLE
        // certified interval — error ≤ ½ε_int·(|A||δ| + |B||c|) at every
        // sampled |δ| ≤ r down to 0 (the x = 0 gate's promise), not just at
        // the solved crossing. V′ has its own, generally smaller, radius and
        // is intentionally not an interior-verdict hypothesis.
        use crate::mobius::mobius_apply;
        let eps = 1e-12_f64; // build ε; the header certifies at ε_int = 1e-4
        let eps_int = 1e-4_f64;
        let c_ref = (-1.0_f64, 0.1_f64);
        let orbit = ref_orbit_f64(c_ref.0, c_ref.1, 4000);
        let c_max = 1e-5_f64;
        let per = periodic_build(&orbit, eps, c_max.log2()).expect("no periodic block");
        let r = per.log2_r.exp2();
        assert!(r > c_max, "certified radius unusably small: {:e}", r);
        let la = per.m.a.to_f64();
        let la = (la.0 * la.0 + la.1 * la.1).sqrt();
        let lb = per.m.b.to_f64();
        let lb = (lb.0 * lb.0 + lb.1 * lb.1).sqrt();
        for &dm in &[1.0_f64, 0.5, 1.0 / 16.0, 1.0 / 256.0, 0.0] {
            for &dphase in &[0.3_f64, 2.1, 4.4] {
                for &cmm in &[1.0_f64, 0.125, 0.0] {
                    let delta = (r * dm * dphase.cos(), r * dm * dphase.sin());
                    let dc = (
                        c_max * cmm * (dphase + 1.0).cos(),
                        c_max * cmm * (dphase + 1.0).sin(),
                    );
                    // Exact p-step value walk from phase `start`.
                    let mut z = delta;
                    for i in per.start..per.start + per.p {
                        let zr = orbit[i];
                        z = (
                            2.0 * (zr.0 * z.0 - zr.1 * z.1) + z.0 * z.0 - z.1 * z.1 + dc.0,
                            2.0 * (zr.0 * z.1 + zr.1 * z.0) + 2.0 * z.0 * z.1 + dc.1,
                        );
                    }
                    let (phi, _, _) = mobius_apply(
                        &per.m,
                        crate::jet::CFe::from_c(delta.0, delta.1),
                        crate::jet::CFe::from_c(dc.0, dc.1),
                    );
                    let phi = phi.to_f64();
                    let dmag = (delta.0 * delta.0 + delta.1 * delta.1).sqrt();
                    let cmag = (dc.0 * dc.0 + dc.1 * dc.1).sqrt();
                    let verr = ((phi.0 - z.0).powi(2) + (phi.1 - z.1).powi(2)).sqrt();
                    let vbudget = 0.5 * eps_int * (la * dmag + lb * cmag);
                    assert!(
                        verr <= vbudget + 1e-300,
                        "(V) violated at |δ|={:e} |c|={:e}: err {:e} > budget {:e}",
                        dmag,
                        cmag,
                        verr,
                        vbudget
                    );
                }
            }
        }
    }

    #[test]
    fn unified_second_derivative_propagation() {
        // (Phase D, task 5.1) The (z′, z″) block-propagation formulas per tier
        // match exact step-by-step chains through the block:
        //   δ′_c  = m_z·δ_c + m_c
        //   δ′_cc = m_zz·δ_c² + 2·m_zc·δ_c + m_cc + m_z·δ_cc
        // with the rational second partials (F-form, den = 1 + De·z + F·c,
        // ∂den/∂c = D′·z + F): m_zz = −2·De·m_z/den,
        // m_cc = −2·(D′·z + F)·m_c/den,
        // m_zc = (A′ − m_c·De − m·D′)/den − m_z·(D′·z + F)/den
        // (affine: all zero; jet: polynomial rows). Exact chain per step:
        // δ_c ← (2Z + 2δ)·δ_c + 1, δ_cc ← 2·δ_c² + (2Z + 2δ)·δ_cc.
        let cm = |a: (f64, f64), b: (f64, f64)| (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0);
        let cdiv = |a: (f64, f64), b: (f64, f64)| {
            let d = b.0 * b.0 + b.1 * b.1;
            ((a.0 * b.0 + a.1 * b.1) / d, (a.1 * b.0 - a.0 * b.1) / d)
        };
        let cadd = |a: (f64, f64), b: (f64, f64)| (a.0 + b.0, a.1 + b.1);
        let csub = |a: (f64, f64), b: (f64, f64)| (a.0 - b.0, a.1 - b.1);
        let eps = 1e-12_f64;
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 1024);
            assert!(orbit.len() > 1024, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 1 << 18);
            let c_max = 1e-9_f64;
            let rad = unified_build_radii(&levels, &orbit, eps, c_max);
            let mut checked = 0usize;
            for (li, lvl) in levels.iter().enumerate() {
                if lvl.skip < 4 {
                    continue;
                }
                for sidx in (0..lvl.blocks.len()).step_by(11) {
                    let blk = &lvl.blocks[sidx];
                    if blk.m.degenerate {
                        continue;
                    }
                    let first = 1 + sidx * lvl.skip;
                    for tier in 0..4usize {
                        let r = rad.tiers[li][sidx][tier];
                        if !r.is_finite() {
                            continue;
                        }
                        // Sample WELL below r: this test referees the (z′, z″)
                        // propagation FORMULAS (a wrong formula errs O(1)),
                        // not the tier's remainder. z″ is a best-effort
                        // payload — (V)/(V′) certify value and z′ only — and
                        // the [2/1] radii are large enough that the
                        // uncertified z″ REST term shows at r − 1 (~1e-4
                        // relative on near-critical seahorse blocks).
                        let x = (r - 4.0).exp2();
                        if !(x.is_finite() && x > 0.0) {
                            continue;
                        }
                        let z0 = (x * 0.6, -x * 0.5);
                        let c = (c_max * 0.8, c_max * 0.3);
                        // Seeds: nontrivial first/second derivative state.
                        let d0 = (1.3_f64, 0.2_f64);
                        let s0 = (0.4_f64, -0.7_f64);
                        // Exact chains through the block steps.
                        let (mut w, mut dw, mut sw) = (z0, d0, s0);
                        for j in first..first + lvl.skip {
                            let zr = orbit[j];
                            let m2 = (2.0 * (zr.0 + w.0), 2.0 * (zr.1 + w.1));
                            let ndw = cadd(cm(m2, dw), (1.0, 0.0));
                            let nsw = cadd(cm((2.0, 0.0), cm(dw, dw)), cm(m2, sw));
                            let nw = cadd(cadd(cm((2.0, 0.0), cm(zr, w)), cm(w, w)), c);
                            w = nw;
                            dw = ndw;
                            sw = nsw;
                        }
                        // Tier formulas.
                        let a = blk.m.a.to_f64();
                        let b = blk.m.b.to_f64();
                        let d = blk.m.d.to_f64();
                        let ap = blk.m.ap.to_f64();
                        let dp = blk.m.dp.to_f64();
                        let (m_v, m_z, m_c, m_zz, m_zc, m_cc);
                        if tier == TIER_JET {
                            let a20 = blk.a20().to_f64();
                            let a11 = blk.a11().to_f64();
                            let a21 = blk.a21().to_f64();
                            let a02 = blk.a02().to_f64();
                            let a30 = blk.a30().to_f64();
                            let a12 = blk.a12.to_f64();
                            let a03 = blk.a03.to_f64();
                            let c2 = cm(c, c);
                            let p0 = cadd(cadd(cm(b, c), cm(a02, c2)), cm(cm(a03, c2), c));
                            let p1 = cadd(cadd(a, cm(a11, c)), cm(a12, c2));
                            let p2 = cadd(a20, cm(a21, c));
                            m_v = cadd(p0, cm(z0, cadd(p1, cm(z0, cadd(p2, cm(z0, a30))))));
                            m_z = cadd(
                                p1,
                                cm(z0, cadd(cm((2.0, 0.0), p2), cm(z0, cm((3.0, 0.0), a30)))),
                            );
                            let q0 = cadd(
                                cadd(b, cm((2.0, 0.0), cm(a02, c))),
                                cm((3.0, 0.0), cm(a03, c2)),
                            );
                            let q1 = cadd(a11, cm((2.0, 0.0), cm(a12, c)));
                            m_c = cadd(q0, cm(z0, cadd(q1, cm(z0, a21))));
                            m_zz = cadd(cm((2.0, 0.0), p2), cm((6.0, 0.0), cm(a30, z0)));
                            m_zc = cadd(q1, cm((2.0, 0.0), cm(a21, z0)));
                            m_cc = cadd(
                                cadd(cm((2.0, 0.0), a02), cm((6.0, 0.0), cm(a03, c))),
                                cm((2.0, 0.0), cm(a12, z0)),
                            );
                        } else {
                            let (apx, dpx, fx) = if tier == TIER_CPLUS {
                                (ap, dp, blk.m.f.to_f64())
                            } else {
                                ((0.0, 0.0), (0.0, 0.0), (0.0, 0.0))
                            };
                            let ax = if tier == TIER_AFFINE { a } else { a };
                            let dx2 = if tier == TIER_AFFINE { (0.0, 0.0) } else { d };
                            // Both rational tiers carry the [2/1] numerator
                            // slot N₂ (the Padé tier is the plain view of the
                            // same extraction); affine has none.
                            let n2x = if tier == TIER_AFFINE {
                                (0.0, 0.0)
                            } else {
                                blk.m.n2.to_f64()
                            };
                            let ae = cadd(ax, cm(apx, c));
                            let de = cadd(dx2, cm(dpx, c));
                            let bc = cm(b, c);
                            // [2/1] F-form: num = (N₂·z + Ae)·z + Bc,
                            // den = 1 + De·z + F·c; ∂den/∂c = D'·z + F.
                            let den = cadd(cadd((1.0, 0.0), cm(de, z0)), cm(fx, c));
                            let dcden = cadd(cm(dpx, z0), fx);
                            m_v = cdiv(cadd(cm(cadd(cm(n2x, z0), ae), z0), bc), den);
                            m_z = cdiv(
                                csub(cadd(cm((2.0, 0.0), cm(n2x, z0)), ae), cm(m_v, de)),
                                den,
                            );
                            m_c = cdiv(csub(cadd(cm(apx, z0), b), cm(m_v, dcden)), den);
                            // m_zz = (2·N₂ − 2·De·m_z)/den.
                            m_zz = cdiv(cm((2.0, 0.0), csub(n2x, cm(de, m_z))), den);
                            m_cc = cm((-2.0, 0.0), cdiv(cm(dcden, m_c), den));
                            m_zc = csub(
                                cdiv(csub(csub(apx, cm(m_c, de)), cm(m_v, dpx)), den),
                                cdiv(cm(m_z, dcden), den),
                            );
                        }
                        let pd = cadd(cm(m_z, d0), m_c);
                        let ps = cadd(
                            cadd(cm(m_zz, cm(d0, d0)), cm((2.0, 0.0), cm(m_zc, d0))),
                            cadd(m_cc, cm(m_z, s0)),
                        );
                        let scale_d = (dw.0 * dw.0 + dw.1 * dw.1).sqrt().max(1e-300);
                        let scale_s = (sw.0 * sw.0 + sw.1 * sw.1).sqrt().max(1e-300);
                        let ed = ((pd.0 - dw.0).powi(2) + (pd.1 - dw.1).powi(2)).sqrt() / scale_d;
                        let es = ((ps.0 - sw.0).powi(2) + (ps.1 - sw.1).powi(2)).sqrt() / scale_s;
                        checked += 1;
                        assert!(
                            ed < 1e-6,
                            "[{} l{} s{} t{}] z' propagation off by {:e}",
                            name,
                            li,
                            sidx,
                            tier,
                            ed
                        );
                        // z″ is uncertified REST territory — (V)/(V′) cover
                        // value and z′ only — and the [2/1] radii are wide
                        // enough that its remainder shows ~1e-5 relative even
                        // at r − 4. A FORMULA error would be O(1) (the m_zz
                        // [2/1] form is verified by finite differences).
                        assert!(
                            es < 1e-3,
                            "[{} l{} s{} t{}] z'' propagation off by {:e}",
                            name,
                            li,
                            sidx,
                            tier,
                            es
                        );
                    }
                }
            }
            println!(
                "[{}] second-derivative propagation samples: {}",
                name, checked
            );
            assert!(checked > 40, "[{}] too few samples", name);
        }
    }

    #[test]
    fn unified_tiers_match_standalone_builds() {
        // (task 2.1) Tier-coefficient parity: the unified record's prefixes
        // equal the standalone extraction (the full 7-coefficient [2/1] c+
        // F-form shared with the standalone mobius mode — `mobius_from_jet_k2`
        // since the round-7 adoption; the Padé tier is its plain view, sharing
        // A/B/D/N₂ by construction), and the order-3 jet-tier evaluation from
        // the record matches jet_eval(·, 3) on sample points to fp round-off.
        let orbit = ref_orbit_f64(-1.401155, 0.0, 512);
        assert!(orbit.len() > 512, "reference escaped");
        let unified = build_unified_levels(&orbit, 1 << 10);
        let cplus = crate::mobius::mobius_build_levels(&orbit, 1 << 10);
        assert_eq!(unified.len(), cplus.len(), "scaffold mismatch");
        // Rebuild the jets once more to compare evaluations (streaming, level
        // by level, same shape as the builder).
        let mut jets: Vec<JetF64> = (1..orbit.len())
            .map(|i| jet_seed(orbit[i].0, orbit[i].1))
            .collect();
        for (li, (ul, cl)) in unified.iter().zip(cplus.iter()).enumerate() {
            assert_eq!(ul.skip, cl.skip);
            if ul.skip < MOBIUS_MIN_EMIT_SKIP {
                // Sub-emit levels are deliberately empty in the unified build
                // (never serialized/dispatched — dead bounds/radii work);
                // advance the streaming jets and move on.
                assert!(ul.blocks.is_empty(), "sub-emit level not empty");
                if jets.len() >= 2 {
                    jets = (0..jets.len() / 2)
                        .map(|i| jet_compose(&jets[2 * i], &jets[2 * i + 1]))
                        .collect();
                }
                continue;
            }
            assert_eq!(ul.blocks.len(), cl.blocks.len());
            for (s, (ub, cb)) in ul.blocks.iter().zip(cl.blocks.iter()).enumerate() {
                // Full 7-coefficient parity with the standalone c+ build (one
                // shared extraction: `mobius_from_jet_k2`).
                for (what, got, want) in [
                    ("A", &ub.m.a, &cb.m.a),
                    ("B", &ub.m.b, &cb.m.b),
                    ("D", &ub.m.d, &cb.m.d),
                    ("N2", &ub.m.n2, &cb.m.n2),
                    ("A'", &ub.m.ap, &cb.m.ap),
                    ("D'", &ub.m.dp, &cb.m.dp),
                    ("F", &ub.m.f, &cb.m.f),
                ] {
                    assert!(
                        rel_err(*got, *want) < 1e-15,
                        "level {} slot {}: {} differs from c+ build",
                        li,
                        s,
                        what
                    );
                }
                // Plain (Padé) tier = the record's own plain view: A/B/D/N₂
                // shared by construction (nothing external to referee).
                // Jet-tier evaluation parity on sample entries (the a₃₀
                // reconstruction needs the [2/1] extraction live: c₂₀ ≠ 0).
                if !ub.m.degenerate && !jets[s].coeff(2, 0).is_zero() {
                    for (zx, zy, cx2, cy2) in [
                        (1e-6_f64, -2e-6_f64, 1e-9_f64, 3e-10_f64),
                        (3e-4, 1e-4, -1e-7, 2e-8),
                    ] {
                        let z = CFe::from_c(zx, zy);
                        let c = CFe::from_c(cx2, cy2);
                        let got = unified_eval_jet3(ub, z, c);
                        let want = jet_eval(&jets[s], z, c, 3);
                        let e = rel_err(got, want);
                        assert!(
                            e < 1e-11,
                            "level {} slot {}: jet3 eval off by {:e}",
                            li,
                            s,
                            e
                        );
                    }
                }
            }
            // Advance the streaming jets to the next level.
            if jets.len() >= 2 {
                jets = (0..jets.len() / 2)
                    .map(|i| jet_compose(&jets[2 * i], &jets[2 * i + 1]))
                    .collect();
            }
        }
    }
}

#[cfg(test)]
mod probe_tests {
    use super::*;

    fn probe_orbit(cx: f64, cy: f64, max_iter: usize) -> Vec<(f64, f64)> {
        let mut out = Vec::with_capacity(max_iter + 1);
        let (mut zx, mut zy) = (0.0_f64, 0.0_f64);
        out.push((zx, zy));
        for _ in 0..max_iter {
            let nx = zx * zx - zy * zy + cx;
            let ny = 2.0 * zx * zy + cy;
            zx = nx;
            zy = ny;
            if zx * zx + zy * zy > 16.0 {
                break;
            }
            out.push((zx, zy));
        }
        out
    }

    #[test]
    #[ignore] // temporary field probe
    fn interior_radii_breakdown_probe() {
        use std::time::Instant;
        let orbit = probe_orbit(-1.0, 0.1, 33220);
        let l2c = ((2.06e-5_f64 * 1.01).log2() * 2.0).ceil() * 0.5;
        let eps = 1e-3_f64;
        let levels = build_unified_levels(&orbit, 1 << 18);
        let bounds = unified_build_bounds(&levels, &orbit, l2c);
        let mlv = to_mobius_levels(&levels, false);
        let plv = to_mobius_levels(&levels, true);
        let t = Instant::now();
        let _r_cv = mobius_build_radii(&mlv, &bounds.cplus, eps, l2c);
        let t_cv = t.elapsed();
        let t = Instant::now();
        let _r_pv = mobius_build_radii(&plv, &bounds.plain, eps, l2c);
        let t_pv = t.elapsed();
        let t = Instant::now();
        let _rd_cv = mobius_build_derivative_radii(&mlv, &bounds.cplus, eps, l2c, None);
        let t_dcv = t.elapsed();
        let t = Instant::now();
        let _rd_pv = mobius_build_derivative_radii(&plv, &bounds.plain, eps, l2c, None);
        let t_dpv = t.elapsed();
        let t = Instant::now();
        let mut acc = 0.0f64;
        for (li, lvl) in levels.iter().enumerate() {
            for s in 0..lvl.blocks.len() {
                let rj = jet_solve_radii(&bounds.jet[li][s], eps, l2c);
                acc += rj[0];
            }
        }
        let t_jet = t.elapsed();
        let t = Instant::now();
        for lvl in levels.iter() {
            for (blk, md) in lvl.blocks.iter().zip(lvl.moduli.iter()) {
                let plain_m = {
                    let mut m = blk.m;
                    m.ap = CFe::ZERO;
                    m.dp = CFe::ZERO;
                    m.f = CFe::ZERO;
                    m
                };
                acc += closed_form_radius(&plain_m, &md.log2_q_plain, eps, l2c);
                acc += closed_form_radius(&blk.m, &md.log2_q_cplus, eps, l2c);
            }
        }
        let t_cf = t.elapsed();
        let t = Instant::now();
        for lvl in levels.iter() {
            for (blk, md) in lvl.blocks.iter().zip(lvl.moduli.iter()) {
                let plain_m = {
                    let mut m = blk.m;
                    m.ap = CFe::ZERO;
                    m.dp = CFe::ZERO;
                    m.f = CFe::ZERO;
                    m
                };
                acc += derivative_radius(&plain_m, &md.log2_a, eps, l2c, false);
                acc += derivative_radius(&blk.m, &md.log2_a, eps, l2c, false);
            }
        }
        let t_dr = t.elapsed();
        println!(
            "PROBE radii breakdown: mobius V cplus {:?} plain {:?} | V' cplus {:?} plain {:?} | jet {:?} | cf-oracle {:?} | aff/jet V' {:?} (acc {:.1})",
            t_cv, t_pv, t_dcv, t_dpv, t_jet, t_cf, t_dr, acc
        );
    }

    #[test]
    #[ignore] // temporary field probe
    fn interior_build_cost_probe() {
        use std::time::Instant;
        let orbit = probe_orbit(-1.0, 0.1, 33220);
        let l2c = ((2.06e-5_f64 * 1.01).log2() * 2.0).ceil() * 0.5;
        let eps = 1e-3_f64;
        let t0 = Instant::now();
        let levels = build_unified_levels(&orbit, 1 << 18);
        let t_lv = t0.elapsed();
        let t1 = Instant::now();
        let bounds = unified_build_bounds(&levels, &orbit, l2c);
        let t_b = t1.elapsed();
        let t2 = Instant::now();
        let radii = unified_solve_radii(&levels, &bounds, eps, l2c);
        let t_r = t2.elapsed();
        let mut sat: Vec<(usize, usize)> = Vec::new();
        for (li, lvl) in levels.iter().enumerate() {
            let _ = li;
            if lvl.skip < crate::mobius::MOBIUS_MIN_EMIT_SKIP {
                continue;
            }
            for (s, t) in radii.tiers[li].iter().enumerate() {
                if t.iter().all(|r| !r.is_finite()) {
                    let first = 1 + s * lvl.skip;
                    sat.push((first, first + lvl.skip));
                }
            }
        }
        let t3 = Instant::now();
        let gates = if !sat.is_empty() {
            crate::gates::build_gates(&orbit, (-1.0, 0.1), l2c, eps, &sat)
        } else {
            Vec::new()
        };
        let t_g = t3.elapsed();
        println!(
            "PROBE interior build: levels {:?} bounds {:?} radii {:?} | dead spans {} | gates {:?} -> {} gates",
            t_lv, t_b, t_r, sat.len(), t_g, gates.len()
        );
    }
}
