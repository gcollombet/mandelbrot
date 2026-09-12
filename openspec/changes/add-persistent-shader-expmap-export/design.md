## Context

Le producteur actuel calcule une grille polaire par blocs puis capture du RGB. Les fichiers v5 contiennent des octaves WebP. Le display set est un cache d'affichage : values 12 octets, geometry 8, metadata 4, orbit gradients 8, trap 16. Il ne constitue pas encore un format géométrique invariant de 48 octets.

## Goals / Non-Goals

**Goals:** source persistante réutilisable ; densités indépendantes ; export 4K avec AA spatial ; palette et temps indépendants du calcul d'orbite ; rotation complète ; transformations créatives ; budget RAM/GPU borné ; couronnes vidéo synchronisées ; reprise et annulation sûres.

**Non-Goals:** transformer un ancien RGB en géométrie ; changer les paramètres du calcul d'orbite sans recalcul ; garantir un débit temps réel ; promettre un disque borné indépendamment de la profondeur ; garantir l'équivalence de l'AA spatial et de l'AA analytique Taylor.

## Decisions

### Validation préalable du format

Avant toute publication d'un format persistant, examiner les pertes de la chaîne calcul → resolve → display set → couleur. Exécuter `node openspec/changes/add-persistent-shader-expmap-export/experiments/display-fidelity.mjs`. Le déplacement du clamp à 64, accepté après essai visuel par l'utilisateur, autorise l'implémentation du profil expérimental à 48 octets. La borne f16 reste une limite du domaine ; l'équivalence universelle n'est pas promise.

Ne pas présenter une simple conversion de rgba16float en rgba32float comme une correction : les clamps existent déjà dans le calcul des valeurs, avant l'écriture des textures.

### Source persistante et budgets

Fichiers binaires segmentés indépendants des dimensions WebP, avec identités de contenu, coordonnées logiques et publication transactionnelle. Le manifeste versionne l'ABI, les unités, la convention géométrique, les densités, les paramètres d'orbite et les ressources de matériaux. Les paramètres purement visuels sont modifiables ; ceux qui changent les données nécessitent une nouvelle source.

Choisir séparément densité angulaire et radiale. Les coûts sont proportionnels à leur produit. Les anciens documents v5 continuent d'utiliser une densité commune. Les gros blocs ne sont jamais assemblés en un ArrayBuffer représentant le document entier.

### Couronnes et fenêtre glissante

Choisir le plus grand N utile compatible avec le budget total, en comptant N+2 octaves pour un zoom classique, halos, sorties, AA, transfert, centre et marge. Les couronnes restent fixes dans l'écran ; la fenêtre de données glisse selon les timestamps exacts. Une octave en cours de lecture GPU ne peut être évincée. Attendre les données requises avant d'émettre une frame.

Si N=1 ne tient pas, découper davantage les données en blocs angulaires/radiaux et accumuler les contributions, plutôt que réduire silencieusement la qualité. Pour les déformations, déterminer les plages effectivement consultées et les traiter en plusieurs passes ; N+2 n'est pas une preuve de couverture universelle.

### Rendu et composition

Les passes de couronne partagent positions des échantillons AA, instants, caméra et état des matériaux. Rendre avec halos et contributions pondérées en lumière linéaire ; composer avant transfert sRGB et encodage final. Un framebuffer opaque par couronne sans poids de couverture n'est pas suffisant. La fermeture centrale reste un calcul explicite.

Le mode initial compose immédiatement les couronnes de chaque image et reste disponible. Le mode par défaut suit désormais l'approche demandée : toutes les images d'une couronne sont calculées avant la couronne suivante, sur la durée entière du film. Aucun segment temporel n'est imposé. Le nombre d'octaves utiles par couronne est déterminé par le budget N+2, après réservation de la mémoire de travail, sans plafond arbitraire à quatre ; il couvre toute la fenêtre en une passe si le budget le permet ; une octave trop grande est divisée en portions de blocs, elles aussi traitées sur tout le film.

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

## Implémentation du 2026-09-12

- Blocs utiles intercalés little-endian 48 octets, en-tête et SHA-256 ; sous-dossiers par 1000 blocs, deux manifestes alternés. Adressage arithmétique sans index global en RAM.
- Budget manuel supplémentaire au moteur ouvert : cible linéaire, présentation, copies bornées des blocs et marge. Cache LRU évincé seulement après les soumissions GPU terminées. N+2 décrit une capacité, pas une prélecture asynchrone garantie.
- Shading complet partagé par concaténation de color.wgsl ; clamp après adaptation locale. AA spatial jusqu'à 256, accumulation pondérée linéaire, transformations communes au lecteur RGB.
- Les nouvelles sources réservent 17 octaves centrales : en 3840×2160 le rayon résiduel est inférieur à 1/32 pixel. Les anciennes sources de développement sans ce champ gardent leur couverture de 12 octaves. Le filtrage suit l'axe le plus dense pour les densités indépendantes.
- Dossiers choisis ou OPFS, catalogue IndexedDB, reprise de production et copie vérifiée vers un autre dossier. MP4 en écriture directe, avec OPFS disponible pour les essais.
- La mémoire du moteur déjà ouvert et les caches internes du pilote/encodeur restent extérieurs au budget annoncé. Aucun débit temps réel ni plafond exact de mémoire physique du pilote n'est certifié.

## Couronnes successives sur toute la durée

Les intermédiaires couleur sont désormais de véritables vidéos MP4, une par couronne sur toute la durée. Leur rectangle reste fixe pendant le film et enveloppe les positions radiales possibles ; les couronnes centrales ont des dimensions réduites, avec un minimum de 64 pixels par axe (borné par la sortie) pour les codecs matériels. Le miroir fixe conserve une enveloppe plein écran. Le codec suit le choix de l'export ; le débit de la couronne plein écran est réglable (60 Mbit/s par défaut), puis proportionnel à la surface avec un minimum de 100 kbit/s par flux.

La capture GPU normalise la couleur par le poids AA et effectue le transfert sRGB avant l'encodeur. Les poids f16 sont conservés séparément en gzip sans perte, avec en-tête, taille et SHA-256. À la lecture, la couleur décodée repasse en linéaire et est multipliée par ces poids avant addition dans la cible commune. La compression couleur et la quantification 8 bits ne sont pas sans perte ; le MP4 final ajoute un encodage. Ce compromis disque/qualité est demandé par l'utilisateur. Aucune image couleur brute n'est persistée par ce chemin.

Le dossier de recette `couronnes-video-*` inclut codec, débit et rectangles dans son identité v3. Le checkpoint est publié après finalisation de chaque MP4 : les vidéos terminées sont réutilisées, la couronne interrompue recommence. L'assemblage final recommence du début. Les anciens dossiers de contributions brutes sont distincts et ne sont pas effacés automatiquement.

La capture réserve les ressources de travail ; le cache source est libéré avant composition. Les lecteurs séquentiels sont utilisés lorsque leur provision mémoire tient dans le budget. Les nombreuses subdivisions plein écran utilisent sinon une ouverture/décodage à la fois, avec davantage de recherches dans les vidéos. Les allocations internes des codecs restent dépendantes du navigateur. La couleur ne transite pas par un tableau RGBA côté CPU.

Après succès, seuls les MP4, masques et checkpoint de cette recette sont supprimés, sauf conservation explicite. L'estimation disque utilise la somme des débits cibles multipliée par la durée ; elle exclut masques gzip et surcoûts de conteneur et ne garantit pas le débit effectivement produit. Pas de promesse de fidélité sans perte ou de gain de vitesse sur une grande source sans mesure.
