// Bivariate truncated Taylor jets for iteration skipping (add-jet-approximation).
//
// Build-side arithmetic. A jet stores the Taylor coefficients a_ij of a block map
// Φ(z, c) = Σ_{1 ≤ i+j ≤ D_s} a_ij z^i c^j (no constant term), truncated at total
// degree D_s. Composition of two stored jets, re-truncated at D_s, equals the jet
// of the composed block exactly (closure — the note's Lemma 1), so the table
// carries no analytic truncation error; the only error source is the Taylor
// remainder, bounded offline by rule (V).
//
// Coefficients are kept in per-coefficient extended-exponent form (f64 mantissa
// pair + i64 exponent, design D7): |a_ij| spans exponents far beyond f64 range on
// long blocks (|a_10| = Π|2Z_k| alone reaches 2^±tens-of-thousands at the top
// levels), and the (i, j) anisotropy rules out one shared exponent at build time.
#![allow(dead_code)] // consumed progressively by the add-jet-approximation tasks

/// Stored total degree D_s. Applied orders are k ≤ JET_K; degrees K+1..=D_s exist
/// so the remainder estimate rides on exact moduli (design D3) and never ship.
pub const JET_DS: usize = 6;
/// Largest applied order K.
pub const JET_K: usize = 3;
/// Coefficient count for total degree 1..=D_s (no constant term): D_s(D_s+3)/2.
pub const JET_NCOEFF: usize = JET_DS * (JET_DS + 3) / 2;

/// Flat index of monomial z^i c^j, laid out degree-major (all of degree d before
/// degree d+1), j ascending within a degree. Degree-major order is what gives the
/// GPU table its prefix property (design D1): an order-k application reads only
/// the first k(k+3)/2 coefficients.
#[inline]
pub fn jet_idx(i: usize, j: usize) -> usize {
    let d = i + j;
    debug_assert!(d >= 1 && d <= JET_DS);
    (d - 1) * (d + 2) / 2 + j
}

/// (i, j) of each flat slot, in `jet_idx` order.
pub const fn jet_monomials() -> [(u8, u8); JET_NCOEFF] {
    let mut m = [(0u8, 0u8); JET_NCOEFF];
    let mut d = 1usize;
    let mut n = 0usize;
    while d <= JET_DS {
        let mut j = 0usize;
        while j <= d {
            m[n] = ((d - j) as u8, j as u8);
            n += 1;
            j += 1;
        }
        d += 1;
    }
    m
}
pub const JET_MONOMIALS: [(u8, u8); JET_NCOEFF] = jet_monomials();

// ── complex extended-exponent scalar ────────────────────────────────────────────

/// Complex value (x, y)·2^e with f64 mantissas and an i64 exponent. Sibling of the
/// f32-era `FExpC`, but with the wide exponent the jet build needs (top-level
/// blocks overflow even an i32 log2 budget on very long orbits) and full
/// mul/add/div arithmetic. Zero is canonically (0, 0, 0).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CFe {
    pub x: f64,
    pub y: f64,
    pub e: i64,
}

impl CFe {
    pub const ZERO: CFe = CFe { x: 0.0, y: 0.0, e: 0 };
    pub const ONE: CFe = CFe { x: 1.0, y: 0.0, e: 0 };

    #[inline]
    pub fn from_c(x: f64, y: f64) -> CFe {
        let mut v = CFe { x, y, e: 0 };
        v.normalize();
        v
    }

    #[inline]
    pub fn is_zero(&self) -> bool {
        self.x == 0.0 && self.y == 0.0
    }

    // Pull the mantissa magnitude back into [0.5, 2), folding the rest into the
    // exponent. Saturates non-finite input to a huge-exponent zero-mantissa marker
    // rather than propagating inf/NaN (same policy as FExpC::normalize).
    #[inline]
    pub fn normalize(&mut self) {
        let m = self.x.hypot(self.y);
        if m == 0.0 || !m.is_finite() {
            if !m.is_finite() {
                self.x = 0.0;
                self.y = 0.0;
                self.e = i64::MAX / 2;
            } else {
                self.e = 0;
            }
            return;
        }
        let k = m.log2().floor() as i64;
        if k != 0 {
            let f = 2f64.powi((-k).clamp(-1023, 1023) as i32);
            self.x *= f;
            self.y *= f;
            self.e += k;
        }
    }

    #[inline]
    pub fn mul(self, o: CFe) -> CFe {
        if self.is_zero() || o.is_zero() {
            return CFe::ZERO;
        }
        let mut r = CFe {
            x: self.x * o.x - self.y * o.y,
            y: self.x * o.y + self.y * o.x,
            e: self.e + o.e,
        };
        r.normalize();
        r
    }

    #[inline]
    pub fn add(self, o: CFe) -> CFe {
        if self.is_zero() {
            return o;
        }
        if o.is_zero() {
            return self;
        }
        let (hi, lo) = if self.e >= o.e { (self, o) } else { (o, self) };
        let d = hi.e - lo.e;
        if d > 128 {
            return hi; // lo is below f64 rounding of hi
        }
        let f = 2f64.powi(-(d as i32));
        let mut r = CFe { x: hi.x + lo.x * f, y: hi.y + lo.y * f, e: hi.e };
        r.normalize();
        r
    }

    #[inline]
    pub fn neg(self) -> CFe {
        CFe { x: -self.x, y: -self.y, e: self.e }
    }

    #[inline]
    pub fn sub(self, o: CFe) -> CFe {
        self.add(o.neg())
    }

    /// Complex division. Mantissas are normalized ([0.5, 2)) so |o|² ∈ [0.25, 4)
    /// and the quotient needs no pre-scaling. Division by zero saturates to the
    /// huge-exponent marker (same policy as a non-finite normalize).
    #[inline]
    pub fn div(self, o: CFe) -> CFe {
        if self.is_zero() {
            return CFe::ZERO;
        }
        if o.is_zero() {
            return CFe { x: 0.0, y: 0.0, e: i64::MAX / 2 };
        }
        let d = o.x * o.x + o.y * o.y;
        let mut r = CFe {
            x: (self.x * o.x + self.y * o.y) / d,
            y: (self.y * o.x - self.x * o.y) / d,
            e: self.e - o.e,
        };
        r.normalize();
        r
    }

    /// log2 of the magnitude; None for zero.
    #[inline]
    pub fn log2_mag(&self) -> Option<f64> {
        if self.is_zero() {
            None
        } else {
            Some(self.x.hypot(self.y).log2() + self.e as f64)
        }
    }

    /// Lossy f64 view (overflows to ±inf past the f64 range) — diagnostics only.
    pub fn to_f64(&self) -> (f64, f64) {
        let f = 2f64.powi(self.e.clamp(-2000, 2000) as i32);
        (self.x * f, self.y * f)
    }
}

// ── truncated bivariate jet ─────────────────────────────────────────────────────

/// Build-side jet: the D_s-truncated bivariate Taylor coefficients of a block map,
/// flat in `jet_idx` order.
#[derive(Clone, Copy, Debug)]
pub struct JetF64 {
    pub a: [CFe; JET_NCOEFF],
}

impl JetF64 {
    pub const ZERO: JetF64 = JetF64 { a: [CFe::ZERO; JET_NCOEFF] };

    #[inline]
    pub fn coeff(&self, i: usize, j: usize) -> CFe {
        self.a[jet_idx(i, j)]
    }
}

/// One-step seed at reference value Z: f(z, c) = 2Z·z + z² + c is polynomial of
/// total degree 2, so its jet is exact — a₁₀ = 2Z, a₂₀ = 1, a₀₁ = 1, rest 0.
pub fn jet_seed(zx: f64, zy: f64) -> JetF64 {
    let mut s = JetF64::ZERO;
    s.a[jet_idx(1, 0)] = CFe::from_c(2.0 * zx, 2.0 * zy);
    s.a[jet_idx(0, 1)] = CFe::ONE;
    s.a[jet_idx(2, 0)] = CFe::ONE;
    s
}

/// Truncated product: (p·q) keeping total degree ≤ D_s. Inputs have no constant
/// term, so every output term has degree ≥ 2.
pub fn jet_mul(p: &JetF64, q: &JetF64) -> JetF64 {
    let mut out = JetF64::ZERO;
    for (n1, &(i1, j1)) in JET_MONOMIALS.iter().enumerate() {
        let p1 = p.a[n1];
        if p1.is_zero() {
            continue;
        }
        let d1 = (i1 + j1) as usize;
        for (n2, &(i2, j2)) in JET_MONOMIALS.iter().enumerate() {
            let d2 = (i2 + j2) as usize;
            if d1 + d2 > JET_DS {
                break; // monomials are degree-major: all later n2 are larger
            }
            let q2 = q.a[n2];
            if q2.is_zero() {
                continue;
            }
            let k = jet_idx((i1 + i2) as usize, (j1 + j2) as usize);
            out.a[k] = out.a[k].add(p1.mul(q2));
        }
    }
    out
}

/// Exact truncated composition (the merge): x is applied first, then y —
/// result(z, c) = J_Ds( y(x(z, c), c) ) = Σ b_ij·x(z,c)^i·c^j truncated. By
/// closure (Lemma 1) this IS the jet of the true composed block map.
pub fn jet_compose(x: &JetF64, y: &JetF64) -> JetF64 {
    let mut out = JetF64::ZERO;
    // Pure-c terms of y (i = 0): pass through, x is not involved.
    for j in 1..=JET_DS {
        out.a[jet_idx(0, j)] = y.coeff(0, j);
    }
    // Powers x^i, i = 1..=D_s, each truncated at D_s; x^i has min degree i so the
    // useful j range shrinks as i grows.
    let mut xp = *x;
    for i in 1..=JET_DS {
        if i > 1 {
            xp = jet_mul(&xp, x);
        }
        for j in 0..=(JET_DS - i) {
            let b = y.coeff(i, j);
            if b.is_zero() {
                continue;
            }
            for (n, &(k, l)) in JET_MONOMIALS.iter().enumerate() {
                let xkl = xp.a[n];
                if xkl.is_zero() {
                    continue;
                }
                let (k, l) = (k as usize, l as usize);
                if k + l + j > JET_DS {
                    continue;
                }
                let t = jet_idx(k, l + j);
                out.a[t] = out.a[t].add(b.mul(xkl));
            }
        }
    }
    out
}

// ── hierarchical table build ────────────────────────────────────────────────────

/// One emitted level of the jet table. Same geometry as the BLA scaffold
/// (`compute_bla_reference_inner`): the block at slot `s` covers the `skip`
/// reference steps applied from ref index `1 + s·skip` (index 0 — the Z = 0 seed —
/// is never a block start), and the runtime lookup is slot = (ref_i − 1) / skip.
pub struct JetLevelF64 {
    pub skip: usize,
    pub entries: Vec<JetF64>,
}

/// Build the jet merge tree over a reference orbit (Z values, index 0 = initial
/// 0). All power-of-two levels are merged bottom-up — closure makes every merge
/// exact — and levels with `min_skip ≤ skip ≤ max_skip` are emitted. Callers use
/// `MIN_BLA_SKIP` / `auto_max_skip` to match the BLA table's trimming.
pub fn build_jet_levels(
    orbit: &[(f64, f64)],
    min_skip: usize,
    max_skip: usize,
) -> Vec<JetLevelF64> {
    let orbit_len = orbit.len();
    let mut out = Vec::new();
    if orbit_len < 3 {
        return out;
    }
    let mut prev: Vec<JetF64> =
        (1..orbit_len).map(|i| jet_seed(orbit[i].0, orbit[i].1)).collect();
    let mut skip = 1usize;
    if skip >= min_skip {
        out.push(JetLevelF64 { skip, entries: prev.clone() });
    }
    while skip < max_skip && skip * 2 < orbit_len {
        let n = prev.len() / 2;
        if n == 0 {
            break;
        }
        let cur: Vec<JetF64> =
            (0..n).map(|i| jet_compose(&prev[2 * i], &prev[2 * i + 1])).collect();
        skip *= 2;
        if skip >= min_skip {
            out.push(JetLevelF64 { skip, entries: cur.clone() });
        }
        prev = cur;
    }
    out
}

// ── scalar majorant (rule (V), tool 1 — the note's Lemma 2) ────────────────────

/// Exponent ceiling past which the majorant walk saturates to +∞. The ρ² term
/// doubles the exponent once ρ leaves contraction, so an unbounded walk would
/// overflow even the i64 exponent within ~60 steps; any candidate polydisc whose
/// majorant passes this ceiling is useless for radii anyway (the Cauchy tail
/// swallows the validity test).
const MAJORANT_SATURATION_LOG2: i64 = 1 << 24;
/// Saturated majorant sentinel (treated as +∞ by the (V) solver).
pub const MAJORANT_INF: CFe = CFe { x: 1.0, y: 0.0, e: i64::MAX / 2 };

#[inline]
pub fn fe_is_inf(v: &CFe) -> bool {
    v.e >= i64::MAX / 4
}

/// Real (y = 0) extended-exponent value from a log2 magnitude.
#[inline]
pub fn fe_exp2(l: f64) -> CFe {
    let e = l.floor();
    CFe { x: (l - e).exp2(), y: 0.0, e: e as i64 }
}

/// |Φ_L| majorant on the polydisc |z| ≤ R_z, |c| ≤ R_c for the block applying the
/// `skip` reference steps from ref index `first`: the scalar walk
/// ρ ← |2Z_j|·ρ + ρ² + R_c (Lemma 2). A small |2Z_j| only slows the growth — the
/// walk does NOT degenerate at near-critical steps, which is what lets rule (V)
/// subsume the guard (G). Returns MAJORANT_INF once ρ saturates.
pub fn jet_majorant(orbit: &[(f64, f64)], first: usize, skip: usize, rz: CFe, rc: CFe) -> CFe {
    let twoz: Vec<(f64, i64)> = orbit[first..first + skip]
        .iter()
        .map(|&(zx, zy)| sfe_norm(2.0 * (zx * zx + zy * zy).sqrt(), 0))
        .collect();
    jet_majorant_pre(&twoz, rz, rc)
}

// ── fast positive-real floatexp (build hot path) ───────────────────────────────
// Mantissa in [1, 2), i64 exponent; renormalization is exponent-bit surgery — no
// hypot/log2 per step. Zero is (0.0, i64::MIN/2).

#[inline(always)]
fn sfe_norm(m: f64, e: i64) -> (f64, i64) {
    if !(m > 0.0) {
        return (0.0, i64::MIN / 2);
    }
    let bits = m.to_bits();
    let be = ((bits >> 52) & 0x7ff) as i64 - 1023;
    (f64::from_bits((bits & !(0x7ffu64 << 52)) | (1023u64 << 52)), e + be)
}

// a + b for normalized positive values: align the smaller into the larger's
// frame (drop it beyond f64 significance).
#[inline(always)]
fn sfe_add(a: (f64, i64), b: (f64, i64)) -> (f64, i64) {
    let (hi, lo) = if a.1 >= b.1 { (a, b) } else { (b, a) };
    let d = hi.1 - lo.1;
    if d > 60 || lo.0 == 0.0 {
        return hi;
    }
    sfe_norm(hi.0 + lo.0 * f64::from_bits(((1023 - d) as u64) << 52), hi.1)
}

#[inline(always)]
fn sfe_from_cfe(v: &CFe) -> (f64, i64) {
    sfe_norm(v.x.hypot(v.y), v.e)
}

/// Majorant walk over precomputed |2Z_j| values (build-time hot path: the table
/// build shares one |2Z| vector across all blocks and R_z candidates).
pub fn jet_majorant_pre(twoz: &[(f64, i64)], rz: CFe, rc: CFe) -> CFe {
    let rce = sfe_from_cfe(&rc);
    let mut rho = sfe_from_cfe(&rz);
    for &(am, ae) in twoz {
        // ρ ← |2Z|·ρ + ρ² + R_c; products of normalized mantissas stay in [1, 4).
        let lin = sfe_norm(am * rho.0, ae + rho.1);
        let sq = sfe_norm(rho.0 * rho.0, 2 * rho.1);
        rho = sfe_add(sfe_add(lin, sq), rce);
        if rho.1 > MAJORANT_SATURATION_LOG2 {
            return MAJORANT_INF;
        }
    }
    if rho.0 <= 0.0 {
        return CFe::ZERO;
    }
    CFe { x: rho.0 * 0.5, y: 0.0, e: rho.1 + 1 } // mantissa back to [0.5, 1)
}

// ── rule (V): per-block bound data and radii solve ─────────────────────────────
//
// Implementation form of Definition (V). The remainder is certified in two SPLIT
// conditions rather than one joint one:
//
//   (a) z-channel — all remainder monomials with i ≥ 1, against ½ε·|a₁₀|·x.
//       Factoring one power of x/R_z out of every such monomial
//       (|a_ij| x^i c^j ≤ [|a_ij| R_z^i R_c^j]·(x/R_z)·θ^{d−1}) makes the
//       condition H_k(θ) ≤ ½ε|a₁₀|R_z with H_k MONOTONE in θ = max(x/R_z, θ_c):
//       the radius is a clean bisection, no quasi-convexity caveats.
//   (b) c-channel — the pure-c monomials (i = 0), against ½ε·|a₀₁|·c_max:
//       Σ_{d>k} |a_{0d}| c_max^d + M·θ_c^{D_s+1}/(1−θ_c) ≤ ½ε|a₀₁|c_max,
//       an x-independent gate (the ghost of (H2)).
//
// (a) ∧ (b) certifies the remainder on the whole box [0, x] × [0, c_max]
// (each mixed monomial scales at least bilinearly, each pure term at least
// linearly, both sides interpolate) — which is exactly what makes already-solved
// radii remain SOUND when c_max shrinks on zoom-in (design D6).

/// R_z candidates per block. Grid anchored on the block's own nonlinearity scale
/// |a₁₀|/|a₂₀| (where the degree-2 term catches the linear one), descending by
/// factors of 16 (a 4-rung stride-8 grid was tried to halve build cost but
/// lost ×3 of realized skip at depth — the fine grid pays for itself): near-
/// critical blocks need R_z well below min|2Z_j| (see the
/// majorant-floor note in design D5) and their anchor is already pulled down by
/// the exploding a₂₀.
pub const JET_RZ_CANDIDATES: usize = 8;

/// log2(Σ 2^l) over a slice of log2 magnitudes (−∞ entries ignored).
fn lse2(terms: &[f64]) -> f64 {
    let m = terms.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    if m == f64::NEG_INFINITY || !m.is_finite() {
        return m;
    }
    m + terms.iter().map(|l| (l - m).exp2()).sum::<f64>().log2()
}

#[derive(Clone, Copy, Debug)]
pub struct JetCandidate {
    pub log2_rz: f64,
    /// log2 of the R_c this candidate's bounds were computed with. Primary is
    /// s·c_max with s = 1024; when the majorant saturates (long blocks at a
    /// coarse c_max — the c-channel of the walk blows up), the candidate falls
    /// back to s = 32, trading zoom-out headroom for a usable bound.
    pub log2_rc: f64,
    /// log2 of the majorant M on (R_z, R_c); +∞ when the walk saturated.
    pub log2_m: f64,
    /// log2 of the C-AXIS majorant M_c = sup |Φ(0, c)| on |c| ≤ R_c. Bounds the
    /// pure-c coefficients (|a_{0j}| ≤ M_c/R_c^j) for gate (b): unlike the joint
    /// M it carries no |a₁₀|R_z part, so it scales LINEARLY with c_max and the
    /// (b) tail stays commensurate with its ½ε|a₀₁|c_max budget at any depth
    /// (with the joint M, every block died below some c_max).
    pub log2_mc: f64,
    /// log2 T_d = Σ_{i+j=d, i≥1} |a_ij| R_z^i R_c^j, d = 2..=D_s.
    pub log2_t: [f64; JET_DS - 1],
}

/// CPU-side per-block data for rule (V). Everything c_max-dependent is solved
/// from this in closed form — re-solving radii on a view change never touches
/// the orbit (design D4/D6).
#[derive(Clone, Copy, Debug)]
pub struct JetBlockBounds {
    pub log2_a10: f64,
    pub log2_a01: f64,
    /// log2 |a_{0d}|, d = 2..=D_s — pure-c stored moduli for gate (b).
    pub log2_a0: [f64; JET_DS - 1],
    pub log2_rc: f64,
    /// log2 min_j |2Z_j| over the block — folds the theorem's per-step cap
    /// |z| ≤ √ε·|2Z| into the radius.
    pub log2_min_2z: f64,
    pub cand: [JetCandidate; JET_RZ_CANDIDATES],
}

fn coeff_log2(jet: &JetF64, i: usize, j: usize) -> f64 {
    jet.coeff(i, j).log2_mag().unwrap_or(f64::NEG_INFINITY)
}

/// Build the (V) bound data for one block: one stats walk + one majorant walk per
/// R_z candidate over the block's `skip` steps, plus the per-degree modulus
/// scalars (pure log2-f64 afterwards).
pub fn jet_block_bounds(
    jet: &JetF64,
    orbit: &[(f64, f64)],
    first: usize,
    skip: usize,
    log2_rc: f64,
) -> JetBlockBounds {
    let twoz: Vec<(f64, i64)> = orbit[first..first + skip]
        .iter()
        .map(|&(zx, zy)| sfe_norm(2.0 * (zx * zx + zy * zy).sqrt(), 0))
        .collect();
    jet_block_bounds_pre(jet, &twoz, log2_rc)
}

/// `jet_block_bounds` over precomputed |2Z_j| values covering the block's steps.
pub fn jet_block_bounds_pre(jet: &JetF64, twoz: &[(f64, i64)], log2_rc: f64) -> JetBlockBounds {
    let log2_a10 = coeff_log2(jet, 1, 0);
    let log2_a20 = coeff_log2(jet, 2, 0);
    let mut log2_min_2z = f64::INFINITY;
    for &(m, e) in twoz {
        let l = if m > 0.0 { m.log2() + e as f64 } else { f64::NEG_INFINITY };
        log2_min_2z = log2_min_2z.min(l);
    }
    // Nonlinearity-scale anchor; a degenerate a10 (Z ≈ 0 block start) or a20
    // leaves radii at zero via the solve, the anchor just needs to be finite.
    let base = if log2_a10.is_finite() && log2_a20.is_finite() {
        log2_a10 - log2_a20
    } else {
        0.0
    };
    let mut cand = [JetCandidate {
        log2_rz: f64::NEG_INFINITY,
        log2_rc,
        log2_m: f64::INFINITY,
        log2_mc: f64::INFINITY,
        log2_t: [f64::NEG_INFINITY; JET_DS - 1],
    }; JET_RZ_CANDIDATES];
    // Anisotropy ladder: primary R_c = s·c_max (s = 1024), fallback s = 32 when
    // the majorant saturates at the primary (the ladder minimum also bounds the
    // zoom-out headroom the caller may assume — see ensure_jet_table).
    let ladder = [log2_rc, log2_rc - 5.0];
    // C-axis majorants per rung (z = 0 start), shared across R_z candidates.
    let mc_rung: [f64; 2] = core::array::from_fn(|i| {
        let m = jet_majorant_pre(twoz, CFe::ZERO, fe_exp2(ladder[i]));
        if fe_is_inf(&m) {
            f64::INFINITY
        } else {
            m.log2_mag().unwrap_or(f64::NEG_INFINITY)
        }
    });
    for (g, c) in cand.iter_mut().enumerate() {
        let log2_rz = base + 2.0 - 4.0 * g as f64;
        c.log2_rz = log2_rz;
        for (ri, &cand_log2_rc) in ladder.iter().enumerate() {
            let m = jet_majorant_pre(twoz, fe_exp2(log2_rz), fe_exp2(cand_log2_rc));
            if fe_is_inf(&m) || !mc_rung[ri].is_finite() {
                continue;
            }
            c.log2_rc = cand_log2_rc;
            c.log2_m = m.log2_mag().unwrap_or(f64::NEG_INFINITY);
            c.log2_mc = mc_rung[ri];
            break;
        }
        if !c.log2_m.is_finite() {
            continue; // saturated at every rung: candidate unusable
        }
        for d in 2..=JET_DS {
            let mut terms = [f64::NEG_INFINITY; JET_DS];
            for i in 1..=d {
                let j = d - i;
                terms[i - 1] = coeff_log2(jet, i, j)
                    + i as f64 * log2_rz
                    + j as f64 * c.log2_rc;
            }
            c.log2_t[d - 2] = lse2(&terms[..d]);
        }
    }
    let mut log2_a0 = [f64::NEG_INFINITY; JET_DS - 1];
    for (d, slot) in log2_a0.iter_mut().enumerate() {
        *slot = coeff_log2(jet, 0, d + 2);
    }
    JetBlockBounds {
        log2_a10,
        log2_a01: coeff_log2(jet, 0, 1),
        log2_a0,
        log2_rc,
        log2_min_2z,
        cand,
    }
}

/// Solve rule (V) for the block: log2 of the entry radii r_1..r_K (−∞ ⇒ the
/// block is never applied at that order). Closed-form from the stored bounds —
/// no orbit access — so this is also the c_max re-solve path (design D6).
pub fn jet_solve_radii(b: &JetBlockBounds, epsilon: f64, log2_c_max: f64) -> [f64; JET_K] {
    let mut radii = [f64::NEG_INFINITY; JET_K];
    if !b.log2_a10.is_finite() {
        return radii; // degenerate block (Z ≈ 0 start): never applied
    }
    let log2_half_eps = epsilon.log2() - 1.0;
    // Per-step cap |z| ≤ √ε·|2Z_j| (theorem standing hypothesis), folded in.
    let log2_cap = 0.5 * epsilon.log2() + b.log2_min_2z;
    // Per-candidate warm start: θ*_k is monotone in k (H_k only loses terms),
    // so order k+1 bisects from order k's solution.
    let mut warm = [f64::NEG_INFINITY; JET_RZ_CANDIDATES];
    for k in 1..=JET_K {
        let mut best = f64::NEG_INFINITY;
        for (ci, c) in b.cand.iter().enumerate() {
            if !c.log2_m.is_finite() {
                continue; // saturated majorant: candidate polydisc unusable
            }
            if c.log2_rz - 1.0 <= best {
                continue; // even θ = 1/2 cannot beat the current best radius
            }
            let log2_theta_c = log2_c_max - c.log2_rc;
            if log2_theta_c > -1.0 {
                continue; // θ_c > 1/2: c_max outside this candidate's headroom
            }
            // Gate (b): pure-c remainder vs ½ε|a01|·c_max.
            let theta_c = log2_theta_c.exp2();
            let mut bterms = [f64::NEG_INFINITY; JET_DS];
            for d in (k + 1)..=JET_DS {
                bterms[d - 2] = b.log2_a0[d - 2] + d as f64 * log2_c_max;
            }
            bterms[JET_DS - 1] = c.log2_mc
                + (JET_DS + 1) as f64 * log2_theta_c
                - (1.0 - theta_c).log2();
            if lse2(&bterms) > log2_half_eps + b.log2_a01 + log2_c_max {
                continue;
            }
            // Gate (a): H_k(θ) ≤ ½ε|a10|·R_z, H_k monotone increasing in θ.
            let rhs_a = log2_half_eps + b.log2_a10 + c.log2_rz;
            let h = |ltheta: f64| -> f64 {
                let theta = ltheta.exp2();
                let mut terms = [f64::NEG_INFINITY; JET_DS];
                for d in (k + 1)..=JET_DS {
                    terms[d - 2] = c.log2_t[d - 2] + (d as f64 - 1.0) * ltheta;
                }
                let phi = ((JET_DS + 2) as f64 - (JET_DS + 1) as f64 * theta)
                    / ((1.0 - theta) * (1.0 - theta));
                terms[JET_DS - 1] = c.log2_m + JET_DS as f64 * ltheta + phi.log2();
                lse2(&terms)
            };
            if h(log2_theta_c) > rhs_a {
                continue; // fails already at the smallest reachable θ
            }
            let ltheta_star = if h(-1.0) <= rhs_a {
                -1.0 // valid all the way to θ = 1/2 (the tail-formula cap)
            } else {
                let mut lo = warm[ci].max(log2_theta_c);
                let mut hi = -1.0f64;
                for _ in 0..16 {
                    let mid = 0.5 * (lo + hi);
                    if h(mid) <= rhs_a {
                        lo = mid;
                    } else {
                        hi = mid;
                    }
                }
                lo
            };
            warm[ci] = ltheta_star;
            best = best.max(c.log2_rz + ltheta_star);
        }
        radii[k - 1] = best.min(log2_cap);
    }
    radii
}

/// Evaluate the jet at (z, c), keeping terms of total degree ≤ k (the applied
/// order; k = JET_DS evaluates everything stored). Degree-major coefficient order
/// means an order-k evaluation touches only the first k(k+3)/2 slots — the same
/// prefix property the GPU layout relies on (design D1).
pub fn jet_eval(jet: &JetF64, z: CFe, c: CFe, k: usize) -> CFe {
    let k = k.min(JET_DS);
    // Powers z^i, c^j for i, j ≤ k.
    let mut zp = [CFe::ONE; JET_DS + 1];
    let mut cp = [CFe::ONE; JET_DS + 1];
    for i in 1..=k {
        zp[i] = zp[i - 1].mul(z);
        cp[i] = cp[i - 1].mul(c);
    }
    let mut acc = CFe::ZERO;
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        let (i, j) = (i as usize, j as usize);
        if i + j > k {
            break; // degree-major order: nothing of degree ≤ k remains
        }
        let a = jet.a[n];
        if a.is_zero() {
            continue;
        }
        acc = acc.add(a.mul(zp[i]).mul(cp[j]));
    }
    acc
}

/// Evaluate the jet AND its two partial derivatives at (z, c), order ≤ k:
/// (Φ, ∂Φ/∂z, ∂Φ/∂c). One pass over the same prefix; the derivative update of a
/// block application is der' = ∂Φ/∂z·der + ∂Φ/∂c (design D9), identical in shape
/// to the exact step's der ← 2(Z+z)·der + 1.
pub fn jet_eval_deriv(jet: &JetF64, z: CFe, c: CFe, k: usize) -> (CFe, CFe, CFe) {
    let k = k.min(JET_DS);
    let mut zp = [CFe::ONE; JET_DS + 1];
    let mut cp = [CFe::ONE; JET_DS + 1];
    for i in 1..=k {
        zp[i] = zp[i - 1].mul(z);
        cp[i] = cp[i - 1].mul(c);
    }
    let mut phi = CFe::ZERO;
    let mut dz = CFe::ZERO;
    let mut dc = CFe::ZERO;
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        let (i, j) = (i as usize, j as usize);
        if i + j > k {
            break;
        }
        let a = jet.a[n];
        if a.is_zero() {
            continue;
        }
        phi = phi.add(a.mul(zp[i]).mul(cp[j]));
        if i >= 1 {
            let mut t = a.mul(zp[i - 1]).mul(cp[j]);
            t.x *= i as f64;
            t.y *= i as f64;
            t.normalize();
            dz = dz.add(t);
        }
        if j >= 1 {
            let mut t = a.mul(zp[i]).mul(cp[j - 1]);
            t.x *= j as f64;
            t.y *= j as f64;
            t.normalize();
            dc = dc.add(t);
        }
    }
    (phi, dz, dc)
}

// ── GPU serialization (designs D1 + D7) ─────────────────────────────────────────

/// One shipped coefficient: (x, y)·2^e, per-coefficient exponent (spike-decided,
/// D7 — within-block spreads reach 75+ bits, no sharing is safe).
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct JetCoeffFe {
    pub x: f32,
    pub y: f32,
    pub e: i32,
}

/// Coefficients shipped to the GPU: the degree ≤ K prefix (9 at K = 3). Degrees
/// K+1..D_s are build-only (D3).
pub const JET_GPU_COEFFS: usize = JET_K * (JET_K + 3) / 2;

/// GPU radius record, 16 B (vec4-packed: r₁ r₂ r₃ + the f32-safe flag, so a
/// probe is ONE coalesced 16 B load on the GPU). The three entry radii (log2
/// domain, f32) split into their own buffer (`le buffer de rayons`): the
/// runtime descent — the per-level `max_r3` gate and the order selection —
/// reads radii ALONE, never touching the 108 B coefficient record until a
/// block is actually applied. Because radii are the only (ε, c_max)-dependent
/// data, a zoom re-solve re-uploads 16 B/block instead of the whole table
/// (design D6).
/// Radii live in log2 domain: uniform for the shallow and deep shader paths, and
/// immune to underflow at depth. −∞ (f32 NEG_INFINITY) ⇒ the order is never
/// applied.
/// `f32_safe` (1.0/0.0) rides the pad word: 1.0 ⇒ every shipped coefficient of
/// the block reconstructs exactly in plain f32 (see `jet_f32_safe`), enabling
/// the shader's shallow fast path without an extra memory read.
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct JetRadii {
    pub r_log2: [f32; JET_K],
    pub f32_safe: f32,
}

/// Largest |log2| a shipped coefficient may have for the block to qualify for
/// the shader's plain-f32 evaluation: the coefficient must reconstruct via
/// ldexp inside the f32 normal range (±126) with headroom for the Horner
/// intermediates (|dz|, |dc| < 1 on applied blocks caps their growth at a few
/// bits above the largest coefficient).
pub const JET_F32_SAFE_LOG2: f64 = 96.0;

/// True when every shipped (degree ≤ K) coefficient of the block reconstructs
/// exactly in plain f32 — the build-side gate for the shader's shallow
/// fast-path flag (`JetRadii::f32_safe`).
pub fn jet_f32_safe(jet: &JetF64) -> bool {
    jet.a[..JET_GPU_COEFFS].iter().all(|c| match c.log2_mag() {
        None => true,
        Some(l) => l.abs() <= JET_F32_SAFE_LOG2,
    })
}

/// GPU coefficient record, 108 B. The degree ≤ K prefix, degree-major, so an
/// order-k application reads only `coeffs[0 .. k(k+3)/2)` (D1): `coeffs[0]`,
/// `coeffs[1]` are the affine A/B. Orbit-keyed (independent of ε/c_max), so it is
/// serialized once per orbit and never re-uploaded on a radius re-solve. Same
/// flat block index as `JetRadii`.
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct JetCoeffs {
    pub coeffs: [JetCoeffFe; JET_GPU_COEFFS],
}

/// Level directory entry (sibling of `BlaLevel`): `max_r3_log2` is the largest
/// top-order radius of the level, the whole-level fast-reject gate.
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct JetLevel {
    pub offset: u32,
    pub count: u32,
    pub skip: u32,
    pub max_r3_log2: f32,
}

pub(crate) fn cfe_to_coeff(c: &CFe) -> JetCoeffFe {
    if c.is_zero() || c.e < -(i32::MAX as i64) / 2 {
        return JetCoeffFe { x: 0.0, y: 0.0, e: 0 };
    }
    // A saturated exponent can't be represented; the block's radii are −∞ in that
    // case anyway (saturated majorant), so the value never gets read.
    let e = c.e.clamp(-(i32::MAX as i64) / 2, (i32::MAX as i64) / 2) as i32;
    JetCoeffFe { x: c.x as f32, y: c.y as f32, e }
}

/// Serialize one block's radii (log2, f32) + its f32-safe fast-path flag.
pub fn jet_to_radii(radii_log2: &[f64; JET_K], f32_safe: bool) -> JetRadii {
    let mut r = JetRadii {
        r_log2: [f32::NEG_INFINITY; JET_K],
        f32_safe: if f32_safe { 1.0 } else { 0.0 },
    };
    for k in 0..JET_K {
        r.r_log2[k] = if radii_log2[k].is_finite() {
            radii_log2[k] as f32
        } else {
            f32::NEG_INFINITY
        };
    }
    r
}

/// Serialize one block's degree ≤ K coefficient prefix.
pub fn jet_to_coeffs(jet: &JetF64) -> JetCoeffs {
    let mut c = JetCoeffs { coeffs: [JetCoeffFe { x: 0.0, y: 0.0, e: 0 }; JET_GPU_COEFFS] };
    for (n, slot) in c.coeffs.iter_mut().enumerate() {
        *slot = cfe_to_coeff(&jet.a[n]); // degree-major prefix: same flat order
    }
    c
}

/// Serialize every block's coefficient prefix into the flat coefficient buffer.
/// Orbit-keyed: built once when the levels change, never on a radius re-solve.
/// The block ordering matches `jet_serialize_radii` exactly, so a block's
/// coefficients and radii share the same flat index.
pub fn jet_serialize_coeffs(levels: &[JetLevelF64]) -> Vec<JetCoeffs> {
    let mut coeffs = Vec::new();
    for lvl in levels {
        for jet in &lvl.entries {
            coeffs.push(jet_to_coeffs(jet));
        }
    }
    coeffs
}

/// Serialize every block's radii into the flat radius buffer + the level
/// directory (whose `max_r3` gate is a radius-derived quantity, so it is
/// re-emitted alongside the radii on every (ε, c_max) re-solve).
pub fn jet_serialize_radii(
    levels: &[JetLevelF64],
    radii: &[Vec<[f64; JET_K]>],
) -> (Vec<JetRadii>, Vec<JetLevel>) {
    let mut out = Vec::new();
    let mut dir = Vec::new();
    for (li, lvl) in levels.iter().enumerate() {
        let offset = out.len() as u32;
        let mut max_r3 = f32::NEG_INFINITY;
        for slot in 0..lvl.entries.len() {
            let r = jet_to_radii(&radii[li][slot], jet_f32_safe(&lvl.entries[slot]));
            max_r3 = max_r3.max(r.r_log2[JET_K - 1]);
            out.push(r);
        }
        dir.push(JetLevel {
            offset,
            count: lvl.entries.len() as u32,
            skip: lvl.skip as u32,
            max_r3_log2: max_r3,
        });
    }
    (out, dir)
}

// ── CPU validation harness: per-pixel loop (design D10) ────────────────────────

/// Build the (V) radii for every emitted level/block: one bounds pass + solve.
/// `log2_rc = log2(s·c_max)`. Returns log2 radii aligned with `levels`.
pub fn jet_build_radii(
    levels: &[JetLevelF64],
    orbit: &[(f64, f64)],
    log2_rc: f64,
    epsilon: f64,
    log2_c_max: f64,
) -> Vec<Vec<[f64; JET_K]>> {
    // One |2Z| vector shared by every block and R_z candidate (the walks are
    // the build's hot loop — task 8.1).
    let twoz: Vec<(f64, i64)> = orbit
        .iter()
        .map(|&(zx, zy)| sfe_norm(2.0 * (zx * zx + zy * zy).sqrt(), 0))
        .collect();
    levels
        .iter()
        .map(|lvl| {
            (0..lvl.entries.len())
                .map(|slot| {
                    let first = 1 + slot * lvl.skip;
                    let b = jet_block_bounds_pre(
                        &lvl.entries[slot],
                        &twoz[first..first + lvl.skip],
                        log2_rc,
                    );
                    jet_solve_radii(&b, epsilon, log2_c_max)
                })
                .collect()
        })
        .collect()
}

pub struct JetPixelResult {
    /// Loop turns (skip attempts + exact steps) — the wall-clock proxy.
    pub steps: usize,
    /// Iterations advanced (matches exact stepping when correct).
    pub iters: usize,
    /// Weighted ops, paper convention: exact step 2, order-k application k(k+3)/2.
    pub ops: u64,
    pub escaped: bool,
    /// Distance-estimation derivative dz/d(δc) at exit.
    pub der: (f64, f64),
    /// Full-orbit value Z_ref + dz at exit — the end-to-end error observable of
    /// Theorem 5 for non-escaping pixels.
    pub final_z: (f64, f64),
}

/// CPU port of the jet per-pixel loop (sibling of the shader loops and of the
/// Padé harness `run_pixel_cpu`): greedy on skip via the r_K gate, then smallest
/// valid order (design D2), exact-step fallback, Zhuoran rebasing. The runtime
/// validity test is the single comparison log2|dz| < r_k — no min_a/H2/beta.
pub fn jet_run_pixel(
    levels: &[JetLevelF64],
    radii: &[Vec<[f64; JET_K]>],
    orbit: &[(f64, f64)],
    dc: (f64, f64),
    max_iter: usize,
) -> JetPixelResult {
    let bailout2 = 4.0_f64;
    let orbit_len = orbit.len();
    let cfe = CFe::from_c(dc.0, dc.1);
    let mut dz = (0.0_f64, 0.0_f64);
    let mut der = (0.0_f64, 0.0_f64);
    let mut ref_i = 0usize;
    let mut iter = 0usize;
    let mut r = JetPixelResult {
        steps: 0,
        iters: 0,
        ops: 0,
        escaped: false,
        der,
        final_z: (0.0, 0.0),
    };
    while iter < max_iter {
        let mut applied = false;
        if ref_i > 0 {
            let shifted = ref_i - 1;
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            let log2_dz = if dz2 > 0.0 { 0.5 * dz2.log2() } else { f64::NEG_INFINITY };
            for (li, lvl) in levels.iter().enumerate().rev() {
                if shifted % lvl.skip != 0 {
                    continue;
                }
                let slot = shifted / lvl.skip;
                if slot >= lvl.entries.len() || ref_i + lvl.skip > max_iter {
                    continue;
                }
                let rk = &radii[li][slot];
                if !(log2_dz < rk[JET_K - 1]) {
                    continue; // level gate on the largest radius
                }
                let k = (1..=JET_K).find(|&k| log2_dz < rk[k - 1]).unwrap_or(JET_K);
                let jet = &lvl.entries[slot];
                let (phi, pdz, pdc) =
                    jet_eval_deriv(jet, CFe::from_c(dz.0, dz.1), cfe, k);
                let cand = phi.to_f64();
                let zi = orbit[ref_i + lvl.skip];
                let candz = (zi.0 + cand.0, zi.1 + cand.1);
                if lvl.skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > bailout2 {
                    continue; // don't jump over the first escape
                }
                let (px, py) = pdz.to_f64();
                let (qx, qy) = pdc.to_f64();
                der = (px * der.0 - py * der.1 + qx, px * der.1 + py * der.0 + qy);
                dz = cand;
                ref_i += lvl.skip;
                iter += lvl.skip;
                r.ops += (k * (k + 3) / 2) as u64;
                applied = true;
                break;
            }
        }
        if !applied {
            let z = orbit[ref_i];
            let fz = (z.0 + dz.0, z.1 + dz.1);
            der = (
                2.0 * (fz.0 * der.0 - fz.1 * der.1) + 1.0,
                2.0 * (fz.0 * der.1 + fz.1 * der.0),
            );
            let m2 = (2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1, 2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0);
            let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
            dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
            ref_i += 1;
            iter += 1;
            r.ops += 2;
        }
        r.steps += 1;
        if ref_i > orbit_len - 1 {
            ref_i = orbit_len - 1;
        }
        let z = orbit[ref_i];
        let full = (z.0 + dz.0, z.1 + dz.1);
        let full2 = full.0 * full.0 + full.1 * full.1;
        if full2 > bailout2 {
            r.escaped = true;
            break;
        }
        let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
        if full2 < dz2 || ref_i == orbit_len - 1 {
            dz = full; // rebasing (der unchanged: Z is dc-independent)
            ref_i = 0;
        }
        if r.steps > max_iter * 2 + 16 {
            break;
        }
    }
    let z = orbit[ref_i.min(orbit_len - 1)];
    r.final_z = (z.0 + dz.0, z.1 + dz.1);
    r.iters = iter;
    r.der = der;
    r
}

// ── tests & spike ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    type C = (f64, f64);

    fn cm(a: C, b: C) -> C {
        (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
    }

    // Dense untruncated bivariate polynomial in (z, c) — the ground truth the jet
    // is checked against. Degrees stay ≤ 8 (three exact steps), values O(1).
    #[derive(Clone)]
    struct Poly {
        t: HashMap<(usize, usize), C>,
    }

    impl Poly {
        fn z() -> Poly {
            let mut t = HashMap::new();
            t.insert((1, 0), (1.0, 0.0));
            Poly { t }
        }

        fn addm(&mut self, k: (usize, usize), v: C) {
            let e = self.t.entry(k).or_insert((0.0, 0.0));
            e.0 += v.0;
            e.1 += v.1;
        }

        fn mul(&self, o: &Poly) -> Poly {
            let mut r = Poly { t: HashMap::new() };
            for (&(i1, j1), &v1) in &self.t {
                for (&(i2, j2), &v2) in &o.t {
                    r.addm((i1 + i2, j1 + j2), cm(v1, v2));
                }
            }
            r
        }

        // w ← a·w + w² + c : one exact perturbation step applied to this poly.
        fn step(&self, a: C) -> Poly {
            let mut r = self.mul(self);
            for (&k, &v) in &self.t {
                r.addm(k, cm(a, v));
            }
            r.addm((0, 1), (1.0, 0.0));
            r
        }

        fn coeff(&self, i: usize, j: usize) -> C {
            *self.t.get(&(i, j)).unwrap_or(&(0.0, 0.0))
        }
    }

    fn assert_close(got: C, want: C, tol: f64, what: &str) {
        let d = ((got.0 - want.0).powi(2) + (got.1 - want.1).powi(2)).sqrt();
        let m = (want.0 * want.0 + want.1 * want.1).sqrt().max(1.0);
        assert!(d / m < tol, "{}: got {:?} want {:?} (rel {})", what, got, want, d / m);
    }

    // The two-step Z values used across the closure tests (arbitrary, O(1)).
    const Z1: C = (0.3, -0.4);
    const Z2: C = (-0.55, 0.2);
    const Z3: C = (0.15, 0.65);

    #[test]
    fn jet_seed_is_exact_single_step() {
        // f(z, c) = 2Z·z + z² + c has total degree 2 ≤ D_s: the seed jet IS the map.
        let s = jet_seed(Z1.0, Z1.1);
        for (z, c) in [((0.2, -0.1), (0.05, 0.03)), ((-0.7, 0.4), (0.0, 0.0)), ((1.1, 0.9), (-0.2, 0.6))] {
            let w = jet_eval(&s, CFe::from_c(z.0, z.1), CFe::from_c(c.0, c.1), JET_DS).to_f64();
            let a = (2.0 * Z1.0, 2.0 * Z1.1);
            let exact = {
                let az = cm(a, z);
                let zz = cm(z, z);
                (az.0 + zz.0 + c.0, az.1 + zz.1 + c.1)
            };
            assert_close(w, exact, 1e-14, "seed eval");
        }
    }

    #[test]
    fn jet_compose_matches_direct_expansion_two_steps() {
        // Two exact steps compose to a degree-4 polynomial ≤ D_s: the merged jet
        // must reproduce EVERY coefficient (closure with no truncation at all).
        let a1 = (2.0 * Z1.0, 2.0 * Z1.1);
        let a2 = (2.0 * Z2.0, 2.0 * Z2.1);
        let truth = Poly::z().step(a1).step(a2);
        let jet = jet_compose(&jet_seed(Z1.0, Z1.1), &jet_seed(Z2.0, Z2.1));
        for &(i, j) in JET_MONOMIALS.iter() {
            let (i, j) = (i as usize, j as usize);
            assert_close(
                jet.coeff(i, j).to_f64(),
                truth.coeff(i, j),
                1e-13,
                &format!("two-step a[{},{}]", i, j),
            );
        }
        // Paper, didactic interlude 2: closed forms of the order-2 coefficients.
        assert_close(jet.coeff(1, 0).to_f64(), cm(a2, a1), 1e-14, "A10 = a2·a1");
        assert_close(jet.coeff(0, 1).to_f64(), (a2.0 + 1.0, a2.1), 1e-14, "A01 = a2+1");
        let a1sq = cm(a1, a1);
        assert_close(jet.coeff(2, 0).to_f64(), (a2.0 + a1sq.0, a2.1 + a1sq.1), 1e-14, "A20 = a2+a1²");
        assert_close(jet.coeff(1, 1).to_f64(), (2.0 * a1.0, 2.0 * a1.1), 1e-14, "A11 = 2a1");
        assert_close(jet.coeff(0, 2).to_f64(), (1.0, 0.0), 1e-14, "A02 = 1");
    }

    #[test]
    fn jet_compose_matches_direct_expansion_three_steps() {
        // Three exact steps have degree 8 > D_s: the merged jet must equal the
        // TRUNCATION of the full polynomial — Lemma 1 (truncating before composing
        // loses nothing below degree D_s + 1).
        let a1 = (2.0 * Z1.0, 2.0 * Z1.1);
        let a2 = (2.0 * Z2.0, 2.0 * Z2.1);
        let a3 = (2.0 * Z3.0, 2.0 * Z3.1);
        let truth = Poly::z().step(a1).step(a2).step(a3);
        let j12 = jet_compose(&jet_seed(Z1.0, Z1.1), &jet_seed(Z2.0, Z2.1));
        let jet = jet_compose(&j12, &jet_seed(Z3.0, Z3.1));
        for &(i, j) in JET_MONOMIALS.iter() {
            let (i, j) = (i as usize, j as usize);
            assert_close(
                jet.coeff(i, j).to_f64(),
                truth.coeff(i, j),
                1e-12,
                &format!("three-step a[{},{}]", i, j),
            );
        }
    }

    #[test]
    fn jet_compose_is_associative_at_rounding_level() {
        // The hierarchical merge tree may associate blocks either way; closure
        // guarantees both give the jet of the same composed map.
        let s1 = jet_seed(Z1.0, Z1.1);
        let s2 = jet_seed(Z2.0, Z2.1);
        let s3 = jet_seed(Z3.0, Z3.1);
        let left = jet_compose(&jet_compose(&s1, &s2), &s3);
        let right = jet_compose(&s1, &jet_compose(&s2, &s3));
        for &(i, j) in JET_MONOMIALS.iter() {
            let (i, j) = (i as usize, j as usize);
            assert_close(
                left.coeff(i, j).to_f64(),
                right.coeff(i, j).to_f64(),
                1e-12,
                &format!("assoc a[{},{}]", i, j),
            );
        }
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
    fn jet_majorant_bounds_block_map_on_polydisc() {
        // (task 2.3) Walk the true block map w ← 2Z·w + w² + c from sampled points
        // of the polydisc boundary and interior; |w_out| must never exceed M.
        let orbit = ref_orbit_f64(-1.401155, 0.0, 4096); // near-critical passages
        assert!(orbit.len() > 4096);
        for (first, skip) in [(1usize, 16usize), (33, 64), (257, 256), (1025, 1024)] {
            // Polydisc sized so the walk stays in its linear regime: the z entry is
            // amplified by the worst PREFIX product of |2Z_j|, a c injected at step
            // t by the worst SUB-RANGE product (max drawup of acc, `skip`
            // injections), and — the subtle part, observed on Feigenbaum — the peak
            // ρ must stay below the smallest |2Z_j| of the block, else at a
            // near-critical dip ρ² outweighs |2Z|·ρ (ρ floors at ρ² + R_c instead
            // of following the product) and the majorant legitimately explodes.
            let mut acc = vec![0f64; skip + 1];
            let mut min_log2a = f64::INFINITY;
            for j in 0..skip {
                let (zx, zy) = orbit[first + j];
                let l = (2.0 * (zx * zx + zy * zy).sqrt()).log2();
                min_log2a = min_log2a.min(l);
                acc[j + 1] = acc[j] + l;
            }
            let worst_prefix = acc.iter().cloned().fold(0f64, f64::max);
            let mut min_seen = f64::INFINITY;
            let mut drawup = 0f64;
            for &a in &acc {
                min_seen = min_seen.min(a);
                drawup = drawup.max(a - min_seen);
            }
            let peak_target = min_log2a.min(0.0) - 5.0;
            let rz_mag = 2f64.powf(peak_target - worst_prefix);
            let rc_mag = 2f64.powf(peak_target - drawup - (skip as f64).log2() - 5.0);
            let rz = CFe::from_c(rz_mag, 0.0);
            let rc = CFe::from_c(rc_mag, 0.0);
            let m = jet_majorant(&orbit, first, skip, rz, rc);
            assert!(!fe_is_inf(&m), "majorant saturated at skip {}", skip);
            let m_log2 = m.log2_mag().unwrap();
            for p in 0..16 {
                let phz = p as f64 * 0.39269908; // z phase
                let phc = p as f64 * 0.61547971 + 0.3; // independent c phase
                for (fz, fc) in [(1.0, 1.0), (1.0, 0.5), (0.6, 1.0), (0.0, 1.0)] {
                    let z0 = (fz * rz_mag * phz.cos(), fz * rz_mag * phz.sin());
                    let c = (fc * rc_mag * phc.cos(), fc * rc_mag * phc.sin());
                    let mut w = CFe::from_c(z0.0, z0.1);
                    let cfe = CFe::from_c(c.0, c.1);
                    for j in 0..skip {
                        let (zx, zy) = orbit[first + j];
                        let a = CFe::from_c(2.0 * zx, 2.0 * zy);
                        w = a.mul(w).add(w.mul(w)).add(cfe);
                    }
                    if let Some(w_log2) = w.log2_mag() {
                        assert!(
                            w_log2 <= m_log2 + 1e-9,
                            "skip {} sample {}: |Φ| 2^{:.3} > M 2^{:.3}",
                            skip, p, w_log2, m_log2
                        );
                    }
                }
            }
        }
        // Monotonicity in R_z: a larger polydisc can only raise the majorant.
        let rc0 = CFe::from_c(1e-9, 0.0);
        let m1 = jet_majorant(&orbit, 1, 64, CFe::from_c(1e-7, 0.0), rc0);
        let m2 = jet_majorant(&orbit, 1, 64, CFe::from_c(1e-6, 0.0), rc0);
        assert!(m1.log2_mag().unwrap() <= m2.log2_mag().unwrap());
    }

    // Exact block walk w ← 2Z·w + w² + c in extended-exponent arithmetic.
    fn exact_block_walk(orbit: &[(f64, f64)], first: usize, skip: usize, z0: CFe, c: CFe) -> CFe {
        let mut w = z0;
        for j in 0..skip {
            let (zx, zy) = orbit[first + j];
            let a = CFe::from_c(2.0 * zx, 2.0 * zy);
            w = a.mul(w).add(w.mul(w)).add(c);
        }
        w
    }

    #[test]
    fn jet_radii_solve_sound_and_monotone() {
        // (task 2.4) For every solved radius r_k: applying the order-k jet to
        // entries |z| < r_k, |c| ≤ c_max must stay within the (V) error budget
        // ½ε(|a10||z| + |a01||c_max|) against the exact block walk; and radii are
        // monotone in the order.
        // c_max must sit ≲ ε·|a01|/|a02| for the order-1 c-channel to certify at
        // all (gate (b) — the ghost of (H2); the paper's benchmark runs at
        // |c| ≤ 1.1e-14 for ε = 1e-12). A deep-view pixel scale:
        // (+ task 3.2: swept across reference orbits with distinct dynamics,
        // and across (ε, c_max) regimes including the coarse one where the
        // anisotropy ladder's s = 32 fallback engages.)
        for (eps, c_max) in [(1e-6_f64, 1e-9_f64), (1e-4, 1e-5)] {
        let s_aniso = 1024.0_f64;
        let log2_c_max = c_max.log2();
        let log2_rc = log2_c_max + s_aniso.log2();
        for (cx, cy) in [(-1.401155_f64, 0.0_f64), (-0.75, 0.0), (-1.25, 0.0)] {
        let orbit = ref_orbit_f64(cx, cy, 4096);
        assert!(orbit.len() > 4096);
        let levels = build_jet_levels(&orbit, 4, 1 << 18);
        let mut solved = 0usize;
        let mut positive = 0usize;
        for lvl in levels.iter() {
            let step = (lvl.entries.len() / 8).max(1);
            for slot in (0..lvl.entries.len()).step_by(step) {
                let first = 1 + slot * lvl.skip;
                let jet = &lvl.entries[slot];
                let bounds = jet_block_bounds(jet, &orbit, first, lvl.skip, log2_rc);
                let radii = jet_solve_radii(&bounds, eps, log2_c_max);
                solved += 1;
                assert!(
                    radii[0] <= radii[1] + 1e-9 && radii[1] <= radii[2] + 1e-9,
                    "skip {} slot {}: radii not monotone {:?}",
                    lvl.skip, slot, radii
                );
                for (k, &log2_rk) in radii.iter().enumerate() {
                    let k = k + 1;
                    if !log2_rk.is_finite() {
                        continue;
                    }
                    positive += 1;
                    let budget_a10 = bounds.log2_a10;
                    let budget_a01 = bounds.log2_a01;
                    for (fx, fc, ph) in [
                        (0.95_f64, 1.0_f64, 0.7_f64),
                        (0.5, 1.0, 2.1),
                        (0.95, 0.125, 4.0),
                        (0.1, 1.0, 5.3),
                    ] {
                        let x_log2 = log2_rk + (fx as f64).log2();
                        let x = fe_exp2(x_log2);
                        let z = CFe { x: x.x * ph.cos(), y: x.x * ph.sin(), e: x.e };
                        let cmag = fe_exp2(log2_c_max + (fc as f64).log2());
                        let c = CFe {
                            x: cmag.x * (ph * 1.7).cos(),
                            y: cmag.x * (ph * 1.7).sin(),
                            e: cmag.e,
                        };
                        let applied = jet_eval(jet, z, c, k);
                        let exact = exact_block_walk(&orbit, first, lvl.skip, z, c);
                        let err = applied.add(CFe { x: -exact.x, y: -exact.y, e: exact.e });
                        let err_log2 = match err.log2_mag() {
                            Some(l) => l,
                            None => continue,
                        };
                        let budget = lse2(&[
                            budget_a10 + x_log2,
                            budget_a01 + log2_c_max,
                        ]) + eps.log2() - 1.0;
                        assert!(
                            err_log2 <= budget + 1e-6,
                            "skip {} slot {} k={} fx={} fc={}: err 2^{:.2} > budget 2^{:.2}",
                            lvl.skip, slot, k, fx, fc, err_log2, budget
                        );
                    }
                }
            }
        }
        println!(
            "radii solve: {} blocks sampled, {} positive (block, order) radii",
            solved, positive
        );
        // Deep regime: most sampled blocks certify. Coarse regime (c/ε ~ 0.1):
        // only short-to-mid blocks can — long ones carry genuine O(1) c-channel
        // remainders — so just require a usable population.
        let floor = if c_max <= 1e-8 { solved / 2 } else { solved / 8 };
        assert!(positive > floor, "too few positive radii ({}/{})", positive, solved);
        } // centers
        } // (eps, c_max) regimes
    }

    // Shared harness setup: bounded orbit + jet levels + (V) radii.
    fn harness(
        cx: f64,
        cy: f64,
        max_iter: usize,
        eps: f64,
        c_max: f64,
    ) -> Option<(Vec<(f64, f64)>, Vec<JetLevelF64>, Vec<Vec<[f64; JET_K]>>)> {
        let orbit = ref_orbit_f64(cx, cy, max_iter);
        if orbit.len() <= max_iter {
            return None; // escaping reference: not a perturbation use case
        }
        let levels = build_jet_levels(&orbit, 4, 1 << 18);
        let radii =
            jet_build_radii(&levels, &orbit, c_max.log2() + 10.0, eps, c_max.log2());
        Some((orbit, levels, radii))
    }

    #[test]
    fn jet_serialization_round_trip() {
        // (tasks 4.1/4.2) The GPU record must preserve the degree-major prefix
        // (coeffs[0] = a₁₀, coeffs[1] = a₀₁, …), the radii (log2, f32 rounding),
        // and every shipped coefficient within f32 mantissa tolerance.
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        let Some((_, levels, radii)) = harness(-1.401155, 0.0, 2048, eps, c_max) else {
            panic!("reference escaped");
        };
        let coeff_blocks = jet_serialize_coeffs(&levels);
        let (radii_blocks, dir) = jet_serialize_radii(&levels, &radii);
        assert_eq!(dir.len(), levels.len());
        let total_blocks = levels.iter().map(|l| l.entries.len()).sum::<usize>();
        assert_eq!(radii_blocks.len(), total_blocks);
        // Radii and coefficient buffers must stay index-aligned (same block order).
        assert_eq!(coeff_blocks.len(), radii_blocks.len());
        for (li, lvl) in levels.iter().enumerate() {
            let d = &dir[li];
            assert_eq!(d.skip as usize, lvl.skip);
            assert_eq!(d.count as usize, lvl.entries.len());
            let mut max_r3 = f32::NEG_INFINITY;
            for (slot, jet) in lvl.entries.iter().enumerate() {
                let s = &radii_blocks[d.offset as usize + slot];
                let cb = &coeff_blocks[d.offset as usize + slot];
                max_r3 = max_r3.max(s.r_log2[JET_K - 1]);
                // The f32-safe fast-path flag matches a direct recompute, and a
                // flagged block's shipped coefficients all fit the f32 range.
                assert_eq!(s.f32_safe > 0.5, jet_f32_safe(jet), "f32_safe flag mismatch");
                if s.f32_safe > 0.5 {
                    for c in &cb.coeffs {
                        assert!(
                            c.e.abs() <= 100,
                            "flagged block ships coeff exponent {}",
                            c.e
                        );
                    }
                }
                for k in 0..JET_K {
                    let want = radii[li][slot][k];
                    if want.is_finite() {
                        assert!(
                            (s.r_log2[k] as f64 - want).abs() < 1e-3,
                            "skip {} slot {} r{}: {} vs {}",
                            lvl.skip, slot, k + 1, s.r_log2[k], want
                        );
                    } else {
                        assert_eq!(s.r_log2[k], f32::NEG_INFINITY);
                    }
                }
                for (n, c) in cb.coeffs.iter().enumerate() {
                    let src = jet.a[n];
                    match src.log2_mag() {
                        None => assert_eq!((c.x, c.y), (0.0, 0.0)),
                        Some(want) => {
                            let got = (c.x as f64).hypot(c.y as f64).log2() + c.e as f64;
                            assert!(
                                (got - want).abs() < 1e-5,
                                "skip {} slot {} coeff {}: log2 {} vs {}",
                                lvl.skip, slot, n, got, want
                            );
                        }
                    }
                }
                // Prefix property: first two slots are the affine data.
                let a10 = jet.coeff(1, 0);
                assert!(
                    (cb.coeffs[0].x as f64 - a10.x).abs() < 1e-6
                        && cb.coeffs[0].e as i64 == a10.e,
                    "coeffs[0] is not a10"
                );
                assert!(!jet.coeff(0, 1).is_zero() && cb.coeffs[1].e as i64 == jet.coeff(0, 1).e);
            }
            assert_eq!(d.max_r3_log2, max_r3, "level {} max_r3 directory", li);
        }
    }

    #[test]
    fn jet_full_loop_matches_exact_stepping() {
        // (task 3.1) The adaptive-order jet loop must reach the same iteration
        // count and escape verdict as pure exact perturbation stepping, while
        // actually exercising skips.
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        let max_iter = 3000usize;
        for (name, cx, cy) in
            [("cusp", -0.75_f64, 0.0_f64), ("period2", -1.25, 0.0), ("feigenbaum", -1.401155, 0.0)]
        {
            let Some((orbit, levels, radii)) = harness(cx, cy, max_iter, eps, c_max) else {
                println!("[{}] escaped — skipped", name);
                continue;
            };
            let n = 64usize;
            let (mut steps_exact, mut steps_jet, mut skipped_px, mut mismatches) =
                (0u64, 0u64, 0usize, 0usize);
            for kpx in 0..n {
                let t = (kpx as f64 / n as f64) * 2.0 - 1.0;
                let dc = (t * c_max * 0.7, 0.37 * t * c_max);
                let exact = jet_run_pixel(&[], &[], &orbit, dc, max_iter);
                let jetr = jet_run_pixel(&levels, &radii, &orbit, dc, max_iter);
                steps_exact += exact.steps as u64;
                steps_jet += jetr.steps as u64;
                if jetr.steps < exact.steps {
                    skipped_px += 1;
                }
                if jetr.iters != exact.iters || jetr.escaped != exact.escaped {
                    mismatches += 1;
                }
            }
            println!(
                "[{}] steps exact={} jet={} (x{:.1}) | pixels skipping={} mismatches={}",
                name,
                steps_exact,
                steps_jet,
                steps_exact as f64 / steps_jet.max(1) as f64,
                skipped_px,
                mismatches
            );
            assert_eq!(mismatches, 0, "[{}] jet loop diverged from exact", name);
            assert!(
                skipped_px > n / 2,
                "[{}] jet blocks barely used ({}/{} pixels)",
                name, skipped_px, n
            );
        }
    }

    #[test]
    fn jet_prop6_oracle_near_critical_r1_zero() {
        // (task 3.3) Prop. 6: on blocks straddling a near-critical reference step
        // (where today's min_a guard fires), the order-1 radius collapses to zero
        // while some higher order stays usable. Guard condition (shader):
        // log2 min|2Z| < log2 μ = ½(log2 c_max − log2 ε).
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        let log2_c_max = c_max.log2();
        let log2_mu = 0.5 * (log2_c_max - eps.log2());
        let orbit = ref_orbit_f64(-1.401155, 0.0, 4096);
        assert!(orbit.len() > 4096);
        let levels = build_jet_levels(&orbit, 4, 1 << 18);
        let radii = jet_build_radii(&levels, &orbit, log2_c_max + 10.0, eps, log2_c_max);
        // (G) is a conservative HEURISTIC; (V) is a computed radius. The oracle
        // therefore checks protection, not conservatism: on most guarded blocks
        // r₁ collapses to zero, and wherever (V) still admits order 1 the
        // application must verifiably stay inside the ε budget.
        let (mut guarded, mut guarded_r1_zero, mut guarded_high_pass) = (0usize, 0usize, 0usize);
        let mut disputed_checked = 0usize;
        for (li, lvl) in levels.iter().enumerate() {
            for slot in 0..lvl.entries.len() {
                let first = 1 + slot * lvl.skip;
                let min_log2_2z = (0..lvl.skip)
                    .map(|j| {
                        let (zx, zy) = orbit[first + j];
                        (2.0 * (zx * zx + zy * zy).sqrt()).log2()
                    })
                    .fold(f64::INFINITY, f64::min);
                if min_log2_2z >= log2_mu {
                    continue; // guard (G) would not fire here
                }
                guarded += 1;
                let rk = &radii[li][slot];
                if rk[1].is_finite() || rk[2].is_finite() {
                    guarded_high_pass += 1;
                }
                if !rk[0].is_finite() {
                    guarded_r1_zero += 1;
                    continue;
                }
                // Disputed block: (G) fires, (V) admits order 1 — verify the
                // order-1 application against the exact walk at |z| = 0.9·r₁.
                let jet = &lvl.entries[slot];
                let x = fe_exp2(rk[0] - 0.152); // ×0.9
                let z = CFe { x: x.x * 0.28, y: -x.x * 0.96, e: x.e };
                let c = CFe::from_c(0.6 * c_max, 0.8 * c_max);
                let applied = jet_eval(jet, z, c, 1);
                let exact = exact_block_walk(&orbit, first, lvl.skip, z, c);
                let err = applied.add(CFe { x: -exact.x, y: -exact.y, e: exact.e });
                if let Some(err_log2) = err.log2_mag() {
                    let budget = lse2(&[
                        coeff_log2(jet, 1, 0) + rk[0] - 0.152,
                        coeff_log2(jet, 0, 1) + log2_c_max,
                    ]) + eps.log2() - 1.0;
                    assert!(
                        err_log2 <= budget + 1e-6,
                        "skip {} slot {}: disputed order-1 application UNSOUND \
                         (err 2^{:.2} > budget 2^{:.2})",
                        lvl.skip, slot, err_log2, budget
                    );
                }
                disputed_checked += 1;
            }
        }
        println!(
            "guarded blocks={} | r1=0 on {} | disputed-but-sound {} | order ≥2 passes on {}",
            guarded, guarded_r1_zero, disputed_checked, guarded_high_pass
        );
        assert!(guarded > 0, "no near-critical blocks found — oracle vacuous");
        assert!(
            guarded_r1_zero * 2 > guarded,
            "(V) rediscovers the guard on too few blocks ({}/{})",
            guarded_r1_zero, guarded
        );
        assert!(
            guarded_high_pass > 0,
            "no higher order passes through any near-critical block"
        );
    }

    #[test]
    fn jet_block_derivative_matches_exact_walk() {
        // (task 3.4) der' = ∂Φ/∂z·der + ∂Φ/∂c from the stored coefficients must
        // match the exact per-step derivative recurrence dw'/dc = 2(Z+w)·dw/dc + 1
        // across admitted blocks. Tolerance: the (V) budget certifies Φ, its
        // z-derivative loses one power of the radius margin (Cauchy), so we test
        // at |z| = r_k/2 with a 100ε ceiling.
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        let Some((orbit, levels, radii)) = harness(-1.401155, 0.0, 4096, eps, c_max) else {
            panic!("reference escaped");
        };
        let mut checked = 0usize;
        for (li, lvl) in levels.iter().enumerate() {
            let step = (lvl.entries.len() / 6).max(1);
            for slot in (0..lvl.entries.len()).step_by(step) {
                let rk = &radii[li][slot];
                for k in 1..=JET_K {
                    let log2_rk = rk[k - 1];
                    if !log2_rk.is_finite() {
                        continue;
                    }
                    let first = 1 + slot * lvl.skip;
                    let x = fe_exp2(log2_rk - 1.0); // |z| = r_k / 2
                    let z = CFe { x: x.x * 0.6, y: x.x * 0.8, e: x.e };
                    let c = CFe::from_c(0.3 * c_max, -0.4 * c_max);
                    let der_in = (0.7_f64, -0.3_f64);
                    // Jet-side update.
                    let (_, pdz, pdc) = jet_eval_deriv(&lvl.entries[slot], z, c, k);
                    let (px, py) = pdz.to_f64();
                    let (qx, qy) = pdc.to_f64();
                    let jet_der = (
                        px * der_in.0 - py * der_in.1 + qx,
                        px * der_in.1 + py * der_in.0 + qy,
                    );
                    // Exact walk: w and dw/dc together.
                    let mut w = z;
                    let mut der = CFe::from_c(der_in.0, der_in.1);
                    for j in 0..lvl.skip {
                        let (zx, zy) = orbit[first + j];
                        let fz = CFe::from_c(zx, zy).add(w);
                        let two_fz = CFe { x: 2.0 * fz.x, y: 2.0 * fz.y, e: fz.e };
                        der = two_fz.mul(der).add(CFe::ONE);
                        let a = CFe::from_c(2.0 * zx, 2.0 * zy);
                        w = a.mul(w).add(w.mul(w)).add(c);
                    }
                    let (ex, ey) = der.to_f64();
                    let diff = ((jet_der.0 - ex).powi(2) + (jet_der.1 - ey).powi(2)).sqrt();
                    let mag = (ex * ex + ey * ey).sqrt().max(1e-300);
                    assert!(
                        diff / mag < 100.0 * eps,
                        "skip {} slot {} k={}: der rel err {:.2e}",
                        lvl.skip, slot, k, diff / mag
                    );
                    checked += 1;
                }
            }
        }
        println!("derivative checked on {} (block, order) pairs", checked);
        assert!(checked > 20, "too few admitted blocks exercised ({})", checked);
    }

    #[test]
    fn jet_end_to_end_error_within_theorem_bound() {
        // (task 3.5) Non-escaping pixels run to N iterations: final relative error
        // vs exact stepping must sit within the Theorem-5 bound e·N·ε.
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        let max_iter = 3000usize;
        for (name, cx, cy) in
            [("cusp", -0.75_f64, 0.0_f64), ("period2", -1.25, 0.0), ("feigenbaum", -1.401155, 0.0)]
        {
            let Some((orbit, levels, radii)) = harness(cx, cy, max_iter, eps, c_max) else {
                println!("[{}] escaped — skipped", name);
                continue;
            };
            let bound = core::f64::consts::E * max_iter as f64 * eps;
            let mut worst = 0f64;
            let mut compared = 0usize;
            for kpx in 0..48 {
                let t = (kpx as f64 / 48.0) * 2.0 - 1.0;
                let dc = (t * c_max * 0.7, 0.29 * t * c_max);
                let exact = jet_run_pixel(&[], &[], &orbit, dc, max_iter);
                let jetr = jet_run_pixel(&levels, &radii, &orbit, dc, max_iter);
                if exact.escaped || jetr.escaped {
                    continue;
                }
                let (ex, ey) = exact.final_z;
                let (jx, jy) = jetr.final_z;
                let mag = (ex * ex + ey * ey).sqrt().max(1e-300);
                let rel = ((jx - ex).powi(2) + (jy - ey).powi(2)).sqrt() / mag;
                worst = worst.max(rel);
                compared += 1;
                assert!(
                    rel <= bound,
                    "[{}] pixel {}: rel err {:.3e} > e·N·ε = {:.3e}",
                    name, kpx, rel, bound
                );
            }
            println!(
                "[{}] {} non-escaping pixels, worst rel err {:.3e} (bound {:.3e}, ratio {:.4})",
                name, compared, worst, bound, worst / bound
            );
            assert!(compared > 10, "[{}] too few non-escaping pixels", name);
        }
    }

    #[test]
    fn jet_levels_match_direct_seed_chain_and_bla_geometry() {
        // (task 2.2) A level-ℓ block must equal the left-to-right composition of
        // its `skip` seeds (any bracketing — associativity is tested separately),
        // and the level shapes must mirror the BLA scaffold: entries = prev/2,
        // slot s covering ref steps [1 + s·skip, 1 + (s+1)·skip).
        let orbit = ref_orbit_f64(-1.25, 0.0, 512);
        assert!(orbit.len() > 512, "reference must be bounded");
        let levels = build_jet_levels(&orbit, 4, 1 << 18);
        assert_eq!(levels[0].skip, 4);
        let mut expect_count = (orbit.len() - 1) / 2 / 2; // two merges below skip 4
        for lvl in &levels {
            assert_eq!(lvl.entries.len(), expect_count, "count at skip {}", lvl.skip);
            expect_count /= 2;
        }
        // Spot-check blocks across levels against the direct seed chain.
        for lvl in &levels {
            for slot in [0usize, lvl.entries.len().saturating_sub(1)] {
                let first = 1 + slot * lvl.skip;
                let mut direct = jet_seed(orbit[first].0, orbit[first].1);
                for i in 1..lvl.skip {
                    let z = orbit[first + i];
                    direct = jet_compose(&direct, &jet_seed(z.0, z.1));
                }
                let block = &lvl.entries[slot];
                for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
                    let (g, w) = (block.a[n], direct.a[n]);
                    match (g.log2_mag(), w.log2_mag()) {
                        (None, None) => {}
                        (Some(_), Some(we)) => {
                            let diff = g.add(CFe { x: -w.x, y: -w.y, e: w.e });
                            let derr = diff.log2_mag().unwrap_or(f64::NEG_INFINITY);
                            assert!(
                                derr < we - 35.0,
                                "skip {} slot {} a[{},{}]: rel err 2^{:.0}",
                                lvl.skip, slot, i, j, derr - we
                            );
                        }
                        _ => panic!("skip {} slot {} a[{},{}]: zero mismatch", lvl.skip, slot, i, j),
                    }
                }
            }
        }
    }

    // ── Diagnostic: radii census at user-realistic (ε, c_max) ────────────────────
    // Fraction of (block, order) radii that are usable at each view scale. If
    // r_k = −∞ across the board at interactive scales, jet mode silently renders
    // as exact perturbation (no skips), which is what field testing reported.
    #[test]
    fn jet_radii_census_at_user_scales() {
        let orbit = ref_orbit_f64(-1.401155, 0.0, 8192);
        assert!(orbit.len() > 8192);
        let levels = build_jet_levels(&orbit, 4, 1 << 18);
        let total: usize = levels.iter().map(|l| l.entries.len()).sum();
        for eps in [1e-4_f64, 1e-6] {
            for c_max in [1e-3_f64, 1e-5, 1e-9, 1e-12, 1e-51] {
                let log2_c_max = c_max.log2();
                let radii =
                    jet_build_radii(&levels, &orbit, log2_c_max + 10.0, eps, log2_c_max);
                let mut fin = [0usize; JET_K];
                let mut skip_weighted = 0u64;
                let mut skip_total = 0u64;
                for (li, lvl) in levels.iter().enumerate() {
                    for r in &radii[li] {
                        for k in 0..JET_K {
                            if r[k].is_finite() {
                                fin[k] += 1;
                            }
                        }
                        skip_total += lvl.skip as u64;
                        if r[JET_K - 1].is_finite() {
                            skip_weighted += lvl.skip as u64;
                        }
                    }
                }
                println!(
                    "eps={:>7.0e} c_max={:>7.0e}: r1 {:>5.1}% r2 {:>5.1}% r3 {:>5.1}% | skip-weighted usable {:>5.1}%",
                    eps,
                    c_max,
                    100.0 * fin[0] as f64 / total as f64,
                    100.0 * fin[1] as f64 / total as f64,
                    100.0 * fin[2] as f64 / total as f64,
                    100.0 * skip_weighted as f64 / skip_total as f64,
                );
            }
        }
    }

    // ── Diagnostic: which (V) gate kills blocks at user-realistic settings ──────
    #[test]
    fn jet_gate_failure_census() {
        let eps = 1e-4_f64;
        let c_max = 1e-5_f64;
        let log2_c_max = c_max.log2();
        let log2_rc = log2_c_max + 10.0;
        let orbit = ref_orbit_f64(-0.75, 0.0, 4096); // cusp: worst observed regime
        assert!(orbit.len() > 4096);
        let levels = build_jet_levels(&orbit, 4, 1 << 18);
        let k = JET_K; // top order
        println!("gate failure census at eps={:e} c_max={:e} (order {})", eps, c_max, k);
        for lvl in &levels {
            let (mut ok, mut sat, mut gate_b, mut gate_a, mut cap0) = (0, 0, 0, 0, 0);
            for slot in 0..lvl.entries.len() {
                let first = 1 + slot * lvl.skip;
                let b = jet_block_bounds(&lvl.entries[slot], &orbit, first, lvl.skip, log2_rc);
                let r = jet_solve_radii(&b, eps, log2_c_max);
                if r[k - 1].is_finite() {
                    ok += 1;
                    continue;
                }
                if b.cand.iter().all(|c| !c.log2_m.is_finite()) {
                    sat += 1;
                    continue;
                }
                // Re-check gate (b) with the best (smallest-M) candidate.
                let log2_theta_c = log2_c_max - b.log2_rc;
                let theta_c = log2_theta_c.exp2();
                let best_m = b
                    .cand
                    .iter()
                    .filter(|c| c.log2_m.is_finite())
                    .map(|c| c.log2_m)
                    .fold(f64::INFINITY, f64::min);
                let mut bterms = [f64::NEG_INFINITY; JET_DS];
                for d in (k + 1)..=JET_DS {
                    bterms[d - 2] = b.log2_a0[d - 2] + d as f64 * log2_c_max;
                }
                bterms[JET_DS - 1] =
                    best_m + (JET_DS + 1) as f64 * log2_theta_c - (1.0 - theta_c).log2();
                if lse2(&bterms) > eps.log2() - 1.0 + b.log2_a01 + log2_c_max {
                    gate_b += 1;
                } else if 0.5 * eps.log2() + b.log2_min_2z == f64::NEG_INFINITY {
                    cap0 += 1;
                } else {
                    gate_a += 1;
                }
            }
            println!(
                "  skip {:>5}: ok {:>4} | all-saturated {:>4} | gate-b {:>4} | gate-a {:>4} | cap {:>2}  (of {})",
                lvl.skip, ok, sat, gate_b, gate_a, cap0,
                lvl.entries.len()
            );
        }
    }

    // ── Diagnostic: applied-skip histogram, jet loop at user settings ────────────
    #[test]
    fn jet_skip_histogram_at_user_scales() {
        let eps = 1e-4_f64;
        let c_max = 1e-5_f64;
        let max_iter = 3000usize;
        let Some((orbit, levels, radii)) = harness(-0.75, 0.0, max_iter, eps, c_max) else {
            panic!("escaped");
        };
        let mut hist = std::collections::BTreeMap::<usize, u64>::new();
        let mut exact_steps = 0u64;
        for kpx in 0..32 {
            let t = (kpx as f64 / 32.0) * 2.0 - 1.0;
            let dc = (t * c_max * 0.7, 0.37 * t * c_max);
            // Re-run the loop manually to log applied skips.
            let bailout2 = 4.0_f64;
            let cfe = CFe::from_c(dc.0, dc.1);
            let (mut dz, mut ref_i, mut iter, mut steps) = ((0.0_f64, 0.0_f64), 0usize, 0usize, 0usize);
            while iter < max_iter {
                let mut applied = false;
                if ref_i > 0 {
                    let shifted = ref_i - 1;
                    let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                    let log2_dz = if dz2 > 0.0 { 0.5 * dz2.log2() } else { f64::NEG_INFINITY };
                    for (li, lvl) in levels.iter().enumerate().rev() {
                        if shifted % lvl.skip != 0 { continue; }
                        let slot = shifted / lvl.skip;
                        if slot >= lvl.entries.len() || ref_i + lvl.skip > max_iter { continue; }
                        let rk = &radii[li][slot];
                        if !(log2_dz < rk[JET_K - 1]) { continue; }
                        let k = (1..=JET_K).find(|&k| log2_dz < rk[k - 1]).unwrap_or(JET_K);
                        let cand = jet_eval(&lvl.entries[slot], CFe::from_c(dz.0, dz.1), cfe, k).to_f64();
                        let zi = orbit[ref_i + lvl.skip];
                        let candz = (zi.0 + cand.0, zi.1 + cand.1);
                        if lvl.skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > bailout2 { continue; }
                        *hist.entry(lvl.skip).or_insert(0) += 1;
                        dz = cand;
                        ref_i += lvl.skip;
                        iter += lvl.skip;
                        applied = true;
                        break;
                    }
                }
                if !applied {
                    let z = orbit[ref_i];
                    let m2 = (2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1, 2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0);
                    let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                    dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                    ref_i += 1;
                    iter += 1;
                    exact_steps += 1;
                }
                steps += 1;
                if ref_i > orbit.len() - 1 { ref_i = orbit.len() - 1; }
                let z = orbit[ref_i];
                let full = (z.0 + dz.0, z.1 + dz.1);
                let full2 = full.0 * full.0 + full.1 * full.1;
                if full2 > bailout2 { break; }
                let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                if full2 < dz2 || ref_i == orbit.len() - 1 { dz = full; ref_i = 0; }
                if steps > max_iter * 2 + 16 { break; }
            }
        }
        println!("jet applied-skip histogram (eps=1e-4, c_max=1e-5, cusp): exact={}", exact_steps);
        for (skip, n) in &hist {
            println!("  skip {:>5}: {:>7} applications ({} iters)", skip, n, *n * *skip as u64);
        }
    }

    // ── Build-time benchmark (task 8.1) — run with: cargo test --release
    //    jet_build_time_benchmark -- --ignored --nocapture ─────────────────────────
    #[test]
    #[ignore]
    fn jet_build_time_benchmark() {
        use std::time::Instant;
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        let log2_c_max = c_max.log2();
        let log2_rc = log2_c_max + 10.0;
        for len in [1usize << 15, 1 << 17, 1 << 20] {
            let orbit = ref_orbit_f64(-1.25, 0.0, len); // bounded at any length
            assert!(orbit.len() > len);
            let t0 = Instant::now();
            let levels = build_jet_levels(&orbit, 4, 1 << 18);
            let t_merge = t0.elapsed();
            let t1 = Instant::now();
            let radii = jet_build_radii(&levels, &orbit, log2_rc, eps, log2_c_max);
            let t_radii = t1.elapsed();
            let t2 = Instant::now();
            let coeffs = jet_serialize_coeffs(&levels);
            let (_radii, _dir) = jet_serialize_radii(&levels, &radii);
            let t_ser = t2.elapsed();
            println!(
                "orbit {:>8}: merges {:>7.1?} | bounds+radii {:>7.1?} | serialize {:>6.1?} | blocks {}",
                len, t_merge, t_radii, t_ser, coeffs.len()
            );
        }
    }

    // ── Spike (task 1.1): per-coefficient exponent dynamics on real orbits ──────
    // Measures, per level and per total-degree group, the worst within-block
    // exponent spread (bits between the largest and smallest nonzero |a_ij| of the
    // same degree) and the global exponent range. Decision input for D7: a shared
    // f32-mantissa group exponent loses coefficients whose spread exceeds ~24 bits.
    #[test]
    fn jet_exponent_spike() {
        let centers: [(&str, f64, f64, usize); 4] = [
            ("cusp-near-parabolic", -0.75, 0.0, 1 << 15),
            ("period2-bulb", -1.25, 0.0, 1 << 15),
            ("seahorse-edge", -0.745, 0.113, 1 << 15),
            ("feigenbaum-long", -1.401155, 0.0, 1 << 17),
        ];
        for (name, cx, cy, len) in centers {
            let orbit = ref_orbit_f64(cx, cy, len);
            if orbit.len() <= len {
                println!("\n[{}] escaped at {} — skipped", name, orbit.len() - 1);
                continue;
            }
            let levels = build_jet_levels(&orbit, 2, 1 << 18);
            println!(
                "\n[{}] orbit_len={} levels={} (top skip {})",
                name,
                orbit.len(),
                levels.len(),
                levels.last().map(|l| l.skip).unwrap_or(0)
            );
            println!(
                "   {:>7} {:>7} | worst within-block spread per degree (bits) | e-range (log2)",
                "skip", "blocks"
            );
            let mut worst_shared_group = 0f64; // worst degree-group spread anywhere
            let mut worst_block_all = 0f64; // worst whole-block spread anywhere
            for lvl in &levels {
                let (skip, entries) = (&lvl.skip, &lvl.entries);
                let mut spread_by_deg = [0f64; JET_DS]; // [d-1]
                let mut emin = f64::INFINITY;
                let mut emax = f64::NEG_INFINITY;
                let mut zeros = 0usize;
                for jet in entries {
                    let mut blk_min = f64::INFINITY;
                    let mut blk_max = f64::NEG_INFINITY;
                    for d in 1..=JET_DS {
                        let mut lo = f64::INFINITY;
                        let mut hi = f64::NEG_INFINITY;
                        for j in 0..=d {
                            match jet.coeff(d - j, j).log2_mag() {
                                Some(e) => {
                                    lo = lo.min(e);
                                    hi = hi.max(e);
                                    emin = emin.min(e);
                                    emax = emax.max(e);
                                    blk_min = blk_min.min(e);
                                    blk_max = blk_max.max(e);
                                }
                                None => zeros += 1,
                            }
                        }
                        if hi > lo {
                            spread_by_deg[d - 1] = spread_by_deg[d - 1].max(hi - lo);
                        }
                    }
                    if blk_max > blk_min {
                        worst_block_all = worst_block_all.max(blk_max - blk_min);
                    }
                }
                for s in spread_by_deg {
                    worst_shared_group = worst_shared_group.max(s);
                }
                println!(
                    "   {:>7} {:>7} | d1:{:>6.0} d2:{:>6.0} d3:{:>6.0} d4:{:>6.0} d5:{:>6.0} d6:{:>6.0} | [{:>9.0}, {:>9.0}] zeros={}",
                    skip,
                    entries.len(),
                    spread_by_deg[0],
                    spread_by_deg[1],
                    spread_by_deg[2],
                    spread_by_deg[3],
                    spread_by_deg[4],
                    spread_by_deg[5],
                    emin,
                    emax,
                    zeros
                );
            }
            println!(
                "   -> worst within-block DEGREE-GROUP spread: {:.0} bits (f32 shared-exp budget ~24)",
                worst_shared_group
            );
            println!(
                "   -> worst within-block WHOLE-BLOCK spread:  {:.0} bits",
                worst_block_all
            );
            // Sanity: a₁₀ of the top-level block is the product of the 2Z_k — cross
            // check its log2 against a directly accumulated sum of logs.
            if let Some(JetLevelF64 { skip, entries }) = levels.last() {
                if let Some(e10) = entries[0].coeff(1, 0).log2_mag() {
                    let direct: f64 = (1..=*skip)
                        .map(|i| {
                            let (zx, zy) = orbit[i];
                            (2.0 * (zx * zx + zy * zy).sqrt()).log2()
                        })
                        .sum();
                    assert!(
                        (e10 - direct).abs() < 1e-3 * direct.abs().max(1.0),
                        "[{}] a10 log2 {} vs direct {}",
                        name,
                        e10,
                        direct
                    );
                }
                for jet in entries {
                    for c in &jet.a {
                        assert!(
                            c.x.is_finite() && c.y.is_finite() && c.e < i64::MAX / 4,
                            "[{}] non-finite coefficient at top level",
                            name
                        );
                    }
                }
            }
        }
    }
}
