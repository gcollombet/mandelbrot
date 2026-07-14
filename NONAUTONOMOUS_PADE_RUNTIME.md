# Padé non autonome : conséquences runtime

## Résultat disponible

Pour chaque pas du bloc,

```text
F_j(z,c) = a_j z + z² + c,
P_j(z,c) = a_j(a_j z+c)/(a_j-z),
```

le produit exact `P_(n-1)∘...∘P_0` est une homographie à `c` fixé. Les preuves
Lean expriment son erreur exacte contre `F_(n-1)∘...∘F_0` comme une somme de
défauts locaux transportés, puis la majorent depuis les matrices de queue, les
enveloppes `r_j` et `|c|<=y`.

## Pourquoi les sept coefficients actuels ne suffisent pas exactement

Chaque matrice élémentaire est affine en `c`, mais son produit possède en
général des coefficients polynomiaux en `c` dont le degré croît avec le bloc.
La forme `[2/1]-c+` actuelle est extraite directement du jet du bloc et ne
coïncide donc pas, en général, avec ce produit homographique exact.

Pour utiliser directement le nouveau théorème, il faut représenter ou
approximer la dépendance en `c` de la matrice homogène.

## Compression affine désormais certifiée

### Tier spécialisé `matrix-c1`

Stocker le jet d'ordre un en `c` des quatre entrées :

```text
A(c)=A0+A1 c,  B(c)=B0+B1 c,
C(c)=C0+C1 c,  D(c)=D0+D1 c.
```

Cela demande huit coefficients complexes contre sept pour `[2/1]-c+`. Le
runtime effectue une division homographique ordinaire.

La construction et son certificat sont maintenant prouvés dans
`LeanProofs/MatrixC1.lean` :

- la composition conserve exactement les parties constante et linéaire ;
- le premier terme rejeté est exactement `c² M₁N₁` ;
- une récurrence scalaire transporte ce défaut et majore toute la queue
  `c²+...` sur `|c|<=y` ;
- si cette queue a une norme matricielle `E`, elle coûte au plus `E(R+1)` de
  marge de dénominateur sur `|z|<=R` ;
- l'erreur finale est la somme du majorant Padé–Mandelbrot et du majorant de
  troncature rationnelle.

Pour le merge-tree équilibré, les deux enfants ont généralement une queue.
La règle désormais prouvée est

```text
EK <= EM*(||N0||+y||N1||+EN)
    + (||M0||+y||M1||)*EN
    + y²||M1 N1||.
```

Les rayons de dérivée peuvent être obtenus sans différencier ce majorant : une
borne de valeur `M` sur un bidisque extérieur donne sur un bidisque intérieur
`M/gapZ`, `M/gapC`, `2M/gapZ²`, `2M/gapC²` et
`M/(gapZ*gapC)` pour les dérivées nécessaires au runtime.

Le plan d'intégration complet révisé se trouve dans
`PADE_RUNTIME_REVISED_PLAN.md`.

La condition d'émission sûre, uniforme sur tout le disque paramètre, devient

```text
E*(R+1) < |D0|-y|D1| - (|C0|+y|C1|)*R.
```

Le membre droit minore `|D(c)|-|C(c)|R` simultanément pour tous les
`|c|<=y`. Le théorème donne aussi la perte rationnelle complète, pas seulement
la non-annulation du dénominateur.

Ce tier perd le numérateur quadratique `N2 z²` de `[2/1]-c+`, mais respecte la
structure exacte du produit Padé à l'ordre retenu en `c`. Il est surtout
candidat pour les longs blocs quasi paraboliques.

### Tier `matrix-c0` pour `|c|` extrêmement petit

Ne stocker que la matrice à `c=0` — quatre coefficients complexes — et traiter
toute la dépendance en `c` comme un défaut certifié. C'est le chemin le moins
coûteux en bande passante, mais son rayon s'effondrera lorsque le canal `c`
domine.

### Ordre deux seulement après mesure

Un jet quadratique de matrice demande douze coefficients complexes. Il est
mathématiquement naturel mais probablement trop coûteux en bande passante. Il
ne devrait être envisagé qu'après un census concluant de `matrix-c1`.

## Intégration recommandée

1. Implémenter côté CPU la même récurrence `MatrixC1.comp` sur les huit
   coefficients et la même récurrence scalaire de queue.
2. Calculer les deux termes du certificat total pour chaque bloc.
3. Émettre `matrix-c0` ou `matrix-c1` seulement si son rayon certifié dépasse
   significativement celui des tiers existants.
4. Conserver `[2/1]-c+` et le jet comme fallbacks indépendants.
5. Mesurer `skip/coût`, pas seulement le nombre d'applications.

La première expérience devrait être build-only : calculer les rayons du
nouveau certificat sur cusp, period-2, seahorse et Feigenbaum. Elle dira si le
gain de structure compense la perte du terme `N2 z²` avant toute modification
du shader.
