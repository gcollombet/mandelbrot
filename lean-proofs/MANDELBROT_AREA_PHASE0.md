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
