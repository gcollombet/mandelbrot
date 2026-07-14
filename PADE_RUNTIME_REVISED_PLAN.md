# Plan runtime Padé révisé

> Ce document est le sous-plan spécialisé `matrix-c1`. La vue consolidée de
> toutes les formes, du mode `auto`, des accélérateurs périodiques/paraboliques
> et des optimisations se trouve dans
> [MANDELBROT_CERTIFIED_RUNTIME_MASTER_PLAN.md](MANDELBROT_CERTIFIED_RUNTIME_MASTER_PLAN.md).

## Objectif

Ajouter un tier `matrix-c1` capable de faire de longs sauts dans les blocs
quasi paraboliques, sans remplacer `[2/1]-c+` ni le jet lorsqu'ils sont plus
efficaces. Le tier représente le produit Padé non autonome par

```text
M(c) = M0 + c M1,
```

soit huit coefficients complexes `A0,B0,C0,D0,A1,B1,C1,D1`.

Le critère de succès n'est pas seulement un rayon plus grand. Il faut maximiser
le rapport entre itérations sautées, octets lus et coût arithmétique, à erreur
certifiée identique.

## Résultats Lean maintenant disponibles

### Produit et défaut Padé non autonome

`NonautonomousPade.lean` prouve l'identité télescopique exacte entre le produit
des pas Padé variables et le vrai bloc Mandelbrot, puis un majorant par défauts
locaux transportés.

### Jet matriciel affine

`MatrixC1.lean` prouve

```text
(M0+cM1)(N0+cN1)
  = M0N0 + c(M0N1+M1N0) + c²M1N1.
```

Les coefficients constants et linéaires sont donc indépendants de l'arbre de
composition.

### Queue d'un merge bloc par bloc

Les deux enfants peuvent maintenant posséder leur propre queue. Si

```text
||Mexact-(M0+cM1)|| <= EM,
||Nexact-(N0+cN1)|| <= EN,
|c| <= y,
```

alors `matrixC1_comp_tail_le` prouve la règle `O(1)` :

```text
EK <= EM*(||N0|| + y||N1|| + EN)
    + (||M0|| + y||M1||)*EN
    + y²*||M1 N1||.
```

Cette formule doit être le miroir exact du merge-tree Rust. Elle remplace la
récurrence séquentielle, valable seulement lorsque l'enfant intérieur est un
pas élémentaire de queue nulle.

### Dérivées par Cauchy

`CauchyDerivatives.lean` formalise un certificat sur deux disques emboîtés. Si
l'erreur holomorphe est bornée par `M` sur le disque extérieur de rayon
`Router`, alors sur le disque intérieur `Rinner < Router` :

```text
|dE|   <= M / gap,
|d²E|  <= 2 M / gap²,
gap     = Router - Rinner.
```

Sur un bidisque, avec `gapZ` et `gapC` :

```text
|E_z|  <= M/gapZ,
|E_c|  <= M/gapC,
|E_zz| <= 2M/gapZ²,
|E_cc| <= 2M/gapC²,
|E_zc| <= (M/gapZ)/gapC.
```

Le théorème mixte expose explicitement l'obligation analytique : la dérivée en
`z` doit être holomorphe comme fonction de `c`. Pour le résidu rationnel
concret, cela découlera de l'absence de pôle sur le bidisque extérieur, mais ce
raccord reste à formaliser.

## Obligations mathématiques restantes avant production

### Normalisation projective

Il faut prouver puis reproduire côté Rust que, pour `lambda != 0`,

```text
eval(lambda M,z) = eval(M,z),
den(lambda M,z)  = lambda den(M,z),
det(lambda M)    = lambda² det(M).
```

Après chaque merge, le builder devra diviser `M0`, `M1` et `E` par le même
scalaire. Une puissance de deux proche du maximum des huit normes est le choix
préféré : elle évite des arrondis inutiles et centre les exposants pour le
chemin GPU `f32`.

### Certificat totalement uniforme au build

Le théorème total emploie encore, dans son expression finale, la matrice
évaluée au `c` du pixel. Le builder a besoin d'un majorant indépendant du
pixel. Avec

```text
p  = E*(R+1),
mu = |D0|-y|D1|-(|C0|+y|C1|)R,
Nu = (|A0|+y|A1|)R + |B0|+y|B1|,
```

il faudra prouver la substitution monotone

```text
Ematrix <= p/(mu-p) + Nu*p/((mu-p)*mu).
```

Le même corollaire doit construire les marges uniformes de toutes les matrices
suffixes utilisées par `hpade` et `hexact`.

### Raccord analytique concret

Le builder devra être relié aux hypothèses de Cauchy : holomorphie du bloc et
du résidu sur le bidisque extérieur, absence de pôle, et identification de la
borne de valeur extérieure au `M` donné aux théorèmes de dérivées.

## Adaptations du builder Rust

### Structures

Ajouter deux structures build-only :

```text
MatrixC1 {
  constant: Homography,
  linear: Homography,
}

MatrixC1Bounds {
  tail_log2: f64,
  value_radius_log2: f64,
  derivative_radius_log2: f64,
  second_derivative_radius_log2: f64,
}
```

Les coefficients doivent rester en `CFe`. Les bornes scalaires doivent être
calculées en log2 ou en flottant exponentiel.

### Merge

Pour `jet_compose(early, late)`, le bloc tardif est extérieur. Le miroir
matriciel est donc

```text
K0 = late.M0*early.M0
K1 = late.M0*early.M1 + late.M1*early.M0.
```

Calculer ensuite `EK` avec la règle bloc par bloc prouvée, puis normaliser
`K0`, `K1` et `EK` ensemble.

Cette construction coûte `O(1)` par nœud. Elle évite le scan séquentiel
`O(n log n)` qui aurait été nécessaire avec l'ancien théorème.

### Séparation des caches

- `M0,M1` : dépendance à l'orbite seulement ;
- queue `E` et certificats extérieurs : dépendance à `c_max` ;
- rayons valeur/dérivées : dépendance à `c_max`, `epsilon` et aux headrooms de
  Cauchy ;
- décision d'émission : dépendance à la distribution observée de `|dz|` et au
  modèle de coût GPU.

### Solveur de rayon

Pour chaque rayon intérieur candidat `R` :

1. choisir un rayon extérieur `Rout > R` et, pour les dérivées en `c`, un
   `Cout > c_max` ;
2. vérifier les marges de pôle sur tout le bidisque extérieur ;
3. calculer la borne de valeur totale extérieure
   `M = Epade + Ematrix` ;
4. en déduire les bornes de première et seconde dérivée par Cauchy ;
5. retenir le minimum des rayons valeur, dérivée et seconde dérivée requis par
   DE/AA ;
6. vérifier la règle sur tout `[0,R]`, y compris `R=0`.

Le choix du headroom doit être mesuré. Un grand écart améliore les bornes de
dérivée mais peut tuer le certificat de valeur extérieur.

## Census avant shader

La première implémentation doit rester build-only. Pour chaque bloc et chaque
vue `cusp`, `period-2`, `seahorse`, `Feigenbaum`, enregistrer :

- rayons intérieur et extérieur ;
- `Epade`, queue `E`, `Ematrix` ;
- part du rayon perdue par valeur, première dérivée et seconde dérivée ;
- blocs où `matrix-c1` bat affine, `[2/1]`, `[2/1]-c+` et jet ;
- skip maximal, skip médian et itérations sautables pondérées par le coût ;
- dynamique des huit coefficients avant et après normalisation.

Ne modifier le shader que si le census montre un gain robuste.

## Intégration GPU minimale

Le record actuel possède neuf slots complexes. Une première version peut en
faire une union :

```text
tags 0..3 : format unifié actuel,
tag 4     : A0,B0,C0,D0,A1,B1,C1,D1,unused.
```

Cette version garde 108 octets par bloc et un sidecar de 16 octets, mais ne
conserve qu'un candidat par bloc. La sérialisation des coefficients devra être
faite après le choix du tag, contrairement à `unified_serialize_coeffs`
actuel.

Le shader `tag 4` calculera

```text
A = A0+A1*c, B = B0+B1*c,
C = C0+C1*c, D = D0+D1*c,
phi = (A*z+B)/(C*z+D),
```

puis les dérivées analytiques de cette homographie. Les rayons expédiés auront
déjà été limités par les certificats de Cauchy ; le test de dénominateur du
shader restera un garde paranoïaque.

## Portefeuille principal/secours

Ce travail vient après le census du tier seul. Un format naïf demande 32
octets de sidecar par bloc. Avant de le retenir, comparer :

1. sidecar principal de 16 octets et sidecar secours lu uniquement après
   échec ;
2. empaquetage tags, flags et index sparse dans un `u32` ;
3. pool sparse `matrix-c1` avec index par bloc ;
4. maintien d'un seul tag choisi par un score `skip/coût`.

Le couple principal/secours doit être une propriété du bloc. Son activation
reste dépendante de `|dz|` par pixel et ajoute une divergence à mesurer, même
si le chemin actuel diverge déjà sur le test de rayon.

## Sélection `auto`

Remplacer à terme « premier tier couvrant la bande » par une décision fondée
sur le coût attendu :

```text
score = iterations_sautées_attendues /
        (octets_lus + lambda*opérations + pénalité_divergence).
```

Tous les tiers gardent leur propre certificat. `matrix-c1` ne doit être émis
que lorsque son rayon ou son skip attendu rembourse la division rationnelle et
ses huit coefficients.

## Tests requis

### Rust

- ordre de composition sur deux blocs puis sur un arbre complet ;
- égalité de `M0,M1` entre arbre équilibré et composition séquentielle ;
- vérification échantillonnée `queue réelle <= E` après chaque merge ;
- invariance sous normalisation projective ;
- comparaison des bornes Cauchy avec dérivées exactes échantillonnées ;
- marges uniformes et absence de pôle ;
- comparaison haute précision contre le vrai bloc Mandelbrot.

### GPU

- accord CPU/WGSL sur valeur et dérivées ;
- chemins `f32` et `fe` ;
- aucun NaN près des marges ;
- respect du premier escape ;
- compteurs de tentatives, succès, descentes évitées et applications par tier.

### Performance

Mesurer temps GPU, octets lus, occupation, pression registres, divergence,
skip effectif et qualité d'image à tolérance identique.

## Ordre d'exécution révisé

1. preuve de normalisation projective ;
2. corollaire totalement uniforme `mu/Nu/suffixes` ;
3. raccord analytique du résidu concret aux hypothèses de Cauchy ;
4. builder Rust normalisé et census sans shader ;
5. optimisation des headrooms de Cauchy ;
6. format GPU union et `tag 4` ;
7. mesures GPU ;
8. seulement si utile, portefeuille principal/secours.
