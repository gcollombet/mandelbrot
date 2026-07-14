# IMPLÉMENTATION : Möbius-c+ BLA (architecture finale)

Spec autonome pour implémenter l'itération-skip **Möbius c-augmentée** avec
**condition de validité simple** (un rayon certifié précalculé par bloc, une
comparaison au runtime, un seul chemin de code). Remplace/unifie les modes
Padé et jet. Toutes les formules ci-dessous ont été vérifiées numériquement.

---

## 0. TL;DR

- **Forme appliquée par bloc** : `m(z,c) = ((A + A'·c)·z + B·c) / (1 + (D + D'·c)·z)`
  — 5 coefficients complexes (~80 B), reste sur le plateau GPU (1 cache line,
  +2 cmul vs Möbius, sous l'ombre de latence).
- **Validité runtime** : UNE comparaison `|z| < r` (r précalculé, certifié).
  Échec → pas exact. Pas de (H1)/(H2)/(G) au runtime : tout est dans r.
- **Build** : jets bivariés (clôture exacte) → coefficients → A', D' dérivés →
  rayon certifié par formule fermée + queue de Cauchy.
- **Ce que ça donne** : wall-clock ≈ Padé partout (jamais plus lent que Möbius),
  traverse les passages quasi-critiques en deep zoom (erreur ÷2 900 à |c|=1e-14
  sur le bloc historique de (G)), erreur totale prouvée O(N·ε).

---

## 1. Cadre

- Référence haute précision : `Z[n+1] = Z[n]² + C`, Z[0]=0.
- Delta par pixel : `z ← 2·Z[k]·z + z² + c`, c = δC fixe par pixel (c=0 : Julia).
- Rebasing Zhuoran : après chaque avancée, si `|Z[m]+z| < |z|` alors
  `z ← Z[m]+z ; m ← 0`. Fin de référence (m ≥ M) : `z ← Z[M]+z ; m ← 0`.
- Paramètres : tolérance `ε` (ex. 1e-12) ; `c_max` = rayon de la vue (borne de
  |c| pour tous les pixels, connu au build) ; `α = √ε`.

## 2. BUILD — étape A : jets bivariés (table hiérarchique)

Polynômes bivariés tronqués au **degré total D_s = 6** (minimum 4 ; 6 recommandé
pour que la queue de Cauchy soit inoffensive), sans terme constant.
Représentation : coefficients complexes `a[i][j]`, 1 ≤ i+j ≤ D_s.

- **Graine (1 pas k)** : `a[1][0] = 2·Z[k]`, `a[2][0] = 1`, `a[0][1] = 1`, reste 0.
- **Composition Y∘X (appliquer X puis Y), tronquée à D_s** :
  `R = Σ_{i+j≤D_s} b_ij · X(z,c)^i · c^j`, puissances X^i calculées tronquées.
  (Substituer une série sans terme constant ne peut pas baisser le degré →
  la troncature avant composition est EXACTE : clôture prouvée, vérifiée au bit.)
- **Table** : niveaux l = 0..⌈log₂ M⌉, niveau l = blocs de longueur 2^l,
  merge par paires. Attention : Z[0]=0 → a[1][0]=0 pour tout bloc préfixe →
  son rayon sera 0 automatiquement (jamais de skip depuis m=0 : correct).
- Le jet ne sert QU'AU BUILD (coefficients + certificats). Ne pas le livrer
  au runtime.

## 3. BUILD — étape B : coefficients Möbius-c+ par bloc

Notation : `c_ij = a[i][j]` du jet du bloc.

```
A  = c_10                     (= ∏ 2Z_k, récurrence affine A_z = A_y·A_x)
B  = c_01                     (récurrence B_z = A_y·B_x + B_y)
D  = −c_20 / c_10             (Padé [1/1] ; identité vérifiée : −A·D = c_20,
                               équivaut à la récurrence D_z = D_x + A_x·D_y)
A' = c_11 + B·D               (annule le terme spurieux zc)
D' = −(c_21 + D·c_11) / A     (annule le terme z²c)
```

## 4. BUILD — étape C : rayon certifié r par bloc (formule fermée + queue)

### 4.1 Coefficients compensés
Erreur de la forme : `Φ − m = Q / (1 + (D+D'c)z)` avec
`Q = (1 + (D+D'c)z)·Φ − ((A+A'c)z + Bc)`. Coefficients de Q :

```
q_ij = c_ij + D·c_{i−1,j} + D'·c_{i−1,j−1}      (termes hors indice → 0)
```
moins A en (1,0), A' en (1,1), B en (0,1). **Par construction** :
`q_10 = q_01 = q_20 = q_11 = q_21 = 0` (vérifier numériquement au build —
c'est le test d'intégrité des étapes B/C). Les q non nuls commencent à
(3,0) [= c_30 − c_20²/c_10, le coefficient de superconvergence], (0,2) [= c_02,
résidu c² pur], (1,2), etc.

### 4.2 Majorant scalaire (pour la queue de Cauchy)
Sur le polydisque |z| ≤ R_z, |c| ≤ R_c :
```
ρ ← R_z ;  pour chaque pas k du bloc :  ρ ← |2Z_k|·ρ + ρ² + R_c
M = ρ_final ;  M_Q = (1 + |D|·R_z + |D'|·R_z·R_c) · M + |A|R_z + |A'|R_zR_c + |B|R_c
```
(M_Q majore |Q| sur le polydisque ; balayage des pas au build, O(M log M) réels.)

### 4.3 Borne du reste et rayon
Pour x = |z|, y = c_max, θ = max(x/R_z, y/R_c) < 1 :
```
REST(x,y) = Σ_{i+j ≤ D_s, q_ij ≠ 0} |q_ij|·x^i·y^j                (termes stockés)
          + M_Q · θ^(D_s+1) · ((D_s+2) − (D_s+1)·θ) / (1−θ)²      (queue Cauchy)
DEN(x,y)  = 1 − |D|·x − |D'|·x·y                                   (exiger > 0.5)
Condition (V):  REST(x, c_max) / DEN ≤ ½·ε·(|A|·x + |B|·c_max)
```
`r` = plus grand x satisfaisant (V) : **scan géométrique descendant** (pas de
bisection — la condition n'est pas garantie monotone), x = 10^lg, lg de
log10(0.999·R_z) à −16 par pas de 0.1 ; premier succès → r.
Maximiser sur les polydisques : `R_z ∈ {3e-2, 1e-2, 1e-3}` ×
`R_c = s·c_max, s ∈ {3e3, 3e5}` (ANISOTROPE obligatoire : R_c=R_z gonfle M
via le canal c des gros blocs ; R_c=O(c_max) fige θ_c≈1 — deux échecs vécus).

### 4.4 Validité intermédiaire (merge)
Au merge de x puis y : `r_bloc ← min(r_formule, r_x, r_y / (|A_x| + r_y·|D_x|))`.
(Garantit que le point intermédiaire reste dans la validité du sous-bloc y ;
même règle que le Lemme 5 Julia.)

## 5. RUNTIME (un seul kernel)

```
tant que pas échappé :
  pour l du niveau max à 1 :
    si m % 2^l ≠ 0 : continuer
    b = table[l][m >> l] ; si m + b.len dépasse M : continuer
    si |z| < b.r :
        Ae = b.A + b.Ap*c ; De = b.D + b.Dp*c            // 2 cmul
        z  = (Ae*z + b.B*c) / (1 + De*z)                  // + pole implicite
        m += b.len ; appliqué = vrai ; break
  si non appliqué :  z = 2*Z[m]*z + z*z + c ; m += 1      // pas exact
  test échappement sur Z[m]+z ; rebasing Zhuoran
```
- Pas de test (H1)/(H2)/(G)/pôle séparé : le rayon certifié couvre tout
  (DEN > 0.5 est dans (V)). Option paranoïa : garde `|1+De·z| > 1e-3` → pas exact.
- Précision : référence en double-single (Z_hi+Z_lo) ; delta en double tant que
  possible ; coefficients avec **exposant partagé par bloc** (rescalés), PAS de
  tout-floatexp (leçon GPU : c'est ce qui a coûté 2× au jet).
- Tag/rayon par BLOC → choix cohérent par warp, zéro divergence de forme.

## 6. Validation obligatoire (dans cet ordre)

1. **Intégrité build** : q_10..q_21 = 0 à ~1e-14 relatif sur tous les blocs.
2. **Clôture jet** : jet composé == polynôme exact tronqué (blocs L=6, écart 0).
3. **Test du bloc historique (G)** : réf seahorse
   C = (−0.743643887037151, 0.131825904205330), bloc pas 26→50 (contient
   |2Z_39| ≈ 5.4e-3), z_entrée = 7.53e-13, ε = 1e-12 :
   - Möbius simple : err ≈ 1.5e-9 à |c|=1e-14 (doit ÉCHOUER si testé)
   - **Möbius-c+ : err ≤ ~5e-13 < ε à |c|=1e-14** ; scaling résiduel ~c²
     (÷~100 par décade de |c| en profondeur).
4. **Superconvergence canal z (c=0)** : sur bloc near-parab
   C = (−0.7499, 0.0001), S=2, L=256 : err_rel/x² = |c_30 − c_20²/c_10|/|c_10|
   à toutes les décimales (≈ 9.5), indépendant de L.
5. **Erreur globale** : vs orbite de perturbation exacte (même rebasing),
   ρ_N/(N·ε) ≤ O(1) (cible < 5) sur seahorse / near-parab / spiral / Feigenbaum,
   ε ∈ {1e-12, 1e-15}, |c| ∈ {1e-13, 1e-14, 1e-16}.
6. **Perf** : #applications ≤ Möbius simple partout (jamais plus, par
   construction r_c+ ≥ r_Möbius) ; wall-clock ≈ Padé sur les vues lentes ;
   gain aux passages quasi-critiques (Feigenbaum, minibrots).
7. **Recensement** (instrumentation) : compter les blocs où
   r < bande du delta (~1e-13..1e-11 en deep zoom). Attendu ≈ 0 à |c| ≤ 1e-14.
   S'il est significatif sur vos vues (zoom modéré |c| ≥ 1e-12 + passages
   quasi-critiques denses), envisager le chemin jet en second étage — sinon
   le repli pas-exacts suffit.

## 7. Pièges connus (tous vécus)

- **Jamais de skip depuis m=0** (Z[0]=0) — automatique via r=0, ne pas contourner.
- **Fin de référence** : le rebase `z += Z[M]` rend z ~O(1) → plus de skips
  ensuite : NORMAL. Ne pas benchmarker au-delà de la longueur de référence
  (bug vécu : gains dilués ×20).
- **Échelle d'erreur** : toujours `ε·(|A|x + |B|c_max)` — l'échelle |A|x seule
  s'annule en z→0 alors que le reste garde ses termes purs en c → rayons nuls.
- **Scan, pas bisection**, pour le rayon (non-monotonie possible).
- **c_max par vue** : les rayons dépendent de c_max ; re-générer la table si la
  vue change d'échelle (de toute façon la référence change).
- Comparer les perfs en **#applications / wall-clock**, jamais en ops pondérées
  (la convention arithmétique a inversé deux fois le classement du projet).
- D' peut sur-corriger à |c| "grand" (≥1e-12) — le rayon certifié le gère,
  ne pas by-passer (V).

## 8. Références théoriques (dans /outputs)

- `Julia_Mobius_proof_EN.pdf` : transport, récurrence, O(Nε) (inconditionnel, c=0).
- `Mandelbrot_Mobius_companion_EN.pdf` : (ND), structure du théorème avec c≠0.
- `Jet_bivariate_theorem_EN.pdf` : clôture, majorant, Cauchy, règle (V).
- `JET_BLA_FINDINGS.md` §12–13 : formule de superconvergence, mesures Möbius-c+.
Le théorème applicable ici : erreur locale par bloc ≤ ε·|sortie| via (V) +
transport (c s'annule dans les différences) + (ND, assuré par le rebasing)
⟹ ρ_N ≤ e·N_b·ε·(1+O(√ε)).
