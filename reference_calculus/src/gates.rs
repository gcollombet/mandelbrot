// Parabolic Fatou gates (findings §18, round 8 — build side + runtime model).
//
// The round-6/7 residue: coarse cusp/period2 regimes saturate the Möbius
// majorant (quasi-parabolic slow transit) — no rational/polynomial block form
// certifies them. The gate accelerator fast-forwards the transit through the
// SECTORIAL FATOU COORDINATE of the return map: Ψ∘F = Ψ + 1, so k returns are
// one translation + Ψ⁻¹. The CPU prototype (mobius.rs,
// fatou_gate_prototype_pixel_loop) delivered cusp 0.71× / period2 0.37× Padé
// with exact escape parity; this module is the production build path and the
// CPU model of the GPU runtime.
//
// Key design facts (measured in phase 0, mobius.rs census):
// - Ψ = partial fractions of the FORMAL LOG of the return map (Lie-series
//   fixed point). P = F − id has an irreducible ½PP′ residual floor
//   (1.2e-3/1.1e-2 per step); the formal log's corrections are the
//   iterative-residue terms of the Écalle–Voronin normalization.
// - The record ships ANALYTIC-in-dc data only: the coalescing root pair
//   ~ ±√dc is NOT analytic, so roots are solved at runtime (quadratic seed +
//   Newton on the shipped P(dc) — ~500 flops per pixel·phase). β_j(dc), the
//   P coefficients and the far-root seeds ARE analytic (the persistent cycle
//   multiplier stays away from 1 — that is why the recentering works).
// - κ̃(0) = 0 EXACTLY at the parabolic parameter, so Taylor-in-dc factors the
//   degeneracy: the shipped linear/quadratic coefficients are O(1) and the
//   f32-mantissa record keeps κ̃ to ~6e-8 relative at any |dc| ≤ r_dc.
// - u is formed as d_n + dz − Δβ_j(dc) with d_n = Z_n − β_j(c₀) precomputed
//   in f64 (small-quantity channel: no Z − β cancellation at runtime).
// - Certification is a MEASURED sup of the conjugacy residual |Ψ∘F − Ψ − 1|
//   per annulus band, on the QUANTIZED record (everything the runtime does,
//   including the Taylor evaluation and the runtime root solve, sits inside
//   the measured object), ×2 margin. The runtime accumulates the per-band
//   budget along the hop path and refuses the jump when
//   budget·|P(u_end)/u_end| > ε/2 — this SUBSUMES the per-gate entry radius
//   (a too-far entry fails its own budget and falls back to iteration).
// - Systematic fallback: no gate, |dc| > r_dc, degenerate roots, failed
//   Newton, refused budget, k < 2 → the ordinary certified loop. The gate is
//   never load-bearing for soundness.
//
// Scope: q = 2 returns (period-doubling gates — both census regimes; the
// detector refuses other q). f64 build with an f64 reference c: the deep-zoom
// (perturbed-reference) build variant belongs to the GPU wiring round.

#![allow(dead_code)] // consumed progressively by the §18 wiring tasks

use crate::jet::{jet_compose, jet_seed};

type C = (f64, f64);

// ── complex helpers ─────────────────────────────────────────────────────────────

fn cm(a: C, b: C) -> C {
    (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
}

fn cdiv(a: C, b: C) -> C {
    let d = b.0 * b.0 + b.1 * b.1;
    ((a.0 * b.0 + a.1 * b.1) / d, (a.1 * b.0 - a.0 * b.1) / d)
}

fn cadd(a: C, b: C) -> C {
    (a.0 + b.0, a.1 + b.1)
}

fn csub(a: C, b: C) -> C {
    (a.0 - b.0, a.1 - b.1)
}

fn cabs(z: C) -> f64 {
    (z.0 * z.0 + z.1 * z.1).sqrt()
}

fn csqrt(z: C) -> C {
    let r = cabs(z);
    if r == 0.0 {
        return (0.0, 0.0);
    }
    let re = ((r + z.0) * 0.5).sqrt();
    let im = ((r - z.0) * 0.5).sqrt();
    (re, if z.1 >= 0.0 { im } else { -im })
}

fn clog(z: C) -> C {
    (cabs(z).ln(), z.1.atan2(z.0))
}

/// Σ p[k]·u^k (Horner).
fn poly_eval(p: &[C], u: C) -> C {
    let mut acc = (0.0, 0.0);
    for c in p.iter().rev() {
        acc = cadd(cm(acc, u), *c);
    }
    acc
}

// ── gate record ─────────────────────────────────────────────────────────────────

/// P coefficients kept (coeff of u^{k+1} of the log-flow, k = 0..GATE_DEG).
pub const GATE_DEG: usize = 8;
/// Annulus bands for the certified residual: (r/2, r], (r/4, r/2],
/// (r/8, r/4], (0, r/8].
pub const GATE_BANDS: usize = 4;
/// Taylor order in dc (value, linear, quadratic).
pub const GATE_TAYLOR: usize = 3;

#[derive(Clone, Debug)]
pub struct Gate {
    /// Reference-orbit span covered, [start, start + len).
    pub start: usize,
    pub len: usize,
    /// Persistent-cycle period and return multiplicity (m = p·q steps).
    pub p: usize,
    pub q: usize,
    /// Entry radius in |u| and dc validity radius of the Taylor data.
    pub r_entry: f64,
    pub r_dc: f64,
    /// Certified (measured ×2, upward-rounded) per-F-step conjugacy residual
    /// sup per annulus band.
    pub eps_band: [f64; GATE_BANDS],
    /// Per phase j: Taylor of β_j(dc) (index 0 = β_j(c₀), used only on the
    /// build side — the runtime uses d[] + the Taylor tail Δβ_j).
    pub beta: Vec<[C; GATE_TAYLOR]>,
    /// Per phase j: Taylor of the log-flow coefficients p_k(dc)
    /// (p_k = coeff of u^{k+1} of P).
    pub pc: Vec<[[C; GATE_TAYLOR]; GATE_DEG]>,
    /// Per phase j: far-root seeds at dc = 0 (runtime Newton-polishes them on
    /// the pixel's P(dc), so seed accuracy is uncritical).
    pub far: Vec<Vec<C>>,
    /// Per span index n − start: d_n = Z_n − β_{(n−start) mod p}(c₀),
    /// precomputed in f64 (the runtime never forms Z − β).
    pub d: Vec<C>,
}

impl Gate {
    pub fn m(&self) -> usize {
        self.p * self.q
    }
}

// ── detection (phase-0 detector, productionized) ────────────────────────────────

const SPAN_MIN: usize = 64;
const RET_TOL2: f64 = 0.05 * 0.05;
const MULT_TOL: f64 = 0.25;
const GAP_TOL: f64 = 0.05;
const PETAL_TOL: f64 = 1e-2;
const PERIOD_TOL: f64 = 0.2;

/// Stage 1 per index: the return length m ≤ m_max minimizing |λ_m − 1| among
/// closest returns (λ_m = Π 2Z ≈ κ^q near a satellite r/q boundary — never
/// |κ| → 1 alone, per §18).
fn lambda_scan(orbit: &[(f64, f64)], m_max: usize) -> Vec<Option<usize>> {
    let n_len = orbit.len();
    let mut out = vec![None; n_len];
    for (n, slot) in out.iter_mut().enumerate() {
        let mut lam = (1.0f64, 0.0f64);
        let mut best: Option<(usize, f64)> = None;
        for m in 1..=m_max.min(n_len.saturating_sub(n + 1)) {
            let z = orbit[n + m - 1];
            lam = cm(lam, (2.0 * z.0, 2.0 * z.1));
            let d = (orbit[n + m].0 - orbit[n].0, orbit[n + m].1 - orbit[n].1);
            if d.0 * d.0 + d.1 * d.1 >= RET_TOL2 {
                continue;
            }
            let e = cabs((lam.0 - 1.0, lam.1));
            if e < MULT_TOL && best.is_none_or(|(_, be)| e < be) {
                best = Some((m, e));
            }
        }
        *slot = best.map(|(m, _)| m);
    }
    out
}

/// Stage 2 at a sampled index: composed m-step return jet → fixed-point
/// coalescence (gap of the ν ≤ 2 petal model) + petal coefficient.
fn verify_index(orbit: &[(f64, f64)], n: usize, m: usize) -> bool {
    let mut jet = jet_seed(orbit[n].0, orbit[n].1);
    for i in (n + 1)..(n + m) {
        jet = jet_compose(&jet, &jet_seed(orbit[i].0, orbit[i].1));
    }
    let c10 = jet.coeff(1, 0).to_f64();
    let c20 = jet.coeff(2, 0).to_f64();
    let c30 = jet.coeff(3, 0).to_f64();
    let kt = (c10.0 - 1.0, c10.1);
    if cabs(c30) <= PETAL_TOL {
        return false;
    }
    let sq = csqrt(csub(cm(c20, c20), (4.0 * cm(c30, kt).0, 4.0 * cm(c30, kt).1)));
    let den = (2.0 * c30.0, 2.0 * c30.1);
    let r1 = cdiv(cadd((-c20.0, -c20.1), sq), den);
    let r2 = cdiv(csub((-c20.0, -c20.1), sq), den);
    cabs(r1).max(cabs(r2)) < GAP_TOL
}

/// λ-hit spans ≥ SPAN_MIN, each verified at start/mid/end (2-of-3 majority),
/// with the dominant return length m of the span.
fn detect_spans(orbit: &[(f64, f64)]) -> Vec<(usize, usize, usize)> {
    let hits = lambda_scan(orbit, 64);
    let mut spans: Vec<(usize, usize)> = Vec::new();
    let mut cur: Option<usize> = None;
    for (n, g) in hits.iter().enumerate() {
        match (g.is_some(), cur) {
            (true, None) => cur = Some(n),
            (false, Some(s)) => {
                spans.push((s, n));
                cur = None;
            }
            _ => {}
        }
    }
    if let Some(s) = cur {
        spans.push((s, hits.len()));
    }
    let mut out = Vec::new();
    for (s0, s1) in spans {
        if s1 - s0 < SPAN_MIN {
            continue;
        }
        // Dominant m over the span.
        let mut counts: std::collections::BTreeMap<usize, usize> =
            std::collections::BTreeMap::new();
        for h in hits[s0..s1].iter().flatten() {
            *counts.entry(*h).or_insert(0) += 1;
        }
        let Some((&m, _)) = counts.iter().max_by_key(|(_, c)| **c) else {
            continue;
        };
        let samples = [s0, (s0 + s1) / 2, s1 - 1];
        let ok = samples
            .iter()
            .filter(|&&n| n + m < orbit.len() && verify_index(orbit, n, m))
            .count()
            >= 2;
        if ok {
            out.push((s0, s1, m));
        }
    }
    out
}

/// Cycle period p = smallest divisor of m with a small sustained closest
/// return over the span tail; q = m/p (only q = 2 is in the prototype scope).
fn detect_period(orbit: &[(f64, f64)], span: (usize, usize), m: usize) -> Option<usize> {
    let probe = span.1.saturating_sub(4 * m).max(span.0);
    for p in 1..=m {
        if m % p != 0 {
            continue;
        }
        let mut worst = 0.0f64;
        let mut n = probe;
        while n + p < span.1.min(orbit.len() - 1) {
            let d = (orbit[n + p].0 - orbit[n].0, orbit[n + p].1 - orbit[n].1);
            worst = worst.max((d.0 * d.0 + d.1 * d.1).sqrt());
            n += p;
        }
        if worst < PERIOD_TOL {
            return Some(p);
        }
    }
    None
}

// ── build-side dynamics (exact f64) ─────────────────────────────────────────────

/// Newton refinement of the persistent p-cycle of z² + c from an orbit seed.
/// Well-conditioned: the persistent cycle multiplier stays away from 1 (the
/// coalescence lives in the q-th power). Returns the cycle in orbit order
/// starting at the point nearest the seed.
fn cycle_newton(c: C, p: usize, seed: C) -> Option<Vec<C>> {
    let mut z = seed;
    for _ in 0..64 {
        // G = f^p(z) − z, G′ = Π 2z_i − 1.
        let mut w = z;
        let mut dw = (1.0f64, 0.0f64);
        for _ in 0..p {
            dw = cm(dw, (2.0 * w.0, 2.0 * w.1));
            w = cadd(cm(w, w), c);
        }
        let g = csub(w, z);
        let dg = (dw.0 - 1.0, dw.1);
        if cabs(dg) < 1e-9 {
            return None;
        }
        let step = cdiv(g, dg);
        z = csub(z, step);
        if cabs(step) < 1e-15 * (1.0 + cabs(z)) {
            let mut cyc = vec![z];
            let mut w = z;
            for _ in 1..p {
                w = cadd(cm(w, w), c);
                cyc.push(w);
            }
            return Some(cyc);
        }
    }
    None
}

/// Recentered per-step linear coefficients of one return from phase j0:
/// u ↦ lin[t]·u + u², lin[t] = 2·β_{(j0+t) mod p}.
fn gate_lin(cycle: &[C], j0: usize, q: usize) -> Vec<C> {
    let p = cycle.len();
    (0..p * q)
        .map(|t| {
            let b = cycle[(j0 + t) % p];
            (2.0 * b.0, 2.0 * b.1)
        })
        .collect()
}

/// Return-map series to u^n (s[k] = coeff of u^{k+1} of F − id, s[0] = κ̃).
fn gate_series(lin: &[C], n: usize) -> Vec<C> {
    let mut h = vec![(0.0f64, 0.0f64); n];
    h[0] = (1.0, 0.0);
    for a in lin {
        let mut nh = vec![(0.0f64, 0.0f64); n];
        for (k, slot) in nh.iter_mut().enumerate() {
            *slot = cm(*a, h[k]);
            for i in 1..=k {
                *slot = cadd(*slot, cm(h[i - 1], h[k - i]));
            }
        }
        h = nh;
    }
    h[0] = (h[0].0 - 1.0, h[0].1);
    h
}

/// Formal log of the return map (the generator whose time-1 map is F to
/// order `trunc`): fixed-point iteration E = Φ¹_P − F on the Lie series
/// Φ¹_P = id + Σ L_n/n!, L₁ = P, L_{n+1} = P·L_n′. P = F − id is NOT enough:
/// its time-1 map differs from F at ½PP′ (measured phase-0 floor).
fn gate_log_flow(full: &[C], trunc: usize) -> Vec<C> {
    let mut p: Vec<C> = full[..trunc.min(full.len())].to_vec();
    let trunc = p.len();
    for _ in 0..12 {
        let mut g = vec![(0.0f64, 0.0f64); trunc];
        let mut ln: Vec<C> = p.clone();
        let mut fact = 1.0f64;
        for n in 1..=24 {
            fact *= n as f64;
            let mut biggest = 0.0f64;
            for (k, l) in ln.iter().enumerate() {
                let t = (l.0 / fact, l.1 / fact);
                g[k] = cadd(g[k], t);
                biggest = biggest.max(cabs(t));
            }
            if biggest < 1e-30 {
                break;
            }
            let mut der = vec![(0.0f64, 0.0f64); trunc];
            for k in 0..trunc {
                der[k] = ((k + 1) as f64 * ln[k].0, (k + 1) as f64 * ln[k].1);
            }
            let mut nl = vec![(0.0f64, 0.0f64); trunc];
            for (k, slot) in nl.iter_mut().enumerate() {
                for i in 1..=(k + 1) {
                    let j = k + 1 - i;
                    if j < trunc {
                        *slot = cadd(*slot, cm(p[i - 1], der[j]));
                    }
                }
            }
            ln = nl;
        }
        let mut done = true;
        for k in 0..trunc {
            let e = csub(g[k], full[k]);
            if cabs(e) > 1e-24 * (1.0 + cabs(full[k])) {
                done = false;
            }
            p[k] = csub(p[k], e);
        }
        if done {
            break;
        }
    }
    p
}

/// Durand–Kerner roots of q(u) = Σ p[k]·u^k (build side only — the runtime
/// uses quadratic seeds + Newton).
fn dk_roots(p: &[C]) -> Vec<C> {
    let scale = p.iter().map(|c| cabs(*c)).fold(0.0f64, f64::max);
    let mut deg = p.len();
    while deg > 1 && cabs(p[deg - 1]) < 1e-14 * scale {
        deg -= 1;
    }
    let n = deg - 1;
    if n == 0 {
        return Vec::new();
    }
    let lead = p[deg - 1];
    let monic: Vec<C> = p[..deg].iter().map(|c| cdiv(*c, lead)).collect();
    let r0 = cabs(monic[0]).powf(1.0 / n as f64).max(1e-6);
    let mut zs: Vec<C> = (0..n)
        .map(|k| {
            let th = std::f64::consts::TAU * (k as f64 + 0.37) / n as f64;
            (r0 * th.cos(), r0 * th.sin())
        })
        .collect();
    for _ in 0..512 {
        let mut worst = 0.0f64;
        for i in 0..n {
            let f = poly_eval(&monic, zs[i]);
            let mut den = (1.0f64, 0.0f64);
            for j in 0..n {
                if j != i {
                    den = cm(den, csub(zs[i], zs[j]));
                }
            }
            if cabs(den) == 0.0 {
                continue;
            }
            let step = cdiv(f, den);
            zs[i] = csub(zs[i], step);
            worst = worst.max(cabs(step) / (1.0 + cabs(zs[i])));
        }
        if worst < 1e-15 {
            break;
        }
    }
    zs
}

// ── build ───────────────────────────────────────────────────────────────────────

/// Full f64 gate data at one dc sample (build side): per-phase β and log-flow
/// coefficients.
fn sample_gate(
    c0: C,
    dc: C,
    p: usize,
    q: usize,
    seed: C,
) -> Option<(Vec<C>, Vec<Vec<C>>)> {
    let c = cadd(c0, dc);
    let cycle = cycle_newton(c, p, seed)?;
    let mut pcs = Vec::with_capacity(p);
    for j in 0..p {
        let lin = gate_lin(&cycle, j, q);
        let full = gate_series(&lin, GATE_DEG);
        pcs.push(gate_log_flow(&full, GATE_DEG));
    }
    Some((cycle, pcs))
}

/// Quantize a complex through the 12 B GPU record slot (f32 mantissa pair +
/// shared exponent) — the certification below runs on THIS, so the record's
/// precision loss is inside the measured residual.
fn quantize(v: C) -> C {
    let e = v.0.abs().max(v.1.abs());
    if e == 0.0 || !e.is_finite() {
        return v;
    }
    let ex = e.log2().floor();
    let s = (-ex).exp2();
    (
        ((v.0 * s) as f32) as f64 / s,
        ((v.1 * s) as f32) as f64 / s,
    )
}

/// Build the gate table for a reference orbit: detector (two stages) COUPLED
/// to the saturated-block spans (a verified near-parabolic return without
/// saturation — e.g. feigenbaum's doubling micro-gates — is real but useless,
/// and stays off). `c0` is the reference parameter (f64 build — see the
/// module note on the deep-zoom variant).
pub fn build_gates(
    orbit: &[(f64, f64)],
    c0: C,
    log2_c_max: f64,
    eps: f64,
    saturated: &[(usize, usize)],
) -> Vec<Gate> {
    let mut out = Vec::new();
    // An ESCAPING reference (off-parabolic view centre) leaves a post-bailout
    // tail of huge/garbage values — λ-scan hits there are meaningless (the
    // boot field round found a 1.8k-index "gate" in that tail). Detect on
    // the bounded prefix only.
    let bounded = orbit
        .iter()
        .position(|z| z.0 * z.0 + z.1 * z.1 > 4.0)
        .unwrap_or(orbit.len());
    let orbit = &orbit[..bounded];
    // 4·c_max: the Taylor-in-dc validity band. Wide enough that the pixel
    // band AND the single-transit escape sliver fit; the certification
    // samples at r_dc and r_dc/2, so widening is self-policing.
    let r_dc = 4.0 * log2_c_max.exp2();
    for (s0, s1, m) in detect_spans(orbit) {
        // Saturation coupling.
        if !saturated
            .iter()
            .any(|&(b0, b1)| b0 < s1 && s0 < b1)
        {
            continue;
        }
        let Some(p) = detect_period(orbit, (s0, s1), m) else {
            continue;
        };
        let q = m / p;
        if q != 2 {
            continue; // prototype scope: period-doubling returns
        }
        let seed = orbit[s0];
        // Taylor in dc by Cauchy circle (L = 8 samples at |dc| = r_dc); the
        // dc = 0 sample seeds the far roots and the d[] channel.
        let Some((cyc0, pcs0)) = sample_gate(c0, (0.0, 0.0), p, q, seed) else {
            continue;
        };
        const L: usize = 8;
        let mut samples = Vec::with_capacity(L);
        let mut ok = true;
        for l in 0..L {
            let th = std::f64::consts::TAU * l as f64 / L as f64;
            let dc = (r_dc * th.cos(), r_dc * th.sin());
            match sample_gate(c0, dc, p, q, seed) {
                Some(s) => samples.push(s),
                None => {
                    ok = false;
                    break;
                }
            }
        }
        if !ok {
            continue;
        }
        // Fourier-extract Taylor coefficients c_k = (1/L)Σ f_l e^{−ikθ_l}/r^k
        // for k = 1, 2 (k = 0 comes from the exact dc = 0 sample).
        let fit = |f: &dyn Fn(usize) -> C, f0: C| -> [C; GATE_TAYLOR] {
            let mut c = [f0, (0.0, 0.0), (0.0, 0.0)];
            for (k, slot) in c.iter_mut().enumerate().skip(1) {
                let mut acc = (0.0f64, 0.0f64);
                for l in 0..L {
                    let th = -std::f64::consts::TAU * (k * l) as f64 / L as f64;
                    acc = cadd(acc, cm(f(l), (th.cos(), th.sin())));
                }
                let rk = r_dc.powi(k as i32) * L as f64;
                *slot = (acc.0 / rk, acc.1 / rk);
            }
            c
        };
        let mut beta = Vec::with_capacity(p);
        let mut pc = Vec::with_capacity(p);
        let mut far = Vec::with_capacity(p);
        for j in 0..p {
            let bt = fit(&|l: usize| samples[l].0[j], cyc0[j]);
            beta.push([quantize(bt[0]), quantize(bt[1]), quantize(bt[2])]);
            let mut row = [[(0.0, 0.0); GATE_TAYLOR]; GATE_DEG];
            for (k, slot) in row.iter_mut().enumerate() {
                let t = fit(&|l: usize| samples[l].1[j][k], pcs0[j][k]);
                *slot = [quantize(t[0]), quantize(t[1]), quantize(t[2])];
            }
            pc.push(row);
            // Far-root seeds at dc = 0: the reduced polynomial's roots minus
            // the coalescing pair (its two smallest — both ≈ 0 at the
            // parabolic parameter), ascending |r| so a runtime trim drops the
            // farthest first.
            let mut roots = dk_roots(&pcs0[j]);
            roots.sort_by(|a, b| cabs(*a).partial_cmp(&cabs(*b)).unwrap());
            let fr: Vec<C> = roots.into_iter().skip(2).map(quantize).collect();
            far.push(fr);
        }
        // d[] channel: Z_n − β_{(n−s0) mod p}(c₀), f64 rounded to the SHIPPED
        // plain-f32-pair format (gate-scale values: ≤ ~1e-8 absolute).
        let d: Vec<C> = (s0..s1)
            .map(|n| {
                let b = cyc0[(n - s0) % p];
                (
                    ((orbit[n].0 - b.0) as f32) as f64,
                    ((orbit[n].1 - b.1) as f32) as f64,
                )
            })
            .collect();
        let mut gate = Gate {
            start: s0,
            len: s1 - s0,
            p,
            q,
            r_entry: 0.04,
            r_dc,
            eps_band: [f64::INFINITY; GATE_BANDS],
            beta,
            pc,
            far,
            d,
        };
        if certify_gate(&mut gate, c0, &cyc0, eps) {
            out.push(gate);
        }
    }
    // Longest span first: the shader arms gate 0 only (v1), and an off-
    // parabolic reference can fragment detection into several spans.
    out.sort_by_key(|g| std::cmp::Reverse(g.len));
    out
}

// ── certification (round-6 spirit: measured sup, upward margin) ─────────────────

/// Measure the conjugacy residual of the SHIPPED gate — quantized record,
/// runtime Taylor evaluation, runtime root solve — against the true dynamics
/// expressed in the shipped coordinate (u′ = f^m(β_ship + u) − β_ship), per
/// annulus band, over dc on circles |dc| ∈ {r_dc, r_dc/2} (off the fit
/// phases). eps_band = sup × 2, upward-rounded. The ENTRY RADIUS is chosen by
/// the certifier itself: descend the ladder until every band certifies below
/// 1e-2 (period2's degree-truncation far roots sit near |u| ~ 0.05, so its
/// outer annulus fails at 0.04 and passes at 0.02 — exactly the measured
/// per-gate entry radius of the prototype round). False when no rung works.
fn certify_gate(gate: &mut Gate, c0: C, cyc0: &[C], eps: f64) -> bool {
    const NDC: usize = 6;
    const NANG: usize = 16;
    let m = gate.m();
    'rung: for r_entry in [0.04f64, 0.02, 0.01, 0.005] {
        gate.r_entry = r_entry;
        let mut sup = [0.0f64; GATE_BANDS];
        for half in [1.0f64, 0.5] {
            for l in 0..NDC {
                // Offset phases: avoid the L = 8 fit grid.
                let th = std::f64::consts::TAU * (l as f64 + 0.5) / NDC as f64;
                let dc =
                    (gate.r_dc * half * th.cos(), gate.r_dc * half * th.sin());
                let c = cadd(c0, dc);
                for j in 0..gate.p {
                    let Some(rt) = gate_resolve(gate, j, dc) else {
                        return false;
                    };
                    // The RUNTIME's recentering point: the c₀ cycle enters
                    // through the d[] small-quantity channel (per-index error
                    // ~6e-10), so certify against the true β_j(c₀) plus the
                    // shipped Taylor tail — recentering on the quantized
                    // β_j(c₀) itself would inject a ~1e-8 coordinate shift the
                    // runtime never sees (measured: it dominates the inner
                    // bands as δβ/droot).
                    let db = gate_dbeta(gate, j, dc);
                    let bj = cadd(cyc0[j], db);
                    for (bi, s) in sup.iter_mut().enumerate() {
                        let hi = gate.r_entry / (1u32 << bi) as f64;
                        for ri in 0..2 {
                            let rad = hi * if ri == 0 { 1.0 } else { 0.75 };
                            for a in 0..NANG {
                                let ph = std::f64::consts::TAU
                                    * (a as f64 + 0.31)
                                    / NANG as f64;
                                let u = (rad * ph.cos(), rad * ph.sin());
                                // True return in the shipped coordinate.
                                let mut z = cadd(bj, u);
                                for _ in 0..m {
                                    z = cadd(cm(z, z), c);
                                }
                                let u2 = csub(z, bj);
                                let mut res = (-1.0f64, 0.0f64);
                                for (r, rho) in rt.roots.iter().zip(&rt.rhos) {
                                    res = cadd(
                                        res,
                                        cm(
                                            *rho,
                                            clog(cdiv(
                                                csub(u2, *r),
                                                csub(u, *r),
                                            )),
                                        ),
                                    );
                                }
                                let ra = cabs(res);
                                if !ra.is_finite() || ra * 2.0 > 1e-2 {
                                    continue 'rung;
                                }
                                if std::env::var("GATE_DEBUG").is_ok() && ra > *s {
                                    println!(
                                        "      band {} rad {:.2e} ang {} dc=({:.2e},{:.2e}) j={} res {:.2e} droot {:.2e}",
                                        bi, rad, a, dc.0, dc.1, j, ra,
                                        rt.roots.iter().map(|r| cabs(csub(u, *r))).fold(f64::INFINITY, f64::min)
                                    );
                                }
                                *s = s.max(ra);
                            }
                        }
                    }
                }
            }
        }
        // Through-transit viability at this rung — phase-0's per-gate entry
        // radius, DERIVED instead of guessed: estimated crossing counts per
        // band (flow drift: K_b ≈ (1/a₃)·(1/r_lo² − 1/r_hi²), both
        // directions folded in) plus the bottleneck dwell 2π/κ̃ at a typical
        // in-band |dc|, times the measured band residuals, converted at the
        // entry radius. A rung whose typical through-jump would be refused by
        // the runtime budget anyway is useless — descend instead. (period2's
        // truncation far-roots near |u| ~ 0.05 inflate its outer band at
        // 0.04; the estimate lands it on 0.02, cusp stays at 0.04 — exactly
        // the prototype's measured per-gate radii.)
        let mut a3 = 0.0f64;
        let mut kap_lin = 0.0f64;
        let mut q_entry = 0.0f64;
        for j in 0..gate.p {
            a3 = a3.max(cabs(gate.pc[j][2][0]));
            kap_lin = kap_lin.max(cabs(gate.pc[j][0][1]));
            let mut qe = 0.0;
            let mut rk = 1.0;
            for k in 0..GATE_DEG {
                qe += cabs(gate.pc[j][k][0]) * rk;
                rk *= r_entry;
            }
            q_entry = q_entry.max(qe);
        }
        let kap_typ = (kap_lin * gate.r_dc * 0.5).max(1e-300);
        q_entry += kap_typ;
        let mut through = 0.0f64;
        for (b, s) in sup.iter().enumerate() {
            let r_hi = r_entry / (1u32 << b) as f64;
            let r_lo = r_hi * 0.5;
            let k_b = if b + 1 < GATE_BANDS {
                (1.0 / a3.max(1e-300)) * (1.0 / (r_lo * r_lo) - 1.0 / (r_hi * r_hi))
            } else {
                std::f64::consts::TAU / kap_typ
            };
            through += k_b * s * 2.0;
        }
        if through * q_entry > eps * 0.5 {
            continue 'rung;
        }
        for (bi, s) in sup.iter().enumerate() {
            gate.eps_band[bi] = s * 2.0;
        }
        return true;
    }
    false
}

// ── runtime (CPU model of the WGSL) ─────────────────────────────────────────────

/// Per-(pixel, phase) resolved gate data — what the shader computes once per
/// pixel before its first jump attempt (~500 flops).
pub struct GateResolved {
    /// P(dc) coefficients (coeff of u^{k+1}), trimmed length nq.
    pub pcoef: Vec<C>,
    pub roots: Vec<C>,
    pub rhos: Vec<C>,
}

/// Δβ_j(dc) — the Taylor tail (the constant lives in d[]).
fn gate_dbeta(gate: &Gate, j: usize, dc: C) -> C {
    cadd(cm(gate.beta[j][1], dc), cm(gate.beta[j][2], cm(dc, dc)))
}

/// Evaluate the Taylor record at the pixel's dc, solve the coalescing cluster
/// (quadratic seed + Newton on the full reduced polynomial), polish the far
/// seeds, assemble the partial fractions. None ⇒ degenerate (fallback).
pub fn gate_resolve(gate: &Gate, j: usize, dc: C) -> Option<GateResolved> {
    if cabs(dc) > gate.r_dc {
        return None;
    }
    let dc2 = cm(dc, dc);
    let mut pcoef: Vec<C> = gate.pc[j]
        .iter()
        .map(|t| cadd(t[0], cadd(cm(t[1], dc), cm(t[2], dc2))))
        .collect();
    let scale = pcoef.iter().map(|c| cabs(*c)).fold(0.0f64, f64::max);
    if scale == 0.0 {
        return None;
    }
    while pcoef.len() > 1 && cabs(*pcoef.last().unwrap()) < 1e-14 * scale {
        pcoef.pop();
    }
    let nq = pcoef.len();
    if nq < 3 {
        return None;
    }
    let newton_once = |u0: C| -> C {
        let mut f = (0.0, 0.0);
        let mut d = (0.0, 0.0);
        for k in (0..pcoef.len()).rev() {
            d = cadd(cm(d, u0), f);
            f = cadd(cm(f, u0), pcoef[k]);
        }
        if cabs(d) == 0.0 {
            return u0;
        }
        csub(u0, cdiv(f, d))
    };
    let newton = |u0: C| -> C {
        let mut u = u0;
        for _ in 0..24 {
            let f = poly_eval(&pcoef, u);
            let mut d = (0.0f64, 0.0f64);
            for (k, c) in pcoef.iter().enumerate().skip(1) {
                let kk = k as f64;
                d = cadd(d, cm((kk * c.0, kk * c.1), poly_pow(u, k - 1)));
            }
            if cabs(d) == 0.0 {
                break;
            }
            let step = cdiv(f, d);
            u = csub(u, step);
            if cabs(step) < 1e-15 * (1.0 + cabs(u)) {
                break;
            }
        }
        u
    };
    // Cluster: 0 + the quadratic pair, Newton-polished on the full q(u).
    let mut roots: Vec<C> = vec![(0.0, 0.0)];
    let sq = csqrt(csub(
        cm(pcoef[1], pcoef[1]),
        (4.0 * cm(pcoef[2], pcoef[0]).0, 4.0 * cm(pcoef[2], pcoef[0]).1),
    ));
    let den = (2.0 * pcoef[2].0, 2.0 * pcoef[2].1);
    roots.push(newton(cdiv(cadd((-pcoef[1].0, -pcoef[1].1), sq), den)));
    roots.push(newton(cdiv(csub((-pcoef[1].0, -pcoef[1].1), sq), den)));
    // Far roots from the shipped seeds. P = u·q has nq roots total:
    // {0, pair} + (nq − 3) far ones. Far roots only feed the LINEARIZED
    // correction and the droot/ρ scales, so one polish pass suffices (the
    // cluster pair got the full Newton above).
    let nfar = nq - 3;
    if gate.far[j].len() < nfar {
        return None;
    }
    for s in gate.far[j].iter().take(nfar) {
        roots.push(newton_once(*s));
    }
    // Distinct poles or bust.
    let rmax = roots.iter().map(|r| cabs(*r)).fold(0.0f64, f64::max);
    for i in 0..roots.len() {
        for k in (i + 1)..roots.len() {
            if cabs(csub(roots[i], roots[k])) < 1e-12 * (1.0 + rmax) {
                return None;
            }
        }
    }
    // ρᵢ = 1/P′(rᵢ), P′(u) = Σ (k+1)·pcoef[k]·u^k.
    let dp: Vec<C> = pcoef
        .iter()
        .enumerate()
        .map(|(k, c)| ((k as f64 + 1.0) * c.0, (k as f64 + 1.0) * c.1))
        .collect();
    let mut rhos = Vec::with_capacity(roots.len());
    for r in &roots {
        let v = poly_eval(&dp, *r);
        if cabs(v) == 0.0 {
            return None;
        }
        let rho = cdiv((1.0, 0.0), v);
        if !rho.0.is_finite() || !rho.1.is_finite() {
            return None;
        }
        rhos.push(rho);
    }
    Some(GateResolved { pcoef, roots, rhos })
}

fn poly_pow(u: C, k: usize) -> C {
    let mut acc = (1.0f64, 0.0f64);
    for _ in 0..k {
        acc = cm(acc, u);
    }
    acc
}

/// One gate jump with the certified budget accumulated in flight:
/// budget = Σ dk·eps_band(|u|) along the hop path; the jump is refused when
/// budget·|P(u_end)/u_end| > ε/2 (value-error conversion at the landing
/// point). Returns the INTEGER F-step count and the landing u.
pub fn gate_jump(
    gate: &Gate,
    rt: &GateResolved,
    u0: C,
    k_max: u64,
    eps: f64,
) -> Option<(u64, C)> {
    if k_max == 0 {
        return None;
    }
    let pval = |u: C| cm(u, poly_eval(&rt.pcoef, u));
    // The hop Newton evaluates the CLUSTER poles (0 + the coalescing pair)
    // exactly and the far roots LINEARIZED at the hop origin: their log
    // increment over |Δu| ≤ 0.35·droot is (Δu)/(u−r) + O((Δu/(u−r))²) with
    // |u−r_far| ≫ droot — one cdiv per far root per HOP instead of one clog
    // per Newton iteration (the SIMT cost sits in the transcendentals).
    let ncl = rt.roots.len().min(3);
    let hop = |u: C, un0: C, dk: f64| -> Option<C> {
        let mut cfar = (0.0, 0.0);
        for i in ncl..rt.roots.len() {
            cfar = cadd(cfar, cdiv(rt.rhos[i], csub(u, rt.roots[i])));
        }
        let mut un = un0;
        let mut last_g = f64::INFINITY;
        for _ in 0..12 {
            let mut g = (-dk, 0.0);
            for i in 0..ncl {
                g = cadd(
                    g,
                    cm(rt.rhos[i], clog(cdiv(csub(un, rt.roots[i]), csub(u, rt.roots[i])))),
                );
            }
            g = cadd(g, cm(cfar, csub(un, u)));
            last_g = cabs(g);
            // Early accept on a small phase residual: it converts to value
            // error through the tiny |P| and the landing budget check.
            if last_g < 1e-6 {
                return Some(un);
            }
            let step = cm(g, pval(un));
            un = csub(un, step);
            if cabs(step) < 1e-13 * (1.0 + cabs(un)) {
                return Some(un);
            }
        }
        if last_g < 1e-4 {
            return Some(un);
        }
        None
    };
    let band = |ua: f64| -> f64 {
        let mut hi = gate.r_entry;
        for b in 0..GATE_BANDS {
            hi /= 2.0;
            if ua > hi {
                return gate.eps_band[b];
            }
        }
        gate.eps_band[GATE_BANDS - 1]
    };
    let mut u = u0;
    let mut k_done = 0.0f64;
    let mut budget = 0.0f64;
    let mut hops = 0u32;
    while k_done < k_max as f64 && cabs(u) <= gate.r_entry {
        hops += 1;
        if hops > 512 {
            return None;
        }
        let sp = pval(u);
        let spd = cabs(sp);
        let droot = rt
            .roots
            .iter()
            .map(|r| cabs(csub(u, *r)))
            .fold(f64::INFINITY, f64::min);
        if spd < 1e-300 || droot < 1e-300 {
            k_done = k_max as f64; // pinned at a fixed point: never exits
            break;
        }
        let dk = (0.35 * droot / spd).min(k_max as f64 - k_done).max(1e-9);
        let pred = cadd(u, (sp.0 * dk, sp.1 * dk));
        u = hop(u, pred, dk)?;
        k_done += dk;
        budget += dk * band(cabs(u));
        if std::env::var("GATE_TRACE").is_ok() {
            println!("    hop {}: k_done {:.1} |u| {:.4e} dk {:.2e} droot {:.2e}", hops, k_done, cabs(u), dk, droot);
        }
        if budget > 1e6 {
            return None; // hopeless — bail before burning hops
        }
    }
    let k_int = (k_done.floor() as u64).min(k_max);
    if k_int < 2 {
        return None;
    }
    let back = k_int as f64 - k_done;
    if back != 0.0 {
        let sp = pval(u);
        let pred = cadd(u, (sp.0 * back, sp.1 * back));
        u = hop(u, pred, back)?;
    }
    // Certified budget: accumulated phase error × the value conversion at the
    // landing point must stay inside ε/2 (the other half is the block table's).
    let qv = cabs(poly_eval(&rt.pcoef, u));
    if budget * qv > eps * 0.5 {
        return None;
    }
    Some((k_int, u))
}

/// Gate-attempt outcome: NotApplicable is "the gate move does not apply
/// here" (outside span/radius/budget window — no failure, keep trying);
/// Failed is a real degraded attempt (degenerate Ψ, Newton, refused budget)
/// the caller should count toward disabling the gate for this pixel.
pub enum GateOutcome {
    Jump(u64, C),
    Failed,
    NotApplicable,
}

/// Gate attempt at reference index n with pixel delta dz (the full per-turn
/// runtime move, shader-shaped): phase from the span offset, u from the d[]
/// channel, resolve-once-per-phase cache in `scratch`. Jump carries
/// (k F-steps, new dz at index n + k·m).
#[allow(clippy::too_many_arguments)]
pub fn gate_attempt(
    gate: &Gate,
    scratch: &mut Vec<Option<Option<GateResolved>>>,
    n: usize,
    dz: C,
    dc: C,
    iter_left: usize,
    eps: f64,
) -> GateOutcome {
    let m = gate.m();
    if n < gate.start || n + m > gate.start + gate.len {
        return GateOutcome::NotApplicable;
    }
    let off = n - gate.start;
    let j = off % gate.p;
    while scratch.len() < gate.p {
        scratch.push(None);
    }
    let db = gate_dbeta(gate, j, dc);
    let u = cadd(csub(gate.d[off], db), dz);
    if cabs(u) > gate.r_entry {
        return GateOutcome::NotApplicable;
    }
    // Landing index off + k·m must stay inside the d[] channel.
    let k_max = ((iter_left / m).min((gate.len - 1 - off) / m)) as u64;
    if k_max < 4 {
        return GateOutcome::NotApplicable;
    }
    let ent = scratch[j].get_or_insert_with(|| gate_resolve(gate, j, dc));
    let Some(rt) = ent.as_ref() else {
        return GateOutcome::Failed;
    };
    match gate_jump(gate, rt, u, k_max, eps) {
        Some((k, un)) => {
            let off2 = off + k as usize * m;
            let dz2 = csub(cadd(un, db), gate.d[off2]);
            GateOutcome::Jump(k, dz2)
        }
        None => GateOutcome::Failed,
    }
}

// ── GPU serialization (stage a of the wiring) ──────────────────────────────────
// Flat f32 stream, one gate per record. Complex slots follow the pipeline's
// private-exponent convention (x·2^e, y·2^e — 3 floats, exact for the
// quantized build values); the d[] channel ships as plain f32 pairs (its
// values are gate-scale distances ~1e-4..0.2, so 2^-23 relative lands at
// ~1e-8 absolute worst — inside the measured landing tolerance).
//
// Layout per gate:
//   [0] start  [1] len  [2] p  [3] q  [4] r_entry  [5] r_dc
//   [6..6+GATE_BANDS) eps_band
//   [10] nfar (far seeds per phase)
//   per phase j = 0..p:
//     beta tail: 2 complex (linear, quadratic Taylor)      — 3 floats each
//     pc: GATE_DEG × GATE_TAYLOR complex                   — 3 floats each
//     far: nfar complex                                    — 3 floats each
//   d[]: len complex as plain f32 pairs                    — 2 floats each

fn pack_c(v: C, out: &mut Vec<f32>) {
    let m = v.0.abs().max(v.1.abs());
    if m == 0.0 || !m.is_finite() {
        out.extend_from_slice(&[0.0, 0.0, 0.0]);
        return;
    }
    let e = m.log2().floor();
    let s = (-e).exp2();
    out.push((v.0 * s) as f32);
    out.push((v.1 * s) as f32);
    out.push(e as f32);
}

fn unpack_c(f: &[f32]) -> C {
    let s = (f[2] as f64).exp2();
    (f[0] as f64 * s, f[1] as f64 * s)
}

pub fn gate_serialize(g: &Gate) -> Vec<f32> {
    let mut out = Vec::new();
    let nfar = g.far.first().map_or(0, |f| f.len());
    out.extend_from_slice(&[
        g.start as f32,
        g.len as f32,
        g.p as f32,
        g.q as f32,
        g.r_entry as f32,
        g.r_dc as f32,
    ]);
    for e in &g.eps_band {
        out.push(*e as f32);
    }
    out.push(nfar as f32);
    for j in 0..g.p {
        pack_c(g.beta[j][1], &mut out);
        pack_c(g.beta[j][2], &mut out);
        for t in &g.pc[j] {
            for c in t {
                pack_c(*c, &mut out);
            }
        }
        debug_assert_eq!(g.far[j].len(), nfar);
        for c in &g.far[j] {
            pack_c(*c, &mut out);
        }
    }
    for d in &g.d {
        out.push(d.0 as f32);
        out.push(d.1 as f32);
    }
    out
}

pub fn gate_deserialize(f: &[f32]) -> Gate {
    let start = f[0] as usize;
    let len = f[1] as usize;
    let p = f[2] as usize;
    let q = f[3] as usize;
    let r_entry = f[4] as f64;
    let r_dc = f[5] as f64;
    let mut eps_band = [0.0f64; GATE_BANDS];
    for (i, e) in eps_band.iter_mut().enumerate() {
        *e = f[6 + i] as f64;
    }
    let nfar = f[6 + GATE_BANDS] as usize;
    let mut off = 7 + GATE_BANDS;
    let mut beta = Vec::with_capacity(p);
    let mut pc = Vec::with_capacity(p);
    let mut far = Vec::with_capacity(p);
    for _ in 0..p {
        let b1 = unpack_c(&f[off..]);
        let b2 = unpack_c(&f[off + 3..]);
        off += 6;
        beta.push([(0.0, 0.0), b1, b2]);
        let mut row = [[(0.0, 0.0); GATE_TAYLOR]; GATE_DEG];
        for slot in row.iter_mut() {
            for c in slot.iter_mut() {
                *c = unpack_c(&f[off..]);
                off += 3;
            }
        }
        pc.push(row);
        let mut fr = Vec::with_capacity(nfar);
        for _ in 0..nfar {
            fr.push(unpack_c(&f[off..]));
            off += 3;
        }
        far.push(fr);
    }
    let mut d = Vec::with_capacity(len);
    for _ in 0..len {
        d.push((f[off] as f64, f[off + 1] as f64));
        off += 2;
    }
    Gate { start, len, p, q, r_entry, r_dc, eps_band, beta, pc, far, d }
}

// ── sidecar serialization (vec4 lane, rides the unified radius buffer) ─────────
// The gate blob travels in the SAME storage buffer as the block radius
// sidecar + the SA/periodic 10-entry header (the compute layout sits at the
// 8-storage-buffer WebGPU limit — no new bindings, and the worker/Engine
// copies are length-driven, so the TS layer needs no schema change). After
// the 10 header entries comes ONE gate-directory entry (x = gate count,
// OOB-read-safe: an old table reads 0) followed by the packed gates:
//   E0: (start, len, p, q)
//   E1: (r_entry, r_dc, nfar, dRel)   — dRel: offset of d[] from E0
//   E2: eps_band[0..4)
//   per phase j: β-tail 2 complexes, then GATE_DEG·GATE_TAYLOR pc complexes,
//     then nfar far seeds — each complex as (x·2^e, y·2^e) → (x, y, e, 0)
//   d[]: ⌈len/2⌉ entries, two plain-f32 pairs per vec4
// Integer fields ride f32 exactly (orbit indices ≤ 2^24).

fn vec4_c(v: C) -> [f32; 4] {
    let m = v.0.abs().max(v.1.abs());
    if m == 0.0 || !m.is_finite() {
        return [0.0; 4];
    }
    let e = m.log2().floor();
    let s = (-e).exp2();
    [(v.0 * s) as f32, (v.1 * s) as f32, e as f32, 0.0]
}

pub fn gates_serialize_vec4(gates: &[Gate]) -> Vec<[f32; 4]> {
    let mut out = vec![[gates.len() as f32, 0.0, 0.0, 0.0]];
    for g in gates {
        let nfar = g.far.first().map_or(0, |f| f.len());
        let per_phase = 2 + GATE_DEG * GATE_TAYLOR + nfar;
        let d_rel = 3 + g.p * per_phase;
        out.push([g.start as f32, g.len as f32, g.p as f32, g.q as f32]);
        out.push([
            g.r_entry as f32,
            g.r_dc as f32,
            nfar as f32,
            d_rel as f32,
        ]);
        out.push([
            g.eps_band[0] as f32,
            g.eps_band[1] as f32,
            g.eps_band[2] as f32,
            g.eps_band[3] as f32,
        ]);
        for j in 0..g.p {
            out.push(vec4_c(g.beta[j][1]));
            out.push(vec4_c(g.beta[j][2]));
            for t in &g.pc[j] {
                for c in t {
                    out.push(vec4_c(*c));
                }
            }
            debug_assert_eq!(g.far[j].len(), nfar);
            for c in &g.far[j] {
                out.push(vec4_c(*c));
            }
        }
        for pair in g.d.chunks(2) {
            let b = pair.get(1).copied().unwrap_or((0.0, 0.0));
            out.push([pair[0].0 as f32, pair[0].1 as f32, b.0 as f32, b.1 as f32]);
        }
    }
    out
}

/// Parse back one gate stream (test mirror of the WGSL reads).
pub fn gates_deserialize_vec4(v: &[[f32; 4]]) -> Vec<Gate> {
    let n = v[0][0] as usize;
    let mut out = Vec::with_capacity(n);
    let mut base = 1usize;
    for _ in 0..n {
        let e0 = v[base];
        let e1 = v[base + 1];
        let e2 = v[base + 2];
        let (start, len, p, q) =
            (e0[0] as usize, e0[1] as usize, e0[2] as usize, e0[3] as usize);
        let nfar = e1[2] as usize;
        let unpack = |f: [f32; 4]| -> C {
            let s = (f[2] as f64).exp2();
            (f[0] as f64 * s, f[1] as f64 * s)
        };
        let mut off = base + 3;
        let mut beta = Vec::new();
        let mut pc = Vec::new();
        let mut far = Vec::new();
        for _ in 0..p {
            let b1 = unpack(v[off]);
            let b2 = unpack(v[off + 1]);
            off += 2;
            beta.push([(0.0, 0.0), b1, b2]);
            let mut row = [[(0.0, 0.0); GATE_TAYLOR]; GATE_DEG];
            for slot in row.iter_mut() {
                for c in slot.iter_mut() {
                    *c = unpack(v[off]);
                    off += 1;
                }
            }
            pc.push(row);
            let mut fr = Vec::new();
            for _ in 0..nfar {
                fr.push(unpack(v[off]));
                off += 1;
            }
            far.push(fr);
        }
        debug_assert_eq!(off, base + e1[3] as usize);
        let mut d = Vec::with_capacity(len);
        for i in 0..len {
            let e = v[off + i / 2];
            if i % 2 == 0 {
                d.push((e[0] as f64, e[1] as f64));
            } else {
                d.push((e[2] as f64, e[3] as f64));
            }
        }
        off += len.div_ceil(2);
        out.push(Gate {
            start,
            len,
            p,
            q,
            r_entry: e1[0] as f64,
            r_dc: e1[1] as f64,
            eps_band: [
                e2[0] as f64,
                e2[1] as f64,
                e2[2] as f64,
                e2[3] as f64,
            ],
            beta,
            pc,
            far,
            d,
        });
        base = off;
    }
    out
}

// ── tests ───────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mobius::{
        mobius_build_bounds, mobius_build_levels, mobius_build_radii, mobius_run_pixel,
        MOBIUS_MIN_EMIT_SKIP, MOBIUS_NCAND,
    };

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

    /// Saturated-block spans from the production Möbius bounds (the detector
    /// coupling input — round-6 classification).
    fn saturated_spans(
        orbit: &[(f64, f64)],
        log2_c_max: f64,
    ) -> Vec<(usize, usize)> {
        let levels = mobius_build_levels(orbit, 1 << 18);
        let bounds = mobius_build_bounds(&levels, orbit, log2_c_max);
        let mut spans = Vec::new();
        for (li, lvl) in levels.iter().enumerate() {
            if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                continue;
            }
            for (s, blk) in lvl.blocks.iter().enumerate() {
                if blk.m.degenerate {
                    continue;
                }
                let b = &bounds.per_level[li][s];
                let usable = (0..MOBIUS_NCAND).any(|c| {
                    b.log2_rz[c].is_finite()
                        && b.log2_mq[c].is_finite()
                        && log2_c_max - bounds.log2_rc[c] < -1e-9
                });
                if !usable {
                    let first = 1 + s * lvl.skip;
                    spans.push((first, first + lvl.skip));
                }
            }
        }
        spans
    }

    #[test]
    fn gate_build_on_f32_orbit() {
        // The app's navigator stores the reference orbit in f32 (GPU format);
        // detection/certification must survive that quantization. Reproduce
        // the boot-observed fragmentation.
        let orbit: Vec<(f64, f64)> = ref_orbit_f64(-0.75, 0.0001, 33212)
            .into_iter()
            .map(|(x, y)| ((x as f32) as f64, (y as f32) as f64))
            .collect();
        let log2_c_max = (1e-5f64).log2() + 2.0;
        let spans = detect_spans(&orbit);
        println!("f32-orbit spans: {:?}", &spans[..spans.len().min(12)]);
        let sat = saturated_spans(&orbit, log2_c_max);
        let gates = build_gates(&orbit, (-0.75, 0.0), log2_c_max, 1e-3, &sat);
        for g in &gates {
            println!("gate: start {} len {} r_entry {}", g.start, g.len, g.r_entry);
        }
    }

    #[test]
    fn gate_build_matches_engine_configuration() {
        // The EXACT parameters the app's worker uses on the cusp teleport
        // (scale 1e-5 → jet c_max rule log2(scale)+2, ε = 1e-3, maxIter 1665
        // budgeted by the view) — guards against build-path hangs/panics that
        // the census-shaped tests miss. Bounded runtime is the assertion.
        let t0 = std::time::Instant::now();
        for (cx, cy, max_iter, scale) in [
            (-0.75f64, 0.0f64, 1665usize, 1e-5f64),
            (-1.25, 0.0, 1665, 1e-5),
            (-0.75, 0.0, 4220, 2e-13),
            (-1.25, 0.0, 4220, 2e-13),
            (-0.75, 0.0, 33200, 1e-5),
            (-1.25, 0.0, 33200, 1e-5),
        ] {
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            let log2_c_max = scale.log2() + 2.0;
            let sat = saturated_spans(&orbit, log2_c_max);
            let gates = build_gates(&orbit, (cx, cy), log2_c_max, 1e-3, &sat);
            println!(
                "engine-config {} scale {:e}: sat {} gates {} r_entry {:?} ({:?})",
                cx,
                scale,
                sat.len(),
                gates.len(),
                gates.first().map(|g| g.r_entry),
                t0.elapsed()
            );
        }
        assert!(
            t0.elapsed() < std::time::Duration::from_secs(20),
            "gate build too slow for the worker path"
        );
    }

    #[test]
    fn gate_build_detects_and_certifies() {
        // Coarse regimes: exactly one certified gate each, q = 2, spanning
        // the orbit tail, with usable band residuals. Controls: none (the
        // saturation coupling keeps feigenbaum's real doubling micro-gates
        // and seahorse's rejected spans off).
        for (name, cx, cy, dec, expect) in [
            ("cusp", -0.75_f64, 0.0_f64, -5.0_f64, true),
            ("period2", -1.25, 0.0, -5.0, true),
            ("seahorse", -0.743643887037151, 0.131825904205330, -10.0, false),
            ("feigenbaum", -1.401155, 0.0, -9.0, false),
        ] {
            let log2_c_max = dec * std::f64::consts::LOG2_10;
            let orbit = ref_orbit_f64(cx, cy, 3000);
            assert!(orbit.len() > 3000, "[{}] reference escaped", name);
            let sat = saturated_spans(&orbit, log2_c_max);
            let gates = build_gates(&orbit, (cx, cy), log2_c_max, 1e-3, &sat);
            if !expect {
                assert!(
                    gates.is_empty(),
                    "[{}] control grew {} gate(s)",
                    name,
                    gates.len()
                );
                continue;
            }
            assert_eq!(gates.len(), 1, "[{}] expected one gate", name);
            let g = &gates[0];
            println!(
                "[{}] gate: span {}..{} p={} q={} eps_band {:?}",
                name,
                g.start,
                g.start + g.len,
                g.p,
                g.q,
                g.eps_band
            );
            assert_eq!(g.q, 2);
            assert!(g.len > 2000, "[{}] span too short: {}", name, g.len);
            assert!(
                g.eps_band[GATE_BANDS - 1] < 1e-4,
                "[{}] inner band residual too large: {:?}",
                name,
                g.eps_band
            );
        }
    }

    /// Production-shaped pixel loop: Möbius block table + the gate move from
    /// the SERIALIZED-equivalent record (what the shader will run).
    #[allow(clippy::too_many_arguments)]
    fn gate_table_run_pixel(
        levels: &[crate::mobius::MobiusLevel],
        radii: &[Vec<f64>],
        orbit: &[(f64, f64)],
        gates: &[Gate],
        dc: (f64, f64),
        max_iter: usize,
        eps: f64,
    ) -> (u64, usize, bool, u64) {
        let bailout2 = 4.0_f64;
        let orbit_len = orbit.len();
        let cfe = crate::jet::CFe::from_c(dc.0, dc.1);
        let mut scratch: Vec<Vec<Option<Option<GateResolved>>>> =
            gates.iter().map(|_| Vec::new()).collect();
        let (mut dz, mut ref_i, mut iter) = ((0.0f64, 0.0f64), 0usize, 0usize);
        let (mut turns, mut jumps) = (0u64, 0u64);
        let mut fallbacks = 0u32;
        while iter < max_iter {
            let mut jumped = false;
            if fallbacks < 8 {
                for (gi, g) in gates.iter().enumerate() {
                    match gate_attempt(
                        g,
                        &mut scratch[gi],
                        ref_i,
                        dz,
                        dc,
                        max_iter - iter,
                        eps,
                    ) {
                        GateOutcome::Jump(k, dz2) => {
                            let adv = k as usize * g.m();
                            iter += adv;
                            ref_i += adv;
                            dz = dz2;
                            jumps += 1;
                            jumped = true;
                        }
                        GateOutcome::Failed => fallbacks += 1,
                        GateOutcome::NotApplicable => {}
                    }
                    if jumped {
                        break;
                    }
                }
            }
            if !jumped {
                let mut applied = false;
                if ref_i > 0 {
                    let shifted = ref_i - 1;
                    let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                    let log2_dz =
                        if dz2 > 0.0 { 0.5 * dz2.log2() } else { f64::NEG_INFINITY };
                    for (li, lvl) in levels.iter().enumerate().rev() {
                        if shifted % lvl.skip != 0 {
                            continue;
                        }
                        let slot = shifted / lvl.skip;
                        if slot >= lvl.blocks.len()
                            || iter + lvl.skip > max_iter
                            || ref_i + lvl.skip >= orbit_len
                        {
                            continue;
                        }
                        if !(log2_dz < radii[li][slot]) {
                            continue;
                        }
                        let blk = &lvl.blocks[slot];
                        let (phi, _, _) = crate::mobius::mobius_apply(
                            &blk.m,
                            crate::jet::CFe::from_c(dz.0, dz.1),
                            cfe,
                        );
                        let cand = phi.to_f64();
                        let zi = orbit[ref_i + lvl.skip];
                        let candz = (zi.0 + cand.0, zi.1 + cand.1);
                        if lvl.skip > 1
                            && candz.0 * candz.0 + candz.1 * candz.1 > bailout2
                        {
                            continue;
                        }
                        dz = cand;
                        ref_i += lvl.skip;
                        iter += lvl.skip;
                        applied = true;
                        break;
                    }
                }
                if !applied {
                    let z = orbit[ref_i];
                    let m2 = (
                        2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1,
                        2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0,
                    );
                    let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                    dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                    ref_i += 1;
                    iter += 1;
                }
            }
            turns += 1;
            if ref_i > orbit_len - 1 {
                ref_i = orbit_len - 1;
            }
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > bailout2 {
                return (turns, iter, true, jumps);
            }
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            if full2 < dz2 || ref_i == orbit_len - 1 {
                dz = full;
                ref_i = 0;
            }
            if turns > (max_iter * 2 + 16) as u64 {
                break;
            }
        }
        (turns, iter, false, jumps)
    }

    fn exact_pixel(c: (f64, f64), max_iter: usize) -> (bool, usize) {
        let (mut zx, mut zy) = (0.0f64, 0.0f64);
        for n in 0..max_iter {
            if zx * zx + zy * zy > 4.0 {
                return (true, n);
            }
            let nx = zx * zx - zy * zy + c.0;
            let ny = 2.0 * zx * zy + c.1;
            zx = nx;
            zy = ny;
        }
        (false, max_iter)
    }

    #[test]
    #[ignore] // A/B census — cargo test --release gate_table_runtime_parity -- --ignored --nocapture
    fn gate_table_runtime_parity() {
        // The census pixel row through the PRODUCTION path (quantized record,
        // runtime root solve, banded budget) vs Padé / production Möbius /
        // exact iteration; then long in-band escape probes for true
        // through-gate parity.
        for (name, cx, cy, eps, dec) in [
            ("cusp", -0.75_f64, 0.0_f64, 1e-3_f64, -5.0_f64),
            ("period2", -1.25, 0.0, 1e-3, -5.0),
        ] {
            let max_iter = 3000usize;
            let log2_c_max = dec * std::f64::consts::LOG2_10;
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            assert!(orbit.len() > max_iter);
            let sat = saturated_spans(&orbit, log2_c_max);
            let gates = build_gates(&orbit, (cx, cy), log2_c_max, 1e-3, &sat);
            assert_eq!(gates.len(), 1, "[{}] expected one gate", name);
            let levels = mobius_build_levels(&orbit, 1 << 18);
            let bounds = mobius_build_bounds(&levels, &orbit, log2_c_max);
            let radii = mobius_build_radii(&levels, &bounds, eps, log2_c_max);
            let pade = crate::bench_build_levels(&orbit, eps, true, 1 << 18);
            let cmx = log2_c_max.exp2();
            let (mut t_pade, mut t_mob, mut t_gate) = (0u64, 0u64, 0u64);
            let (mut jumps, mut flag_bad, mut worst) = (0u64, 0u64, 0i64);
            for kpx in 0..16 {
                let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                let dc = (t * cmx * 0.7, 0.37 * t * cmx);
                let (turns, iters, esc, j) = gate_table_run_pixel(
                    &levels, &radii, &orbit, &gates, dc, max_iter, eps,
                );
                let (ps, _, _) =
                    crate::bench_run_pixel(&pade, &orbit, dc, max_iter, true);
                t_pade += ps as u64;
                t_mob +=
                    mobius_run_pixel(&levels, &radii, &orbit, dc, max_iter).steps
                        as u64;
                t_gate += turns;
                jumps += j;
                let (e_esc, e_iter) = exact_pixel((cx + dc.0, cy + dc.1), max_iter);
                if e_esc != esc {
                    flag_bad += 1;
                } else if e_esc {
                    worst = worst.max((iters as i64 - e_iter as i64).abs());
                }
            }
            println!(
                "[{}] row: pade={} mobius={} gate-table={} ({:.2}x pade, was {:.2}x) jumps={} | flag mismatches {} worst Δiter {}",
                name,
                t_pade,
                t_mob,
                t_gate,
                t_gate as f64 / t_pade.max(1) as f64,
                t_mob as f64 / t_pade.max(1) as f64,
                jumps,
                flag_bad,
                worst
            );
            assert_eq!(flag_bad, 0, "[{}] escape-flag mismatch", name);
            assert!(worst <= 2, "[{}] Δiter {} beyond ε budget", name, worst);
            assert!(
                (t_gate as f64) < (t_pade as f64) * 2.0,
                "[{}] gate table ({}) not under 2x pade ({})",
                name,
                t_gate,
                t_pade
            );

            // Long escape probes INSIDE the dc validity band (r_dc = 2·c_max):
            // true through-gate transits, table-less (gate does the lifting).
            let long_iter = 400_000usize;
            let lorbit = ref_orbit_f64(cx, cy, long_iter);
            let lsat = vec![(1usize, lorbit.len())]; // coupling: force-detect
            let lgates = build_gates(&lorbit, (cx, cy), log2_c_max, eps, &lsat);
            assert_eq!(lgates.len(), 1, "[{}] long-orbit gate missing", name);
            // NOTE: re-injection pixels (e.g. dc = i·1.4e-5: exits the gate,
            // grazes the REPELLING fixed point — |2α| ≈ 1.45 amplifies any
            // error to O(1) in ~60 steps — and re-enters for a second
            // transit) have a chaotically sensitive escape iteration: even
            // exact f64 stepping cannot pin their fate (measured: the true
            // landing point continues 112k iterations, a 2.3e-8-accurate one
            // escapes in 263). Their VALUE error stays inside the certified
            // budget; their iteration count is untestable. The probes below
            // are single-transit.
            for dcp in [(0.0, 0.7e-5_f64), (0.0, -0.7e-5), (0.0, 3e-5), (1e-5, 1e-5)]
            {
                let (turns, iters, esc, j) = gate_table_run_pixel(
                    &[], &[], &lorbit, &lgates, dcp, long_iter, eps,
                );
                let (e_esc, e_iter) =
                    exact_pixel((cx + dcp.0, cy + dcp.1), long_iter);
                println!(
                    "  probe dc=({:.1e},{:.1e}): {} iters {} (turns {}, jumps {}) | exact {} iters {} | Δiter {}",
                    dcp.0,
                    dcp.1,
                    if esc { "ESC" } else { "int" },
                    iters,
                    turns,
                    j,
                    if e_esc { "ESC" } else { "int" },
                    e_iter,
                    iters as i64 - e_iter as i64
                );
                assert_eq!(esc, e_esc, "[{}] probe escape-flag mismatch", name);
                if e_esc {
                    assert!(
                        (iters as i64 - e_iter as i64).abs() <= 2,
                        "[{}] probe Δiter beyond ε budget",
                        name
                    );
                }
            }
        }
    }

    #[test]
    fn gate_serialization_round_trip() {
        // The flat GPU stream must reproduce the build gate exactly: shipped
        // slots bit-equal, and a probe pixel's run (turns, iters, fate,
        // jumps) identical through the deserialized record.
        let orbit = ref_orbit_f64(-1.25, 0.0, 3000);
        let log2_c_max = -5.0 * std::f64::consts::LOG2_10;
        let sat = saturated_spans(&orbit, log2_c_max);
        let gates = build_gates(&orbit, (-1.25, 0.0), log2_c_max, 1e-3, &sat);
        assert_eq!(gates.len(), 1);
        let g = &gates[0];
        let blob = gate_serialize(g);
        let g2 = gate_deserialize(&blob);
        assert_eq!((g.start, g.len, g.p, g.q), (g2.start, g2.len, g2.p, g2.q));
        assert_eq!(g.eps_band.map(|e| e as f32), g2.eps_band.map(|e| e as f32));
        for j in 0..g.p {
            assert_eq!(g.beta[j][1], g2.beta[j][1], "beta linear phase {}", j);
            assert_eq!(g.beta[j][2], g2.beta[j][2], "beta quadratic phase {}", j);
            assert_eq!(g.pc[j], g2.pc[j], "pc phase {}", j);
            assert_eq!(g.far[j], g2.far[j], "far phase {}", j);
        }
        assert_eq!(g.d, g2.d, "d channel");
        let dc = (0.4e-5, 0.6e-5);
        let a = gate_table_run_pixel(&[], &[], &orbit, &gates, dc, 3000, 1e-3);
        let b = gate_table_run_pixel(
            &[],
            &[],
            &orbit,
            std::slice::from_ref(&g2),
            dc,
            3000,
            1e-3,
        );
        assert_eq!(a, b, "probe run through the deserialized gate diverged");
    }

    #[test]
    fn gate_sidecar_vec4_round_trip() {
        // The vec4 sidecar lane (what the shader reads) must reproduce the
        // run behavior exactly, like the flat stream does.
        let orbit = ref_orbit_f64(-1.25, 0.0, 3000);
        let log2_c_max = -5.0 * std::f64::consts::LOG2_10;
        let sat = saturated_spans(&orbit, log2_c_max);
        let gates = build_gates(&orbit, (-1.25, 0.0), log2_c_max, 1e-3, &sat);
        assert_eq!(gates.len(), 1);
        let blob = gates_serialize_vec4(&gates);
        let g2 = gates_deserialize_vec4(&blob);
        assert_eq!(g2.len(), 1);
        let dc = (0.4e-5, 0.6e-5);
        let a = gate_table_run_pixel(&[], &[], &orbit, &gates, dc, 3000, 1e-3);
        let b = gate_table_run_pixel(&[], &[], &orbit, &g2, dc, 3000, 1e-3);
        assert_eq!(a, b, "vec4 sidecar round-trip diverged");
        // eps/r fields survive the f32 narrowing within f32 accuracy.
        assert!((g2[0].r_entry - gates[0].r_entry).abs() < 1e-9);
        assert!(g2[0].eps_band[0] > 0.0);
    }
}
