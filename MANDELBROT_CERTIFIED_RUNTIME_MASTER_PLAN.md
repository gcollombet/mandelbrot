# Plan maître du runtime Mandelbrot certifié

## Portée et statut

Ce document consolide l'ensemble du chantier discuté autour des sauts affine,
Padé, Möbius-c+, jets, produit Padé non autonome, `matrix-c1`, approximation de
série, régime périodique, portes paraboliques, anti-aliasing analytique et mode
`auto`.

Il remplace les plans partiels comme vue d'ensemble. Les documents spécialisés
restent les sources détaillées :

- [état des preuves Lean](lean-proofs/PROOF_STATUS.md) ;
- [correctif mathématique](CORRECTIF_PADE_MOBIUS_CPLUS.md) ;
- [architecture unifiée actuelle](MANDELBROT_UNIFIED_TABLE_IMPLEMENTATION.md) ;
- [résultats expérimentaux jet/BLA](JET_BLA_FINDINGS.md) ;
- [plan spécialisé `matrix-c1`](PADE_RUNTIME_REVISED_PLAN.md) ;
- [plan disques de Möbius, perturbation et rebasing](MOBIUS_DISK_RUNTIME_IMPLEMENTATION_PLAN.md) ;
- [conséquences du Padé non autonome](NONAUTONOMOUS_PADE_RUNTIME.md) ;
- [directions mathématiques exploratoires](MANDELBROT_DIRECTIONS_MATHEMATIQUES_EXPLORATOIRES.md) ;
- [design historique et état des phases](openspec/changes/unify-jet-table-dispatch/design.md).

Date de consolidation : 13 juillet 2026.

### Convention de statut

Chaque résultat doit être lu avec l'un des statuts suivants :

- **PROUVÉ** : théorème Lean sans `sorry`, `axiom` ni `admit` ;
- **IMPLÉMENTÉ** : chemin Rust/WASM/WGSL présent dans le projet ;
- **MESURÉ** : observation expérimentale, pas un théorème ;
- **PROPOSÉ** : adaptation encore absente ou incomplète.

Une preuve en arithmétique exacte ne certifie pas automatiquement les arrondis
`f64`, `f32`, `CFe` ou WGSL. Le chantier courant omet volontairement cette
partie numérique, conformément à la décision prise pendant l'étude.

## 1. Résultat visé

Le renderer ne doit pas choisir une forme d'approximation globalement pour une
vue. Il doit disposer d'une collection de mouvements certifiés et choisir, à
chaque bloc ou changement de phase, celui qui minimise le coût total attendu.

Le résultat final visé est :

```text
préfixe commun SA, si disponible
  ↓
phase périodique intérieure, si certifiée
  ↓
porte parabolique/Fatou, si certifiée et rentable
  ↓
portefeuille de blocs ordinaires
  affine | Padé | c+ | jet | matrix-c0 | matrix-c1
  ↓
pas exact de perturbation si aucun bloc ne s'applique
```

Le mot « meilleur » signifie ici : même tolérance certifiée, puis coût total
estimé minimal. Il ne signifie ni « forme algébriquement la plus riche », ni
« plus grand rayon isolé », ni « application individuelle la moins chère ».

## 2. Ce qui caractérise réellement le nombre de sauts

Le nombre de tours de boucle n'est pas déterminé par la seule précision locale
du modèle. Il dépend conjointement de :

1. la longueur des blocs disponibles dans l'arbre ;
2. l'alignement du pixel sur le début d'un bloc de cette longueur ;
3. le rayon certifié de la forme pour ce bloc ;
4. la valeur courante de `|dz|` après les rebases ;
5. la bande de paramètres `|dc| <= c_max` ;
6. la tolérance de valeur et les tolérances de dérivées ;
7. les marges de dénominateur et de pôle ;
8. l'interdiction de sauter le premier escape ;
9. la proximité de la fin de l'orbite de référence ou de `max_iter` ;
10. la politique du tag et l'existence éventuelle d'un secours ;
11. les phases spéciales SA, périodique et parabolique ;
12. le coût mémoire, arithmétique et de divergence du mouvement choisi.

Une estimation plus précise tend à produire un plus grand rayon et donc des
blocs plus longs, mais ce n'est pas monotone entre formes. Un dénominateur plus
riche peut introduire un pôle plus proche ; un modèle plus large peut coûter
plus d'octets ; un certificat de dérivée peut devenir limitant alors que la
valeur reste excellente.

La métrique principale doit être le nombre de tours réels ou le coût GPU, pas
seulement le nombre de blocs appliqués :

```text
gain réalisé = itérations couvertes / tours réels de boucle
```

Le coût total d'une forme ou d'un portefeuille peut être modélisé par :

```text
Ctotal = Nprobe*Cprobe
       + Σ_t Napply[t]*Capply[t]
       + Nfail*Cfail
       + Nexact*Cexact
       + Cdivergence
       + Cbuild_amorti.
```

## 3. Architecture actuellement expédiée

### 3.1 Table unifiée

**IMPLÉMENTÉ.** Une seule table bivariée est construite par orbite de référence.
Chaque bloc contient neuf coefficients complexes `CFe` :

```text
[A, B, D, N2, A', D', F, a12, a03]
```

Le record occupe 108 octets. Les quatre tiers actuels lisent des préfixes :

| Tier | Forme actuelle | Préfixe logique | Usage principal |
|---|---|---:|---|
| 0 | affine | 24 B | chemin très léger, surtout peu profond |
| 1 | Padé simple `[2/1]` | 48 B | canal rationnel sans augmentation en `c` |
| 2 | `[2/1]-c+` | 84 B | canal Mandelbrot rationnel complet actuel |
| 3 | jet bivarié d'ordre 3 | 108 B | passages critiques et référence rigoureuse |

Les identités compensées permettent de reconstruire en registres les
coefficients déplacés. Le bloc périodique reste volontairement une extraction
`[1/1]-c+`, car une homographie se ferme par composition et puissance, alors
qu'un numérateur quadratique `[2/1]` ne définit pas une transformation de
Möbius.

### 3.2 Rayons actuels

**IMPLÉMENTÉ.** Chaque tier possède son propre certificat de valeur et son
propre certificat de première dérivée. Le rayon effectif expédié est :

```text
r_eff[t] = min(r_value[t], r_derivative[t]).
```

Il n'existe aucune règle correcte imposant
`r_affine <= r_pade <= r_cplus <= r_jet`. Les rayons ne doivent jamais être
clampés entre tiers : chaque rayon certifie uniquement son évaluateur.

Les secondes dérivées nécessaires à l'AA sont calculées par les formules de la
forme et protégées par leur propre marge/fallback. Pour le futur `matrix-c1`,
les rayons de valeur, première dérivée, seconde dérivée et dérivée mixte devront
être construits explicitement.

### 3.3 Tag actuel

**IMPLÉMENTÉ — remplacé 2026-07-13 par le portefeuille §6.2 + score §6.3.**
Le sidecar fait toujours 16 octets, désormais :

```text
(rayon_principal_log2, tag_principal, f32_safe + 2·tag_secours, rayon_secours)
```

`unified_portfolio_tags` choisit le principal par score P(couverture)/coût
(logistique en log2 autour de la bande) et un secours = argmax rayon quand son
gain de couverture est matériel. Le shader tente le principal puis le secours
AU MÊME NIVEAU avant de descendre (`ENABLE_PORTFOLIO`, toggle A/B par
spécialisation de pipeline). Compteurs `secoursApps`/`secoursIters` dans
WorkStats. Mesure terrain : secours = 34 % des applications, tours de boucle
÷2.6 vs OFF sur la vue d'essai. L'ancienne règle « premier tier couvrant »
reste disponible (`unified_tag`, legacy) pour les censuses.

**La bande est désormais REPLAY-observée (2026-07-14)** :
`unified_replay_band` rejoue la récurrence exacte AVEC rebase Zhuoran
(arithmétique CFe, toute profondeur ; 16 échantillons |dc| ∈ {c_max, c_max/4},
plafond 8k pas, ~20 ms natif) et renvoie (médiane, p90−p50) de log2|dz|. Le
placeholder c_max + 10 surestimait |dz| de 7 à 9 octaves : le |dz| rebasé vit
à ~2·c_max. Conséquence : principal = affine (le moins cher) sur la quasi-
totalité des blocs avec P ≈ 1, secours vivant presque partout — le chemin
commun lit 48 octets au lieu de 124-196. Le placeholder ne subsiste que comme
fallback orbite-courte.

### 3.4 Mode utilisateur

**IMPLÉMENTÉ.** L'interface principale propose `auto` et `exact`. Les anciens
modes restent disponibles comme overrides de debug. `auto` est déjà le meilleur
mode observé sur les vues de terrain testées, mais son sélecteur actuel reste un
sélecteur « premier tier couvrant la bande », pas encore l'optimiseur global
décrit dans ce document.

## 4. Catalogue complet des mouvements

### 4.1 Pas exact de perturbation

```text
dz_(n+1) = 2 Z_n dz_n + dz_n² + dc.
```

- **PROUVÉ** : identité et majorant scalaire par pas.
- **IMPLÉMENTÉ** : fallback universel.
- **Rôle** : vérité runtime lorsque rien d'autre n'est admissible ; gestion des
  transitions, rebases, escapes et fins de table.
- **Limite** : couvre une seule itération par tour.

### 4.2 BLA affine

```text
Phi(z,c) = A z + B c.
```

- **PROUVÉ** : erreur locale exacte `z²` au seed ; comparaison au Padé dans le
  canal Julia ; propagation des jets bas.
- **IMPLÉMENTÉ** : tier 0, préfixe le moins cher.
- **Favorable** : faible profondeur, coefficients rationnels dégénérés, cas où
  son faible trafic compense son rayon inférieur.
- **Limite** : ne capture pas la courbure ; rayon Julia d'ordre linéaire en la
  tolérance.
- **MESURÉ** : ~70 % des applications sur la vue d'introduction, malgré son
  absence dans certains censuses profonds.

### 4.3 Padé simple

Le seed `[1/1]` historique est :

```text
P_a(z,c) = a(a z+c)/(a-z).
```

Le tier de production courant utilise la vue simple de l'extraction `[2/1]`,
avec `N2` mais sans `A'`, `D'` ni `F`.

- **PROUVÉ** : reste exact du seed, deux erreurs relatives distinctes, domaine
  de dominance sur l'affine, défauts `[L/1]`, exactitude pour une queue
  géométrique.
- **PROUVÉ** : sur le flot `z'=z²`, la carte rationnelle est exacte alors que
  tout jet polynomial fixé conserve une queue.
- **IMPLÉMENTÉ** : tier 1.
- **Favorable** : dynamique lente, quasi-parabolique, canal `z` proche d'une
  récurrence géométrique.
- **Limite Mandelbrot** : les termes mixtes et purs en `c` peuvent dominer ; le
  Padé simple n'est pas uniformément meilleur.

### 4.4 Möbius-c+ `[1/1]`

```text
Phi(z,c) = ((A+A'c)z + Bc) / (1 + (D+D'c)z + Fc).
```

- **PROUVÉ** : annulation de `q20`, `q11`, `q02`, `q21` sous les hypothèses de
  non-annulation nécessaires ; marge de dénominateur sur un bidisque ; certificat
  résiduel absolu et relatif ; dérivées avec `F`.
- **IMPLÉMENTÉ** : disponible dans les builders/debug ; utilisé pour le header
  périodique.
- **Favorable** : premier mur du canal `c`, passages near-critical.
- **Limite** : ne compense pas `q30` ; aucune dominance globale de rayon.

### 4.5 Möbius-c+ `[2/1]`

Le numérateur reçoit `N2 z²`; la forme de production annule aussi `q30`.

- **PROUVÉ** : zéros compensés, seed quadratique exact, certificat rationnel
  générique, queue de polydisque et règle radiale.
- **IMPLÉMENTÉ** : tier 2 de production.
- **Favorable** : Feigenbaum, seahorse, passages où `[1/1]` est limité par le
  canal cubique en `z`.
- **Limite** : plus riche ne signifie pas rayon toujours plus grand ; ce n'est
  plus une homographie, donc pas de puissance périodique fermée.
- **MESURÉ** : très supérieur au `[1/1]` simple en Mandelbrot profond, mais le
  résultat dépend fortement de `(epsilon,c_max)` face aux gardes heuristiques.

### 4.6 Jet bivarié

```text
Phi(z,c) = Σ_(i+j<=K) a_ij z^i c^j.
```

- **PROUVÉ** : stabilité de la congruence de jets, troncature par degré total,
  équivalence entre troncature à chaque merge et troncature finale, récurrences
  de première et seconde sensibilité.
- **IMPLÉMENTÉ** : tier 3, ordre appliqué 3 dans la table unifiée.
- **Favorable** : passages quasi-critiques, blocs courts ou moyens, cas où les
  pôles rationnels resserrent le domaine.
- **Limite** : trafic mémoire, multiplications `CFe`, registres et mauvais
  comportement des polynômes sur de longs transits paraboliques.
- **Rôle structurel** : objet de construction commun dont sont extraites les
  formes plus légères.

### 4.7 `matrix-c0`

```text
M(c) ≈ M0.
```

- **PROPOSÉ** : quatre coefficients complexes, toute dépendance en `c` placée
  dans une queue certifiée.
- **Favorable attendu** : `c_max` extrêmement petit et blocs très longs.
- **Limite** : le rayon doit s'effondrer rapidement lorsque le canal `c` domine.
- **Décision** : seulement comme résultat secondaire naturel du builder
  `matrix-c1`, après census.

### 4.8 `matrix-c1`

```text
M(c) = M0 + c M1,
Phi(z,c) = (A(c)z+B(c))/(C(c)z+D(c)).
```

- **PROUVÉ** : récurrence exacte des huit coefficients ; queue `c²+` ; merge
  bloc×bloc ; préservation de la marge ; erreur de troncature ; certificat total
  Padé contre Mandelbrot plus troncature matricielle.
- **PROPOSÉ** : nouveau tier runtime à huit coefficients complexes.
- **Favorable attendu** : longs blocs non autonomes quasi paraboliques, où la
  structure du produit Padé compte davantage que quelques coefficients Taylor.
- **Limite** : perte du terme `N2 z²` de `[2/1]-c+`, coût de huit coefficients,
  normalisation projective et certificat uniforme restant à raccorder.

### 4.9 `matrix-c2`

```text
M(c) = M0 + c M1 + c² M2.
```

- **PROPOSÉ**, non prioritaire.
- **Coût** : douze coefficients complexes.
- **Décision** : ne pas implémenter avant que `matrix-c1` prouve par census que
  l'augmentation d'ordre matriciel peut rembourser la bande passante.

### 4.10 Approximation de série du préfixe (SA)

Le préfixe commun à tous les pixels est approché par une série pure en `dc`.

- **PROUVÉ** : récurrence pure-`c` coefficient par coefficient et majorants de
  Cauchy nécessaires.
- **IMPLÉMENTÉ** : ordre 8 stocké, ordre 4 appliqué, profil certifié `r_c(N)` et
  garde anti-escape précoce.
- **Rôle dans `auto`** : mouvement de phase initial, avant les blocs ordinaires.
- **MESURÉ** : seahorse profond, 1,07 M applications contre 115 M pour le jet
  dans le meilleur run rapporté.

### 4.11 Bloc périodique

Après le transitoire, un retour de période `p` est représenté par une homographie
fixe `[1/1]-c+` au `c` du pixel.

- **PROUVÉ** : points fixes, multiplicateur, birapport, puissance, branche de
  Jordan à valeurs propres coalescentes.
- **PROUVÉ** : tests scalaires de marge, image et contraction uniforme ;
  invariance des chemins exact et approché ; erreur `eps/(1-gamma)` ; vraie
  enclosure du chemin en birapport.
- **IMPLÉMENTÉ** : détection, header, branche intérieure dans les deux boucles
  shader.
- **MESURÉ** : disque période 2, environ 0,16 application par pixel contre un
  coût jet pouvant atteindre des ordres de grandeur supérieurs.
- **À CORRIGER côté runtime** : refléter exactement les tests Lean
  `mu>0`, `I+eps<=r`, `gamma<1` et remplacer toute ancienne enclosure
  heuristique par la borne en birapport prouvée.
- **Différé** : fast-forward extérieur par puissance, jusqu'à validation deep
  zoom et enclosure complète.

### 4.12 Porte parabolique/Fatou

- **PROUVÉ** : forme normale algébrique et signe du resiter ; coordonnées
  exactes des flots modèles à un/deux pétales ; garde de branche principale
  `|delta u|<dist(pôle)` ; translation exacte de la somme de logarithmes le
  long du flot ; construction d'une coordonnée d'Abel exacte lorsque les
  résidus futurs décroissent géométriquement, avec correction
  `<=M/(1-theta)` ; analyticité et équation d'Abel sur tout secteur ouvert
  préconnexe sous un majorant sommable uniforme des dérivées ; accumulation
  finie et borne Lipschitz de sortie déduite d'une borne du champ sur un
  domaine convexe ; constante de changement de branche du modèle logarithmique.
- **IMPLÉMENTÉ/EXPÉRIMENTAL** : builder `gates.rs`, certificat numérique par
  bandes, sérialisation dans le sidecar, tentative shader, fallback systématique,
  compteurs de sauts et d'échecs ; kill switch runtime.
- **Non prouvé de bout en bout** : production du majorant analytique uniforme
  en `(u,c)` pour le retour concret, raccord des bornes numériques Rust/WGSL aux
  hypothèses Lean, sélection certifiée des pétales d'entrée/sortie et données
  de corne non linéaires du vrai germe. Ces dernières ne sont pas déterminées
  par le seul jet fini du builder.
- **Rôle** : franchir en peu de mouvements les longs transits près de
  `kappa^q≈1`, là où la contraction périodique devient mal conditionnée.
- **Garde obligatoire** : ne jamais déclencher sur `|kappa|≈1` seul ; vérifier
  retour résonant, coalescence, non-dégénérescence, secteur, budget et domaine.

### 4.13 Propagation analytique par tile

Une graine locale peut diffuser un checkpoint aux pixels voisins par

```text
T(h) = z + u*h + q*h²,    q = z''/2.
```

- **PROUVÉ** : récurrences des sensibilités jusqu'à l'ordre 4.
- **PROUVÉ** : identité exacte du reste
  `(a+2T)R+R²+2uqh³+q²h⁴` et majorant scalaire associé.
- **PROUVÉ** : propagation inductive de ce reste sur une orbite non autonome
  entière et sur tout disque `|h|<=r`.
- **PROUVÉ** : inclusion d'un rectangle dans le disque, absence d'escape avant
  un checkpoint, premier escape commun lorsque la borne inférieure passe le
  bailout, et transport de l'erreur injectée dans la boucle ordinaire.
- **PROUVÉ** : queue géométrique de Cauchy et bornes de première/seconde
  dérivée du reste sur disques emboîtés.
- **PROPOSÉ** : subdivision adaptative `16→8→4→1`, avec diffusion du checkpoint
  plutôt que copie directe de la couleur finale.
- **Limite** : le premier escape, la couleur et le DE deviennent mal
  conditionnés près de la frontière ; la taille du tile doit provenir du rayon
  certifié et jamais d'une constante.

## 5. Inventaire des preuves disponibles

Le build Lean importe tous les modules ci-dessous et ne contient ni `sorry`, ni
`axiom`, ni `admit`.

| Module | Résultat utilisable par le runtime |
|---|---|
| `Algebra` | reste Padé, transport, composition Möbius, développements en `c` |
| `CPlus` | extractions `[1/1]-c+` et `[2/1]-c+`, zéros compensés, dérivées |
| `Bounds` | enveloppes, rayons relatifs, convexité radiale, accumulation |
| `Cauchy` | coefficients et queues de Cauchy univariées |
| `CauchyDerivatives` | dérivées 1, 2 et mixtes sur disques emboîtés |
| `Polydisc` | queue anisotrope exacte et borne bidisque complète |
| `RationalCertificate` | résidu/dénominateur/erreur/rayon des formes c+ |
| `PadeDominance` | dominance locale, sélecteur sans régression, `[L/1]` |
| `ParabolicSuperconvergence` | flot exact, Hankel, gain Padé, shadowing |
| `Jets` | jets, série pure-`c`, sensibilités |
| `BivariateJets` | correction de la troncature à chaque merge |
| `NonautonomousPade` | produit Padé variable et défauts transportés |
| `MatrixC1` | compression affine en `c`, queue, marges, erreur totale |
| `MatrixC1Deriv` | dérivée directe, shadowing de chaîne et certificat total |
| `MobiusDisk` | exclusion exacte du pôle et transport exact des disques Möbius |
| `MatrixC1Disk` | discriminant et image de disque sous queue `M₀+cM₁+E`, dérivée uniforme |
| `MovingDisks` | composition des repères mobiles et identité hermitienne multiplicative |
| `HyperbolicTelescope` | Schwarz centré, conversions pseudohyperboliques et télescope mobile |
| `SchwarzPick` | Schwarz--Pick à deux points et non-expansion des blocs Möbius |
| `HyperbolicPade` | triangle fort, pliage non linéaire et certificat Padé mobile |
| `PhaseAwareTransport` | merge homographie+inflation, certificat total et invariance de jauge |
| `RenormalizedTransport` | hiérarchie de changements d'échelle, télescopage et retour d'erreur |
| `Rebasing` | perturbation, rebase exact et composition des budgets de sauts approchés |
| `RadiusSolver` | contrat de rayon, préfixité et bissection |
| `Periodic` | points fixes, birapport, puissances et Jordan |
| `PeriodicRuntime` | certificat périodique concret et enclosure |
| `CriticalPeriodic` | obstruction critique et cycle groupé de période 2 |
| `Fatou` | forme normale et convention de signe |
| `FatouSectorial` | branches, flot logarithmique, Abel corrigé et sortie |
| `Dynamics` | invariance, contraction, translation et distorsion |
| `TilePropagation` | propagation locale, queue et checkpoint partagé |

### 5.1 Résultats de dominance réellement acquis

Les seules conclusions générales sûres sont :

- sur son domaine prouvé, le Padé `[1/1]` bat le jet affine dans le canal Julia ;
- un sélecteur utilisant les bornes certifiées de Padé et du jet obtient la
  borne `min(E_pade,E_jet)` ;
- `[2/1]-c+` annule davantage de coefficients que `[1/1]-c+`, sans garantir un
  plus grand rayon ;
- un jet d'ordre supérieur reproduit davantage de coefficients, sans garantir
  un meilleur temps ;
- le Padé est exactement supérieur aux jets polynomiaux sur le flot parabolique
  modèle ;
- près de ce flot, les défauts de Hankel quantifient le gain potentiel ;
- le portefeuille de certificats ne régresse pas mathématiquement si chaque
  forme n'est utilisée que dans son propre domaine.

Il n'existe pas de chaîne universelle :

```text
affine < Padé < c+ < matrix-c1 < jet
```

La seule hiérarchie défendable est une hiérarchie de richesse de modèle.

## 6. Le mode `auto` complet

### 6.1 Invariant de sûreté

Pour chaque tentative, `auto` doit disposer d'un certificat propre à la forme :

```text
certificat(t, bloc, c_max, epsilon, besoins_derives)
  -> rayon effectif, coût, gardes, données d'application.
```

Une forme ne peut être choisie parce qu'une autre forme possède un grand rayon.
Les rayons et les dénominateurs ne sont jamais transférables entre tiers.

### 6.2 Candidats primaires et secours

**IMPLÉMENTÉ (2026-07-14)** : `unified_portfolio_tags_with` énumère les
paires (principal, secours) et maximise couverture attendue / coût attendu
(probe + P·apply + échec→secours (+λ_div) → descente (λ_fail = C_desc)), avec
poids d'ops fe-aware (×2,5 hors f32-safe) et le tag JET doté d'un chemin f32
dans try_apply_unified (l'ancienne règle « jet toujours fe » était une
hypothèse de bande placeholder). Mesure avant/après sur la vue d'essai :
mix jet 47 % fe → Padé 91 % f32, part f32 53 → 100 %, saut moyen inchangé
(×6.8 → ×6.5) — le trafic de repli est passé du tier le plus cher au deuxième
moins cher à couverture égale. Constantes C_desc/λ_div/poids = heuristiques
documentées, calibrables via les compteurs du panneau.

La politique cible n'est pas une cascade fixe « affine puis Padé puis jet ».
Pour chaque bloc, le builder doit classer les candidats admissibles selon leur
coût attendu. Il peut émettre :

- un candidat principal, uniforme pour le bloc ;
- éventuellement un candidat secours ayant un plus grand rayon ;
- ou un seul candidat si le secours ne rembourse pas son trafic.

Au runtime :

```text
si principal couvre |dz| : appliquer principal
sinon si secours existe et couvre |dz| : appliquer secours
sinon : descendre de niveau
```

Le secours dépend de `|dz|` par thread et peut donc ajouter divergence et lectures
sparse. Son adoption dépend d'une mesure, pas seulement d'un gain de rayon.

### 6.3 Score de sélection

Le score doit approximer le gain total, par exemple :

```text
score(t) = iterations_sautees_attendues(t)
         / (octets(t)
            + lambda_ops*operations(t)
            + lambda_fail*probabilite_echec(t)
            + lambda_div*divergence(t)).
```

La distribution de `|dz|` après rebase doit provenir du replay ou de compteurs
réels. Une bande fixe proportionnelle à `c_max` s'est révélée trop pessimiste.

Le score ne doit jamais sélectionner affine uniquement parce qu'une application
affine est moins chère si un Padé ou un jet réduit suffisamment le nombre total
de tours.

### 6.4 Garantie opérationnelle recherchée

Deux garanties distinctes doivent être suivies :

1. **sûreté** : toute application respecte sa tolérance ;
2. **performance** : `auto` ne dépasse pas significativement le meilleur mode
   simple sur les vues de référence à qualité identique.

Le replay idéal qui choisissait le tier le moins cher à chaque entrée satisfaisait
structurellement la seconde propriété en nombre de tours. Le tag unique expédié
ne la satisfait pas formellement, même si le verdict terrain « auto toujours
mieux » a passé la gate. Le portefeuille principal/secours est le moyen naturel
de réduire cet écart.

### 6.5 Ordre des accélérateurs

L'ordre logique cible est :

1. appliquer SA au départ si son préfixe couvre tout le disque paramètre ;
2. tenter une classification périodique intérieure lorsqu'une phase certifiée
   est atteinte ;
3. tenter une porte parabolique uniquement dans son span et son domaine ;
4. rechercher le plus long bloc aligné dont le candidat principal ou secours
   couvre `|dz|` ;
5. vérifier l'escape et les gardes finales ;
6. sinon exécuter un pas exact ;
7. rebase lorsque le critère Zhuoran l'exige.

Le périodique et Fatou sont des changements de phase, pas de simples tiers de
la même table.

## 7. Finalisation de `matrix-c1`

### 7.1 Récurrence prouvée

Pour deux blocs affine-en-`c` :

```text
K0 = M0 N0
K1 = M0 N1 + M1 N0.
```

Pour les queues `EM`, `EN` sur `|c|<=y` :

```text
EK <= EM*(||N0|| + y||N1|| + EN)
    + (||M0|| + y||M1||)*EN
    + y²||M1 N1||.
```

Le terme `EM*EN` est inclus dans le premier produit. Cette règle permet un
merge équilibré `O(1)` par nœud ; l'ancienne récurrence séquentielle n'était
valide que lorsque l'enfant intérieur avait une queue nulle.

L'ordre miroir du builder est :

```text
jet_compose(early, late)
K0 = late.M0 * early.M0
K1 = late.M0 * early.M1 + late.M1 * early.M0.
```

### 7.2 Marge uniforme

Pour `|z|<=R`, `|c|<=y` :

```text
p  = E*(R+1)
mu = |D0|-y|D1|-(|C0|+y|C1|)R
Nu = (|A0|+y|A1|)R + |B0|+y|B1|.
```

Le majorant builder cible est :

```text
Ematrix <= p/(mu-p) + Nu*p/((mu-p)*mu),
```

sous `mu>p`. La même construction doit minorer les dénominateurs des suffixes
employés dans le télescopage Padé–Mandelbrot.

### 7.3 Normalisation projective

Après chaque merge, choisir une puissance de deux `lambda` et rescaler ensemble :

```text
M0 <- M0/lambda
M1 <- M1/lambda
E  <- E/|lambda|.
```

Il reste à formaliser :

```text
eval(lambda M,z) = eval(M,z)
den(lambda M,z)  = lambda den(M,z)
det(lambda M)    = lambda² det(M)
```

et l'invariance complète du majorant. `lambda` doit être non nul, choisi une
fois par bloc et indépendant du `c` du pixel. Dans `CFe`, la puissance de deux
doit être appliquée par ajustement d'exposant ; après sérialisation `f32`, les
gardes de plage restent nécessaires.

### 7.4 Dérivées par Cauchy

Si l'erreur totale est bornée par `M` sur un bidisque extérieur :

```text
|Ez|  <= M/gapZ
|Ec|  <= M/gapC
|Ezz| <= 2M/gapZ²
|Ecc| <= 2M/gapC²
|Ezc| <= M/(gapZ*gapC).
```

Ces constantes sont **PROUVÉES**. Il reste à raccorder l'holomorphie et l'absence
de pôle du résidu concret aux hypothèses abstraites.

### 7.5 Optimisation des rayons emboîtés

Le rayon extérieur n'est pas une constante comme `2R`. Pour chaque rayon runtime
`R` et bande paramètre intérieure `y`, le solveur doit chercher :

```text
Rout > R,
yout > y.
```

La fonction à optimiser contient à la fois le majorant extérieur et les gaps :

```text
M(Rout,yout)/(Rout-R),
2M(Rout,yout)/(Rout-R)²,
M(Rout,yout)/(yout-y),
M(Rout,yout)/((Rout-R)(yout-y)).
```

Le milieu de l'intervalle admissible est seulement une heuristique. Le solveur
doit effectuer une recherche interne sur plusieurs gaps, puis une recherche
externe sur `R`. L'élargissement doit être asymétrique : `yout` serré, car il
entre additivement dans chaque pas de l'enveloppe et dans la queue ; `Rout` peut
être plus généreux, même si son effet initial se propage ensuite dans toute la
récurrence quadratique.

### 7.6 Alternative directe pour la dérivée en `c`

Pour le modèle affine-en-`c` stocké :

```text
Phi_c = (A1*z+B1 - Phi*(C1*z+D1)) / den.
```

Cette formule est exacte pour le modèle, pas pour la vraie matrice possédant une
queue `c²+`. Deux stratégies sont possibles :

1. Cauchy sur un disque `yout>y` ;
2. propager une queue dérivée `Ec` majorant directement la dérivée de la queue
   matricielle.

La seconde stratégie pourrait réduire fortement le coût du headroom en `c`, mais
demande une nouvelle récurrence et doit encore être additionnée à l'erreur de
dérivée Padé–Mandelbrot. Elle vient après le certificat de valeur uniforme, sauf
si le census montre que `Ec` est le verrou principal.

### 7.7 Builder et format proposés

Structures build-only :

```text
MatrixC1 {
  constant: Homography,
  linear: Homography,
}

MatrixC1Bounds {
  tail_log2,
  value_radius_log2,
  derivative_radius_log2,
  second_derivative_radius_log2,
  mixed_derivative_radius_log2,
}
```

Première intégration GPU possible :

```text
tag 4 = A0,B0,C0,D0,A1,B1,C1,D1,unused
```

Le record courant possède neuf slots complexes, donc une union permet de tester
le tier sans agrandir immédiatement le record. La sérialisation des coefficients
devra alors intervenir après le choix du tag.

## 8. Optimisations runtime et build consolidées

### 8.1 Caches par dépendance

Séparer :

- coefficients de jet et `M0,M1` : orbite seulement ;
- bornes/queues : orbite et headroom `c_max` ;
- rayons : `epsilon`, `c_max`, besoins de dérivées et headrooms ;
- tags/portefeuille : distribution de `|dz|` et modèle de coût ;
- SA/périodique/gates : paramètres propres à la phase et à la vue.

Le cache staged actuel a déjà réduit les reconstructions. Il faut préserver la
possibilité d'un re-solve de rayons sans reconstruire les coefficients.

### 8.2 Travail build inutile

**IMPLÉMENTÉ** : ne plus calculer les niveaux `skip 1–2` jamais sérialisés a
supprimé environ 75 % des blocs traversés dans certains builds.

**IMPLÉMENTÉ (2026-07-13/14)** :

- tolérance de la bissection R_z ramenée à 0,05 log2 (au lieu de 20 itérations
  fixes ≈ 2⁻²⁰) + réutilisation du M du dernier point valide ;
- warm-start R_z parent→enfant (`mobius_bisect_rz_hinted`) : la marche du
  parent contient celle du premier enfant en préfixe, donc R_z(parent) ≤
  R_z(enfant) — sonde descendante exponentielle depuis le hint ; un enfant
  segment-mort (−∞) tue le rung parent gratuitement ; ATTENTION : un enfant
  DÉGÉNÉRÉ (coefficients) ne transmet PAS de hint (+∞), la marche segment n'a
  pas tourné ;
- bande replay §6.3 (`unified_replay_band`) : voir §3.3.

Bilan mesuré (harnais `unified_cold_build_stage_timing`, natif 32k iters) :
bounds 830 → 465 (feigenbaum) / 855 → 350 ms (near-parab) ; build froid total
1,73 → 1,43 s (−18 %) / 1,70 → 1,26 s (−26 %). Split radii (~600 ms, premier
poste restant) : mobius-V ~100 ms, mobius-V′ ~87 ms, jet ~132 ms, solves
affine/jet (V′) par bloc + assemblage ~310 ms.

Prochaines pistes :

- les solves (V′) affine/jet par bloc (~310 ms) : réutilisation des
  évaluations entre tiers ; NE PAS relâcher la tolérance de
  `bisect_last_success` (0,02) — elle dégraderait les rayons runtime ;
- warm-start : première sonde adaptative (le drop R_z par octave est grand sur
  les vues chaotiques — feigenbaum profite moins que near-parab) ;
- recherche adaptative des gaps de Cauchy ;
- parallélisation des blocs si le mur reste dominant ;
- ne calculer `matrix-c1` qu'au-dessus d'une longueur ou d'un indicateur de
  saturation raisonnable.

### 8.3 Bande passante et format

Décisions actuelles :

- conserver la lecture par préfixe ;
- garder un probe de sidecar à 16 B tant que possible ;
- tester `matrix-c1` comme union avant tout agrandissement ;
- si un secours devient utile, comparer sidecar 32 B, index packé dans `u32`,
  pool sparse et candidat unique par score ;
- conserver les coefficients en `CFe` au build, puis expédier un chemin `f32`
  seulement lorsqu'il est sûr ;
- étudier un exposant partagé ou une normalisation projective par bloc avant
  d'ajouter des coefficients.

### 8.4 Divergence et cohérence de tile

Le tag principal par bloc est warp-uniforme. Les sources de divergence restantes
sont :

- comparaison du rayon par lane ;
- succès/échec du secours ;
- descentes de niveaux différentes ;
- rebases et escapes ;
- gates et périodique applicables à une partie des pixels.

Une séquence de blocs commune au tile ne doit être tentée que si le compteur
`workgroupWaste` montre durablement un gaspillage supérieur à environ ×2. La
séquence du pixel central peut être rejouée, mais chaque lane doit conserver sa
validation de rayon et son fallback.

### 8.5 Arithmétique

- appliquer les normalisations par puissances de deux dans l'exposant `CFe` ;
- calculer les bornes positives en log2 ou flottant exponentiel ;
- éviter de matérialiser des coefficients gigantesques en `f64` ;
- garder un garde de dénominateur shader même si le rayon build l'implique ;
- suivre pression registres et occupation, notamment avec `matrix-c1`, `z''` et
  les branches de secours.

### 8.6 SA et AA

- SA reste le meilleur mouvement pour le préfixe commun ;
- l'AA analytique réutilise `(z,z',z'')` et ne réitère que la frontière dont la
  marge Taylor échoue ;
- le seuil de marge doit être réglé sur vues profondes, car la vue peu profonde
  a montré ~99 % de fallback ;
- les sous-échantillons doivent être colorés après expansion dans le color pass,
  pas moyennés dans l'espace des itérations ;
- la renormalisation de parité de l'itération et le tag de décision sur le sample
  initial sont des invariants de l'implémentation actuelle.
- le noyau Lean de la propagation vers les pixels voisins est disponible dans
  `TilePropagation.lean` ; le prototype recommandé est une SA locale par tile
  qui injecte un checkpoint puis laisse chaque pixel continuer séparément ;
- commencer par `4×4`, subdiviser ou retomber au pixel individuel lorsque le
  disque, l'absence d'escape ou le budget d'erreur échoue ; les tailles `8×8`
  et `16×16` doivent être des résultats du certificat.

### 8.7 Référence secondaire

Le nombre et la localisation des blocs où tous les tiers sont morts constituent
un signal certifié utile pour demander une nouvelle référence. Cette piste reste
hors scope tant qu'un vrai système multi-référence n'est pas engagé.

### 8.8 Colorations incompatibles

Les colorations dépendant de chaque itération, comme orbit traps ou stripe
average, ne peuvent pas utiliser ces sauts sans une forme close du fonctionnel
accumulé sur le bloc. Elles doivent désactiver les sauts concernés ou disposer
d'un certificat supplémentaire.

## 9. Mesures et enseignements déjà acquis

### 9.1 Coût GPU

- affine et Möbius simple se situaient sous un plateau de latence : une division
  supplémentaire pouvait être masquée par le lookup ;
- le jet franchit ce plateau par trafic, opérations `CFe` et registres ;
- le vrai critère est donc `skip/coût`, pas un comptage abstrait d'opérations ;
- ce plateau n'est pas une loi universelle : `matrix-c1` et un secours sparse
  doivent être remesurés.

### 9.2 Census unifié

Le replay CPU idéal a montré qu'une union des quatre tiers pouvait égaler le
nombre de tours du jet tout en déplaçant 71–100 % des applications profondes
vers des chemins plus courts. La production a ensuite confirmé un gain terrain
du mode `auto`.

Nuances :

- affine est mort dans certains censuses profonds mais vivant en vue peu profonde ;
- `c_max` grossier tue souvent les tiers rationnels certifiés tandis que le jet
  conserve les termes en `c` ;
- les rayons ne forment pas une échelle monotone ;
- le tag par bloc réel peut coûter quelques applications face au choix idéal par
  entrée ;
- un Padé heuristique peut afficher moins de tours sans respecter le même
  certificat.

### 9.3 Phases spécialisées

- SA a donné jusqu'à ×108 moins d'applications dans le cas rapporté ;
- le périodique intérieur transforme `max_iter` en coût proche de `O(p)` ;
- l'AA analytique est prometteur en profondeur mais pas sur toute frontière
  peu profonde ;
- les portes paraboliques montrent des gains sur cusp/period-2, mais leur preuve
  mathématique de bout en bout reste plus faible que celle des blocs ordinaires.

## 10. Ce qui reste à prouver

### Priorité A — rendre `matrix-c1` émissible

1. normalisation projective complète et invariance du majorant ;
2. corollaire uniforme `p/mu/Nu` ;
3. marges uniformes des suffixes Padé exacts et approchés ;
4. raccord analytique du résidu concret aux hypothèses de Cauchy ;
5. certificat builder total sur un bidisque extérieur ;
6. si nécessaire, queue dérivée directe `Ec`.

### Priorité B — fermer les accélérateurs existants

1. prouver que le solveur Rust émet uniquement de vrais disques `[0,r]`, y
   compris la condition à `r=0` ;
2. brancher littéralement les trois tests de `PeriodicRuntime` ;
3. remplacer l'enclosure périodique historique par celle en birapport ;
4. prouver le fast-forward périodique extérieur avant activation ;
5. raccorder les portes Fatou Rust/WGSL aux théorèmes désormais disponibles de
   branche, résidu, translation et carte de sortie, puis certifier
   l'uniformité analytique en `(u,c)` du retour concret.

### Priorité C — résultats plus ambitieux

1. série formelle/analytique infinie générique des jets ;
2. certificat global Mandelbrot couvrant toutes les étapes concrètes du solveur ;
3. ordre matriciel 2 si `matrix-c1` est prometteur ;
4. invariants de corne non linéaires d'Écalle--Voronin du vrai retour Fatou ;
5. référence secondaire certifiée ;
6. modèle formel des arrondis, uniquement si cette portée est réouverte.

Pour la propagation par tile, le noyau de sûreté exact-arithmétique est déjà
prouvé. Restent une borne de l'erreur de smooth iteration/couleur, une politique
DE si les dérivées sont diffusées, et la mesure du gain pondéré par le coût des
graines.

Ce qui ne nécessite pas un nouveau théorème mathématique : choisir le minimum
d'une liste de coûts déjà certifiés. En revanche, chaque nouvelle estimation de
rayon, composition, normalisation ou fast-forward doit être reliée à une preuve.

## 11. Plan d'exécution révisé

### Étape 0 — figer les références

- conserver ce document comme plan maître ;
- conserver `PROOF_STATUS.md` comme vérité sur les théorèmes ;
- marquer les anciennes notes comme historiques lorsque leurs formules ou
  mesures sont dépassées.

### Étape 1 — finir les preuves `matrix-c1`

1. normalisation projective ;
2. majorant uniforme et suffixes ;
3. raccord analytique/Cauchy ;
4. éventuellement queue dérivée directe.

Gate : aucun `matrix-c1` runtime tant qu'un rayon totalement build-computable
n'est pas obtenu.

### Étape 2 — builder build-only

- construire `M0,M1,E` dans le merge-tree ;
- normaliser à chaque merge ;
- résoudre les rayons sur un ensemble de gaps `(Rout-R,yout-y)` ;
- ne rien sérialiser au GPU ;
- produire le census complet.

Vues minimales : intro, cusp, period-2, seahorse, Feigenbaum, spiral,
near-parabolic et antenna needle, à plusieurs `(epsilon,c_max)`.

Gate : `matrix-c1` doit gagner suffisamment en itérations pondérées par coût sur
une part significative des applications.

### Étape 3 — mettre `auto` au bon modèle de coût

- enregistrer la distribution de `|dz|` réellement rencontrée ;
- estimer le coût des tiers actuels et de `matrix-c1` ;
- comparer candidat unique et portefeuille principal/secours ;
- garantir que chaque candidat conserve son propre rayon ;
- ne pas imposer un ordre de richesse comme ordre de choix.

### Étape 4 — intégration GPU minimale

- union `tag 4` dans le record 9 slots ;
- évaluateur valeur et dérivées ;
- garde de dénominateur ;
- compteurs de tentatives, applications, échecs et itérations couvertes ;
- chemins `f32` et `CFe/fe` selon la garde existante.

Gate : accord CPU/WGSL et gain wall-clock à qualité identique.

### Étape 5 — portefeuille conditionnel

Seulement si les mesures montrent qu'un tag unique perd beaucoup de grands
blocs :

- sidecar secours ou pool sparse ;
- mesure de coalescing et divergence ;
- comparaison contre le coût supplémentaire systématique du probe.

### Étape 6 — fermeture périodique et Fatou

- porter les nouveaux théorèmes périodiques dans les gardes runtime ;
- valider puis activer séparément la branche extérieure ;
- poursuivre les portes Fatou derrière leur kill switch jusqu'au certificat
  analytique complet.

### Étape 7 — optimisations secondaires

- scans de rayon parallèles/adaptatifs ;
- prototype de SA locale par tiles `4×4`, puis subdivision adaptative selon le
  rayon certifié et les tests d'escape ;
- séquences cohérentes par tile si `workgroupWaste` le justifie ;
- référence secondaire si les blocs morts le justifient ;
- `matrix-c2` uniquement après résultats positifs de `matrix-c1`.

## 12. Census obligatoire

Pour chaque bloc, forme et vue, enregistrer :

- longueur et niveau du bloc ;
- rayon valeur, dérivée, seconde dérivée et rayon effectif ;
- canal limitant ;
- `Epade`, `Ematrix`, queue `E`, marges `mu`, `mu-p` ;
- gaps de Cauchy retenus ;
- taille et dynamique des coefficients avant/après normalisation ;
- tier principal, secours éventuel et raison du choix ;
- probabilité de couverture selon la distribution de `|dz|` ;
- skip maximal, médian et réellement appliqué ;
- nombre de probes, échecs, descentes et pas exacts ;
- octets lus estimés et réels si disponibles ;
- tours de boucle, `realizedSkip`, `workgroupWaste`, occupation et registres ;
- temps de build froid, bounds-only, radii-only et warm ;
- erreurs valeur/dérivées contre une marche haute précision.

Rapporter séparément les formes suivantes, sans libellés ambigus :

```text
affine
[1/1] simple
[2/1] simple
[1/1]-c+
[2/1]-c+
jet-3
matrix-c0
matrix-c1
```

## 13. Tests et referees

### Lean

- `lake build` complet ;
- aucun `sorry`, `axiom`, `admit` ;
- théorèmes de normalisation et majorant uniforme ;
- raccord concret à Cauchy ;
- extension éventuelle à la queue dérivée.

### Rust

- ordre de composition sur deux blocs et arbre complet ;
- égalité de `M0,M1` arbre équilibré/séquentiel ;
- queue réelle inférieure à `E` après chaque merge ;
- invariance par normalisation ;
- marges de suffixes et absence de pôle ;
- recherche de gaps comparée à une grille de référence ;
- valeur et dérivées comparées à une marche haute précision ;
- radialité sur tout `[0,r]`, y compris zéro ;
- périodique : invariance, contraction et enclosure ;
- gate : sérialisation et fallback sans changement de classification.

### GPU

- accord CPU/WGSL de toutes les formes ;
- valeur, première et seconde dérivées ;
- chemin `f32` et chemin exponentiel ;
- aucun NaN près des marges ;
- aucun saut du premier escape ;
- rebase identique à la référence ;
- compteurs de tiers et gates ;
- comparaison candidat unique/portefeuille ;
- tests d'images à tolérance identique, pas seulement égalité pixel exacte.

### Performance

- temps GPU mur réel ;
- tours de boucle et itérations couvertes ;
- trafic mémoire ;
- occupancy et pression registres ;
- divergence et coalescing ;
- coût du build amorti ;
- résultats cold-table et warm-table séparés.

## 14. Décisions acquises

1. une table unifiée vaut mieux que quatre builds séparés ;
2. chaque forme garde son propre certificat ;
3. aucune échelle monotone de rayons n'est supposée ;
4. `auto` est le mode utilisateur, les formes individuelles sont des outils de
   debug et de mesure ;
5. le nombre de tours et le wall-clock priment sur le coût algébrique isolé ;
6. SA, périodique et Fatou sont des phases spécialisées ;
7. le bloc périodique reste `[1/1]` ;
8. `[2/1]-c+` reste disponible même si `matrix-c1` est ajouté ;
9. `matrix-c1` doit passer par un census build-only ;
10. `matrix-c2`, secours sparse, séquences de tile et multi-référence sont
    conditionnels à des mesures ;
11. les arrondis sont hors du chantier mathématique courant ;
12. les anciennes gardes heuristiques ne remplacent jamais un certificat.

## 15. Tableau final de situation

| Élément | Preuve | Runtime | Mesure | Prochaine action |
|---|---|---|---|---|
| affine | oui | expédié | oui | conserver dans `auto` |
| Padé simple `[2/1]` | algèbre/certificats génériques | expédié | oui | coût auto |
| `[2/1]-c+` | oui | expédié | oui | conserver fallback |
| jet-3 | oui pour troncature, certificat raccordé côté builder | expédié | oui | référence de secours |
| dérivée `(V')` | math et referee numérique | expédié | partiel terrain | field DE profond |
| SA | récurrence/Cauchy | expédié | fort gain | cache et stabilité |
| AA analytique | sensibilités + marges | expédié | field profond ouvert | régler seuil |
| périodique intérieur | oui | expédié | fort gain | aligner gardes Lean |
| périodique extérieur | partiel | différé | insuffisant | preuve + deep gate |
| Fatou/gates | noyau exact oui, raccord concret partiel | expérimental | prometteur | uniformité `(u,c)` + raccord builder |
| propagation analytique par tile | noyau oui | absente | absente | prototype `4×4` + census |
| produit Padé non autonome | oui | pas comme tier direct | non | via `matrix-c1` |
| `matrix-c1` | cœur oui, raccord final incomplet | absent | absent | priorités A puis census |
| portefeuille secours | sûreté élémentaire si rayons propres | absent | absent | après census |
| `matrix-c2` | absent | absent | absent | seulement si justifié |
| multi-référence | signal disponible | absent | absent | chantier séparé |

## Conclusion

La direction générale n'est plus de chercher une forme universellement
supérieure au jet. Elle est de construire un système de mouvements certifiés
spécialisés : le jet fournit l'information commune, les formes rationnelles
compressent les régimes quasi géométriques, `matrix-c1` vise le produit Padé non
autonome, SA supprime le préfixe commun, le périodique ferme les bassins
contractants et Fatou vise les transits paraboliques.

Le mode `auto` est le composant qui transforme cette richesse mathématique en
gain réel. Il doit choisir avec les trois informations qui manquent à un simple
classement de modèles : domaine certifié, nombre d'itérations effectivement
couvertes et coût GPU complet.
