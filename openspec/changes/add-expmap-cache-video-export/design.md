## Context

Document RGB persistant, indépendant d'une vidéo, produit directement sur une grille exponentielle par le moteur WebGPU. Le lecteur et la vidéo utilisent le même renderer. Cette fonctionnalité n'a jamais été publiée : aucun ancien format, convertisseur ou lecteur de secours n'est conservé.

## Goals / Non-Goals

Créer un document réutilisable avec une navigation et un export bornés en mémoire. Garder une grille régulière, un codec natif et un tampon circulaire simple. Aucun recalcul de matériau à la lecture, travelling, logo central, garantie de débit ou de ratio de compression.

## Decisions

### Projection unique

R=hypot(W,H)/2, Nθ=ceil(2πkR), Nρ=ceil(ln(2)kR). Chaque tuile couvre un doublement : angle en X, profondeur logarithmique en Y. Deux échantillons de halo autour de la tuile et une ligne de frontière permettent le filtrage matériel. Dimensions TIFF arrondies à des multiples de 16.

La vue consomme les douze doublements après son cercle extérieur. Une position fractionnaire utilise au plus treize tuiles. Le document contient floor(profondeur utilisateur)+13 tuiles, sans élargir les bornes navigables. Sous R/4096, utiliser la couleur exacte du centre calculée une fois ; en 4K, ce rayon vaut environ 0,54 pixel. Refuser R>4096, qui rendrait cette fermeture supérieure à un pixel. Aucun masque graphique central.

Calcul direct des blocs avec convergence existante, apparence statique figée et budget d'itérations stable. La précision couvre aussi les douze doublements internes et les halos. Aucune réutilisation cartésienne ou empreinte AA cartésienne héritée. Les effets dépendants de la vue ou du temps restent explicitement inéligibles.

### TIFF tuilé, un seul format

Manifeste v4 uniquement. Fichiers zoom-N.tif contenant autant de tuiles verticales que le permet leur capacité, sans seuil fixe de doublements. RGBA8 opaque, couleurs sRGB, Deflate indépendant par tuile. UTIF écrit les métadonnées TIFF standard ; CompressionStream et DecompressionStream réalisent le codec natif. Pas de décodeur d'image JavaScript ni de conversion RGB dans le lecteur. Un index offset/longueur/SHA-256 permet de lire exactement une tuile.

En-tête réservé dimensionné selon le nombre de tuiles, aligné sur 4096 octets. Écrire et fermer chaque tuile, vérifier son hash, puis publier un manifeste A/B. Après interruption, reprendre au dernier doublement publié ; la tuile partielle est recalculée. L'ouverture vérifie les métadonnées et tailles, les hashes de payload sont vérifiés au premier chargement de chaque tuile. Aucune lecture complète du document au démarrage. Un TIFF incomplet est un checkpoint, pas encore une image finale autonome.

Le catalogue utilise un espace neuf. Aucune migration des entrées ou des fichiers historiques ; les fichiers existants sur disque sont laissés intacts.

### Tampon circulaire GPU

Texture rgba8unorm-srgb à quatorze couches. Tuile i dans la couche i modulo 14. Treize couches couvrent la vue ; la couche restante anticipe le mouvement. Un seul décodage en cours, upload direct RGBA puis libération RAM. Une prélecture devenue obsolète ne peut pas écraser une tuile de la nouvelle fenêtre.

Une frame entièrement résidente ne relit pas le disque, ne décode pas et ne réimporte pas les textures. Le CPU détermine la fenêtre à partir de l'échelle ; aucune liste de pages atomique ni lecture GPU de demandes. Un triangle plein écran réalise le mapping log-polaire et le filtrage bilinéaire en lumière linéaire. Le shader réencode une fois en sRGB pour le canvas. La profondeur entière et sa fraction sont séparées avant passage en float32.

Lecteur : dernière demande prioritaire, dernière image complète visible pendant le chargement. Vidéo : attente de toutes les frames dans l'ordre, canvas GPU vers VideoFrame, encodeur matériel préféré. Fermer le lecteur interactif avant allocation vidéo pour éviter deux tampons simultanés.

### Ressources et limites

4K ×1 : tuile 13856×1536 RGBA, environ 81,2 MiB ; quatorze couches environ 1,11 GiB. Ce chiffre exclut les buffers du moteur, surfaces de présentation et encodeur. RAM de décodage : une tuile brute plus payload comprimé et buffers natifs transitoires. Production : une tuile d'assemblage et buffers de compression.

Plafond d'une tuile brute : 128 MiB. Vérifier maxTextureDimension2D, maxTextureArrayLayers et les erreurs d'allocation GPU. Refuser explicitement les résolutions/densités qui dépassent ces limites, sans réduire silencieusement la qualité. Le ratio de compression reste inconnu avant mesure.

## Validation

Tests numériques du mapping, limites de fenêtres, couverture des halos, lecture TIFF indépendante, reprises après échec de publication, vérification des payloads, prélecture obsolète et frames résidentes sans nouvelle lecture. Tests de progression et reprise de production, vidéo ordonnée, annulation/restauration. Types et validation WGSL Naga. Qualité, scintillement et débit GPU réel restent à mesurer après confirmation explicite ; aucun résultat statique n'est présenté comme une mesure matérielle.

### Regroupement selon la capacité TIFF

Le nombre de tuiles par fichier est calculé à partir des dimensions, d’une borne conservatrice du payload Deflate et des offsets TIFF 32 bits. Il peut donc varier avec la résolution et la densité ; aucune dépendance aux quatorze couches GPU. L’index est dimensionné dynamiquement. Le writer IFD UTIF reçoit ce buffer dimensionné, sans passer par son encodeur de commodité limité à 20 Ko. Le dimensionnement conservateur peut produire des fichiers compressés nettement inférieurs à 4 Gio ; BigTIFF n’est pas introduit.

### Assouplissement des apparences

La phase couleur est autorisée avec le gradient existant, sans correction shader : le risque d’écarts aux raccords lié à son écrêtage n’est pas une interdiction du profil. Moyenne des rayures et cohérence de direction restent autorisées. Les paramètres de reflet/relief/protrusion et pistes matériau inactifs sont ignorés par l’éligibilité lorsque le shading est absent sur tous les stops. Les pistes de texture sans texture active sont également ignorées. Les contributions de couleur fixes (horloge arrêtée ou vitesse nulle) peuvent être cuites ; la hauteur dépendante de l’échelle reste exclue. Les textures restent exclues car leur identité/contenu n’est pas encore figé pour la reprise, même lorsque leur mapping orbital serait adapté.

### Forçage expérimental

Le contrôle classe les problèmes en données invalides et restrictions d’apparence. Le mode forceRender ignore uniquement ces dernières dans l’UI, le gel de recette et le producteur. Il est faux par défaut, enregistré explicitement dans le manifeste, repris depuis celui-ci et indiqué dans la bibliothèque. Le shader, l’horloge zéro, le chargement des ressources et le renderer restent inchangés. Les sources externes ne sont pas archivées ; un changement pendant le calcul ou après reprise peut donc introduire des différences. L’option affiche : « Cuit les effets tels quels. Des raccords ou différences après reprise peuvent apparaître. »

### Transport et brouillon de création

Le formulaire utilise un brouillon réactif partagé, sauvegardé sous expmap-creation-draft. Chaque panneau observe le même objet ; les coordonnées restent des chaînes, y compris les saisies temporairement incomplètes. L’état de calcul et l’apparence courante restent séparés du brouillon.

Le lecteur est une surface téléportée au-dessus des fenêtres avec bandeau et sortie permanents. Timeline à deux doublements/s de référence, vitesse multiplicative, sens inverse, boucle et rotation manuelle. Un domaine stationnaire utilise une timeline de cinq secondes. La boucle requestAnimationFrame attend la publication GPU avant la demande suivante et utilise le temps écoulé pour avancer. Scrub et rotation mettent en pause ; une page masquée aussi. Échap et Quitter libèrent la session, le focus est restauré et les tabulations restent dans les contrôles du lecteur.
