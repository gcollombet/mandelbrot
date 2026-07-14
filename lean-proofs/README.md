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

Voir [PROOF_STATUS.md](PROOF_STATUS.md) pour la correspondance avec la note,
les conséquences pour chaque forme et les obligations qui restent analytiques
ou numériques.
