# Perturbation + saut de bloc rationnel (Padé [1/1]) pour Mandelbrot deep zoom
## Spécification d'implémentation

> Document de référence pour intégrer le saut d'itérations par approximation **affine (BLA)** et **rationnelle (Padé [1/1])** dans un renderer Mandelbrot par perturbation. Conçu comme contexte d'implémentation pour Claude Code.
>
> Il fusionne deux niveaux : (A) la **dérivation mathématique** (dont la partie Padé est une dérivation *originale, non validée par la communauté*), et (B) les **découvertes faites au prototypage** — trois bugs concrets et leurs correctifs, qui sont la partie la plus directement actionnable.

---

## 0. TL;DR pour l'implémenteur

1. **Socle = perturbation + rebasing.** Une orbite de référence haute précision `Z_n`, chaque pixel itère un delta `z` en basse précision. Le rebasing (Zhuoran) remplace la détection de glitch.
2. **BLA affine** : remplace `l` pas par `z ← A·z + B·c`, valable tant que `|z| < ε|A|`.
3. **Padé [1/1]** : remplace par `z ← (A·z + B·c)/(1 + D·z)`, avec un **seed `D = −1/(2Z)`** et une **composition `D_z = D_x + A_x·D_y`**. Rayon étendu à `√ε|A|`. **Original, à valider.**
4. **Trois invariants non négociables** (sinon artefacts massifs identiques dans les deux modes) :
   - **Ne jamais démarrer un saut depuis `Z ≈ 0`** (pas non-linéaire, rayon nul) → pas exact forcé.
   - **Saut minimum `MINSKIP = 4`** ; en-dessous, perturbation exacte (la zone quadratique près de l'origine est irreprésentable par une carte linéaire).
   - **Référence plus précise que le delta** : float32 nu sur `Z` provoque un glitch global → double-single (hi+lo) au minimum.
5. Padé ne diffère de l'affine **que là où `z` devient grand** dans un bloc (`D·z` non négligeable) : zones de détail fin proches de l'échappement / des points critiques. En zones lisses, les deux sont identiques — c'est attendu, pas un bug.

---

## 1. Socle : perturbation

### 1.1 Orbite de référence (haute précision, CPU)
```
Z_0 = 0
Z_{n+1} = Z_n² + C        # C = centre de la vue, en haute précision
```
Stocker la suite `Z_n` (voir §5 pour la précision de stockage GPU).

### 1.2 Itération perturbée du pixel (basse précision)
`c = δc` = offset du pixel par rapport au centre de référence. Le delta `z` vérifie :
```
z_0 = 0
z_{n+1} = 2·Z_n·z_n + z_n² + c
```
La valeur complète est `Z_n + z_n`. **Le terme `z_n²` est exactement ce que la BLA approxime** ; il doit être conservé dans le pas exact.

### 1.3 Rebasing (Zhuoran, 2021) — remplace la détection de glitch
Après chaque pas, soit `m` l'index de référence courant :
```
si |Z_m + z| < |z|   (ou m atteint la fin de la référence) :
    z ← Z_m + z       # bascule sur la valeur complète
    m ← 0             # repart du début de la référence
```
C'est ce qui rend la perturbation fiable sans références multiples.

### 1.4 Bailout + coloration
```
si |Z_m + z|² > bailout² : échappé
μ = iter + 1 − log2( log|Z_m + z| )      # comptage lissé
```
Distance estimation (extérieur), si besoin de contours/AA :
```
dérivée : z'_{n+1} = 2·(Z_n + z_n)·z'_n + 1
DE = 2·|Z+z|·log|Z+z| / |z'|
```

---

## 2. BLA affine (référence documentée — mathr.co.uk)

### 2.1 Seed (1 pas, à l'itération n)
```
A = 2·Z_n
B = 1
rayon R = ε·|A|          # ε ≈ 1e-6 en float32, ≈ 2e-16 en float64
```

### 2.2 Composition de deux blocs (x AVANT y)
```
A_z = A_y · A_x
B_z = A_y · B_x + B_y
R_z = max(0, min(R_x, (R_y − |B_x|·|c|) / |A_x|))
l_z = l_x + l_y
```
La composition de deux cartes affines est triviale (produit). C'est ce qui permet la **table hiérarchique** en arbre de merge (O(M) stockage), ou — version plus simple mais plus lente — l'accumulation à la volée d'un bloc dans la boucle de rendu.

### 2.3 Application
```
z ← A·z + B·c
```

---

## 3. Padé [1/1] — extension rationnelle (ORIGINAL, NON VALIDÉ)

> ⚠️ Cette section est une dérivation personnelle. Elle n'apparaît dans aucune source communautaire (fractalforums, mathr, Kalles Fraktaler, Fraktaler 3, fractalshades). À traiter comme une hypothèse de recherche, pas un acquis. Le seul précédent de saut d'ordre supérieur (NanoMB2, biséries chaînées) a échoué « pour beaucoup de localisations » par absorption catastrophique.

### 3.1 Forme
```
z ← (A·z + B·c) / (1 + D·z)
```
Linéaire en `c` au numérateur, rationnel [1/1] en `z`.

### 3.2 Seed (1 pas) — dérivation
Le pas vrai est `z_{n+1} = 2Z·z + z² + c`. On identifie le développement de la forme rationnelle :
```
(A·z)/(1 + D·z) = A·z − A·D·z² + A·D²·z³ − …
```
terme à terme avec `2Z·z + z²` :
```
A = 2Z                  (ordre z¹)
−A·D = 1  ⟹  D = −1/(2Z) = −1/A     (ordre z²)
B = 1                   (terme en c)
```
**Le seed Padé reproduit donc `z²` EXACTEMENT** (l'affine le jette). Erreur de tête : terme parasite `z³/(2Z)`. Il introduit un **pôle parasite en `z = 2Z = A`**, exactement à la limite où la linéarisation perdait déjà sa validité — le pôle « code » utilement la divergence.

### 3.3 Composition de deux blocs (x AVANT y)
La composition exacte de deux Möbius bivariés génère des termes croisés `c·z` et `c` (la forme [1/1] n'est **pas** strictement fermée, le degré joint croît). En zoom profond, `c` est minuscule : on **tronque ces termes d'ordre supérieur en c**, ce qui referme la forme :
```
A_z = A_y · A_x                 # identique à l'affine
B_z = A_y · B_x + B_y           # identique à l'affine
D_z = D_x + A_x · D_y           # NOUVEAU — structure de Möbius
```
Vérification matricielle (Möbius pour c=0) : `T(z) = A·z/(1+D·z) ↔ [[A,0],[D,1]]`, et le produit `M_y·M_x` redonne bien `A_z = A_y A_x`, `D_z = D_x + A_x D_y`.

> Interprétation : `D_z = D_x + A_x·D_y` est une somme pondérée par le produit des dérivées du flot — structurellement le deuxième coefficient d'une série de perturbation. Padé encode la **courbure** du bloc, l'affine seulement la **pente**.

### 3.4 Rayon de validité
```
affine : erreur relative ≈ |z|/|2Z|        ⟹ valide si |z| < ε·|A|
padé   : erreur relative ≈ (|z|/|2Z|)²      ⟹ valide si |z| < √ε·|A|
```
Gain théorique de rayon : `R_padé / R_affine ≈ 1/√ε` (~1e8 en float64, ~4000 en float32). **C'est le seul argument quantitatif en faveur de Padé** : rester valide à `|z|` plus grand, donc sauter plus loin près de l'échappement, là où l'affine retombe en pas-à-pas.

### 3.5 Application avec garde-fou pôle
```
den = 1 + D·z
si |den| < SEUIL_POLE (≈ 1e-2) :
    faire un PAS EXACT à la place      # évite l'explosion près du pôle
sinon :
    z ← (A·z + B·c) / den
```

---

## 4. Les TROIS BUGS découverts au prototypage (partie la plus importante)

> Ces trois erreurs produisent toutes le **même symptôme** : artefacts massifs (forme « satellisée », motifs répétés), **identiques entre affine et Padé**, et **insensibles à ε**. Si tu observes ça, c'est l'un de ces trois bugs, PAS la logique Padé vs affine.

### Bug 1 — Saut démarré sur `Z ≈ 0`
**Cause.** La référence commence à `Z_0 = 0`, donc `A_0 = 2·Z_0 = 0`. Un accumulateur `Acc ← A_0·Acc` devient nul et **annihile tout le bloc**. Or `Z ≈ 0` se reproduit **à chaque rebasing** (qui remet `m = 0`). Résultat : des blocs faux recollés partout.
**Correctif.** Refuser de démarrer un bloc si `|Z_m| < 1e-10`. Faire des pas exacts tant que `Z` est petit.

### Bug 2 — Saut trop court (zone quadratique)
**Cause.** Un bloc de 2 pas près de l'origine peut donner un résultat **purement quadratique** (ex. vérifié : après 2 pas depuis Z=0, `z = c²` exactement, le terme linéaire s'annule). Une carte **linéaire ne peut pas** représenter ça → erreur relative de 100 %, à tout ε.
**Correctif.** `MINSKIP = 4` : ne jamais sauter moins de 4 pas, faire le reste en perturbation exacte. (C'est le « merge and cull » de mathr : on jette les niveaux 1-2 pas de la table.)

### Bug 3 — Référence en float32 nu
**Cause.** Stocker `Z_n` en float32 (~7 chiffres) viole la règle d'or « la référence doit être plus précise que le delta ». Dès qu'on zoome, l'erreur de référence noie le delta → **glitch global identique dans les deux modes**.
**Correctif.** Stocker `Z` en **double-single** : `hi = fround(Z)`, `lo = Z − hi`, reconstruit `Z = hi + lo`. Donne ~14 chiffres. (Note : si l'arithmétique du delta reste en float32, le plafond de profondeur reste float32 — pour aller plus loin, arithmétique double-single complète dans le shader.)

### Bugs secondaires constatés
- **Coefficient `B` non propagé** (`B ≈ 1` approximé, ou `B·0` annulé à l'application) → orbite divergente. `B` doit être accumulé exactement (`B_z = A_y·B_x + B_y`).
- **`ε` exposé comme paramètre libre sur trop de décades.** `ε` est fixé par la précision machine (~1e-6 float32). Le laisser monter à 1e-2 produit des images cohérentes mais fausses. Borne recommandée : `[1e-8, 1e-4]` en float32.
- **Index de référence non resynchronisé** après un saut avant le test de rebasing → borner `m` et relire `Z_m` avant le test.

---

## 5. Précision numérique

| Donnée | Précision requise | Implémentation |
|---|---|---|
| Référence `Z_n` (calcul) | haute (bigfloat) au centre | lib arbitraire précision CPU |
| Référence `Z_n` (stockage GPU) | > delta | **double-single hi+lo** (4 canaux RGBA float) |
| Delta `z` (arithmétique) | float32 suffit jusqu'à ~1e-6 ; float64/double-single au-delà | selon profondeur visée |
| Dénominateur Padé `1+D·z` | surveiller `|·| → 0` | garde-fou pôle §3.5 |

Règle d'or : **la référence doit toujours être plus précise que le delta.** Sinon glitch global (Bug 3).

Plage de profondeur réaliste :
- float32 delta + référence double-single : jusqu'à ~`1e-6`.
- float64 (ou double-single complet) delta : bien au-delà ; ajouter rescaling/floatexp dès que `|z|` ou `|c|` approche ~`1e-300` (underflow).

---

## 6. Pseudocode validé (boucle de rendu par pixel)

> Version « accumulation à la volée » (sans table hiérarchique précalculée) : plus lente mais plus simple et lisible. Pour la perf, remplacer la boucle d'accumulation par un lookup dans une table de merge précalculée (§2.2 / §3.3).

```
fonction render_pixel(c):
    z = 0
    m = 0                      # index référence
    iter = 0
    MINSKIP = 4
    POLE = 1e-2
    boucle (jusqu'à iter >= maxIter):

        # --- 1) tenter d'accumuler un bloc ---
        Z0 = Z[m]
        canSkip = |Z0| > 1e-10                 # BUG 1 : pas de départ sur Z≈0
        l = 0
        Acc = 1 ; Bcc = 0 ; Dcc = 0
        si canSkip:
            pour k de 0 à min(maxSkip, reste_ref)-1:
                Zk = Z[m+k]
                Ak = 2·Zk
                si |Ak| < 1e-10 : break          # bloc s'arrête avant un Z≈0
                zk = Acc·z + Bcc·c               # delta réellement propagé (BUG: tester ça, pas |z|·|Acc|)
                lim = (mode==PADE ? sqrt(ε) : ε) · |Ak|
                si |zk| > lim : break            # rayon de validité dépassé
                # composition d'un pas
                Acc = Ak·Acc
                Bcc = Ak·Bcc + 1                 # BUG: B doit être propagé exactement
                Dcc = Dcc + Acc_avant·(−1/Ak)    # Padé : D_z = D_x + A_x·D_y
                l = k+1

        # --- 2) appliquer ---
        si l >= MINSKIP:                          # BUG 2 : saut minimum
            num = Acc·z + Bcc·c
            si mode == PADE:
                den = 1 + Dcc·z
                si |den| < POLE:
                    z = 2·Z[m]·z + z² + c ; m += 1 ; iter += 1     # pas exact (garde-fou pôle)
                sinon:
                    z = num / den ; m += l ; iter += l
            sinon:  # AFFINE
                z = num ; m += l ; iter += l
        sinon:
            z = 2·Z[m]·z + z² + c ; m += 1 ; iter += 1             # pas exact

        # --- 3) bailout + rebasing ---
        m = min(m, refLen-1)
        full = Z[m] + z
        si |full|² > bailout² : break             # échappé
        si |z|² > |full|²  ou  m >= refLen-1:
            z = full ; m = 0                       # rebasing

    # --- coloration ---
    full = Z[m] + z
    si |full| > 2 : μ = iter + 1 − log2(log|full|) ; couleur(μ)
    sinon : couleur_intérieur
```

> Attention à l'ordre dans le calcul de `Dcc` : `D_z = D_x + A_x·D_y` utilise `A_x` = l'accumulateur **avant** la mise à jour de ce pas. Stocker `Acc_avant` avant d'écraser `Acc`.

---

## 7. Plan d'intégration recommandé (pour Claude Code)

**Étape 0 — base.** Perturbation + rebasing + coloration lissée, SANS saut. Vérifier que l'image est correcte. C'est la vérité-terrain.

**Étape 1 — BLA affine.** Ajouter l'accumulation de bloc affine (`A`, `B`) avec les invariants Bug 1 / Bug 2. Comparer pixel-à-pixel à l'étape 0 : différence doit être sous le seuil de bruit. Mesurer les itérations économisées.

**Étape 2 — Padé.** Ajouter `D` (seed `−1/2Z`, composition `D_z = D_x + A_x·D_y`) + garde-fou pôle. Comparer à l'affine. **Attendre une différence quasi nulle en zones lisses** (normal).

**Étape 3 — validation du gain Padé.** Implémenter un **mode différence** : colorer `|z_padé − z_affine|` ou l'écart du nombre d'itérations. C'est le seul moyen de voir *où* Padé agit (zones de fort `z` : détail fin, bords). Benchmarker itérations sautées sur 3 classes de localisation : spirale lisse / minibrot / proche-échappement.

**Étape 4 — décision.** Si Padé ne gagne que sur les zones critiques : stratégie **hybride** (affine par défaut, Padé sur segments marqués). Si Padé est globalement plus lent ou glitche de façon non corrigeable : l'abandonner est un résultat acceptable (cohérent avec l'échec de NanoMB2).

**Étape 5 — perf (optionnel).** Remplacer l'accumulation à la volée par une **table de merge hiérarchique** précalculée (O(M)), construite une fois par référence. C'est ce qui rend la BLA réellement rapide en production.

---

## 8. Critères de succès / d'échec

- ✅ **Succès Padé** : sur localisations « minibrot » ou « proche échappement », Padé saute ≥ 30 % d'itérations de plus que l'affine, sans artefact (rebasing corrige les rares glitchs).
- ❌ **Échec attendu possible** : en zones lisses, Padé = affine mais plus coûteux (division). Si c'est le cas partout, le coût de la division n'est pas justifié → hybride ou abandon.
- 🚩 **Drapeau rouge (bug, pas limite physique)** : artefacts identiques affine/Padé + insensibles à ε → revoir Bugs 1/2/3 §4.
- 🚩 Fréquence de rejet de pôle > ~10 % des applications → le pôle est mal placé, revoir le seed `D` ou passer en hybride.

---

## 9. Sources

- **BLA / perturbation / rebasing (documenté, fiable)** : Claude Heiland-Allen, *Deep Zoom* — mathr.co.uk/web/deep-zoom.html ; *Deep zoom theory and practice* (2021, 2022) sur le même site. Robert Munafo, Mu-Ency — mrob.com/pub/muency/. Zhuoran, fil fractalforums.org (origine BLA + rebasing, fin 2021). Phil Thompson, philthompson.me (implémentation JS commentée, 2022-2023).
- **Padé [1/1] (seed, composition, rayon √ε)** : dérivation originale de ce travail, **non publiée ni validée**. À cross-checker auprès de la communauté avant tout usage en production.
- **Inspirations approximateurs** : TC-Padé (arXiv:2603.02943, Padé trajectoire-consistant, idée de coefficients data-driven + seuil de stabilité) ; Lawson's iteration (arXiv:2401.00778, meilleur [1/1] minimax complexe — surdimensionné en pratique vs seed analytique).
- **Échec connu du saut d'ordre supérieur** : NanoMB2 / biséries chaînées (knighty et al.), documenté comme échouant par absorption catastrophique — mathr.co.uk/blog/2021-05-14_deep_zoom_theory_and_practice.html.

---

*Rappel d'honnêteté intellectuelle : §1, §2, §4 (bugs), §5, §6 sont solides et documentés/vérifiés. §3 (Padé) est spéculatif. La valeur de ce document tient autant aux invariants du §4 — qui s'appliquent à toute implémentation BLA, Padé ou non — qu'à l'hypothèse Padé elle-même.*
