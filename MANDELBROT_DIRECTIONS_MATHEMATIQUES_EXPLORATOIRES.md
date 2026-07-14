# Directions mathématiques exploratoires pour accélérer Mandelbrot

## Objet et statut

Ce document consigne des directions qui dépassent l'amélioration incrémentale
des tiers affine, Padé, jet et `matrix-c1`. L'intuition commune est de ne plus
demander seulement quelle formule approche le mieux une longue itérée, mais
dans quelle géométrie ou quelle coordonnée cette itérée devient presque une
isométrie, une multiplication ou une translation.

Les briques mathématiques citées sont classiques ou documentées dans la
littérature. Leur combinaison avec le runtime de rendu certifié décrit ici un
programme de recherche ; aucune revendication d'originalité académique n'est
faite sans étude bibliographique plus approfondie.

Date : 13 juillet 2026.

Les statuts employés sont :

- **PROUVÉ** : déjà formalisé dans l'environnement Lean du projet ;
- **IMPLÉMENTÉ** : présent dans le builder ou le runtime ;
- **PROPOSÉ** : formulation mathématique précise, encore absente ;
- **EXPÉRIMENTAL** : à mesurer avant tout changement de format GPU ;
- **SPÉCULATIF** : direction de recherche longue et incertaine.

## 1. Intuition centrale : certifier dans la bonne géométrie

Le certificat actuel transporte principalement des erreurs euclidiennes. Une
récurrence typique a la forme

```text
e_(j+1) <= (|a_j| + 2 r_j) e_j + delta_j.
```

Elle conduit à des produits de facteurs de chaîne, à des sommes triangulaires
et à des marges de dénominateur calculées séparément. Ces opérations sont
sûres, mais elles oublient :

- la phase complexe des défauts ;
- les annulations entre défauts transportés ;
- la géométrie exacte des homographies ;
- le fait qu'une application holomorphe entre disques est contractante pour la
  distance hyperbolique ;
- la liberté de choisir un repère différent à chaque profondeur.

L'hypothèse de travail est que la prochaine amélioration importante viendra
moins d'un ordre Padé supplémentaire que d'un certificat géométriquement
adapté.

## 2. Direction prioritaire : BLA hyperbolique en repères mobiles

### 2.1 Disques comme formes hermitiennes

Pour le disque complexe

```text
D(c,R) = { z : |z-c| <= R },
```

introduisons la forme hermitienne

```text
         [ 1       -c          ]
H(c,R) = [                       ].
         [ -conj(c) |c|^2 - R^2]
```

Avec le vecteur homogène `v(z)=(z,1)^T`, on a exactement

```text
v(z)* H(c,R) v(z) = |z-c|^2 - R^2.
```

Soit

```text
       [A B]
M  =   [   ]
       [C D]
```

la matrice de l'homographie `m(z)=(Az+B)/(Cz+D)`. Lorsque le disque ne
contient pas le pôle, son image est représentée exactement par

```text
H_image = M^(-*) H(c,R) M^(-1).
```

Ce transport est projectif : multiplier `M` par un scalaire non nul ne change
pas le disque image. Il généralise donc naturellement l'invariance par
normalisation scalaire déjà prouvée pour `matrix-c1`.

Une formule explicite est également disponible. Posons

```text
p = A c + B,
q = C c + D,
Delta = |q|^2 - |C|^2 R^2.
```

Si `Delta>0`, le pôle est hors du disque et

```text
centre_image = (p conj(q) - A conj(C) R^2) / Delta,
rayon_image  = |A D - B C| R / Delta.
```

Pour une matrice exacte, il ne s'agit pas d'un majorant mais du disque image
minimal exact. La représentation de cercles par formes hermitiennes et leur
transport par Möbius est une construction classique ; voir
[Schwarz et Zaks, *Geometries of the projective matrix space, II*](https://cris.technion.ac.il/en/publications/geometries-of-the-projective-matrix-space-ii/).

### 2.2 Repères mobiles

À chaque profondeur `j`, choisissons un disque certifié `D_j` et une
homographie `S_j` qui l'envoie sur le disque unité. Le bloc matriciel entre les
profondeurs `j` et `k` devient

```text
M_tilde_(j,k) = S_k M_(j,k) S_j^(-1).
```

Les changements de repère se télescopent lors des merges. Le choix de `S_j`
est une jauge projective plus profonde qu'une simple multiplication de `M`
par une puissance de deux.

Objectifs :

- équilibrer chaque produit dans un domaine naturel ;
- ne plus payer des normes d'entrée artificielles à chaque suffixe ;
- représenter exactement les disques atteignables par les tiers de Möbius ;
- transformer autant que possible les matrices normalisées en applications du
  disque unité dans lui-même.

Cette jauge pourrait attaquer directement la pathologie observée dans la
marche séquentielle des suffixes, où un facteur de norme répété rendait la
borne inutilisable avant le passage à l'arbre équilibré.

### 2.3 Shadowing dans la métrique hyperbolique

Soient `F_j` le pas exact et `G_j` le modèle. Supposons que les deux chemins
restent dans des disques certifiés et que `F_j : D_j -> D_(j+1)` soit
holomorphe. Pour la distance hyperbolique `d_D`, Schwarz--Pick donne

```text
d_D(j+1)(F_j(x), F_j(y)) <= d_Dj(x,y).
```

Définissons le défaut local métrique

```text
eta_j = sup_(y in D_j) d_D(j+1)(F_j(y), G_j(y)).
```

L'inégalité triangulaire donne alors

```text
d_D(j+1)(F_j(x), G_j(y))
  <= d_Dj(x,y) + eta_j,
```

puis, par récurrence,

```text
d_DL(x_L, x_tilde_L) <= sum_(j<L) eta_j.
```

Le produit de dérivées est remplacé par une somme de défauts métriques, puis
par une seule conversion hyperbolique--euclidienne à la sortie.

Cette formulation ne supprime pas l'expansion réelle. Elle la déplace dans :

- la taille du disque de sortie ;
- la proximité des images avec son bord ;
- la conversion finale vers l'erreur euclidienne.

Elle évite néanmoins de repayer cette expansion à travers plusieurs
majorations indépendantes.

### 2.4 Conversion d'un défaut euclidien local

Dans le disque centré `D(0,R)`, la distance pseudohyperbolique vaut

```text
delta_D(x,y) = R |x-y| / |R^2 - conj(x) y|.
```

Si `|x|,|y| <= qR`, avec `q<1`, alors un défaut euclidien `|x-y|<=eps`
donne

```text
delta_D(x,y) <= eps / (R (1-q^2)).
```

La distance hyperbolique correspondante est

```text
d_D(x,y) = 2 artanh(delta_D(x,y)).
```

À la sortie, on dispose de la borne simple

```text
|x-y| <= 2 R tanh(d_D(x,y)/2).
```

Le paramètre `q` joue le rôle d'une marge intérieure. Comme pour les rayons de
Cauchy `R'`, il ne doit pas être figé arbitrairement : les disques mobiles et
leurs marges doivent être optimisés conjointement.

### 2.5 Théorèmes Lean proposés

Le chantier peut être découpé en résultats indépendants :

1. **PROUVÉ** — `mobius_image_disk_exact` : identité hermitienne signée,
   formules centre/rayon, transport de l'intérieur et du cercle frontière,
   avec équivalence d'appartenance hors du pôle lorsque `det≠0` ;
2. **PROUVÉ** — `mobius_disk_pole_margin` : équivalence entre `Delta>0` et
   exclusion du pôle sur le disque fermé ;
3. **PROUVÉ** — `DiskFrame.schwarzPick` : contraction Schwarz--Pick entre deux
   disques pour deux points arbitraires, par conjugaison explicite avec les
   automorphismes envoyant le second point sur zéro ;
4. **PROUVÉ** — `RuntimeMetric.defect_step` : un pas exact non expansif plus
   un défaut de modèle ;
5. **PROUVÉ** — `RuntimeMetric.moving_error_telescope` : accumulation additive
   de défauts variables dans des métriques mobiles ;
6. **PROUVÉ** — conversions locales
   `delta<=eps/(R(1-q²))` et `|x-y|<=R(1+q²)delta` ;
7. **PROUVÉ, FIBRE PAR FIBRE** — `MatrixC1Disk.lean` : exclusion uniforme du
   pôle, inflation du disque image et dérivée sous une perturbation
   `M_0+cM_1+E`. Le centre de sortie conserve sa dépendance en `c` ;
8. un théorème total comparant le certificat hyperbolique au budget final du
   renderer.

La preuve réalisée dans `LeanProofs/SchwarzPick.lean` part du lemme de Schwarz
de Mathlib et formalise entièrement cette conjugaison, y compris les inverses
projectifs, les marges sans pôle et les domaines ouverts.

### 2.6 Expérience build-only

Cette piste peut être testée sans changer le shader ni le sidecar :

1. réutiliser les enveloppes d'orbite existantes pour construire `D_j` ;
2. calculer un second rayon par le certificat hyperbolique ;
3. émettre `max(rayon_euclidien, rayon_hyperbolique)` puisque les deux sont
   sûrs ;
4. refaire le census sur matrix-c1, Padé, cusp, seahorse et Feigenbaum ;
5. mesurer séparément le gain venant du transport exact des disques et celui
   venant du shadowing hyperbolique.

Critère de succès initial : récupérer au moins `0.2 log2` de rayon effectif sur
le régime cusp-ultra de `matrix-c1`, valeur suffisante d'après le dernier census
pour rouvrir la question de son tier GPU.

Critères d'abandon :

- les domaines nécessaires imposent systématiquement `q` trop proche de `1` ;
- la conversion finale restitue toute la perte euclidienne ;
- le gain médian est inférieur au bruit du solveur de rayon ;
- le coût build devient disproportionné sans amélioration de tours.

### 2.7 Résultat (14 juillet 2026) — IMPLÉMENTÉ, verdict négatif

Implémenté build-only dans `reference_calculus/src/matrix_c1.rs`
(`matc1_value_error_hyp_log2`, grille `HYP_KAPPA_GRID_LOG2`,
`matc1_solve_radii_hyp` qui émet le rayon combiné `max(euclidien,
hyperbolique)`), en miroir des théorèmes prouvés `pseudoDist_le_of_interior`,
`norm_sub_le_of_pseudoDist_le` et `moving_error_telescope` ; le télescope se
ferme sans transcendantes via la sous-additivité de `tanh`
(`tanh(Σ artanh δ_j) ≤ Σ δ_j`). Référé bout-en-bout par itération exacte :
`matc1_hyp_value_certificate_vs_exact_iteration` (vert).

Census (`matc1_hyp_census`) : le rayon hyperbolique seul est partout ≤ le
rayon euclidien (médiane −0.02 à −0.14 log2, l'écart CROÎT avec le skip ;
κ optimal dérive de 4 vers 2), aucun bloc gagné, gain combiné 0.00. Le
critère de succès (+0.2 log2 sur cusp-ultra) n'est PAS atteint : c'est le
critère d'abandon n°2 — le rapport d'enveloppes `ρ_L/ρ_(j+1)` restitue
exactement le produit de facteurs de chaîne que la voie euclidienne paie via
`det/(m_pade·m_exact)`, et cette dernière garde en plus les annulations du
déterminant. La voie disques-exacts + jauges `S_j` (§2.1–2.2) reste
inexplorée ; le shadowing seul, à disques centrés, ne rapporte rien.

### 2.8 Oracle de phase (14 juillet 2026) — la variante décentrée est close

Avant tout chantier de merges certifiés, un oracle build-only NON certifié
(`matc1_phase_oracle_error_log2`, census `matc1_phase_oracle_census`) a
mesuré la variante restante : frames décentrées transportées EXACTEMENT par
les homographies complexes (`centre = (p·conj(q) − A·conj(C)R²)/Δ`,
`R' = |det|R/Δ`) à `c` échantillonné sur quatre phases, double frame
`N_(j+1) = P_j(N_j)` (disque minimal du modèle) et
`D_(j+1) = P_j(D_j) + 2ε_j(D) + μR` (ambiant, marge intérieure relative),
pliage exact `δ ← (δ+η)/(1+δη)`, sortie `2R_D·δ`.

Leçon de paramétrisation : l'inflation ABSOLUE `κ·ε` est intenable — la
marge `1−q² ≈ κε/R` s'évanouit et chaque δ_j sature (déficit mesuré ≈ −40
log2). Il faut la marge RELATIVE `μ·R` (surcoût `(1+μ)^L/(2μ)`, optimum
`μ ≈ 1/L`), plus `2ε` pour la porte `x = 0` où `R` part de zéro. C'est la
forme concrète de « disques mobiles et marges optimisés conjointement »
(§2.4).

Verdict : l'oracle vit partout où l'euclidien vit, et reste PARTOUT en
dessous — médiane −0.5 (Feigenbaum) à −1.1…−2.5 log2 (cusp, croissant
lentement avec le skip), meilleur bloc jamais gagnant. Comme les rapports de
rayons exacts portent ici TOUTE la phase (facteurs conformes exacts du
produit composé), le déficit mesuré ≈ le pur surcoût du télescope additif :
il n'y avait PAS de phase à récupérer. Explication : la voie euclidienne
n'est pas aveugle à la phase — ses marges de suffixe `dlow/cup` et son `det`
sont lus sur les entrées complexes COMPOSÉES de l'arbre équilibré ; seules
les enveloppes centrées du §2.3 l'étaient. Conséquence : le chantier complet
§2.1–2.2 (merges hermitiens certifiés + jauges) convergerait au mieux vers
la borne euclidienne moins le surcoût du télescope ; la direction 2 est
close, dans ses deux variantes, par mesure. Les jauges `S_j` restent
éventuellement utiles pour le CONDITIONNEMENT numérique f32, pas pour la
borne (la pseudodistance est invariante par jauge).

## 3. `matrix-c2` fantôme pour certifier `matrix-c1`

### 3.1 Principe

La sophistication du certificat n'a aucune raison d'être limitée par le format
runtime. Le builder peut calculer un ordre supérieur sans le sérialiser.

Au lieu de ne conserver que

```text
M(c) = M_0 + c M_1 + queue_(c^2+),
```

le builder calcule temporairement

```text
M(c) = M_0 + c M_1 + c^2 M_2 + R_3(c).
```

Le shader continue d'évaluer seulement `M_0+cM_1`, mais son erreur est
certifiée par

```text
||M(c) - (M_0+cM_1)|| <= y^2 ||M_2|| + E_3(y).
```

### 3.2 Pourquoi cela peut être nettement plus serré

Une récurrence scalaire de queue applique tôt l'inégalité triangulaire et
produit schématiquement

```text
E_2 <= y^2 sum_j |alpha_j|.
```

Le coefficient matriciel exact agrège d'abord les contributions complexes :

```text
M_2 = sum_j alpha_j.
```

La borne devient

```text
y^2 |sum_j alpha_j| + E_3,
```

et conserve donc toutes les annulations de phase de l'ordre dominant.

### 3.3 Extension générale : ghost jets

Le même principe peut certifier chaque tier bon marché avec un modèle
build-only plus riche :

- jet fantôme d'ordre 4 pour certifier le jet-3 ;
- `[L/M]` plus haut pour mesurer précisément l'erreur d'un Padé moins cher ;
- `matrix-c2` ou `matrix-c3` fantôme pour `matrix-c1` ;
- coefficients en `c` supplémentaires pour resserrer le canal paramétrique ;
- dérivées fantômes pour le canal DE, sans stockage GPU.

Le modèle supérieur ne doit jamais être utilisé comme hypothèse de sûreté : il
fournit le centre exact des premiers termes omis, et une queue analytique
indépendante borne ce qui reste.

### 3.4 Test proposé

1. ajouter `M_2` uniquement dans la structure build-only ;
2. dériver sa récurrence et son merge exacts ;
3. conserver une queue `c^3+` ;
4. appliquer le nouveau budget à la valeur et à la dérivée directe ;
5. comparer le census au `matrix-c1` actuel ;
6. n'envisager aucun slot GPU supplémentaire avant un verdict positif.

Cette direction est la moins risquée et doit être testée avant un véritable
tier `matrix-c2`.

### 3.5 Résultat (14 juillet 2026) — IMPLÉMENTÉ, verdict positif ciblé

Implémenté build-only dans `reference_calculus/src/matrix_c1.rs` : `MatC2`
(M₀, M₁, M₂, queue c³⁺), merge exact miroir un ordre au-dessus de
`matrixC1_comp_tail_le` (K₂ = L₀E₂ + L₁E₁ + L₂E₀ ; queue
`E₃L(‖E‖_y+E₃E) + ‖L‖_y·E₃E + y³‖L₁E₂+L₂E₁‖ + y⁴‖L₂E₂‖`), et
`matc2_precompute` qui produit un `MatC1Pre` aux queues resserrées
(`E₂_eff = y²‖M₂‖ + E₃`) réutilisé tel quel par les certificats valeur et ∂z.
Fait structurel utile : pour un bloc de ≤ 4 pas le coefficient c³ est
exactement nul (M₁ⱼ·M₁ₖ adjacents = 0). Le lemme Lean du merge C2 est une
obligation OUVERTE (grade census, comme la ∂z directe). Référés verts :
`matc2_tail_bounds_sound_and_frame_consistent`,
`matc2_ghost_value_certificate_vs_exact_iteration`.

Census (`matc2_ghost_census`) : le resserrement de queue est massif et croît
avec le skip — ΔE₂ médian +3.3 log2 @16, +11 @256, +21 @4096 (cusp-ultra),
+128 sur feigen-deep @4096 — confirmant les annulations de phase de §3.2.
MAIS là où les blocs étaient déjà vivants, le rayon ne bouge pas (ΔrV = ΔrE
= 0.00 partout) : le certificat y est limité par pôle/transport de défauts,
pas par la queue. Le gain est un gain de SURVIE dans les régimes
queue-limités : seahorse @64 passe de 1 à 3 blocs vivants, feigen-deep @1024
de 0 à 8 (med r_eff 2^−37.6) et @4096 de 0 à 7 (2^−38.5). Un slot GPU
`matrix-c2` reste non justifié (§3.4 étape 6) ; le fantôme, lui, étend le
domaine de vie du tier c1 sur les références type Feigenbaum profond.

## 4. Atlas de coordonnées dynamiques apprises et certifiées

### 4.1 Une équation commune

Fatou suggère de remplacer la liste de modèles par un atlas de coordonnées de
temps. Pour un bloc non autonome, chercher des cartes `T_j` telles que

```text
T_(j+s)(F_(j,s)(z,c), c) = T_j(z,c) + s.
```

Cette relation contient plusieurs linéarisations classiques :

- Koenigs/Schröder près d'un point hyperbolique ;
- Fatou près d'un point parabolique ;
- Böttcher dans le bassin de l'infini, après passage à une coordonnée
  logarithmique ;
- les retours périodiques après choix d'une branche logarithmique ;
- tout bloc localement presque intégrable pour lequel une équation
  cohomologique peut être résolue numériquement.

Le runtime effectuerait

```text
z -> T_j(z,c) -> T_j(z,c)+s -> T_(j+s)^(-1)(...,c).
```

### 4.2 Construction numérique, certification indépendante

Le builder pourrait ajuster `T_j` et son inverse avec :

- séries de Taylor ou de Chebyshev ;
- fractions rationnelles barycentriques ;
- une base adaptée aux pôles détectés ;
- une itération de Newton sur l'équation cohomologique ;
- une représentation mixte polarité + logarithmes près de la confluence.

L'algorithme AAA construit automatiquement des approximants rationnels
barycentriques sur des ensembles complexes et constitue un bon générateur de
candidats : [Nakatsukasa, Sète et Trefethen, *The AAA Algorithm for Rational
Approximation*](https://epubs.siam.org/doi/abs/10.1137/16M1106122).

AAA, Newton ou une méthode d'apprentissage ne doivent jamais constituer le
certificat. La sûreté vient uniquement des quantités vérifiées :

```text
eps_T = sup |T_(j+s) o F_(j,s) - (T_j+s)|,
L_exit = sup |d T_(j+s)^(-1)|,
erreur_sortie <= L_exit eps_T,
```

avec les erreurs des cartes d'entrée et de sortie et les marges de branche.

### 4.3 Relation avec les preuves Fatou existantes

`FatouSectorial.lean` prouve déjà :

- l'accumulation d'un résidu d'Abel ;
- la correction sommable vers une coordonnée exacte ;
- l'analyticité sous majorant sommable des dérivées ;
- la distorsion de la carte de sortie ;
- les changements constants de branches du modèle logarithmique.

L'extension essentielle serait une version non autonome :

```text
e_j(z) = T_(j+1)(F_j(z)) - T_j(z) - 1,
```

avec un télescopage fini ou infini des `e_j` et des cartes de sortie variables.

### 4.4 Impact potentiel sur `auto`

`auto` ne choisirait plus seulement un tier algébrique. Il choisirait une carte
locale certifiée selon :

- son domaine ;
- son nombre d'itérations couvertes ;
- sa distorsion de sortie ;
- son coût d'évaluation et d'inversion ;
- son risque de divergence de branche ;
- le gain prédit en tours et en temps GPU.

Affine, périodique et Fatou deviendraient des cartes spécialisées d'un même
atlas. Les formes actuelles resteraient les fallbacks universels.

## 5. Rang de Hankel adaptatif pour laisser les coefficients choisir Padé

### 5.1 Diagnostic structurel

Pour une série `f(z)=sum a_n z^n`, considérons la matrice de Hankel

```text
H_r = (a_(i+j))_(0<=i,j<=r).
```

Une série rationnelle de petit degré possède une récurrence linéaire sur ses
coefficients et donc une structure de Hankel de bas rang. Une chute nette des
valeurs singulières de `H_r` signale une récurrence approximative et suggère le
degré du dénominateur.

Le lien entre matrices de Hankel et approximation rationnelle est classique.
La méthode de Carathéodory--Fejér utilise précisément les valeurs singulières
d'une matrice de Hankel de coefficients pour produire une approximation
rationnelle proche du minimax : [Trefethen et Gutknecht,
*The Carathéodory--Fejér Method for Real Rational
Approximation*](https://epubs.siam.org/doi/10.1137/0720030).

### 5.2 Pipeline proposé

1. construire un petit Hankel à partir du jet déjà calculé ;
2. estimer son rang numérique et les gaps singuliers ;
3. générer quelques candidats `[L/M]` avec `M<=2` ou `3` ;
4. supprimer ou rejeter les doublets pôle-zéro instables ;
5. certifier chaque candidat par résidu, queue et marge de pôle ;
6. envoyer uniquement les formats runtime déjà rentables ;
7. laisser `auto` comparer rayon effectif, skip et coût.

Le rang numérique ne prouve rien : il choisit seulement les candidats à faire
passer par le certificat existant.

### 5.3 Ce que cette piste pourrait découvrir

- blocs réellement presque Möbius ;
- blocs à deux pôles effectifs ;
- confluences annonçant une représentation de type Fatou ;
- blocs où `[2/1]` est inutile malgré son coût ;
- régimes où un dénominateur de degré 2 apporte plus qu'un numérateur plus
  long.

Cette approche transforme Padé en compression adaptative de structure plutôt
qu'en famille de tiers fixés à la main.

## 6. Logarithme de composition et linéarisation de Carleman

### 6.1 Généraliser `gate_log_flow`

La porte Fatou calcule déjà un logarithme formel du retour : un champ `P` dont
le flot à temps un approche la carte discrète. Une direction plus générale
consiste à travailler dans l'algèbre des opérateurs de composition :

```text
P = log_composition(F),
F^k = exp_composition(k P).
```

Près de l'identité, cela peut être plus compressible que `F^k` lui-même et
fournir des skips continus ou adaptatifs.

### 6.2 Carleman

La linéarisation de Carleman relève les monômes

```text
(1,z,z^2,...)
```

dans un espace où la composition par une application polynomiale devient une
matrice linéaire infinie. Une section finie donne un modèle calculable. Des
travaux récents donnent des bornes explicites et, sous certaines hypothèses,
une convergence exponentielle avec l'ordre de section : [Amini, Zheng, Sun et
Motee, *Carleman Linearization of Nonlinear Systems and Its Finite-Section
Approximations*](https://arxiv.org/abs/2207.07755).

Pour ce projet, l'intérêt n'est probablement pas d'envoyer une grosse matrice
Carleman au GPU, mais de l'utiliser :

- comme générateur build-only de modèles réduits ;
- pour détecter une base où l'opérateur est presque de bas rang ;
- pour calculer des puissances ou générateurs avant compression rationnelle ;
- comme cadre commun aux jets, aux Hankel et aux équations de conjugaison.

### 6.3 Risques

- coût et mémoire croissent vite avec le degré bivarié ;
- les bornes connues peuvent exiger des régimes dissipatifs absents près de la
  frontière de Mandelbrot ;
- la troncature peut retrouver sous une autre forme les mêmes saturations que
  les jets ;
- une réduction de modèle est indispensable pour le GPU.

Cette direction est donc un outil de découverte et de builder, pas encore un
tier runtime.

## 7. Piste spéculative : sauter les échelles par renormalisation

### 7.0 Socle algébrique prouvé

`LeanProofs/RenormalizedTransport.lean` ferme le socle indépendant de toute
conjecture d'universalité. Pour

```text
M̃_j = S_(j+1) ∘ M_j ∘ S_j^(-1),
```

l'inverse projectif étant représenté par l'adjugée, les jauges intérieures se
télescopent exactement. Une chaîne renormalisée entière représente donc
`S_N ∘ (M_(N-1)∘...∘M_0) ∘ S_0^(-1)` modulo un unique scalaire non nul,
même si chaque bloc est renormalisé numériquement séparément. Le budget
phase-aware est invariant sous ces scalaires et le retour aux coordonnées
physiques ne paie que la distorsion certifiée de `S_N^(-1)` une fois.

`LeanProofs/FeigenbaumRenormalization.lean` ferme maintenant le théorème de
Newton--Kantorovich qui isole le vrai point fixe universel à partir de bornes
`Y,Z`. Le certificat Chebyshev publié pour `m=2` a été reproduit :
`Y=5.202782432174514...e-18`, `Z=0.367994497872518...`, d'où une distance
`8.232179015310324...e-18`. Lean vérifie une enveloppe entièrement rationnelle
`<8.24e-18`, ainsi que le raccord entre le zéro du système carré et l'équation
de Feigenbaum--Cvitanović. Le calcul intervalle qui produit les bornes
analytiques `Y,Z` reste à faire rejouer par un checker Lean minimal.

Reste ensuite ouvert le contenu dynamique propre au runtime : reconnaître
rigoureusement la combinatoire d'un retour quadratique concret, montrer son
entrée dans le domaine stable local, construire `S_n`, et certifier une borne
uniforme sur

```text
S_n ∘ F^(2^n) ∘ S_n^(-1) - F_*.
```

### 7.1 Changer la notion de saut

À Feigenbaum et près des satellites infiniment renormalisables, accélérer une
itérée reste un saut dans le temps. La renormalisation permettrait un saut dans
l'échelle : une très longue itérée est conjuguée, après zoom et normalisation,
à une carte universelle ou déjà tabulée.

Schématiquement,

```text
F^(2^n) ~= S_n^(-1) o F_* o S_n.
```

Un runtime pourrait :

1. reconnaître une fenêtre de renormalisation certifiée ;
2. transformer le pixel vers les coordonnées universelles ;
3. appliquer une carte de niveau inférieur ;
4. revenir à l'échelle originale ;
5. reprendre les tiers ordinaires.

### 7.2 Parabolique et satellites

Les coordonnées de Fatou et les données de corne sont précisément les objets
qui interviennent dans la renormalisation quasi parabolique. La littérature
établit des structures invariantes et des lois d'échelle pour des classes de
polynômes :

- [Cheraghi et Shishikura, *Satellite renormalization of quadratic
  polynomials*](https://arxiv.org/abs/1509.07843) ;
- [Kapiamba, *Non-degenerate near-parabolic
  renormalization*](https://arxiv.org/abs/2210.06647) ;
- [Dudko et Sauzin, *The resurgent character of the Fatou coordinates of a
  simple parabolic germ*](https://arxiv.org/abs/1307.8093).

### 7.3 Potentiel et difficulté

Potentiel :

- gain simultané en nombre d'itérations et en profondeur de référence ;
- accélération ciblée des vues Feigenbaum et satellites ;
- réutilisation de cartes universelles entre plusieurs vues ;
- éventuelle compression de références secondaires.

Difficultés :

- détection rigoureuse de la combinatoire ;
- contrôle des changements d'échelle complexes ;
- bornes uniformes sur les conjugaisons ;
- gestion du canal paramétrique `c` ;
- données de corne non déterminées par un jet fini ;
- format et cache de cartes renormalisées.

Cette piste est potentiellement la plus profonde, mais ne doit pas retarder les
expériences hyperboliques et ghost-c2.

## 8. Conséquences pour le mode `auto`

Ces directions ne remplacent pas le portefeuille actuel. Elles ajoutent de
nouvelles sources de mouvements certifiés.

### 8.1 Court terme

- chaque tier peut recevoir un second rayon issu du certificat hyperbolique ;
- le meilleur des certificats sûrs est retenu ;
- les ghost jets améliorent les rayons sans changer le coût runtime ;
- le couple principal/secours continue de fonctionner sans modification de
  principe.

### 8.2 Moyen terme

- Hankel/AAA génèrent automatiquement des candidats rationnels ;
- `auto` choisit parmi les candidats qui ont effectivement obtenu un rayon ;
- une carte de conjugaison certifiée devient une phase spécialisée, comme
  Fatou ou périodique ;
- le coût doit inclure l'inversion de la carte et les lectures supplémentaires.

### 8.3 Long terme

Le renderer devient un atlas de mouvements :

```text
SA / référence secondaire
  -> carte hyperbolique, Koenigs, Fatou, Böttcher ou renormalisée
  -> portefeuille affine / Padé / c+ / jet / matrix-c1
  -> pas exact et rebase en dernier recours.
```

Le critère reste le coût total : nombre d'itérations réellement couvertes,
rayon par pixel, divergence warp, trafic mémoire, occupation et temps mur.

## 9. Ordre recommandé et portes de décision

| Priorité | Direction | Coût initial | Changement GPU | Potentiel | Porte de décision |
|---|---|---:|---:|---:|---|
| 1 | `matrix-c2` fantôme | faible à modéré | aucun | immédiat | gain de rayon matrix-c1 |
| 2 | certificat hyperbolique | modéré | aucun au census | élevé | `>=0.2 log2` au crossover |
| 3 | repères hermitiens robustes en `c` | modéré à élevé | aucun puis éventuel | élevé | marges et skips effectifs |
| 4 | Hankel adaptatif | modéré | formats existants d'abord | moyen à élevé | candidats certifiés vivants |
| 5 | atlas de conjugaisons | élevé | nouveau tier/sidecar | très élevé | portes longues rentables |
| 6 | Carleman/générateur | élevé | build-only au départ | incertain | compression observée |
| 7 | renormalisation d'échelle | recherche longue | architecture dédiée | potentiellement extrême | prototype Feigenbaum |

### Programme concret recommandé

#### Lot A — ghost-c2

1. dériver la récurrence exacte de `M_2` ;
2. prouver son merge et la queue `c^3+` ;
3. implémenter build-only ;
4. refaire le census valeur et dérivée ;
5. abandonner ou approfondir selon le gain.

#### Lot B — prototype Schwarz--Pick

1. **PROUVÉ** — transport exact d'un disque par Möbius
   (`LeanProofs/MobiusDisk.lean`) ;
2. **PROUVÉ** — composition de repères mobiles et identité hermitienne
   multiplicative (`MovingDisks.lean`) ;
3. **PROUVÉ** — raccord `M₀+cM₁+E`, valeur et dérivée
   (`MatrixC1Disk.lean`) ;
4. **PROUVÉ** — télescope abstrait et conversions pseudohyperboliques
   (`HyperbolicTelescope.lean`) ;
5. **PROUVÉ** — Schwarz--Pick à deux points et spécialisation aux blocs
   Möbius (`SchwarzPick.lean`) ;
6. **PROUVÉ** — loi triangulaire forte, pliage `tanh(sum artanh)`, certificat
   Padé non autonome fini et extraction finale valeur/dérivée
   (`HyperbolicPade.lean`) ;
7. coder les frames en build-only, optimiser `q_j` et mesurer les rayons/tours
   sans toucher au shader.

#### Lot C — atlas expérimental

1. choisir quelques blocs cusp et périodiques ;
2. ajuster automatiquement une coordonnée `T` ;
3. mesurer résidu, distorsion et domaine ;
4. utiliser le théorème Fatou générique comme certificat ;
5. comparer un saut de carte au meilleur portefeuille existant ;
6. seulement ensuite concevoir un format runtime.

## 10. Conclusion

Les tiers actuels peuvent être relus comme des approximations partielles d'un
même phénomène : chercher une coordonnée où la dynamique se compose simplement.

- l'affine cherche une multiplication ;
- Möbius cherche une action projective ;
- le périodique cherche une puissance ;
- Fatou cherche une translation ;
- Böttcher transforme l'échappement en élévation au carré ;
- la renormalisation cherche une répétition entre échelles.

La direction générale proposée est donc :

> Construire des repères dynamiques certifiés dans lesquels les applications
> deviennent contractantes, projectives ou translatoires, puis mesurer
> l'erreur dans la géométrie naturelle de ces repères avant de revenir une
> seule fois à l'erreur euclidienne du pixel.

Le meilleur premier pari est le couple `matrix-c2` fantôme + certificat
Schwarz--Pick. Il peut être évalué sans coût GPU ni engagement architectural,
tout en testant l'hypothèse mathématique la plus profonde de ce document.
