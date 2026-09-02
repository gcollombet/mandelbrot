## Context

L'export actuel produit les frames dans l'ordre temporel sur une surface unique de taille `sortie × supersample`. Cette organisation conserve bien l'historique frozen/live entre deux frames, mais une sortie 4K en ×4 ou ×8 dépasse rapidement `maxTextureDimension2D` et la mémoire GPU disponible.

Un rendu naïf « frame, puis toutes ses tuiles » résout la taille de texture mais détruit la réutilisation temporelle : à chaque retour sur une tuile, son champ progressif devrait être restauré ou recalculé. L'ordre inverse — rendre tout le film d'une tuile avant de passer à la suivante — conserve naturellement l'historique GPU de cette tuile. Les frames du parcours sont déjà placées par un temps absolu, donc leur résultat ne dépend pas de l'ordre global de production.

Le moteur ne possède actuellement que deux emplacements de référence, actif et en préparation. Un zoom à centre fixe peut garder la même origine de référence pendant tout le film et seulement prolonger son orbite lorsque la profondeur augmente. Un travelling peut provoquer des recentrages ; cette première version les accepte, sans tenter de mémoriser et rejouer toute une chronologie de références.

La sortie intermédiaire ne doit pas être une suite d'images brutes : une minute de RGBA 4K occuperait des dizaines de Gio. Chaque tuile est donc réduite à sa résolution finale puis encodée dans un MP4 mezzanine à haut débit. Une seconde passe décode, compose et encode la vidéo finale.

## Goals / Non-Goals

**Goals:**

- Permettre les exports 4K supersamplés même lorsque la surface complète excède les limites de texture ou de mémoire GPU.
- Borner la mémoire GPU à la surface d'une seule tuile et la mémoire de composition à un petit groupe de frames finales.
- Conserver la réutilisation temporelle du champ progressif pendant toutes les frames d'une tuile.
- Réutiliser la même référence orbitale chaude pour un zoom à centre fixe, y compris entre deux tuiles.
- Accepter les parcours avec travelling ou rotation, avec une performance éventuellement inférieure mais sans dégradation silencieuse de correction.
- Éviter les coutures provenant de la projection, du filtre de réduction et des bords de blocs du codec intermédiaire.
- Maintenir un budget disque prévisible, exprimé comme débit agrégé de toutes les vidéos intermédiaires.
- Conserver le chemin d'export non tuilé et son résultat actuel.

**Non-Goals:**

- Mettre en cache sur disque une chronologie générale de références et de tables BLA/Jet/Mobius.
- Garantir qu'un travelling coûte autant qu'un zoom à centre fixe.
- Produire un intermédiaire mathématiquement sans perte ; la première passe est un mezzanine avec perte contrôlée.
- Ajouter un nouveau codec vidéo ou dépendre d'un outil natif externe comme FFmpeg.
- Garder toutes les vidéos de tuile ou tous leurs décodeurs ouverts simultanément.

## Decisions

### 1. L'ordre de production est tuile-majoritaire

La boucle extérieure parcourt les tuiles ; la boucle intérieure parcourt toutes les frames du film. Chaque tuile possède donc un historique progressif continu pendant le parcours.

```text
plan de tuiles
    │
    ├─ tuile 0 : frame 0 → frame N-1 → MP4 0
    ├─ tuile 1 : frame 0 → frame N-1 → MP4 1
    └─ ...
                         ↓
            composition par blocs de frames
                         ↓
                    MP4 final
```

Alternative écartée : parcourir toutes les tuiles de chaque frame. Cette variante partage facilement la référence courante, mais exige de sauvegarder l'ensemble du champ GPU de chaque tuile entre les frames ; elle réintroduit précisément le coût mémoire que le tuilage doit éliminer.

### 2. La caméra reste globale ; seule la projection de pixels est tuilée

Le navigateur continue de produire la caméra globale `(cx, cy, scale, angle)` pour la frame. Une tuile est décrite par un rectangle entier dans l'image finale :

```text
fullFrame = (W, H)
core      = (x, y, width, height)
expanded  = core + halo, limité aux bords de fullFrame
```

Le centre d'un pixel local est converti en coordonnée de pixel globale avant l'application de l'aspect, de l'échelle et de la rotation. Le navigateur n'est jamais déplacé au centre de la tuile. Cette séparation rend les raccords exacts et permet à toutes les tuiles d'utiliser la même référence globale.

Les calculs de domaine de référence et `viewportAspect` utilisent l'image complète, pas le rectangle local. La surface GPU et le nombre de workgroups utilisent en revanche la taille de `expanded` multipliée par le supersampling.

Alternative écartée : modifier `cx/cy` pour placer la caméra au centre de chaque tuile. Cela ferait dépendre les recentrages de référence du découpage et rendrait la réutilisation entre tuiles imprévisible.

### 3. Le halo traverse l'encodage intermédiaire

Chaque tuile possède un coeur qui partitionne exactement l'image et un halo de pixels finals. Le halo couvre au minimum le support du filtre de réduction et une marge codec configurable. La tuile étendue est calculée, réduite et encodée telle quelle. Elle n'est rognée qu'après décodage, lors de la composition finale.

Conserver le halo jusque-là protège à la fois :

- les taps du filtre Mitchell proches du bord du coeur ;
- les gradients et reconstructions qui lisent un voisinage ;
- les pixels du coeur contre le comportement particulier des blocs situés au bord d'une image vidéo.

Les halos ne sont jamais mélangés entre tuiles : le compositeur copie uniquement le coeur de chaque vidéo dans sa destination exacte.

### 4. Le supersampling est résolu avant le mezzanine

La surface locale est rendue à `expanded × supersample`. Le chemin de présentation existant réduit en lumière linéaire et convertit ensuite en sRGB. Le `VideoFrame` intermédiaire possède seulement la taille finale de la tuile étendue.

Le facteur ×4 ou ×8 affecte donc le temps de calcul et la mémoire GPU de la tuile, mais pas directement le débit ni la résolution cumulée des vidéos temporaires.

### 5. Une seule session moteur couvre toutes les tuiles

La session d'export est ouverte une fois, puis sa projection locale change entre les tuiles. Une nouvelle opération moteur réinitialise le champ progressif, les compteurs de convergence, l'accumulation AA et les caches de présentation de la tuile sans appeler `resetReference`, sans recréer le worker et sans vider l'orbite ou les tables actives.

Pour chaque tuile, le navigateur est replacé exactement sur A et la transition A→B est recréée. `elapsedForFrame` reste la source d'horloge absolue.

Sur un zoom à centre fixe, la première tuile construit ou prolonge l'orbite jusqu'à la profondeur maximale. Les suivantes repartent depuis A avec cette référence déjà chaude. Le retour à une échelle moins profonde ne doit ni raccourcir l'orbite disponible ni invalider ses tables déjà compatibles.

Une tuile excentrée subit localement une translation pendant un zoom autour du centre global. Le planificateur réserve donc, dans les limites GPU choisies, une enveloppe temporelle contenant les empreintes du coeur aux deux extrémités d'un cycle frozen/live. Il réduit d'abord modérément le coeur, puis abaisse le seuil de cycle si le seuil demandé ne tient toujours pas. Le moteur utilise ce seuil sûr par tuile ; seul un travelling, une rotation ou un saut de frame dépassant l'enveloppe force une reconstruction spatiale exacte. La référence orbitale et ses tables restent chaudes dans tous les cas.

Sur un travelling, le worker conserve son comportement normal : il peut recenter et reconstruire la référence. Le rendu reste accepté et correct, mais ces reconstructions peuvent se répéter pour chaque tuile. Aucun chemin rapide ne doit être obtenu en utilisant une référence hors de son domaine certifié.

### 6. Le plan de tuiles est déterministe et piloté par les limites

Le planificateur choisit la plus grande taille de coeur qui respecte simultanément :

- `maxTextureDimension2D` après supersampling et ajout du halo ;
- un budget de mémoire GPU sélectionné ou estimé ;
- les alignements nécessaires à la capture et au codec ;
- une partition entière de `[0,W) × [0,H)` sans trou ni chevauchement des coeurs.

Les petites tuiles de droite et du bas sont autorisées. Le plan complet est figé avant le premier rendu et stocké dans le manifeste de session. À paramètres identiques, il doit être identique.

Le moteur expose une estimation de son empreinte par texel à partir des ressources réellement allouées ; le planificateur ne duplique pas une constante approximative dans l'interface.

### 7. Le débit mezzanine est agrégé

L'utilisateur choisit ou accepte un débit intermédiaire total `B`. Chaque vidéo reçoit une part proportionnelle à la surface de sa tuile étendue :

```text
B_i = B × area(expanded_i) / Σ area(expanded_j)
```

La somme des débits demandés reste donc `B`, quel que soit le nombre de tuiles. Le volume estimé vaut `B × durée / 8`, augmenté d'une petite marge de conteneur. À 400 Mbit/s pendant 60 s, l'estimation affichée est environ 3,0 Go décimaux, indépendamment du facteur de supersampling.

Les intermédiaires utilisent un profil de qualité mezzanine distinct du profil final. Le codec est choisi parmi ceux déjà supportés après un test d'encodage et de décodage. Les keyframes sont alignées sur la taille des blocs de composition afin de permettre un décodage borné sans repartir arbitrairement loin dans le GOP.

Alternative écartée : attribuer `B` à chaque tuile. Le volume serait multiplié par le nombre de tuiles et rendrait l'estimation trompeuse.

### 8. Les temporaires sont écrits en flux et décrits par un manifeste

Les MP4 fragmentés sont écrits dans un magasin temporaire abstrait. OPFS est privilégié afin d'éviter un sélecteur de fichier par tuile ; une destination de répertoire explicitement choisie peut servir de repli. Avant le rendu, l'application vérifie le quota disponible et compare l'estimation au stockage libre avec une marge.

Le manifeste contient au minimum : version, empreinte des paramètres visuels et du parcours, géométrie complète, plan de tuiles, halo, supersampling, codec, débit agrégé, cadence, nombre de frames et liste des tuiles terminées. Une tuile n'est marquée terminée qu'après finalisation réussie de son MP4.

Une session interrompue peut reprendre les tuiles manquantes si son empreinte correspond exactement à la demande courante. Une demande incompatible crée une nouvelle session plutôt que de mélanger des résultats.

### 9. La composition est effectuée par blocs de frames

Ouvrir un décodeur matériel par tuile peut dépasser les limites du navigateur. La composition choisit donc un nombre `K` de frames finales compatible avec son budget mémoire :

```text
K × W × H × bytesPerPixel ≤ budgetComposition
```

Pour chaque bloc temporel de `K` frames :

1. allouer ou réutiliser `K` cibles 4K ;
2. décoder, avec un petit pool borné, les `K` frames correspondantes de chaque tuile ;
3. rogner le halo et copier le coeur dans chacune des cibles ;
4. lorsque toutes les tuiles du bloc sont placées, envoyer les `K` frames dans l'ordre au codeur final ;
5. recycler les cibles pour le bloc suivant.

Le timestamp final reste `frameIndex / fps` et la durée reste celle du pipeline actuel. La passe ne lance ni calcul fractal, ni convergence, ni AA.

### 10. Le résultat non compressé doit être invariant au découpage

Avant l'encodage intermédiaire, le coeur d'une tuile doit correspondre aux mêmes centres de pixels, paramètres de caméra, temps d'animation et filtre de réduction qu'un rendu monolithique. Les différences finales admises proviennent uniquement de la compression mezzanine puis finale.

Les validations comparent :

- un rendu monolithique et un rendu tuilé avant compression ;
- un encodage direct et un encodage à deux passes sur des vues à fort contenu haute fréquence ;
- les bandes autour de chaque couture, séparément du reste de l'image.

### 11. L'export historique reste un chemin séparé

Le mode non tuilé continue d'utiliser la boucle actuelle et un seul encodeur. Le nouveau coordinateur compose les mêmes primitives de session, convergence et capture, mais ne remplace pas silencieusement le chemin existant tant que le tuilage n'est pas requis ou choisi.

## Risks / Trade-offs

- **Deux générations de compression peuvent adoucir les filaments ou produire du ringing** → utiliser un profil mezzanine nettement plus qualitatif que la sortie finale, proposer un débit agrégé élevé et valider sur des plans fractals difficiles.
- **Des coutures apparaissent malgré une projection exacte** → conserver le halo jusque après décodage, mesurer les bandes de couture et dimensionner séparément le support de filtre et la marge codec.
- **Le navigateur refuse trop de sessions de décodage** → utiliser un pool borné et une composition par blocs alignés sur les keyframes.
- **Le quota temporaire est inférieur à l'estimation** → vérifier `navigator.storage.estimate()`, garder une marge, arrêter avant rendu si le stockage est insuffisant et finaliser chaque fichier fragmenté.
- **Un travelling reconstruit sa référence pour chaque tuile** → accepter le coût dans cette version, l'afficher dans les statistiques, et réserver un cache de chronologie de références à une évolution ultérieure.
- **Le retour de B vers A entre deux tuiles est pris pour un mouvement interactif et conserve un historique invalide** → réinitialiser explicitement le champ de tuile tout en préservant uniquement les ressources de référence compatibles.
- **Une modification de paramètres reprend des temporaires incompatibles** → inclure tous les paramètres influençant les pixels et l'encodage dans l'empreinte du manifeste.
- **La composition est longue à cause des réouvertures de GOP** → aligner keyframes et blocs, mesurer plusieurs tailles de bloc et conserver un petit pool de décodeurs.

## Migration Plan

1. Introduire les types de géométrie globale/tuile et le planificateur sans modifier le chemin existant.
2. Ajouter au moteur une projection de tuile et une réinitialisation du champ qui préserve la référence.
3. Produire d'abord des captures de tuiles non compressées et vérifier l'équivalence et les coutures.
4. Ajouter le magasin temporaire, le manifeste et l'encodage mezzanine en flux.
5. Ajouter le décodeur/compositeur borné, puis l'encodage final.
6. Exposer le mode dans l'interface derrière une option explicite ; conserver le chemin monolithique comme repli.
7. Après validation réelle WebGPU et comparaison visuelle, permettre au planificateur de sélectionner automatiquement le tuilage lorsque la surface monolithique est impossible.

Le rollback consiste à désactiver l'option tuilée : aucun format de preset ou contrat d'export existant n'est remplacé.

## Open Questions

- Quel débit mezzanine par pixel et par seconde rend la seconde génération imperceptible sur les palettes les plus contrastées ? Une base de 400 Mbit/s agrégés pour 4K30 doit être mesurée, pas considérée comme une garantie.
- Quelle marge codec minimale autour du coeur élimine les coutures pour chacun des codecs supportés ?
- Quel budget de composition par défaut offre le meilleur compromis entre mémoire, fréquence des keyframes et coût de réouverture des décodeurs ?
- OPFS doit-il être le seul stockage temporaire pris en charge en première version, ou faut-il livrer immédiatement le repli vers un répertoire choisi ?
