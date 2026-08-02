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
| Aire de l'image holomorphe injective, déjà empaquetée | partiel | pas de théorème spécialisé trouvé; la spécialisation cardioïde est fermée dans `CardioidArea.lean` |
| Familles normales holomorphes | absent | aucune API trouvée dans Mathlib |
| Théorème de Montel pour familles holomorphes | absent | `Analysis.LocallyConvex.Montel` concerne les espaces de Montel, pas le théorème analytique requis |
| Théorème de Fatou « un bassin attractif contient un point critique » | absent | aucune API trouvée |
| Uniformisation extérieure de Douady–Hubbard | absent | aucune API trouvée |

## Conséquence

M0, M1, les tests d'adéquation et le calcul géométrique exact de la
cardioïde sont accessibles sans axiome. L'inclusion de toute la cardioïde et
du bulbe de période 2 ne l'est pas via la route Fatou/Montel demandée.

Un contournement strictement élémentaire a néanmoins été fermé : pour
`‖λ‖ < 2/3`, le disque dynamique `D(λ/2, 1/3)` est invariant. Son image dans
le plan des paramètres a l'aire exacte `11π/81`, d'où le minorant global
formel correspondant. Il reste inférieur au minorant mathématique
`7π/16`; il ne constitue donc pas le resserrement numérique demandé.
