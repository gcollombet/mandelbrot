# Renormalisation de Feigenbaum : tentative de preuve complète

## Verdict

La preuve est maintenant complète dans Lean pour son **noyau logique** : une
fois les bornes analytiques `Y` et `Z` fournies, Lean prouve sans `sorry`,
`axiom` ni `admit` :

1. l'invariance de la boule certifiée ;
2. la contraction de la carte de Newton restreinte à cette boule ;
3. l'existence et l'unicité du vrai zéro ;
4. la borne a posteriori `Y / (1-Z)` ;
5. l'équivalence de ce zéro avec l'équation de Feigenbaum--Cvitanović ;
6. l'enveloppe rationnelle finale du cas classique `m=2`.

Le certificat numérique publié a également été reproduit avec succès. Lean
dispose maintenant d'un checker rationnel minimal pour rejouer l'arithmétique
des bornes, les produits complexes, les normes `ell¹` pondérées, les normes
matricielles induites et l'agrégation des cinq composantes `Y/Z`. La preuve
n'est cependant **pas encore une preuve Lean de bout en bout** : l'export des
22 coefficients, de la matrice inverse approchée et de toutes les entrées
intervalle vers ce checker reste à produire.

Cette preuve d'existence ne suffit pas, à elle seule, à activer un saut
Feigenbaum dans le runtime Mandelbrot. Il faut en plus certifier qu'un retour
quadratique concret appartient au bon domaine de renormalisation et construire
sa conjugaison aux coordonnées universelles.

## 1. L'équation prouvée

Pour une fonction paire `h`, on pose

```text
h^[m]       = h composée m fois,
alpha       = h^[m](0),
R_m(h)(x)   = h^[m](alpha x) / alpha.
```

Le point fixe recherché vérifie

```text
R_m(h) = h.
```

Le calcul validé ne traite pas directement cette équation. Il résout le
système carré

```text
Phi_m(alpha,h) = (h(0)-1, alpha h - h^[m](alpha ·)) = 0.
```

`LeanProofs/FeigenbaumRenormalization.lean` prouve que la condition de phase
`h(0)=1` et le résidu fonctionnel nul impliquent automatiquement

```text
alpha = h^[m](0),
```

puis, lorsque `alpha != 0`, que `R_m(h)=h`. La réciproque pour le résidu
fonctionnel est également prouvée.

## 2. Pourquoi la contraction porte sur Newton, pas sur `R_m`

Le point fixe de Feigenbaum possède une direction instable, de valeur propre
environ `4.6692` pour `m=2`. L'opérateur de renormalisation `R_2` ne peut donc
pas être contractant dans un voisinage complet du point fixe.

On utilise une approximation injective `A` de l'inverse de `D Phi_m` et la
carte de Newton

```text
T(x) = x - A(Phi_m(x)).
```

Lean prouve exactement

```text
T(x)=x  <->  Phi_m(x)=0
```

dès que `A` est injective. Il suffit ensuite de certifier `T` contractante sur
une boule fermée.

## 3. Théorème des rayons formalisé

La structure Lean `RadiiCertificate` reçoit :

```text
xbar : centre numérique,
r    : rayon,
Y    : borne de ||T(xbar)-xbar||,
Z    : constante de Lipschitz de T dans la boule,
Y + Z r <= r,
Z < 1.
```

Le théorème `RadiiCertificate.exists_unique_fixedPoint` donne un unique `x*`
dans la boule tel que `T(x*)=x*` et

```text
dist(xbar,x*) <= Y/(1-Z).
```

`RadiiCertificate.exists_unique_zero` transporte le résultat vers
`Phi_m(x*)=0`. La preuve utilise le théorème du point fixe de Banach de Mathlib
sur la restriction de `T` à la boule fermée complète.

## 4. Reproduction du certificat classique `m=2`

Source primaire : Breden, Gonzalez et Mireles James,
[Validated enclosure of renormalization fixed points via Chebyshev series and
the DFT](https://arxiv.org/abs/2409.20457), et son
[dépôt de calcul](https://github.com/joluigonza/renor), commit
`27de995fbdb5eaee996d1f504e5a3d7e1fdc23cd`.

Paramètres reproduits :

```text
m        = 2
d        = 2
rho      = 2
K        = 21
precision= 128 bits
r*       = 10^-15
```

Résultats produits par le calcul avec arrondis dirigés :

| Terme | Borne reproduite |
|---|---:|
| `Y_K` | `9.036139678977775133676720546012374959285e-25` |
| `Y_inf` | `5.202781528560546258775709968379766957797e-18` |
| `Z_KK` | `0.3644570425807813131032325488881935921168` |
| `Z_Kinf` | `1.092701847938140399587849188310852674848e-6` |
| `Z_inf` | `0.003536362589889730775269079352323098404699` |

Les sommes et le rayon résultant sont

```text
Y = 5.2027824321745141565532233360518215590348659629902212e-18
Z = 0.3679944978725189820189012160897050013741433130398005
Y/(1-Z)
  = 8.2321790153103249336567068716056802508608794995361e-18.
```

Le fichier publié de coefficients sérialise les champs MPFR `Clong` depuis
une plateforme 32 bits. Sur une plateforme où `Clong` vaut 64 bits,
l'exposant `-1` était donc relu `4294967295`. La reproduction a nécessité une
extension de signe 32→64 bits et la conversion des trois sentinelles MPFR
zéro/NaN/infini. Les mantisses publiées étaient intactes. Après réparation,
Newton atteint un résidu de l'ordre de `10^-38` et le calcul intervalle retrouve
les valeurs du tableau de l'article.

La graine Chebyshev portable retrouvée commence par

```text
h_0 =  0.2828954316362471577526617239876749253286
h_1 = -0.3501957869868568935729902201662360493174
h_2 =  0.008681093361122092104639354970004506901831
h_3 =  0.0003118279568470454292649076905146271545858
h_4 = -0.00001263320718810415514679793163715255942221
```

et donne

```text
alpha = -0.3995352805231344898575804686336949530127...
```

## 5. Enveloppe entièrement rationnelle vérifiée par Lean

Pour éliminer tout flottant de la dernière étape, Lean utilise les enveloppes
conservatrices

```text
Yq = 520279 / 10^23             = 5.20279e-18,
Zq = 73599 / 200000             = 0.367995,
rq = 1 / 10^15.
```

Le noyau vérifie par calcul rationnel :

```text
Zq < 1,
Yq + Zq rq <= rq,
Yq/(1-Zq) < 824/10^20 = 8.24e-18.
```

Ainsi, dès que le checker analytique fournit

```text
||T(xbar)-xbar|| <= Yq
Lip(T, closedBall(xbar,rq)) <= Zq,
```

Lean conclut à un unique point fixe réel analytique à moins de
`8.24e-18` du polynôme de degré 42.

## 6. Checker rationnel maintenant prouvé, et dernière frontière

`LeanProofs/VerifiedRationalBounds.lean` prouve sans flottant :

1. la fermeture des bornes rationnelles positives par somme et produit ;
2. la validité des majorants de norme d'une somme et d'un produit complexes ;
3. la norme `ell¹` pondérée finie ;
4. le critère par sommes de colonnes pour la norme matricielle induite ;
5. sa version où chaque entrée est fournie par une enveloppe rationnelle ;
6. l'agrégation exacte des cinq bornes reproduites :

```text
Y_K + Y_inf <= Yq,
Z_KK + Z_Kinf + Z_inf <= Zq.
```

La structure `AnalyticComponents` réduit désormais l'interface non fermée à
deux faits sémantiques : la somme des composantes borne le défaut de la carte
concrète et leur somme matricielle borne sa constante de Lipschitz. Son
théorème `toRadiiCertificate` assemble ensuite automatiquement le certificat
de rayons final.

Ce qu'il manque pour une preuve Lean réellement complète est donc le **fichier
de données rationnelles exhaustif**, et non plus l'algèbre du checker :

Il reste à faire vérifier par Lean, ou par un checker minimal dont Lean vérifie
la sortie, les deux faits suivants :

1. `hDefect` : la somme du défaut fini et de sa queue est sous `Yq` ;
2. `hLipschitz` : les blocs fini→fini, fini→queue et queue→tout de
   `I-A D Phi_2` ont une norme totale sous `Zq` dans la boule.

Cela demande les composants concrets suivants :

1. l'export portable rationnel des 22 coefficients de `hbar`, de la matrice
   approchée `A` et des intervalles intermédiaires ;
2. l'instanciation concrète du Banach pondéré `R × ell1_even(rho)` avec
   `||(alpha,h)||=|alpha|+|h_0|+2 sum |h_k|rho^k` ;
3. les identités exactes de produit, composition et interpolation de
   Chebyshev ;
4. un checker d'intervalles rationnels pour les évaluations sur les ellipses
   de Bernstein ;
5. les majorants de queue des sections 3 à 5 de l'article ;
6. l'injectivité de l'extension de `A` utilisée sur la queue ;
7. l'instanciation finale de `AnalyticComponents` avec ces données.

Le bon format n'est pas de formaliser Julia ou MPFR. Le builder externe doit
exporter des intervalles à bornes rationnelles ; un petit checker Lean recalcule
les inclusions et les sommes. Cette architecture laisse hors de la base de
confiance Julia, MPFR, le DFT flottant et la sérialisation.

## 7. Retour Mandelbrot fini maintenant formalisé

Même après fermeture du checker précédent, on ne possède qu'un point fixe
universel isolé. Pour remplacer `2^n` itérations concrètes par un bloc
renormalisé, il faut encore certifier :

```text
retour quadratique concret
  -> combinatoire de doublement correcte
  -> entrée dans un voisinage/stable local du point fixe
  -> changement d'échelle S_n contrôlé
  -> ||S_n F_c^(2^n) S_n^-1 - h*|| <= epsilon_n
  -> retour aux coordonnées physiques avec budget d'erreur.
```

`LeanProofs/FeigenbaumFiniteReturn.lean` ferme maintenant la partie finie et
générique de ce raccord :

- `P_c(z)=z²+c`, son itéré et l'échelle critique `s_n=P_c^[2^n](0)` ;
- le retour normalisé `G_n(z)=P_c^[2^n](s_n z)/s_n` et `G_n(0)=1` ;
- la conjugaison affine exacte au format `1-mu z²` au premier niveau ;
- les jauges et la conversion exacte erreur normalisée/physique ;
- le théorème `FiniteGridWitness.uniform_error`, qui transforme des bornes
  finies par cellule en une borne uniforme sur le disque ;
- l'extension d'un paramètre central à une fenêtre en `c` ;
- la sémantique de repli : sans certificat accepté, le choix est exactement
  le portefeuille existant.

Le builder `reference_calculus/src/feigenbaum.rs` produit déjà les propositions
numériques correspondantes, mais son type de jeton vérifié est opaque et aucun
chemin de promotion flottant n'existe. Il ne peut donc pas activer
accidentellement le tier rapide.

La reconnaissance globale de la variété stable est remplacée ici par un
certificat direct à profondeur finie. C'est moins ambitieux, mais suffisant au
runtime : on prouve exactement le bloc que l'on veut sauter.

## 8. État exact

| Couche | État |
|---|---|
| Algèbre des jauges renormalisées | prouvée dans Lean |
| Théorème abstrait `Y,Z,r` | prouvé dans Lean |
| Newton fixe ⇔ résidu nul | prouvé dans Lean |
| Résidu nul ⇔ équation de Feigenbaum | prouvé dans Lean |
| Arithmétique rationnelle finale `m=2` | prouvée dans Lean |
| Calcul intervalle `Y,Z` publié | reproduit, hors noyau Lean |
| Algèbre du checker Lean des bornes `Y,Z` | prouvée dans Lean |
| Données exhaustives `hbar/A/intervalles` | export rationnel à faire |
| Théorème de reconnaissance finie | prouvé dans Lean |
| Builder/probe de retour quadratique | implémenté, build-only |
| Certificat concret accepté par le noyau | à produire |
| Tier runtime renormalisé | repli forcé jusqu'au certificat + census |
