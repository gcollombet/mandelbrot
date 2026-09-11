## Context

Le producteur actuel calcule une grille polaire par blocs puis capture du RGB. Les fichiers v5 contiennent des octaves WebP. Le display set est un cache d'affichage : values 12 octets, geometry 8, metadata 4, orbit gradients 8, trap 16. Il ne constitue pas encore un format géométrique invariant de 48 octets.

## Goals / Non-Goals

**Goals:** source persistante réutilisable ; densités indépendantes ; export 4K avec AA spatial ; palette et temps indépendants du calcul d'orbite ; rotation complète ; transformations créatives ; budget RAM/GPU borné ; couronnes vidéo synchronisées ; reprise et annulation sûres.

**Non-Goals:** transformer un ancien RGB en géométrie ; changer les paramètres du calcul d'orbite sans recalcul ; garantir un débit temps réel ; promettre un disque borné indépendamment de la profondeur ; garantir l'équivalence de l'AA spatial et de l'AA analytique Taylor.

## Decisions

### Validation préalable du format

Avant toute publication d'un format persistant, examiner les pertes de la chaîne calcul → resolve → display set → couleur. Exécuter `node openspec/changes/add-persistent-shader-expmap-export/experiments/display-fidelity.mjs`. Un contre-exemple à l'adaptation du display set arrête l'implémentation de ce format ; une convention différente doit être choisie et validée avant la chaîne complète.

Ne pas présenter une simple conversion de rgba16float en rgba32float comme une correction : les clamps existent déjà dans le calcul des valeurs, avant l'écriture des textures.

### Source persistante et budgets

Fichiers binaires segmentés indépendants des dimensions WebP, avec identités de contenu, coordonnées logiques et publication transactionnelle. Le manifeste versionne l'ABI, les unités, la convention géométrique, les densités, les paramètres d'orbite et les ressources de matériaux. Les paramètres purement visuels sont modifiables ; ceux qui changent les données nécessitent une nouvelle source.

Choisir séparément densité angulaire et radiale. Les coûts sont proportionnels à leur produit. Les anciens documents v5 continuent d'utiliser une densité commune. Les gros blocs ne sont jamais assemblés en un ArrayBuffer représentant le document entier.

### Couronnes et fenêtre glissante

Choisir le plus grand N utile compatible avec le budget total, en comptant N+2 octaves pour un zoom classique, halos, sorties, AA, transfert, centre et marge. Les couronnes restent fixes dans l'écran ; la fenêtre de données glisse selon les timestamps exacts. Une octave en cours de lecture GPU ne peut être évincée. Attendre les données requises avant d'émettre une frame.

Si N=1 ne tient pas, découper davantage les données en blocs angulaires/radiaux et accumuler les contributions, plutôt que réduire silencieusement la qualité. Pour les déformations, déterminer les plages effectivement consultées et les traiter en plusieurs passes ; N+2 n'est pas une preuve de couverture universelle.

### Rendu et composition

Les passes de couronne partagent positions des échantillons AA, instants, caméra et état des matériaux. Rendre avec halos et contributions pondérées en lumière linéaire ; composer avant transfert sRGB et encodage final. Un framebuffer opaque par couronne sans poids de couverture n'est pas suffisant. La fermeture centrale reste un calcul explicite.

Les intermédiaires sans perte sont propres à une recette vidéo ; seule la source géométrique est réutilisable avec une nouvelle vitesse ou palette. Prévoir reprise par segments et suppression des intermédiaires consommés appartenant à la session.

## Risks / Trade-offs

- Géométrie écrêtée → valider un format conservant l'information avant de promettre la fidélité.
- Source trop peu dense pour une déformation → estimer l'empreinte du filtre et distinguer filtrage et détail absent.
- Bibliothèque de plusieurs centaines de Go → vérifier espace, reprise et publication atomique sans chargement global.
- Comparaison GPU absente → ne pas déduire la fidélité visuelle de tests numériques ou Naga.
- Matériaux dépendant de la vue → fixer la convention de transformation des normales et de l'éclairage, au lieu de supposer que la composition RGB et le shading après déformation sont équivalents.

## Migration Plan

Ajouter un profil distinct. Conserver lecture et écriture RGB v5. Ne livrer le choix « shader complet » qu'une fois le producteur, le lecteur, la composition et les validations réellement disponibles.

## Essai autorisé le 2026-09-12

Déplacer la saturation visuelle à 64 après adaptation à la vue, en gardant les textures 16 bits et une limite technique à 65504 dans resolve et merge. Les protections de domaine et les exposants bornés restent présents. Cette convention expérimentale conserve 48 octets mais ne résout pas toutes les limites de plage ; valider sur GPU avant de la qualifier de format fidèle.

## Open Questions

- Format géométrique avant écrêtage et précision suffisante : quels champs et quelle taille réelle par échantillon ?
- Quelle tolérance visuelle est acceptable par rapport au rendu direct après transformation ?
- La limite indicative de 400 Go pour 4K ×10^100 est-elle un objectif strict ou peut-elle augmenter si le format fidèle le requiert ?
