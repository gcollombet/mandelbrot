//! CPU proof model for viewport-independent, per-pixel block validity.
//!
//! These are deliberately f64 build-side types. The natural 36-word GPU
//! format and its directed f32 conversion are a separate boundary: proof
//! derivation must not silently inherit storage rounding or layout limits.
//! It intentionally exposes that the uncompressed representation misses the
//! 24-word rollout gate; task 9.4 must compact it before production rollout.

use crate::jet::{JET_MONOMIALS, JET_NCOEFF};

/// The first rollout may retain at most two independently sound Cauchy domains
/// for one tier. Runtime validity takes the best radius certified by either.
pub const MAX_CAUCHY_CANDIDATES: usize = 2;

/// Explicit serialized/build-side dead sentinel. A dead limit never accepts,
/// including the mathematical `log2(0) = -infinity` boundary.
pub const DEAD_LOG2: f64 = f64::NEG_INFINITY;

/// A logarithmic upper limit with explicit dead and unbounded states.
///
/// `-infinity` is dead rather than a finite zero-radius certificate;
/// `+infinity` means that this particular constraint is absent.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Log2Limit(pub f64);

impl Log2Limit {
    pub const DEAD: Self = Self(DEAD_LOG2);
    pub const UNBOUNDED: Self = Self(f64::INFINITY);

    pub fn finite(value: f64) -> Option<Self> {
        value.is_finite().then_some(Self(value))
    }

    pub fn is_dead(self) -> bool {
        self.0 == f64::NEG_INFINITY
    }

    pub fn accepts(self, log2_value: f64) -> bool {
        !self.is_dead() && !log2_value.is_nan() && log2_value <= self.0
    }
}

/// One proof inequality in lower-envelope form:
///
/// `log2(|dz|) <= intercept + dc_slope * log2(|dc|)`.
///
/// Derivation stores `dc_slope = -j/i`, so it is non-positive. Keeping the
/// slope explicit makes every emitted line traceable to its `(i, j)` term and
/// lets dominance pruning operate before the global-slope GPU encoding.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ValidityLine {
    pub intercept: f64,
    pub dc_slope: f64,
}

impl ValidityLine {
    pub const DEAD: Self = Self {
        intercept: DEAD_LOG2,
        dc_slope: 0.0,
    };

    pub fn new(intercept: f64, dc_slope: f64) -> Option<Self> {
        (intercept.is_finite() && dc_slope.is_finite() && dc_slope <= 0.0).then_some(Self {
            intercept,
            dc_slope,
        })
    }

    pub fn is_dead(self) -> bool {
        self.intercept == DEAD_LOG2
    }

    pub fn radius_log2(self, log2_dc: f64) -> f64 {
        if self.is_dead() || log2_dc.is_nan() {
            DEAD_LOG2
        } else if log2_dc == f64::NEG_INFINITY {
            if self.dc_slope == 0.0 {
                self.intercept
            } else {
                f64::INFINITY
            }
        } else {
            self.intercept + self.dc_slope * log2_dc
        }
    }
}

/// A conservative lower envelope. An empty vector is unbounded by this proof
/// channel; an explicit dead line kills it. Derivation stages keep value and
/// derivative channels separate until their final intersection.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct RadiusLineEnvelope {
    pub lines: Vec<ValidityLine>,
}

impl RadiusLineEnvelope {
    pub fn dead() -> Self {
        Self {
            lines: vec![ValidityLine::DEAD],
        }
    }

    pub fn radius_log2(&self, log2_dc: f64) -> f64 {
        self.lines.iter().fold(f64::INFINITY, |radius, line| {
            radius.min(line.radius_log2(log2_dc))
        })
    }

    pub fn is_dead(&self) -> bool {
        self.lines.iter().any(|line| line.is_dead())
    }
}

/// Value and derivative certificates are both mandatory even when derivative
/// shading is currently hidden. The effective radius is their intersection.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct CombinedRadiusEnvelope {
    pub value: RadiusLineEnvelope,
    pub derivative: RadiusLineEnvelope,
}

impl CombinedRadiusEnvelope {
    pub fn dead() -> Self {
        Self {
            value: RadiusLineEnvelope::dead(),
            derivative: RadiusLineEnvelope::dead(),
        }
    }

    pub fn radius_log2(&self, log2_dc: f64) -> f64 {
        self.value
            .radius_log2(log2_dc)
            .min(self.derivative.radius_log2(log2_dc))
    }

    pub fn is_dead(&self) -> bool {
        self.value.is_dead() || self.derivative.is_dead()
    }
}

/// Dynamic pure-c gate. It is checked independently of `|dz|`, including at
/// `dz = 0`, so a failed c-only remainder can never be hidden by a live line.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PureCThreshold {
    pub max_log2_dc: Log2Limit,
}

impl PureCThreshold {
    pub const DEAD: Self = Self {
        max_log2_dc: Log2Limit::DEAD,
    };
    pub const UNBOUNDED: Self = Self {
        max_log2_dc: Log2Limit::UNBOUNDED,
    };

    pub fn accepts(self, log2_dc: f64) -> bool {
        self.max_log2_dc.accepts(log2_dc)
    }
}

/// Static parameter-domain ceiling inherited from the reference lifetime and
/// the Cauchy polydisc, never from the instantaneous viewport `c_max`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct StaticDcCeiling {
    pub max_log2_dc: Log2Limit,
}

impl StaticDcCeiling {
    pub const DEAD: Self = Self {
        max_log2_dc: Log2Limit::DEAD,
    };
    pub const UNBOUNDED: Self = Self {
        max_log2_dc: Log2Limit::UNBOUNDED,
    };

    pub fn accepts(self, log2_dc: f64) -> bool {
        self.max_log2_dc.accepts(log2_dc)
    }
}

/// Denominator safety data for Padé/Möbius tiers. The later derivation fills
/// these coefficient moduli and the required positive denominator margin;
/// polynomial tiers retain `UNBOUNDED` limits and a zero margin.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum RationalPoleEnvelope {
    /// Polynomial affine/Jet tiers perform no division.
    NotApplicable,
    /// Degenerate extraction or an already exhausted denominator budget.
    Dead,
    /// `-infinity` coefficient moduli are valid zeros here, hence this is an
    /// enum rather than reusing the `Log2Limit` dead-sentinel semantics.
    Constraint {
        log2_d: f64,
        log2_dp: f64,
        log2_f: f64,
        min_denominator: f64,
    },
}

impl RationalPoleEnvelope {
    pub fn is_dead(self) -> bool {
        matches!(self, Self::Dead)
    }
}

/// One independently sound static Cauchy domain. The dynamic tier may take
/// the maximum radius over live candidates because each candidate intersects
/// its own domain ceilings and value/derivative tail certificate first.
#[derive(Clone, Debug, PartialEq)]
pub struct CauchyCandidateEnvelope {
    pub source_index: u8,
    pub dc: StaticDcCeiling,
    pub max_log2_dz: Log2Limit,
    pub tail: CombinedRadiusEnvelope,
}

impl CauchyCandidateEnvelope {
    pub fn dead() -> Self {
        Self {
            source_index: u8::MAX,
            dc: StaticDcCeiling::DEAD,
            max_log2_dz: Log2Limit::DEAD,
            tail: CombinedRadiusEnvelope::dead(),
        }
    }

    pub fn is_dead(&self) -> bool {
        self.dc.max_log2_dc.is_dead() || self.max_log2_dz.is_dead() || self.tail.is_dead()
    }

    pub fn radius_log2(&self, log2_dc: f64) -> f64 {
        if self.is_dead() || !self.dc.accepts(log2_dc) {
            DEAD_LOG2
        } else {
            self.max_log2_dz.0.min(self.tail.radius_log2(log2_dc))
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CauchySource {
    pub log2_rz: f64,
    pub log2_rc: f64,
    pub log2_m: f64,
    /// Pure-c-axis majorant. The rational bounds use their joint `M_Q` here;
    /// Jet candidates provide the tighter dedicated `M_c`.
    pub log2_mc: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CauchyTierContext {
    pub log2_a10: f64,
    pub log2_b: f64,
    pub epsilon: f64,
    pub rational: Option<RationalDerivativeFactors>,
}

fn log2_cauchy_value_factor(log2_theta: f64) -> f64 {
    let theta = log2_theta.exp2();
    let n = (crate::jet::JET_DS + 1) as f64;
    (n - 1.0) * log2_theta + ((n - (n - 1.0) * theta) / (1.0 - theta).powi(2)).log2()
}

fn log2_cauchy_derivative_factor(log2_theta: f64) -> f64 {
    let theta = log2_theta.exp2();
    let n = (crate::jet::JET_DS + 1) as f64;
    let numerator =
        n * (n + 1.0) - 2.0 * (n + 1.0) * (n - 1.0) * theta + n * (n - 1.0) * theta * theta;
    (n - 1.0) * log2_theta + (numerator / (2.0 * (1.0 - theta).powi(3))).log2()
}

fn log2_cauchy_total_factor(log2_theta: f64) -> f64 {
    let theta = log2_theta.exp2();
    let n = (crate::jet::JET_DS + 1) as f64;
    n * log2_theta + (((n + 1.0) - n * theta) / (1.0 - theta).powi(2)).log2()
}

fn log2_cauchy_pure_c_relative_factor(log2_theta: f64) -> f64 {
    let theta = log2_theta.exp2();
    let n = (crate::jet::JET_DS + 1) as f64;
    (n - 1.0) * log2_theta - (1.0 - theta).log2()
}

fn solve_log2_theta(rhs: f64, bound: impl Fn(f64) -> f64) -> f64 {
    const FLOOR: f64 = -160.0;
    const THETA_MAX: f64 = -1.0;
    if !rhs.is_finite() {
        return DEAD_LOG2;
    }
    if bound(THETA_MAX) <= rhs {
        return THETA_MAX;
    }
    if bound(FLOOR) > rhs {
        return DEAD_LOG2;
    }
    let mut lo = FLOOR;
    let mut hi = THETA_MAX;
    for _ in 0..64 {
        let mid = 0.5 * (lo + hi);
        if bound(mid) <= rhs {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    lo
}

/// Convert one existing majorant polydisc into an independently sound static
/// candidate. All tail factors are bounded on `theta <= 1/2`; the resulting
/// value/derivative caps are emitted as slope-zero validity lines, while the
/// same theta caps and the pure-c tail constrain the static dc ceiling.
pub fn compile_cauchy_candidate(
    source_index: u8,
    source: CauchySource,
    context: CauchyTierContext,
) -> CauchyCandidateEnvelope {
    if !source.log2_rz.is_finite()
        || !source.log2_rc.is_finite()
        || !source.log2_m.is_finite()
        || !source.log2_mc.is_finite()
        || !context.log2_a10.is_finite()
        || !context.log2_b.is_finite()
        || !(context.epsilon > 0.0 && context.epsilon.is_finite())
    {
        return CauchyCandidateEnvelope::dead();
    }
    let log2_tail_budget = context.epsilon.log2() - 2.0;
    let rational_value_amp = if context.rational.is_some() {
        (4.0f64 / 3.0).log2()
    } else {
        0.0
    };
    let value_rhs = log2_tail_budget + context.log2_a10;
    let value_theta = solve_log2_theta(value_rhs, |theta| {
        source.log2_m - source.log2_rz + rational_value_amp + log2_cauchy_value_factor(theta)
    });

    let derivative_theta_qz = solve_log2_theta(value_rhs, |theta| {
        source.log2_m - source.log2_rz + rational_value_amp + log2_cauchy_derivative_factor(theta)
    });
    let derivative_theta = if let Some(factors) = context.rational {
        // Bound |D + D'c| over the full static theta<=1/2 rung, then solve the
        // Q/DEN² correction independently. Zero D/D' makes it disappear.
        let log2_de = match (factors.log2_d.is_finite(), factors.log2_dp.is_finite()) {
            (false, false) => f64::NEG_INFINITY,
            (true, false) => factors.log2_d,
            (false, true) => factors.log2_dp + source.log2_rc - 1.0,
            (true, true) => {
                let a = factors.log2_d;
                let b = factors.log2_dp + source.log2_rc - 1.0;
                let hi = a.max(b);
                hi + (1.0 + (a.min(b) - hi).exp2()).log2()
            }
        };
        if log2_de.is_finite() {
            let correction_theta = solve_log2_theta(value_rhs, |theta| {
                source.log2_m + log2_de + (16.0f64 / 9.0).log2() + log2_cauchy_total_factor(theta)
            });
            derivative_theta_qz.min(correction_theta)
        } else {
            derivative_theta_qz
        }
    } else {
        derivative_theta_qz
    };
    let pure_c_rhs = log2_tail_budget + context.log2_b;
    let pure_c_theta = solve_log2_theta(pure_c_rhs, |theta| {
        source.log2_mc - source.log2_rc
            + rational_value_amp
            + log2_cauchy_pure_c_relative_factor(theta)
    });
    if value_theta == DEAD_LOG2 || derivative_theta == DEAD_LOG2 || pure_c_theta == DEAD_LOG2 {
        return CauchyCandidateEnvelope::dead();
    }

    let domain_theta = value_theta
        .min(derivative_theta)
        .min(pure_c_theta)
        .min(-1.0);
    CauchyCandidateEnvelope {
        source_index,
        dc: StaticDcCeiling {
            max_log2_dc: Log2Limit(source.log2_rc + domain_theta),
        },
        max_log2_dz: Log2Limit(source.log2_rz - 1.0),
        tail: CombinedRadiusEnvelope {
            value: RadiusLineEnvelope {
                lines: vec![ValidityLine {
                    intercept: source.log2_rz + value_theta,
                    dc_slope: 0.0,
                }],
            },
            derivative: RadiusLineEnvelope {
                lines: vec![ValidityLine {
                    intercept: source.log2_rz + derivative_theta,
                    dc_slope: 0.0,
                }],
            },
        },
    }
}

/// Retain at most two complementary static domains: first the widest dc
/// domain, then (from another source rung) the widest dz domain. Each result
/// remains independently sound; later dominance pruning may reduce this to one.
pub fn select_cauchy_candidates(
    sources: &[CauchySource],
    context: CauchyTierContext,
) -> [CauchyCandidateEnvelope; MAX_CAUCHY_CANDIDATES] {
    let compiled: Vec<CauchyCandidateEnvelope> = sources
        .iter()
        .enumerate()
        .map(|(index, source)| compile_cauchy_candidate(index as u8, *source, context))
        .filter(|candidate| !candidate.is_dead())
        .collect();
    if compiled.is_empty() {
        return core::array::from_fn(|_| CauchyCandidateEnvelope::dead());
    }
    let first = compiled
        .iter()
        .enumerate()
        .max_by(|(_, a), (_, b)| a.dc.max_log2_dc.0.total_cmp(&b.dc.max_log2_dc.0))
        .map(|(index, _)| index)
        .unwrap();
    let second = compiled
        .iter()
        .enumerate()
        .filter(|(index, _)| *index != first)
        .max_by(|(_, a), (_, b)| a.max_log2_dz.0.total_cmp(&b.max_log2_dz.0))
        .map(|(index, _)| index);
    let mut selected = [
        compiled[first].clone(),
        second
            .map(|index| compiled[index].clone())
            .unwrap_or_else(CauchyCandidateEnvelope::dead),
    ];
    prune_dominated_candidates(&mut selected);
    selected
}

/// Select the single Cauchy source used by the reference-owned radial layout.
/// A source is eligible only when its fully solved c cap covers the immutable
/// reference domain.  Among eligible sources, the widest certified z cap at
/// that domain wins.  This is deliberately different from the legacy
/// two-candidate census, which optimized complementary viewport rungs.
pub fn select_reference_domain_cauchy_candidate(
    sources: &[CauchySource],
    context: CauchyTierContext,
    reference_log2_dc: f64,
) -> CauchyCandidateEnvelope {
    if !reference_log2_dc.is_finite() {
        return CauchyCandidateEnvelope::dead();
    }
    sources
        .iter()
        .enumerate()
        .map(|(index, source)| compile_cauchy_candidate(index as u8, *source, context))
        .filter(|candidate| {
            !candidate.is_dead() && candidate.dc.max_log2_dc.accepts(reference_log2_dc)
        })
        .max_by(|a, b| {
            a.radius_log2(reference_log2_dc)
                .total_cmp(&b.radius_log2(reference_log2_dc))
                .then_with(|| b.source_index.cmp(&a.source_index))
        })
        .unwrap_or_else(CauchyCandidateEnvelope::dead)
}

/// `strict` is pointwise no larger than `loose` over
/// `log2_dc <= domain_max`. Slopes are non-positive. The slope ordering makes
/// the difference monotone, so checking the finite upper endpoint proves the
/// entire half-line rather than sampling it.
fn line_no_larger_on_domain(strict: ValidityLine, loose: ValidityLine, domain_max: f64) -> bool {
    if strict.is_dead() {
        return true;
    }
    if loose.is_dead() || domain_max.is_nan() {
        return false;
    }
    if !domain_max.is_finite() {
        return strict.dc_slope == loose.dc_slope && strict.intercept <= loose.intercept;
    }
    strict.dc_slope >= loose.dc_slope
        && strict.radius_log2(domain_max) <= loose.radius_log2(domain_max)
}

/// Remove only lines that cannot attain the lower envelope anywhere inside
/// the certified dc domain. The lower envelope is therefore byte-for-byte
/// mathematically unchanged, not merely made more conservative.
pub fn prune_dominated_lines(envelope: &mut RadiusLineEnvelope, domain_max: f64) -> usize {
    let before = envelope.lines.len();
    if let Some(dead) = envelope.lines.iter().find(|line| line.is_dead()).copied() {
        envelope.lines.clear();
        envelope.lines.push(dead);
        return before.saturating_sub(1);
    }
    let lines = envelope.lines.clone();
    let mut keep = vec![true; lines.len()];
    for i in 0..lines.len() {
        for j in 0..lines.len() {
            if i == j {
                continue;
            }
            let j_dominates = line_no_larger_on_domain(lines[j], lines[i], domain_max);
            let i_dominates = line_no_larger_on_domain(lines[i], lines[j], domain_max);
            if j_dominates && (!i_dominates || j < i) {
                keep[i] = false;
                break;
            }
        }
    }
    envelope.lines = lines
        .into_iter()
        .zip(keep)
        .filter_map(|(line, keep)| keep.then_some(line))
        .collect();
    before - envelope.lines.len()
}

pub fn prune_low_degree_lines(proof: &mut LowDegreeLineDerivation, domain_max: f64) -> usize {
    let mut removed = prune_dominated_lines(&mut proof.value.radius, domain_max);
    removed += prune_dominated_lines(&mut proof.derivative.radius, domain_max);
    proof.radius = CombinedRadiusEnvelope {
        value: proof.value.radius.clone(),
        derivative: proof.derivative.radius.clone(),
    };
    removed
}

fn candidate_constraint_lines(candidate: &CauchyCandidateEnvelope) -> Vec<ValidityLine> {
    let mut lines = Vec::with_capacity(
        1 + candidate.tail.value.lines.len() + candidate.tail.derivative.lines.len(),
    );
    lines.push(ValidityLine {
        intercept: candidate.max_log2_dz.0,
        dc_slope: 0.0,
    });
    lines.extend(candidate.tail.value.lines.iter().copied());
    lines.extend(candidate.tail.derivative.lines.iter().copied());
    lines
}

/// `strong` makes `weak` redundant in the max-over-candidates runtime rule.
/// It covers at least the same dc domain and every constraint defining its
/// own radius is no stricter than some constraint of `weak` over that domain.
fn candidate_dominates(strong: &CauchyCandidateEnvelope, weak: &CauchyCandidateEnvelope) -> bool {
    if strong.is_dead() || weak.is_dead() || strong.dc.max_log2_dc.0 < weak.dc.max_log2_dc.0 {
        return false;
    }
    let strong_lines = candidate_constraint_lines(strong);
    let weak_lines = candidate_constraint_lines(weak);
    strong_lines.iter().all(|strong_line| {
        weak_lines.iter().any(|weak_line| {
            line_no_larger_on_domain(*weak_line, *strong_line, weak.dc.max_log2_dc.0)
        })
    })
}

/// Prune redundant candidates while preserving the exact max-certified radius.
pub fn prune_dominated_candidates(
    candidates: &mut [CauchyCandidateEnvelope; MAX_CAUCHY_CANDIDATES],
) -> usize {
    let original = (*candidates).clone();
    let mut keep = [true; MAX_CAUCHY_CANDIDATES];
    for i in 0..MAX_CAUCHY_CANDIDATES {
        if original[i].is_dead() {
            keep[i] = false;
            continue;
        }
        for j in 0..MAX_CAUCHY_CANDIDATES {
            if i == j || original[j].is_dead() {
                continue;
            }
            let j_dominates = candidate_dominates(&original[j], &original[i]);
            let i_dominates = candidate_dominates(&original[i], &original[j]);
            if j_dominates && (!i_dominates || j < i) {
                keep[i] = false;
                break;
            }
        }
    }
    let mut retained: Vec<CauchyCandidateEnvelope> = original
        .iter()
        .cloned()
        .zip(keep)
        .filter_map(|(candidate, keep)| keep.then_some(candidate))
        .collect();
    let live_before = candidates
        .iter()
        .filter(|candidate| !candidate.is_dead())
        .count();
    let live_after = retained.len();
    while retained.len() < MAX_CAUCHY_CANDIDATES {
        retained.push(CauchyCandidateEnvelope::dead());
    }
    candidates.clone_from_slice(&retained[..MAX_CAUCHY_CANDIDATES]);
    live_before - live_after
}

/// Stable tier order shared with unified coefficient prefixes and the future
/// WGSL dispatcher. Cost order is affine, Padé, Möbius c+, then Jet.
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ValidityTier {
    Affine = 0,
    Pade = 1,
    MobiusCPlus = 2,
    Jet = 3,
}

impl ValidityTier {
    pub const ALL: [Self; 4] = [Self::Affine, Self::Pade, Self::MobiusCPlus, Self::Jet];

    pub const fn index(self) -> usize {
        self as usize
    }
}

/// Complete proof envelope for one evaluator tier and block.
#[derive(Clone, Debug, PartialEq)]
pub struct TierValidityEnvelope {
    pub tier: ValidityTier,
    /// Stored low-degree value/derivative remainder constraints.
    pub remainder: CombinedRadiusEnvelope,
    pub pure_c: PureCThreshold,
    pub static_dc: StaticDcCeiling,
    pub pole: PoleLineDerivation,
    pub cauchy: [CauchyCandidateEnvelope; MAX_CAUCHY_CANDIDATES],
}

impl TierValidityEnvelope {
    pub fn dead(tier: ValidityTier) -> Self {
        Self {
            tier,
            remainder: CombinedRadiusEnvelope::dead(),
            pure_c: PureCThreshold::DEAD,
            static_dc: StaticDcCeiling::DEAD,
            pole: PoleLineDerivation::dead(),
            cauchy: core::array::from_fn(|_| CauchyCandidateEnvelope::dead()),
        }
    }

    pub fn is_dead(&self) -> bool {
        self.remainder.is_dead()
            || self.pure_c.max_log2_dc.is_dead()
            || self.static_dc.max_log2_dc.is_dead()
            || self.pole.descriptor.is_dead()
            || self.cauchy.iter().all(CauchyCandidateEnvelope::is_dead)
    }
}

/// One block's four tier certificates plus the reference-lifetime domain cap.
#[derive(Clone, Debug, PartialEq)]
pub struct ValidityEnvelope {
    pub reference_dc: StaticDcCeiling,
    pub tiers: [TierValidityEnvelope; 4],
}

/// Trace of one stored value-remainder term's equal error-budget share.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ValueTermConstraint {
    RadiusLine(ValidityLine),
    DcThreshold(Log2Limit),
    AlwaysSatisfied,
    Dead,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ValueTermAllocation {
    pub i: u8,
    pub j: u8,
    pub log2_modulus: f64,
    /// Includes the rational `1 / |DEN|` amplification when applicable.
    pub effective_log2_modulus: f64,
    /// This term's fraction of `epsilon * |a10| * |dz|` in log2 form.
    pub log2_relative_budget: f64,
    pub constraint: ValueTermConstraint,
}

/// Result of the stored value-remainder derivation. Terms linear in `dz`
/// cancel that factor against the relative-error budget and become a dynamic
/// `dc` threshold; terms of higher z degree become radius lines.
#[derive(Clone, Debug, PartialEq)]
pub struct ValueLineDerivation {
    pub radius: RadiusLineEnvelope,
    pub dc_threshold: PureCThreshold,
    pub allocations: Vec<ValueTermAllocation>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DerivativeContributionKind {
    Qz,
    DenominatorD,
    DenominatorDp,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct DerivativeTermAllocation {
    pub source_i: u8,
    pub source_j: u8,
    pub dz_power: u8,
    pub dc_power: u8,
    pub kind: DerivativeContributionKind,
    pub effective_log2_modulus: f64,
    pub log2_relative_budget: f64,
    pub constraint: ValueTermConstraint,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RationalDerivativeFactors {
    /// `-infinity` is a valid zero coefficient.
    pub log2_d: f64,
    pub log2_dp: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct DerivativeLineDerivation {
    pub radius: RadiusLineEnvelope,
    pub dc_threshold: PureCThreshold,
    pub allocations: Vec<DerivativeTermAllocation>,
}

impl DerivativeLineDerivation {
    pub fn dead() -> Self {
        Self {
            radius: RadiusLineEnvelope::dead(),
            dc_threshold: PureCThreshold::DEAD,
            allocations: Vec::new(),
        }
    }
}

/// Traceable intersection of the mandatory value and derivative channels.
#[derive(Clone, Debug, PartialEq)]
pub struct LowDegreeLineDerivation {
    pub radius: CombinedRadiusEnvelope,
    pub dc_threshold: PureCThreshold,
    pub value: ValueLineDerivation,
    pub derivative: DerivativeLineDerivation,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PureCTermAllocation {
    pub j: u8,
    pub log2_modulus: f64,
    pub effective_log2_modulus: f64,
    pub log2_relative_budget: f64,
    pub threshold: Log2Limit,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PureCDerivation {
    pub threshold: PureCThreshold,
    pub allocations: Vec<PureCTermAllocation>,
}

impl PureCDerivation {
    pub fn dead() -> Self {
        Self {
            threshold: PureCThreshold::DEAD,
            allocations: Vec::new(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PoleContributionKind {
    D,
    Dp,
    F,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PoleTermAllocation {
    pub kind: PoleContributionKind,
    pub log2_modulus: f64,
    pub log2_absolute_budget: f64,
    pub constraint: ValueTermConstraint,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PoleLineDerivation {
    pub descriptor: RationalPoleEnvelope,
    pub radius: RadiusLineEnvelope,
    pub dc_threshold: PureCThreshold,
    pub allocations: Vec<PoleTermAllocation>,
}

impl PoleLineDerivation {
    pub fn not_applicable() -> Self {
        Self {
            descriptor: RationalPoleEnvelope::NotApplicable,
            radius: RadiusLineEnvelope::default(),
            dc_threshold: PureCThreshold::UNBOUNDED,
            allocations: Vec::new(),
        }
    }

    pub fn dead() -> Self {
        Self {
            descriptor: RationalPoleEnvelope::Dead,
            radius: RadiusLineEnvelope::dead(),
            dc_threshold: PureCThreshold::DEAD,
            allocations: Vec::new(),
        }
    }
}

pub fn intersect_value_derivative_lines(
    value: ValueLineDerivation,
    derivative: DerivativeLineDerivation,
) -> LowDegreeLineDerivation {
    let max_log2_dc = if value.dc_threshold.max_log2_dc.is_dead()
        || derivative.dc_threshold.max_log2_dc.is_dead()
    {
        Log2Limit::DEAD
    } else {
        Log2Limit(
            value
                .dc_threshold
                .max_log2_dc
                .0
                .min(derivative.dc_threshold.max_log2_dc.0),
        )
    };
    LowDegreeLineDerivation {
        radius: CombinedRadiusEnvelope {
            value: value.radius.clone(),
            derivative: derivative.radius.clone(),
        },
        dc_threshold: PureCThreshold { max_log2_dc },
        value,
        derivative,
    }
}

impl ValueLineDerivation {
    pub fn dead() -> Self {
        Self {
            radius: RadiusLineEnvelope::dead(),
            dc_threshold: PureCThreshold::DEAD,
            allocations: Vec::new(),
        }
    }
}

/// Compile the finite stored z-channel remainder moduli into conservative
/// lines. The value channel receives half epsilon, then splits that half
/// equally between stored terms and the future Cauchy tail. Every live stored
/// term therefore receives `epsilon / (4 * live_term_count)` independently;
/// satisfying every emitted constraint proves their sum stays in budget.
///
/// `log2_den_amplification` is zero for affine/Jet and `log2(4/3)` for the
/// rational tiers, whose separately checked pole guard guarantees
/// `|DEN| >= 3/4`.
pub fn derive_value_radius_lines(
    log2_moduli: &[f64; JET_NCOEFF],
    log2_a10: f64,
    epsilon: f64,
    log2_den_amplification: f64,
) -> ValueLineDerivation {
    if !(epsilon > 0.0 && epsilon.is_finite() && log2_a10.is_finite())
        || !log2_den_amplification.is_finite()
    {
        return ValueLineDerivation::dead();
    }
    let live_terms = JET_MONOMIALS
        .iter()
        .zip(log2_moduli.iter())
        .filter(|((i, _), modulus)| *i >= 1 && modulus.is_finite())
        .count();
    if live_terms == 0 {
        return ValueLineDerivation {
            radius: RadiusLineEnvelope::default(),
            dc_threshold: PureCThreshold::UNBOUNDED,
            allocations: Vec::new(),
        };
    }

    let log2_relative_budget = epsilon.log2() - 2.0 - (live_terms as f64).log2();
    let mut lines = Vec::with_capacity(live_terms);
    let mut dc_threshold = Log2Limit::UNBOUNDED;
    let mut allocations = Vec::with_capacity(live_terms);
    let rhs_without_dc = log2_relative_budget + log2_a10;

    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        let log2_modulus = log2_moduli[n];
        if i == 0 || !log2_modulus.is_finite() {
            continue;
        }
        let effective_log2_modulus = log2_modulus + log2_den_amplification;
        let constraint = if i == 1 {
            if j == 0 {
                if effective_log2_modulus <= rhs_without_dc {
                    ValueTermConstraint::AlwaysSatisfied
                } else {
                    dc_threshold = Log2Limit::DEAD;
                    ValueTermConstraint::Dead
                }
            } else {
                let threshold = (rhs_without_dc - effective_log2_modulus) / f64::from(j);
                let limit = Log2Limit(threshold);
                if !dc_threshold.is_dead() && limit.0 < dc_threshold.0 {
                    dc_threshold = limit;
                }
                ValueTermConstraint::DcThreshold(limit)
            }
        } else {
            let z_power = f64::from(i - 1);
            let line = ValidityLine {
                intercept: (rhs_without_dc - effective_log2_modulus) / z_power,
                dc_slope: -f64::from(j) / z_power,
            };
            lines.push(line);
            ValueTermConstraint::RadiusLine(line)
        };
        allocations.push(ValueTermAllocation {
            i,
            j,
            log2_modulus,
            effective_log2_modulus,
            log2_relative_budget,
            constraint,
        });
    }

    if dc_threshold.is_dead() {
        return ValueLineDerivation {
            radius: RadiusLineEnvelope::dead(),
            dc_threshold: PureCThreshold::DEAD,
            allocations,
        };
    }
    ValueLineDerivation {
        radius: RadiusLineEnvelope { lines },
        dc_threshold: PureCThreshold {
            max_log2_dc: dc_threshold,
        },
        allocations,
    }
}

/// Compile the stored derivative remainder into per-term lines. Polynomial
/// tiers contribute `i*q_ij*z^(i-1)c^j`. Rational tiers additionally bound
///
/// `Q_z / DEN - Q*(D + D'c) / DEN^2`
///
/// under the separately enforced `|DEN| >= 3/4` margin, hence factors `4/3`
/// and `16/9`. As for the value channel, half epsilon is reserved for this
/// channel and half of that is reserved for its future Cauchy tail; the stored
/// contribution budget is split equally and independently.
pub fn derive_derivative_radius_lines(
    log2_moduli: &[f64; JET_NCOEFF],
    log2_a10: f64,
    epsilon: f64,
    rational: Option<RationalDerivativeFactors>,
) -> DerivativeLineDerivation {
    if !(epsilon > 0.0 && epsilon.is_finite() && log2_a10.is_finite()) {
        return DerivativeLineDerivation::dead();
    }
    if let Some(factors) = rational {
        if factors.log2_d.is_nan()
            || factors.log2_dp.is_nan()
            || factors.log2_d == f64::INFINITY
            || factors.log2_dp == f64::INFINITY
        {
            return DerivativeLineDerivation::dead();
        }
    }

    let mut contributions: Vec<(u8, u8, u8, u8, DerivativeContributionKind, f64)> = Vec::new();
    let log2_four_thirds = (4.0f64 / 3.0).log2();
    let log2_sixteen_ninths = (16.0f64 / 9.0).log2();
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        let q = log2_moduli[n];
        if !q.is_finite() {
            continue;
        }
        if i >= 1 {
            contributions.push((
                i,
                j,
                i - 1,
                j,
                DerivativeContributionKind::Qz,
                q + f64::from(i).log2()
                    + if rational.is_some() {
                        log2_four_thirds
                    } else {
                        0.0
                    },
            ));
        }
        if let Some(factors) = rational {
            if factors.log2_d.is_finite() {
                contributions.push((
                    i,
                    j,
                    i,
                    j,
                    DerivativeContributionKind::DenominatorD,
                    q + factors.log2_d + log2_sixteen_ninths,
                ));
            }
            if factors.log2_dp.is_finite() {
                contributions.push((
                    i,
                    j,
                    i,
                    j + 1,
                    DerivativeContributionKind::DenominatorDp,
                    q + factors.log2_dp + log2_sixteen_ninths,
                ));
            }
        }
    }
    if contributions.is_empty() {
        return DerivativeLineDerivation {
            radius: RadiusLineEnvelope::default(),
            dc_threshold: PureCThreshold::UNBOUNDED,
            allocations: Vec::new(),
        };
    }

    let log2_relative_budget = epsilon.log2() - 2.0 - (contributions.len() as f64).log2();
    let rhs = log2_relative_budget + log2_a10;
    let mut lines = Vec::with_capacity(contributions.len());
    let mut dc_threshold = Log2Limit::UNBOUNDED;
    let mut allocations = Vec::with_capacity(contributions.len());
    for (source_i, source_j, dz_power, dc_power, kind, effective_log2_modulus) in contributions {
        let constraint = if dz_power == 0 {
            if dc_power == 0 {
                if effective_log2_modulus <= rhs {
                    ValueTermConstraint::AlwaysSatisfied
                } else {
                    dc_threshold = Log2Limit::DEAD;
                    ValueTermConstraint::Dead
                }
            } else {
                let limit = Log2Limit((rhs - effective_log2_modulus) / f64::from(dc_power));
                if !dc_threshold.is_dead() && limit.0 < dc_threshold.0 {
                    dc_threshold = limit;
                }
                ValueTermConstraint::DcThreshold(limit)
            }
        } else {
            let line = ValidityLine {
                intercept: (rhs - effective_log2_modulus) / f64::from(dz_power),
                dc_slope: -f64::from(dc_power) / f64::from(dz_power),
            };
            lines.push(line);
            ValueTermConstraint::RadiusLine(line)
        };
        allocations.push(DerivativeTermAllocation {
            source_i,
            source_j,
            dz_power,
            dc_power,
            kind,
            effective_log2_modulus,
            log2_relative_budget,
            constraint,
        });
    }
    if dc_threshold.is_dead() {
        return DerivativeLineDerivation {
            radius: RadiusLineEnvelope::dead(),
            dc_threshold: PureCThreshold::DEAD,
            allocations,
        };
    }
    DerivativeLineDerivation {
        radius: RadiusLineEnvelope { lines },
        dc_threshold: PureCThreshold {
            max_log2_dc: dc_threshold,
        },
        allocations,
    }
}

/// Compile the stored pure-c remainder channel. Its error scale is
/// `|B|*|dc|`; cancelling one c power turns every `q_0j`, `j >= 2`, into a
/// hard dc threshold. Half epsilon is assigned to this channel and half of
/// that remains reserved for the Cauchy pure-c tail.
pub fn derive_pure_c_threshold(
    log2_moduli: &[f64; JET_NCOEFF],
    log2_b: f64,
    epsilon: f64,
    log2_den_amplification: f64,
) -> PureCDerivation {
    if !(epsilon > 0.0 && epsilon.is_finite() && log2_b.is_finite())
        || !log2_den_amplification.is_finite()
    {
        return PureCDerivation::dead();
    }
    let live_terms = JET_MONOMIALS
        .iter()
        .zip(log2_moduli.iter())
        .filter(|((i, _), modulus)| *i == 0 && modulus.is_finite())
        .count();
    if live_terms == 0 {
        return PureCDerivation {
            threshold: PureCThreshold::UNBOUNDED,
            allocations: Vec::new(),
        };
    }
    let log2_relative_budget = epsilon.log2() - 2.0 - (live_terms as f64).log2();
    let rhs = log2_relative_budget + log2_b;
    let mut threshold = Log2Limit::UNBOUNDED;
    let mut allocations = Vec::with_capacity(live_terms);
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        let log2_modulus = log2_moduli[n];
        if i != 0 || !log2_modulus.is_finite() {
            continue;
        }
        let effective_log2_modulus = log2_modulus + log2_den_amplification;
        let limit = if j <= 1 {
            if effective_log2_modulus <= rhs {
                Log2Limit::UNBOUNDED
            } else {
                Log2Limit::DEAD
            }
        } else {
            Log2Limit((rhs - effective_log2_modulus) / f64::from(j - 1))
        };
        if limit.is_dead() {
            threshold = Log2Limit::DEAD;
        } else if !threshold.is_dead() && limit.0 < threshold.0 {
            threshold = limit;
        }
        allocations.push(PureCTermAllocation {
            j,
            log2_modulus,
            effective_log2_modulus,
            log2_relative_budget,
            threshold: limit,
        });
    }
    PureCDerivation {
        threshold: PureCThreshold {
            max_log2_dc: threshold,
        },
        allocations,
    }
}

/// Compile the shipped rational denominator
/// `DEN = 1 + D*dz + D'*dc*dz + F*dc`. Each live term receives an equal share
/// of `1 - min_denominator`; satisfying all constraints proves the requested
/// positive denominator margin by the triangle inequality.
pub fn derive_rational_pole_lines(
    log2_d: f64,
    log2_dp: f64,
    log2_f: f64,
    min_denominator: f64,
) -> PoleLineDerivation {
    if !(min_denominator > 0.0 && min_denominator < 1.0)
        || [log2_d, log2_dp, log2_f]
            .iter()
            .any(|value| value.is_nan() || *value == f64::INFINITY)
    {
        return PoleLineDerivation::dead();
    }
    let terms = [
        (PoleContributionKind::D, log2_d),
        (PoleContributionKind::Dp, log2_dp),
        (PoleContributionKind::F, log2_f),
    ];
    let live_count = terms
        .iter()
        .filter(|(_, modulus)| modulus.is_finite())
        .count();
    let descriptor = RationalPoleEnvelope::Constraint {
        log2_d,
        log2_dp,
        log2_f,
        min_denominator,
    };
    if live_count == 0 {
        return PoleLineDerivation {
            descriptor,
            radius: RadiusLineEnvelope::default(),
            dc_threshold: PureCThreshold::UNBOUNDED,
            allocations: Vec::new(),
        };
    }
    let log2_absolute_budget = (1.0 - min_denominator).log2() - (live_count as f64).log2();
    let mut lines = Vec::with_capacity(2);
    let mut dc_threshold = Log2Limit::UNBOUNDED;
    let mut allocations = Vec::with_capacity(live_count);
    for (kind, log2_modulus) in terms {
        if !log2_modulus.is_finite() {
            continue;
        }
        let constraint = match kind {
            PoleContributionKind::D => {
                let line = ValidityLine {
                    intercept: log2_absolute_budget - log2_modulus,
                    dc_slope: 0.0,
                };
                lines.push(line);
                ValueTermConstraint::RadiusLine(line)
            }
            PoleContributionKind::Dp => {
                let line = ValidityLine {
                    intercept: log2_absolute_budget - log2_modulus,
                    dc_slope: -1.0,
                };
                lines.push(line);
                ValueTermConstraint::RadiusLine(line)
            }
            PoleContributionKind::F => {
                let limit = Log2Limit(log2_absolute_budget - log2_modulus);
                dc_threshold = limit;
                ValueTermConstraint::DcThreshold(limit)
            }
        };
        allocations.push(PoleTermAllocation {
            kind,
            log2_modulus,
            log2_absolute_budget,
            constraint,
        });
    }
    PoleLineDerivation {
        descriptor,
        radius: RadiusLineEnvelope { lines },
        dc_threshold: PureCThreshold {
            max_log2_dc: dc_threshold,
        },
        allocations,
    }
}

impl ValidityEnvelope {
    pub fn dead() -> Self {
        Self {
            reference_dc: StaticDcCeiling::DEAD,
            tiers: core::array::from_fn(|index| {
                TierValidityEnvelope::dead(ValidityTier::ALL[index])
            }),
        }
    }

    pub fn tier(&self, tier: ValidityTier) -> &TierValidityEnvelope {
        &self.tiers[tier.index()]
    }

    pub fn radius_log2(&self, tier: ValidityTier, log2_dc: f64) -> f64 {
        if !self.reference_dc.accepts(log2_dc) {
            DEAD_LOG2
        } else {
            self.tier(tier).radius_log2(log2_dc)
        }
    }

    pub fn diagnose(&self, tier: ValidityTier, log2_dc: f64, log2_dz: f64) -> ValidityDiagnostics {
        let proof = self.tier(tier);
        let value_radius = proof.remainder.value.radius_log2(log2_dc);
        let derivative_radius = proof.remainder.derivative.radius_log2(log2_dc);
        let pole_radius = proof.pole.radius.radius_log2(log2_dc);
        let mut cauchy_candidate = None;
        let mut cauchy_radius = DEAD_LOG2;
        for (index, candidate) in proof.cauchy.iter().enumerate() {
            let radius = candidate.radius_log2(log2_dc);
            if radius > cauchy_radius {
                cauchy_radius = radius;
                cauchy_candidate = Some(index);
            }
        }
        let invalid = log2_dc.is_nan() || log2_dz.is_nan();
        let reasons = ValidityRejectionReasons {
            static_domain: invalid
                || !self.reference_dc.accepts(log2_dc)
                || !proof.static_dc.accepts(log2_dc),
            pure_c: invalid || !proof.pure_c.accepts(log2_dc),
            pole: invalid
                || proof.pole.descriptor.is_dead()
                || !proof.pole.dc_threshold.accepts(log2_dc)
                || log2_dz > pole_radius,
            cauchy_tail: invalid || cauchy_radius == DEAD_LOG2 || log2_dz > cauchy_radius,
            value: invalid || value_radius == DEAD_LOG2 || log2_dz > value_radius,
            derivative: invalid || derivative_radius == DEAD_LOG2 || log2_dz > derivative_radius,
        };
        ValidityDiagnostics {
            reasons,
            value_radius,
            derivative_radius,
            pole_radius,
            cauchy_radius,
            cauchy_candidate,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ValidityRejectionReasons {
    pub value: bool,
    pub derivative: bool,
    pub pure_c: bool,
    pub static_domain: bool,
    pub cauchy_tail: bool,
    pub pole: bool,
}

impl ValidityRejectionReasons {
    pub fn any(self) -> bool {
        self.value
            || self.derivative
            || self.pure_c
            || self.static_domain
            || self.cauchy_tail
            || self.pole
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ValidityDiagnostics {
    pub reasons: ValidityRejectionReasons,
    pub value_radius: f64,
    pub derivative_radius: f64,
    pub pole_radius: f64,
    pub cauchy_radius: f64,
    pub cauchy_candidate: Option<usize>,
}

impl ValidityDiagnostics {
    pub fn accepts(self) -> bool {
        !self.reasons.any()
    }
}

impl TierValidityEnvelope {
    pub fn radius_log2(&self, log2_dc: f64) -> f64 {
        if self.is_dead()
            || !self.static_dc.accepts(log2_dc)
            || !self.pure_c.accepts(log2_dc)
            || !self.pole.dc_threshold.accepts(log2_dc)
        {
            return DEAD_LOG2;
        }
        let common = self
            .remainder
            .radius_log2(log2_dc)
            .min(self.pole.radius.radius_log2(log2_dc));
        let candidate = self
            .cauchy
            .iter()
            .map(|candidate| candidate.radius_log2(log2_dc))
            .fold(DEAD_LOG2, f64::max);
        common.min(candidate)
    }
}

/// Natural f32 proof layout retained as the two-rung CPU referee. Production
/// transport uses packed v1 below; slopes are global WGSL constants in both.
pub const SERIALIZED_VALIDITY_SLOPES: [f32; 4] = [0.0, -0.5, -1.0, -2.0];
pub const SERIALIZED_VALIDITY_LINE_COUNT: usize = SERIALIZED_VALIDITY_SLOPES.len();
pub const SERIALIZED_VALIDITY_TIER_WORDS: usize = 9;
pub const SERIALIZED_VALIDITY_WORDS: usize = SERIALIZED_VALIDITY_TIER_WORDS * 4;
pub const VALIDITY_ENVELOPE_BYTE_BUDGET: usize = 96;
pub const VALIDITY_COMBINED_BYTE_BUDGET: usize = 204;
pub const UNIFIED_COEFFICIENT_BYTES_PER_BLOCK: usize = 108;

/// WGSL word order per tier:
/// `[line0, line1, line2, line3, maxDc, cand0Dc, cand0R, cand1Dc, cand1R]`.
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SerializedTierValidity {
    pub line_intercepts: [f32; SERIALIZED_VALIDITY_LINE_COUNT],
    pub max_log2_dc: f32,
    pub candidate_dc: [f32; MAX_CAUCHY_CANDIDATES],
    pub candidate_radius: [f32; MAX_CAUCHY_CANDIDATES],
}

impl SerializedTierValidity {
    pub const DEAD: Self = Self {
        line_intercepts: [f32::NEG_INFINITY; SERIALIZED_VALIDITY_LINE_COUNT],
        max_log2_dc: f32::NEG_INFINITY,
        candidate_dc: [f32::NEG_INFINITY; MAX_CAUCHY_CANDIDATES],
        candidate_radius: [f32::NEG_INFINITY; MAX_CAUCHY_CANDIDATES],
    };

    /// CPU decoder/evaluator with the exact operation order planned for WGSL.
    pub fn radius_log2(self, log2_dc: f32) -> f32 {
        if self.max_log2_dc == f32::NEG_INFINITY || log2_dc.is_nan() || log2_dc > self.max_log2_dc {
            return f32::NEG_INFINITY;
        }
        let mut common = f32::INFINITY;
        for index in 0..SERIALIZED_VALIDITY_LINE_COUNT {
            if self.line_intercepts[index] != f32::INFINITY {
                // WGSL mirrors this with bitcast<u32>/bitcast<f32>. Applying
                // nextDown after the rounded add makes the decoded constraint
                // no larger than its exact f32-operands sum.
                let evaluated = if log2_dc == f32::NEG_INFINITY {
                    if SERIALIZED_VALIDITY_SLOPES[index] == 0.0 {
                        self.line_intercepts[index]
                    } else {
                        f32::INFINITY
                    }
                } else {
                    self.line_intercepts[index] + SERIALIZED_VALIDITY_SLOPES[index] * log2_dc
                };
                common = common.min(next_down_f32(evaluated));
            }
        }
        let mut candidate = f32::NEG_INFINITY;
        for index in 0..MAX_CAUCHY_CANDIDATES {
            if self.candidate_dc[index] != f32::NEG_INFINITY && log2_dc <= self.candidate_dc[index]
            {
                candidate = candidate.max(self.candidate_radius[index]);
            }
        }
        common.min(candidate)
    }
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SerializedValidityEnvelope {
    pub tiers: [SerializedTierValidity; 4],
}

pub const SERIALIZED_VALIDITY_BYTES: usize = core::mem::size_of::<SerializedValidityEnvelope>();

impl SerializedValidityEnvelope {
    pub fn to_words(self) -> [f32; SERIALIZED_VALIDITY_WORDS] {
        let mut words = [f32::NEG_INFINITY; SERIALIZED_VALIDITY_WORDS];
        for tier in 0..4 {
            let base = tier * SERIALIZED_VALIDITY_TIER_WORDS;
            words[base..base + SERIALIZED_VALIDITY_LINE_COUNT]
                .copy_from_slice(&self.tiers[tier].line_intercepts);
            words[base + 4] = self.tiers[tier].max_log2_dc;
            words[base + 5] = self.tiers[tier].candidate_dc[0];
            words[base + 6] = self.tiers[tier].candidate_radius[0];
            words[base + 7] = self.tiers[tier].candidate_dc[1];
            words[base + 8] = self.tiers[tier].candidate_radius[1];
        }
        words
    }

    pub fn from_words(words: &[f32; SERIALIZED_VALIDITY_WORDS]) -> Self {
        let tiers = core::array::from_fn(|tier| {
            let base = tier * SERIALIZED_VALIDITY_TIER_WORDS;
            let mut line_intercepts = [f32::NEG_INFINITY; SERIALIZED_VALIDITY_LINE_COUNT];
            line_intercepts.copy_from_slice(&words[base..base + SERIALIZED_VALIDITY_LINE_COUNT]);
            SerializedTierValidity {
                line_intercepts,
                max_log2_dc: words[base + 4],
                candidate_dc: [words[base + 5], words[base + 7]],
                candidate_radius: [words[base + 6], words[base + 8]],
            }
        });
        Self { tiers }
    }

    pub fn radius_log2(self, tier: ValidityTier, log2_dc: f32) -> f32 {
        self.tiers[tier.index()].radius_log2(log2_dc)
    }

    fn evaluate_logs(
        self,
        tier: ValidityTier,
        log2_dc: f32,
        log2_dz: f32,
    ) -> SerializedValidityEvaluation {
        let radius_log2 = self.radius_log2(tier, log2_dc);
        SerializedValidityEvaluation {
            log2_dc,
            log2_dz,
            radius_log2,
            accepts: radius_log2 != f32::NEG_INFINITY
                && !log2_dz.is_nan()
                && log2_dz <= radius_log2,
        }
    }

    pub fn evaluate_shallow(
        self,
        tier: ValidityTier,
        dc: ShallowComplex32,
        dz: ShallowComplex32,
    ) -> SerializedValidityEvaluation {
        self.evaluate_logs(tier, shallow_log2_magnitude(dc), shallow_log2_magnitude(dz))
    }

    pub fn evaluate_floatexp(
        self,
        tier: ValidityTier,
        dc: FloatExpComplex32,
        dz: FloatExpComplex32,
    ) -> SerializedValidityEvaluation {
        self.evaluate_logs(
            tier,
            floatexp_log2_magnitude(dc),
            floatexp_log2_magnitude(dz),
        )
    }
}

/// Frozen packed-v1 proof format. The census selected one Cauchy rung; its dc
/// ceiling is intersected into `max_log2_dc`, so no separate candidate-domain
/// word is needed. Layout per tier:
/// `[line0, line1, line2, line3, maxDcIncludingCandidate, candidateRadius]`.
pub const PACKED_VALIDITY_VERSION: u32 = 1;
pub const PACKED_VALIDITY_TIER_WORDS: usize = 6;
pub const PACKED_VALIDITY_WORDS: usize = PACKED_VALIDITY_TIER_WORDS * 4;

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PackedTierValidityV1 {
    pub line_intercepts: [f32; SERIALIZED_VALIDITY_LINE_COUNT],
    pub max_log2_dc: f32,
    pub candidate_radius: f32,
}

impl PackedTierValidityV1 {
    pub const DEAD: Self = Self {
        line_intercepts: [f32::NEG_INFINITY; SERIALIZED_VALIDITY_LINE_COUNT],
        max_log2_dc: f32::NEG_INFINITY,
        candidate_radius: f32::NEG_INFINITY,
    };

    pub fn radius_log2(self, log2_dc: f32) -> f32 {
        if self.max_log2_dc == f32::NEG_INFINITY || log2_dc.is_nan() || log2_dc > self.max_log2_dc {
            return f32::NEG_INFINITY;
        }
        let mut common = f32::INFINITY;
        for index in 0..SERIALIZED_VALIDITY_LINE_COUNT {
            if self.line_intercepts[index] == f32::INFINITY {
                continue;
            }
            let evaluated = if log2_dc == f32::NEG_INFINITY {
                if SERIALIZED_VALIDITY_SLOPES[index] == 0.0 {
                    self.line_intercepts[index]
                } else {
                    f32::INFINITY
                }
            } else {
                self.line_intercepts[index] + SERIALIZED_VALIDITY_SLOPES[index] * log2_dc
            };
            common = common.min(next_down_f32(evaluated));
        }
        common.min(self.candidate_radius)
    }
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PackedValidityEnvelopeV1 {
    pub tiers: [PackedTierValidityV1; 4],
}

pub const PACKED_VALIDITY_BYTES: usize = core::mem::size_of::<PackedValidityEnvelopeV1>();

/// Debug-only provenance for the constraints intersected by packed-v1. The
/// proof record stays frozen at 96 bytes; these two words merely let the GPU
/// attribute a rejection to the original certificate channel.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct PackedValidityDiagnosticsV1 {
    /// Four 2-bit fields, one per tier: 0=static/reference, 1=pure-c,
    /// 2=rational pole, 3=Cauchy candidate domain.
    pub domain_reasons: u32,
    /// Sixteen 2-bit fields, tier-major then serialized slope bucket:
    /// 0=value, 1=derivative, 2=rational pole, 3=no line.
    pub line_reasons: u32,
}

pub const PACKED_VALIDITY_DIAGNOSTIC_WORDS: usize = 2;
pub const PACKED_VALIDITY_DIAGNOSTIC_BYTES: usize =
    core::mem::size_of::<PackedValidityDiagnosticsV1>();

/// Reference-owned radial record. Version 2 follows packed-validity v1 and is
/// intentionally half its size (12 words / 48 bytes instead of 24 / 96).
/// There is exactly one Cauchy source per non-affine tier and no viewport,
/// bank, or octave-rung identifier.
pub const RADIAL_VALIDITY_V2_VERSION: u32 = 2;
pub const RADIAL_VALIDITY_V2_WORDS: usize = 12;
pub const RADIAL_VALIDITY_VERSION: u32 = 3;
pub const RADIAL_VALIDITY_WORDS: usize = 21;
pub const RADIAL_VALIDITY_BYTES: usize = RADIAL_VALIDITY_WORDS * core::mem::size_of::<u32>();

const RADIAL_SOURCE_DEAD: u8 = u8::MAX;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RadialRejectionReason {
    None,
    NonFinite,
    OutOfDomain,
    AffineRadius,
    RadialCap,
    RationalPole,
    Dead,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RadialValidityEvaluation {
    pub accepts: bool,
    pub radius_log2: f32,
    pub rejection: RadialRejectionReason,
}

/// GPU word order:
///
/// ```text
///  0 affine alpha mantissa (positive f32, rounded down)
///  1 affine alpha exponent (i32 bits)
///  2 affine beta (non-negative f32, rounded up)
///  3..5  Padé   maxDz, maxDc, poleMaxDz
///  6..8  c+     maxDz, maxDc, poleMaxDz
///  9..10 Jet    maxDz, maxDc
/// 11 source ids: Padé | c+<<8 | Jet<<16
/// ```
///
/// Affine is evaluated with `alpha - beta*|dc|`. The other tiers use one
/// axis-aligned radial rectangle; rational pole caps remain separate so debug
/// counters can distinguish a mathematical pole rejection from a tail cap.
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RadialValidityV2 {
    pub affine_alpha: f32,
    pub affine_alpha_exp: i32,
    pub affine_beta: f32,
    pub pade_max_log2_dz: f32,
    pub pade_max_log2_dc: f32,
    pub pade_pole_max_log2_dz: f32,
    pub cplus_max_log2_dz: f32,
    pub cplus_max_log2_dc: f32,
    pub cplus_pole_max_log2_dz: f32,
    pub jet_max_log2_dz: f32,
    pub jet_max_log2_dc: f32,
    pub source_ids: u32,
}

impl RadialValidityV2 {
    pub const DEAD: Self = Self {
        affine_alpha: 0.0,
        affine_alpha_exp: 0,
        affine_beta: f32::INFINITY,
        pade_max_log2_dz: f32::NEG_INFINITY,
        pade_max_log2_dc: f32::NEG_INFINITY,
        pade_pole_max_log2_dz: f32::NEG_INFINITY,
        cplus_max_log2_dz: f32::NEG_INFINITY,
        cplus_max_log2_dc: f32::NEG_INFINITY,
        cplus_pole_max_log2_dz: f32::NEG_INFINITY,
        jet_max_log2_dz: f32::NEG_INFINITY,
        jet_max_log2_dc: f32::NEG_INFINITY,
        source_ids: u32::MAX,
    };

    pub fn to_words(self) -> [u32; RADIAL_VALIDITY_V2_WORDS] {
        [
            self.affine_alpha.to_bits(),
            self.affine_alpha_exp as u32,
            self.affine_beta.to_bits(),
            self.pade_max_log2_dz.to_bits(),
            self.pade_max_log2_dc.to_bits(),
            self.pade_pole_max_log2_dz.to_bits(),
            self.cplus_max_log2_dz.to_bits(),
            self.cplus_max_log2_dc.to_bits(),
            self.cplus_pole_max_log2_dz.to_bits(),
            self.jet_max_log2_dz.to_bits(),
            self.jet_max_log2_dc.to_bits(),
            self.source_ids,
        ]
    }

    pub fn from_words(words: [u32; RADIAL_VALIDITY_V2_WORDS]) -> Self {
        Self {
            affine_alpha: f32::from_bits(words[0]),
            affine_alpha_exp: words[1] as i32,
            affine_beta: f32::from_bits(words[2]),
            pade_max_log2_dz: f32::from_bits(words[3]),
            pade_max_log2_dc: f32::from_bits(words[4]),
            pade_pole_max_log2_dz: f32::from_bits(words[5]),
            cplus_max_log2_dz: f32::from_bits(words[6]),
            cplus_max_log2_dc: f32::from_bits(words[7]),
            cplus_pole_max_log2_dz: f32::from_bits(words[8]),
            jet_max_log2_dz: f32::from_bits(words[9]),
            jet_max_log2_dc: f32::from_bits(words[10]),
            source_ids: words[11],
        }
    }

    pub fn source_index(self, tier: ValidityTier) -> Option<u8> {
        let shift = match tier {
            ValidityTier::Pade => 0,
            ValidityTier::MobiusCPlus => 8,
            ValidityTier::Jet => 16,
            ValidityTier::Affine => return None,
        };
        let source = ((self.source_ids >> shift) & 0xff) as u8;
        (source != RADIAL_SOURCE_DEAD).then_some(source)
    }

    fn affine_radius_log2(self, log2_dc: f32) -> f32 {
        if !(self.affine_alpha > 0.0 && self.affine_alpha.is_finite())
            || !(self.affine_beta >= 0.0 && self.affine_beta.is_finite())
        {
            return f32::NEG_INFINITY;
        }
        let log2_alpha =
            next_down_f32(next_down_f32(self.affine_alpha.log2()) + self.affine_alpha_exp as f32);
        if log2_dc == f32::NEG_INFINITY || self.affine_beta == 0.0 {
            return log2_alpha;
        }
        if !log2_dc.is_finite() {
            return f32::NEG_INFINITY;
        }
        let log2_beta_dc = next_up_f32(next_up_f32(self.affine_beta.log2()) + log2_dc);
        let relative = next_up_f32(log2_beta_dc - log2_alpha);
        if relative >= 0.0 {
            return f32::NEG_INFINITY;
        }
        let remaining = next_down_f32(1.0 - next_up_f32(relative.exp2()));
        if !(remaining > 0.0 && remaining.is_finite()) {
            return f32::NEG_INFINITY;
        }
        next_down_f32(log2_alpha + next_down_f32(remaining.log2()))
    }

    pub fn evaluate_logs(
        self,
        tier: ValidityTier,
        reference_log2_dc: f32,
        log2_dc: f32,
        log2_dz: f32,
    ) -> RadialValidityEvaluation {
        if !reference_log2_dc.is_finite() || log2_dc.is_nan() || log2_dz.is_nan() {
            return RadialValidityEvaluation {
                accepts: false,
                radius_log2: f32::NEG_INFINITY,
                rejection: RadialRejectionReason::NonFinite,
            };
        }
        if log2_dc > reference_log2_dc || log2_dc == f32::INFINITY {
            return RadialValidityEvaluation {
                accepts: false,
                radius_log2: f32::NEG_INFINITY,
                rejection: RadialRejectionReason::OutOfDomain,
            };
        }
        if tier == ValidityTier::Affine {
            let radius = self.affine_radius_log2(log2_dc);
            let accepts = radius != f32::NEG_INFINITY && log2_dz <= radius;
            return RadialValidityEvaluation {
                accepts,
                radius_log2: radius,
                rejection: if accepts {
                    RadialRejectionReason::None
                } else if radius == f32::NEG_INFINITY {
                    RadialRejectionReason::Dead
                } else {
                    RadialRejectionReason::AffineRadius
                },
            };
        }
        let (max_dz, max_dc, pole) = match tier {
            ValidityTier::Pade => (
                self.pade_max_log2_dz,
                self.pade_max_log2_dc,
                self.pade_pole_max_log2_dz,
            ),
            ValidityTier::MobiusCPlus => (
                self.cplus_max_log2_dz,
                self.cplus_max_log2_dc,
                self.cplus_pole_max_log2_dz,
            ),
            ValidityTier::Jet => (self.jet_max_log2_dz, self.jet_max_log2_dc, f32::INFINITY),
            ValidityTier::Affine => unreachable!(),
        };
        if max_dz == f32::NEG_INFINITY || max_dc == f32::NEG_INFINITY {
            return RadialValidityEvaluation {
                accepts: false,
                radius_log2: f32::NEG_INFINITY,
                rejection: RadialRejectionReason::Dead,
            };
        }
        if log2_dc > max_dc {
            return RadialValidityEvaluation {
                accepts: false,
                radius_log2: max_dz.min(pole),
                rejection: RadialRejectionReason::RadialCap,
            };
        }
        if log2_dz > pole {
            return RadialValidityEvaluation {
                accepts: false,
                radius_log2: max_dz.min(pole),
                rejection: RadialRejectionReason::RationalPole,
            };
        }
        let accepts = log2_dz <= max_dz;
        RadialValidityEvaluation {
            accepts,
            radius_log2: max_dz.min(pole),
            rejection: if accepts {
                RadialRejectionReason::None
            } else {
                RadialRejectionReason::RadialCap
            },
        }
    }
}

/// One intrinsic, viewport-independent radial rectangle.  The candidate is
/// valid for every pixel satisfying both axis caps; `pole_max_log2_dz` is a
/// separately serialized rational-denominator guard (infinite for Jet).
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RadialCandidateV3 {
    pub max_log2_dz: f32,
    pub max_log2_dc: f32,
    pub pole_max_log2_dz: f32,
}

impl RadialCandidateV3 {
    pub const DEAD: Self = Self {
        max_log2_dz: f32::NEG_INFINITY,
        max_log2_dc: f32::NEG_INFINITY,
        pole_max_log2_dz: f32::NEG_INFINITY,
    };

    pub fn is_dead(self) -> bool {
        self.max_log2_dz == f32::NEG_INFINITY
            || self.max_log2_dc == f32::NEG_INFINITY
            || self.max_log2_dz.is_nan()
            || self.max_log2_dc.is_nan()
            || self.pole_max_log2_dz.is_nan()
    }

    fn effective_max_log2_dz(self) -> f32 {
        self.max_log2_dz.min(self.pole_max_log2_dz)
    }
}

/// Active radial layout.  Affine keeps its exact `alpha - beta*|dc|`
/// certificate; Padé, Möbius-c+ and Jet each retain two non-dominated
/// intrinsic rectangles (widest dc and widest dz).  No word is derived from
/// an instantaneous or epoch-start viewport extent.
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RadialValidityV3 {
    pub affine_alpha: f32,
    pub affine_alpha_exp: i32,
    pub affine_beta: f32,
    /// Tier order: Padé, Möbius-c+, Jet. Candidate 0 is the widest-dc endpoint
    /// of the Pareto frontier; candidate 1 is the widest-dz endpoint.
    pub candidates: [[RadialCandidateV3; MAX_CAUCHY_CANDIDATES]; 3],
}

impl RadialValidityV3 {
    pub const DEAD: Self = Self {
        affine_alpha: 0.0,
        affine_alpha_exp: 0,
        affine_beta: f32::INFINITY,
        candidates: [[RadialCandidateV3::DEAD; MAX_CAUCHY_CANDIDATES]; 3],
    };

    pub fn to_words(self) -> [u32; RADIAL_VALIDITY_WORDS] {
        let mut words = [0u32; RADIAL_VALIDITY_WORDS];
        words[0] = self.affine_alpha.to_bits();
        words[1] = self.affine_alpha_exp as u32;
        words[2] = self.affine_beta.to_bits();
        let mut word = 3usize;
        for tier in self.candidates {
            for candidate in tier {
                words[word] = candidate.max_log2_dz.to_bits();
                words[word + 1] = candidate.max_log2_dc.to_bits();
                words[word + 2] = candidate.pole_max_log2_dz.to_bits();
                word += 3;
            }
        }
        words
    }

    pub fn from_words(words: [u32; RADIAL_VALIDITY_WORDS]) -> Self {
        let mut candidates = [[RadialCandidateV3::DEAD; MAX_CAUCHY_CANDIDATES]; 3];
        let mut word = 3usize;
        for tier in &mut candidates {
            for candidate in tier {
                *candidate = RadialCandidateV3 {
                    max_log2_dz: f32::from_bits(words[word]),
                    max_log2_dc: f32::from_bits(words[word + 1]),
                    pole_max_log2_dz: f32::from_bits(words[word + 2]),
                };
                word += 3;
            }
        }
        Self {
            affine_alpha: f32::from_bits(words[0]),
            affine_alpha_exp: words[1] as i32,
            affine_beta: f32::from_bits(words[2]),
            candidates,
        }
    }

    fn affine_radius_log2(self, log2_dc: f32) -> f32 {
        RadialValidityV2 {
            affine_alpha: self.affine_alpha,
            affine_alpha_exp: self.affine_alpha_exp,
            affine_beta: self.affine_beta,
            ..RadialValidityV2::DEAD
        }
        .affine_radius_log2(log2_dc)
    }

    pub fn affine_max_log2_dc(self) -> f32 {
        if !(self.affine_alpha > 0.0 && self.affine_alpha.is_finite())
            || !(self.affine_beta >= 0.0 && self.affine_beta.is_finite())
        {
            return f32::NEG_INFINITY;
        }
        if self.affine_beta == 0.0 {
            return f32::INFINITY;
        }
        next_down_f32(
            next_down_f32(self.affine_alpha.log2()) + self.affine_alpha_exp as f32
                - next_up_f32(self.affine_beta.log2()),
        )
    }

    pub fn max_log2_dc(self) -> f32 {
        self.candidates
            .iter()
            .flatten()
            .filter(|candidate| !candidate.is_dead())
            .map(|candidate| candidate.max_log2_dc)
            .fold(self.affine_max_log2_dc(), f32::max)
    }

    pub fn max_log2_dz(self) -> f32 {
        let affine = self.affine_radius_log2(f32::NEG_INFINITY);
        self.candidates
            .iter()
            .flatten()
            .filter(|candidate| !candidate.is_dead())
            .map(|candidate| candidate.effective_max_log2_dz())
            .fold(affine, f32::max)
    }

    pub fn evaluate_logs(
        self,
        tier: ValidityTier,
        log2_dc: f32,
        log2_dz: f32,
    ) -> RadialValidityEvaluation {
        if log2_dc.is_nan() || log2_dz.is_nan() {
            return RadialValidityEvaluation {
                accepts: false,
                radius_log2: f32::NEG_INFINITY,
                rejection: RadialRejectionReason::NonFinite,
            };
        }
        if tier == ValidityTier::Affine {
            let radius = self.affine_radius_log2(log2_dc);
            let accepts = radius != f32::NEG_INFINITY && log2_dz <= radius;
            return RadialValidityEvaluation {
                accepts,
                radius_log2: radius,
                rejection: if accepts {
                    RadialRejectionReason::None
                } else if radius == f32::NEG_INFINITY {
                    RadialRejectionReason::Dead
                } else {
                    RadialRejectionReason::AffineRadius
                },
            };
        }

        let tier_index = tier.index() - 1;
        let mut any_live = false;
        let mut any_dc = false;
        let mut any_pole = false;
        let mut best_radius = f32::NEG_INFINITY;
        for candidate in self.candidates[tier_index] {
            if candidate.is_dead() {
                continue;
            }
            any_live = true;
            let effective_radius = candidate.effective_max_log2_dz();
            best_radius = best_radius.max(effective_radius);
            if log2_dc > candidate.max_log2_dc {
                continue;
            }
            any_dc = true;
            if log2_dz > candidate.pole_max_log2_dz {
                continue;
            }
            any_pole = true;
            if log2_dz <= candidate.max_log2_dz {
                return RadialValidityEvaluation {
                    accepts: true,
                    radius_log2: effective_radius,
                    rejection: RadialRejectionReason::None,
                };
            }
        }
        RadialValidityEvaluation {
            accepts: false,
            radius_log2: best_radius,
            rejection: if !any_live {
                RadialRejectionReason::Dead
            } else if !any_dc {
                RadialRejectionReason::RadialCap
            } else if !any_pole {
                RadialRejectionReason::RationalPole
            } else {
                RadialRejectionReason::RadialCap
            },
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AffineCertificateSource {
    pub alpha: f64,
    pub beta: f64,
}

fn encode_positive_fe_down(value: f64) -> Option<(f32, i32)> {
    if !(value > 0.0 && value.is_finite()) {
        return None;
    }
    let exponent_f64 = value.log2().floor() + 1.0;
    if exponent_f64 < i32::MIN as f64 || exponent_f64 > i32::MAX as f64 {
        return None;
    }
    let exponent = exponent_f64 as i32;
    let mantissa = f64_to_f32_down(value * 2.0f64.powi(-exponent));
    (mantissa > 0.0 && mantissa.is_finite()).then_some((mantissa, exponent))
}

pub(crate) fn f64_to_f32_up(value: f64) -> f32 {
    if value.is_nan() || value == f64::INFINITY {
        return f32::INFINITY;
    }
    if value == f64::NEG_INFINITY {
        return f32::NEG_INFINITY;
    }
    let rounded = value as f32;
    if (rounded as f64) < value {
        next_up_f32(rounded)
    } else {
        rounded
    }
}

fn radial_tier_caps(
    envelope: &ValidityEnvelope,
    tier: ValidityTier,
    candidate: &CauchyCandidateEnvelope,
) -> Option<(f32, f32, f32)> {
    let reference = envelope.reference_dc.max_log2_dc.0;
    let proof = envelope.tier(tier);
    if !reference.is_finite()
        || proof.is_dead()
        || candidate.is_dead()
        || !proof.static_dc.accepts(reference)
        || !proof.pure_c.accepts(reference)
        || !proof.pole.dc_threshold.accepts(reference)
        || !candidate.dc.accepts(reference)
    {
        return None;
    }
    let max_dz = proof
        .remainder
        .radius_log2(reference)
        .min(candidate.radius_log2(reference));
    let pole = proof.pole.radius.radius_log2(reference);
    if !max_dz.is_finite() || (!pole.is_finite() && pole != f64::INFINITY) {
        return None;
    }
    Some((
        f64_to_f32_down(max_dz),
        f64_to_f32_down(reference.min(candidate.dc.max_log2_dc.0)),
        f64_to_f32_down(pole),
    ))
}

/// Collapse the uncompressed proof into one conservative rectangle per radial
/// tier. `candidates` must already be selected from all build-side sources by
/// `select_reference_domain_cauchy_candidate`.
pub fn serialize_radial_validity_v2(
    envelope: &ValidityEnvelope,
    affine: AffineCertificateSource,
    candidates: &[CauchyCandidateEnvelope; 4],
) -> RadialValidityV2 {
    let mut out = RadialValidityV2::DEAD;
    if let Some((mantissa, exponent)) = encode_positive_fe_down(affine.alpha) {
        if affine.beta >= 0.0 && affine.beta.is_finite() {
            out.affine_alpha = mantissa;
            out.affine_alpha_exp = exponent;
            out.affine_beta = f64_to_f32_up(affine.beta);
        }
    }

    let mut source_ids = u32::from(RADIAL_SOURCE_DEAD)
        | (u32::from(RADIAL_SOURCE_DEAD) << 8)
        | (u32::from(RADIAL_SOURCE_DEAD) << 16);
    if let Some((dz, dc, pole)) = radial_tier_caps(
        envelope,
        ValidityTier::Pade,
        &candidates[ValidityTier::Pade.index()],
    ) {
        out.pade_max_log2_dz = dz;
        out.pade_max_log2_dc = dc;
        out.pade_pole_max_log2_dz = pole;
        source_ids =
            (source_ids & !0xff) | u32::from(candidates[ValidityTier::Pade.index()].source_index);
    }
    if let Some((dz, dc, pole)) = radial_tier_caps(
        envelope,
        ValidityTier::MobiusCPlus,
        &candidates[ValidityTier::MobiusCPlus.index()],
    ) {
        out.cplus_max_log2_dz = dz;
        out.cplus_max_log2_dc = dc;
        out.cplus_pole_max_log2_dz = pole;
        source_ids = (source_ids & !(0xff << 8))
            | (u32::from(candidates[ValidityTier::MobiusCPlus.index()].source_index) << 8);
    }
    if let Some((dz, dc, _)) = radial_tier_caps(
        envelope,
        ValidityTier::Jet,
        &candidates[ValidityTier::Jet.index()],
    ) {
        out.jet_max_log2_dz = dz;
        out.jet_max_log2_dc = dc;
        source_ids = (source_ids & !(0xff << 16))
            | (u32::from(candidates[ValidityTier::Jet.index()].source_index) << 16);
    }
    out.source_ids = source_ids;
    out
}

fn radial_candidate_v3(
    low_degree: &LowDegreeLineDerivation,
    pure_c: &PureCDerivation,
    pole: &PoleLineDerivation,
    candidate: &CauchyCandidateEnvelope,
) -> RadialCandidateV3 {
    if candidate.is_dead()
        || low_degree.dc_threshold.max_log2_dc.is_dead()
        || pure_c.threshold.max_log2_dc.is_dead()
        || pole.dc_threshold.max_log2_dc.is_dead()
    {
        return RadialCandidateV3::DEAD;
    }
    let max_log2_dc = candidate
        .dc
        .max_log2_dc
        .0
        .min(low_degree.dc_threshold.max_log2_dc.0)
        .min(pure_c.threshold.max_log2_dc.0)
        .min(pole.dc_threshold.max_log2_dc.0);
    if !max_log2_dc.is_finite() {
        return RadialCandidateV3::DEAD;
    }
    // Every stored line has a non-positive dc slope. Evaluating at the widest
    // admitted dc therefore gives a lower z cap valid for the complete nested
    // rectangle. The Cauchy candidate is already an intrinsic radial
    // rectangle; no viewport endpoint participates in this intersection.
    let max_log2_dz = low_degree
        .radius
        .radius_log2(max_log2_dc)
        .min(candidate.radius_log2(max_log2_dc));
    let pole_max_log2_dz = pole.radius.radius_log2(max_log2_dc);
    if !max_log2_dz.is_finite()
        || (!pole_max_log2_dz.is_finite() && pole_max_log2_dz != f64::INFINITY)
    {
        return RadialCandidateV3::DEAD;
    }
    RadialCandidateV3 {
        max_log2_dz: f64_to_f32_down(max_log2_dz),
        max_log2_dc: f64_to_f32_down(max_log2_dc),
        pole_max_log2_dz: f64_to_f32_down(pole_max_log2_dz),
    }
}

fn radial_candidate_dominates(a: RadialCandidateV3, b: RadialCandidateV3) -> bool {
    !a.is_dead()
        && !b.is_dead()
        && a.max_log2_dc >= b.max_log2_dc
        && a.effective_max_log2_dz() >= b.effective_max_log2_dz()
}

/// Reduce all sound rectangles for one tier to the two Pareto endpoints used
/// by v3: widest dc first, then widest effective dz. Dominated candidates can
/// never accept a pixel rejected by their dominator and are discarded.
fn radial_pareto_endpoints(
    candidates: impl IntoIterator<Item = RadialCandidateV3>,
) -> [RadialCandidateV3; MAX_CAUCHY_CANDIDATES] {
    let live: Vec<RadialCandidateV3> = candidates
        .into_iter()
        .filter(|candidate| !candidate.is_dead())
        .collect();
    let frontier: Vec<RadialCandidateV3> = live
        .iter()
        .copied()
        .enumerate()
        .filter(|(index, candidate)| {
            !live.iter().enumerate().any(|(other_index, other)| {
                other_index != *index
                    && radial_candidate_dominates(*other, *candidate)
                    && (other.max_log2_dc > candidate.max_log2_dc
                        || other.effective_max_log2_dz() > candidate.effective_max_log2_dz())
            })
        })
        .map(|(_, candidate)| candidate)
        .collect();
    if frontier.is_empty() {
        return [RadialCandidateV3::DEAD; MAX_CAUCHY_CANDIDATES];
    }
    let widest_dc = frontier
        .iter()
        .copied()
        .max_by(|a, b| {
            a.max_log2_dc.total_cmp(&b.max_log2_dc).then_with(|| {
                a.effective_max_log2_dz()
                    .total_cmp(&b.effective_max_log2_dz())
            })
        })
        .unwrap();
    let widest_dz = frontier
        .iter()
        .copied()
        .filter(|candidate| *candidate != widest_dc)
        .max_by(|a, b| {
            a.effective_max_log2_dz()
                .total_cmp(&b.effective_max_log2_dz())
                .then_with(|| a.max_log2_dc.total_cmp(&b.max_log2_dc))
        })
        .unwrap_or(RadialCandidateV3::DEAD);
    [widest_dc, widest_dz]
}

/// Serialize a viewport-independent two-candidate Pareto frontier. Sources
/// must be derived solely from the reference/block geometry. The function
/// compiles every source independently, intersects its intrinsic caps with the
/// stored low-degree, pure-c and pole proofs, then retains the two endpoints.
pub fn serialize_radial_validity_v3(
    affine: AffineCertificateSource,
    low_degree: &[LowDegreeLineDerivation; 4],
    pure_c: &[PureCDerivation; 4],
    poles: &[PoleLineDerivation; 4],
    sources: &[Vec<CauchySource>; 4],
    contexts: &[CauchyTierContext; 4],
) -> RadialValidityV3 {
    let mut out = RadialValidityV3::DEAD;
    if let Some((mantissa, exponent)) = encode_positive_fe_down(affine.alpha) {
        if affine.beta >= 0.0 && affine.beta.is_finite() {
            out.affine_alpha = mantissa;
            out.affine_alpha_exp = exponent;
            out.affine_beta = f64_to_f32_up(affine.beta);
        }
    }
    for tier in 1..4usize {
        let rectangles = sources[tier]
            .iter()
            .enumerate()
            .map(|(source_index, source)| {
                let candidate = compile_cauchy_candidate(
                    source_index.min(u8::MAX as usize) as u8,
                    *source,
                    contexts[tier],
                );
                radial_candidate_v3(&low_degree[tier], &pure_c[tier], &poles[tier], &candidate)
            });
        out.candidates[tier - 1] = radial_pareto_endpoints(rectangles);
    }
    out
}

const DIAGNOSTIC_DOMAIN_STATIC: u32 = 0;
const DIAGNOSTIC_DOMAIN_PURE_C: u32 = 1;
const DIAGNOSTIC_DOMAIN_POLE: u32 = 2;
const DIAGNOSTIC_DOMAIN_CAUCHY: u32 = 3;
const DIAGNOSTIC_LINE_VALUE: u32 = 0;
const DIAGNOSTIC_LINE_DERIVATIVE: u32 = 1;
const DIAGNOSTIC_LINE_POLE: u32 = 2;
const DIAGNOSTIC_LINE_NONE: u32 = 3;

impl PackedValidityEnvelopeV1 {
    pub fn to_words(self) -> [f32; PACKED_VALIDITY_WORDS] {
        let mut words = [f32::NEG_INFINITY; PACKED_VALIDITY_WORDS];
        for tier in 0..4 {
            let base = tier * PACKED_VALIDITY_TIER_WORDS;
            words[base..base + SERIALIZED_VALIDITY_LINE_COUNT]
                .copy_from_slice(&self.tiers[tier].line_intercepts);
            words[base + 4] = self.tiers[tier].max_log2_dc;
            words[base + 5] = self.tiers[tier].candidate_radius;
        }
        words
    }

    pub fn from_words(words: &[f32; PACKED_VALIDITY_WORDS]) -> Self {
        Self {
            tiers: core::array::from_fn(|tier| {
                let base = tier * PACKED_VALIDITY_TIER_WORDS;
                let mut line_intercepts = [f32::NEG_INFINITY; SERIALIZED_VALIDITY_LINE_COUNT];
                line_intercepts
                    .copy_from_slice(&words[base..base + SERIALIZED_VALIDITY_LINE_COUNT]);
                PackedTierValidityV1 {
                    line_intercepts,
                    max_log2_dc: words[base + 4],
                    candidate_radius: words[base + 5],
                }
            }),
        }
    }

    pub fn radius_log2(self, tier: ValidityTier, log2_dc: f32) -> f32 {
        self.tiers[tier.index()].radius_log2(log2_dc)
    }

    fn evaluate_logs(
        self,
        tier: ValidityTier,
        log2_dc: f32,
        log2_dz: f32,
    ) -> SerializedValidityEvaluation {
        let radius_log2 = self.radius_log2(tier, log2_dc);
        SerializedValidityEvaluation {
            log2_dc,
            log2_dz,
            radius_log2,
            accepts: radius_log2 != f32::NEG_INFINITY
                && !log2_dz.is_nan()
                && log2_dz <= radius_log2,
        }
    }

    pub fn evaluate_shallow(
        self,
        tier: ValidityTier,
        dc: ShallowComplex32,
        dz: ShallowComplex32,
    ) -> SerializedValidityEvaluation {
        self.evaluate_logs(tier, shallow_log2_magnitude(dc), shallow_log2_magnitude(dz))
    }

    pub fn evaluate_floatexp(
        self,
        tier: ValidityTier,
        dc: FloatExpComplex32,
        dz: FloatExpComplex32,
    ) -> SerializedValidityEvaluation {
        self.evaluate_logs(
            tier,
            floatexp_log2_magnitude(dc),
            floatexp_log2_magnitude(dz),
        )
    }
}

/// Complex f32 input used by the future shallow WGSL validity evaluator.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ShallowComplex32 {
    pub x: f32,
    pub y: f32,
}

/// WGSL `fe`-compatible complex input: `(x, y) * 2^exponent`. The mantissa
/// need not be normalized; only zero and non-finite values are special.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FloatExpComplex32 {
    pub x: f32,
    pub y: f32,
    pub exponent: i32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SerializedValidityEvaluation {
    pub log2_dc: f32,
    pub log2_dz: f32,
    pub radius_log2: f32,
    pub accepts: bool,
}

fn next_up_f32(value: f32) -> f32 {
    if value.is_nan() || value == f32::INFINITY {
        return value;
    }
    if value == 0.0 {
        return f32::from_bits(1);
    }
    let bits = value.to_bits();
    if value > 0.0 {
        f32::from_bits(bits + 1)
    } else {
        f32::from_bits(bits - 1)
    }
}

/// Operation-for-operation CPU mirror of the planned WGSL log magnitude.
/// Every intermediate that can influence acceptance is rounded upward: `dc`
/// therefore cannot produce an overly large radius and `dz` cannot be hidden.
fn conservative_complex_log2(x: f32, y: f32, exponent: i32) -> f32 {
    if !x.is_finite() || !y.is_finite() {
        return f32::INFINITY;
    }
    let axis = x.abs().max(y.abs());
    if axis == 0.0 {
        return f32::NEG_INFINITY;
    }
    let sx = x / axis;
    let sy = y / axis;
    let norm2 = next_up_f32(sx * sx + sy * sy);
    let angular = next_up_f32(0.5 * next_up_f32(norm2.log2()));
    let radial = next_up_f32(axis.log2());
    next_up_f32(next_up_f32(radial + angular) + exponent as f32)
}

pub fn shallow_log2_magnitude(value: ShallowComplex32) -> f32 {
    conservative_complex_log2(value.x, value.y, 0)
}

pub fn floatexp_log2_magnitude(value: FloatExpComplex32) -> f32 {
    conservative_complex_log2(value.x, value.y, value.exponent)
}

/// One level of serialized envelopes as seen by the CPU Auto referee. A short
/// block slice is a committed partial prefix; unavailable slots are rejected.
#[derive(Clone, Copy, Debug)]
pub struct CpuValidityLevel<'a> {
    pub skip: usize,
    pub blocks: &'a [SerializedValidityEnvelope],
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CpuAutoDecision {
    pub level_index: usize,
    pub slot: usize,
    pub skip: usize,
    pub tier: ValidityTier,
    pub evaluation: SerializedValidityEvaluation,
}

fn cpu_auto_referee_logs(
    levels: &[CpuValidityLevel<'_>],
    completed_iterations: usize,
    covered_iterations: usize,
    max_iterations: usize,
    log2_dc: f32,
    log2_dz: f32,
) -> Option<CpuAutoDecision> {
    let usable_end = covered_iterations.min(max_iterations);
    let mut best: Option<CpuAutoDecision> = None;
    for (level_index, level) in levels.iter().enumerate() {
        if level.skip == 0
            || completed_iterations % level.skip != 0
            || completed_iterations.saturating_add(level.skip) > usable_end
            || best
                .map(|decision| decision.skip >= level.skip)
                .unwrap_or(false)
        {
            continue;
        }
        let slot = completed_iterations / level.skip;
        let Some(block) = level.blocks.get(slot).copied() else {
            continue;
        };
        // Stable cost order. A rich valid tier at this skip wins before any
        // cheaper tier at a smaller skip because `best` is replaced by skip.
        for tier in ValidityTier::ALL {
            let evaluation = block.evaluate_logs(tier, log2_dc, log2_dz);
            if evaluation.accepts {
                best = Some(CpuAutoDecision {
                    level_index,
                    slot,
                    skip: level.skip,
                    tier,
                    evaluation,
                });
                break;
            }
        }
    }
    best
}

pub fn cpu_auto_referee_shallow(
    levels: &[CpuValidityLevel<'_>],
    completed_iterations: usize,
    covered_iterations: usize,
    max_iterations: usize,
    dc: ShallowComplex32,
    dz: ShallowComplex32,
) -> Option<CpuAutoDecision> {
    cpu_auto_referee_logs(
        levels,
        completed_iterations,
        covered_iterations,
        max_iterations,
        shallow_log2_magnitude(dc),
        shallow_log2_magnitude(dz),
    )
}

pub fn cpu_auto_referee_floatexp(
    levels: &[CpuValidityLevel<'_>],
    completed_iterations: usize,
    covered_iterations: usize,
    max_iterations: usize,
    dc: FloatExpComplex32,
    dz: FloatExpComplex32,
) -> Option<CpuAutoDecision> {
    cpu_auto_referee_logs(
        levels,
        completed_iterations,
        covered_iterations,
        max_iterations,
        floatexp_log2_magnitude(dc),
        floatexp_log2_magnitude(dz),
    )
}

fn next_down_f32(value: f32) -> f32 {
    if value.is_nan() || value == f32::NEG_INFINITY {
        return value;
    }
    if value == 0.0 {
        return -f32::from_bits(1);
    }
    let bits = value.to_bits();
    if value > 0.0 {
        f32::from_bits(bits - 1)
    } else {
        f32::from_bits(bits + 1)
    }
}

/// Round an f64 proof threshold toward a smaller radius/domain in f32.
pub fn f64_to_f32_down(value: f64) -> f32 {
    if value.is_nan() || value == f64::NEG_INFINITY {
        return f32::NEG_INFINITY;
    }
    if value == f64::INFINITY {
        return f32::INFINITY;
    }
    let rounded = value as f32;
    if rounded as f64 > value {
        next_down_f32(rounded)
    } else {
        rounded
    }
}

fn f64_to_f32_down_guarded(value: f64) -> f32 {
    // One extra ulp pays for the following f32 multiply-add rounding in the
    // WGSL/CPU mirror. The four slopes are exact powers of two.
    next_down_f32(f64_to_f32_down(value))
}

fn serialized_slope_bucket(line: ValidityLine) -> usize {
    let mut selected = 0usize;
    let mut selected_slope = SERIALIZED_VALIDITY_SLOPES[0] as f64;
    for (index, &slope) in SERIALIZED_VALIDITY_SLOPES.iter().enumerate() {
        let slope = slope as f64;
        if slope >= line.dc_slope && slope < selected_slope {
            selected = index;
            selected_slope = slope;
        }
    }
    selected
}

fn serialize_tier(
    envelope: &ValidityEnvelope,
    tier: &TierValidityEnvelope,
) -> SerializedTierValidity {
    let domain_max = envelope
        .reference_dc
        .max_log2_dc
        .0
        .min(tier.static_dc.max_log2_dc.0)
        .min(tier.pure_c.max_log2_dc.0)
        .min(tier.pole.dc_threshold.max_log2_dc.0);
    if tier.is_dead() || !domain_max.is_finite() {
        return SerializedTierValidity::DEAD;
    }

    let mut intercepts = [f64::INFINITY; SERIALIZED_VALIDITY_LINE_COUNT];
    for line in tier
        .remainder
        .value
        .lines
        .iter()
        .chain(tier.remainder.derivative.lines.iter())
        .chain(tier.pole.radius.lines.iter())
    {
        if line.is_dead() || line.dc_slope > 0.0 || line.dc_slope.is_nan() {
            return SerializedTierValidity::DEAD;
        }
        let bucket = serialized_slope_bucket(*line);
        let bucket_slope = SERIALIZED_VALIDITY_SLOPES[bucket] as f64;
        // Equal at the largest accepted dc; no larger for every smaller dc.
        let adjusted = line.intercept + (line.dc_slope - bucket_slope) * domain_max;
        intercepts[bucket] = intercepts[bucket].min(adjusted);
    }

    let mut candidate_dc = [f32::NEG_INFINITY; MAX_CAUCHY_CANDIDATES];
    let mut candidate_radius = [f32::NEG_INFINITY; MAX_CAUCHY_CANDIDATES];
    for index in 0..MAX_CAUCHY_CANDIDATES {
        let candidate = &tier.cauchy[index];
        if candidate.is_dead() {
            continue;
        }
        let candidate_domain = candidate.dc.max_log2_dc.0.min(domain_max);
        let radius = candidate.radius_log2(candidate_domain);
        if candidate_domain.is_finite() && radius.is_finite() {
            candidate_dc[index] = f64_to_f32_down(candidate_domain);
            candidate_radius[index] = f64_to_f32_down(radius);
        }
    }
    if candidate_radius
        .iter()
        .all(|radius| *radius == f32::NEG_INFINITY)
    {
        return SerializedTierValidity::DEAD;
    }

    SerializedTierValidity {
        line_intercepts: core::array::from_fn(|index| {
            if intercepts[index] == f64::INFINITY {
                f32::INFINITY
            } else {
                f64_to_f32_down_guarded(intercepts[index])
            }
        }),
        max_log2_dc: f64_to_f32_down(domain_max),
        candidate_dc,
        candidate_radius,
    }
}

pub fn serialize_validity_envelope(envelope: &ValidityEnvelope) -> SerializedValidityEnvelope {
    SerializedValidityEnvelope {
        tiers: core::array::from_fn(|index| serialize_tier(envelope, &envelope.tiers[index])),
    }
}

fn one_rung_envelope(envelope: &ValidityEnvelope) -> ValidityEnvelope {
    let mut one_rung = envelope.clone();
    for tier in &mut one_rung.tiers {
        tier.cauchy[1] = CauchyCandidateEnvelope::dead();
    }
    one_rung
}

/// Serialize the census-selected one-rung proof into the frozen packed-v1
/// layout. With one candidate, the natural decoder is live exactly when both
/// the tier domain and candidate domain are live. Their intersection can
/// therefore be stored as one threshold without changing any decoded radius.
pub fn serialize_validity_envelope_packed_v1(
    envelope: &ValidityEnvelope,
) -> PackedValidityEnvelopeV1 {
    let serialized = serialize_validity_envelope(&one_rung_envelope(envelope));
    PackedValidityEnvelopeV1 {
        tiers: core::array::from_fn(|index| {
            let tier = serialized.tiers[index];
            if tier.max_log2_dc == f32::NEG_INFINITY
                || tier.candidate_dc[0] == f32::NEG_INFINITY
                || tier.candidate_radius[0] == f32::NEG_INFINITY
            {
                PackedTierValidityV1::DEAD
            } else {
                PackedTierValidityV1 {
                    line_intercepts: tier.line_intercepts,
                    max_log2_dc: tier.max_log2_dc.min(tier.candidate_dc[0]),
                    candidate_radius: tier.candidate_radius[0],
                }
            }
        }),
    }
}

/// Preserve the build-side provenance that packed-v1 intentionally erases by
/// intersecting channels. This metadata is observability-only: the shader's
/// radius and acceptance decision continue to use `PackedValidityEnvelopeV1`.
pub fn serialize_validity_diagnostics_packed_v1(
    envelope: &ValidityEnvelope,
) -> PackedValidityDiagnosticsV1 {
    let envelope = one_rung_envelope(envelope);
    let mut diagnostics = PackedValidityDiagnosticsV1::default();

    for (tier_index, tier) in envelope.tiers.iter().enumerate() {
        let mut domain_limit = envelope.reference_dc.max_log2_dc.0;
        let mut domain_reason = DIAGNOSTIC_DOMAIN_STATIC;
        let domain_candidates = [
            (tier.static_dc.max_log2_dc.0, DIAGNOSTIC_DOMAIN_STATIC),
            (tier.pure_c.max_log2_dc.0, DIAGNOSTIC_DOMAIN_PURE_C),
            (tier.pole.dc_threshold.max_log2_dc.0, DIAGNOSTIC_DOMAIN_POLE),
            (tier.cauchy[0].dc.max_log2_dc.0, DIAGNOSTIC_DOMAIN_CAUCHY),
        ];
        for (limit, reason) in domain_candidates {
            if limit < domain_limit {
                domain_limit = limit;
                domain_reason = reason;
            }
        }
        diagnostics.domain_reasons |= domain_reason << (tier_index * 2);

        let mut intercepts = [f64::INFINITY; SERIALIZED_VALIDITY_LINE_COUNT];
        let mut reasons = [DIAGNOSTIC_LINE_NONE; SERIALIZED_VALIDITY_LINE_COUNT];
        let channels = [
            (&tier.remainder.value, DIAGNOSTIC_LINE_VALUE),
            (&tier.remainder.derivative, DIAGNOSTIC_LINE_DERIVATIVE),
            (&tier.pole.radius, DIAGNOSTIC_LINE_POLE),
        ];
        for (lines, reason) in channels {
            for line in &lines.lines {
                if line.is_dead() || line.dc_slope > 0.0 || line.dc_slope.is_nan() {
                    continue;
                }
                let bucket = serialized_slope_bucket(*line);
                let bucket_slope = SERIALIZED_VALIDITY_SLOPES[bucket] as f64;
                let adjusted = line.intercept + (line.dc_slope - bucket_slope) * domain_limit;
                if adjusted < intercepts[bucket] {
                    intercepts[bucket] = adjusted;
                    reasons[bucket] = reason;
                }
            }
        }
        for (bucket, reason) in reasons.iter().enumerate() {
            let shift = (tier_index * SERIALIZED_VALIDITY_LINE_COUNT + bucket) * 2;
            diagnostics.line_reasons |= *reason << shift;
        }
    }

    diagnostics
}

fn packed_v1_as_natural(packed: PackedValidityEnvelopeV1) -> SerializedValidityEnvelope {
    SerializedValidityEnvelope {
        tiers: core::array::from_fn(|index| {
            let tier = packed.tiers[index];
            if tier.max_log2_dc == f32::NEG_INFINITY || tier.candidate_radius == f32::NEG_INFINITY {
                SerializedTierValidity::DEAD
            } else {
                SerializedTierValidity {
                    line_intercepts: tier.line_intercepts,
                    max_log2_dc: tier.max_log2_dc,
                    candidate_dc: [tier.max_log2_dc, f32::NEG_INFINITY],
                    candidate_radius: [tier.candidate_radius, f32::NEG_INFINITY],
                }
            }
        }),
    }
}

/// Machine-checkable audit of the directed serialization boundary. It checks
/// thresholds, every bucketed source line, every retained Cauchy rung and the
/// final decoded lower envelope using the same f32 operation order as WGSL.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct SerializationAudit {
    pub comparisons: usize,
    pub violations: usize,
    pub threshold_violations: usize,
    pub line_violations: usize,
    pub candidate_violations: usize,
    pub envelope_violations: usize,
}

impl SerializationAudit {
    fn check(&mut self, condition: bool, kind: SerializationAuditKind) {
        self.comparisons += 1;
        if condition {
            return;
        }
        self.violations += 1;
        match kind {
            SerializationAuditKind::Threshold => self.threshold_violations += 1,
            SerializationAuditKind::Line => self.line_violations += 1,
            SerializationAuditKind::Candidate => self.candidate_violations += 1,
            SerializationAuditKind::Envelope => self.envelope_violations += 1,
        }
    }
}

#[derive(Clone, Copy)]
enum SerializationAuditKind {
    Threshold,
    Line,
    Candidate,
    Envelope,
}

pub fn audit_serialized_validity_envelope(
    source: &ValidityEnvelope,
    serialized: SerializedValidityEnvelope,
    log2_dc_samples: &[f32],
) -> SerializationAudit {
    let mut audit = SerializationAudit::default();
    for tier_index in 0..4 {
        let source_tier = &source.tiers[tier_index];
        let decoded = serialized.tiers[tier_index];
        let source_domain = source
            .reference_dc
            .max_log2_dc
            .0
            .min(source_tier.static_dc.max_log2_dc.0)
            .min(source_tier.pure_c.max_log2_dc.0)
            .min(source_tier.pole.dc_threshold.max_log2_dc.0);
        if source_tier.is_dead() || !source_domain.is_finite() {
            audit.check(
                decoded.max_log2_dc == f32::NEG_INFINITY,
                SerializationAuditKind::Threshold,
            );
            continue;
        }
        audit.check(
            decoded.max_log2_dc != f32::NEG_INFINITY,
            SerializationAuditKind::Threshold,
        );
        audit.check(
            (decoded.max_log2_dc as f64) <= source_domain,
            SerializationAuditKind::Threshold,
        );

        for line in source_tier
            .remainder
            .value
            .lines
            .iter()
            .chain(source_tier.remainder.derivative.lines.iter())
            .chain(source_tier.pole.radius.lines.iter())
        {
            let bucket = serialized_slope_bucket(*line);
            let bucket_slope = SERIALIZED_VALIDITY_SLOPES[bucket];
            audit.check(
                (bucket_slope as f64) >= line.dc_slope,
                SerializationAuditKind::Line,
            );
            for &log2_dc in log2_dc_samples {
                if log2_dc <= decoded.max_log2_dc {
                    let decoded_line =
                        next_down_f32(decoded.line_intercepts[bucket] + bucket_slope * log2_dc);
                    audit.check(
                        (decoded_line as f64) <= line.radius_log2(log2_dc as f64),
                        SerializationAuditKind::Line,
                    );
                }
            }
        }

        for candidate_index in 0..MAX_CAUCHY_CANDIDATES {
            let source_candidate = &source_tier.cauchy[candidate_index];
            let decoded_dc = decoded.candidate_dc[candidate_index];
            let decoded_radius = decoded.candidate_radius[candidate_index];
            if source_candidate.is_dead() {
                audit.check(
                    decoded_dc == f32::NEG_INFINITY,
                    SerializationAuditKind::Candidate,
                );
                audit.check(
                    decoded_radius == f32::NEG_INFINITY,
                    SerializationAuditKind::Candidate,
                );
                continue;
            }
            let candidate_domain = source_candidate.dc.max_log2_dc.0.min(source_domain);
            audit.check(
                (decoded_dc as f64) <= candidate_domain,
                SerializationAuditKind::Candidate,
            );
            audit.check(
                (decoded_radius as f64) <= source_candidate.radius_log2(decoded_dc as f64),
                SerializationAuditKind::Candidate,
            );
            for &log2_dc in log2_dc_samples {
                if log2_dc <= decoded_dc {
                    audit.check(
                        (decoded_radius as f64) <= source_candidate.radius_log2(log2_dc as f64),
                        SerializationAuditKind::Candidate,
                    );
                }
            }
        }

        for &log2_dc in log2_dc_samples {
            let decoded_radius = decoded.radius_log2(log2_dc);
            let source_radius = source.radius_log2(ValidityTier::ALL[tier_index], log2_dc as f64);
            audit.check(
                (decoded_radius as f64) <= source_radius,
                SerializationAuditKind::Envelope,
            );
        }
    }
    audit
}

/// Apply the full directed-f32 audit to packed v1. The packed decoder has an
/// exactly equivalent natural one-rung representation, so the existing audit
/// also checks every source line, candidate threshold and sampled envelope.
pub fn audit_packed_validity_envelope_v1(
    source: &ValidityEnvelope,
    packed: PackedValidityEnvelopeV1,
    log2_dc_samples: &[f32],
) -> SerializationAudit {
    audit_serialized_validity_envelope(
        &one_rung_envelope(source),
        packed_v1_as_natural(packed),
        log2_dc_samples,
    )
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ValidityByteAccounting {
    pub envelope_bytes_per_block: usize,
    pub combined_bytes_per_block: usize,
    pub envelope_budget: usize,
    pub combined_budget: usize,
    pub passes_budget: bool,
}

pub fn validity_bytes_per_block() -> ValidityByteAccounting {
    let combined = UNIFIED_COEFFICIENT_BYTES_PER_BLOCK + SERIALIZED_VALIDITY_BYTES;
    ValidityByteAccounting {
        envelope_bytes_per_block: SERIALIZED_VALIDITY_BYTES,
        combined_bytes_per_block: combined,
        envelope_budget: VALIDITY_ENVELOPE_BYTE_BUDGET,
        combined_budget: VALIDITY_COMBINED_BYTE_BUDGET,
        passes_budget: SERIALIZED_VALIDITY_BYTES <= VALIDITY_ENVELOPE_BYTE_BUDGET
            && combined <= VALIDITY_COMBINED_BYTE_BUDGET,
    }
}

pub fn packed_validity_bytes_per_block_v1() -> ValidityByteAccounting {
    let combined = UNIFIED_COEFFICIENT_BYTES_PER_BLOCK + PACKED_VALIDITY_BYTES;
    ValidityByteAccounting {
        envelope_bytes_per_block: PACKED_VALIDITY_BYTES,
        combined_bytes_per_block: combined,
        envelope_budget: VALIDITY_ENVELOPE_BYTE_BUDGET,
        combined_budget: VALIDITY_COMBINED_BYTE_BUDGET,
        passes_budget: PACKED_VALIDITY_BYTES <= VALIDITY_ENVELOPE_BYTE_BUDGET
            && combined <= VALIDITY_COMBINED_BYTE_BUDGET,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn line_envelope_intersects_value_and_derivative() {
        let combined = CombinedRadiusEnvelope {
            value: RadiusLineEnvelope {
                lines: vec![ValidityLine::new(-4.0, -1.0).unwrap()],
            },
            derivative: RadiusLineEnvelope {
                lines: vec![ValidityLine::new(-7.0, -0.5).unwrap()],
            },
        };
        // dc = 2^-4: value radius 2^0, derivative radius 2^-5.
        assert_eq!(combined.radius_log2(-4.0), -5.0);
    }

    #[test]
    fn dead_limit_never_accepts_zero_boundary() {
        assert!(!Log2Limit::DEAD.accepts(f64::NEG_INFINITY));
        assert!(Log2Limit::UNBOUNDED.accepts(f64::NEG_INFINITY));
        assert!(StaticDcCeiling {
            max_log2_dc: Log2Limit(-10.0),
        }
        .accepts(-11.0));
    }

    #[test]
    fn dead_block_preserves_tier_order_and_candidates() {
        let envelope = ValidityEnvelope::dead();
        assert!(envelope.reference_dc.max_log2_dc.is_dead());
        for tier in ValidityTier::ALL {
            let proof = envelope.tier(tier);
            assert_eq!(proof.tier, tier);
            assert!(proof.is_dead());
            assert_eq!(proof.cauchy.len(), MAX_CAUCHY_CANDIDATES);
        }
    }

    #[test]
    fn value_lines_allocate_each_live_term_independently() {
        let mut q = [f64::NEG_INFINITY; JET_NCOEFF];
        // epsilon=2^-4; the value stored-term pool is epsilon/4, then two
        // terms each receive epsilon/8 = 2^-7.
        q[crate::jet::jet_idx(2, 0)] = 2.0; // |q20| = 4
        q[crate::jet::jet_idx(2, 1)] = 1.0; // |q21| = 2
        let derived = derive_value_radius_lines(&q, 0.0, 2f64.powi(-4), 0.0);
        assert_eq!(derived.allocations.len(), 2);
        assert!(derived
            .allocations
            .iter()
            .all(|term| term.log2_relative_budget == -7.0));
        assert_eq!(
            derived.radius.lines[0],
            ValidityLine::new(-9.0, 0.0).unwrap()
        );
        assert_eq!(
            derived.radius.lines[1],
            ValidityLine::new(-8.0, -1.0).unwrap()
        );
    }

    #[test]
    fn z_linear_remainder_becomes_dc_threshold() {
        let mut q = [f64::NEG_INFINITY; JET_NCOEFF];
        q[crate::jet::jet_idx(1, 2)] = 1.0;
        let derived = derive_value_radius_lines(&q, 0.0, 2f64.powi(-4), 0.0);
        // One term gets epsilon/4 = 2^-6: 2*c^2 <= 2^-6.
        assert_eq!(derived.dc_threshold.max_log2_dc, Log2Limit(-3.5));
        assert!(derived.radius.lines.is_empty());
    }

    #[test]
    fn rational_denominator_amplification_tightens_line() {
        let mut q = [f64::NEG_INFINITY; JET_NCOEFF];
        q[crate::jet::jet_idx(2, 0)] = 0.0;
        let polynomial = derive_value_radius_lines(&q, 0.0, 0.25, 0.0);
        let rational = derive_value_radius_lines(&q, 0.0, 0.25, (4.0f64 / 3.0).log2());
        assert!(rational.radius.lines[0].intercept < polynomial.radius.lines[0].intercept);
    }

    #[test]
    fn derivative_line_includes_monomial_power() {
        let mut q = [f64::NEG_INFINITY; JET_NCOEFF];
        q[crate::jet::jet_idx(2, 0)] = 2.0; // derivative coefficient 2*q = 8
        let derived = derive_derivative_radius_lines(&q, 0.0, 2f64.powi(-4), None);
        // One stored contribution gets epsilon/4 = 2^-6; 8*r <= 2^-6.
        assert_eq!(
            derived.radius.lines,
            vec![ValidityLine::new(-9.0, 0.0).unwrap()]
        );
    }

    #[test]
    fn rational_derivative_carries_denominator_corrections() {
        let mut q = [f64::NEG_INFINITY; JET_NCOEFF];
        q[crate::jet::jet_idx(2, 0)] = 0.0;
        let rational = derive_derivative_radius_lines(
            &q,
            0.0,
            0.25,
            Some(RationalDerivativeFactors {
                log2_d: 1.0,
                log2_dp: 2.0,
            }),
        );
        assert!(rational.allocations.iter().any(|term| {
            term.kind == DerivativeContributionKind::DenominatorD && term.dz_power == 2
        }));
        assert!(rational.allocations.iter().any(|term| {
            term.kind == DerivativeContributionKind::DenominatorDp && term.dc_power == 1
        }));
    }

    #[test]
    fn combined_radius_is_value_derivative_intersection() {
        let mut q = [f64::NEG_INFINITY; JET_NCOEFF];
        q[crate::jet::jet_idx(2, 0)] = 2.0;
        let value = derive_value_radius_lines(&q, 0.0, 2f64.powi(-4), 0.0);
        let derivative = derive_derivative_radius_lines(&q, 0.0, 2f64.powi(-4), None);
        let combined = intersect_value_derivative_lines(value, derivative);
        assert_eq!(combined.radius.radius_log2(-20.0), -9.0);
    }

    #[test]
    fn pure_c_terms_become_dynamic_thresholds() {
        let mut q = [f64::NEG_INFINITY; JET_NCOEFF];
        q[crate::jet::jet_idx(0, 2)] = 1.0;
        let pure_c = derive_pure_c_threshold(&q, 0.0, 2f64.powi(-4), 0.0);
        // One term: 2*c^2 <= (epsilon/4)*c = 2^-6*c.
        assert_eq!(pure_c.threshold.max_log2_dc, Log2Limit(-7.0));
    }

    #[test]
    fn pole_lines_prove_requested_denominator_margin() {
        let pole = derive_rational_pole_lines(1.0, 2.0, 3.0, 0.75);
        assert_eq!(pole.allocations.len(), 3);
        let log2_dc = pole.dc_threshold.max_log2_dc.0 - 1.0;
        let log2_dz = pole.radius.radius_log2(log2_dc) - 1.0;
        let dc = log2_dc.exp2();
        let dz = log2_dz.exp2();
        let consumed = 2.0 * dz + 4.0 * dc * dz + 8.0 * dc;
        assert!(consumed <= 0.25);
        assert!(1.0 - consumed >= 0.75);
    }

    #[test]
    fn zero_denominator_coefficients_are_not_dead() {
        let pole = derive_rational_pole_lines(
            f64::NEG_INFINITY,
            f64::NEG_INFINITY,
            f64::NEG_INFINITY,
            0.75,
        );
        assert!(!pole.descriptor.is_dead());
        assert!(pole.radius.lines.is_empty());
        assert_eq!(pole.dc_threshold, PureCThreshold::UNBOUNDED);
    }

    #[test]
    fn cauchy_candidate_stays_inside_static_polydisc() {
        let source = CauchySource {
            log2_rz: 2.0,
            log2_rc: -8.0,
            log2_m: -20.0,
            log2_mc: -22.0,
        };
        let candidate = compile_cauchy_candidate(
            3,
            source,
            CauchyTierContext {
                log2_a10: 0.0,
                log2_b: 0.0,
                epsilon: 1e-3,
                rational: None,
            },
        );
        assert!(!candidate.is_dead());
        assert_eq!(candidate.source_index, 3);
        assert!(candidate.max_log2_dz.0 <= source.log2_rz - 1.0);
        assert!(candidate.dc.max_log2_dc.0 <= source.log2_rc - 1.0);
        assert!(candidate.tail.value.radius_log2(-20.0) <= candidate.max_log2_dz.0);
        assert!(candidate.tail.derivative.radius_log2(-20.0) <= candidate.max_log2_dz.0);
    }

    #[test]
    fn cauchy_selection_retains_two_complementary_rungs() {
        let sources = [
            CauchySource {
                log2_rz: -3.0,
                log2_rc: -4.0,
                log2_m: -30.0,
                log2_mc: -32.0,
            },
            CauchySource {
                log2_rz: 1.0,
                log2_rc: -10.0,
                log2_m: -30.0,
                log2_mc: -32.0,
            },
            CauchySource {
                log2_rz: -8.0,
                log2_rc: -14.0,
                log2_m: -30.0,
                log2_mc: -32.0,
            },
        ];
        let selected = select_cauchy_candidates(
            &sources,
            CauchyTierContext {
                log2_a10: 0.0,
                log2_b: 0.0,
                epsilon: 1e-3,
                rational: None,
            },
        );
        assert!(!selected[0].is_dead());
        assert!(!selected[1].is_dead());
        assert_ne!(selected[0].source_index, selected[1].source_index);
    }

    #[test]
    fn dominated_line_pruning_preserves_lower_envelope() {
        let mut envelope = RadiusLineEnvelope {
            lines: vec![
                ValidityLine::new(-5.0, 0.0).unwrap(),
                ValidityLine::new(-8.0, -1.0).unwrap(),
                ValidityLine::new(-7.0, -1.0).unwrap(), // dominated by previous
                ValidityLine::new(-5.0, 0.0).unwrap(),  // duplicate
            ],
        };
        let before = envelope.clone();
        assert_eq!(prune_dominated_lines(&mut envelope, -2.0), 2);
        for log2_dc in [-160.0, -40.0, -10.0, -2.0] {
            assert_eq!(envelope.radius_log2(log2_dc), before.radius_log2(log2_dc));
        }
    }

    fn constant_candidate(source_index: u8, dc: f64, radius: f64) -> CauchyCandidateEnvelope {
        CauchyCandidateEnvelope {
            source_index,
            dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(dc),
            },
            max_log2_dz: Log2Limit(radius),
            tail: CombinedRadiusEnvelope {
                value: RadiusLineEnvelope {
                    lines: vec![ValidityLine::new(radius, 0.0).unwrap()],
                },
                derivative: RadiusLineEnvelope {
                    lines: vec![ValidityLine::new(radius, 0.0).unwrap()],
                },
            },
        }
    }

    #[test]
    fn dominated_candidate_pruning_preserves_best_radius() {
        let weak = constant_candidate(0, -10.0, -6.0);
        let strong = constant_candidate(1, -8.0, -4.0);
        let mut candidates = [weak.clone(), strong.clone()];
        let before = candidates.clone();
        assert_eq!(prune_dominated_candidates(&mut candidates), 1);
        for log2_dc in [-40.0, -12.0, -10.0, -9.0, -8.0] {
            let old_radius = before
                .iter()
                .map(|candidate| candidate.radius_log2(log2_dc))
                .fold(DEAD_LOG2, f64::max);
            let new_radius = candidates
                .iter()
                .map(|candidate| candidate.radius_log2(log2_dc))
                .fold(DEAD_LOG2, f64::max);
            assert_eq!(new_radius, old_radius);
        }
        assert_eq!(candidates[0].source_index, strong.source_index);
    }

    #[test]
    fn crossing_candidates_are_both_retained() {
        let wide_dc = constant_candidate(0, -6.0, -10.0);
        let wide_dz = constant_candidate(1, -12.0, -2.0);
        let mut candidates = [wide_dc, wide_dz];
        assert_eq!(prune_dominated_candidates(&mut candidates), 0);
        assert!(candidates.iter().all(|candidate| !candidate.is_dead()));
    }

    fn serializable_tier(tier: ValidityTier) -> TierValidityEnvelope {
        TierValidityEnvelope {
            tier,
            remainder: CombinedRadiusEnvelope {
                value: RadiusLineEnvelope {
                    lines: vec![ValidityLine::new(-5.125, -0.75).unwrap()],
                },
                derivative: RadiusLineEnvelope {
                    lines: vec![ValidityLine::new(-7.375, -3.0).unwrap()],
                },
            },
            pure_c: PureCThreshold {
                max_log2_dc: Log2Limit(-4.125),
            },
            static_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(-3.75),
            },
            pole: PoleLineDerivation::not_applicable(),
            cauchy: [
                constant_candidate(0, -5.0, -8.125),
                constant_candidate(1, -10.0, -2.25),
            ],
        }
    }

    #[test]
    fn directed_f32_conversion_never_relaxes_a_limit() {
        for value in [
            -123.4567890123,
            -0.10000000001,
            -f64::MIN_POSITIVE,
            0.0,
            f64::MIN_POSITIVE,
            0.10000000001,
            123.4567890123,
        ] {
            let encoded = f64_to_f32_down(value);
            assert!((encoded as f64) <= value, "{} relaxed {}", encoded, value);
        }
        assert_eq!(f64_to_f32_down(f64::NEG_INFINITY), f32::NEG_INFINITY);
        assert_eq!(f64_to_f32_down(f64::INFINITY), f32::INFINITY);
        assert_eq!(f64_to_f32_down(f64::NAN), f32::NEG_INFINITY);
    }

    #[test]
    fn serialized_words_round_trip_and_account_for_natural_layout() {
        let envelope = ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(-2.0),
            },
            tiers: core::array::from_fn(|index| serializable_tier(ValidityTier::ALL[index])),
        };
        let serialized = serialize_validity_envelope(&envelope);
        let words = serialized.to_words();
        assert_eq!(SerializedValidityEnvelope::from_words(&words), serialized);
        assert_eq!(words.len(), 36);
        assert_eq!(SERIALIZED_VALIDITY_BYTES, 144);

        let accounting = validity_bytes_per_block();
        assert_eq!(accounting.envelope_bytes_per_block, 144);
        assert_eq!(accounting.combined_bytes_per_block, 252);
        assert!(!accounting.passes_budget);
    }

    #[test]
    fn packed_v1_round_trips_and_meets_the_frozen_budget() {
        let envelope = ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(-2.0),
            },
            tiers: core::array::from_fn(|index| serializable_tier(ValidityTier::ALL[index])),
        };
        let packed = serialize_validity_envelope_packed_v1(&envelope);
        let words = packed.to_words();
        assert_eq!(PackedValidityEnvelopeV1::from_words(&words), packed);
        assert_eq!(words.len(), 24);
        assert_eq!(PACKED_VALIDITY_BYTES, 96);
        assert_eq!(PACKED_VALIDITY_VERSION, 1);

        let accounting = packed_validity_bytes_per_block_v1();
        assert_eq!(accounting.envelope_bytes_per_block, 96);
        assert_eq!(accounting.combined_bytes_per_block, 204);
        assert!(accounting.passes_budget);
    }

    #[test]
    fn packed_v1_debug_provenance_preserves_intersected_channel_sources() {
        let envelope = ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(-2.0),
            },
            tiers: core::array::from_fn(|index| serializable_tier(ValidityTier::ALL[index])),
        };
        let diagnostics = serialize_validity_diagnostics_packed_v1(&envelope);
        assert_eq!(PACKED_VALIDITY_DIAGNOSTIC_WORDS, 2);
        assert_eq!(PACKED_VALIDITY_DIAGNOSTIC_BYTES, 8);
        for tier in 0..4 {
            assert_eq!((diagnostics.domain_reasons >> (tier * 2)) & 3, 3);
            let reasons: Vec<u32> = (0..4)
                .map(|bucket| (diagnostics.line_reasons >> ((tier * 4 + bucket) * 2)) & 3)
                .collect();
            assert_eq!(reasons, vec![3, 0, 3, 1]);
        }
    }

    #[test]
    fn packed_v1_is_exactly_the_natural_one_rung_decoder() {
        let envelope = ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(-2.0),
            },
            tiers: core::array::from_fn(|index| serializable_tier(ValidityTier::ALL[index])),
        };
        let one_rung = one_rung_envelope(&envelope);
        let natural = serialize_validity_envelope(&one_rung);
        let packed = serialize_validity_envelope_packed_v1(&envelope);
        let samples: Vec<f32> = (0..=640).map(|step| -2.0 - step as f32 * 0.25).collect();

        for tier in ValidityTier::ALL {
            for &log2_dc in &samples {
                assert_eq!(
                    packed.radius_log2(tier, log2_dc),
                    natural.radius_log2(tier, log2_dc),
                    "tier {:?}, dc {}",
                    tier,
                    log2_dc
                );
            }
        }

        let audit = audit_packed_validity_envelope_v1(&envelope, packed, &samples);
        assert!(audit.comparisons > 1_000);
        assert_eq!(audit.violations, 0, "{:?}", audit);
    }

    #[test]
    fn serialized_decoder_is_never_looser_than_f64_envelope() {
        let live = serializable_tier(ValidityTier::Affine);
        let envelope = ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(-2.0),
            },
            tiers: [
                live,
                TierValidityEnvelope::dead(ValidityTier::Pade),
                TierValidityEnvelope::dead(ValidityTier::MobiusCPlus),
                TierValidityEnvelope::dead(ValidityTier::Jet),
            ],
        };
        let serialized = serialize_validity_envelope(&envelope);
        for step in 0..=640 {
            let log2_dc = -4.125f32 - step as f32 * 0.25;
            let source = envelope.radius_log2(ValidityTier::Affine, log2_dc as f64);
            let decoded = serialized.radius_log2(ValidityTier::Affine, log2_dc);
            assert!(
                (decoded as f64) <= source,
                "dc={}: decoded={}, source={}",
                log2_dc,
                decoded,
                source
            );
        }
        assert_eq!(
            serialized.radius_log2(ValidityTier::Affine, -4.0),
            f32::NEG_INFINITY
        );
        for tier in [
            ValidityTier::Pade,
            ValidityTier::MobiusCPlus,
            ValidityTier::Jet,
        ] {
            assert_eq!(
                serialized.radius_log2(tier, f32::NEG_INFINITY),
                f32::NEG_INFINITY
            );
        }
    }

    #[test]
    fn shallow_and_floatexp_log_magnitudes_are_conservative() {
        for (x, y, exponent) in [
            (0.5_f32, 0.0_f32, -10_000),
            (0.75, -0.625, -300),
            (-1.0, 1.0, -100),
            (0.125, 0.25, 0),
            (f32::MIN_POSITIVE, f32::MIN_POSITIVE, 0),
        ] {
            let got = floatexp_log2_magnitude(FloatExpComplex32 { x, y, exponent });
            let exact = (x as f64).hypot(y as f64).log2() + exponent as f64;
            assert!(
                (got as f64) >= exact,
                "({}, {}) * 2^{}: {} understated {}",
                x,
                y,
                exponent,
                got,
                exact
            );
        }
        assert_eq!(
            shallow_log2_magnitude(ShallowComplex32 { x: 0.0, y: 0.0 }),
            f32::NEG_INFINITY
        );
        assert_eq!(
            shallow_log2_magnitude(ShallowComplex32 {
                x: f32::NAN,
                y: 0.0,
            }),
            f32::INFINITY
        );
    }

    #[test]
    fn shallow_and_floatexp_evaluators_make_matching_decisions() {
        let envelope = ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(-2.0),
            },
            tiers: core::array::from_fn(|index| serializable_tier(ValidityTier::ALL[index])),
        };
        let serialized = serialize_validity_envelope(&envelope);
        let shallow = serialized.evaluate_shallow(
            ValidityTier::Affine,
            ShallowComplex32 {
                x: 2f32.powi(-20),
                y: 0.0,
            },
            ShallowComplex32 {
                x: 2f32.powi(-12),
                y: 0.0,
            },
        );
        let deep = serialized.evaluate_floatexp(
            ValidityTier::Affine,
            FloatExpComplex32 {
                x: 0.5,
                y: 0.0,
                exponent: -19,
            },
            FloatExpComplex32 {
                x: 0.5,
                y: 0.0,
                exponent: -11,
            },
        );
        assert_eq!(shallow.accepts, deep.accepts);
        assert!((shallow.log2_dc - deep.log2_dc).abs() < 1e-4);
        assert!((shallow.log2_dz - deep.log2_dz).abs() < 1e-4);

        let below_f32 = serialized.evaluate_floatexp(
            ValidityTier::Affine,
            FloatExpComplex32 {
                x: 0.5,
                y: 0.0,
                exponent: -9_999,
            },
            FloatExpComplex32 {
                x: 0.5,
                y: 0.0,
                exponent: -10_100,
            },
        );
        assert!(below_f32.log2_dc.is_finite());
        assert!(below_f32.log2_dz.is_finite());
        assert!(below_f32.accepts);
    }

    #[test]
    fn zero_dc_keeps_slope_zero_constraints_live() {
        let tier = SerializedTierValidity {
            line_intercepts: [-5.0, f32::INFINITY, f32::INFINITY, f32::INFINITY],
            max_log2_dc: -2.0,
            candidate_dc: [-2.0, f32::NEG_INFINITY],
            candidate_radius: [-1.0, f32::NEG_INFINITY],
        };
        assert!(tier.radius_log2(f32::NEG_INFINITY) < -5.0);
    }

    fn referee_block(live: &[(ValidityTier, f32)]) -> SerializedValidityEnvelope {
        let mut tiers = [SerializedTierValidity::DEAD; 4];
        for &(tier, radius) in live {
            tiers[tier.index()] = SerializedTierValidity {
                line_intercepts: [f32::INFINITY; SERIALIZED_VALIDITY_LINE_COUNT],
                max_log2_dc: -2.0,
                candidate_dc: [-2.0, f32::NEG_INFINITY],
                candidate_radius: [radius, f32::NEG_INFINITY],
            };
        }
        SerializedValidityEnvelope { tiers }
    }

    #[test]
    fn auto_referee_prefers_largest_skip_before_tier_cost() {
        let small_blocks = vec![
            referee_block(&[(ValidityTier::Affine, -4.0)]),
            referee_block(&[(ValidityTier::Affine, -4.0)]),
        ];
        let large_blocks = vec![referee_block(&[(ValidityTier::Jet, -4.0)])];
        // Deliberately largest-first: selection must not depend on directory
        // order, and the later cheaper affine level must not replace skip 8.
        let levels = [
            CpuValidityLevel {
                skip: 8,
                blocks: &large_blocks,
            },
            CpuValidityLevel {
                skip: 4,
                blocks: &small_blocks,
            },
        ];
        let decision = cpu_auto_referee_shallow(
            &levels,
            0,
            8,
            8,
            ShallowComplex32 {
                x: 2f32.powi(-10),
                y: 0.0,
            },
            ShallowComplex32 {
                x: 2f32.powi(-5),
                y: 0.0,
            },
        )
        .unwrap();
        assert_eq!(decision.skip, 8);
        assert_eq!(decision.tier, ValidityTier::Jet);
    }

    #[test]
    fn auto_referee_uses_cheapest_valid_tier_and_committed_prefix() {
        let blocks = vec![referee_block(&[
            (ValidityTier::Pade, -4.0),
            (ValidityTier::MobiusCPlus, -3.0),
            (ValidityTier::Jet, -2.0),
        ])];
        let levels = [CpuValidityLevel {
            skip: 8,
            blocks: &blocks,
        }];
        let dc = FloatExpComplex32 {
            x: 0.5,
            y: 0.0,
            exponent: -9,
        };
        let dz = FloatExpComplex32 {
            x: 0.5,
            y: 0.0,
            exponent: -4,
        };
        let decision = cpu_auto_referee_floatexp(&levels, 0, 8, 64, dc, dz).unwrap();
        assert_eq!(decision.tier, ValidityTier::Pade);
        assert_eq!(decision.slot, 0);

        // Slot 1 is not committed, even though orbit coverage extends there.
        assert!(cpu_auto_referee_floatexp(&levels, 8, 16, 64, dc, dz).is_none());
        // A committed block may not cross either covered or max-iteration end.
        assert!(cpu_auto_referee_floatexp(&levels, 0, 7, 64, dc, dz).is_none());
        assert!(cpu_auto_referee_floatexp(&levels, 0, 8, 7, dc, dz).is_none());
    }

    fn diagnostic_envelope() -> ValidityEnvelope {
        let affine = TierValidityEnvelope {
            tier: ValidityTier::Affine,
            remainder: CombinedRadiusEnvelope {
                value: RadiusLineEnvelope {
                    lines: vec![ValidityLine::new(0.0, 0.0).unwrap()],
                },
                derivative: RadiusLineEnvelope {
                    lines: vec![ValidityLine::new(0.0, 0.0).unwrap()],
                },
            },
            pure_c: PureCThreshold {
                max_log2_dc: Log2Limit(0.0),
            },
            static_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(0.0),
            },
            pole: PoleLineDerivation::not_applicable(),
            cauchy: [
                constant_candidate(0, 0.0, 0.0),
                CauchyCandidateEnvelope::dead(),
            ],
        };
        ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(0.0),
            },
            tiers: [
                affine,
                TierValidityEnvelope::dead(ValidityTier::Pade),
                TierValidityEnvelope::dead(ValidityTier::MobiusCPlus),
                TierValidityEnvelope::dead(ValidityTier::Jet),
            ],
        }
    }

    #[test]
    fn diagnostics_isolate_each_rejection_channel() {
        let base = diagnostic_envelope();
        assert!(base.diagnose(ValidityTier::Affine, -10.0, -10.0).accepts());

        let mut cases = Vec::new();
        let mut static_domain = base.clone();
        static_domain.tiers[0].static_dc.max_log2_dc = Log2Limit(-20.0);
        cases.push((
            static_domain,
            ValidityRejectionReasons {
                static_domain: true,
                ..ValidityRejectionReasons::default()
            },
        ));
        let mut pure_c = base.clone();
        pure_c.tiers[0].pure_c.max_log2_dc = Log2Limit(-20.0);
        cases.push((
            pure_c,
            ValidityRejectionReasons {
                pure_c: true,
                ..ValidityRejectionReasons::default()
            },
        ));
        let mut pole = base.clone();
        pole.tiers[0].pole = PoleLineDerivation {
            descriptor: RationalPoleEnvelope::Constraint {
                log2_d: 0.0,
                log2_dp: f64::NEG_INFINITY,
                log2_f: f64::NEG_INFINITY,
                min_denominator: 0.75,
            },
            radius: RadiusLineEnvelope {
                lines: vec![ValidityLine::new(-20.0, 0.0).unwrap()],
            },
            dc_threshold: PureCThreshold::UNBOUNDED,
            allocations: Vec::new(),
        };
        cases.push((
            pole,
            ValidityRejectionReasons {
                pole: true,
                ..ValidityRejectionReasons::default()
            },
        ));
        let mut cauchy = base.clone();
        cauchy.tiers[0].cauchy[0] = constant_candidate(0, 0.0, -20.0);
        cases.push((
            cauchy,
            ValidityRejectionReasons {
                cauchy_tail: true,
                ..ValidityRejectionReasons::default()
            },
        ));
        let mut value = base.clone();
        value.tiers[0].remainder.value.lines[0].intercept = -20.0;
        cases.push((
            value,
            ValidityRejectionReasons {
                value: true,
                ..ValidityRejectionReasons::default()
            },
        ));
        let mut derivative = base;
        derivative.tiers[0].remainder.derivative.lines[0].intercept = -20.0;
        cases.push((
            derivative,
            ValidityRejectionReasons {
                derivative: true,
                ..ValidityRejectionReasons::default()
            },
        ));

        for (envelope, expected) in cases {
            let diagnostics = envelope.diagnose(ValidityTier::Affine, -10.0, -10.0);
            assert_eq!(diagnostics.reasons, expected);
            assert!(!diagnostics.accepts());
        }
    }

    #[test]
    fn radial_v2_layout_is_compact_versioned_and_has_no_viewport_bank_word() {
        let record = RadialValidityV2 {
            affine_alpha: 0.5,
            affine_alpha_exp: -20,
            affine_beta: 2.0,
            pade_max_log2_dz: -30.0,
            pade_max_log2_dc: -24.0,
            pade_pole_max_log2_dz: -28.0,
            cplus_max_log2_dz: -26.0,
            cplus_max_log2_dc: -24.0,
            cplus_pole_max_log2_dz: -25.0,
            jet_max_log2_dz: -22.0,
            jet_max_log2_dc: -24.0,
            source_ids: 3 | (5 << 8) | (7 << 16),
        };
        assert_eq!(RADIAL_VALIDITY_V2_VERSION, 2);
        assert_eq!(RADIAL_VALIDITY_V2_WORDS, 12);
        assert_eq!(core::mem::size_of::<RadialValidityV2>(), 48);
        assert_eq!(RadialValidityV2::from_words(record.to_words()), record);
        assert_eq!(record.source_index(ValidityTier::Affine), None);
        assert_eq!(record.source_index(ValidityTier::Pade), Some(3));
        assert_eq!(record.source_index(ValidityTier::MobiusCPlus), Some(5));
        assert_eq!(record.source_index(ValidityTier::Jet), Some(7));
        // All twelve words are proof fields or source provenance. There is no
        // slot in v2 for a viewport bank/rung selector.
    }

    #[test]
    fn radial_v3_layout_is_two_intrinsic_candidates_without_a_global_domain() {
        let wide_dc = RadialCandidateV3 {
            max_log2_dz: -30.0,
            max_log2_dc: 2.0,
            pole_max_log2_dz: f32::INFINITY,
        };
        let wide_dz = RadialCandidateV3 {
            max_log2_dz: -10.0,
            max_log2_dc: -20.0,
            pole_max_log2_dz: f32::INFINITY,
        };
        let record = RadialValidityV3 {
            affine_alpha: 0.5,
            affine_alpha_exp: -20,
            affine_beta: 2.0,
            candidates: [
                [wide_dc, wide_dz],
                [RadialCandidateV3::DEAD; MAX_CAUCHY_CANDIDATES],
                [RadialCandidateV3::DEAD; MAX_CAUCHY_CANDIDATES],
            ],
        };

        assert_eq!(RADIAL_VALIDITY_VERSION, 3);
        assert_eq!(RADIAL_VALIDITY_WORDS, 21);
        assert_eq!(RADIAL_VALIDITY_BYTES, 84);
        assert_eq!(core::mem::size_of::<RadialValidityV3>(), 84);
        assert_eq!(RadialValidityV3::from_words(record.to_words()), record);

        // Near the reference, the narrow-dc/wide-dz rectangle wins.
        assert!(
            record
                .evaluate_logs(ValidityTier::Pade, -24.0, -11.0)
                .accepts
        );
        // Farther away, the wide-dc endpoint remains useful.
        assert!(record.evaluate_logs(ValidityTier::Pade, 0.0, -31.0).accepts);
        let rejected = record.evaluate_logs(ValidityTier::Pade, 0.0, -11.0);
        assert_eq!(rejected.rejection, RadialRejectionReason::RadialCap);
        assert_ne!(rejected.rejection, RadialRejectionReason::OutOfDomain);
    }

    #[test]
    fn radial_v3_pareto_reduction_keeps_only_the_two_useful_endpoints() {
        let wide_dc = RadialCandidateV3 {
            max_log2_dz: -30.0,
            max_log2_dc: 2.0,
            pole_max_log2_dz: f32::INFINITY,
        };
        let wide_dz = RadialCandidateV3 {
            max_log2_dz: -10.0,
            max_log2_dc: -20.0,
            pole_max_log2_dz: f32::INFINITY,
        };
        let dominated = RadialCandidateV3 {
            max_log2_dz: -35.0,
            max_log2_dc: -4.0,
            pole_max_log2_dz: f32::INFINITY,
        };
        assert_eq!(
            radial_pareto_endpoints([dominated, wide_dz, wide_dc]),
            [wide_dc, wide_dz]
        );
    }

    #[test]
    fn radial_v2_directed_boundaries_and_non_finite_inputs_reject_safely() {
        let record = RadialValidityV2 {
            pade_max_log2_dz: -20.0,
            pade_max_log2_dc: -10.0,
            pade_pole_max_log2_dz: -18.0,
            ..RadialValidityV2::DEAD
        };
        let at = record.evaluate_logs(ValidityTier::Pade, -10.0, -10.0, -20.0);
        assert!(
            at.accepts,
            "equality with both radial caps must be accepted"
        );
        let above_z = record.evaluate_logs(ValidityTier::Pade, -10.0, -10.0, next_up_f32(-20.0));
        assert_eq!(above_z.rejection, RadialRejectionReason::RadialCap);
        let above_dc = record.evaluate_logs(
            ValidityTier::Pade,
            -10.0,
            next_up_f32(-10.0),
            f32::NEG_INFINITY,
        );
        assert_eq!(above_dc.rejection, RadialRejectionReason::OutOfDomain);
        assert_eq!(
            record
                .evaluate_logs(ValidityTier::Pade, -10.0, f32::NAN, -30.0)
                .rejection,
            RadialRejectionReason::NonFinite
        );
        assert_eq!(
            record
                .evaluate_logs(ValidityTier::Pade, -10.0, -20.0, f32::NAN)
                .rejection,
            RadialRejectionReason::NonFinite
        );
    }

    #[test]
    fn serialized_radial_evaluator_matches_uncompressed_caps_at_all_boundaries() {
        let reference = -10.0_f64;
        let envelope = ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(reference),
            },
            tiers: core::array::from_fn(|index| serializable_tier(ValidityTier::ALL[index])),
        };
        let candidates =
            core::array::from_fn(|index| constant_candidate(index as u8, reference, -8.125));
        let record = serialize_radial_validity_v2(
            &envelope,
            AffineCertificateSource {
                alpha: 0.25,
                beta: 2.0,
            },
            &candidates,
        );

        for tier in [
            ValidityTier::Pade,
            ValidityTier::MobiusCPlus,
            ValidityTier::Jet,
        ] {
            let uncompressed = envelope.tiers[tier.index()]
                .remainder
                .radius_log2(reference)
                .min(candidates[tier.index()].radius_log2(reference))
                .min(
                    envelope.tiers[tier.index()]
                        .pole
                        .radius
                        .radius_log2(reference),
                );
            let edge =
                record.evaluate_logs(tier, reference as f32, reference as f32, f32::NEG_INFINITY);
            assert!(edge.radius_log2 as f64 <= uncompressed);
            let radius = edge.radius_log2;
            for (dz, expected) in [
                (f32::NEG_INFINITY, true),
                (next_down_f32(radius), true),
                (radius, true),
                (next_up_f32(radius), false),
                (f32::INFINITY, false),
                (f32::NAN, false),
            ] {
                assert_eq!(
                    record
                        .evaluate_logs(tier, reference as f32, reference as f32, dz)
                        .accepts,
                    expected,
                    "tier {:?} dz {:?}",
                    tier,
                    dz
                );
            }
            assert!(
                record
                    .evaluate_logs(
                        tier,
                        reference as f32,
                        next_down_f32(reference as f32),
                        radius,
                    )
                    .accepts
            );
            assert!(
                !record
                    .evaluate_logs(
                        tier,
                        reference as f32,
                        next_up_f32(reference as f32),
                        f32::NEG_INFINITY,
                    )
                    .accepts
            );
        }
    }

    #[test]
    fn radial_affine_uses_reference_owned_alpha_minus_beta_dc() {
        let envelope = diagnostic_envelope();
        let candidates = core::array::from_fn(|_| constant_candidate(0, 0.0, 0.0));
        let record = serialize_radial_validity_v2(
            &envelope,
            AffineCertificateSource {
                alpha: 0.25,
                beta: 2.0,
            },
            &candidates,
        );
        let zero_radius = record
            .evaluate_logs(
                ValidityTier::Affine,
                0.0,
                f32::NEG_INFINITY,
                f32::NEG_INFINITY,
            )
            .radius_log2;
        let zero_dc =
            record.evaluate_logs(ValidityTier::Affine, 0.0, f32::NEG_INFINITY, zero_radius);
        assert!(zero_dc.accepts);
        let positive = record.evaluate_logs(ValidityTier::Affine, 0.0, -4.0, -4.0);
        assert!(positive.accepts); // alpha-beta*dc = 1/8
        let collapsed = record.evaluate_logs(ValidityTier::Affine, 0.0, -1.0, -40.0);
        assert!(!collapsed.accepts);
        assert_eq!(collapsed.rejection, RadialRejectionReason::Dead);
    }

    #[test]
    fn reference_domain_selector_prefers_widest_z_cap_that_covers_domain() {
        let sources = [
            CauchySource {
                log2_rz: 8.0,
                log2_rc: -30.0,
                log2_m: -40.0,
                log2_mc: -40.0,
            },
            CauchySource {
                log2_rz: 2.0,
                log2_rc: -8.0,
                log2_m: -40.0,
                log2_mc: -40.0,
            },
            CauchySource {
                log2_rz: 4.0,
                log2_rc: -8.0,
                log2_m: -40.0,
                log2_mc: -40.0,
            },
        ];
        let selected = select_reference_domain_cauchy_candidate(
            &sources,
            CauchyTierContext {
                log2_a10: 0.0,
                log2_b: 0.0,
                epsilon: 1e-3,
                rational: None,
            },
            -12.0,
        );
        assert_eq!(selected.source_index, 2);
        assert!(selected.dc.accepts(-12.0));
    }

    #[test]
    fn radial_rectangle_for_maximal_domain_is_sound_for_nested_domains() {
        let envelope = ValidityEnvelope {
            reference_dc: StaticDcCeiling {
                max_log2_dc: Log2Limit(-8.0),
            },
            tiers: core::array::from_fn(|index| serializable_tier(ValidityTier::ALL[index])),
        };
        let candidates = core::array::from_fn(|_| constant_candidate(0, -8.0, -12.0));
        let record = serialize_radial_validity_v2(
            &envelope,
            AffineCertificateSource {
                alpha: 0.25,
                beta: 0.0,
            },
            &candidates,
        );
        for log2_dc in [-8.0, -16.0, -64.0, f32::NEG_INFINITY] {
            let edge = record.evaluate_logs(ValidityTier::Jet, -8.0, log2_dc, -20.0);
            assert!(edge.accepts, "nested domain {} rejected", log2_dc);
        }
    }

    #[test]
    fn pure_c_and_degenerate_rational_proofs_emit_dead_radial_tiers() {
        let mut envelope = diagnostic_envelope();
        envelope.tiers[ValidityTier::Pade.index()] = serializable_tier(ValidityTier::Pade);
        envelope.tiers[ValidityTier::Pade.index()]
            .pure_c
            .max_log2_dc = Log2Limit(-20.0);
        let candidates = core::array::from_fn(|_| constant_candidate(0, 0.0, 0.0));
        let record = serialize_radial_validity_v2(
            &envelope,
            AffineCertificateSource {
                alpha: 0.25,
                beta: 0.0,
            },
            &candidates,
        );
        assert_eq!(record.pade_max_log2_dz, f32::NEG_INFINITY);

        envelope.tiers[ValidityTier::Pade.index()] = TierValidityEnvelope::dead(ValidityTier::Pade);
        let degenerate = serialize_radial_validity_v2(
            &envelope,
            AffineCertificateSource {
                alpha: 0.25,
                beta: 0.0,
            },
            &candidates,
        );
        assert_eq!(degenerate.pade_pole_max_log2_dz, f32::NEG_INFINITY);
    }
}
