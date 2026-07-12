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
- `Jets.lean` : merge de degré 2, congruence de jets polynomiaux, récurrence
  pure-`c` et sensibilités.
- `BivariateJets.lean` : troncature bivariée par degré total et preuve que la
  troncature après chaque merge donne le même jet final.
- `Periodic.lean` : points fixes, multiplicateur, birapport, itération et limite
  de Jordan.
- `Fatou.lean` : changement de variable parabolique et signe exact du resiter.
- `Dynamics.lean` : domaine invariant, contraction uniforme, erreur de modèle
  amortie et distorsion de la carte de sortie d'une porte de Fatou.

Voir [PROOF_STATUS.md](PROOF_STATUS.md) pour la correspondance avec la note,
les conséquences pour chaque forme et les obligations qui restent analytiques
ou numériques.
