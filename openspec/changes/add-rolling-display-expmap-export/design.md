## Context
Le change `add-expmap-cache-video-export` livre les documents RGB persistants, leur bibliothèque, lecteur et export. Les matériaux dépendant de la vue exigent de conserver la géométrie puis de refaire le shading. Le display set complet représente 48 octets par texel ; cette seconde livraison conserve seulement une fenêtre de travail temporaire sur disque.

## Goals / Non-Goals
- Exporter un zoom à centre fixe avec les matériaux existants et une occupation RAM/GPU/disque bornée.
- Réutiliser projection, planification, stockage segmenté et ordonnanceur vidéo du premier change.
- Conserver `color.wgsl` sans modification sous réserve de valider l'adaptation des données.
- Hors périmètre : document géométrique complet persistant, compression, réduction du display set, lecture libre de tout le parcours et inversion de sens dans une animation. La première version accepte zoom entrant monotone, pauses et rotations.

## Decisions
### Dépendance explicite et interface distincte
Cette livraison dépend du premier change. Elle ajoute une source vidéo « Calcul avec cache temporaire » distincte d'une image RGB enregistrée. Ses recettes peuvent être sauvegardées, mais elles ne constituent pas un document rejouable. Le lecteur RGB et ses garanties restent inchangés.

### Display set complet brut
Conserver les plans existants et leurs formats : itérations/zx/zy (12 octets), géométrie rgba16float (8), métadonnées r32uint (4), gradients orbitaux rgba16float (8), trap rgba32float (16), soit 48 octets par texel hors index, alignement et buffers. Le manifeste versionne formats, conventions, configuration de calcul et génération des blocs. Aucun canal optionnel n'est supprimé dans cette première version.

### Fenêtre de couverture et centre fini
Le planificateur déduit la profondeur visible de la résolution, du rayon extérieur et de l'empreinte du filtre. À 4K, environ 13 doublements couvrent jusqu'au demi-pixel central ; 2–3 doublements supplémentaires donnent une cible indicative de 15–16, jamais une constante de validité. Chaque frame exige aussi une fermeture centrale finie calculée et valide. Les coordonnées profondes conservent une représentation à exposant, sans conversion globale en float32.
Le producteur avance les rayons successifs. Le lecteur attend toutes ses contributions, y compris le centre, avant d'émettre une frame. La réserve permet l'anticipation, sans promettre un calcul temps réel.

### Adaptateur géométrique avant shading
Un prototype est une condition de poursuite : vérifier les unités de gradient, courbure, hauteur, données orbitales et leur transformation vers la vue cible. Les clamps et la quantification déjà appliqués peuvent avoir perdu de l'information ; une simple remise à l'échelle ne garantit donc pas l'équivalence avec un calcul direct. Le stockage doit choisir une convention et une plage de validité démontrées. Si les données existantes ne suffisent pas, consigner le résultat et revoir la conception avant implémentation du pipeline complet, sans changer silencieusement color.
L'AA analytique utilisant des données Taylor absentes ne peut être promis ; le profil utilise une reconstruction spatiale explicitement distincte. La fidélité des matériaux doit être comparée à la référence directe sur GPU.

### Roulement transactionnel
Les indices radiaux logiques sont indépendants des emplacements physiques. Chaque emplacement porte une génération. Un bloc devient lisible après écriture et publication complètes ; il reste épinglé tant qu'un lecteur CPU, transfert ou travail GPU l'utilise. Il n'est recyclé que lorsqu'aucune future frame du parcours monotone ne le nécessite. Des demandes hors fenêtre conservée sont refusées explicitement.
Les budgets incluent blocs actifs, réserve, fermeture centrale, écriture temporaire, readback et transferts simultanés. Une insuffisance disque ou un producteur lent suspend la consommation ou arrête proprement ; aucun bloc manquant n'est substitué.

### Cycle de vie et reprise
Conserver les timestamps et le sink vidéo existants. Une annulation libère les ressources et supprime les fichiers temporaires selon leur propriété. Les checkpoints décrivent la fenêtre encore présente et les générations validées. Une reprise vérifie cette couverture ; elle ne promet ni reconstruction des blocs expirés sans recalcul ni append arbitraire à un fichier vidéo finalisé. L'interface distingue reprise du calcul et reprise éventuelle de l'encodage selon le sink.

## Risks / Trade-offs
- Les données normalisées/clampées peuvent empêcher la fidélité recherchée → prototype de l'adaptateur avant développement complet.
- 48 octets par texel restent coûteux → estimation de toute la fenêtre et préflight disque, aucune promesse fondée sur le seul débit nominal SSD.
- Le calcul peut être moins rapide que l'animation → export déterministe avec attente et backpressure.
- Roulement concurrent → générations, références épinglées et publication atomique, tests de consommateurs retardés.

## Migration Plan
Livrer après validation du parcours RGB. Ajouter un mode explicite derrière la validation de l'adaptateur. Ne migrer aucun document RGB. Versionner les fichiers temporaires et nettoyer uniquement ceux dont la propriété est établie.

## Open Questions
- Quelle convention de stockage permet l'adaptation géométrique fidèle malgré les clamps existants ?
- Quels budgets et quelle réserve conviennent au matériel réel ?
- Quels matériaux et niveaux d'AA passent la comparaison de référence ?
Ces points sont des portes de validation, pas des garanties acquises.
