# Jet-BLA prototype — findings

Prototype Node.js: `jet_bla_prototype.js` (3 sections: validation, benchmark, bivarié).
Convention ops: pas exact 2, lookup affine 2, Möbius 6, jet ordre k = 2k.

## 1. Fondations validées

- **Clôture exacte** : jet composé == jet de la composition, écart coefficient = 0.0
  (au bit près). Aucune troncature à justifier au merge — contrairement à Padé [2/2]+.
- **Règle de rayon** `r_k = (ε·|A₁|/|A_{k+1}|)^{1/k}` : précise à 1–25 % vs rayon
  empirique (K=3,4,6 quasi exacts). Nécessite de stocker K+1 coefficients pour
  appliquer à l'ordre K.
- Rayons mesurés (bloc L=12 seahorse, ε=1e-12) : Möbius ~1.5e-6 → jet3 1e-5 →
  jet4 1e-4 → jet6 1e-3.

## 2. Découverte de calibration : deux régimes

- **Régime A** (delta minuscule quasi tout le temps : near-parabolique, post-rebasing) :
  tout le monde saute les blocs max → **le lookup le moins cher gagne** (affine, 2 ops).
  Jets/Möbius à ordre fixe = pur overhead.
- **Régime B** (delta traverse ses décades jusqu'à échappement) : la portée gagne →
  Möbius/jets battent l'affine (spiral : ×12 vs ×4.6).
- Un jet à **ordre fixe ne domine jamais** : jet3 ≡ Möbius en coût (6 ops), jet4/6
  perdent leur avantage de rayon en surcoût de lookup.

## 3. Le gagnant : jet à ordre ADAPTATIF

Une table de jets **contient l'affine (A₁) et le niveau-Möbius (A₁,A₂) comme
préfixes**. Stocker K+1 coeffs + K rayons r_k ; à chaque application, évaluer au plus
petit ordre k tel que |z| < r_k (Horner sur k termes, coût 2k).

Gains ops médians vs exact (ε=1e-12, z₀=1e-13, 5 références orbite longue) :

| réf         | affine | Möbius | **adaptive-J4** |
|-------------|--------|--------|-----------------|
| seahorse    | ×147   | ×75    | **×172**        |
| near-parab  | ×235   | ×85    | **×235** (=aff) |
| feigenbaum  | ×235   | ×85    | **×235** (=aff) |
| seam        | ×44    | ×18    | **×44** (=aff)  |
| spiral      | ×4.6   | ×12    | **×24**         |

**Domine ou égale partout** ; pénalité nulle en régime A (retombe sur l'ordre 1),
double Möbius en régime B. Erreur mesurée : 0.000·(Nε) partout.
Mémoire : ~3.5× la table affine (5 coeffs + 4 rayons vs A+r).

## 4. Bivarié (z,c) : l'obstruction quasi-critique disparaît

Jet bivarié degré total ≤ K en (z,c), clôture exacte aussi. Sur le bloc seahorse
26→50 (|2Z₃₉|=0.0054) qui a forcé le guard (G) :

| méthode        | erreur rel (|c|=1e-14) |
|----------------|------------------------|
| affine         | 5.4e-9                 |
| Möbius         | 2.9e-9                 |
| **bivarié K=2**| **1.7e-16** (machine)  |

Les termes zc, c² sont *gardés*, pas droppés → plus de troncature à surveiller ;
**(G) devient structurellement inutile** pour le bivarié. Coût mémoire : 5 coeffs
(K=2) vs 3 pour Möbius-ABD.

## 5. Prochaines étapes honnêtes

1. Dériver la règle de rayon bivariée (validité jointe en (z,c) remplaçant H1+H2+G)
   — non fait ; c'est le morceau manquant avant tout théorème.
2. Le théorème : la clôture exacte fait que la preuve Julia se transfère (reste =
   reste de Taylor de la vraie carte, transport inchangé) ; à rédiger.
3. GPU : Horner à ordre adaptatif = divergence de branches par lane — à évaluer
   contre le gain (le vote-WG sur l'ordre max local est la parade naturelle).
4. Benchmark à refaire en profondeur réelle (e50+) avec rebasing complet ;
   les chiffres ci-dessus sont Julia c=0, orbites ≤8192.

## 6. MANDELBROT (c≠0, rebasing Zhuoran) — le tableau s'inverse

|c|=1e-14 (zoom~e14), ε=1e-12, gains ops médians vs exact, erreur finale vérifiée :

| réf         | N    | affine | Möbius(+G) | **biv-adapt K=3** | err_biv/(Nε) | err_aff/(Nε) |
|-------------|------|--------|------------|-------------------|--------------|--------------|
| seahorse    | 3068 | ×1.1   | ×2.0       | **×4.6**          | 0.16         | 1.04         |
| near-parab  | 4000 | ×235   | ×85        | **×296**          | 0.00         | 0.00         |
| spiral      | 317  | ×1.1   | ×1.3       | **×1.7**          | 0.63         | **5.8**      |
| feigenbaum  | 4000 | ×2.0   | ×1.5       | **×267**          | 0.00         | 0.00         |

Lecture :
- **L'affine s'effondre en Mandelbrot** sur les orbites à passages quasi-critiques
  (seahorse ×1.1, feigenbaum ×2.0) : le rayon ε|2Z| s'effondre aux passages, (H2)
  tronque les blocs (L_max ~ log(ε/|c|)/⟨log|2Z|⟩), et le +c/rebasing maintient le
  delta au-dessus du plancher |c|. Sa domination Julia était un artefact du c=0.
- **Möbius(+G) bat l'affine en Mandelbrot** (×2 vs ×1.1) mais reste bloqué par (G)
  aux mêmes passages.
- **Le bivarié adaptatif écrase tout** — feigenbaum ×267 vs ×2.0/×1.5 : il traverse
  les passages quasi-critiques SANS guard (termes croisés gardés, cf. §4), là où
  affine et Möbius sont condamnés aux pas exacts. Erreur toujours ≤0.6·Nε.
- L'exactitude affine est limite (jusqu'à 5.8·Nε sur spiral) ; le bivarié reste
  confortablement dans la borne.

Caveat proto : le coût du test de validité bivarié (~K+2 mults réels/lookup) n'est
pas compté dans les ops ; la règle de validité (queue ≤ ½ε·scale) est heuristique,
à dériver proprement. |c| fixe au build pour (H2)/(G).

## 7. Règle de rayon bivariée — dérivation rigoureuse (validée)

**Objet.** Remplacer (H1)+(H2)+(G) par une condition unique (V) pour le jet bivarié
d'ordre K, avec test runtime = une comparaison |z| < r_k(bloc).

**Borne de reste (rigoureuse).** Pour un bloc de L pas, la vraie carte Φ_L(z,c) est
un polynôme. Deux ingrédients :

1. *Majorant scalaire composable.* Sur le polydisque |z|≤R_z, |c|≤R_c, par induction :
   `ρ ← |2Z_j|·ρ + ρ² + R_c` (départ ρ=R_z) donne M = ρ_L ≥ max|Φ_L|.
   Calculable par balayage des pas au build (O(M log M) scalaire).
2. *Queue de Cauchy anisotrope.* |a_ij| ≤ M/(R_z^i R_c^j), d'où pour la troncature
   à l'ordre k, en (x,y)=(|z|,|c|), θ = max(x/R_z, y/R_c) < 1 :

   REST_k(x,y) ≤ Σ_{d=k+1}^{D_s} T_d(x,y)  [termes stockés, exacts]
              + M·θ^{D_s+1}·((D_s+2)−(D_s+1)θ)/(1−θ)²   [queue, forme close]

   avec D_s le degré stocké. **Stocker D_s = K+3** (deux degrés au-delà du minimum) :
   la queue est repoussée de θ², ce qui la rend inoffensive.

**Condition (V) et rayon admissible.** (V) : REST_k(x, c_max) ≤ ½ε·(|A₁₀|x + |A₀₁|c_max)
— l'échelle inclut le canal c (leçon : l'échelle |A₁₀|x seule s'annule en z→0 alors que
le reste garde ses termes purs en c). Offline, par bloc et par ordre k :
r_k = sup{x : (V)}, avec optimisation du polydisque (R_z ∈ échelle, R_c = s·c_max,
s ≈ 10³–10⁵ ; le polydisque symétrique R_c=R_z gonfle M via le canal c des gros blocs).
Runtime : |z| < r_k, une comparaison — comme (H1).

**Couverture vérifiée : 315/315** (la borne majore toujours l'erreur, y compris blocs
quasi-critiques). Finesse médiane ~10⁵ (pessimiste mais dilué en puissance 1/(k+1)
dans le rayon : perte ÷1–3.4 sur les rayons).

**Cohérence structurelle.** La règle *redécouvre* les anciennes conditions : pour k=1
(affine), r₁=0 exactement sur les blocs traversant un passage quasi-critique (le c²
droppé ne dépend pas de z) — c'est (G) ; et le terme c² de (V) à k=1 est (H2)/(H3).
(H1)(H2)(G) étaient les ombres de (V) à l'ordre 1.

**Benchmark Mandelbrot, règle rigoureuse** (|c|≤1.1e-14, ε=1e-12, D_s=6, K=3) :

| réf         | affine | Möbius(+G) | biv-rig | err/(Nε) | biv-heuristique |
|-------------|--------|------------|---------|----------|-----------------|
| seahorse    | ×1.1   | ×2.0       | **×3.9**| 0.001    | ×4.6            |
| near-parab  | ×235   | ×85        | ×62     | 0.000    | ×296            |
| spiral      | ×1.1   | ×1.3       | **×1.6**| 0.30     | ×1.7            |
| feigenbaum  | ×2.0   | ×1.5       | **×42** | 0.002    | ×267            |

L'écart restant vs heuristique (~×5 sur les orbites lentes) a deux causes identifiées :
(a) conservatisme résiduel des rayons ; (b) k=3 forcé sur les gros blocs là où k=1
suffirait pour le canal z seul (piste : évaluation séparée canal-z ordre 1 + termes-c
stockés). Bugs de benchmark corrigés en route : échelle sans canal c (rayons nuls),
polydisque symétrique (M gonflé), épuisement de référence (dilution des gains).

**Statut** : la règle est dérivée, rigoureuse (couverture prouvée par la construction,
vérifiée numériquement), implémentable (1 comparaison/lookup, rayons offline), et
suffit déjà à battre affine ET Möbius sur toutes les références quasi-critiques.
Le théorème global O(Nε) s'écrit maintenant comme pour Möbius : reste ≤ ε·sortie par
(V), transport inchangé, (ND) pour la division — sans (G) ni (H2).

## 8. Verdict d'implémentation (GPU, tests utilisateur soutenus)

Après correction des bugs (rayons morts en profondeur, underflow de gate, cap de
niveaux) : **Padé/Möbius ~2× plus rapide que le jet en wall-clock**, aussi-précis-ou-
mieux à ε égal sur les vues testées. Jet livré en mode RIGOUREUX (erreur certifiée,
test unique), Padé reste le défaut vitesse.

**Localisation confirmée et expliquée.** Les parcours interactifs deep-zoom passent
l'essentiel du wall-clock en dynamique lente/near-parabolique. Là, le modèle est
f(z)=z+z², dont l'itérée L fois est asymptotiquement z/(1−Lz) — exactement une
Möbius. Vérifié sur bloc réel (C=−0.7499+0.0001i) :

- L'erreur Möbius par bloc est **indépendante de L** (9.5e-12 à L=64 ET L=256) —
  signature du flot parabolique ; elle est sous ε dans toute la bande où vit le
  delta réel (1e-13–1e-11).
- Le jet-3 reste ~10³–10⁴× plus précis à z égal (7.6e-14 vs 9.5e-10 à z=1e-5) —
  mais cette précision est de la SUR-précision là : elle n'agrandit aucun bloc
  utile. Seul le coût du lookup différencie → ×2 Padé.

**Correction de la convention ops du papier.** k(k+3)/2 vs 6 sous-estime
matériellement les constantes GPU : évaluation tout-floatexp sur les deux chemins,
trois sommes polynomiales par application, lectures 120 B vs 48 B par bloc, build
de table ×10–20. Les gains certifiés du jet (passages quasi-critiques, validité
sans guard, borne O(Nε) prouvée) sont réels mais couvrent une minorité du
wall-clock typique.

**Synthèse suggérée (non implémentée).** La table (V) calcule déjà r_k par ordre au
build : marquer par bloc « Möbius-suffisant » (chemin 48 B) vs « jet-requis »
(passages quasi-critiques) donnerait la vitesse Padé sur la majorité et la rigueur
jet aux passages — un seul mode au lieu de deux.

## 9. Résolution du paradoxe affine/Möbius (métrique de coût)

Paradoxe apparent : dans les tableaux ops du papier, l'affine bat souvent Möbius ;
sur GPU réel, Möbius est ~2× plus rapide dans bien des cas et jamais plus lent.

**La métrique était fausse, pas les maths.** La convention ops (affine 2, Möbius 6)
modélise un CPU scalaire compute-bound. Le GPU est latence-mémoire/warp-bound :
lookup 32 B vs 48 B = même transaction, la division est gratuite devant la latence.
Le coût par application est PLAT ; seul compte le NOMBRE d'applications.

Mesuré (applications = lookups + pas exacts, |c|=1e-14, ε=1e-12) :

| réf         | apps affine | apps Möbius | ratio |
|-------------|-------------|-------------|-------|
| seahorse    | 2705        | 934         | ×2.90 |
| feigenbaum  | 1368        | 939         | ×1.46 |
| spiral      | 278         | 212         | ×1.31 |
| near-parab  | 18          | 18          | ×1.00 |

**« Jamais plus lent » est structurel** : r_Möbius = √ε|2Z| ≥ ε|2Z| = r_affine à
chaque niveau, donc Möbius ne prend jamais plus d'applications ; à coût/application
plat, il ne peut pas perdre. Les 3 coefficients vs 2 et la condition (G) en plus ne
coûtent rien au runtime (même transaction, une comparaison précalculée).

Hiérarchie wall-clock GPU finale, cohérente théorie/pratique une fois la bonne
métrique posée : **Möbius ≥ affine partout (×1–3), jet > Möbius seulement aux
passages quasi-critiques** (minorité du wall-clock typique), d'où le ship :
Padé défaut, jet mode rigoureux.

## 10. Le modèle du plateau (pourquoi le jet est 2× plus lent malgré §9)

Le coût par application est plat SOUS UN SEUIL : (a) bloc ≤ 1 transaction (~128 B),
(b) arithmétique sous l'ombre de la latence, (c) registres → occupancy suffisante
pour masquer la latence. Affine (32 B, 1 cmul) et Möbius (48 B, 2 cmul+div) sont
sous le seuil → seul #applications les différencie (§9). Le jet-3 bivarié le
dépasse sur les 3 axes : 120 B (2.5× bande passante — non masquable), ~9–12 muls
floatexp (3 sommes, hors de l'ombre), pression registres (occupancy ↓ → latence
visible). Et il ne réduit PAS #applications sur la charge dominante (dynamique
lente : blocs max pour tous) → 2× plus cher par application, pour rien là.

Conséquence : « inutile d'optimiser » vaut pour Möbius (déjà sous le seuil), pas
pour le jet — le ramener sous le seuil est exactement où l'optimisation paye :
(1) dispatch par bloc (chemin 48 B quand Möbius-suffisant, jet seulement sur blocs
quasi-critiques) ; (2) stockage compact des seuls ordres à rayon utile ;
(3) coefficients rescalés par bloc (exposant partagé) au lieu de tout-floatexp.

## 11. Table unifiée à trois formes (dispatch (V)) — faisable, un verrou restant

Idée (validée dans son principe) : UNE table de jets au build ; l'affine en est
l'ordre 1 (A10=A, A01=B), le Padé s'en DÉRIVE (D=−A20/A10, identité vérifiée :
−A_z·D_z = A20 par les deux récurrences) ; trois rayons certifiés précalculés
r_aff ≤ r_Padé ≤ r_jet par bloc ; au lookup, cascade de comparaisons et chemin
mémoire adapté (32/48/120 B). Tag par BLOC → zéro divergence de warp sur le choix.

Partage mesuré (ε=1e-12, |c|≤1.1e-14) :
- Blocs quasi-critiques (seahorse 26→50, feigenbaum) : r_Padé=0 — le terme spurieux
  cz, i.e. (G), redécouvert une fois de plus — r_jet3>0 : **tag JET** ✓.
- Seahorse générique : r_Padé=3.3e-8 ≫ delta : **tag MÖBIUS 48 B** ✓.
- **Verrou : dynamique lente.** La borne triangulaire (reste_jet2 + resommation)
  ET la borne compensée sur (1+Dz)Φ−(A10z+Bc) (annulation exacte du degré 2,
  compensation ÷2.5 seulement au degré 3) donnent r_Padé ~1e-13–1e-14 — alors que
  le Möbius y est empiriquement superconvergent (err 9.5e-12 INDÉPENDANTE de L).
  Un dispatch purement certifié taggerait donc JET/exact sur la charge dominante
  et perdrait la vitesse Padé.

Options : (a) pragmatique — rayon Padé heuristique sur les blocs lents, rayons (V)
certifiés partout ailleurs (généralise le ship actuel en un seul mode) ;
(b) théorique — expliquer et borner la superconvergence near-parabolique : l'erreur
Möbius mesurée y scale en x² avec un préfacteur minuscule et indépendant de L, non
capturé coefficient-par-coefficient. Dernier problème ouvert du projet.

## 12. Superconvergence near-parabolique : résolue (canal z) — formule fermée exacte

**Canal z : CERTIFIÉ.** L'erreur relative Möbius (c=0) obéit EXACTEMENT à
    err_rel = C·x²,   C = |A30 − A20²/A10| / |A10|,
tous coefficients disponibles au build (jet degré 3). Vérification : C_pred = C_mes
à toutes les décimales, sur TOUS les blocs testés — y compris quasi-critique
(9.49=9.49 near-parab L=32 ; 9.52=9.52 L=256 ; 1.61e7=1.61e7 seahorse 26→50).
C est INDÉPENDANT de L (9.49→9.52 de L=32 à 256) : la superconvergence est le fait
que le coefficient compensé sature au lieu de croître comme A30~L². Explication
structurelle : le flot parabolique ż=z² a ses applications-temps exactement Möbius
(A30=A20²/A10 identiquement) ; C mesure la distance de la dynamique au flot.
Rayon canal-z certifié : x ≤ √(ε/C) ≈ 3e-7 near-parab — GRAND. L'échec du §11
venait entièrement du canal c.

**Canal c : PAS de compensation.** |A11 + BD|/|BD| ≈ 0.96–1.0 partout : le terme
spurieux zc est réel, non compensé. Raison structurelle : le flot ż=z²+c est bien
Möbius-en-z pour chaque c, mais avec des coefficients A(c), D(c) DÉPENDANTS de c —
la forme (Az+Bc)/(1+Dz) fige A,D à c=0 et ne peut pas le représenter. La contrainte
c-canal certifiée est x ≲ ε/(2|D_eff|) avec D_eff=|q11|/B (≈5.7 near-parab L=256),
soit ~9e-14 à ε=1e-12 : le delta de travail la frôle. La prédiction complète
    err_rel ≈ C·x² + |q11|·x·|c|/(A10·x+B|c|) + |A02||c|²/(A10·x+B|c|)
est vérifiée exacte au point de travail (5.7e-12 prédit vs 5.6e-12 mesuré).

**Conséquences.**
1. Le dispatch certifié du §11 est débloqué : le rayon Padé par bloc se calcule par
   la formule fermée ci-dessus (c fixé par vue) — plus de pessimisme Cauchy sur les
   blocs lents. Julia (c=0) : superconvergence entièrement certifiée par C.
2. Mandelbrot deep-zoom : la limite Padé réelle sur blocs lents est le spurieux
   (x ≲ ε/2D_eff), pas le canal z. Piste pour la lever : Möbius « c-augmentée »
   ((A+A'c)z+Bc)/(1+(D+D'c)z) — 2 coefficients de plus (64 B), Möbius-en-z à
   coefficients affines en c (groupe pour chaque c, clôture à O(c²) contrôlée),
   qui représenterait A(c),D(c) du flot et compenserait le spurieux. Non exploré.

## 13. Möbius c-augmentée ((A+A'c)z+Bc)/(1+(D+D'c)z) — mesures

A'=A11+BD et D' calés sur les coefficients (1,1) et (2,1) du jet (dérivés au build,
coût nul si table unifiée). Erreurs mesurées à x=1e-12 :

| bloc | \|c\| | Möbius | Möbius-c+ | gain |
|---|---|---|---|---|
| seahorse 26→50 (quasi-critique, ex-(G)) | 1e-12 | 4.0e-9 | 1.4e-10 | ×28 |
| | 1e-14 | 1.5e-9 | **5.3e-13 < ε** | ×2 900 |
| | 1e-15 | 1.7e-10 | 5.2e-15 | ×32 000 |
| near-parab L=256 (lent) | 1e-14 | 5.6e-12 | 3.1e-13 | ×18 |
| | 1e-15 | 9.0e-12 | 4.6e-14 | ×200 |

Scaling résiduel → c² aux passages critiques (plancher c¹ spurieux éliminé) ;
sur les blocs lents le résiduel est le c² pur (pas de B' — un 3e coefficient
l'éliminerait aussi). Caveat : à c=1e-12 sur bloc lent, ×0.8 (D' sur-corrige à
grand c) — le rayon certifié le gère.

**Ce que ça achète :**
- Précision/rayons : le bloc qui a créé (G) passe SOUS ε dès c=1e-14 → guard
  affaibli à une condition c² (traverse les passages en deep zoom) ; sur les blocs
  lents le spurieux disparaît → rayon Padé certifié = canal z √(ε/C)~3e-7 → le
  dispatch certifié (§11) se ferme SANS heuristique.
- Perf : reste sur le plateau GPU — 80 B (5 complexes) < 1 cache line, +2 cmul
  sous l'ombre de latence → coût/application ≈ Möbius ; #applications = Möbius sur
  le lent, MEILLEUR aux passages critiques (où Möbius+G cale) → wall-clock
  ≥ Möbius partout, l'essentiel des gains certifiés du jet à coût Möbius.
- Structure : Taylor ordre 1 en c des coefficients A(c),D(c) du flot ż=z²+c
  (Möbius exact en z pour chaque c) — l'étage suivant structurellement correct,
  et le DERNIER qui tienne sur le plateau. Hiérarchie : affine ⊂ Möbius ⊂
  Möbius-c+ ⊂ jet, chaque étage capturant un canal de plus.
- Clôture : non exacte (coefficients affines en c → troncature O(c²) au merge),
  mais la troncature O(c²) est bénigne (l'obstruction historique était le c¹,
  désormais capturé) ; certification par la formule fermée §12 étendue.

## 14. La superconvergence s'étend-elle au jet ? Non au polynôme, oui au [K/1]

**Jet polynomial : non, structurellement.** Sur la dynamique lente la carte de bloc
est ~z/(1−Lz) : un PÔLE en z≈1/L. La superconvergence est une resommation de ce
pôle — réservée aux formes rationnelles. Les coefficients du jet suivent
a_d ~ L^{d−1} : son coefficient de reste CROÎT (C_jet3 = 76→93 de L=64 à 256),
son rayon rétrécit en ~1/L. C'est la raison profonde du verdict GPU §6.

**Jet rationalisé [K/1] : oui, vérifié.** Padé [K/1] dérivé du jet au build
(D = −a_{K+1}/a_K, numérateur ajusté) : sur le flot, le coefficient compensé
dominant a_{K+2}+D·a_{K+1} = L^{K+1}−L·L^K = 0 exactement. Mesuré ([2/1],
near-parab) :
- C' = 3.05 (L=64) → 2.51 (L=256) : SATURE comme le Möbius (vs jet qui croît) ;
- err[2/1] = C'·x³ EXACTEMENT (ratio 1.00) — la certification en forme fermée
  s'étend telle quelle ;
- ×25–37 mieux que jet-3 à x égal ; 5 ordres mieux que Möbius (3.8e-15 vs
  9.5e-10 à x=1e-5).

**Portée pratique.** Le mécanisme définit l'échelle générale [K/1](-c+) : le
dénominateur (1+Dz) calé sur le ratio des coefficients porte la superconvergence,
le numérateur porte l'ordre. À garder en réserve : ne l'implémenter que si le
census montre le canal z (√(ε/C)) comme borne active — dans le census profond
actuel, le mur est le majorant/canal c, pas le canal z.

## 15. Pistes de recherche restantes (régimes & wall-clock)

1. **Régime intérieur / périodique (le gros morceau non traité).** Sur les images à
   minibrots, les pixels intérieurs itèrent jusqu'à maxiter — souvent la majorité
   du wall-clock. La référence y est quasi-périodique de période p : le bloc de
   période est un Möbius quasi-FIXE, et itérer un Möbius fixe k fois a une FORME
   CLOSE (puissance de matrice 2×2, diagonalisation) → sauter des MILLIERS de
   périodes en O(1). La superconvergence s'applique directement (multiplicateur
   ≈1 = exactement le régime near-parabolique déjà analysé). Bonus : test
   d'intériorité certifié quasi gratuit — |A_période| < 1 au point fixe, lu dans
   la table. Gain potentiel : coût maxiter → coût ~période.
2. **Series approximation certifiée, gratuite.** Le bloc préfixe évalué en z=0
   EST la SA historique (z_out = B·c + F·c² + ... = jet en c), avec un rayon
   certifié en c par la machinerie (V) (rôles z/c échangés). La table la contient
   déjà : skip commun des N premières itérations pour tout le tile, sans les
   glitches historiques (qui venaient de la troncature non certifiée).
3. **Builds cohérents entre frames.** Les coefficients ne dépendent PAS de c_max ;
   seuls les rayons en dépendent. Pendant une animation de zoom (C fixe, c_max
   décroît) : construire les coefficients UNE fois, re-dériver les rayons par
   keyframe (scan léger). Attaque directe du build ×10–20.
4. **AA analytique par le canal c.** Rejouer la même séquence de blocs à plusieurs
   offsets sous-pixel de c (lectures table partagées, delta seul change) →
   supersampling 4–16× à coût marginal. Le B des blocs donne déjà le skip de
   dérivée pour la distance estimation.
5. **Séquences de blocs cohérentes par tile.** Calculer l'ordonnancement des blocs
   sur le pixel central du tile, le rejouer branchless sur toutes les lanes
   (validation par rayon seule) → tue la divergence warp résiduelle (le gâchis
   WG ×3 mesuré).
6. **Critère certifié de référence secondaire.** Le census de blocs morts le long
   de l'orbite = déclencheur principiel de re-référencement, remplaçant les
   heuristiques de détection de glitch (Pauldelbrot).

Incompatibilités honnêtes : les colorations par-itération (orbit traps, stripe
average) ne se skippent pas sauf forme close du fonctionnel sur un bloc ; la
queue d'échappement ne vaut rien (log log itérations).

## 16. Études : SA certifiée (§15.2) et AA analytique (§15.4) — validées

### SA certifiée (préfixe pur-c)
Build : jet pur-c du préfixe (z0=0) par la récurrence b'_j = 2Z·b_j + Σb_k·b_{j−k}
(+1 sur b_1) — O(N·J) réels, ordre appliqué 4, stocké 8. Rayon certifié en c :
termes stockés + queue de Cauchy 1-variable (majorant ρ←|2Z|ρ+ρ²+R_c depuis ρ=0),
échelle R_c = s·y avec s ∈ {1e2..1e12} (PAS s petit — leçon θ^J).
Mesures (ε=1e-12) :
- profil r_c(N) : seahorse 3.5e-8 (N=50) → 4e-16 (N=1600) ; near-parab 2.5e-5 → 2.5e-8.
- **N0 (skip commun certifié) : seahorse 1025 its à c_max=1e-14, ≥2500 en profond ;
  near-parab ≥2500 partout.** Validation : erreur 0.003·ε à c_max.
- Gain : ~20–23 applications BLA → 1 évaluation polynomiale (degré 4 en c),
  vectorisable sur le tile, sans logique de rebasing sur le préfixe. Ce qui borne
  r_c(N) : croissance de B/b_j + premier passage quasi-critique (le profil le
  localise — utile aussi comme diagnostic).

### AA analytique (canal c)
- **Les dérivées traversent les blocs** : w' = m_z·z' + m_c avec
  m_z = (Ae·M − N·De)/M², m_c = ((A'z+B)·M − N·D'z)/M² (Ae=A+A'c, De=D+D'c) —
  vérifié vs propagation pas-à-pas : écart 1e-13. Même schéma pour z''.
- **Taylor sous-pixel** ẑ(δ)=z+z'δ+½z''δ², δ=demi-pixel (vue 1024px) : sur pixels
  échappants, erreur 2e ordre à l'échappement = 5e-6..1.5e-3 avec marge
  |z'|/(|z''|δ) = 5–30 → 16 sous-échantillons ANALYTIQUES (2–3 cmul chacun) au
  lieu de 16 orbites. **La marge détecte les pixels frontière** (2/10 testés :
  marge 1e-5..1e-9, Taylor invalide) → fallback vraie itération sur ceux-là.
- Coût attendu : AA 16× pour ~(1 + f·16)× le coût de base, f = fraction frontière
  (typiquement 1–10 % d'une image) — vs 16× brut.
- Synergie SA×AA : le préfixe SA est un polynôme en c → les 16 sous-échantillons
  partagent son évaluation trivialement.

Recette d'implémentation : (1) SA = cas spécial m=0 de la table (bloc préfixe,
rayon en c, une évaluation) ; (2) propager (z, z', z'') dans le kernel (3 états au
lieu de 1, formules bloc ci-dessus), tracker min de la marge ; (3) à l'échappement,
marge > seuil (~5) → sous-échantillons analytiques, sinon fallback.

## 17. Régime intérieur/périodique — étude validée (§15.1)

**Mécanisme.** Après le transitoire, la référence est p-périodique → UN bloc de
période Φ_p (composé depuis la table c+ existante). Pour c fixé c'est une Möbius
FIXE : points fixes ζ± (quadratique De·z²+(1−Ae)z−Bc=0), multiplicateur
κ = m'(ζ) = (Ae−Bc·De)/(De·ζ+1)². Conjugaison w=(z−ζa)/(z−ζr) → w→κw →
**k périodes en forme close (1 cpow), O(1)**.

**Mesures (disque période-2, C=−1+0.1i, référence intérieure) :**
- |κ| = 0.4000 = multiplicateur théorique du cycle exact → **test d'intériorité
  certifié à coût O(p)** (κ est le multiplicateur du cycle propre du pixel).
- Forme close vs itération vraie : erreur relative 1.01e-5 à k=10 **ET** k=1000 —
  **indépendante de k** : la contraction amortit (err_totale ≤ err_bloc/(1−|κ|)).
  À k=10⁵ : convergence directe vers ζa, un cpow.
- L'erreur 1e-5 est celle du bloc à ce |c|=1e-5 (gros) ; au deep zoom ~ε.

**Recette d'implémentation.**
1. Détection de période sur la référence (|Z_{n+p}−Z_n| < tol après transitoire) ;
   composer Φ_p depuis la table (aucun nouveau build).
2. Par pixel arrivé en phase périodique avec delta z : résoudre la quadratique
   (1 csqrt), κ, w0.
3. |κ| < 1 et |w0| dans le bassin → **INTÉRIEUR : colorer immédiatement**
   (période p, multiplicateur κ pour l'interior-DE) — coût O(p) au lieu de maxiter.
4. |κ| ≥ 1 (ou w0 côté répulsif) → **fast-forward** : k* = log(w_seuil/|w0|)/log|κ|
   périodes en un cpow, puis reprise du skip normal avec rebase (le rebase
   resynchronise — l'estimation de k* à O(1) périodes près suffit).

**Caveats honnêtes.** (a) Près du bord de la composante |κ|→1 : 1/(1−|κ|) explose —
mais c'est le régime parabolique où la superconvergence rend err_bloc minimal ;
l'équilibre précis reste à quantifier. (b) Le transitoire doit être éteint sous ε
(sinon absorber la dérive η_n dans le budget). (c) Validité : chaque itéré
intermédiaire doit rester dans le rayon certifié du bloc — pour l'intérieur la
contraction le garantit (|z_j−ζa| décroît) ; pour l'extérieur, k* est borné par le
rayon. (d) Démonstration extérieure non faite ici (à ce |c| la perturbation sort
du régime) — le mécanisme est symétrique, à valider au deep zoom réel.

**Gain.** Pixels intérieurs : maxiter → O(p). Sur les images à minibrots (où
l'intérieur domine le wall-clock), c'est potentiellement le plus gros gain du
projet — et il réutilise intégralement la table c+.

## 18. Portes paraboliques — prolongement de §17 par coordonnées de Fatou

**Piste retenue, avec une portée corrigée.** La conjugaison de §17
`w=(z−ζa)/(z−ζr), w↦κw` est une coordonnée de Koenigs pour le bloc Möbius
fixe. Lorsque les deux points fixes coalescent et `κ→1`, elle est mal
conditionnée et la majoration contractante `err_bloc/(1−|κ|)` explose. Le
remplacement canonique au parabolique simple est une coordonnée de Fatou
sectorielle `Ψ`, telle que

    Ψ(F(u)) = Ψ(u) + 1,       Ψ(F^k(u)) = Ψ(u) + k,

où `F` est le retour de période recentré au point fixe parabolique. Dans une
pétale, elle admet la forme asymptotique resommable
`Ψ(u) = −1/(a·u) + ρ log(−1/(a·u)) + O(u)` avec `ρ = b/a² − 1` pour
`F(u)=u+a·u²+b·u³+O(u⁴)` — signe **+** devant `ρ log` sous cette convention
(correctif §10 : avec `t = −1/(a·u)` la dynamique s'écrit `t+1−ρ/t+…` et la
coordonnée `t+ρ·Log t+…`, conforme à Dudko–Sauzin ; une convention
`ρ_alt = 1−b/a²` donnerait `−ρ_alt log`). Un saut entrée → sortie de porte devient donc une
translation suivie de `Ψ⁻¹`, potentiellement en O(1) au lieu de milliers de
périodes. Référence : Dudko & Sauzin, *The resurgent character of the Fatou
coordinates of a simple parabolic germ*, arXiv:1307.8093.

**Ne pas déclencher sur `|κ|→1` seul.** Une coordonnée de Fatou s'applique à
un multiplicateur qui tend vers **1**. Si `κ→exp(2πi·r/q)`, cas naturel au
bord satellite, il faut former le retour `F=Φ_p^q` : son multiplicateur tend
alors vers 1. Pour un angle irrationnel au module 1, ce n'est pas un régime
parabolique et Fatou n'est pas le bon modèle. Le détecteur doit donc vérifier
`|κ^q−1|` petit, la coalescence des points fixes, et `a≠0` (parabolique
simple), plutôt que seulement `1−|κ|`.

**Deux étages distincts.**
1. **Correctif Möbius immédiat.** Avant toute nouvelle carte, évaluer la
   puissance du bloc par la matrice `2×2` et une branche à valeur propre double,
   plutôt que par `ζa, ζr, w`. Au parabolique,
   `M=λ(I+N), N²=0`, donc `M^k=λ^k(I+kN)` (après normalisation). Une formule
   à différence divisée / série autour des deux valeurs propres est stable près
   de leur coalescence. Elle supprime la singularité *numérique* de §17 mais
   pas l'accumulation de l'erreur de modèle.
2. **Accélérateur « porte de Fatou ».** Pour le vrai transit lent, construire
   une carte d'entrée et une carte de sortie, chacune sur sa pétale, puis
   traduire de `k`. Le passage entre elles porte les données de corne
   (Écalle--Voronin) : une unique série locale ne couvre donc pas globalement
   toute la porte.

**Lien avec la superconvergence §12.** C'est un très bon signal, pas une
certification automatique : le bloc near-parabolique est proche du flot
`ż=z²`, dont les applications-temps sont exactement Möbius et dont la
coordonnée de Fatou dominante est `−1/z`. Mais §12 contrôle l'erreur de la
carte en `z`; une erreur résiduelle `ε_Ψ` dans la coordonnée de Fatou
s'accumule en `k·ε_Ψ` pendant la translation. Il faut donc certifier le
résidu de conjugaison et couvrir aussi le canal paramètre `c`, pas seulement
réemployer le rayon superconvergent en `z`.

**Prototype sûr.** Limiter d'abord le mode aux retours simples (`q` petit),
avec entrée/sortie dans des secteurs fixés. Pour chaque pixel : (1) appliquer
la carte d'entrée, (2) choisir `k` vers le seuil de sortie, (3) appliquer la
carte inverse de sortie, puis (4) rebase ou vérifier que le résultat est dans
le rayon certifié c+ du bloc suivant. Les pixels qui franchissent la frontière
de composante, les cartes hors secteur, ou un résidu trop grand retombent sur
l'itération/table ordinaire. Cela sépare proprement le gain de transit de la
classification immédiate des pixels intérieurs de §17.
