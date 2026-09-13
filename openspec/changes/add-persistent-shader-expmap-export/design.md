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

- Format de travail : une archive OPFS unique par source (`shader-archives/<uuid>.smexp`), écrite en place par `createSyncAccessHandle` dans un Worker. En-tête fixe 64 o (total, completed, état, génération, offsets), manifeste JSON, table fixe N×24 o adressée arithmétiquement, puis trames ajoutées dans l'ordre de production. `completed` est le point de validation, écrit après flush de la trame et de son entrée ; la reprise recule de 2 blocs et tronque les octets orphelins. Aucun index en RAM.
- Trame de bloc : colonnes d'octets constantes stockées une fois (masque 48 bits), colonnes variables transposées par plan d'octets puis gzip via `CompressionStream`. Mesuré sur une source réelle : ≈5× contre 2× en entrelacé ; `trap` inactif et blocs intérieurs uniformes tombent à l'en-tête.
- Ancien format conservé en lecture : dossiers de blocs `N.bin` (en-tête 16 o, suffixe SHA-256 ignoré), convertibles en archive par copie bloc à bloc. Export/import de l'archive vers un fichier utilisateur par flux ; les intermédiaires de couronnes vont dans `shader-scratch` en OPFS.
- Budget manuel supplémentaire au moteur ouvert : cible linéaire, présentation, copies bornées des blocs et marge. Cache LRU évincé seulement après les soumissions GPU terminées. N+2 décrit une capacité, pas une prélecture asynchrone garantie.
- Shading complet partagé par concaténation de color.wgsl ; clamp après adaptation locale. AA spatial jusqu'à 256, accumulation pondérée linéaire, transformations communes au lecteur RGB.
- Les nouvelles sources réservent 17 octaves centrales : en 3840×2160 le rayon résiduel est inférieur à 1/32 pixel. Les anciennes sources de développement sans ce champ gardent leur couverture de 12 octaves. Le filtrage suit l'axe le plus dense pour les densités indépendantes.
- Archives OPFS par défaut, dossiers hérités en lecture, catalogue IndexedDB (chemin d'archive ou handle de dossier), reprise de production, conversion dossier → archive, export/import d'archive. MP4 en écriture directe, avec OPFS disponible pour les essais.
- La mémoire du moteur déjà ouvert et les caches internes du pilote/encodeur restent extérieurs au budget annoncé. Aucun débit temps réel ni plafond exact de mémoire physique du pilote n'est certifié.

## Couronnes successives sur toute la durée

Les intermédiaires couleur sont désormais de véritables vidéos MP4, une par couronne sur toute la durée. Leur rectangle reste fixe pendant le film et enveloppe les positions radiales possibles ; les couronnes centrales ont des dimensions réduites, avec un minimum de 64 pixels par axe (borné par la sortie) pour les codecs matériels. Le miroir fixe conserve une enveloppe plein écran. Le codec suit le choix de l'export ; le débit de la couronne plein écran est réglable (60 Mbit/s par défaut), puis proportionnel à la surface avec un minimum de 100 kbit/s par flux.

La capture GPU normalise la couleur par le poids AA et effectue le transfert sRGB avant l'encodeur. Les poids f16 sont conservés séparément en gzip sans perte, avec en-tête, taille et SHA-256. À la lecture, la couleur décodée repasse en linéaire et est multipliée par ces poids avant addition dans la cible commune. La compression couleur et la quantification 8 bits ne sont pas sans perte ; le MP4 final ajoute un encodage. Ce compromis disque/qualité est demandé par l'utilisateur. Aucune image couleur brute n'est persistée par ce chemin.

Le dossier de recette `couronnes-video-*` inclut codec, débit et rectangles dans son identité v3. Le checkpoint est publié après finalisation de chaque MP4 : les vidéos terminées sont réutilisées, la couronne interrompue recommence. L'assemblage final recommence du début. Les anciens dossiers de contributions brutes sont distincts et ne sont pas effacés automatiquement.

La capture réserve les ressources de travail ; le cache source est libéré avant composition. Les lecteurs séquentiels sont utilisés lorsque leur provision mémoire tient dans le budget. Les nombreuses subdivisions plein écran utilisent sinon une ouverture/décodage à la fois, avec davantage de recherches dans les vidéos. Les allocations internes des codecs restent dépendantes du navigateur. La couleur ne transite pas par un tableau RGBA côté CPU.

Après succès, seuls les MP4, masques et checkpoint de cette recette sont supprimés, sauf conservation explicite. L'estimation disque utilise la somme des débits cibles multipliée par la durée ; elle exclut masques gzip et surcoûts de conteneur et ne garantit pas le débit effectivement produit. Pas de promesse de fidélité sans perte ou de gain de vitesse sur une grande source sans mesure.

Si le plan budgété ne comporte qu'une couronne et que la conservation des intermédiaires n'est pas demandée, l'export utilise directement le renderer complet et l'encodeur final existant. Le dossier de travail n'est pas ouvert, aucun masque ou MP4 intermédiaire n'est produit et leur débit ne s'applique pas. Les autres configurations gardent le chemin successif.

## Adressage direct GPU des blocs résidents — version précédente

La version précédente utilisait une table de pages par octave virtuelle et bloc local. Chaque page contient banque physique, offset en échantillons et dimensions utiles ; une section indique le sens radial de chaque octave. Les quatre voisins bilinéaires accèdent directement à leur page, même aux frontières de blocs. Le décodage et l'adaptation géométrique sont partagés dans expmap_shader_common.wgsl ; color.wgsl reste inchangé.

Les banques stockent des emplacements fixes de maxBlockBytes. Leur nombre est borné par les limites WebGPU, avec au plus six banques (une liaison storage supplémentaire pour la table et une pour la palette). Padding et table sont soustraits du budget cache. Le cache évite les relectures des blocs résidents et protège l'ensemble du groupe en préparation. Les alias virtuels partagent un emplacement physique. Les écritures de réutilisation sont ordonnées après le submit précédent dans la même queue ; les banques ne sont détruites qu'après la barrière GPU.

Une passe traite tous les blocs sélectionnés qui tiennent simultanément ; des groupes successifs partitionnent les contributions sans en perdre si les limites empêchent une seule passe. Le chemin par blocs reste disponible comme référence et comme repli si deux emplacements et la table ne tiennent pas. Le cache historique et l'atlas ne sont jamais conservés ensemble. Le préchargement conserve désormais un résultat prêt jusqu'à sa consommation, au lieu de le jeter dès résolution de la lecture.

Les positions AA et les colorisations sont conservées, mais regrouper les contributions avant l'écriture RGBA16F change les arrondis par rapport aux additions f16 par bloc. La recette vidéo passe en v4/gather-v1 pour ne pas reprendre les anciennes contributions mélangées. Aucun débit GPU n'est garanti sans benchmark représentatif.

## Fenêtre ExpMap régulière résidente — 2026-09-13

Après le ralentissement d’un facteur deux signalé par l’utilisateur avec le gather, le chemin par défaut assemble les blocs en une grille GPU régulière par octave. Une texture `rgba32uint` en tableaux de couches conserve les douze mots de chaque échantillon dans trois plans, sans conversion ni compression avec perte. Le fichier source et `color.wgsl` restent identiques. Le stockage disque des couronnes reste MP4 + poids AA f16 gzip.

Le plan choisit N à partir du budget disponible et des limites réellement accordées au device, avec N+2 emplacements. Il inclut le padding de texture et la table uniforme de 512 octets ; le staging d’un bloc et ses copies bornées sont couverts par la provision de travail existante. Les dimensions dépassant la limite 2D sont linéarisées sur plusieurs couches régulières. Dans le cas courant, une spécialisation WGSL lit directement les coordonnées 2D, sans divisions d’adressage ni recherche de bloc. Les limites de couches peuvent réduire N. Le moteur demande une dix-septième texture échantillonnée lorsque l’adaptateur la permet.

Un upload compute transpose chaque bloc dans ses coordonnées finales, à partir d’un seul staging. Les écritures suivantes arrivent après la soumission précédente ; une barrière tous les quatre uploads borne les copies en attente. Une octave n’est publiée résidente qu’après préparation complète. Les octaves communes sont épinglées ; un curseur circulaire réutilise un emplacement sortant sans déplacer les autres. Deux octaves supplémentaires sont chargées en réserve. Une frame au même intervalle radial ne charge rien ; un zoom monotone d’une octave remplace une octave. Les sauts, retours et alias radiaux utilisent les mêmes règles. Un chargement interrompu n’est jamais marqué complet ; les erreurs GPU invalident le cache.

Le shader choisit l’emplacement d’octave une fois par sous-échantillon AA, puis lit les quatre voisins dans la grille. Chaque voisin charge trois uint4 et conserve sa colorisation complète. AA, transformations, centre et poids restent identiques ; l’accumulation groupée conserve les différences d’arrondi f16 déjà observées avec le gather. La recette des intermédiaires passe en v5/window-v1.

L’aperçu partage ce chemin ; si toute sa couverture ne tient pas, plusieurs fenêtres sont composées dans la frame. L’export par couronnes conserve une fenêtre résidente sur tout le film d’une couronne. Une portion de blocs ou un device ne permettant pas trois octaves régulières utilise le chemin historique par blocs. Aucun plafond arbitraire de quatre octaves et aucune réduction d’AA. Le gain de débit 4K et la mémoire physique du pilote restent à mesurer sur la machine cible.
