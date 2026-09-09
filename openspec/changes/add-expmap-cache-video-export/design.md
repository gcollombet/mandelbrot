## Context

Document RGB persistant, indépendant d'une vidéo, produit directement sur une grille exponentielle par le moteur WebGPU. Le lecteur et la vidéo utilisent le même renderer. Cette fonctionnalité n'a jamais été publiée : aucun ancien format, convertisseur ou lecteur de secours n'est conservé.

## Goals / Non-Goals

Créer un document réutilisable avec une navigation et un export bornés en mémoire. Garder une grille régulière, un codec natif et un tampon circulaire simple. Aucun recalcul de matériau à la lecture, travelling, logo central, garantie de débit ou de ratio de compression.

## Decisions

### Projection unique

R=hypot(W,H)/2, Nθ=ceil(2πkR), Nρ=ceil(ln(2)kR). Chaque tuile couvre un doublement : angle en X, profondeur logarithmique en Y. Deux échantillons de halo autour de la tuile et une ligne de frontière permettent le filtrage matériel. Dimensions de stockage arrondies à des multiples de 16.

La vue consomme les douze doublements après son cercle extérieur. Une position fractionnaire utilise au plus treize tuiles. Le document contient floor(profondeur utilisateur)+13 tuiles, sans élargir les bornes navigables. Sous R/4096, utiliser la couleur exacte du centre calculée une fois ; en 4K, ce rayon vaut environ 0,54 pixel. Refuser R>4096, qui rendrait cette fermeture supérieure à un pixel. Aucun masque graphique central.

Calcul direct des blocs avec convergence existante, apparence statique figée et budget d'itérations stable. La précision couvre aussi les douze doublements internes et les halos. Aucune réutilisation cartésienne ou empreinte AA cartésienne héritée. Les effets dépendants de la vue ou du temps restent explicitement inéligibles.

### Document ZIP64, images WebP indépendantes

Manifeste v5 uniquement, avec nom, qualité WebP et miniature portable. Un fichier .expmap choisi par Enregistrer sous est un ZIP64 STORE : manifest.json et doubling-N.webp. zip.js gère l’index et les plages de lecture ; aucune compression ZIP supplémentaire. Les images sont WebP avec pertes, opaques sRGB, qualité 0,90 par défaut. Les anciens TIFF ne sont ni migrés ni lus.

Le navigateur écrit chaque image complète dans un répertoire OPFS interne, vérifie son hash, puis ferme un manifeste A/B. Aucun dossier utilisateur à sélectionner. Un seul worker encode avec OffscreenCanvas.convertToBlob ; la tuile RGBA lui est transférée. Pendant l’encodage et l’écriture de cette tuile, le producteur assemble la suivante. La file ne conserve qu’une sauvegarde en cours ; la production attend si celle-ci n’a pas fini. Les erreurs remontent, la fin attend la file, une interruption conserve les tuiles publiées. Les temps calcul (préparation/capture incluses), encodage, écriture/vérification et attente sont affichés séparément ; ils se chevauchent.

À l’arrêt ou à la fin, les images internes sont copiées séquentiellement dans le fichier choisi, sans Blob global et sans recopier un fichier grandissant à chaque doublement. L’archive est fermée puis son manifeste/index vérifié avant suppression des fichiers temporaires. Une erreur conserve les checkpoints internes et permet Enregistrer sous ou Reprendre. Après arrêt normal, la reprise depuis une archive incomplète copie les images déjà calculées vers OPFS avec progression et annulation. Un verrou inter-fenêtres couvre calcul, finalisation et nettoyage. La fermeture brutale de l’onglet peut empêcher la finalisation du fichier choisi ; la bibliothèque retrouve les checkpoints internes. Leur disponibilité reste soumise au stockage du navigateur.

La lecture vérifie l’index et les tailles ; les hashes des images sont vérifiés à leur chargement. createImageBitmap décode une image WebP puis copyExternalImageToTexture l’importe dans la couche GPU. Le bitmap est fermé après upload ou abandon. Aucun décodeur WebP JavaScript, aucun readback RGBA pour la lecture.

### Tampon circulaire GPU

Texture rgba8unorm-srgb à quatorze couches. Tuile i dans la couche i modulo 14. Treize couches couvrent la vue ; la couche restante anticipe le mouvement. Un seul décodage en cours, import natif ImageBitmap puis libération RAM. Une prélecture devenue obsolète ne peut pas écraser une tuile de la nouvelle fenêtre.

Une frame entièrement résidente ne relit pas le disque, ne décode pas et ne réimporte pas les textures. Le CPU détermine la fenêtre à partir de l'échelle ; aucune liste de pages atomique ni lecture GPU de demandes. Un triangle plein écran réalise le mapping log-polaire et le filtrage bilinéaire en lumière linéaire. Le shader réencode une fois en sRGB pour le canvas. La profondeur entière et sa fraction sont séparées avant passage en float32.

Lecteur : dernière demande prioritaire, dernière image complète visible pendant le chargement. Vidéo : attente de toutes les frames dans l'ordre, canvas GPU vers VideoFrame, encodeur matériel préféré. Fermer le lecteur interactif avant allocation vidéo pour éviter deux tampons simultanés.

### Ressources et limites

4K ×1 : tuile 13856×1536 RGBA, environ 81,2 MiB ; quatorze couches environ 1,11 GiB. Ce chiffre exclut les buffers du moteur, surfaces de présentation et encodeur. RAM de décodage : une tuile brute plus payload comprimé et buffers natifs transitoires. Production : une tuile d'assemblage et buffers de compression.

Plafond d'une tuile brute : 128 MiB. Vérifier maxTextureDimension2D, maxTextureArrayLayers et les erreurs d'allocation GPU. Refuser explicitement les résolutions/densités qui dépassent ces limites, sans réduire silencieusement la qualité. Le ratio de compression reste inconnu avant mesure.

## Validation

Tests numériques du mapping, limites de fenêtres, couverture des halos, lecture ZIP64 indépendante, reprises après échec de publication, vérification des payloads, prélecture obsolète et frames résidentes sans nouvelle lecture. Tests de progression et reprise de production, vidéo ordonnée, annulation/restauration. Types et validation WGSL Naga. Qualité, scintillement et débit GPU réel restent à mesurer après confirmation explicite ; aucun résultat statique n'est présenté comme une mesure matérielle.

### Assouplissement des apparences

La phase couleur est autorisée avec le gradient existant, sans correction shader : le risque d’écarts aux raccords lié à son écrêtage n’est pas une interdiction du profil. Moyenne des rayures et cohérence de direction restent autorisées. Les paramètres de reflet/relief/protrusion et pistes matériau inactifs sont ignorés par l’éligibilité lorsque le shading est absent sur tous les stops. Les pistes de texture sans texture active sont également ignorées. Les contributions de couleur fixes (horloge arrêtée ou vitesse nulle) peuvent être cuites ; la hauteur dépendante de l’échelle reste exclue. Les textures restent exclues car leur identité/contenu n’est pas encore figé pour la reprise, même lorsque leur mapping orbital serait adapté.

### Forçage expérimental

Le contrôle classe les problèmes en données invalides et restrictions d’apparence. Le mode forceRender ignore uniquement ces dernières dans l’UI, le gel de recette et le producteur. Il est faux par défaut, enregistré explicitement dans le manifeste, repris depuis celui-ci et indiqué dans la bibliothèque. Le shader, l’horloge zéro, le chargement des ressources et le renderer restent inchangés. Les sources externes ne sont pas archivées ; un changement pendant le calcul ou après reprise peut donc introduire des différences. L’option affiche : « Cuit les effets tels quels. Des raccords ou différences après reprise peuvent apparaître. »

### Transport et brouillon de création

Le formulaire utilise un brouillon réactif partagé, sauvegardé sous expmap-creation-draft. Chaque panneau observe le même objet ; les coordonnées restent des chaînes, y compris les saisies temporairement incomplètes. L’état de calcul et l’apparence courante restent séparés du brouillon.

Le lecteur est une surface téléportée au-dessus des fenêtres avec bandeau et sortie permanents. Timeline à deux doublements/s de référence, vitesse multiplicative, sens inverse, boucle et rotation manuelle. Un domaine stationnaire utilise une timeline de cinq secondes. La boucle requestAnimationFrame attend la publication GPU avant la demande suivante et utilise le temps écoulé pour avancer. Scrub et rotation mettent en pause ; une page masquée aussi. Échap et Quitter libèrent la session, le focus est restauré et les tabulations restent dans les contrôles du lecteur.

### Échelle continue des matériaux précalculés

L’ancre numérique de chaque bloc reste inchangée. En ExpMap, chaque invocation ajoute -y×rhoStep au logarithme d’échelle utilisé pour la hauteur. Le pas utilisé pour les gradients de distance, la courbure et les gradients orbitaux reçoit la même correction radiale ainsi qu’une normalisation vers un repère virtuel carré de 512 pixels. Ce repère conserve le gain du producteur habituel, indépendamment des dimensions physiques du bloc ; il ne change pas la grille d’échantillonnage. Les corrections précèdent les clamps et les accumulations orbitales, y compris lors des continuations shallow/deep. Hors ExpMap elles valent zéro. Le pixel central conserve une échelle finie.

Les nouveaux documents enregistrent geometryConvention=continuous-radial-v1. Seuls les documents du manifeste v5 sont pris en charge. Un calcul incomplet sans cette convention ne peut pas être repris avec le nouveau producteur ; il faut créer un nouveau document, pour éviter un mélange de reliefs incompatibles. Aucune modification du shader de couleur, du lecteur ou du mapping GPU n’est nécessaire.

### Miniatures et export image entière

Une première miniature de la carte provient des pixels cuits dans le worker ; à la fin, une vue reconstruite du document la remplace lorsque le GPU est disponible. Elle est intégrée au manifeste et conservée à l’import. Aucune capture du canvas interactif potentiellement effacé.

L’export image parcourt les doublements nécessaires à la résolution choisie et assemble la carte angle × profondeur, y compris la couverture interne, sans halos/padding dans l’image. Il utilise les codecs natifs PNG, JPEG ou WebP et ne recalcule aucune orbite. Largeur/hauteur et qualité sont sélectionnables ; 32 mégapixels maximum, côté WebP <=16383, autres côtés <=32767. Cette limite porte uniquement sur l’image exportée, pas sur le document. Une seule image source décodée est conservée. Les arrondis répartissent les centres des pixels de sortie sans trous ou double attribution. Chaque doublement est dessiné sur son rectangle de sortie entier, sans bord fractionnaire : sa hauteur varie de moins d’un pixel par rapport à la projection idéale, évitant les lignes noires aux jonctions lors des réductions. Le filtre est celui du canvas natif, distinct du filtre linéaire du lecteur vidéo. PNG n’ajoute pas de perte aux couleurs déjà compressées en WebP.

### Multisampling spatial adaptatif de la vidéo

Le plafond vidéo vaut 16 par défaut, sélectionnable parmi 1/4/9/16/36/64/144/256. Le lecteur interactif expose le même réglage, à 16 par défaut ; les miniatures restent à un prélèvement. Le contrat de vue transporte ce plafond vers le renderer partagé ; il ne modifie pas le document.

Soit s=hauteurRéférence/hauteurSortie et r le rayon au centre du pixel. La densité conservatrice vaut min(Nθ/(2π),Nρ/ln(2))×s/(r+s/√2). Le côté de grille vaut floor(densité), borné entre 1 et sqrt(plafond). Ce choix ne dépend ni du temps, ni du zoom, ni de la rotation : pour des dimensions vidéo fixes, il reste stable entre les frames. Les points sont les milieux de strates régulières dans le carré du pixel. Chaque point passe par le mapping polaire, le choix de tuile et les halos existants ; la fenêtre résidente reste inchangée. Les couleurs linéaires, centre inclus, sont moyennées avec un filtre boîte normalisé puis encodées en sRGB une seule fois. Chaque prélèvement bilinéaire utilise les voisins matériels habituels. Ce filtre borné ne garantit pas l’élimination de tout aliasing dans les zones extrêmement minifiées.

### Résolution physique du lecteur

La surface utilise ses dimensions CSS multipliées par devicePixelRatio, ajuste le ratio du document et borne la sortie à sa résolution native. Un ResizeObserver et une requête média de densité relancent le rendu lors des changements de taille ou d’écran. Le bandeau indique les dimensions effectivement publiées, ainsi que le plafond AA. Le sélecteur AA transmet le même contrat de vue que la vidéo, sans nouvelle allocation de tuiles.

### Prélecture préparée en worker et import GPU fractionné

ExpmapImageReader transmet une fois le localisateur du document au worker, puis uniquement les indices d’images. Le worker ouvre son propre index ZIP ou checkpoint OPFS, vérifie les payloads et décode avec createImageBitmap. Il transfère un ImageBitmap, sans faire transiter les octets décompressés par JavaScript sur le thread d’interface. Une seule demande de lecture/décodage peut être en cours. Les bitmaps tardifs sont fermés et la fermeture du renderer termine le worker.

L’import découpe l’image horizontalement en bandes d’au plus 4 MiB (75 lignes pour une tuile 4K ×1). Chaque copie attend sa fin GPU avant la suivante. Une prélecture attend 16 ms avant chaque bande pour laisser des occasions de présentation ; il ne s’agit pas d’une garantie de cadence. Une tuile requise draine ses bandes sans ces délais. La disponibilité repose sur la fin de toutes les bandes, pas sur leur simple soumission. La couche précédente est invalidée dès le début du remplacement. Un changement de fenêtre annule les futures bandes d’une prélecture devenue inutile, attend le travail déjà soumis, puis réutilise la couche. Le tampon reste à quatorze tuiles et un seul bitmap décodé en cours de transfert. Le coût réel de copyExternalImageToTexture par région reste dépendant du navigateur ; aucune réduction mesurée des saccades n’est annoncée sans essai matériel.

### Contrôles de préparation et montage

Centre et captures d’échelle sont indépendants. Deux sliders de préparation parcourent les exposants +10 à -1000, comme le contrôle de navigation (profondeur -10 à 1000). La saisie précise reste disponible et une capture conserve la chaîne exacte, même hors de la plage pratique des sliders. Les résumés affichent les ordres décimaux entiers et leur différence absolue ; aucune valeur de calcul n’est arrondie pour l’affichage.

Le montage utilise deux poignées sur une piste bornée au document, autorise le dézoom et l’inversion, et ouvre le lecteur aux bornes exactes. La rotation s’exprime par angle initial en degrés, sens et tours fractionnaires. Les angles internes non normalisés conservent le nombre de tours. Les noms de sélecteurs proviennent du fichier réel et l’export remplace uniquement son extension par .mp4.

La durée est l’autorité initiale ; modifier explicitement la vitesse moyenne la rend prioritaire. Les courbes règlent la vitesse logarithmique (et la rotation) en entrée et en sortie avec des durées indépendantes. Les primitives analytiques des rampes linéaire, smoothstep et cubique prolongée sont normalisées par la distance totale ; elles restent monotones, continues en vitesse aux raccords, sans rebond. Le trajet inclut les transitions ; le palier final s’ajoute à cette durée et conserve zoom ET rotation exactement. Une réduction explicite du trajet réduit proportionnellement les transitions actives si nécessaire ; une saisie de transitions qui se chevauchent bloque l’export avec une explication. Le raccourci minibrot propose entrée douce, sortie prolongée jusqu’à la moitié du trajet (12 s maximum) et palier de 2 s. Les anciennes fenêtres sans ces champs restent linéaires sans palier.

La sortie ExpMap est persistée séparément du document et démarre en 3840×2160 à 60 fps. Auto préfère HEVC puis AVC selon la sonde de la configuration réelle (dimensions, cadence, qualité et préférence matérielle). La sonde utilise la transmission `framerate` de la version installée de mediabunny vers le constructeur de configurations, couverte par un test qui observe l’appel natif. Les autres codecs restent des choix explicites. Les préférences vidéo classiques neuves utilisent également 4K/60 et HEVC avec repli AVC si indisponible. Les préférences déjà enregistrées sont préservées.

Le contrat de vue autorise explicitement l’agrandissement vidéo jusqu’à 3840×2160 sans augmenter le ratio couvert par le document. Le shader conserve sa normalisation par hauteur de référence ; les textures, halos et budgets de tuiles sont inchangés. Le lecteur interactif reste plafonné à la résolution native. L’interface indique un agrandissement et refuse une sortie plus large que la couverture disponible.
