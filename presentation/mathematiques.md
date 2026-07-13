<script setup>
import TaylorApproxDemo from '../src/components/TaylorApproxDemo.vue'
import PerturbationOrbitDemo from '../src/components/PerturbationOrbitDemo.vue'
import GeometricTailDemo from '../src/components/GeometricTailDemo.vue'
import PolydiscDemo from '../src/components/PolydiscDemo.vue'
import PadeVsJetDemo from '../src/components/PadeVsJetDemo.vue'
import MobiusDemo from '../src/components/MobiusDemo.vue'
import ParabolicShadowingDemo from '../src/components/ParabolicShadowingDemo.vue'
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
du projet contient **15 modules** et plus de 3 400 lignes de preuves, compilées avec
Lean 4.31.0 / Mathlib 4.31.0, **sans aucun `sorry`** (le mot-clé qui permet d'admettre
un résultat sans le prouver).

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
| `Periodic` | Points fixes, multiplicateur, Jordan | Birapport |
| `Fatou`, `Dynamics` | Forme normale parabolique, contraction | Coordonnées de Fatou |

Dans la suite, chaque section indique en encadré les théorèmes Lean correspondants.

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

::: details Théorèmes Lean correspondants (modules `Algebra`, `CPlus`, `RationalCertificate`, `Periodic`, `Dynamics`)
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
| Cycles périodiques | Birapport, $\kappa^k$, Jordan | Fast-forward certifié (`periodic_model_error_contraction_on`) |

Et la morale de l'exercice : formaliser n'a pas seulement *confirmé* les formules.
Cela a forcé à expliciter chaque hypothèse (marges de pôle, confinement d'orbite,
normalisation de la composition en $c$), a produit des énoncés *négatifs* précieux
(ce qui n'est **pas** vrai sans normalisation, ce que le multiplicateur seul ne
garantit **pas**), et a remplacé des vérifications numériques « à $2^{-52}$ près »
par des égalités exactes, valables sur n'importe quel corps.
