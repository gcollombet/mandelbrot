<link rel="stylesheet" href="https://use.typekit.net/fnz7ojs.css">

# Optimisations de rendu et rendu progressif

Le calcul d’une image de Mandelbrot peut demander beaucoup plus de travail que
le budget d’une seule image à l’écran. Le moteur ne réduit pourtant plus la
résolution spatiale du calcul : chaque texel visible est demandé à sa position
exacte dès le départ.

Le caractère progressif est désormais **temporel** :

1. tous les texels nouveaux ou invalidés deviennent des requêtes exactes ;
2. le GPU effectue un nombre adaptatif de tours de calcul par image ;
3. les pixels qui n’ont pas terminé conservent leur état pour l’image suivante ;
4. une passe bilinéaire fabrique seulement une présentation provisoire ;
5. quand tout est terminé, la couleur réutilise le dernier cache d’affichage
   typé, cohérent avec ces données exactes.

~~~text
réinitialisation / bord de pan / AA
                  |
                  v
       requêtes exactes iter = -1
                  |
                  v
       itération par lots adaptatifs
          |                    |
          | terminé            | budget épuisé
          v                    v
     donnée exacte       état de continuation
          |                    |
          +----------+---------+
                     v
       resolve bilinéaire temporaire
                     |
                     v
             couleur / affichage
~~~

## Les états d’un texel

La couche 0 de la texture brute suffit à distinguer les états principaux.

| Valeur | Sens |
|---|---|
| -1 | requête exacte qui n’a pas encore commencé |
| 0 | pixel classé à l’intérieur |
| > 0, avec valeur de z sous le seuil | calcul commencé, budget de l’image épuisé |
| > 0, avec valeur de z au-dessus du seuil | pixel échappé et terminé |

Il n’existe plus de valeurs négatives -2, -4, -8, etc. Dans l’état brut, la
couche 1 vaut 1 pour une donnée exacte. Dans le cache d’affichage, la finesse
du support bilinéaire est un exposant dyadique compact dans les métadonnées ;
elle n’occupe plus une couche flottante.

## Une seule passe d’itération

Le chemin ordinaire fusionne trois responsabilités dans un compute shader :

- démarrer les requêtes exactes ;
- continuer les pixels dont le budget précédent était épuisé ;
- compter les pixels qui demandent encore du travail après la passe.

Les pixels terminés ne sont pas réécrits. Le compteur de travail restant est le
seul signal de convergence utilisé par la boucle de rendu et par le contrôleur
de lots.

Les treize couches brutes sont conservées. Elles contiennent l’état de reprise,
les métriques d’orbite et le payload de dérivées, notamment z″, partagé avec
l’AA analytique et avec les évolutions de géométrie envisagées.

## Lots temporels adaptatifs

Le shader reçoit un budget de tours pour chaque texel actif. Le moteur ajuste ce
budget à partir du temps GPU de la passe d’itération :

- si l’itération dépasse son budget, le lot diminue ;
- si elle reste nettement sous le budget, le lot augmente ;
- une réinitialisation, un bord nouvellement exposé ou un reseed AA ramène le
  contrôleur à son minimum ;
- le minimum est un tour, afin qu’une première vague plein écran reste
  fractionnable même sur un GPU lent.

Le budget de l’itération réserve explicitement du temps aux passes fixes
(reprojection éventuelle, resolve, couleur et présentation AA).

## Reprojection lors d’un pan

Un déplacement entier en texels réutilise l’état brut existant :

~~~text
ancienne texture A -- gather décalé --> texture B
                                            |
                                            +-- devient la texture active
~~~

Les texels dont la source sort de la texture deviennent directement des
requêtes exactes. Une réinitialisation complète applique la même règle à tous
les texels. Il n’y a plus d’ensemencement grossier ni de seconde phase de
raffinement.

## Resolve bilinéaire temporaire

Le resolve est une passe de présentation, de la texture brute vers un cache
typé de cinq attachements logiques : trois scalaires `iter`, `z.x`, `z.y`, une
géométrie `gradient.xy, courbure, hauteur` et un mot de métadonnées.

- Un pixel terminé passe avec un pas exact égal à 1.
- Une requête ou une continuation incomplète cherche quatre voisins terminés
  sur une grille dyadique, en commençant au pas 2.
- Si le support fin est insuffisant, la recherche essaie 4, 8, 16, etc.
- Si aucun support fiable n’existe, la sortie porte explicitement « aucune
  donnée ».

Les quantités continues sont interpolées dans une représentation adaptée :
nu lisse relativement à une itération locale, direction complexe normalisée,
géométrie analytique et phase de bande sur le cercle. Le gradient et le
Laplacien de la hauteur ont déjà été calculés en f32 au point d’échappement ; le
resolve les copie pour un pixel exact et les interpole pour une présentation
provisoire. Le groupe intérieur ou extérieur dominant évite de fabriquer une
fausse bordure.

Le détail du contrat et de ses unités est décrit dans
[Cache géométrique compact](./cache-geometrique.md).

Cette approximation ne retourne jamais dans la texture brute. Elle ne marque
aucun pixel comme terminé et n’influence pas le compteur. Dès que la donnée
exacte existe, son pas 1 gagne naturellement sur tout support temporaire.

## Image live et image figée pendant le zoom

Le zoom peut afficher une image figée reprojetée pendant que la texture live se
recalcule. La fusion compare les pas dans la même unité d’écran :

~~~text
pas effectif figé = pas figé x échelle figée / échelle live
~~~

La plus petite valeur positive gagne. Une donnée exacte live remplace donc le
provisoire, tandis que l’image figée continue de couvrir les zones encore sans
support.

## Anti-aliasing

L’AA est un chemin distinct, activé manuellement ou après convergence.

1. Le rendu ordinaire converge d’abord.
2. Le moteur choisit un décalage sous-pixel.
3. Le reseed sélectif remet la frontière concernée en requêtes exactes.
4. Le même chemin d’itération reconverge.
5. La couleur est accumulée dans une texture rgba16float.

Le format 16 bits de cette texture est un choix de stockage, indépendant de
l’arithmétique des shaders. Les shaders de couleur utilisent désormais un seul
chemin arithmétique f32.

Lorsque le payload z′/z″ est valide, l’AA peut déplacer analytiquement la valeur
échappée pour éviter de recalculer certains échantillons. Ce mécanisme reste
local à l’AA : il ne remplit pas les voisins du rendu ordinaire.

## Ce que mesure le panneau de performance

Les mesures séparent les coûts :

- **Itération** : calcul fractal, piloté par le lot adaptatif ;
- **Reprojection** : uniquement lors d’un pan ou d’une réinitialisation ;
- **Resolve** : copie ou interpolation temporaire des valeurs et de la géométrie analytique ;
- **Couleur** et **Present** : shading, palette et accumulation AA.

Le nombre « Pixels restants » agrège les requêtes exactes et les continuations.
Il n’existe plus de second compteur « pixels actifs » ni de seuil destiné à
geler un raffinement spatial.

## Résumé

| Mécanisme | Rôle |
|---|---|
| Requête exacte -1 | État unique d’un texel neuf ou invalidé |
| État de continuation | Reprendre un calcul interrompu par le budget temporel |
| Lot adaptatif | Ajuster le coût de l’itération au GPU et au FPS demandé |
| Resolve bilinéaire | Présentation provisoire, sans effet sur le calcul |
| Reprojection | Réutiliser l’état lors d’un pan |
| Fusion live/figée | Maintenir une image stable pendant le zoom |
| AA sélectif/analytique | Améliorer les contours après convergence |

Le modèle ordinaire est donc simple : **une grille exacte, un budget temporel
adaptatif et un seul fallback bilinéaire purement visuel**.
