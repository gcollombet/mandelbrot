<script setup>
import TaylorApproxDemo from '../src/components/TaylorApproxDemo.vue'
import PerturbationOrbitDemo from '../src/components/PerturbationOrbitDemo.vue'
import GeometricTailDemo from '../src/components/GeometricTailDemo.vue'
import PolydiscDemo from '../src/components/PolydiscDemo.vue'
import PadeVsJetDemo from '../src/components/PadeVsJetDemo.vue'
import MobiusDemo from '../src/components/MobiusDemo.vue'
import PeriodicCertificateDemo from '../src/components/PeriodicCertificateDemo.vue'
import ParabolicShadowingDemo from '../src/components/ParabolicShadowingDemo.vue'
import DynamicsGlossaryDemo from '../src/components/DynamicsGlossaryDemo.vue'
</script>

# Les mathématiques de la perturbation et des approximants

La [présentation principale](./index.md) explique *pourquoi* la théorie de la perturbation
est nécessaire pour zoomer profondément dans l'ensemble de Mandelbrot, et la page
[optimisations](./optimisation.md) explique *comment* le rendu reste fluide.

Cette page s'attaque au troisième pilier : les **mathématiques** qui permettent d'accélérer
le calcul de la perturbation elle-même — jets de Taylor, approximants de Padé, formes de
Möbius — et surtout la manière dont chaque formule utilisée par le moteur est
**démontrée formellement** avec l'assistant de preuve **Lean 4**.

Aucun prérequis au-delà du lycée n'est supposé : chaque notion (série de Taylor,
polydisque, approximant de Padé, homographie...) est introduite avec des exemples
et des démonstrations interactives.

## Préambule : certifier les formules avec Lean

### Le problème : des maths trop faciles à casser

Le moteur de rendu repose sur des dizaines d'identités algébriques du genre :

$$
\frac{a(az+c)}{a-z} - (az + z^2 + c) = \frac{z(z^2+c)}{a-z}
$$

Chacune est facile à vérifier à la main... et tout aussi facile à se tromper d'un signe,
d'oublier une hypothèse ($a - z \neq 0$ ici !), ou de la casser lors d'un refactoring.
Une erreur ne produit pas un crash : elle produit une **image subtilement fausse**,
parfois seulement à certains niveaux de zoom.

Les tests numériques aident, mais ils ne testent que des points d'échantillonnage,
avec la précision limitée des `f64` (~$2^{-52}$ en relatif). Un test qui passe
« à $10^{-15}$ près » ne dit pas si la formule est *exacte* ou *presque exacte*.

### La solution : un assistant de preuve

[Lean 4](https://lean-lang.org/) est un assistant de preuve : un langage de programmation
dans lequel on écrit des théorèmes **et leurs démonstrations**, que la machine vérifie
mécaniquement, étape par étape, jusqu'aux axiomes. S'appuyer sur
[Mathlib](https://leanprover-community.github.io/), sa bibliothèque de mathématiques
formalisées (analyse complexe, séries, topologie...), permet d'énoncer des résultats
de niveau recherche.

Le dossier [`lean-proofs/`](https://github.com/gcollombet/mandelbrot/tree/master/lean-proofs)
du projet contient désormais **36 modules** et plus de 12 000 lignes de preuves, compilées
avec Lean 4.31.0 / Mathlib 4.31.0, **sans aucun `sorry`** (le mot-clé qui permet d'admettre
un résultat sans le prouver). Les sections récentes de cette page — métrique hyperbolique,
propagation des dérivées, rebasing projectif et **renormalisation de Feigenbaum** — sont
issues de ces nouveaux modules.

### Anatomie d'un théorème Lean

Prenons le tout premier théorème du dossier. Le bloc Möbius du moteur définit un
coefficient $D := -c_{20}/c_{10}$ précisément pour qu'une certaine quantité
$q_{20} = c_{20} + D \cdot c_{10}$ s'annule. Le build Rust le vérifie numériquement
à $2^{-52}$ près. Lean le prouve *exactement*, sur *n'importe quel corps* :

```lean
theorem mobius_q20_zero {K : Type*} [Field K] (c10 c20 : K) (h : c10 ≠ 0) :
    c20 + (-c20 / c10) * c10 = 0 := by
  field_simp
  ring
```

Lisons-le morceau par morceau :

| Fragment | Signification |
|---|---|
| `{K : Type*} [Field K]` | « Pour tout corps $K$ » — ℝ, ℂ, les rationnels... la preuve vaut pour tous |
| `(c10 c20 : K)` | Deux éléments quelconques du corps |
| `(h : c10 ≠ 0)` | **L'hypothèse obligatoire** : on va diviser par $c_{10}$ |
| `c20 + (-c20 / c10) * c10 = 0` | La conclusion : le zéro construit s'annule vraiment |
| `by field_simp; ring` | La démonstration : deux *tactiques* (chasser les dénominateurs, puis normaliser le polynôme) |

Le point crucial : Lean **refuse de compiler** si l'hypothèse `c10 ≠ 0` manque.
Impossible d'oublier un dénominateur. C'est exactement le genre d'oubli qui casse
silencieusement un shader.

### La méthode de preuve, en trois étages

Les preuves du projet suivent une architecture en couches, du plus abstrait au plus concret :

**1. Identités algébriques exactes** — énoncées sur un corps quelconque $K$, sans
aucune notion de norme ou de convergence. Exemple : le reste exact du Padé,
la composition de deux Möbius, le télescopage des défauts. Tactiques typiques :
`field_simp`, `ring`.

**2. Majorants scalaires certifiés** — énoncées sur $\mathbb{C}$ avec sa norme.
Chaque inégalité triangulaire, chaque marge de dénominateur est explicite.
Exemple : $\|az + z^2 + c\| \leq \|a\|r + r^2 + R_c$ dès que $\|z\| \leq r$ et $\|c\| \leq R_c$.
Tactiques : `linarith`, `nlinarith`, `positivity`.

**3. Analyse complexe** — les théorèmes de Cauchy de Mathlib (représentation en série
entière d'une fonction holomorphe, estimation des coefficients) sont spécialisés au
résidu concret du moteur, sur son polydisque de validité.

::: tip Pourquoi prouver sur un corps quelconque ?
Prouver `mobius_q20_zero` sur « tout corps » plutôt que sur ℂ est *plus fort* et
souvent *plus simple* : la preuve ne peut utiliser que les axiomes d'un corps
(associativité, distributivité, inverses...), donc elle capture la raison
*algébrique* pour laquelle la formule est vraie — pas un accident numérique.
:::

### Ce que les preuves garantissent — et ce qu'elles ne garantissent pas

Une preuve Lean certifie la **formule mathématique** sur les types indiqués. Elle ne
certifie pas automatiquement :

- l'implémentation en `f64` (arrondis flottants) ni les arrondis WGSL du GPU,
- que le code Rust/TypeScript implémente bien la formule prouvée,
- les hypothèses *dynamiques* (par exemple « l'orbite reste dans le disque certifié »),
  qui doivent être contrôlées au runtime par des tests explicites.

C'est une séparation des responsabilités : Lean élimine les erreurs de *maths*,
les tests runtime contrôlent les *hypothèses*, et l'arithmétique d'intervalle
gère les *arrondis*.

### Les 15 modules en un coup d'œil

| Module | Contenu | Notion clé |
|---|---|---|
| `Algebra` | Reste du Padé, composition de Möbius | Identités exactes |
| `CPlus` | Extractions $[1/1]\text{-}c^+$ et $[2/1]\text{-}c^+$ | Zéros construits |
| `Jets`, `BivariateJets` | Troncatures de polynômes | Jets, degré total |
| `Bounds` | Majorants scalaires, enveloppes d'orbite | Inégalité triangulaire |
| `Cauchy`, `Polydisc` | Bornes de coefficients, queues | Polydisque |
| `RationalCertificate` | Certificat d'erreur de bout en bout | Résidu $Q$ |
| `PadeDominance` | Padé ≥ jet, sélecteur, récurrence | Dominance |
| `ParabolicSuperconvergence` | Flot $\dot z = z^2$, shadowing | Superconvergence |
| `NonautonomousPade` | Produits de matrices de Padé | Télescopage |
| `Periodic`, `PeriodicRuntime`, `CriticalPeriodic` | Points fixes, multiplicateur, disques invariants, noyaux critiques | Birapport et invariance |
| `Fatou`, `Dynamics`, `FatouSectorial` | Forme normale parabolique, contraction | Coordonnées de Fatou |
| `MobiusDisk`, `MovingDisks` | Image exacte d'un disque, marge de pôle | Disques mobiles |
| `SchwarzPick`, `HyperbolicPade`, `HyperbolicTelescope` | Pas non-expansifs, distance pseudo-hyperbolique | Métrique hyperbolique |
| `MatrixC1`, `MatrixC1Deriv`, `MatrixC1Disk` | Jet en $c$ des matrices, dérivée $\partial_z$ | Propagation C¹ |
| `PhaseAwareTransport`, `RenormalizedTransport`, `Rebasing` | Transport avec phase, gauges projectives | Rebasing |
| `FeigenbaumRenormalization`, `FeigenbaumFiniteReturn` | Point fixe universel, retours $2^n$ | Renormalisation |
| `FeigenbaumRationalReplay`, `VerifiedRationalBounds` | Rejeu noyau dyadique exact | Certificat rationnel |

Dans la suite, chaque section indique en encadré les théorèmes Lean correspondants.
Les dernières sections de cette page couvrent les découvertes les plus récentes.

## Vocabulaire : le zoo dynamique

Avant d'entrer dans les formules, quelques mots reviennent sans cesse — *point
parabolique*, *super-attractif*, *hyperbolique*, *point de Feigenbaum*. Ils décrivent le
**comportement d'un point $c$** sous l'itération $P_c(z) = z^2 + c$, et ils se déduisent
tous d'une seule quantité.

### La sonde : l'orbite critique

Le point $z = 0$ est le **point critique** de $P_c$ (là où $P_c'(z) = 2z$ s'annule).
Son orbite $0 \to c \to c^2 + c \to \cdots$ — l'**orbite critique** — est *exactement*
l'orbite de référence que le moteur calcule en haute précision. Un théorème de Fatou dit
que le sort de cette seule orbite décide de toute la dynamique. C'est donc elle qu'on
itère ci-dessous.

### Le juge : le multiplicateur

Quand l'orbite tombe sur un **cycle** de période $p$ (une boucle
$z_0 \to z_1 \to \cdots \to z_{p-1} \to z_0$), on lui attache un nombre, le
**multiplicateur** :

$$
\lambda = (P_c^{p})'(z_0) = \prod_{k=0}^{p-1} 2 z_k
$$

C'est le facteur d'étirement du cycle à chaque tour. Toute la classification tient dans
son module $|\lambda|$ :

| $\lvert\lambda\rvert$ | Nom | Ce que ça veut dire | Où |
|---|---|---|---|
| $= 0$ | **super-attractif** | le point critique $0$ *est* dans le cycle ; convergence quadratique | les **centres** des composantes ($c=0$, $c=-1$…) |
| $< 1$ | **attractif** (hyperbolique) | le cycle aspire ses voisins, géométriquement | l'**intérieur** des composantes |
| $= 1$ | **parabolique / neutre** | cas-frontière, $\lambda$ racine de l'unité ; orbites *lentes* en $\sim -1/n$ | le **bord** : cusps, racines de bulbes |
| $> 1$ | **répulsif** | le cycle repousse | typiquement le bord de l'ensemble de Julia |

Deux termes complètent le tableau :

- **Point / paramètre hyperbolique** : un $c$ dont l'orbite critique converge vers un
  cycle attractif — c'est le régime « facile », exploité par la [métrique
  hyperbolique](#la-metrique-hyperbolique-quand-un-pas-ne-peut-plus-etirer).
- **Point de Feigenbaum** $c_\infty = -1{,}401155\ldots$ : le point d'accumulation de la
  cascade de **doublements de période** ($1 \to 2 \to 4 \to 8 \to \cdots$). Il n'est ni
  périodique ni parabolique — infiniment renormalisable — et c'est le héros de la section
  [autosimilarité](#l-autosimilarite-de-feigenbaum-sauter-2-n-iterations-d-un-coup).

### À vous de juger

Déplacez le marqueur $c$ sur la carte de Mandelbrot (glissez, ou choisissez un
préréglage). À droite, l'orbite critique est itérée en direct ; le moteur détecte le
cycle, calcule $|\lambda|$ et affiche la **classification**. Observez :

- les **centres** ($c=0$, $c=-1$) : le cycle passe par le point critique $\times$, $|\lambda|=0$, *super-attractif* ;
- l'**intérieur** ($c=-0.5$) : un cycle bien serré, $|\lambda|<1$, *attractif* ;
- les **cusps/racines** ($c=0.25$, $c=-0.75$) : $|\lambda|=1$, *parabolique*, l'orbite met une éternité à se poser ;
- la **pointe** ($c=-2$) : cycle *répulsif*, $|\lambda|=4$ ;
- **Feigenbaum** ($c=-1.401155$) : l'orbite ne se stabilise jamais sur un cycle fini.

::: info Démonstration — classer un point par son orbite critique

<ClientOnly><DynamicsGlossaryDemo /></ClientOnly>

:::

::: tip Lien avec le reste de la page
Cette carte n'est pas un gadget : chaque régime appelle une machinerie différente du
moteur. **Attractif** → Padé/jet et métrique hyperbolique. **Parabolique** → flot
$\dot z = z^2$, shadowing et coordonnées de Fatou. **Périodique** → birapport et
fast-forward $\kappa^k$. **Feigenbaum** → sauts renormalisés de $2^n$ itérations.
:::

## La perturbation : d'où vient l'équation

### Rappel du problème

L'itération de Mandelbrot est $z_{n+1} = z_n^2 + c$. À un zoom de $10^{30}$, les
coordonnées $c$ de deux pixels voisins ne diffèrent qu'à la 30ᵉ décimale : un `f64`
(15-16 chiffres significatifs) ne peut même pas les distinguer.

La solution : calculer **une seule orbite de référence** $Z_n$ en précision arbitraire
(sur CPU, en Rust), puis exprimer chaque pixel comme une **petite perturbation** de
cette référence.

### La dérivation, pas à pas

Posons pour le pixel : $z_n = Z_n + \delta z_n$ et $c = C + \delta c$, où $(Z_n, C)$
est la référence et $(\delta z_n, \delta c)$ la perturbation. Injectons dans l'itération :

$$
\underbrace{Z_{n+1} + \delta z_{n+1}}_{z_{n+1}}
= (Z_n + \delta z_n)^2 + C + \delta c
= \underbrace{Z_n^2 + C}_{Z_{n+1}} + 2 Z_n\, \delta z_n + \delta z_n^2 + \delta c
$$

La partie référence se simplifie des deux côtés (c'est tout l'intérêt !) et il reste :

$$
\boxed{\;\delta z_{n+1} = 2 Z_n\, \delta z_n + \delta z_n^2 + \delta c\;}
$$

Tous les termes de cette équation sont **petits** : ils se calculent en `f32` sur le GPU
sans perte de précision relative, car on n'additionne plus jamais un très grand nombre
à un très petit.

### Visualiser la perturbation

Ci-dessous, l'orbite de référence (bleue) et une orbite perturbée (orange) sont
quasiment superposées dans le plan complexe : c'est leur *différence* $\delta z_n$,
tracée à droite en échelle logarithmique, qui contient toute l'information du pixel.
Observez qu'elle reste de l'ordre de $|\delta c|$ pendant longtemps — bien au-dessus
de la précision d'un `f32` tant que $|\delta c|$ n'est pas minuscule, et c'est
précisément pour cela que le calcul GPU fonctionne.

::: info Démonstration

<ClientOnly><PerturbationOrbitDemo /></ClientOnly>

:::

### Le pas exact, objet central de toutes les preuves

En posant $a_n = 2Z_n$ (connu, fourni par l'orbite de référence) et en renommant
$\delta z \to z$, $\delta c \to c$ pour alléger, on obtient **le** pas de perturbation :

$$
f_n(z) = a_n z + z^2 + c
$$

C'est une suite de polynômes quadratiques *différents à chaque étape* (car $a_n$ change).
Toute la suite de cette page étudie une seule question :

> Peut-on approximer la composée $f_{n-1} \circ \cdots \circ f_1 \circ f_0$ de milliers
> de pas par une formule compacte, avec une **erreur certifiée** ?

Si oui, le GPU peut « sauter » des blocs entiers d'itérations d'un coup.

::: details Théorèmes Lean correspondants
- `exactStep` (module `Algebra`) : la définition $f(z) = az + z^2 + c$.
- `exactStep_norm_le` (module `Bounds`) : le majorant d'un pas,
  $\|f(z)\| \leq \|a\| r + r^2 + R_c$ pour $\|z\| \leq r$, $\|c\| \leq R_c$.
- `scalar_majorant` (module `Bounds`) : par récurrence, l'enveloppe scalaire
  $\rho_{n+1} = \|a_n\|\rho_n + \rho_n^2 + R_c$ contient toute l'orbite exacte.
  C'est le « tube de sécurité » dans lequel tous les certificats suivants vivent.
:::

## Taylor, jets et séries entières

### L'idée de Taylor : remplacer une fonction par un polynôme

Le développement de Taylor d'une fonction $f$ autour de $0$ consiste à chercher le
polynôme qui « colle » le mieux à $f$ près de $0$ :

$$
f(x) \approx f(0) + f'(0)\,x + \frac{f''(0)}{2}\,x^2 + \cdots + \frac{f^{(N)}(0)}{N!}\,x^N
$$

Chaque terme supplémentaire améliore l'approximation *près du centre*.
Jouez avec l'ordre dans la démonstration ci-dessous, et surtout **essayez les trois
fonctions** :

::: info Démonstration — la série de Taylor et son rayon de convergence

<ClientOnly><TaylorApproxDemo /></ClientOnly>

:::

Trois comportements très différents apparaissent :

- $e^x$ : le polynôme converge partout. Augmenter l'ordre améliore tout.
- $\frac{1}{1-x}$ : la série $1 + x + x^2 + \cdots$ ne converge que pour $|x| < 1$.
  Normal, la fonction **explose** en $x = 1$ (un *pôle*) : aucun polynôme ne peut suivre.
- $\frac{1}{1+x^2}$ : le cas le plus instructif. La fonction est parfaitement lisse
  sur tout $\mathbb{R}$... et pourtant la série diverge pour $|x| > 1$ !

Le mystère du troisième cas se résout **dans le plan complexe** : $\frac{1}{1+x^2}$ a
des pôles en $x = \pm i$, à distance $1$ de l'origine. La règle générale est :

> Le rayon de convergence d'une série de Taylor est la distance au **pôle le plus
> proche dans le plan complexe** — même s'il est invisible sur l'axe réel.

Retenez cette idée : elle explique à la fois pourquoi il faut travailler dans ℂ pour
*borner* les coefficients (section polydisque), et pourquoi les fractions rationnelles
approximent mieux que les polynômes (section Padé).

### Les jets : un Taylor tronqué, vu comme objet algébrique

Un **jet d'ordre $K$** est simplement la donnée des coefficients de Taylor jusqu'au
degré $K$ — autrement dit, un polynôme tronqué. Le moteur manipule des jets plutôt
que des fonctions : ce sont des objets **finis**, stockables dans un buffer GPU.

L'opération clé est le **merge** : composer deux pas. Le carré d'un jet fait
apparaître des degrés supérieurs à $K$, qu'on retronque. Question cruciale :

> Tronquer après *chaque* merge donne-t-il le même résultat que composer les
> polynômes complets et tronquer *une seule fois* à la fin ?

Si la réponse était non, la table d'approximants construite bloc par bloc serait
fausse. La réponse est oui, et c'est un théorème Lean.

### Les jets bivariés : deux variables, un degré total

Subtilité : notre pas $f(z) = az + z^2 + c$ dépend de **deux** petites variables,
$z$ (la perturbation d'orbite) et $c$ (la perturbation de paramètre). Un jet bivarié
regroupe les coefficients $a_{ij}$ des monômes $z^i c^j$ :

$$
\Phi(z, c) = \sum_{i,j} a_{ij}\, z^i c^j
\qquad \text{tronqué à } \underbrace{i + j \leq K}_{\text{degré total}}
$$

Le bon critère de troncature est le **degré total** $i+j$ : comme $z$ et $c$ sont
tous les deux petits, un monôme $z^2c$ (degré 3) est aussi négligeable que $z^3$.

::: details Théorèmes Lean correspondants (module `BivariateJets`)
- `TotalJetEq K p q` : « $p$ et $q$ ont les mêmes coefficients jusqu'au degré total $K$ ».
  Prouvé stable par addition, produit, puissance (`totalJetEq_add/mul/pow`) et par un
  pas quadratique (`totalJetEq_step`).
- `iterateTruncated_eq_totalTrunc_iterate` : **le théorème du builder**. Tronquer
  après chaque merge = tout composer puis tronquer une fois. Prouvé par récurrence
  sur la liste des multiplicateurs $a_j$ du bloc.
- `twoStep_degreeTwo_with_remainder` (module `Jets`) : le merge de deux pas,
  décomposé exactement en sa partie de degré 2 et son reste — on y voit apparaître
  les termes croisés $2a_1zc$ et $c^2$.
:::

## Les séries géométriques et leurs queues

Avant d'aborder les bornes d'erreur, un outil omniprésent : la série géométrique.

### La somme géométrique

Pour $|\theta| < 1$ :

$$
\sum_{k=0}^{\infty} \theta^k = \frac{1}{1-\theta}
\qquad\text{et}\qquad
\sum_{k=0}^{\infty} (k+1)\,\theta^k = \frac{1}{(1-\theta)^2}
$$

Pourquoi est-ce central ? Parce que quand on tronque une série de Taylor au degré $D$,
l'erreur commise est la **queue** $\sum_{d \geq D} (\text{termes})$. Si chaque terme est
majoré par $M(d+1)\theta^d$ (ce sera le cas, voir la section suivante), la queue admet
une **forme fermée exacte** :

$$
\sum_{k=0}^{\infty} (D+k+1)\,\theta^{D+k}
= \frac{\theta^D\big((D+1) - D\theta\big)}{(1-\theta)^2}
$$

Une somme *infinie* d'erreurs devient un *seul* nombre calculable. C'est ce nombre que
le moteur compare à sa tolérance $\varepsilon$ pour décider si un approximant est valide.

::: info Démonstration — la queue et sa forme fermée

Les barres bleues sont les termes « couverts » par l'approximant, les oranges la queue
négligée. Vérifiez que la somme numérique de la queue coïncide avec la forme fermée,
pour tout $\theta$ et toute coupe $D$ :

<ClientOnly><GeometricTailDemo /></ClientOnly>

:::

Deux comportements à observer dans la démo :

- à $\theta$ fixé, la queue **s'effondre géométriquement** quand $D$ augmente :
  chaque degré supplémentaire dans le jet divise l'erreur par $\approx 1/\theta$ ;
- quand $\theta \to 1$, la queue explose : l'approximant n'est utilisable que sur
  un domaine où $\theta$ reste franchement inférieur à 1. D'où les **rayons de
  validité** émis avec chaque bloc.

::: details Théorèmes Lean correspondants
- `hasSum_shifted_cauchy_tail` (module `Bounds`) : la forme fermée exacte de la
  queue $\sum_k (D+k+1)\theta^{D+k}$ ci-dessus.
- `cauchy_dominated_tail_le` (module `Cauchy`) : toute queue positive dominée
  terme à terme par ce majorant est sommable et bornée par la forme fermée.
:::

## Le polydisque et les bornes de Cauchy

Nous savons maintenant sommer une queue *si* chaque coefficient est borné par
$M\theta^d$. Mais d'où vient cette borne sur les coefficients ? De l'analyse complexe.

### Une variable : l'estimation de Cauchy

C'est un des plus beaux théorèmes de l'analyse complexe. Si $f$ est holomorphe
(dérivable au sens complexe) sur le disque $|z| \leq R$ et si $|f| \leq M$ sur le
**cercle** frontière, alors ses coefficients de Taylor $a_n$ vérifient :

$$
|a_n| \;\leq\; \frac{M}{R^n}
$$

Intuition : la formule intégrale de Cauchy exprime chaque coefficient comme une
moyenne de $f$ sur le cercle de rayon $R$, divisée par $R^n$. Connaître un *maximum
sur le bord* suffit donc à contrôler *tous* les coefficients d'un coup — sans jamais
calculer une seule dérivée.

Conséquence immédiate : en un point $|z| = x < R$, le terme de degré $n$ pèse au plus
$M (x/R)^n = M\theta^n$ avec $\theta = x/R < 1$. Voilà notre majorant géométrique.

### Deux variables : le polydisque

Notre résidu dépend de deux variables $(z, c)$. Le domaine naturel n'est pas une
boule de dimension 4 mais un **polydisque** (ici un *bidisque*) : le produit cartésien
de deux disques,

$$
\mathbb{D}^2 = \{\, (z, c) \;:\; |z| \leq R_z \ \text{ et } \ |c| \leq R_c \,\}
$$

C'est un objet de dimension 4, impossible à dessiner directement — mais son « ombre »
dans chaque variable est un simple disque, et c'est ainsi qu'on le représente.

Son bord utile n'est pas tout son bord topologique : c'est le **bord distingué**, le
produit des deux *cercles* $\{|z| = R_z\} \times \{|c| = R_c\}$. Un cercle × un cercle,
c'est un **tore** (un « polytore ») : la surface d'un donut, de dimension 2, plongée
dans un espace de dimension 4. Le miracle de Cauchy se transporte : il suffit de borner
$|F| \leq M$ **sur ce tore** pour contrôler tous les coefficients :

$$
|a_{ij}| \;\leq\; \frac{M}{R_z^{\,i}\, R_c^{\,j}}
$$

La preuve est élégante : on applique l'estimation de Cauchy à une variable *deux fois
de suite* — d'abord sur le cercle en $z$ (à $c$ fixé), puis sur le cercle en $c$.

### Évaluer la queue sur le polydisque

En un point d'évaluation $|z| \leq x$, $|c| \leq y$, posons les **rayons normalisés**
$u = x/R_z$ et $v = y/R_c$. Le monôme $(i,j)$ pèse au plus $M u^i v^j$. Pour majorer
tout ce qui dépasse le degré total $D$, on regroupe par **tranches de degré**
$d = i + j$ :

$$
\text{tranche}_d = \sum_{i+j=d} u^i v^j
\qquad\text{puis}\qquad
\text{queue}(D) = \sum_{d \geq D} \text{tranche}_d
$$

Cette double somme a elle aussi une forme fermée exacte — dite **anisotrope** car elle
distingue $u$ et $v$ :

$$
\text{queue}(D) = \frac{1}{u - v}\left(\frac{u^{D+1}}{1-u} - \frac{v^{D+1}}{1-v}\right)
\qquad (u \neq v)
$$

Quand $u = v = \theta$, cette expression devient $\frac{0}{0}$... mais la limite existe
et redonne exactement la forme diagonale de la section précédente,
$\frac{\theta^D((D+1)-D\theta)}{(1-\theta)^2}$. L'implémentation bascule sur cette
branche « sûre » près de la diagonale.

::: info Démonstration — le bidisque et sa queue anisotrope

À gauche, les deux disques du polydisque avec leurs rayons d'évaluation normalisés.
À droite, le poids de chaque monôme $u^i v^j$ ; la coupe blanche sépare le jet conservé
(bleu) de la queue majorée (orange). Comparez la queue anisotrope exacte au majorant
diagonal $\theta = \max(u,v)$ : quand $u$ et $v$ sont très différents (cas typique :
la perturbation d'orbite et la perturbation de paramètre n'ont pas du tout la même
taille), le gain est spectaculaire.

<ClientOnly><PolydiscDemo /></ClientOnly>

:::

::: details Théorèmes Lean correspondants (modules `Cauchy`, `Polydisc`)
- `norm_cauchyPowerSeries_le_sup` : l'estimation $|a_n| \leq M/R^n$ avec le
  supremum de bord fourni comme certificat explicite.
- `differentiable_cauchy_certificate` : une fonction holomorphe sur le disque fermé
  est représentée par sa série de Cauchy sur le disque ouvert, avec la borne sur
  chaque coefficient.
- `norm_iteratedCauchyCoefficient_le` : l'itération en deux variables,
  $|a_{ij}| \leq M R_z^{-i} R_c^{-j}$, obtenue en appliquant Cauchy sur les deux
  cercles du bord distingué.
- `hasSum_anisotropic_tail` : la forme fermée anisotrope exacte de la queue.
- `anisotropicTailClosed` et ses théorèmes : la branche diagonale amovible
  (numériquement sûre), la positivité, la monotonie en chaque rayon, et la preuve
  que le majorant diagonal historique domine toujours la version anisotrope
  (`anisotropic_tail_le_diagonal`) — la nouvelle borne ne peut donc que gagner.
- `iteratedCauchy_polydisc_tail_closed_le` : le certificat de bout en bout, de la
  borne $M$ sur le polytore jusqu'à la queue évaluée en $(x, y)$.
:::

## Les approximants de Padé

### L'idée : approximer par une fraction plutôt qu'un polynôme

Un **approximant de Padé** $[L/M]$ d'une fonction $f$ est une fraction rationnelle

$$
\frac{P(z)}{Q(z)} = \frac{p_0 + p_1 z + \cdots + p_L z^L}{1 + q_1 z + \cdots + q_M z^M}
$$

dont le développement de Taylor coïncide avec celui de $f$ **jusqu'au degré $L + M$**.
À nombre de coefficients égal, on remplace des termes de haut degré du numérateur par
un dénominateur.

Pourquoi diable ferait-on cela ? Rappelez-vous le rayon de convergence : un polynôme
est incapable d'approcher une fonction près d'un pôle. Une fraction rationnelle, elle,
**possède ses propres pôles** — et si son pôle se place près du vrai pôle de $f$,
l'approximation reste bonne bien au-delà du rayon de Taylor. Le Padé « apprend » la
singularité au lieu de la subir.

### Le Padé $[1/1]$ d'un pas de perturbation

Appliquons l'idée au pas $f(z) = az + z^2 + c$. Son Padé $[1/1]$ (calculé pour que
les développements coïncident jusqu'au degré 2) est :

$$
\text{padé}(z) = \frac{a(az + c)}{a - z}
$$

Les deux erreurs se calculent **exactement** — ce sont des théorèmes Lean, pas des
estimations :

$$
\underbrace{(az + c)}_{\text{jet affine}} - f(z) = -z^2
\qquad\qquad
\underbrace{\frac{a(az+c)}{a-z}}_{\text{padé }[1/1]} - f(z) = \frac{z(z^2 + c)}{a - z}
$$

Le jet affine se trompe de $z^2$ (degré 2). Le Padé se trompe de $\sim z^3/a$
(degré 3, avec un dénominateur en bonus) : **un ordre de précision gagné gratuitement**,
avec le même nombre de coefficients.

### La région de dominance : une frontière exacte

« Gratuit », vraiment ? Pas partout. La comparaison des deux erreurs (dans le canal
Julia $c = 0$) donne $\left|\frac{z^3}{a-z}\right| \leq |z|^2 \iff |z| \leq |a - z|$.
Ce n'est pas seulement une condition suffisante — Lean prouve que c'est une
**équivalence exacte** :

> Le Padé $[1/1]$ bat le jet affine **exactement** sur le demi-plan $|z| \leq |a-z|$,
> c'est-à-dire du côté de $0$ par rapport à la **médiatrice** du segment $[0, a]$.

Géométriquement : tant que la perturbation $z$ reste « plus proche de 0 que du
pôle $a$ », le Padé gagne. Le disque simple $2|z| \leq |a|$ est une sous-région
commode pour un test rapide dans le shader.

::: info Démonstration — Padé contre jet

Mode « un pas » : les deux courbes d'erreur en échelle log, avec la frontière de
dominance $z = a/2$ en rouge. En dessous, le Padé écrase le jet ; au-dessus, il
devient pire (son pôle approche !). Mode « flot parabolique » : le cas extrême où
le Padé est *infiniment* meilleur — voir la sous-section suivante.

<ClientOnly><PadeVsJetDemo /></ClientOnly>

:::

### Le sélecteur : ne jamais régresser

Que faire hors de la région de dominance ? Le moteur n'a pas à choisir à l'aveugle :
chaque candidat (Padé, jet) vient avec sa **borne d'erreur certifiée**. Le sélecteur
prend celui dont la borne est la plus petite :

$$
\text{erreur}(\text{choix}) \;\leq\; \min(E_{\text{padé}},\, E_{\text{jet}})
$$

Ce petit théorème (`choosePadeOrJet_error_le_min`) a une conséquence rassurante :
activer le Padé **ne peut jamais** dégrader la garantie du jet seul. Au pire, on
retombe sur le jet.

### Pourquoi le Padé marche : les récurrences géométriques

Il y a une caractérisation lumineuse de ce que « résume » un dénominateur de degré 1.
Multiplions la série $f = \sum a_n z^n$ par $(1 - \lambda z)$ : le coefficient de
degré $n+1$ du produit est

$$
a_{n+1} - \lambda\, a_n
$$

C'est le **défaut de récurrence géométrique** : il vaut zéro exactement quand
$a_{n+1} = \lambda a_n$. Autrement dit :

> Un Padé $[L/1]$ de dénominateur $1 - \lambda z$ est **exact** si et seulement si la
> queue des coefficients suit une progression géométrique de raison $\lambda$.
> Son erreur est exactement la somme des défauts de cette récurrence.

Et comment détecter qu'une suite est « presque géométrique » ? Par les
**mineurs de Hankel** : $a_n a_{n+2} - a_{n+1}^2$. Pour une suite géométrique,
$a_n a_{n+2} = a_{n+1}^2$ (chaque terme est la moyenne géométrique de ses voisins),
donc tous les mineurs s'annulent — et réciproquement. Le premier résidu non compensé
du $[1/1]$ est précisément $q_{30} = (a_{10}a_{30} - a_{20}^2)/a_{10}$ : un mineur
de Hankel divisé par le premier coefficient. Le moteur *mesure* donc l'écart à la
géométricité de sa propre série.

### La superconvergence parabolique

Le cas d'école où la queue est *exactement* géométrique : la fonction

$$
\varphi_t(z) = \frac{z}{1 - tz} = z + tz^2 + t^2z^3 + t^3z^4 + \cdots
$$

Sa queue est géométrique de raison $tz$. Résultat : le Padé $[1/1]$ de numérateur $z$
**est égal à** $\varphi_t$ — erreur nulle, pas petite, *nulle* — alors que tout jet
polynomial d'ordre $K$ garde le reste exact $\frac{t^K z^{K+1}}{1 - tz} \neq 0$.
Basculez la démo ci-dessus en mode « flot parabolique » pour le constater.

Cette fonction n'est pas un exemple artificiel : c'est le flot exact de l'équation
$\dot z = z^2$, qui gouverne la dynamique près des points paraboliques de l'ensemble
de Mandelbrot (les « vallées » entre les bulbes, où les orbites s'attardent des
milliers d'itérations). C'est exactement là que le moteur a besoin de sauter des blocs
énormes — et exactement là que le Padé excelle.

::: details Théorèmes Lean correspondants (modules `Algebra`, `PadeDominance`, `ParabolicSuperconvergence`)
- `padeSeed_sub_exactStep` : le reste exact $\frac{z(z^2+c)}{a-z}$, sous
  l'hypothèse explicite $a - z \neq 0$.
- `padeSeed_error_le_affine_error_iff` : la dominance est une **équivalence**
  avec $|z| \leq |a-z|$ (pas seulement une implication).
- `choosePadeOrJet_error_le_min` : le sélecteur atteint le min des deux bornes.
- `padeL1Cross_coeff_succ` : le coefficient $n+1$ du produit croisé est
  exactement $a_{n+1} - \lambda a_n$.
- `padeL1_exact_of_geometric_tail` : queue géométrique ⟹ Padé exact.
- `hankel_rank_one_iff_geometric_recurrence` : mineurs de Hankel nuls ⟺
  récurrence géométrique.
- `parabolic_pade_strictly_better_than_jet` : sur $\varphi_t$, erreur du Padé
  $= 0$ et erreur de tout jet $> 0$ (hors cas dégénérés).
- `pade_bound_lt_jet_bound` : version quantitative — si les défauts valent
  $\delta$ fois le majorant du jet et si la marge de pôle est $1-\mu$, le
  majorant Padé vaut $\frac{\delta}{1-\mu}$ fois celui du jet ; strictement
  meilleur dès que $\delta < 1 - \mu$.
:::

## Le flot parabolique et le shadowing

### Comparer une itération discrète à un flot continu

L'itération discrète $z \mapsto z + z^2$ (le pas de perturbation près d'un point
parabolique, avec $a \approx 1$ ramené à cette forme) ressemble à un pas d'Euler de
l'équation différentielle $\dot z = z^2$, dont le flot exact au temps $t$ est notre
$\varphi_t(z) = z/(1-tz)$, avec la belle loi de semi-groupe
$\varphi_s \circ \varphi_t = \varphi_{s+t}$.

Question : après $n$ itérations discrètes, à quelle distance est-on de $\varphi_n(z_0)$ ?
Si l'écart est contrôlé, le moteur peut remplacer $n$ itérations par **une seule
évaluation** de $\varphi_n$. C'est ce qu'on appelle une borne de **shadowing**
(l'orbite discrète « suit comme une ombre » le flot continu).

::: info Démonstration — le shadowing du flot parabolique

En haut : l'itération discrète (points orange) sur la courbe du flot exact (bleue) —
les deux convergent vers le point fixe parabolique $0$ en $\sim -1/n$. En bas :
l'écart entre les deux, qui reste minuscule quand $z_0$ est petit.

<ClientOnly><ParabolicShadowingDemo /></ClientOnly>

:::

### Le télescopage : transformer une comparaison en somme exacte

La technique de preuve mérite d'être racontée, car elle revient partout. Pour comparer
le chemin discret $x_0, x_1, \ldots, x_n$ au flot, on écrit la différence totale comme
une **somme télescopique** de défauts locaux : au pas $j$, on commet l'erreur d'un seul
pas discret, puis on la **transporte** par le flot exact restant ($n - j - 1$ unités de
temps). Lean prouve l'identité *exacte* (pas une inégalité !) :

$$
\varphi_n(x_0) - x_n \;=\; \sum_{j=0}^{n-1}
\frac{x_j^3}{\big(1 - (n-j)x_j\big)\big(1 - (n-j-1)(x_j + x_j^2)\big)}
$$

Chaque terme garde son **temps restant** dans le dénominateur : les défauts commis tôt
(quand il reste beaucoup de temps de flot) sont *amortis* par le transport, au lieu
d'être multipliés par une constante de Lipschitz uniforme pessimiste. Il ne reste plus
qu'à majorer chaque terme avec l'enveloppe $r_{j+1} = r_j + r_j^2$ pour obtenir un
certificat calculable.

### La version non autonome : le pont vers les matrices

Le vrai pas de perturbation n'est pas $z + z^2$ : c'est $a_j z + z^2 + c$ avec un
coefficient $a_j = 2Z_j$ **différent à chaque itération**, et $c \neq 0$. Le même
schéma télescopique fonctionne, à condition de représenter le Padé de chaque pas par
sa **matrice** :

$$
\text{padé}_j(z) = \frac{a_j(a_j z + c)}{a_j - z}
\quad\longleftrightarrow\quad
M_j = \begin{pmatrix} a_j^2 & a_j c \\ -1 & a_j \end{pmatrix}
$$

La « queue » du bloc (les pas $j+1, \ldots, n-1$ restants) est le produit matriciel
$M_{n-1} \cdots M_{j+1}$, et le défaut local $\frac{z_j(z_j^2+c)}{a_j - z_j}$ est
transporté exactement par cette queue, via son déterminant et ses deux dénominateurs.
Ni la variation des $a_j$, ni le canal $c$ ne cassent le télescopage : c'est le contenu
du théorème `nonautonomous_pade_telescope`, avec son majorant calculable
`nonautonomous_pade_shadowing_bound`.

Pourquoi des matrices ? C'est l'objet de la section suivante.

::: details Théorèmes Lean correspondants (modules `ParabolicSuperconvergence`, `NonautonomousPade`)
- `parabolicFlow_add` : la loi de semi-groupe $\varphi_s \circ \varphi_t = \varphi_{s+t}$.
- `parabolicFlow_sub_discrete_eq_sum_transport` : l'identité télescopique exacte.
- `parabolic_discrete_shadowing_envelope` : la récurrence $r_{j+1} = r_j + r_j^2$
  suffit à enclore l'orbite et produire le certificat, sous deux marges de pôle
  explicites.
- `padeStepHomography` : la matrice $\begin{psmallmatrix} a^2 & ac \\ -1 & a \end{psmallmatrix}$
  du pas Padé, avec `padeStepHomography_eval` prouvant qu'elle évalue bien le Padé.
- `nonautonomous_pade_telescope` et `nonautonomous_pade_shadowing_bound` : le
  télescopage exact et son majorant pour $a_j$ variable et $c \neq 0$.
:::

## La forme de Möbius : les homographies

### Définition et propriétés magiques

Une **transformation de Möbius** (ou *homographie*) est une fraction rationnelle du
premier degré :

$$
m(z) = \frac{Az + B}{Cz + D}
\qquad (AD - BC \neq 0)
$$

Ces fonctions ont des propriétés remarquables. Les deux qui nous servent :

**1. Elles envoient les cercles sur des cercles** (ou des droites, qui sont des
« cercles de rayon infini »). Jouez avec la démo : quel que soit le réglage, l'image
d'un cercle n'est jamais une patate — c'est toujours un cercle parfait. Quand un
cercle passe par le pôle $z = -D/C$, son image « explose » en une droite.

**2. La composition est un produit de matrices.** Si l'on associe à $m$ la matrice
$\begin{psmallmatrix} A & B \\ C & D \end{psmallmatrix}$, alors composer deux Möbius
revient à multiplier leurs matrices. Composer mille pas = multiplier mille matrices
$2 \times 2$, soit... une seule matrice $2 \times 2$ finale. **La famille est fermée
par composition** : voilà le trésor.

::: info Démonstration — une homographie en action

À gauche le plan source (cercles concentriques et rayons), à droite leur image.
Essayez le préréglage « pas Padé » : c'est la matrice
$\begin{psmallmatrix} a^2 & ac \\ -1 & a \end{psmallmatrix}$ de la section précédente,
avec $a=1$, $c=0{,}3$. Amenez le déterminant à zéro pour voir la dégénérescence :
toute l'image se contracte en un point.

<ClientOnly><MobiusDemo /></ClientOnly>

:::

Comparez avec le jet : composer deux polynômes quadratiques donne un degré 4, puis 8,
16... il faut tronquer en permanence. Composer deux homographies redonne une
homographie, *exactement*, pour toujours.

### Le bloc Möbius du moteur

Le moteur utilise une variante à trois coefficients, **indépendante du pixel** :

$$
m(z) = \frac{Az + Bc}{1 + Dz}
$$

Le numérateur porte le terme $Bc$ (la contribution du paramètre) et le dénominateur
est normalisé à $1$ en $z = 0$. Deux résultats Lean encadrent son usage :

- **Dans le canal Julia** ($c = 0$), la famille est **exactement fermée** :
  la composée de deux blocs $(A_x, D_x)$ et $(A_y, D_y)$ est le bloc
  $(A_y A_x,\; D_x + A_x D_y)$. Une table de blocs peut donc être fusionnée sans
  aucune perte.
- **Pour $c \neq 0$**, la composition reste une fraction du même type mais exige une
  **normalisation** par $1 + D_y B_x c$ — et les coefficients normalisés dépendent
  alors de $c$. Les anciennes récurrences qui ignoraient cette normalisation ne
  peuvent pas être qualifiées de composition exacte : c'est précisément le genre
  d'énoncé négatif qu'une formalisation force à regarder en face.

### Les formes $c^+$ : réinjecter le paramètre

Pour capturer la dépendance en $c$ sans y perdre la fermeture, le moteur enrichit le
bloc en une forme dite $[2/1]\text{-}c^+$ :

$$
m(z, c) = \frac{N_2 z^2 + (A + A'c)\,z + Bc}{1 + (D + D'c)\,z + Fc}
$$

Sept coefficients $(A, B, D, F, A', D', N_2)$, extraits des coefficients du jet bivarié
$a_{ij}$ du bloc. L'extraction est choisie pour **annuler exactement** les premiers
résidus : les quantités $q_{20}, q_{11}, q_{02}, q_{21}$ (et $q_{30}$ pour le $[2/1]$)
sont des zéros *construits*, prouvés nuls en Lean sous les seules hypothèses de
non-nullité nécessaires. La forme $[1/1]\text{-}c^+$ est le cas particulier $N_2 = 0$.

### Le certificat d'erreur : résidu et marge de pôle

Comment borner l'erreur d'un tel approximant $m = N/\text{den}$ contre la vraie
fonction $\Phi$ ? Par une identité exacte d'une ligne :

$$
m - \Phi = \frac{-Q}{\text{den}}
\qquad\text{où}\qquad
Q = \text{den}\cdot\Phi - N \ \text{ est le \textbf{résidu croisé}}
$$

Le plan de bataille complet du moteur s'écrit alors en trois bornes :

1. **Majorer $|Q|$** : $Q$ est une fonction holomorphe de $(z,c)$ dont le jet est nul
   par construction (les $q_{ij} = 0$ !) jusqu'au degré $D$. Son module est donc
   contrôlé par la **queue de Cauchy anisotrope** de la section polydisque : c'est le
   nombre $\text{REST}$.
2. **Minorer $|\text{den}|$** : par l'inégalité triangulaire inversée, sur tout le
   bidisque $|z| \leq x$, $|c| \leq y$,
   $|\text{den}| \geq \text{DEN} = 1 - |F|y - (|D| + |D'|y)\,x$. Tant que
   $\text{DEN} > 0$, le pôle est hors du domaine — c'est la **marge de pôle**.
3. **Conclure** : $|m - \Phi| \leq \text{REST}/\text{DEN}$, à comparer à la tolérance.

Un raffinement joli : la validité sur tout un rayon $[0, r]$ se déduit de la validité
**aux deux extrémités seulement**, parce que la fonction d'écart est convexe
(`cplus_radial_rule`). Tester $x = 0$ et $x = r$ suffit — mais tester *seulement* le
bord $r$ ne suffit pas, autre énoncé négatif que Lean rend impossible à ignorer.

### Le régime périodique : sauter $k$ périodes d'un coup

Dernier bonus de la forme matricielle. Près d'un point périodique (le pixel orbite
dans un cycle), le *même* bloc Möbius $m$ est appliqué en boucle. Trois faits prouvés
permettent de sauter $k$ périodes en temps constant :

- les **points fixes** de $m$ résolvent une simple équation quadratique ;
- avec deux points fixes $\alpha, \beta$, le **birapport** $w = \frac{z - \alpha}{z - \beta}$
  linéarise complètement la dynamique : $m$ devient $w \mapsto \kappa w$, donc $k$
  périodes deviennent $w \mapsto \kappa^k w$ — une seule exponentiation ;
- quand $\alpha$ et $\beta$ **fusionnent** (cas parabolique), la matrice devient un
  bloc de Jordan et $\big(\lambda(I + N)\big)^k = \lambda^k(I + kN)$ pour $N^2 = 0$ :
  le fast-forward survit à la coalescence.

La borne d'erreur pendant ces sauts exige une hypothèse *dynamique* honnête : une
contraction uniforme sur un domaine certifié contenant **les deux** chemins (exact et
approché) — pas seulement la valeur du multiplicateur au point fixe. Sous cette
hypothèse, l'erreur reste bornée par $\varepsilon/(1 - \gamma)$, uniformément en $k$.

### Certifier l'intérieur : pourquoi « dérivée petite » ne suffit pas

Une ancienne optimisation arrêtait un pixel lorsque sa dérivée devenait plus petite
qu'un seuil `epsilon`. Elle est aujourd'hui désactivée, pour une raison précise : le
shader transporte la **dérivée par rapport au paramètre**

$$
d_n=\frac{\partial z_n}{\partial c},
\qquad d_{n+1}=2z_n d_n+1,
$$

alors que le multiplicateur du cycle est la **dérivée dynamique**
$\lambda=(P_c^p)'(z_0)=\prod_k 2z_k$. Ce ne sont pas les mêmes objets. Même connaître
$|\lambda|<1$ prouve seulement que le cycle est localement attractif : cela ne prouve
ni que le pixel courant appartient à son bassin certifié, ni que l'erreur de
l'approximant est restée assez petite. Un seuil fixe peut être un bon **déclencheur**,
jamais un verdict mathématique universel.

Le test utilisé par le moteur repose donc sur une propriété plus simple et plus forte.
Pour le retour exact d'une période $\Phi_p$ et le disque
$D_r=\{\delta z:|\delta z|\le r\}$, il suffit de montrer

$$
\Phi_p(D_r)\subseteq D_r.
$$

Si le pixel arrive avec $|\delta z|<r$, chaque retour suivant reste dans le même disque :
il ne peut pas s'échapper. **Aucune borne sur la dérivée ni contraction uniforme n'est
nécessaire pour ce verdict binaire.** Ces informations restent utiles pour transporter
une erreur pendant un fast-forward ou certifier une dérivée, mais elles ne doivent pas
faire refuser un disque déjà invariant.

Pour le modèle Möbius

$$
m(\delta z)=\frac{A_e\delta z+B\delta c}{D_e\delta z+K},
\qquad K=1+F\delta c,
$$

la marge de pôle et l'image du disque sont bornées par

$$
\mu=|K|-|D_e|r>0,
\qquad
\frac{|A_e|r+|B\delta c|}{\mu}+E<r,
$$

où $E$ majore l'erreur de **valeur** entre le retour exact et le modèle. C'est tout ce
qu'il faut : le certificat de dérivée $V'$ et un taux $\gamma<1$ seraient ici des
hypothèses supplémentaires, donc des causes de refus inutiles.

### Le cas qui cassait au centre d'un minibrot

Au noyau super-attractif, le cycle contient le point critique $Z=0$, donc
$\lambda=0$. C'est précisément le meilleur cas dynamique — mais l'extraction
Möbius $[1/1]$ devient singulière, car elle divise par un coefficient linéaire nul.
Ce refus ne signifiait donc pas « intérieur non prouvé » ; il révélait seulement que
la mauvaise carte rationnelle était utilisée au point critique.

Le repli actuel contourne toute division. Pour chaque pas du cycle, il propage le
majorant scalaire exact

$$
\rho_{k+1}=2|Z_k|\rho_k+\rho_k^2+c_{\max}.
$$

L'inégalité triangulaire donne par récurrence
$|\delta z_k|\le\rho_k$ pour tout pixel de la vue
($|\delta c|\le c_{\max}$). Si, après une période,
$\rho_p\le\rho_0=r$, le disque revient dans lui-même et le pixel est certifié intérieur.
Le théorème Lean `scalar_majorant_return_le` formalise exactement cette implication.

::: info Démonstration — le disque invariant du noyau period‑2

La courbe $M(r)$ est le rayon majoré après un retour complet. Là où elle passe sous la
diagonale $M(r)=r$, un disque invariant existe. Comparez les deux phases du même cycle
$\{0,-1\}$ : commencer au point critique supprime le premier terme linéaire et agrandit
fortement le rayon. Faites aussi tendre la marge $q$ vers $1$ pour voir la borne se
rapprocher de l'optimum **dans la famille des disques radiaux**.

<ClientOnly><PeriodicCertificateDemo /></ClientOnly>

:::

### Conservateur, optimal… dans quel sens ?

Pour une phase fixée et ce majorant scalaire, la limite radiale est la plus grande
solution de $M(r)=r$. La recherche par dichotomie s'en approche, mais le moteur demande
actuellement $M(r)/r\le0{,}95$ à la construction puis conserve une marge runtime à
$0{,}98$ pour absorber sérialisation et arrondis. Le résultat est donc volontairement
**conservateur**. À $c_{\max}=10^{-5}$ sur le period‑2, choisir la phase critique fait
déjà passer le rayon d'environ $0{,}197$ à $0{,}434$, soit un gain $\times2{,}21$, sans
ajouter la moindre opération au shader.

Ce n'est pas l'optimum géométrique du bassin : les valeurs absolues oublient les angles
et toutes les compensations complexes, un disque centré ne suit pas une frontière
anisotrope, et seules la phase détectée et la phase la plus critique sont essayées.
Tester les $p$ phases avec une résolution complète coûterait $O(p^2)$ ; le choix actuel
reste $O(p)$ et, même à $p=512$, représente au plus environ 231 000 pas scalaires lors
du montage, uniquement lorsque le chemin Möbius échoue. Le runtime direct, lui, se
réduit à une lecture de rayon et une comparaison.

Les deux étapes raisonnables pour se rapprocher davantage de l'optimal sont :

1. remplacer les marges fixes par une évaluation par intervalles à arrondi dirigé ; on
   pourrait alors approcher la racine $M(r)=r$ à quelques ulp près sans changer le WGSL ;
2. remplacer le disque scalaire par un disque complexe mobile, une ellipse ou un test
   de Krawczyk/Newton par intervalles autour du cycle ; cela récupère les compensations,
   mais augmente le coût de construction et les métadonnées GPU.

::: warning Frontière de la preuve
Lean prouve l'implication mathématique « majorant invariant $\Rightarrow$ retour dans le
disque ». Il ne prouve pas automatiquement les appels `f64`, `log2` et `exp2` du builder
Rust. Le code garde donc aujourd'hui des marges de 5 % / 2 % et revalide le rayon après
sa conversion en `f32`. Une arithmétique d'intervalles à arrondi dirigé supprimerait ce
dernier écart entre théorème formel et certificat machine.
:::

::: details Théorèmes Lean correspondants (modules `Algebra`, `Bounds`, `CPlus`, `RationalCertificate`, `Periodic`, `PeriodicRuntime`, `CriticalPeriodic`, `Dynamics`)
- `Homography.eval_comp`, `Homography.det_comp` : composition = produit matriciel,
  déterminant multiplicatif (module `NonautonomousPade`).
- `mobius_composition_julia` : la fermeture exacte à $c = 0$.
- `mobius_composition_normalized` : la composition normalisée pour $c \neq 0$.
- `extractK1_q20/q11/q02/q21`, `extractK2_q30` : les zéros construits des
  extractions $[1/1]\text{-}c^+$ et $[2/1]\text{-}c^+$.
- `cplus_error_eq_neg_residual_div` : l'identité $m - \Phi = -Q/\text{den}$.
- `cplusDenLower_le_norm` : la marge de pôle $\text{DEN}$ sur tout le bidisque.
- `cplus_error_norm_le`, `cplus_polydisc_model_scaled_error_le` : le certificat
  $\text{REST}/\text{DEN}$ et sa version de bout en bout via la queue de Cauchy.
- `cplus_radial_rule` : le certificat radial convexe (centre + bord ⟹ tout $[0,r]$).
- `periodic_fixed_point_equation`, `periodic_cross_ratio`, `cross_ratio_iterate` :
  points fixes, birapport, itération $\kappa^k$.
- `jordan_power` : $(\lambda(I+N))^k = \lambda^k(I + kN)$ à la coalescence.
- `periodic_model_error_contraction_on` : la borne $\varepsilon/(1-\gamma)$ sous
  contraction uniforme et confinement des deux orbites.
- `exactPeriodicBlock_mapsTo_disk` : l'erreur de valeur et l'invariance du modèle
  suffisent à rendre le disque invariant pour le retour exact, sans certificat $V'$.
- `scalar_majorant`, `scalar_majorant_return_le` : l'enveloppe pas à pas et son
  corollaire de retour, sans dérivée ni contraction.
- `periodTwo_grouped_disk_invariance` : le repli direct au noyau period‑2, là où
  l'extraction Möbius est dégénérée.
:::

## Les coordonnées de Fatou

Une dernière pièce, plus spécialisée : les **portes de Fatou**, utilisées près des
points paraboliques.

### Redresser la dynamique parabolique

Près d'un point parabolique, la dynamique locale a la forme
$u \mapsto u + au^2 + bu^3 + \cdots$ : une convergence désespérément lente vers $0$
(souvenez-vous du flot en $-1/n$). L'idée de Fatou : changer de lunettes. Le
changement de variable

$$
u = \frac{-1}{a\,t}
$$

envoie le voisinage du point parabolique « à l'infini », et la dynamique devient,
exactement (théorème `fatouTMap_normal_form`) :

$$
t \;\longmapsto\; t + 1 - \frac{q - 1}{t} - (\text{reste rationnel explicite}),
\qquad q = \frac{b}{a^2}
$$

Dans la coordonnée $t$, la dynamique interminable devient... **une translation**
$t \mapsto t + 1$, corrigée par un terme en $1/t$. Avancer de $k$ itérations, c'est
essentiellement calculer $t + k$ : un saut en temps constant, là où l'itération naïve
en aurait demandé des milliers.

Le coefficient $-(q-1)/t$ fixe le signe du terme logarithmique de la coordonnée de
Fatou complète ($+\rho \log t$ avec $\rho = b/a^2 - 1$ sous cette convention) — un
de ces signes qu'on se transmet de forum en forum avec une erreur sur deux, et que la
formalisation cloue définitivement.

### L'erreur d'une porte

Une translation approchée à $\varepsilon_\psi$ près accumule son erreur **linéairement** :
après $k$ pas, l'écart est au plus $k\,\varepsilon_\psi$ (pas d'amplification
exponentielle : une translation n'étire rien). La carte de sortie de la porte, si elle
est $L$-lipschitzienne sur le domaine certifié, convertit cette erreur de coordonnée
en erreur finale $\leq k\,L\,\varepsilon_\psi$. C'est la structure de certificat des
« Fatou gates » du moteur.

::: details Théorèmes Lean correspondants (modules `Fatou`, `Dynamics`)
- `parabolic_substitution` : le changement $u = -1/(at)$ envoie le germe cubique
  sur la carte $t \mapsto t^3/(t^2 - t + q)$.
- `fatouTMap_normal_form` : la forme normale $t + 1 - (q-1)/t - \text{reste}$,
  avec le reste rationnel exact.
- `approximate_translation_error` : l'accumulation linéaire $k\,\varepsilon_\psi$.
- `fatou_gate_exit_error` : l'erreur de sortie $k\,L\,\varepsilon_\psi$.
:::

## La métrique hyperbolique : quand un pas ne peut plus étirer

Les bornes vues jusqu'ici sont *euclidiennes* : on mesure les erreurs avec la distance
ordinaire $\|z - w\|$, et on les transporte en majorant une constante de Lipschitz.
C'est correct, mais pessimiste — chaque pas est traité comme un pire cas qui peut
étirer la distance. Une découverte récente change de règle du jeu : mesurer les
distances avec la **métrique hyperbolique** du disque.

### Le lemme de Schwarz–Pick

Voici l'un des théorèmes les plus élégants de l'analyse complexe. Sur le disque unité,
on ne mesure pas la distance de deux points $z, w$ avec $\|z - w\|$, mais avec la
**distance pseudo-hyperbolique**

$$
\rho(z, w) = \left| \frac{z - w}{1 - \bar{w} z} \right|
$$

Le lemme de Schwarz–Pick affirme alors :

> **Toute** fonction holomorphe qui envoie le disque dans lui-même est *non-expansive*
> pour cette distance : $\rho\big(f(z), f(w)\big) \leq \rho(z, w)$. Elle ne peut
> jamais **augmenter** la distance hyperbolique.

C'est une propriété gratuite, vraie sans aucune hypothèse sur $f$ au-delà de « ça reste
dans le disque ». Or les pas de perturbation du moteur, une fois cadrés dans le bon
disque certifié, sont exactement de ce type : des applications holomorphes d'un disque
mobile vers le disque mobile suivant. Dans la métrique hyperbolique, **ils ne peuvent
pas amplifier l'erreur** — la constante de Lipschitz pessimiste disparaît.

### Le télescopage devient une simple addition

Il reste les défauts locaux : à chaque pas, le Padé n'est pas exactement le vrai pas,
il commet une petite erreur $\varepsilon_j$. La question du transport se repose — mais
la réponse est maintenant lumineuse. Comme le vrai pas ne dilate rien, l'erreur totale
après $n$ blocs se compose par la **loi d'addition hyperbolique** (la même que
l'addition des vitesses en relativité restreinte) :

$$
u \oplus v = \frac{u + v}{1 + uv}
\qquad\text{caractérisée par}\qquad
\operatorname{artanh}(u \oplus v) = \operatorname{artanh}(u) + \operatorname{artanh}(v)
$$

Autrement dit : passez tout en coordonnée $\operatorname{artanh}$, et le budget d'erreur
hyperbolique n'est **qu'une somme** $\sum_j \operatorname{artanh}(\varepsilon_j)$. Pas de
produit de constantes de Lipschitz qui explose, pas de facteur d'amplification : une
addition, bornée tant qu'elle reste sous $1$. C'est le gain de **survie** mesuré sur les
vues profondes de la cascade — un bloc qui « mourait » à quelques centaines d'itérations
en euclidien reste vivant bien plus longtemps en hyperbolique.

::: tip Pourquoi « de survie » et pas « de vitesse » ?
Les mesures montrent que la direction hyperbolique n'accélère pas les blocs déjà
valides : elle **prolonge leur durée de vie**. Un certificat qui expirait par
accumulation d'erreur euclidienne tient désormais la distance, parce que la vraie
dynamique refuse d'étirer. Le rayon d'un bloc n'augmente pas ; c'est sa longévité qui
change.
:::

### Les disques mobiles

Un ingrédient technique rend tout cela calculable : le moteur ne travaille pas dans un
disque fixe mais suit une **suite de disques** $\mathbb{D}_0, \mathbb{D}_1, \ldots$ qui
se déplacent avec l'orbite. Chaque homographie envoie *exactement* un disque sur le
suivant — image d'un disque par une Möbius = un disque, jamais une « patate »
(rappelez-vous la démo Möbius). Le moteur calcule donc le centre et le rayon de l'image
par des formules fermées, et vérifie que le pôle reste dehors par une **marge de pôle**
sur le disque, exactement comme la marge $\text{DEN}$ mais adaptée à un disque décentré.

::: details Théorèmes Lean correspondants (modules `MovingDisks`, `MobiusDisk`, `SchwarzPick`, `HyperbolicTelescope`, `HyperbolicPade`)
- `Homography.mobius_image_disk_exact` : l'image d'un disque par une homographie est
  exactement le disque de centre/rayon calculés — pas une enveloppe, une égalité.
- `Homography.mobius_disk_pole_margin`, `Homography.diskDelta_pos_iff_no_pole_closedBall` :
  la marge de pôle sur un disque décentré est positive **ssi** le pôle est hors du disque.
- `DiskFrame.schwarzPick`, `DiskFrame.norm_toUnitHomography_eval_lt_one` : le lemme de
  Schwarz–Pick transporté sur un disque quelconque via son homographie de normalisation.
- `pseudoAdd`, `artanh_pseudoAdd` : la loi d'addition hyperbolique et sa linéarisation
  par $\operatorname{artanh}$.
- `DiskFrame.pseudoDist_strong_triangle`, `hyperbolicBudget_eq_tanh_sum_artanh` : la loi
  triangulaire forte et le budget = somme des $\operatorname{artanh}$ des défauts.
- `nonautonomous_pade_hyperbolic_shadowing_bound` : le certificat de bout en bout d'un
  bloc Padé, non-expansif, avec son budget hyperbolique.
- `DiskFrame.norm_sub_le_hyperbolicBudget` : la reconversion du budget hyperbolique en
  erreur euclidienne finale, pour comparer à la tolérance de rendu.
:::

## Propager la dérivée : le tier « matrix-C1 »

Jusqu'ici, un approximant garantit la **valeur** $\delta z$ du pixel. Mais le rendu a
aussi besoin de la **dérivée** $\partial_z \delta z$ — c'est elle qui donne l'estimation
de distance (distance estimation), l'anti-aliasing analytique et la coloration lisse.
Le tier **matrix-C1** certifie la dérivée en même temps que la valeur, sans la
recalculer par différences finies.

### La dérivée d'une homographie est presque gratuite

L'astuce tient à une identité classique. Pour une homographie $m(z) = \frac{Az+B}{Cz+D}$,

$$
m'(z) = \frac{AD - BC}{(Cz + D)^2} = \frac{\det m}{\text{den}(z)^2}
$$

La dérivée est le **déterminant** (déjà connu, il se transporte multiplicativement le
long du produit de matrices) divisé par le **carré du dénominateur** (déjà minoré par la
marge de pôle $\text{DEN}$). Les deux ingrédients dont on a besoin sont donc *déjà*
calculés pour la valeur. L'erreur sur la dérivée se décompose exactement en une
perturbation du déterminant plus un terme en $\text{den}^{-2}$, et se borne avec les
mêmes certificats.

### Le jet en $c$ des matrices de Padé

Il y a une subtilité : la matrice de Padé de tout un bloc dépend du paramètre $c$ de
façon polynomiale. Le tier matrix-C1 garde les **coefficients d'ordre 0 et 1 en $c$**
de ce polynôme matriciel — une matrice constante $M_0$ et une matrice linéaire $M_1$ —
et certifie que la **queue $c^2 + \cdots$ omise** reste sous contrôle par une récurrence
scalaire calculable. Cette troncature préserve deux choses prouvées en Lean : la marge
de pôle (le pôle ne rentre pas dans le disque à cause de la queue) et la borne de
dérivée. Le résultat est une **image de disque garantie**, la nominale gonflée
exactement de l'erreur de valeur déjà certifiée.

::: details Théorèmes Lean correspondants (modules `MatrixC1`, `MatrixC1Deriv`, `MatrixC1Disk`)
- `MatrixC1.eval_comp_with_quadratic_remainder`, `padeMatrixC1_tail_le` : la composition
  des jets d'ordre 1 en $c$, avec le reste quadratique $c^2+\cdots$ majoré par une
  récurrence scalaire.
- `Homography.hasDerivAt_eval`, `Homography.deriv_eval_sub_le` : la dérivée exacte
  $\det/\text{den}^2$ et sa borne d'erreur (perturbation du déterminant + terme
  $\text{den}^{-2}$).
- `MatrixC1.deriv_error_le_uniform`, `MatrixC1.norm_deriv_exact_le_uniform` : la borne
  uniforme de dérivée sur tout le disque du bloc tronqué.
- `Homography.exact_diskPoleMargin_of_matrixTail`, `MatrixC1.mapsTo_closedBall_uniform` :
  la queue préserve l'absence de pôle, et l'application exacte reste dans le disque image
  gonflé de l'erreur certifiée.
- `hasDerivAt_padeSeed`, `norm_deriv_seed_sub_step_le` : la version « un pas » —
  la dérivée du Padé germe contre celle du vrai pas.
:::

## Changer d'échelle sans perdre le fil : rebasing et gauges projectives

Deux mécanismes récents permettent au moteur de **redémarrer** le calcul en cours de
route sans casser aucun certificat — indispensable pour les zooms extrêmes et pour les
sauts renormalisés de la section suivante.

### Le rebasing de Zhuoran

Un état du moteur représente sa valeur physique comme `référence[i] + δz`. Quand $\delta z$
devient trop grand par rapport à la référence (l'orbite s'éloigne), la précision `f32`
menace. Le **rebasing** (attribué à Zhuoran) résout cela élégamment : on garde
l'itération totale fixe, on verse *toute* la valeur physique dans $\delta z$, et on
remet l'indice de référence à zéro (où l'orbite vaut $0$). Lean prouve que cette
opération **préserve exactement** la valeur physique — *et* sa dérivée première, *et* sa
dérivée seconde, *et* le test de divergence. Un rebase est invisible pour tous les
certificats : c'est un changement de coordonnées, pas d'état.

### Les gauges projectives s'annulent

Pour les sauts qui **changent d'échelle** (comme les blocs Feigenbaum ci-dessous), le
moteur stocke chaque bloc encadré par des changements d'échelle inversibles
$S_j$ : le bloc réel est $S_{j+1} \circ M_j \circ S_j^{-1}$. Quand on enchaîne deux blocs,
les gauges consécutives $S_{j+1}^{-1} \circ S_{j+1}$ **se télescopent** — il ne subsiste
qu'un scalaire projectif sans importance (une homographie est définie à un facteur
près). Lean le prouve pour deux blocs et pour une chaîne finie quelconque, via
l'adjuguée (l'inverse matriciel). La conséquence : on peut composer des blocs
d'échelles différentes sans accumuler d'erreur de conversion.

::: details Théorèmes Lean correspondants (modules `Rebasing`, `PhaseAwareTransport`, `RenormalizedTransport`)
- `PerturbationState.rebase_preserves_value`, `..._derivative`, `..._secondDerivative`,
  `..._bailout` : le rebase préserve valeur, dérivées et test de divergence.
- `PerturbationState.rebase_certifiedTransition`, `CertifiedTransition.then_rebase` : un
  rebase se compose avec une transition certifiée sans perdre le certificat.
- `PerturbationState.rebase_guard_decreases_delta` : le rebase diminue bien $|\delta z|$
  (c'est là son but).
- `InflatedTransport.merge`, `Homography.diskDelta_pos_of_inflate` : le transport
  conscient de la phase, gonflé d'un $\varepsilon$, garde une marge de pôle positive.
- `Homography.norm_sub_adjugate_eval_le_of_renormalized_error`,
  `phaseAwareBudget_projective_normalization` : les gauges projectives consécutives
  s'annulent, ne laissant qu'un scalaire inoffensif.
:::

## L'autosimilarité de Feigenbaum : sauter $2^n$ itérations d'un coup

Voici la découverte la plus ambitieuse — et la plus belle. Elle exploite l'une des
symétries les plus profondes des mathématiques : l'**universalité de Feigenbaum**.

### Le miracle de l'autosimilarité

Le long de l'axe réel, l'ensemble de Mandelbrot subit une **cascade de doublements de
période** : un cycle de période 1 devient 2, puis 4, 8, 16… en des points $c_n$ qui
s'accumulent en un point limite $c_\infty = -1{,}401155189\ldots$ (le point de
Myrberg–Feigenbaum). Mitchell Feigenbaum a découvert dans les années 1970 que cette
cascade est **universelle** : les points de bifurcation se resserrent d'un facteur
constant

$$
\delta = 4{,}669201609\ldots
$$

et — c'est le point crucial pour nous — la dynamique elle-même se **répète à l'échelle**.
Si l'on zoome au bon endroit d'un facteur

$$
\alpha = -2{,}502907875\ldots
$$

et qu'on itère **deux fois**, on retombe sur la *même* fonction. Autrement dit :
$2^n$ itérations à l'échelle $c_\infty$ ressemblent, une fois recentrées et remises à
l'échelle, à *une seule copie* d'une fonction limite universelle $h_*$, la même pour
tous les $n$.

Pour le moteur, la conséquence est vertigineuse : au lieu d'exécuter $2^n$ pas de la
perturbation (des milliers d'itérations dans la cascade profonde), il suffit d'appliquer
**une seule évaluation** de cette fonction universelle, correctement remise à l'échelle.
Un saut de longueur $2^n$ en temps constant.

### L'opérateur de renormalisation et son point fixe

Formalisons. Pour une fonction paire $h$, l'**opérateur de renormalisation** est

$$
R(h)(z) = \frac{1}{\alpha}\, h\big(h(\alpha z)\big),
\qquad \alpha = h(h(0))^{-1}\ \text{(condition de jauge)}
$$

La fonction universelle $h_*$ est le **point fixe** de cet opérateur : $R(h_*) = h_*$.
Le hic : $R$ possède une **direction instable** (de valeur propre $\delta \approx 4{,}67$),
donc on ne peut pas trouver $h_*$ en itérant naïvement $R$ — ça diverge. La parade est
la méthode de Newton : on résout $\Phi(\alpha, h) = 0$ par une carte de Newton
$T(x) = x - A\,\Phi(x)$ (avec $A$ une inverse approchée), qui, *elle*, est contractante.

### Une preuve à radii, à la Newton–Kantorovitch

Le cœur du certificat est un théorème de **rayons** (radii), du genre
Newton–Kantorovitch. On fournit un centre numérique $\bar x$, un rayon $r$, et deux
nombres :

$$
Y \geq \|T(\bar x) - \bar x\| \quad (\text{le défaut au centre}),
\qquad
Z \geq \operatorname{Lip}(T)\ \text{sur la boule} \quad (\text{la contraction})
$$

Si $Y + Zr \leq r$ et $Z < 1$, alors — par le théorème du point fixe de Banach — il
existe un **unique** zéro $x_*$ dans la boule, avec la borne a posteriori

$$
\|\bar x - x_*\| \leq \frac{Y}{1 - Z}
$$

Lean prouve **tout le noyau logique** de ce schéma sans aucun `sorry` : l'invariance de
la boule, la contraction, l'existence-unicité, la borne $Y/(1-Z)$, et l'équivalence
entre « zéro de Newton » et « point fixe de Feigenbaum–Cvitanović ». Pour le cas
classique (doublement, $m = 2$), les bornes analytiques reproduites (d'après
[Breden, Gonzalez & Mireles James, 2024](https://arxiv.org/abs/2409.20457)) donnent

$$
Y \approx 5{,}20 \times 10^{-18}, \quad Z \approx 0{,}368,
\quad\Rightarrow\quad
\frac{Y}{1-Z} \approx 8{,}23 \times 10^{-18}
$$

un point fixe universel isolé à moins de $10^{-17}$ d'un polynôme de degré 42. Et pour
éliminer le moindre flottant de l'étape finale, Lean rejoue l'agrégation avec des
**enveloppes purement rationnelles** ($Y_q = 520279/10^{23}$, etc.), vérifiées par
calcul exact.

### Du point fixe universel au bloc concret : les retours finis

Une preuve d'existence du point fixe universel ne suffit pas à activer un saut. Il faut
certifier qu'un **retour quadratique concret** — l'itéré $P_c^{[2^n]}$ recentré — est
bien proche du modèle universel stocké $H$, sur un disque de validité. Le module
`FeigenbaumFiniteReturn` construit ce pont fini :

$$
s_n = P_c^{[2^n]}(0)\ \text{(l'échelle critique)},
\qquad
G_n(z) = \frac{P_c^{[2^n]}(s_n z)}{s_n},
\qquad
D_n(z) = G_n(z) - H(z)
$$

Le certificat majore la **différence** $D_n$ (et non $G_n$ et $H$ séparément) sur une
grille adaptative de cellules, par un développement de Taylor d'ordre 2 *conservatif*

$$
|D_n(x)| \leq |D_n(x_i)| + |D_n'(x_i)|\,h + M_2\,h^2
$$

où $M_2$ majore $\sup|D_n''|$ sur la cellule, via un pont valeur-moyenne emprunté à
Mathlib. Un quadtree ne subdivise que les cellules qui dépassent le budget. Résultat
mesuré (arrondis dirigés inclus, `roundoff_omitted = false`) : le plancher d'erreur
uniforme tombe de $1{,}06 \times 10^{-2}$ (ordre 1) à $5{,}03 \times 10^{-5}$ (ordre 2)
à budget égal, en ~13 000 cellules. Le résidu restant est *entièrement* le terme de
courbure $M_2 h^2$ — donc il descend en $h^2$ : chaque niveau de subdivision divise
l'erreur par 4.

### Le verdict terrain : 2 à 7× un bloc de Padé

Un saut renormalisé vaut-il mieux qu'un bloc de Padé ? La mesure (census f64 des sauts
disponibles sur la cascade à $c_\infty$) dit oui, précisément là où le Padé s'éteint —
près du point critique, où la garde « near-critical » désactive les blocs du portefeuille :

| Échelle de vue | Saut renorm. moyen | Saut Padé moyen | Ratio | Qualification |
|---:|---:|---:|---:|---:|
| $10^{-6}$ | 140,6 | 20,0 | **7,0×** | 74,8 % |
| $10^{-9}$ | 2048 | 421 | **4,9×** | 100 % |
| $10^{-12}$ | 2048 | 1025 | **2,0×** | 100 % |

Le tier renormalisé est intégré comme **candidat supplémentaire** du portefeuille (jamais
un remplacement) : sans jeton noyau accepté, la sélection retombe exactement sur le
Padé/jet existant. Un prototype de shader est même livré (éteint par défaut,
`ENABLE_RENORM = false`), avec une simplification remarquable : **aucune donnée par-bloc
à sérialiser**. La jauge $s_n$ est déjà l'orbite de référence à l'indice $2^n$, et le
modèle universel $H$ est une constante de shader (22 coefficients de Tchebychev). Il ne
reste qu'un drapeau d'activation.

### La dernière marche : un flottant devient une preuve noyau

Comment être *sûr* qu'une cellule du certificat, découverte en flottant par le builder
Rust, est vraiment correcte ? Le module `FeigenbaumRationalReplay` franchit cette marche
conceptuelle avec un **pilote** : sur une cellule dyadique concrète ($x_0 = \frac{1}{32}
+ \frac{i}{32}$, skip $= 4$), Lean prouve

$$
\operatorname{dist}\big(\text{normalizedReturn}\ c\ 4\ x_0,\ H(x_0)\big) \leq 10^{-6}
$$

où `normalizedReturn` est la **vraie** définition du retour renormalisé — pas un modèle
numérique. Toute la chaîne (orbite critique de profondeur 4, jauge, retour, somme de
Tchebychev) est rejouée en **arithmétique dyadique exacte** sur des entiers `Int`/`Nat`,
et les deux seules comparaisons sont des `decide` du noyau sur des normes rationnelles —
sans racine, sans flottant, sur des entiers d'environ 1000 bits. Les constantes sont
générées par le builder lui-même, donc l'export dyadique et l'entrée du checker sont
littéralement le même objet.

C'est un pilote (une cellule) : le certificat runtime complet exige encore de rejouer
toutes les cellules du recouvrement. Mais la trajectoire critique — *« un nombre flottant
découvert peut-il devenir une preuve du noyau Lean ? »* — est désormais démontrée de bout
en bout.

::: tip Ce que la formalisation a forcé à regarder en face
Comme partout ailleurs sur cette page, formaliser Feigenbaum a produit des énoncés
*honnêtes* : le point fixe universel seul **ne suffit pas** à activer un saut (il faut
reconnaître un bloc concret) ; le tier est **inactif par construction** tant que le
certificat noyau complet n'est pas produit (le type du jeton vérifié est opaque, aucun
chemin ne promeut un flottant en preuve) ; et la fenêtre en paramètre $c$ se contracte
d'un facteur $\approx 8{,}5$ par niveau de la cascade, ce qui cantonne honnêtement le
tier aux vues profondes.
:::

::: details Théorèmes Lean correspondants (modules `FeigenbaumRenormalization`, `FeigenbaumFiniteReturn`, `FeigenbaumRationalReplay`, `VerifiedRationalBounds`)
- `RadiiCertificate.exists_unique_fixedPoint`, `exists_unique_zero` : le théorème de
  rayons (Newton–Kantorovitch), unicité + borne $Y/(1-Z)$, via Banach.
- `isFixedPt_newtonMap_iff`, `phase_and_residual_iff_fixedPoint` : zéro de Newton ⟺
  point fixe de Feigenbaum–Cvitanović, sous injectivité de $A$.
- `normalizedReturn_zero`, `quadratic_affine_conjugacy`, `normalizedReturn_eq_conjugate` :
  la jauge critique $s_n$, $G_n(0) = 1$, la conjugaison exacte au format $1 - \mu z^2$.
- `FiniteGridWitness.uniform_error`, `difference_cell_bound`,
  `DifferenceGridWitness.uniform_error` : le passage bornes-par-cellule ⟶ borne uniforme,
  et le Taylor d'ordre 2 conservatif de la différence $D_n$.
- `Accepted.sound` : la sémantique de repli — sans certificat accepté, le portefeuille
  existant est choisi tel quel.
- `AnalyticComponents.toRadiiCertificate` : l'agrégation des cinq composantes $Y/Z$ en
  un certificat de rayons final (module `VerifiedRationalBounds`).
- `pilot_cell_inclusion` : le rejeu noyau d'une cellule concrète en arithmétique dyadique
  exacte (`decide`, 0 `sorry`).
:::

## Récapitulatif

Le fil complet, de la théorie au pixel :

| Étape | Mathématique | Garantie Lean |
|---|---|---|
| Zoom profond | Perturbation $\delta z' = 2Z\delta z + \delta z^2 + \delta c$ | Enveloppe scalaire de l'orbite (`scalar_majorant`) |
| Table de blocs | Jets bivariés en $(z, c)$, degré total | Tronquer à chaque merge = tronquer à la fin (`iterateTruncated_eq_totalTrunc_iterate`) |
| Approximant compact | Padé / Möbius-$c^+$ extrait du jet | Zéros construits $q_{ij} = 0$ exacts (`extractK1_*`, `extractK2_*`) |
| Erreur de l'approximant | Résidu $Q$, identité $m - \Phi = -Q/\text{den}$ | Exacte sur tout corps (`cplus_error_eq_neg_residual_div`) |
| Borne du résidu | Queue de Cauchy anisotrope sur le polydisque | Forme fermée exacte, monotone, sûre (`anisotropicTailClosed`) |
| Marge de pôle | $\text{DEN} > 0$ sur le bidisque | Inégalité triangulaire inversée (`cplusDenLower_le_norm`) |
| Choix Padé/jet | Sélecteur par bornes certifiées | Jamais pire que le jet (`choosePadeOrJet_error_le_min`) |
| Zones paraboliques | Superconvergence, shadowing, Fatou | Télescopage exact + majorants (`nonautonomous_pade_shadowing_bound`) |
| Cycles périodiques | Birapport, $\kappa^k$, disque invariant et repli critique | Fast-forward + verdict intérieur (`periodic_model_error_contraction_on`, `scalar_majorant_return_le`) |
| Survie des blocs | Métrique hyperbolique, Schwarz–Pick | Pas non-expansifs, budget = somme (`nonautonomous_pade_hyperbolic_shadowing_bound`) |
| Dérivée (DE, AA) | Jet en $c$ des matrices, $\det/\text{den}^2$ | Erreur de dérivée bornée (`MatrixC1.norm_deriv_exact_le_uniform`) |
| Changements d'échelle | Rebasing de Zhuoran, gauges projectives | Valeur+dérivées préservées (`rebase_preserves_derivative`) |
| Sauts $2^n$ | Renormalisation de Feigenbaum, retours finis | Point fixe universel + rejeu noyau (`RadiiCertificate.exists_unique_zero`, `pilot_cell_inclusion`) |

Et la morale de l'exercice : formaliser n'a pas seulement *confirmé* les formules.
Cela a forcé à expliciter chaque hypothèse (marges de pôle, confinement d'orbite,
normalisation de la composition en $c$, jauge critique $s_n$ non nulle), a produit des
énoncés *négatifs* précieux (ce qui n'est **pas** vrai sans normalisation, ce que le
multiplicateur seul ne garantit **pas**, pourquoi un point fixe universel **ne suffit
pas** à activer un saut), et a remplacé des vérifications numériques « à $2^{-52}$ près »
par des égalités exactes valables sur n'importe quel corps — jusqu'à faire d'un nombre
flottant découvert par un builder une véritable **preuve du noyau Lean**, rejouée en
arithmétique dyadique exacte. Des identités algébriques d'une ligne à l'universalité de
Feigenbaum, la même exigence : rien n'est vrai tant que la machine ne l'a pas vérifié.
