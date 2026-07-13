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
  marges de dénominateur et certificat total `matrix-c1` contre Mandelbrot.
- `Jets.lean` : merge de degré 2, congruence de jets polynomiaux, récurrence
  pure-`c` et sensibilités.
- `BivariateJets.lean` : troncature bivariée par degré total et preuve que la
  troncature après chaque merge donne le même jet final.
- `Periodic.lean` : points fixes, multiplicateur, birapport, itération et limite
  de Jordan.
- `PeriodicRuntime.lean` : tests scalaires de marge, image et contraction
  uniforme d'un bloc périodique, invariance des deux orbites, erreur amortie
  `eps/(1-gamma)` et enclosure correcte du fast-forward en birapport.
- `Fatou.lean` : changement de variable parabolique et signe exact du resiter.
- `Dynamics.lean` : domaine invariant, contraction uniforme, erreur de modèle
  amortie et distorsion de la carte de sortie d'une porte de Fatou.

Voir [PROOF_STATUS.md](PROOF_STATUS.md) pour la correspondance avec la note,
les conséquences pour chaque forme et les obligations qui restent analytiques
ou numériques.
