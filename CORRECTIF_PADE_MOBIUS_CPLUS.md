# Correctif mathématique et conséquences attendues des formes d'approximation

## Statut et portée

Ce document corrige `COMPLETE_NOTES_pade_to_mobius_cplus.md` sans le remplacer.
Il sépare quatre niveaux qui étaient parfois confondus dans la note consolidée :

1. les identités algébriques exactes ;
2. les développements asymptotiques ;
3. les certificats valables sur un domaine entier ;
4. les résultats numériques observés sur un ensemble fini de références.

Les conclusions principales sont les suivantes.

- Les extractions [1/1]-c⁺ et [2/1]-c⁺ dérivées des jets sont algébriquement
  correctes.
- La clôture à trois coefficients du Möbius « simple » est exacte seulement
  pour `c = 0`. Pour `c != 0`, elle tronque nécessairement le canal `c`.
- Le coefficient dominant de superconvergence donne une loi asymptotique, pas
  une égalité exacte pour un bloc général.
- Une comparaison runtime unique `|z| < r` demande que l'ensemble certifié
  contienne tout l'intervalle radial `[0,r]`. Le solveur actuel certifie un
  point, mais ne vérifie pas explicitement l'admissibilité à `x = 0`.
- Le régime périodique fermé par puissance de matrice doit employer la forme
  [1/1]-c⁺. La forme [2/1]-c⁺ n'est pas une transformation de Möbius.
- Les dérivées correctes et les termes `F` du régime périodique sont déjà
  présents dans le code actuel, bien que la note consolidée soit obsolète sur
  ces points.

Dans ce document, `a = 2 Z_n`, `z` est la perturbation courante et `c` la
perturbation du paramètre. La carte exacte à un pas est

```text
f(z,c) = a z + z² + c.
```

---

## 1. Padé [1/1] à un pas

La forme

```text
m(z,c) = (a z + c) / (1 - z/a)
```

vérifie exactement

```text
m(z,c) - f(z,c) = z(z² + c)/(a-z)
                 = z³/(a-z) + cz/(a-z).
```

Pour `c = 0`, on a aussi les deux normalisations exactes

```text
|m-f|/|m| = |z/a|²,
(m-f)/f   = z²/(a²-z²).
```

Il en résulte deux rayons différents, selon la définition de l'erreur :

```text
|m-f|/|m| <= epsilon : |z| <= |a| sqrt(epsilon),
|m-f|/|f| <= epsilon : |z| <= |a| sqrt(epsilon/(1+epsilon)).
```

La note doit donc préciser la normalisation employée chaque fois qu'elle parle
de « relative error ». Pour les constantes d'un théorème relatif à la vraie
carte `f`, le second rayon est le rayon exact à utiliser.

Le terme `cz/(a-z)` est absent de l'affine. Il explique la dégradation de la
forme [1/1] simple près d'un passage où `|a|` est petit.

Une comparaison directe avec le jet affine est maintenant formalisée. Dans le
canal Julia,

```text
E_Pade   = |z|^3/|a-z|,
E_affine = |z|^2.
```

Par conséquent `E_Pade <= E_affine` exactement sur la région
`|z| <= |a-z|`; l'inégalité est stricte pour `z != 0` à l'intérieur. La
condition radiale plus simple `2|z| <= |a|` est une condition suffisante
formellement prouvée.

Le résultat se généralise structurellement à `[L/1]`. Si
`f(z)=sum a_n z^n` et si le dénominateur est `1-lambda z`, le coefficient de
degré `n+1` du résidu croisé est exactement

```text
a_(n+1) - lambda a_n.
```

Padé absorbe donc la partie géométrique de la queue ; son erreur est gouvernée
par le défaut de cette récurrence, divisé par la marge du dénominateur. Une
queue exactement géométrique donne une représentation exacte. Enfin, un
sélecteur Padé/jet piloté par leurs deux certificats est prouvé avoir la borne
`min(E_Pade,E_jet)` : le portefeuille ne peut jamais dégrader le certificat du
jet, même si aucune dominance universelle de Padé seul n'est possible.

Cette explication est maintenant complétée par un théorème de
superconvergence parabolique. Pour le flot `ż=z²`, la carte de temps `t` est

```text
Phi_t(z) = z/(1-tz),
```

et son jet d'ordre `K` possède le reste exact

```text
Phi_t(z)-J_K(t,z) = t^K z^(K+1)/(1-tz).
```

Le Padé `[1/1]` de numérateur `z` est exactement `Phi_t`; hors de l'origine et
du pôle, son erreur est nulle tandis que celle de tout jet fixé est strictement
positive. La loi de semi-groupe `Phi_s∘Phi_t=Phi_(s+t)` est également prouvée.

Pour un bloc général, les écarts à ce modèle sont mesurés par les mineurs de
Hankel

```text
H1 = a10*a30 - a20²,
H2 = a20*a40 - a30².
```

Lean prouve `q30=H1/a10` et `q40=H2/a20`, ainsi que l'équivalence entre
l'annulation de tous les mineurs consécutifs et une récurrence géométrique
unique lorsque les coefficients ne s'annulent pas. Quantitativement, si le
défaut relatif de récurrence vaut `delta` et la perte de marge au pôle `mu`, le
majorant Padé est le majorant du jet multiplié par `delta/(1-mu)`; il est donc
strictement meilleur pour `delta < 1-mu`.

Enfin, le raccord avec la dynamique discrète n'est plus seulement heuristique.
Sur un disque invariant `|z|≤r<1`, l'erreur locale exacte entre `z+z²` et le
flot vaut au plus `r³/(1-r)`, la carte de flot est
`1/(1-r)²`-Lipschitz, et après `n` pas :

```text
dist(f^n(z), Phi_n(z))
  <= (r³/(1-r)) * sum_(k<n) (1/(1-r)²)^k.
```

Cette borne est conservative mais complète : elle exige explicitement que les
deux chemins restent dans le disque et évitent le pôle.

Une borne plus serrée est désormais également formalisée. En posant
`x_j=f^j(z)` et `m=n-j-1`, le télescopage par la loi de semi-groupe donne
l'identité exacte

```text
Phi_n(z) - f^n(z)
  = sum_(j<n) x_j³ /
      ((1-(n-j)x_j) * (1-(n-j-1)(x_j+x_j²))).
```

Si `|x_j|<=r_j`, Lean en déduit le majorant terme à terme

```text
sum_(j<n) r_j³ /
  ((1-(n-j)r_j) * (1-(n-j-1)(r_j+r_j²))),
```

sous positivité des deux marges. Il n'y a plus de puissance d'une constante
de Lipschitz globale. La récurrence scalaire
`r_(j+1)=r_j+r_j²`, initialisée par `|z|<=r_0`, est elle-même prouvée enclore
toute l'orbite complexe. Cette dernière forme est calculable au build et ne
laisserait au runtime qu'un test de rayon et l'application rationnelle ; elle
n'est toutefois pas encore raccordée aux blocs non autonomes et au canal `c`
du renderer.

Ce raccord est maintenant formalisé en arithmétique exacte. Pour
`F_j(z,c)=a_j z+z²+c`, le Padé élémentaire a pour matrice homogène

```text
P_j(c) = [[a_j², a_j c], [-1, a_j]],
```

et conserve le défaut exact `z(z²+c)/(a_j-z)`. Si `T_(j+1)` est le produit des
matrices restantes, le défaut transporté vaut exactement

```text
det(T_(j+1)) * z_j(z_j²+c)/(a_j-z_j)
------------------------------------------------------------
den_T(P_j(z_j,c)) * den_T(F_j(z_j,c)).
```

La somme de ces termes est l'écart exact entre le produit Padé complet et le
bloc discret non autonome. Lean construit canoniquement les matrices de queue
et majore la somme à partir de
`r_(j+1)=|a_j|r_j+r_j²+y`, avec `y>=|c|`. Les marges des deux dénominateurs
sont calculées depuis les quatre entrées de chaque matrice et les rayons des
sorties Padé et exacte. Il n'y a donc plus ni coefficient linéaire constant,
ni suppression du canal `c`, ni facteur de Lipschitz global.

La compression de ce produit à l'ordre un en `c` est également formalisée.
En écrivant une matrice `M(c)=M_0+cM_1`, la composition vérifie exactement

```text
(M_0+cM_1)(N_0+cN_1)
  = M_0N_0 + c(M_0N_1+M_1N_0) + c²M_1N_1.
```

Les deux premiers termes fournissent les huit coefficients complexes de
`matrix-c1`. Une récurrence scalaire certifiée transporte la queue précédente
et ajoute `|c|² ||M_1N_1||`, ce qui majore tout le reste `c²+...` du produit
complet. Si cette queue vaut au plus `E`, alors sur `|z|<=R` elle perturbe le
numérateur et le dénominateur d'au plus `E(R+1)`. Une marge uniforme, calculée
au build pour tout `|c|<=y`, est

```text
|D_0|-y|D_1| - (|C_0|+y|C_1|)R - E(R+1).
```

Le certificat final additionne explicitement cette erreur rationnelle à
l'erreur Padé contre le bloc discret.

---

## 2. Composition Möbius : clôture exacte et limite du cas `c != 0`

Pour

```text
m_x(z) = (A_x z + B_x c)/(1 + D_x z),
m_y(z) = (A_y z + B_y c)/(1 + D_y z),
```

la matrice associée, à `c` fixé, est

```text
M_x = [[A_x, B_x c], [D_x, 1]].
```

Le produit exact est

```text
M_y M_x = [[A_y A_x + B_y c D_x, (A_y B_x + B_y)c],
           [D_y A_x + D_x,           1 + D_y B_x c]].
```

Après normalisation par l'entrée en bas à droite, les coefficients exacts sont

```text
A_z = (A_y A_x + B_y c D_x)/(1 + D_y B_x c),
B_z = (A_y B_x + B_y)/(1 + D_y B_x c),
D_z = (D_x + A_x D_y)/(1 + D_y B_x c).
```

Conséquence :

- pour `c = 0`, les récurrences usuelles sont exactes et la table est fermée ;
- pour `c != 0`, une table dont les coefficients sont indépendants du pixel ne
  peut pas conserver cette composition exacte dans seulement `(A,B,D)` ;
- les récurrences sans dénominateur de normalisation sont seulement le terme
  d'ordre zéro en `c`.

La multiplication exacte des degrés des applications rationnelles reste
correcte. Ce qui échoue n'est pas la clôture de l'ensemble de toutes les
transformations de Möbius à `c` fixé, mais la clôture de la paramétrisation
restreinte avec coefficients préconstruits indépendants de `c`.

---

## 3. Composition au premier ordre dans le canal `c`

Écrivons

```text
m(z,c) = ((A+Ec)z + Bc)/((D+Hc)z + 1+Gc),
```

soit la matrice

```text
M = [[A+Ec, Bc], [D+Hc, 1+Gc]].
```

En composant `y` après `x` et en supprimant seulement les termes `O(c²)`, on
obtient

```text
A_z = A_y A_x,
B_z = A_y B_x + B_y,
D_z = D_x + D_y A_x,

E_z = A_y E_x + E_y A_x + B_y D_x,
G_z = G_x + G_y + D_y B_x,
H_z = H_x + H_y A_x + D_y E_x + G_y D_x.
```

Les termes `H_x + H_y A_x` manquent dans la note consolidée. Ils sont du
premier ordre en `c` et ne peuvent pas être rangés dans `O(c²)`.

Cette correction a une implication importante : la preuve du théorème
Mandelbrot basée sur les anciennes récurrences `E,G,H` n'est pas complète.
Cela n'invalide pas les certificats ultérieurs construits directement à partir
des jets et du reste compensé `Q`, qui ne dépendent pas de cette récurrence
tronquée.

---

## 4. Jets bivariés et majorant de Cauchy

La propriété de clôture des jets est correcte. Si `J_K` désigne la troncature
au degré total `K` et si les cartes n'ont pas de terme constant en `(z,c)`,

```text
J_K(g o f) = J_K(J_K(g) o J_K(f)).
```

Pour deux pas `f_i(z,c)=a_i z+z²+c`, le jet de degré deux est bien

```text
J_2(f_2 o f_1) =
  a_2 a_1 z + (a_2+1)c
  + (a_2+a_1²)z² + 2a_1 zc + c².
```

Le majorant scalaire

```text
rho <- |2Z_j| rho + rho² + R_c
```

est une borne valide de `sup |Phi|` sur le polydisque. Les estimations
anisotropes de Cauchy et la somme

```text
sum_{d>=D} (d+1) theta^d
  = theta^D ((D+1)-D theta)/(1-theta)²
```

sont également correctes.

Le passage par un unique `theta` est toutefois une relaxation. En conservant
les deux rayons normalisés

```text
u = x/R_z,   v = y/R_c,
```

la queue anisotrope exacte de degré total `D` vaut, pour `u != v`,

```text
T_D(u,v) = sum_{i+j>=D} u^i v^j
         = [u^(D+1)/(1-u) - v^(D+1)/(1-v)]/(u-v).
```

La singularité apparente en `u=v` est amovible. Sa valeur diagonale est

```text
T_D(theta,theta)
  = theta^D ((D+1)-D theta)/(1-theta)^2.
```

La formule historique est donc exactement le cas diagonal, et une borne
conservative lorsque `u,v <= theta`. La preuve Lean montre aussi que
`T_D(u,v)` est positive et croissante séparément en `u` et `v` sur `[0,1)`.

Conséquences d'implémentation :

- la queue anisotrope peut être strictement plus petite lorsque les canaux
  `z` et `c` sont déséquilibrés ;
- l'évaluation doit employer une branche diagonale lorsque `u` et `v` sont
  égaux ou proches, afin d'éviter la cancellation par `u-v` ;
- `mobius_cauchy_tail_log2` et les appels qui forment actuellement
  `max(log2_theta_z, log2_theta_c)` sont les points naturels d'intégration ;
- la borne de dérivée `mobius_cauchy_dz_tail_log2` demande sa propre forme
  anisotrope ou l'application du théorème à une borne frontière de `dQ/dz` ;
- le cas pure-`c` avec `R_z=0` reste un certificat unidimensionnel distinct.

Le certificat formalisé itère Cauchy sur la frontière distinguée du bidisque
et obtient

```text
|a_ij| <= M R_z^(-i) R_c^(-j),
tail <= M T_D(x/R_z, y/R_c).
```

Il rend explicite l'obligation de continuité/intégrabilité de la section de
coefficient lors de la seconde intégration. Pour le résidu polynomial `Q`,
cette obligation est mathématiquement naturelle ; son raccord exact au type de
jet du builder et à l'arithmétique flottante reste une obligation de code.

Le raccord rationnel abstrait est désormais lui aussi formalisé pour `N2`
arbitraire, donc simultanément pour `[2/1]-c+` et pour `[1/1]-c+` lorsque
`N2=0`. En posant

```text
Q(z,c) = den(z,c) Phi(z,c) - num(z,c),
```

Lean prouve exactement

```text
cplusEval(z,c) - Phi(z,c) = -Q(z,c)/den(z,c),
|den(z,c)| >= DEN(x,y),
|cplusEval(z,c)-Phi(z,c)| <= REST(x,y)/DEN(x,y).
```

La composition avec la queue anisotrope et la condition `(V)` donne ensuite
`|cplusEval-Phi| <= epsilon S`. Une version réellement relative à `|Phi|`
est prouvée séparément sous une minoration positive explicite de `|Phi|` ;
elle ne peut pas être uniforme au voisinage d'un zéro de `Phi`. Le pont avec
le builder conserve volontairement comme hypothèse l'identification de `Q`
au morceau de série omis : vérifier cette identification pour les tableaux
`REST` concrets reste l'obligation principale côté implémentation.

### 4.1 Condition radiale correcte

Pour une forme rationnelle, écrivons la condition sous la forme

```text
REST(x,y) <= tau epsilon S(x,y) DEN(x,y),
S(x,y) = |A|x + |B|y,
DEN(x,y) = 1 - |F|y - (|D|+|D'|y)x,
```

avec `y = c_max` et, dans le code actuel, `tau = 1/2`.

Pour un polydisque candidat fixé :

- `REST` est une somme de monômes à coefficients positifs et d'une queue de
  Cauchy à coefficients positifs ;
- `S*DEN` est un polynôme concave de degré au plus deux tant que `DEN > 0` ;
- `REST - tau epsilon S DEN` est donc convexe en `x >= 0`.

L'ensemble admissible pour ce candidat est ainsi un intervalle, mais cet
intervalle peut être `[x_min,x_max]` avec `x_min > 0`. Dans ce cas, certifier
seulement `x_max` puis accepter tout `|z| < x_max` est incorrect.

Le correctif minimal pour conserver une seule comparaison au runtime est :

```text
1. vérifier (V) à x = 0 ;
2. si elle échoue, rayon = 0 pour ce candidat ;
3. sinon chercher la borne supérieure de l'intervalle admissible.
```

Lorsque `(V)` est vraie à zéro, la convexité garantit que chaque rayon plus
petit que le premier franchissement supérieur est valide. L'union des
intervalles `[0,r_i]` provenant de plusieurs polydisques candidats est encore
un intervalle `[0,max r_i]`.

Le solveur actuel `mobius_solve_radius` effectue un « first success from
above » ponctuel sans ce test à zéro. Les tests par échantillonnage d'orbites
réelles ne prouvent pas la propriété descendante. Jusqu'à l'ajout du test
`x=0` et d'un test de régression couvrant tout `[0,r]`, les rayons doivent être
qualifiés de « vérifiés sur les cas testés », pas d'inconditionnellement sûrs.

---

## 5. Forme [1/1]-c⁺ corrigée

Soit

```text
m_11+(z,c) = ((A+A'c)z + Bc)/(1 + (D+D'c)z + Fc).
```

Pour le jet exact

```text
Phi(z,c) = sum a_ij z^i c^j,
```

les coefficients

```text
A  = a_10,
B  = a_01,
D  = -a_20/a_10,
F  = -a_02/a_01,
A' = a_11 + D B + F A,
D' = -(a_21 + D a_11 + F a_20)/A
```

annulent bien

```text
q_10, q_01, q_20, q_11, q_02, q_21.
```

Si `a_01 = 0`, il faut prendre `F=0` et conserver `q_02` dans le reste. Cette
branche de repli est correcte dans le code.

La forme ne ferme pas exactement la composition ; elle est extraite après
composition exacte des jets. Sa certification repose donc sur `Q` et la queue
de Cauchy, et non sur une loi de composition fermée des six coefficients.

---

## 6. Forme [2/1]-c⁺ corrigée

La forme livrée est

```text
m_21+(z,c) = (N_2 z² + (A+A'c)z + Bc)
             /(1 + (D+D'c)z + Fc),
```

avec

```text
D   = -a_30/a_20,
N_2 = a_20 + D a_10,
```

et `A,B,F,A',D'` calculés comme dans la section précédente avec le nouveau
`D`. Elle annule en plus `q_30`.

À un pas, `a_20=1` et `a_30=0`, donc `D=0`, `N_2=1` : la forme est exactement
`az+z²+c`.

Si `a_20=0`, le repli vers [1/1]-c⁺ est correct, à condition de remettre
`q_30` dans le reste vivant.

L'annulation de `q_30` ne prouve pas une dominance globale de rayon sur
[1/1]-c⁺. Le nouveau `D` modifie simultanément :

- le pôle et donc la marge `DEN` ;
- les coefficients compensés d'ordre supérieur ;
- le majorant de `Q`.

La dominance doit être obtenue par un dispatch qui conserve les deux rayons,
ou démontrée bloc par bloc. Elle ne découle pas du seul zéro supplémentaire.

---

## 7. Superconvergence : formulation exacte

À `c=0`, soit

```text
Phi(z) = a_10 z + a_20 z² + a_30 z³ + a_40 z⁴ + ...
```

Pour [1/1] avec `D=-a_20/a_10`, le développement donne

```text
(m_11(z)-Phi(z))/Phi(z)
  = (a_20²/a_10-a_30)/a_10 * z² + O(z³).
```

Ainsi

```text
err_rel = C_11 |z|² (1+O(|z|)),
C_11 = |a_30-a_20²/a_10|/|a_10|,
```

sur une direction où le coefficient dominant ne s'annule pas. Ce n'est pas
une égalité exacte pour un bloc général, car les coefficients `a_40,a_50,...`
restent présents.

Pour le flot parabolique exact

```text
Phi_L(z) = z/(1-Lz),
```

on a `a_n=L^(n-1)` et `C_11=0`. Pour [2/1], `q_30=0` par construction et
`q_40=a_40+D a_30=0` sur ce même modèle. Cela explique la superconvergence,
mais la taille réelle du rayon dépend encore de la queue, du pôle et du canal
`c`.

---

## 8. Dérivées correctes

Posons

```text
Ae  = A + A'c,
De  = D + D'c,
N   = N_2 z² + Ae z + Bc,
den = 1 + De z + Fc,
m   = N/den.
```

Alors

```text
m_z = ((2N_2 z + Ae)den - N De)/den²
    = (2N_2 z + Ae - m De)/den,

m_c = ((A'z+B)den - N(D'z+F))/den²
    = (A'z+B-m(D'z+F))/den.
```

La propagation est

```text
w' = m_z z' + m_c.
```

Ces formules sont déjà implémentées dans `mobius_apply`. Les formules de la
note consolidée, sans `F` ni `N_2`, décrivent seulement l'ancienne forme
[1/1] à cinq coefficients.

---

## 9. Régime périodique

### 9.1 Forme [1/1]-c⁺

À `c` fixé, [1/1]-c⁺ est la transformation de Möbius

```text
g(z) = (Ae z + Bc)/(De z + K),
K = 1+Fc.
```

Ses points fixes satisfont

```text
De z² + (K-Ae)z - Bc = 0,
```

et son multiplicateur en un point fixe `zeta` vaut

```text
kappa = (Ae K - Bc De)/(K + De zeta)².
```

La matrice exacte à élever à la puissance `k` est

```text
[[Ae, Bc], [De, K]].
```

Le code actuel emploie correctement `F` et conserve explicitement
l'extraction [1/1] pour l'en-tête périodique. Sa puissance stable est calculée
par exponentiation binaire projectivement normalisée, solution plus robuste
que la simple différence divisée annoncée dans la note.

### 9.2 Pourquoi [2/1]-c⁺ ne convient pas à cette fermeture

Avec `N_2 != 0`, la carte est rationnelle de degré `2/1`, pas Möbius. Elle ne
se linéarise pas globalement par le birapport de deux points fixes et ses
itérées ne sont pas données par une puissance de matrice `2x2`.

Son équation de point fixe reste toutefois quadratique,

```text
(De-N_2)z² + (K-Ae)z - Bc = 0.
```

Le commentaire de `periodic_build` qui annonce une équation cubique pour
[2/1] est donc erroné. Ce n'est pas le degré de l'équation des points fixes qui
interdit la puissance Möbius, mais le degré deux de la carte elle-même.

L'accélérateur périodique doit donc :

- utiliser un bloc [1/1]-c⁺ dédié, comme le fait le code actuel ; ou
- développer une itération spécifique de la carte de degré deux, qui n'est
  plus un fast-forward en `O(log k)` par matrice Möbius.

La borne géométrique demande une contraction uniforme sur un domaine invariant.
La valeur de la dérivée au seul point fixe ne suffit pas. Cette obligation est
maintenant formalisée par trois tests scalaires sur le disque `|z|<=r` :

```text
mu    = |K|-|De|r                         > 0,
image = (|Ae|r+|Bc|)/mu,
gamma = |Ae K-Bc De|/mu²                 < 1,
image + err_block                        <= r.
```

Lean prouve que ces tests impliquent l'invariance de l'orbite Möbius et de
l'orbite exacte, puis l'erreur uniforme
`err_block/(1-gamma)` après un nombre arbitraire de périodes.

Le contrôle actuel du shader

```text
2 max(|zeta_a|, |delta-zeta_a|) < r
```

n'implique pas l'enclosure annoncée lorsque le multiplicateur complexe fait
tourner la coordonnée de birapport. Le test correct, également prouvé, est

```text
|zeta_a| + |zeta_a-zeta_r| q/(1-q) <= r,
q = |w_0| < 1,
```

avec `|kappa|<=1`. Le seuil `|w_0|<0.5` reste un bon garde de bassin, mais il
doit être combiné avec ce majorant ou remplacé par le certificat uniforme du
disque ci-dessus.

---

## 10. Coordonnée de Fatou

Pour

```text
F(u) = u + a u² + b u³ + O(u⁴),
t = -1/(a u),
rho = b/a² - 1,
```

un calcul direct donne

```text
t(F(u)) = t + 1 - rho/t + O(t^-2).
```

La coordonnée satisfaisant `Psi(F(u))=Psi(u)+1` commence donc par

```text
Psi(u) = -1/(a u) + rho log(-1/(a u)) + O(u),
```

avec un signe `+` devant `rho log`. La note consolidée et
`JET_BLA_FINDINGS.md` portent le signe opposé pour la définition
`rho=b/a²-1`.

Cette convention concorde avec Dudko et Sauzin : après le changement
`t=-1/(au)`, ils écrivent la dynamique `t+1-rho/t+...` et la coordonnée de
Fatou `t+rho Log(t)+...` ([arXiv:1307.8093](https://arxiv.org/abs/1307.8093)).

Si une autre convention définit `rho_alt=1-b/a²`, la même formule peut
s'écrire avec `-rho_alt log`; la définition du coefficient et le signe du
logarithme doivent rester cohérents.

Enfin, une erreur `epsilon_Psi` dans la conjugaison ne se compare pas
directement à une tolérance en `z`. Après `k` translations, une borne correcte
doit inclure la distorsion de la carte de sortie :

```text
|delta z_exit| <= Lip(Psi_exit^-1) k epsilon_Psi
```

sur le domaine certifié, plus l'erreur des cartes d'entrée et de sortie.

---

## 11. Conséquences attendues pour les différentes formes

| Forme | Termes reproduits/annulés | Résidu dominant typique | Régime favorable | Limite principale |
|---|---|---|---|---|
| Affine | `z`, `c` | `z²`, puis `zc,c²` après composition | passages critiques où le pôle Padé serait dangereux ; très faible coût | rayon `O(epsilon |2Z|)` dans le canal Julia |
| [1/1] simple | `z,z²,c` au sens Taylor à un pas | `z³` si `c=0`, mais `zc` parasite si `c!=0` | Julia et dynamique lente loin des petits `|2Z|` | guard critique de type (G), pure-`c` non resommé |
| [1/1]-c⁺ | ajoute les zéros `q_11,q_02,q_21` | `q_30 z³`, termes totaux >=3, pure-`c³` | passages near-critical Mandelbrot et régime quasi parabolique | pôle [1/1], queue de Cauchy, pas de dominance globale démontrée |
| [2/1]-c⁺ | ajoute `q_30=0`; exact au seed | `q_40 z⁴` dans le canal `z`, et termes mixtes supérieurs | Feigenbaum, seahorse, blocs où `storedq` [1/1] liait le rayon | ne réduit pas la saturation du majorant ; peut resserrer `DEN` ; non-Möbius pour le périodique |
| Jet d'ordre `K` | Taylor exact jusqu'au degré `K` | vraie queue de Taylor | passages critiques et blocs courts/modérés | trafic, registres et croissance polynomiale défavorable dans les longs transits paraboliques |
| Bloc périodique [1/1]-c⁺ | carte Möbius fixe à `c` donné | erreur de modèle du bloc, amortie seulement sous contraction uniforme | pixels intérieurs après transitoire | frontière `|kappa|~1`, certification de domaine et de dérivée |
| Porte de Fatou | translation dans une carte sectorielle | résidu de conjugaison accumulé comme `k epsilon_Psi` | transit parabolique simple | cartes sectorielles, données de corne, distorsion de `Psi^-1`, canal `c` |

### 11.1 Ordres de grandeur attendus

Pour `c=0`, loin des annulations de la sortie :

```text
affine      : erreur relative locale ~ O(|z|/|a|),
[1/1]       : erreur relative locale ~ O((|z|/|a|)²),
[1/1]-c+    : même ordre en z que [1/1], mais meilleur canal c,
[2/1]-c+    : erreur locale en z ~ O(|z|³) après division par la sortie linéaire,
               et souvent encore plus petite près du flot parabolique.
```

Pour `c!=0`, il n'existe pas de classement uniforme fondé uniquement sur ces
ordres : les termes purs en `c`, les termes mixtes, la marge du dénominateur et
la queue de Cauchy peuvent dominer.

### 11.2 Dominances qui peuvent être affirmées

- Le jet de degré supérieur reproduit davantage de coefficients de Taylor,
  mais son rayon certifié avec un majorant donné n'est pas automatiquement
  supérieur si l'échelle d'erreur ou le coût change.
- [2/1]-c⁺ annule strictement un coefficient de plus que [1/1]-c⁺, mais son
  dénominateur est différent : aucune dominance de rayon globale n'en découle.
- [1/1]-c⁺ supprime les termes responsables du guard (G) au premier ordre,
  donc une amélioration forte est attendue près des passages critiques. Une
  dominance bloc par bloc reste un résultat numérique tant qu'elle n'est pas
  prouvée avec la totalité de `Q`, `DEN` et la queue.
- Un dispatch qui garde le maximum des rayons individuellement certifiés donne
  la vraie dominance opérationnelle : il ne sélectionne une forme que dans son
  propre domaine.

---

## 12. Résultats numériques reproduits le 12 juillet 2026

Les nombres ci-dessous proviennent des tests du dépôt exécutés en mode release.
Ils mesurent des tours de boucle CPU, pas directement le temps GPU. Ils restent
conditionnés par le problème de domaine radial décrit en §4.1.

### 12.1 Production [2/1]-c⁺ contre le Padé heuristique

Test : `mobius_vs_pade_user_regime_census`.

| Référence | epsilon | c_max | Padé | [2/1]-c⁺ production | Ratio c⁺/Padé |
|---|---:|---:|---:|---:|---:|
| cusp | 1e-3 | 1e-5 | 221 | 816 | 3.69x |
| period-2 | 1e-3 | 1e-5 | 227 | 1372 | 6.04x |
| Feigenbaum | 1e-3 | 1e-5 | 4900 | 3351 | 0.68x |
| cusp | 1e-4 | 1e-5 | 232 | 816 | 3.52x |
| period-2 | 1e-4 | 1e-5 | 242 | 1395 | 5.76x |
| Feigenbaum | 1e-4 | 1e-5 | 7203 | 3915 | 0.54x |
| cusp | 1e-4 | 1e-9 | 160 | 160 | 1.00x |
| period-2 | 1e-4 | 1e-9 | 160 | 176 | 1.10x |
| Feigenbaum | 1e-4 | 1e-9 | 331 | 464 | 1.40x |
| cusp | 1e-6 | 1e-9 | 160 | 160 | 1.00x |
| period-2 | 1e-6 | 1e-9 | 160 | 176 | 1.10x |
| Feigenbaum | 1e-6 | 1e-9 | 713 | 573 | 0.80x |

Ces résultats corrigent deux conclusions trop fortes de la note.

1. Une forme rationnelle certifiée ne peut pas être déclarée « jamais plus
   lente » qu'un Padé heuristique : elle refuse davantage de longs blocs dans
   certains régimes.
2. Le gain est très dépendant de `(epsilon,c_max)` et de la référence. Le même
   Feigenbaum passe de `0.54x` à `1.40x` selon le régime testé.

Le Padé de ce test emploie un rayon heuristique. Un nombre de tours inférieur
ne signifie donc pas qu'il satisfait le même certificat.

### 12.2 [2/1]-c⁺ contre [1/1] simple

Test : `mobius_census_vs_plain_mobius`, avec `epsilon=1e-12`,
`c_max=1e-14`, 24 pixels par référence.

| Référence | Tours [1/1] simple | Tours [2/1]-c⁺ | Applications [1/1] | Applications [2/1]-c⁺ |
|---|---:|---:|---:|---:|
| seahorse | 13085 | 945 | 9832 | 918 |
| near-parabolic | 1360 | 168 | 1336 | 144 |
| Feigenbaum | 16695 | 192 | 14025 | 168 |

Le résultat attendu est donc bien une très forte amélioration du canal
Mandelbrot profond par rapport au [1/1] simple. Il ne permet toutefois pas
d'isoler ce qui vient de `F,A',D'` et ce qui vient du numérateur [2/1], car le
test compare actuellement les deux changements à la fois.

### 12.3 [3/1]-c⁺ contre la production [2/1]-c⁺

Le test `mobius_kplus_conservatism_census` montre :

- mêmes tours sur Feigenbaum, cusp et period-2 dans les cas recensés ;
- seahorse `1560 -> 1509`, soit environ 3.3 % de tours en moins ;
- gain médian de rayon affiché entre `+0.1` et `+0.6` décade selon la vue,
  sans changement de dispatch dans la plupart des cas.

Cela soutient le choix pratique de [2/1], mais le test contient un libellé
obsolète : la ligne `c+[1/1]` appelle désormais `mobius_build_levels`, qui
construit la production [2/1]. Elle ne constitue plus une mesure [1/1]-c⁺.

---

## 13. État de l'implémentation par rapport aux corrections

| Point | État du code actuel | Action requise |
|---|---|---|
| Extraction [1/1]-c⁺ | correcte dans `mobius_from_jet` | aucune sur les formules |
| Extraction [2/1]-c⁺ | correcte dans `mobius_from_jet_k2` | aucune sur les formules |
| Zéros compensés et replis | correctement distingués | conserver les tests d'intégrité |
| Dérivées avec `F,N_2` | correctes dans `mobius_apply` | corriger seulement la documentation |
| Bloc périodique | emploie [1/1] et inclut `F` | corriger la note ; préciser le statut runtime |
| Commentaire des points fixes [2/1] | annonce à tort une cubique | corriger en quadratique ; garder [1/1] pour la puissance Möbius |
| Puissance Möbius stable | exponentiation binaire normalisée | remplacer la description « une cpow/différence divisée » |
| Rayon (V) | succès ponctuel depuis le haut | ajouter le test `(V)` à `x=0` et un test de tout `[0,r]` |
| Tests [1/1] vs [2/1] | certains libellés sont obsolètes | employer explicitement `mobius_build_levels_k1` |
| Signe de Fatou | documentation incohérente avec `rho=b/a²-1` | corriger le signe ou renommer la convention de `rho` |

### Batterie de régression minimale après correction du rayon

1. Pour chaque bloc et chaque polydisque retenu, vérifier `(V)` à `x=0`.
2. Pour chaque rayon émis, échantillonner géométriquement tout `[0,r]`, pas
   seulement le bord ou les `z` visités par quelques orbites.
3. Ajouter un cas synthétique avec reste pur en `c` qui échoue à zéro mais
   passe pour un `x>0`; le rayon à comparaison unique doit être nul.
4. Séparer quatre builders dans les censuses : [1/1] simple,
   [1/1]-c⁺, [2/1] simple et [2/1]-c⁺.
5. Rapporter séparément : rayon certifié, tours, applications, octets lus,
   occupation GPU et temps mur réel.
6. Pour le périodique, tester la contraction uniforme et l'inclusion de tout le
   chemin, pas seulement la valeur de `kappa` au point fixe.
7. Pour Fatou, tester le résidu dans `Psi`, la distorsion de `Psi^-1` et
   l'erreur finale en `z` sur chaque bande.

---

## 14. Conclusion corrigée

La conclusion défendable n'est pas une chaîne de dominance universelle

```text
affine < [1/1] < [1/1]-c+ < [2/1]-c+ < jet,
```

mais une chaîne de richesse de modèle. Une forme plus riche annule davantage
de coefficients locaux ; elle ne garantit pas à elle seule un rayon supérieur,
un nombre d'applications inférieur ou un meilleur temps GPU.

La stratégie mathématiquement sûre est un dispatch de certificats indépendants :

```text
pour chaque bloc et chaque forme :
  construire son propre reste Q,
  construire son propre majorant et sa propre marge de pôle,
  certifier un vrai disque [0,r],
  puis choisir la forme la moins coûteuse parmi celles qui couvrent le point.
```

Les attentes révisées sont alors :

- affine reste un fallback utile près des dégénérescences rationnelles ;
- [1/1] garde son avantage Julia et quasi-parabolique, mais pas de dominance
  Mandelbrot près des petits `|2Z|` ;
- [1/1]-c⁺ traite structurellement le premier mur du canal `c` ;
- [2/1]-c⁺ apporte le meilleur compromis observé sur Feigenbaum/seahorse et
  reste exact au seed, sans résoudre les transits paraboliques saturés ;
- le jet reste la référence de construction et un tier utile lorsque son coût
  mémoire est amorti ;
- le périodique [1/1] et les portes de Fatou sont des accélérateurs spécialisés,
  soumis à des certificats supplémentaires qui ne se réduisent pas au rayon de
  valeur d'un bloc ordinaire.
