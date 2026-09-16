# Retours de Feigenbaum finis : preuve, builder et intégration runtime

## Verdict exécutif

Les deux directions sont maintenant poussées jusqu'au point raisonnable sans
réécrire l'intégralité du calcul intervalle publié :

1. le checker Lean sait rejouer l'algèbre rationnelle et l'agrégation des
   composantes du certificat classique `m=2` ;
2. un retour quadratique concret de longueur `2^n` possède une interface de
   certificat finie, un builder Rust et un repli runtime impossible à
   contourner avec une simple proposition flottante.

Le signal numérique est bon : sur `c = -1.4011551890920506` et le disque
normalisé `|z| <= 0.25`, l'erreur échantillonnée entre le retour et le point
fixe stocké tombe jusqu'à `3.27e-9` à `skip=256`.

**Raffinement §4 livré, désormais CERTIFIÉ** : le certificat d'ordre 2 sur
la différence `D_n = G_n - H` (jets + Taylor de cellule + subdivision
adaptative) fait tomber le plancher uniforme de `1.06e-2` à `5.03e-5` à
budget `1e-4` (~13k cellules), le résidu étant purement le terme `M₂h²` qui
descend en `h²` par subdivision. Le builder entier (différence **et**
fenêtre en `c` §5, avec marge certifiée sur `|s_n(c)|`) tourne en
arithmétique de boules à arrondi dirigé : `roundoff_omitted = false`,
chaque nombre exporté est une vraie borne. Les critères §7.1–7.3 sont
mesurés : erreur + fenêtre compatibles, sauts 2 à 7× le meilleur bloc Padé
aux passages critiques de la cascade, 75–100 % de qualification après
rebasing. Le rejeu noyau est amorcé : `pilot_cell_inclusion` prouve dans
Lean, par arithmétique dyadique exacte et `decide`, une inclusion concrète
d'une cellule contre la vraie définition du retour. Restent : étendre ce
pilote au certificat complet, et le format CFe / gain mur (§7.4–7.5, qui
supposent un prototype shader).

## 1. Formules prouvées

Pour

```text
P_c(z) = z² + c,
k      = 2^n,
s_n    = P_c^[k](0),
G_n(z) = P_c^[k](s_n z) / s_n,
```

Lean prouve, si `s_n != 0`,

```text
G_n(0) = 1.
```

La jauge `S_n(z)=s_n z` satisfait exactement

```text
G_n = S_n^-1 ∘ P_c^[k] ∘ S_n.
```

La conversion d'erreur n'utilise aucune constante cachée :

```text
dist(S_n z, S_n w)     = |s_n| dist(z,w),
dist(S_n^-1 z,S_n^-1 w)= dist(z,w)/|s_n|.
```

Au premier niveau, la famille complexe est exactement conjuguée au format
quadratique normalisé :

```text
P_c(cz)/c = 1 - (-c) z².
```

## 2. Certificat par grille finie

Soit `R` le retour exact, `H` le modèle stocké, `x_i` les centres de cellules
et `h` leur rayon. Le checker fournit :

```text
|R(x_i)-H(x_i)| <= E_sample,
|R(x)-R(x_i)|   <= E_variation      pour x dans la cellule i,
Lip(H)          <= L_H,
|x-x_i|         <= h.
```

Le théorème Lean `FiniteGridWitness.uniform_error` conclut

```text
|R(x)-H(x)| <= E_variation + E_sample + L_H h.
```

Le builder propage la variation exacte hors arrondis par

```text
w_(j+1) = w_j² + c,
e_(j+1) = (2|w_j| + e_j)e_j,
e_0     = |s_n| h.
```

En effet, si `|z_j-w_j| <= e_j`, alors

```text
|z_(j+1)-w_(j+1)|
 = |(z_j-w_j)(z_j+w_j)|
 <= e_j(2|w_j|+e_j).
```

Après le retour à la jauge normalisée,

```text
E_variation = e_k / |s_n|.
```

La dérivée du modèle de Chebyshev est majorée sans échantillonnage avec

```text
T_m'(z) = m U_(m-1)(z),
U_0 <= 1,
U_1 <= 2R,
U_(j+1) <= 2R U_j + U_(j-1).
```

## 3. Census initial

Configuration : `c=c_infinity`, `|z|<=0.25`, grille `64×64`. Les arrondis
flottants ne sont pas inclus ; le builder marque explicitement ce fait.

| Niveau | Skip | Erreur échantillonnée | Variation cellule | Borne totale |
|---:|---:|---:|---:|---:|
| 2 | 4 | `2.061e-5` | `4.386e-3` | `1.064e-2` |
| 3 | 8 | `6.125e-5` | `4.388e-3` | `1.068e-2` |
| 4 | 16 | `2.845e-6` | `4.386e-3` | `1.062e-2` |
| 5 | 32 | `1.297e-6` | `4.386e-3` | `1.062e-2` |
| 6 | 64 | `1.036e-7` | `4.386e-3` | `1.062e-2` |
| 7 | 128 | `2.923e-8` | `4.386e-3` | `1.062e-2` |
| 8 | 256 | `3.274e-9` | `4.386e-3` | `1.062e-2` |

Interprétation : la convergence universelle est clairement visible. La
profondeur n'est plus le facteur limitant ; la subdivision d'ordre 1 l'est.
Augmenter seulement la grille ferait croître le coût quadratiquement et n'est
pas la bonne optimisation.

## 4. Raffinement de la différence — LIVRÉ

Le certificat interpole maintenant la **différence**

```text
D_n(z)=G_n(z)-H(z),
```

plutôt que deux transports séparés de `G_n` et `H`. Implémentation :

1. `return_jet` propage simultanément `G_n`, `G_n'`, et une enveloppe de
   `sup |G_n''|` valable sur toute la cellule (recurrences
   `u_(j+1)=2w_ju_j`, `v_(j+1)=2(u_j²+w_jv_j)`, enveloppes avec
   `|w_j|+e_j`) ;
2. `chebyshev_model_jet` évalue `H`, `H'`, `H''` par la récurrence à trois
   termes différentiée ; `chebyshev_second_derivative_bound` majore
   `sup |H''|` sans échantillonnage (`τ/p/q`) ;
3. la borne de cellule est le Taylor d'ordre 2 **conservatif**

   ```text
   |D_n(x)| <= |D_n(x_i)| + |D_n'(x_i)| h + M₂ h²,
   ```

   sans le facteur ½ : c'est exactement ce que le pont valeur moyenne
   `taylor_remainder_of_deriv_bound` prouve dans Lean (depuis Mathlib,
   `Convex.norm_image_sub_le_of_norm_hasFDerivWithin_le'`), donc le builder
   et le théorème calculent la même quantité ;
4. `propose_difference_return` subdivise en quadtree uniquement les cellules
   dont la borne locale dépasse le budget ;
5. `Dyadic::from_f64_exact` + `export_dyadic_certificate` exportent toutes
   les extrémités en rationnels dyadiques exacts (tout `f64` fini l'est) ;
6. Lean rejoue les sommes et inclusions : `DifferenceGridWitness.uniform_error`
   (rayons hétérogènes par cellule) et `RationalCellRecord.localBound_le_budget`
   (agrégation `v + d·h + M₂h²` dans `ℚ` via `RatUpper`, extrémités
   `RatUpper.dyadic`).

### Census CERTIFIÉ de la différence (arrondis inclus, §7.1 + §7.2)

Configuration : `c=c_infinity`, `|z|<=0.25`, grille initiale `8×8`, budget
`1e-4`, profondeur max 10. **Toutes les récurrences sont maintenant en
arithmétique de boules complexes à arrondi dirigé (`next_up`/`next_down`) :
chaque nombre est une vraie borne, `roundoff_omitted = false`.** Le pavage
est dyadique exact (largeur puissance de deux × multiplicateurs entiers),
donc la couverture n'a aucun trou flottant. `δ_max` est la fenêtre en `c`
telle que `K_c·δ ≤ 10 %` du budget, confirmée en relançant le builder de
fenêtre à ce `δ`.

| Niveau | Skip | Cellules | `|D(x_i)|` max | `|D'(x_i)|` max | Borne uniforme | `K_c` | `δ_max` |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 | 4 | 13120 | `2.042e-5` | `2.274e-4` | `7.061e-5` | `1.30e2` | `7.7e-8` |
| 3 | 8 | 16540 | `5.994e-5` | `5.197e-4` | `9.999e-5` | `1.11e3` | `9.0e-9` |
| 4 | 16 | 13120 | `2.801e-6` | `2.516e-5` | `5.293e-5` | `9.41e3` | `1.1e-9` |
| 5 | 32 | 13120 | `1.274e-6` | `1.103e-5` | `5.147e-5` | `7.99e4` | `1.3e-10` |
| 6 | 64 | 13120 | `1.027e-7` | `9.013e-7` | `5.033e-5` | `6.79e5` | `1.5e-11` |
| 7 | 128 | 13120 | `3.547e-8` | `2.576e-7` | `5.030e-5` | `5.76e6` | `1.7e-12` |
| 8 | 256 | 13120 | `6.025e-8` | `9.313e-8` | `5.034e-5` | `4.89e7` | `2.0e-13` |

Interprétation : le plancher `1.062e-2` de l'ordre 1 tombe à `5.03e-5`
(×211) à budget égal en ~13k cellules — les chiffres sont identiques à la
découverte f64 au bruit près, comme attendu (l'arrondi vit ~11 ordres sous
les bornes). La seule trace visible de l'arrondi : à skip 256, `|D(x_i)|`
remonte de `3.3e-9` à `6.0e-8` — l'amplification de l'arrondi par 256
itérations, désormais comptée honnêtement ; elle reste 3 ordres sous la
borne uniforme. La quasi-annulation est conservée, le plancher restant est
**entièrement** le terme de courbure `M₂h²` avec `M₂ ≈ 6.6` (dominé par
`sup|H''|`), donc il descend en `h²` : chaque niveau de subdivision
supplémentaire divise la borne par 4 au prix de ×4 cellules. Un budget
rendu `~1e-6` coûte ~410k cellules — c'est un paramètre, plus une limite
structurelle.

Colonne fenêtre : `K_c` croît d'un facteur ~8,5 par niveau (cohérent avec
`α²·2^…` de la cascade), donc la fenêtre utilisable se contracte du même
facteur. À skip 256, `δ_max ≈ 2e-13` couvre confortablement une vue écran
aux échelles où ce skip est pertinent (σ ≤ 1e-12, voir census §7 ci-après) ;
c'est aux échelles peu profondes que la fenêtre est limitante — cohérent
avec un tier pensé pour la cascade profonde.

## 5. Fenêtre de paramètres — builder LIVRÉ

Lean prouve le raccord générique suivant. Si

```text
|R_c(z)-R_c0(z)| <= K_c |c-c0|,
|c-c0|           <= delta,
|R_c0(z)-H(z)|   <= E_0,
```

alors

```text
|R_c(z)-H(z)| <= K_c delta + E_0.
```

Le builder concret `propose_parameter_window` tient compte du fait que
`s_n(c)` varie lui aussi : il différentie directement

```text
G_n(c,z)=P_c^[2^n](s_n(c)z)/s_n(c)
```

par les récurrences d'enveloppe (sup sur cellule × fenêtre)

```text
σ_(j+1) = 2 o_j σ_j + 1              (∂c orbite critique, exact)
ε_(j+1) = (2|o_j| + ε_j) ε_j + δ     (dérive de s_n sur la fenêtre)
Σ_(j+1) = 2 (|o_j| + ε_j) Σ_j + 1    (sup |∂c s_j|)
e'_(j+1) = (2|w_j| + e'_j) e'_j + δ  (enveloppe orbite cellule × fenêtre)
Q_(j+1) = 2 (|w_j| + e'_j) Q_j + 1   (sup |∂c w_j|)
```

et conclut `K_c <= Q_k/m_s + (|w_k|+e'_k)Σ_k/m_s²` avec la marge inférieure
certifiée `m_s = |s_n(c0)| - ε_k`, refusée si non strictement positive
(à `skip=256`, `δ=1e-2` détruit la jauge et le builder échoue explicitement).
Mesure à `n=4`, `δ=1e-12` : `K_c ≈ 9.4e3`, `m_s ≈ 3.6e-2`, contribution
`K_c δ ≈ 9.4e-9` — négligeable devant le budget de rendu, la fenêtre utile
sera donc dictée par la profondeur `2^n`, `K_c` croissant avec le skip.

## 6. Intégration au mode auto

Le tier renormalisé doit être un candidat supplémentaire du portefeuille,
pas un remplacement de Padé/jet :

```text
builder
  -> propose (skip=2^n, jauge, domaine, erreur)
  -> checker rationnel/Lean
  -> jeton opaque KernelVerifiedFiniteReturn
  -> candidat auto avec rayon effectif et coût
```

La sélection reste la règle déjà motivée par le shadowing : parmi les blocs
certifiés qui contiennent l'état courant et respectent le budget d'erreur,
choisir celui qui maximise le travail exact évité, puis conserver le meilleur
secondaire comme secours.

Sans jeton noyau :

```text
select_finite_return(None) = ExistingPortfolio.
```

Le module Rust rend le type du jeton opaque et ne fournit volontairement
aucune fonction `f64 proposal -> verified`. Le tier est donc inactif aujourd'hui
et ne modifie ni le shader ni le sidecar.

## 7. Critères avant shader — 1 à 3 MESURÉS

N'écrire le shader que si le census certifié montre simultanément :

1. une erreur compatible avec le budget du rendu, y compris la fenêtre en `c` ;
2. des skips `2^n` nettement supérieurs au meilleur bloc Padé/jet sur les vues
   de cascade ;
3. une fréquence de succès suffisante après rebasing ;
4. un format de coefficient raisonnable, vraisemblablement CFe et non `f32` ;
5. un gain mur mesuré après prise en compte de la divergence et des lectures.

### État mesuré (2026-07-14)

**Critère 1 — VÉRIFIÉ** : borne uniforme certifiée `5.03e-5` (arrondis
inclus), fenêtre en `c` comprise via la colonne `δ_max` du census §4.

**Critères 2 et 3 — census terrain** (`renormalized_vs_portfolio_census`,
mesure f64 des fréquences et sauts disponibles, pas une preuve). Événement =
rebase d'une orbite pixel sur la cascade à `c_∞` (orbite 8192, table Padé
`ε=1e-3`, grille 16×16 pixels). Côté portefeuille : le plus grand bloc Padé
applicable à l'indice suivant (test de rayon `α − β|dc|`, sans la garde
near-critical du shader — comparaison donc favorable au portefeuille).

| Échelle vue | Événements | Saut renorm. moyen | Saut Padé moyen | Ratio | Succès renorm. |
|---:|---:|---:|---:|---:|---:|
| `1e-6` | 2210 | 140.6 | 20.0 | **7.0×** | 74.8 % |
| `1e-9` | 256 | 2048 | 421 | **4.9×** | 100 % |
| `1e-12` | 256 | 2048 | 1025 | **2.0×** | 100 % |

Lecture : aux passages près du point critique — exactement là où la garde
near-critical éteint les blocs du portefeuille — le tier renormalisé offre
2 à 7 fois le saut moyen, avec un taux de qualification de 75 à 100 % des
rebases (le disque certifié `|z| ≤ 0.25|s_m|` contient l'état rebasé avec
`m ≈ n−2` au passage `2^n`, comme prédit par `|s_m| ~ α^{-m}`). Aux vues
profondes, chaque pixel rebase au passage de doublement et qualifie à 100 %.

**Rejeu noyau amorcé** : `LeanProofs/FeigenbaumRationalReplay.lean` prouve
`pilot_cell_inclusion`, une inclusion concrète d'une cellule (skip 4)
`dist(normalizedReturn c 4 x₀, H(x₀)) ≤ 10⁻⁶` par arithmétique dyadique
exacte et `decide` du noyau — l'obligation `samples` d'une cellule, sans
flottant, contre la vraie définition du retour. **Restent** : étendre ce
pilote à toutes les cellules + obligations variation/dérivée/courbure (jeton
noyau complet).

## 7 bis. Prototype shader LIVRÉ (2026-07-14)

Le tier renormalisé est maintenant implémenté dans le shader de rendu, en
additif et éteint par défaut (`override ENABLE_RENORM: bool = false`, même
mécanique de spécialisation que `ENABLE_DEEP`/`ENABLE_PORTFOLIO` — dead-code
éliminé quand off, chemins existants byte-identiques).

Simplification clé du chemin de données : **aucune donnée par-bloc à
sérialiser**. La gauge `s_n = P_c^[2^n](0)` est déjà l'orbite de référence à
l'indice `2^n` (`getOrbit(1<<n)`, binding 1), et le modèle `H` est universel
— une constante de shader (22 coefficients). Il ne reste qu'un flag
d'activation.

Pièces livrées :
- `feigenbaum.rs::chebyshev_model_clenshaw` — évaluation `(H, H')` par
  Clenshaw en `u = 2x²−1` (22 étapes au lieu de 42), validée contre le modèle
  certifié (`clenshaw_matches_chebyshev_model`) ; table WGSL émise par
  `print_wgsl_chebyshev_table` ;
- `mandelbrot_brush.wgsl` : constante `RENORM_H_A`, `renorm_eval_h` (Clenshaw
  `fe` valeur + dérivée), et `try_apply_renorm` — au rebase critique
  (`ref_i == 0`, donc `dz` = état complet car `orbit[0]=0`), plus grand `n`
  avec `|dz| ≤ 0.25·|s_n|`, saut `dz ← s_n·H(dz/s_n)`, `i += 2^n`, dérivée
  propagée par le facteur multiplicatif `H'(dz/s_n)` (terme de paramètre
  `O(K_c·dc)` négligé — valide en cascade profonde) ;
- `Engine.ts` : axe de pipeline `renorm` (cache de spécialisation) + flag
  runtime `renormEnabled`.

**Critère 4 (format) — RÉGLÉ** : coefficients en `f32` constants (le modèle
`H` a des coefficients O(1e-1..1e-33), `f32` suffit devant l'erreur `~5e-5`),
`s_n` et `dz` en `fe` (floatexp) via les helpers existants.

**Vérification effectuée** :
- le shader **compile et valide** (le module se construit avec les nouvelles
  fonctions ; l'app rend sans régression, ~278 fps, tier éteint) ;
- le schéma d'évaluation exact du shader **reproduit le modèle certifié**
  (test Clenshaw) ;
- l'opération de bloc `dz ← s_n·H(dz/s_n)` **reproduit le pas exact `2^n`**
  avec erreur minime (`8.8e-7` à `1.7e-10` selon le niveau) et gain `2^n` par
  bloc (`shader_renorm_block_chains_against_exact_stepping`).

**Critère 5 (gain mur GPU) — NON MESURÉ EN VIVO cette session.** Faire tirer
le tier sur GPU exige une vue de cascade réellement profonde (chemin
floatexp), et l'orchestration profondeur/worker de l'`Engine` est couplée à
son pipeline d'entrée interactif : le piloter depuis la console laisse
`scaleExp`/`maxIter` obsolètes et le chemin profond ne s'engage pas. Le gain
de sauts intégré est en revanche déjà quantifié côté CPU (census §7.2–7.3 :
2–7× le meilleur bloc Padé). Prochaine étape propre : un hook de debug qui
force une vue profonde (ou un preset de cascade), puis lecture des compteurs
`realizedSkip`/`tierApps` tier on/off.

## 8. Fichiers livrés

- `lean-proofs/LeanProofs/VerifiedRationalBounds.lean` : checker rationnel ;
- `lean-proofs/LeanProofs/FeigenbaumRationalReplay.lean` : rejeu noyau —
  arithmétique dyadique exacte (`Dyadic`/`DyC` sur `Int`/`Nat`, décalages
  `Nat.shiftLeft`), itération quadratique et modèle de Tchebychev concrets,
  transport `dist_div_le`, et le pilote `pilot_cell_inclusion` (1 cellule,
  skip 4, `decide` exact, 0 sorry) ;
- `lean-proofs/LeanProofs/FeigenbaumFiniteReturn.lean` : retour fini, jauges,
  grille, fenêtre de paramètres, repli ; **plus** le certificat d'ordre 2 :
  `taylor_remainder_of_deriv_bound` (pont valeur moyenne Mathlib),
  `difference_cell_bound`, `DifferenceGridWitness.uniform_error`,
  `RatUpper.dyadic` et `RationalCellRecord.localBound_le_budget` ;
- `reference_calculus/src/feigenbaum.rs` : builder/probe et census build-only ;
  **plus** `return_jet`, `chebyshev_model_jet`,
  `chebyshev_second_derivative_bound`, `propose_difference_return`
  (quadtree adaptatif), `Dyadic`/`export_dyadic_certificate` et
  `propose_parameter_window` ;
- `FEIGENBAUM_RENORMALIZATION_CERTIFIED_PROOF.md` : statut mathématique global.
