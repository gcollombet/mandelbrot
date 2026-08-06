# Preuves Lean des approximants Mandelbrot

Ce projet Mathlib formalise les identités de difficulté facile à modérée
issues de `COMPLETE_NOTES_pade_to_mobius_cplus.md` et de son correctif.

```bash
cd lean-proofs
lake build
```

Le build utilise Lean 4.31.0 et Mathlib 4.31.0. Il ne contient ni `sorry`, ni
`axiom`, ni `admit`.

## Modules

- `Algebra.lean` : reste Padé, composition de Möbius et composition au premier
  ordre dans `c`.
- `CPlus.lean` : extractions `[1/1]-c⁺` et `[2/1]-c⁺`, annulations de `Q`,
  seed exact et différences finies des formules de dérivée.
- `Bounds.lean` : rayons Julia, majorants scalaires, certificat radial convexe,
  propagation d'erreur et queue de Cauchy.
- `Cauchy.lean` : représentation analytique sur un disque, borne `M/R^n`,
  majorant par degré total et domination de la queue.
- `CauchyDerivatives.lean` : estimées de Cauchy sur disques emboîtés pour les
  dérivées première, seconde et mixte d'une erreur uniforme.
- `Polydisc.lean` : estimation de Cauchy itérée, queue anisotrope exacte,
  branche diagonale stable, positivité et monotonie en chaque rayon.
- `RationalCertificate.lean` : certificat résiduel générique `[2/1]-c⁺`,
  spécialisation `[1/1]-c⁺`, marge de pôle, erreurs absolue et relative,
  raccord au polydisque et règle radiale convexe.
- `PadeDominance.lean` : dominance exacte du Padé `[1/1]` sur le jet affine,
  sélecteur Padé/jet sans régression et caractérisation du résidu `[L/1]`
  par les défauts d'une récurrence quasi géométrique.
- `ParabolicSuperconvergence.lean` : flot parabolique exact, reste fermé de
  tout jet polynomial, invariants de Hankel, gain Padé quantitatif et borne de
  shadowing entre `z+z²` et le flot de Riccati.
- `NonautonomousPade.lean` : produit matriciel des Padé élémentaires pour
  `a_j=2Z_j` variable et `c≠0`, télescopage exact des défauts transportés et
  majorant calculable par enveloppes et marges de dénominateur.
- `MatrixC1.lean` : récurrence exacte des huit coefficients du jet matriciel
  affine en `c`, majorant récursif de toute la queue `c²+`, préservation des
  marges de dénominateur et certificat total `matrix-c1` contre Mandelbrot ;
  inclut la règle générale de merge lorsque les deux enfants ont une queue.
- `MatrixC1Deriv.lean` : formule `det/den²`, perturbation du déterminant et du
  dénominateur, shadowing dérivé non autonome avec le produit de chaîne exact,
  puis certificat total « dérivée matrix-c1 contre dérivée Mandelbrot » sans
  élargissement de Cauchy.
- `MobiusDisk.lean` : discriminant exact d'exclusion du pôle, centre et rayon
  de l'image d'un disque par une homographie complexe, identité hermitienne
  signée et transport exact de l'intérieur et du cercle frontière.
- `MatrixC1Disk.lean` : raccord uniforme entre la queue `M₀+cM₁+E` et le
  discriminant de disque, image nominale gonflée par l'erreur certifiée, et
  enveloppe directe de dérivée utilisant la même marge de pôle.
- `MovingDisks.lean` : repères disque mobiles, composition exacte des
  transports, multiplication des formes hermitiennes signées et invariance
  projective du gate de discriminant.
- `HyperbolicTelescope.lean` : Schwarz centré entre disques, coordonnées
  pseudohyperboliques, conversions euclidiennes sur un intérieur strict et
  télescopage additif des défauts dans une métrique mobile.
- `SchwarzPick.lean` : automorphismes explicites des disques, inverse
  projectif sans pôle, Schwarz--Pick complet à deux points arbitraires et
  spécialisation non expansive des blocs Möbius entre leurs frames exactes.
- `HyperbolicPade.lean` : loi triangulaire pseudohyperbolique forte, pliage
  non linéaire fini des défauts, identité `tanh(sum artanh)`, certificat Padé
  non autonome sur disques mobiles, conversion euclidienne finale et
  extraction de Cauchy unique pour les dérivées première et seconde du bloc.
- `PhaseAwareTransport.lean` : transport « homographie complexe + inflation »,
  merge conservant les phases et les annulations du produit matriciel,
  certificat total par télescope pseudohyperbolique non linéaire, invariance
  des jauges mobiles et de la normalisation projective des matrices.
- `RenormalizedTransport.lean` : conjugaison par changements d'échelle
  projectifs, annulation des jauges intermédiaires lors des merges, formule
  finie pour une hiérarchie entière avec renormalisations scalaires par bloc,
  et retour certifié de l'erreur vers les coordonnées physiques.
- `FeigenbaumRenormalization.lean` : théorème exact des rayons
  Newton--Kantorovich sur une boule fermée, équivalence entre point fixe de la
  carte de Newton et zéro du résidu, raccord à l'équation symétrique de
  Feigenbaum--Cvitanović et enveloppe rationnelle du certificat publié `m=2`.
- `Rebasing.lean` : raccord exact entre orbites Mandelbrot et récurrence de
  perturbation, invariant de valeur physique, rebasing Zhuoran, dérivées
  première et seconde, garde de diminution, correction de toute suite finie
  de pas exacts et de rebases, et composition de sauts approchés certifiés sans
  coût d'erreur supplémentaire au rebase.
- `RadiusSolver.lean` : contrat sémantique d’un rayon émis, preuve que le
  certificat convexe centre+bord forme un prédicat préfixe, invariant et
  réduction exacte de largeur de la bissection.
- `Jets.lean` : merge de degré 2, congruence de jets polynomiaux, récurrence
  pure-`c` et sensibilités.
- `BivariateJets.lean` : troncature bivariée par degré total et preuve que la
  troncature après chaque merge donne le même jet final.
- `TilePropagation.lean` : propagation analytique locale d'une graine vers un
  tile, sensibilités d'ordres 3 et 4, récurrence exacte et majorant du reste
  quadratique, inclusion tile-disque, premier escape commun et transport de
  l'erreur injectée au checkpoint.
- `Periodic.lean` : points fixes, multiplicateur, birapport, itération et limite
  de Jordan.
- `PeriodicRuntime.lean` : tests scalaires de marge, image et contraction
  uniforme d'un bloc périodique, invariance des deux orbites, erreur amortie
  `eps/(1-gamma)` et enclosure correcte du fast-forward en birapport.
- `CriticalPeriodic.lean` : obstruction formelle du Padé pas-à-pas lorsque
  `a=0`, regroupement polynomial du cycle superattractif de période 2,
  dérivée centrale nulle et certificat scalaire de disque invariant.
- `Fatou.lean` : changement de variable parabolique et signe exact du resiter.
- `FatouSectorial.lean` : coordonnées exactes des modèles à un et deux pétales,
  garde de branche logarithmique du hop runtime, translation exacte du flot à
  fractions partielles, construction d'une vraie coordonnée d'Abel par
  correction sommable, analyticité sectorielle sous majorant sommable des
  dérivées, budget Lipschitz de sortie et changement de branche du modèle de
  corne.
- `Dynamics.lean` : domaine invariant, contraction uniforme, erreur de modèle
  amortie et distorsion de la carte de sortie d'une porte de Fatou.
- `FractionalIteration/Basic.lean` : définition centrale de `z ↦ z²+c`,
  orbites entières, points fixes et discriminant complet, dérivée, point
  critique, parité et non-injectivité.
- `FractionalIteration/Escape.lean` : rayon d'évasion
  `max 2 (|c|+1)`, croissance linéaire stricte de toute orbite qui le franchit,
  divergence et certificat fini de non-appartenance à Mandelbrot.
- `FractionalIteration/Conjugacy.lean`,
  `FractionalIteration/LinearModels.lean` et
  `FractionalIteration/GlobalObstruction.lean` : transport d'un semi-groupe
  par conjugaison, modèles linéaires de Kœnigs et du relèvement de Böttcher,
  dépendance à la branche logarithmique, accord aux temps entiers et
  impossibilité d'un groupe réel global dont `z²+c` serait le temps un.
- `FractionalIteration/ODEObstruction.lean` : T5.3, formalisation des
  solutions globales d'une ODE autonome, loi de groupe déduite de la
  translation temporelle et de l'unicité, obstruction au temps un pour
  `z²+c`, puis corollaires pour un champ globalement lipschitzien et pour les
  flots réels de Mathlib. L'existence globale reste une hypothèse explicite.
- `FractionalIteration/KoenigsSeries.lean` : comparaison formelle des
  coefficients dans l'équation de Schröder, récurrence exacte sur
  `ceil(n/2) ≤ k < n`, non-résonance attractive et formule
  `a₂ = 1/(λ(1-λ))`.
- `FractionalIteration/KoenigsAnalytic.lean` : construction effective de la
  coordonnée de Kœnigs par série de corrections, disque invariant, majorant
  géométrique, convergence et holomorphie, équation de Schröder,
  normalisation `φ(0)=0`, `φ'(0)=1`, inverse analytique local, puis transport
  au point fixe `p` de `z²+c`.
- `FractionalIteration/KoenigsUniqueness.lean` : lemme de rigidité d'un germe
  tangent à zéro et équivariant par une contraction complexe, identité de la
  carte de transition entre deux coordonnées normalisées, puis unicité locale
  au point fixe. Avec `KoenigsAnalytic.lean`, T3.1 est ainsi fermé.
- `FractionalIteration/KoenigsFractional.lean` : famille locale
  `φ⁻¹(exp(tL)φ(z))` et preuves comme égalités de germ des identités de
  temps zéro, temps un et composition additive, dans la coordonnée centrée
  puis dans la coordonnée originale au point fixe.
- `FractionalIteration/BottcherAnalytic.lean` : preuve constructive de T4.1
  par la variable réciproque `u=1/z`, disque invariant pour
  `u²/(1+cu²)`, série logarithmique uniformément convergente, holomorphie,
  équation de Böttcher, normalisation, inverse local, transport à un domaine
  extérieur et extraction d'un rayon où la coordonnée est univalente.
- `FractionalIteration/BottcherUniqueness.lean` : rigidité par ordre
  d'annulation de tout germe normalisé commutant avec le carré, unicité de la
  coordonnée réciproque, puis unicité éventuelle de la coordonnée transportée
  au voisinage de l'infini parmi les germes réciproques analytiques normalisés.
- `FractionalIteration/BottcherInfinityUniqueness.lean` : singularité
  amovible de `1/ψ(1/u)` en `u=0` déduite de `ψ(z)/z→1`, dérivée normalisée,
  transfert de l'équation au germe réciproque et unicité près de l'infini de
  deux cartes extérieures arbitraires satisfaisant T4.1. T4.1 est ainsi fermé
  dans sa formulation complète.
- `FractionalIteration/BottcherInteger.lean` : T4.2,
  `ψ(q_c^[n](z))=ψ(z)^(2^n)`, par induction exacte sur tout segment d'orbite
  restant dans le domaine extérieur de la carte.
- `FractionalIteration/BottcherInfiniteLog.lean` : T4.4, passage rigoureux du
  télescope fini à la somme infinie, structure des relèvements logarithmiques
  cohérents et formule
  `log ψ(z)=log z+∑ ell_n/2^(n+1)` sous les hypothèses explicites de
  convergence et de branche.
- `FractionalIteration/BottcherFractional.lean` : T4.7, restriction de la
  carte analytique de Böttcher à un domaine coupé, inverse exact sur son image,
  famille `ψ⁻¹(exp(2^t Log ψ(z)))`, identités aux temps zéro et un, puis loi
  de composition sous les gardes explicites de domaine et de cohérence de la
  branche logarithmique.
- `FractionalIteration/LogTelescoping.lean` et
  `FractionalIteration/Connectors.lean` : identité logarithmique finie derrière
  la coordonnée de Böttcher, extrémités exactes du connecteur Catmull--Rom et
  contre-exemple exact montrant que ces connecteurs ne sont pas
  semi-conjugués à `z ↦ z²`.
- `FractionalIteration/DynamicAtlas.lean` : noyau exact de l'atlas numérique,
  propagation point par point d'un segment graine avec résidu dynamique nul,
  extrémités orbitales à tout rang, et relèvement rétrograde conditionnel par
  une branche inverse choisie explicitement.
- `FractionalIteration/NeutralCharts.lean` : modèles fractionnaires neutres
  employés par la démo. La translation dans une coordonnée de Fatou--Abel et
  la rotation `exp(tL)` dans une coordonnée de Siegel ont des extrémités et
  une loi de composition exactes sous les identités locales de carte et
  d'inverse. La correction sommable de `FatouSectorial.lean` alimente
  directement le cas Abel. Pour Siegel, l'existence analytique de la carte
  reste conditionnelle aux hypothèses arithmétiques appropriées.
- `FractionalIteration/Segments.lean` : T6.2, passage exact de la courbe
  recollée par tous les points de l'orbite, construction canonique par la
  partie entière, égalité des coutures et continuité globale par le théorème
  de recollement sur le recouvrement localement fini des intervalles fermés
  `[n,n+1]`.
- `FractionalIteration/IdealSegments.lean` : T6.3 et T6.4, segments idéaux de
  Kœnigs et Böttcher, extrémités orbitales exactes, loi de composition locale
  sous les identités d'inverse, de domaine et de branche, puis raccord à toute
  courbe globale construite à partir de ces segments.

Voir [PROOF_STATUS.md](PROOF_STATUS.md) pour la correspondance avec la note,
les conséquences pour chaque forme et les obligations qui restent analytiques
ou numériques.
