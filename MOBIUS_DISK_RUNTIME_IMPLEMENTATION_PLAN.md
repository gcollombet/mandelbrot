# Plan d'implémentation — disques exacts de Möbius, perturbation et rebasing

## 1. Objet

Ce document décrit comment exploiter les preuves de transport exact d'un
disque par une homographie complexe dans le builder Mandelbrot, puis comment
décider si les gains justifient une modification de `auto` ou du shader.

La cible prioritaire est le rayon **effectif** de `matrix-c1`, c'est-à-dire le
minimum des certificats valeur et dérivée. Le dernier census plaçait ce tier à
environ `-0.14 log2` du jet à `skip=8192`; un gain robuste de l'ordre de
`0.2 log2` pourrait donc rouvrir la question de son intégration GPU.

Statuts utilisés :

- **PROUVÉ** : théorème Lean sans `sorry`, `admit` ni `axiom` ;
- **IMPLÉMENTÉ** : code Rust ou WGSL présent et testé ;
- **PARTIEL** : les briques sont prouvées, mais pas leur raccord complet ;
- **OUVERT** : preuve ou implémentation encore absente.

## 2. Ce que les preuves actuelles permettent

Pour une homographie fixe

```text
             A z + B
Phi(z) = -------------
             C z + D
```

et un disque `D(z0,R)`, posons

```text
p     = A z0 + B
q     = C z0 + D
Delta = |q|^2 - |C|^2 R^2.
```

Lorsque `Delta>0`, les formules prouvées sont

```text
centre' = (p conj(q) - A conj(C) R^2) / Delta
rayon'  = |A D - B C| R / Delta
den_min = |q| - |C| R.
```

`LeanProofs/MobiusDisk.lean` prouve :

1. `Delta>0` si et seulement si le disque fermé ne contient aucun pôle ;
2. l'identité hermitienne signée qui conserve exactement intérieur,
   frontière et extérieur ;
3. les formules du centre et du rayon ;
4. le transport du disque fermé et de son cercle frontière ;
5. l'équivalence d'appartenance lorsque `det != 0`.

### Limite essentielle

Pour un disque centré en zéro et une matrice fixe, le test

```text
|D| - |C| R > 0
```

utilisé aujourd'hui est déjà exact. Remplacer seulement cette ligne par
`Delta>0` ne donnera donc pratiquement aucun gain.

Le gain doit venir de deux informations actuellement perdues :

- conserver le **centre complexe mobile** du disque au lieu de tout recentrer
  en zéro après chaque transport ;
- conserver autant que possible la dépendance commune des coefficients en
  `dc`, au lieu de majorer indépendamment toutes leurs normes.

## 3. Architecture cible

```text
preuve disque fixe
    -> primitive Rust exacte
    -> oracle build-only à dc fixé
    -> mesure du plafond de gain
    -> enveloppe uniforme M0 + dc M1 + E
    -> preuves Lean du raccord
    -> rayons valeur et dérivée concurrents
    -> census
    -> auto existant
    -> éventuel tier GPU matrix-c1
```

Le shader ne change pas avant le census certifié.

## 4. Lot 1 — primitive Rust pour une homographie fixe

Créer `reference_calculus/src/mobius_disk.rs` et le déclarer comme module
interne dans `reference_calculus/src/lib.rs`.

Structures minimales :

```rust
pub struct ComplexDisk {
    pub center: CFe,
    pub log2_radius: f64,
}

pub struct DiskImage {
    pub disk: ComplexDisk,
    pub log2_den_margin: f64,
    pub log2_delta: f64,
}
```

Fonction centrale :

```rust
pub fn homography_image_disk(
    m: &HomFe,
    input: ComplexDisk,
) -> Option<DiskImage>;
```

Contrat :

- calculer les formules prouvées sans recentrage ;
- retourner `None` lorsque `Delta<=0` ;
- rester invariant sous la normalisation commune de `A,B,C,D` par une
  puissance de deux ;
- ne pas introduire de chemin flottant `f32` : les spreads observés pour
  `matrix-c1` imposent `CFe`.

Tests :

- identité et application affine ;
- disque de rayon nul ;
- transport de points échantillonnés sur le cercle frontière ;
- comparaison à un échantillonnage dense de l'intérieur ;
- invariance bit-exacte sous les décalages d'exposant ;
- rejet à l'approche du pôle ;
- cas `det=0`, qui doit rester un cas dégénéré explicitement identifié.

## 5. Lot 2 — oracle build-only à paramètre fixé

Ce lot mesure le gain géométrique maximal avant de construire un certificat
uniforme plus coûteux.

Dans `matrix_c1.rs` :

1. réutiliser les segments canoniques de l'arbre équilibré ;
2. conserver les homographies de suffixe nécessaires au transport des
   disques, au lieu de n'en garder que `dlow`, `cup`, `dup` ;
3. pour une valeur concrète de `dc`, évaluer
   `M0 + dc M1` dans le repère normalisé ;
4. transporter le disque sans jeter son centre ;
5. comparer le rayon obtenu au majorant scalaire actuel.

Valeurs de `dc` recommandées : les seize échantillons déjà employés par
`unified_replay_band`, soit huit directions sur les anneaux `c_max` et
`c_max/4`.

Diagnostics à ajouter :

```text
diskOracleValue
diskOracleDeriv
deltaVsScalarValue
deltaVsScalarEffective
poleDeaths
centerShiftLog2
```

Cet oracle n'est pas un certificat runtime : un échantillonnage fini de
`dc` ne couvre pas le disque `|dc|<=c_max`.

### Gate 1

Si le plafond échantillonné reste inférieur à environ `0.1 log2` sur les
blocs profonds qui sont effectivement sondés, ne pas poursuivre vers un
format GPU. Il faudra alors attendre le télescopage hyperbolique complet ou
une enveloppe qui conserve davantage les corrélations.

## 6. Lot 3 — enveloppe uniforme `M0 + dc M1 + E`

Le runtime doit certifier simultanément

```text
M(dc) = M0 + dc M1 + T,
|dc| <= y,
entryNorm(T) <= E.
```

La queue `E` borne chaque entrée individuellement, puisque chaque norme
d'entrée est inférieure à `entryNorm(T)`.

Première enveloppe, volontairement simple :

```text
eA = y |A1| + E
eB = y |B1| + E
eC = y |C1| + E
eD = y |D1| + E.
```

Pour un disque `D(z0,R)` :

```text
q0       = C0 z0 + D0
eq       = |z0| eC + eD
q_min    = max(|q0| - eq, 0)
C_max    = |C0| + eC
DeltaMin = q_min^2 - C_max^2 R^2.
```

Le transport est admissible seulement si `DeltaMin>0`.

Il faut ensuite enfermer l'union des disques images :

```text
centre_nominal       = centre_image(M0, D(z0,R))
erreur_centre        = borne de variation du numérateur / DeltaMin
                     + borne de variation de 1/Delta
rayon_image_maximal  = det_max R / DeltaMin
disque_sortie        = D(centre_nominal,
                         erreur_centre + rayon_image_maximal).
```

Si cette enveloppe indépendante est trop pessimiste, l'amélioration suivante
consistera à minimiser directement la forme hermitienne quadratique en `dc`
sur `|dc|<=y`. Cela conserve la corrélation commune entre `C(dc)` et `D(dc)`.

### Preuves Lean — état révisé

`LeanProofs/MatrixC1Disk.lean` ferme maintenant le noyau sûr :

1. **PROUVÉ** — borne de numérateur/dénominateur sur `D(z₀,R)` par
   `E(|z₀|+R+1)` ;
2. **PROUVÉ** — préservation uniforme de la marge et `Delta_exact>0` ;
3. **PROUVÉ** — inclusion de l'image exacte dans le disque image nominal
   gonflé par `matrixC1EvalMajorant` ;
4. **PROUVÉ** — quantification simultanée pour tout `|dc|≤y` à partir de
   `uniformDenMargin` ;
5. **PROUVÉ** — dérivée directe uniforme à partir de `uniformDetBound`,
   `uniformDenMargin` et `matrixC1DerivMajorantOf` ;
6. **PROUVÉ** — invariance projective du gate de discriminant et de la marge
   dans `MovingDisks.lean`.

Nuance : le disque de sortie certifié reste **fibré par `dc`** — son centre et
son rayon utilisent `M0+dc M1`. C'est mathématiquement plus précis et suffit à
un évaluateur connaissant `dc`, mais un builder voulant sérialiser un unique
disque indépendant de `dc` doit encore borner l'union de ces centres/rayons.
Cette dernière uniformisation est une optimisation de format, pas un trou dans
le certificat fibre par fibre.

## 7. Lot 4 — raccord aux rayons valeur et dérivée

Étendre `MatC1Radii` avec des diagnostics concurrents :

```rust
pub log2_r_disk_value: f64,
pub log2_r_disk_eff: f64,
pub log2_disk_deriv_cost: f64,
```

Une fois le raccord Lean terminé, la production peut prendre

```text
r_value = max(r_value_actuel, r_disk_value)
r_eff   = max(r_eff_actuel,   r_disk_eff).
```

Le maximum est valide parce que chaque branche fournit son propre certificat.
Avant la preuve, les nouveaux rayons restent diagnostics et ne doivent jamais
être sérialisés.

### Dérivée

Une homographie satisfait exactement

```text
Phi'(z) = det(M) / (Cz+D)^2.
```

Sur `D(z0,R)` :

```text
sup |Phi'| <= |det(M)| / (|Cz0+D| - |C|R)^2.
```

Les marges de disque doivent alimenter `matc1_deriv_error_log2`, notamment le
terme de différence des carrés de dénominateurs. Améliorer uniquement la valeur
risque de ne produire aucun gain effectif, puisque la dérivée est actuellement
le canal limitant.

Conserver trois routes concurrentes :

1. certificat direct actuel ;
2. certificat direct utilisant les disques mobiles ;
3. Cauchy comme secours.

## 8. Lot 5 — census et critères de décision

Étendre `matc1_census` avec :

- rayon scalaire actuel ;
- plafond à `dc` échantillonné ;
- rayon uniforme certifié par disques ;
- gain valeur et gain dérivée ;
- perte due à l'uniformisation en `dc` ;
- pourcentage de blocs battant chaque tier ;
- morts par pôle, queue, shadowing valeur et shadowing dérivé ;
- nombre de tours pondérés prédit par le replay `auto`.

Tests de non-régression :

- produit exact contre arbre équilibré ;
- invariance projective ;
- tous les points échantillonnés restent dans les disques certifiés ;
- valeur et dérivée contre l'itération exacte ;
- endpoint `R=0` ;
- préfixité du prédicat de rayon ;
- le rayon publié ne diminue jamais, puisque l'ancien certificat reste
  disponible.

### Gate 2

Poursuivre vers le GPU si au moins l'un des deux critères est satisfait :

- gain effectif d'au moins environ `0.2 log2` au voisinage du crossover
  `cusp-ultra`, pour `skip>=2048` ;
- diminution d'au moins 5 % des tours pondérés sur un ensemble représentatif
  de vues profondes.

## 9. Lot 6 — conséquences pour `auto`

### Amélioration d'un tier existant

Si les disques augmentent les rayons affine, Padé, c+ ou jet sans changer leur
évaluateur :

- ne pas modifier le shader ;
- injecter les nouveaux rayons dans `UnifiedRadii` ;
- laisser `unified_portfolio_tags` recalculer le couple
  principal/secours selon la distribution rebasée de `|dz|` ;
- conserver le sidecar de 16 octets ;
- refaire l'A/B sur les descentes, applications, itérations sautées et temps
  mur.

### `matrix-c1` devient compétitif

Seulement après Gate 2 :

1. ajouter `TIER_MATRIX_C1 = 4` ;
2. passer les tableaux de rayons et de coûts de quatre à cinq tiers ;
3. mesurer le coût CFe réel de l'évaluateur ;
4. laisser le portefeuille choisir `matrix-c1` comme principal ou secours,
   sans ordre de richesse imposé ;
5. choisir le format GPU après le census : buffer matriciel aligné séparé,
   ou record union ;
6. ajouter le tag shader 4 et ses gardes de dénominateur ;
7. mesurer le trafic, la divergence et le temps mur sur GPU réel.

La formule d'encodage du tag de secours reste exactement représentable en
`f32` avec le tag 4, mais les tests et les bornes `0..3` devront être étendus.
Les coefficients `matrix-c1` doivent rester en `CFe`.

## 10. État des preuves de perturbation

Il faut distinguer trois sens du mot « perturbation ».

### 10.1 Récurrence exacte Mandelbrot

Avec

```text
Z_(n+1) = Z_n^2 + C,
W_n     = Z_n + dz_n,
pixel   = C + dc,
```

on obtient

```text
dz_(n+1) = 2 Z_n dz_n + dz_n^2 + dc.
```

Statut : **PROUVÉ** dans `LeanProofs/Rebasing.lean`.

Sont déjà prouvés :

- `exactStep a z c = a*z+z^2+c` avec `a=2Z` ;
- l'identité de transport entre deux perturbations ;
- le majorant `|a|r+r^2+Rc` ;
- l'enclosure récurrente d'une orbite perturbée ;
- les récurrences des première et seconde sensibilités ;
- la dérivée spatiale `a+2z` ;
- les jets bivariés et leur troncature ;
- les certificats de valeur et de dérivée contre l'orbite de perturbation.
- le raccord explicite partant des deux orbites Mandelbrot complètes :

```text
(Z + dz)^2 + (C + dc) - (Z^2 + C)
  = 2 Z dz + dz^2 + dc.
```

Le théorème `mandelbrot_perturbation_identity` ferme ce raccord, et
`fullValue_exactRuntimeStep` prouve que le pas runtime reconstruit exactement
le pas de l'orbite pixel complète.

### 10.2 Perturbation de la matrice `matrix-c1`

Statut : **PROUVÉ pour le certificat fibre par fibre ; PARTIEL pour un unique
record de sortie indépendant de `dc`**.

Sont prouvés :

- la récurrence exacte de `M0` et `M1` ;
- la queue uniforme `c^2+` bornée par `E` ;
- les marges de dénominateur perturbées ;
- l'erreur d'évaluation ;
- la perturbation du déterminant et de la dérivée ;
- le certificat total contre Mandelbrot.

Le raccord à `MobiusDisk.lean` est fermé par
`diskDelta_pos_of_matrixTail`, `mapsTo_closedBall_uniform_all` et
`norm_deriv_exact_le_uniform`. Reste ouverte uniquement l'enveloppe d'union
qui remplacerait tous les disques de sortie dépendant de `dc` par un seul
record sérialisable, si le census montre que cette compression est utile.

## 11. État des preuves du rebasing Zhuoran

Le runtime et les replays appliquent

```text
full = Z_m + dz
si |full| < |dz| ou fin de référence :
    dz <- full
    m  <- 0.
```

Statut actuel : **PROUVÉ, IMPLÉMENTÉ ET TESTÉ**.

`LeanProofs/Rebasing.lean` formalise un état contenant l'itération physique,
l'index de référence, `dz`, sa première dérivée et sa seconde dérivée. Les
boucles Rust CPU, le replay de bande et le shader implémentent la même logique.

### Formules formalisées

1. **Invariance de la valeur physique**

   ```text
   Z_m + dz = Z_0 + (Z_m + dz), puisque Z_0=0.
   ```

2. **Compatibilité avec le pas suivant**

   Si `full=Z_m+dz`, alors le pas relatif à `Z_0=0` représente encore

   ```text
   full^2 + C + dc.
   ```

3. **Diminution garantie par la garde**

   ```text
   |full| < |dz|  ->  |dz_rebase| < |dz|.
   ```

4. **Invariance de la dérivée**

   L'orbite de référence est indépendante de `dc`, donc

   ```text
   d(Z_m+dz)/d(dc) = d(dz)/d(dc).
   ```

   Le runtime peut ainsi conserver `der` pendant le rebase.

5. **Invariance du bailout, du lissage et du DE**

   Ces sorties utilisent la valeur physique `full` et sa dérivée, toutes deux
   inchangées par le changement de représentation.

6. **Théorème de boucle avec plusieurs rebases**

   Après tout mélange de pas exacts et de rebases, l'état représenté reste
   l'état Mandelbrot physique au compteur d'itération total. Les sauts
   approximatifs conservent séparément leurs certificats d'erreur.

7. **Sauts approchés et portefeuille `auto`**

   `ValueWithin`, `DifferentialWithin` et `CertifiedTransition` prouvent que
   les budgets de valeur/dérivées survivent au rebase et que des transitions
   certifiées de tiers différents se composent. `then_rebase` donne zéro coût
   supplémentaire au changement de représentation.

### Module Lean réalisé

`LeanProofs/Rebasing.lean` contient une structure d'état séparant :

```text
iteration totale n
index de référence m
perturbation dz
dérivées der et secondDer
valeur physique Z_m + dz.
```

Principaux théorèmes livrés :

1. `mandelbrot_perturbation_identity` ;
2. `PerturbationState.fullValue_rebase` ;
3. `rebase_preserves_derivative` ;
4. `rebase_guard_decreases_delta` ;
5. `exactRuntimeStep_preserves_value` ;
6. `PerturbationAction.run_initial_correct` ;
7. `rebase_preserves_bailout` ;
8. `rebase_preserves_differential_observable`.
9. `CertifiedTransition.comp` et `CertifiedTransition.then_rebase`.

Ce chantier ferme l'hypothèse sémantique fondamentale utilisée par
`unified_replay_band` et par toutes les boucles `auto`.

## 12. Ordre global recommandé

1. **FAIT** — perturbation, rebasing et composition des budgets approchés ;
2. **FAIT côté Lean** — transport fixe, raccord `M0+dcM1+E`, valeur,
   dérivée, repères mobiles et télescope métrique ;
3. **FAIT** — Schwarz--Pick à deux points et non-expansion des blocs Möbius
   entre frames exactes (`LeanProofs/SchwarzPick.lean`) ;
4. implémenter/compléter l'oracle build-only et mesurer le plafond ;
5. seulement si nécessaire, construire un disque de sortie unique indépendant
   de `dc` ;
6. refaire le census et le replay `auto` ;
7. modifier le GPU uniquement après franchissement de Gate 2.

Ainsi, chaque étape produit soit une preuve réutilisable, soit une mesure qui
permet d'arrêter rapidement une voie trop pessimiste, sans fragiliser le
runtime actuel.
