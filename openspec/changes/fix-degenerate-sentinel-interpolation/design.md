# Design — résolution de sentinelles consciente du rang

## Contexte

La passe `resolve.wgsl` transforme chaque pixel sentinelle en une valeur lisse en interpolant bilinéairement les 4 coins de sa cellule de grille (au pas `step` encodé dans la valeur de la sentinelle), avec une remontée vers des niveaux plus grossiers quand la cellule est inutilisable. `color.wgsl::sample_escaped_bilinear` fait la même chose pour le chemin live magnifié pendant le zoom.

Convention des coins (index 0..3) et poids bilinéaires en fonction de la position fractionnaire `(fx,fy)` dans la cellule :

```
0 = (0,0)  w0 = (1-fx)(1-fy)      0───────1
1 = (1,0)  w1 = fx(1-fy)          │       │
2 = (0,1)  w2 = (1-fx)fy          │       │
3 = (1,1)  w3 = fx·fy             2───────3
```

État d'un coin (couche 0 = `iter`, couches 2/3 = `z`) :

| état | test | rôle dans l'interpolation actuelle |
|------|------|-------------------------------------|
| échappé (résolu)     | `iter > 0 ∧ |z|² ≥ mu` | accumulé dans `wEscaped` |
| intérieur (résolu)   | `iter == 0`            | accumulé dans `wInside` |
| budget épuisé (transitoire) | `iter > 0 ∧ |z|² < mu` | ignoré (`continue`) |
| sentinelle (transitoire)    | `iter < 0`             | ignoré (`continue`) |

## Le problème : dégénérescence par renormalisation

L'interpolation renormalisée `V = Σ_{i∈S} wᵢ vᵢ / Σ_{i∈S} wᵢ` (où `S` = coins échappés) est toujours une combinaison convexe — donc **jamais hors plage** (jamais une « mauvaise couleur ») — mais elle **perd des dimensions spatiales** selon la géométrie de `S` :

```
rang = (S couvre 2 colonnes ? 1 : 0) + (S couvre 2 lignes ? 1 : 0)

rang 0  ⟺ |S| = 1                    ⟹ V constant         → CARRÉ PLAT (le défaut)
rang 1  ⟺ S sur une seule arête      ⟹ dégradé 1-D         → bandes
rang 2  ⟺ S couvre 2 lignes + 2 col. ⟹ dégradé 2-D         → lisse
         dont la diagonale (|S|=2)   ⟹ rationnel singulier  → fragile
```

Juste après une étape de raffinement, la structure de grille nichée garantit que **chaque cellule fine de pas `S` contient exactement 1 ancien ancre `2S` (déjà calculé) et 3 nouveaux ancres** (milieux d'arêtes + centre). Tant que les nouveaux ancres ne sont pas échappés, `|S| = 1` partout → rang 0 → carrés plats sur tout l'image.

Le code actuel (`resolve.wgsl:345-403`) retourne dès que `wTotal > 1e-6`, c.-à-d. accepte rang 0 et rang 1. Il ne remonte (`step_u *= 2`) que si **aucun** coin n'est fini. C'est la racine du défaut.

## Décision : critère équilibré « ≥ 3 coins résolus, sinon remonter »

On compte les coins **résolus** = échappés **ou** intérieurs (les deux états finaux). On rend la cellule à son niveau courant **si et seulement si** elle a **≥ 3 coins résolus** ; sinon on remonte au niveau `2S` et on réessaie.

```
nResolved = nEscaped + nInside        // comptage de coins, pas de poids

si nResolved >= 3 :
    rendre à ce niveau :
        si wInside > wEscaped : copie du coin intérieur dominant   (intérieur = plat légitime)
        sinon si wEscaped>1e-6 : interpolation des coins échappés
        sinon si hasFinished  : copie firstFinishedCoord            (repli poids nul)
sinon :
    step_u *= 2   (remonter — le niveau grossier a plus de coins résolus)
```

### Pourquoi compter les coins *résolus* et pas seulement *échappés*

C'est la propriété cruciale de correction. Un coin **intérieur** (`iter==0`) est un état **final**, pas transitoire. Si on ne comptait que les coins échappés, une cellule de bord convergée avec 2 échappés + 2 intérieurs aurait `nEscaped = 2 < 3` et **remonterait indéfiniment**, dégradant l'image finale au bord du set.

En comptant les résolus :

- Une cellule ne peut avoir `nResolved < 4` **que si** au moins un coin est encore sentinelle ou budget épuisé — c.-à-d. **uniquement en transitoire**. À convergence, chaque coin finit échappé ou intérieur, donc `nResolved == 4` partout.
- Donc `nResolved >= 3` est toujours vrai à convergence ⟹ **aucune remontée ⟹ aucun impact sur l'image finale**. Le changement ne touche que les frames transitoires.

### Pourquoi le seuil 3 (et pas 2 ni 4)

- `nResolved >= 3` ⟹ rang 2 garanti (impossible de placer 3 coins sur 4 sur une seule ligne) ⟹ pas de carré plat, pas de bandes, pas de diagonale fragile.
- Le seuil 4 (strict) remonterait sur toute cellule à 3 coins résolus — aperçu plus grossier sans gain de correction (3 coins résolus donnent déjà un rang 2 honnête).
- Le seuil 2 (permissif) laisserait passer la diagonale fragile et les bandes.

Cas résiduel accepté (rare, transitoire) : `nResolved == 3` avec 2 échappés + 1 intérieur et `wEscaped > wInside` ⇒ interpolation à 2 coins échappés (bandes) sur un coin de cellule. Toléré : c'est une cellule de bord transitoire, le défaut visible majeur (carrés plats en extérieur coloré) est éliminé.

### La remontée converge vers un niveau lisse

Le niveau grossier `2S` a pour coins les anciens ancres `2S`, calculés **avant** les ancres `S` (la grille se raffine du grossier au fin). Ils sont donc résolus plus tôt ⟹ le niveau de remontée a typiquement ses 4 coins résolus ⟹ dégradé lisse. Les gardes existantes (`level < 10`, `step_u >= dims.x|y` → `discard`) bornent la boucle.

## Chemin d'affichage magnifié (`color.wgsl::sample_escaped_bilinear`) — pas de changement

Constat à l'implémentation : ce chemin n'échantillonne **pas** la grille de sentinelles brute. Le bind group color lie `tex` à `resolvedTexture` (chemin live, `Engine.ts` ≈ ligne 2705) et `texFrozen` à `frozenTexture` (snapshot d'une `resolvedTexture` antérieure, `color.wgsl:1370`) — toutes deux déjà passées par la passe resolve corrigée par le rang. Les texels sources sont donc lisses par texel ; la fonction ne fait que lisser la magnification entre texels adjacents.

Conséquences :

- La remontée d'empreinte initialement envisagée (échantillonner au pas de grille supérieur) est **sans objet** : il n'y a pas de grille d'ancres grossière dans une texture résolue, ni de sentinelles à éviter.
- Les cas dégénérés résiduels sont déjà couverts : `wInside > wEscaped` fait retomber sur le plus proche dès que l'intérieur domine (cas le plus courant au bord du set). Un `nEscaped == 1` qui franchit cette garde exige 3 coins no-data/budget — c.-à-d. les trous transitoires des swaps frozen.
- Or ces trous sont **remplis intentionnellement** par l'interpolation à peu de coins (commentaire `color.wgsl:1170`) pour masquer le flashing pendant les swaps frozen↔live. Un seuil strict `nEscaped >= 3` réintroduirait ce flashing.

Décision : **ne pas modifier `color.wgsl`**. La correction est héritée à la source (passe resolve) ; les gardes existantes et le remplissage anti-flash sont conservés. Le critère de rang de la passe resolve suffit à supprimer les carrés plats signalés.

Évolution future possible (hors scope) : faire échantillonner au color une seule source de vérité rank-corrigée et unifier live/frozen — non nécessaire pour ce correctif.

## Alternatives écartées

- **Calculer les nouveaux ancres en une frame (sans budget)** : casse la conception progressive limitée par budget ; pics de coût en deep zoom.
- **Mélanger fin + grossier par confiance** : plus lisse aux transitions mais ajoute un échantillonnage du niveau grossier à chaque pixel ; gain marginal vs. la remontée simple.
- **Compter les coins à poids non nul** : le poids ne s'annule que sur les arêtes (mesure nulle) ; le comptage par état est plus robuste et plus simple.

## Risques

- Léger surcoût de remontée sur frames transitoires (borné). À mesurer mais attendu négligeable.
- Cellules de bord transitoires (`nResolved==3`, 2 échappés) : bandes résiduelles tolérées.
- `color.wgsl` inchangé : le chemin magnifié hérite de la correction via `resolvedTexture`/`frozenTexture`. Pas de risque de régression sur ce chemin.
