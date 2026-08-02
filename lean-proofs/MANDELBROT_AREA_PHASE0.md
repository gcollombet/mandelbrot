# Phase 0 — aire du Mandelbrot dans Mathlib v4.31.0

Inventaire effectué sur le checkout Mathlib fixé par `lakefile.toml`, puis
validé par les modules Lean de cette phase.

| Prérequis | Statut | Preuve dans le checkout |
|---|---|---|
| `ℂ`, norme, dérivation complexe | présent | `Mathlib.Analysis.Complex.RealDeriv` |
| Volume de Lebesgue sur `ℂ` | présent | `Complex.volume_ball`, `Complex.volume_closedBall` |
| Changement de variables réel en dimension finie | présent | `lintegral_image_eq_lintegral_abs_det_fderiv_mul` |
| Passage dérivée complexe → dérivée réelle | présent | `HasDerivAt.complexToReal_fderiv` |
| Jacobien d'une multiplication complexe | présent, à composer | `LinearMap.det_restrictScalars` et `Algebra.norm_complex_eq`; composition fermée dans `det_mainCardioidFDeriv` |
| Coordonnées polaires et Fubini | présent | `Complex.integral_comp_polarCoord_symm`, `setIntegral_prod` |
| Aire de l'image holomorphe injective | désormais empaquetée | `ofReal_pi_mul_sq_mul_normSq_le_volume_image_ball` dans `MultiplierArea.lean` |
| Familles normales holomorphes | absent, finalement inutile | la preuve quadratique spécialisée de `QuadraticFatou.lean` remplace Montel par des branches inverses et l'inégalité de Schwarz |
| Théorème de Montel pour familles holomorphes | absent, finalement inutile | `Analysis.LocallyConvex.Montel` concerne les espaces de Montel; aucun axiome de Montel n'est ajouté |
| Théorème de Fatou « un bassin attractif contient un point critique » | désormais prouvé dans le cas requis | `critical_orbit_enters_attracting_ball` dans `QuadraticFatou.lean`, puis son analogue de période 2 dans `PeriodTwoBulb.lean` |
| Uniformisation multiplicateur des composantes hyperboliques | absent | aucune API trouvée; c'est l'entrée globale encore requise pour les périodes 3 et 4 |

## Conséquence mise à jour

M0, M1 et le calcul géométrique exact de la cardioïde restent les briques de
base. L'absence de Montel dans Mathlib n'est plus bloquante : la preuve
spécialisée au polynôme quadratique construit des branches inverses arbitraires
sur un disque supposé sans valeur critique. Schwarz les borne uniformément,
alors que la dérivée forcée par l'attraction croît exponentiellement, ce qui
donne la contradiction de Fatou recherchée.

On obtient ainsi, sans axiome :

- toute la cardioïde principale dans `M`, d'aire `3π/8` ;
- tout le bulbe de période 2 `D(-1,1/4)`, d'aire `π/16` ;
- leur union disjointe, d'aire exacte `7π/16` ;
- un unique disque rationnel de période 3 autour de `-351/200`, de rayon
  `1/100000`, inclus dans `M` et disjoint des deux domaines précédents.

Le dernier disque n'est pas un maillage : son inclusion découle d'une seule
estimation polynomiale uniforme sur le retour en trois étapes. Il fournit le
résultat strict final `volume_Mandelbrot_gt_seven_pi_div_sixteen`.

## Étape suivante : coefficient multiplicateur

`MultiplierArea.lean` ferme désormais dans Mathlib le théorème analytique qui
manquait dans l'inventaire : si `ψ` paramètre injectivement un disque, si
`g = ψ'` y est holomorphe, alors

```text
ofReal (π R² normSq (g 0)) ≤ volume (ψ '' D(0,R)).
```

La preuve n'utilise pas une série formelle : changement de variables,
coordonnées polaires, propriété de moyenne holomorphe et Jensen suffisent.

`LowPeriodMultiplier.lean` fixe ensuite les équations multiplicateur exactes
des périodes 3 et 4 et les formules de leur première dérivée inverse. Enfin,
`LowPeriodAreaArithmetic.lean` vérifie exactement le budget arrondi : les cinq
minorations de norme, avec les paires conjuguées comptées deux fois, donnent
`24847/1000000`. La preuve réserve même une marge au bord en ne gardant que le
disque multiplicateur compact de rayon `99/100` :

```text
29/20 < 7π/16 + π * (99/100)² * (24847/1000000).
```

`LowPeriodFinalArea.lean` en tire maintenant un théorème inconditionnel sur
`volume Mandelbrot`. Les centres sont isolés par des certificats rationnels,
les feuilles globales sont holomorphes, injectives et deux à deux disjointes,
et leur dérivée en `0` est exactement le premier coefficient certifié. Pour
alléger l'assemblage final, six images tronquées suffisent : trois de période
3 et trois de période 4; les deux petites feuilles de période 4 sont omises.
Le budget réduit `24815/1000000`, encore assez grand sur `D(0,99/100)`, donne
dans Lean `twenty_nine_div_twenty_lt_volume_Mandelbrot`.

## Programme certifié périodes basses et bornes extérieures

Le développement dispose maintenant de quatre blocs supplémentaires :

- `LowPeriodDiscriminant.lean` et `LowPeriodCovering.lean` prouvent la
  simplicité des racines en paramètre sur le disque multiplicateur fermé,
  la structure de revêtement fini sur le disque ouvert et l'existence unique
  d'une feuille continue issue de chaque centre exact ;
- `LowPeriodDynamics.lean` vérifie les facteurs dynatomiques, les dérivées des
  retours 3 et 4 et les deux relations de résultant exactes entre témoins
  dynamiques et équations multiplicateur ;
- `FiniteCycleFatou.lean` généralise les branches inverses à toute période
  finie, prouve l'entrée puis la convergence de l'orbite critique, l'unicité
  du cycle attractif, et l'appartenance à `Mandelbrot` des témoins
  dynatomiques attractifs de périodes 3 et 4 ;
- `GeneralCenterCoefficient.lean` dérive, à toute période `p = n+1`, le
  premier coefficient local d'une branche paramétrée par le multiplicateur.
  Si `z_j(c)` est l'orbite critique, `D_0(c)=0` et
  `D_{j+1}(c)=2 z_j(c) D_j(c)+1`, alors au centre `c₀` :

  ```text
  c'(0) = 1 / (2^p D_p(c₀) ∏_{j=1}^{p-1} z_j(c₀)).
  ```

  La preuve Lean ne suppose que la branche locale différentiable, l'équation
  périodique et la normalisation du multiplicateur. Elle retrouve exactement
  `c'(0)=1/2` en période 1 et `c'(0)=1/4` au centre `c=-1` de période 2 ;
- `FiniteEscapeArea.lean`, `EffectiveAreaGap.lean` et
  `CertifiedAreaBackends.lean` fournissent les ensembles extérieurs décroissants,
  la convergence de leurs aires, le critère de module effectif et des
  interfaces vérifiées pour régions piégeantes, identités polynomiales/SOS et
  comptabilité additive de régions intérieures disjointes.

Le théorème `29/20 < volume Mandelbrot` est désormais inconditionnel : Lean
additionne la cardioïde, le bulbe de période 2 et six images tronquées
mesurables, après preuve de toutes leurs inclusions et disjonctions. La seule
entrée basse période encore incomplète dans ce programme est indépendante de
ce minorant : la factorisation du discriminant de période 4 comme déterminant
Mathlib reste à certifier. La convergence
monotone des bornes extérieures ne constitue pas non plus un algorithme d'aire
sans module effectif de l'écart supérieur-inférieur.

Cette formule arbitraire fournit les termes locaux naturels d'une future
série sur les centres hyperboliques. Elle ne prouve pas encore l'existence des
branches globales à toute période, leur énumération effective, ni la
convergence d'une somme sur tous les centres. De plus, le seul premier
coefficient donne une minoration de l'aire d'une composante ; l'égalité d'aire
fait intervenir toute l'énergie de Taylor de sa paramétrisation conforme.

`FiniteCenterEnergy.lean` formalise maintenant l'étape finie suivante. Les
polynômes entiers de l'orbite critique sont construits récursivement par

```text
P₀ = 0,                 Pₙ₊₁ = Pₙ² + X,
```

et Lean vérifie simultanément `Pₙ(c)=zₙ(c)` et `Pₙ'(c)=Dₙ(c)`. Pour chaque
période `p`, les racines complexes de `Pₚ` forment un `Finset`; un filtre sur
les temps `1 ≤ q < p` en extrait exactement les centres de période `p`. Cela
donne la définition canonique finie

```text
H_P = ∑_{0≤p≤P} ∑_{c : période exacte p} |a(c)|²,
```

dont la monotonie en `P` est prouvée. Le catalogue explicite des centres `0`
et `-1` a pour énergie exacte `1/4 + 1/16 = 5/16`.

Enfin, une structure `CertifiedCenterSheet` regroupe les obligations globales
d'une feuille sur un disque multiplicateur compact : équations périodique et
multiplicateur, holomorphie, injectivité, mesurabilité, inclusion dans
`Mandelbrot` et disjonction. Pour toute famille finie certifiée de rayon commun
`R`, Lean prouve directement

```text
ofReal (π R² H_S) ≤ volume Mandelbrot.
```

Le chaînon restant avant d'appliquer ce théorème au `H_P` canonique est donc
précis : construire uniformément une `CertifiedCenterSheet` pour chaque centre
du `Finset`, puis prouver la disjonction de toute la famille. La convergence de
`H_P` est encore une question séparée.

## Un premier contrôle fondamental de la queue de `H_P`

`CenterEnergyTail.lean` sépare contrôle qualitatif et contrôle effectif. Il
prouve d'abord que `volume Mandelbrot ≠ ∞` grâce à l'inclusion dans le disque
fermé de rayon 2. Il suppose ensuite qu'un rayon multiplicateur fixe `R > 0`
fournit, pour toute troncature, la borne géométrique attendue

```text
ofReal (π R² H_P) ≤ volume Mandelbrot.
```

Cette seule hypothèse borne la suite réelle croissante `H_P`. En définissant

```text
H = sup_P H_P,                 tail(P) = H - H_P,
```

Lean prouve `H_P → H`, `0 ≤ tail(P)`, la décroissance de `tail`, puis
`tail(P) → 0`. Il en déduit que pour tout `ε > 0`, il existe un `P` après
lequel toute la queue est inférieure à `ε`.

Ce résultat n'est pas encore un module effectif : il ne calcule pas ce `P` en
fonction de `ε`. Le bloc analytique manquant est exactement l'établissement
de la borne d'aire uniforme pour le catalogue canonique de toutes les périodes;
le bloc quantitatif supplémentaire serait une vitesse explicite de décroissance.

## Énergie de Taylor supérieure

Pour une composante hyperbolique uniformisée par le multiplicateur,

```text
c(μ) = c₀ + a₁ μ + a₂ μ² + a₃ μ³ + ⋯,
```

la formule d'aire complète est

```text
area = π ∑_{n≥1} n |aₙ|².
```

Le terme `π|a₁|²` est l'énergie linéaire déjà utilisée dans `H_P`. L'énergie
de Taylor supérieure est le reste positif

```text
π ∑_{n≥2} n |aₙ|².
```

Elle mesure la déformation non linéaire de la composante au-delà de son disque
tangent central. Pour la cardioïde
`c(μ)=μ/2-μ²/4`, l'énergie linéaire vaut `π/4`, l'énergie supérieure vaut
`π/8`, et leur somme redonne l'aire exacte `3π/8`. Pour le bulbe de période 2,
la paramétrisation est affine et l'énergie supérieure est nulle.
