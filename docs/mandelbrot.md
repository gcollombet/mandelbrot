<script setup>
import Mandelbrot from '../src/components/Mandelbrot.vue'
import ClassicMandelbrot from '../src/components/ClassicMandelbrot.vue'
import MandelbrotOrbits from '../src/components/MandelbrotOrbits.vue'
import ComplexDemo from '../src/components/ComplexDemo.vue'
import MandelbrotController from '../src/components/MandelbrotController.vue'
import IframeMandelbrotLowPrecision from '../src/components/IframeMandelbrotLowPrecision.vue'
</script>
<link rel="stylesheet" href="https://use.typekit.net/fnz7ojs.css">
# WebAssembly, WebGPU, Rust, fractales et autres trucs cools.


## Qu'est-ce que le fractal de Mandelbrot

En mathématiques, l'ensemble de Mandelbrot est une fractale définie comme l'ensemble des points $c$ 
du plan complexe pour lesquels la suite de nombres complexes définie par récurrence par la formule qui suit est bornée :

$$
\begin{cases}
z_0=0\\
z_{n+1}=z_n^2+c
\end{cases}
$$



Nous pouvons visualiser ce qu'il se passe avec cette suite sur un diagramme.
Le diagramme représente le plan complexe en 2D, l'axe horizontal représentant la partie réelle et l'axe vertical la partie imaginaire.
Le point $c$ est représenté en rouge et il prend la valeur pointé par le curseur sur le diagramme.

Voici ce que ça donne pour trois itérations. Vous observerez que :

Le premier point est $z_0=0+0i$, c'est défini dans la formule

Le second est $z_1$ est égal à $c$ (le point rouge).
En effet $z_1=z_0^2+c$ or comme $z_0=0$, $z_0^2=0$ donc $z_1=c$.

Le troisième est $z_2=z_1^2+c$.

<MandelbrotOrbits
  :cx="'-0.5'"
  :cy="'0.0'"
  :scale="'1'"
  :angle="'0.0'"
    :showOrbitLabels="true"
    :orbitIterations="3"
/>

Pour rappel, quand on élève un nombre complexe au carré, on élève sa norme au carré et on double son argument.

Plus généralement, la multiplication de deux nombres complexes revient à multiplier leurs normes et additionner leurs arguments.

Tandis que l'addition de deux nombres complexes revient à additionner leurs parties réelles et leurs parties imaginaires.

<ComplexDemo />

On peut continuer à itérer la suite et observer ce qu'il se passe. Voici ce que ça donne pour 10 itérations.

<MandelbrotOrbits
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1'"
:angle="'0.0'"
:showOrbitLabels="false"
:orbitIterations="10"
/>

On commence à observer que la suite semble converger vers un point fixe ou bien diverger vers l'infini.

Quand la suite converge, on dit que le point $c$ appartient à l'ensemble de Mandelbrot. La suite reste bornée. Les lignes sont colorées en vert.

Quand la suite diverge, on dit que le point $c$ n'appartient pas à l'ensemble de Mandelbrot. La suite n'est pas bornée. Les lignes sont colorées en bleu.

Voici maintenant ce que ça donne si on colorie en noir les points qui appartiennent à l'ensemble de Mandelbrot et en gris ceux qui n'y appartiennent pas.

<MandelbrotOrbits
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1'"
:angle="'0.0'"
:showMandelbrot="true"
:showOrbitLabels="false"
:orbitIterations="20"
/>

En noir, vous visualisez donc l'ensemble de Mandelbrot.

Vous avez surement observé que plus l'on s'éloigne du centre de l'ensemble de Mandelbrot, plus la suite diverge rapidement.

Le corrolaire est que plus on se rapproche du bord de l'ensemble de Mandelbrot, plus la suite converge lentement.

## Dessiner l'ensemble de Mandelbrot

Vous vous demandez peut-être comment on peut savoir si un point appartient ou non à l'ensemble de Mandelbrot ?

Il existe un critère simple : si la norme de $z_n$ dépasse $2$, alors la suite diverge vers l'infini. C'est prouvé.

On peut donc calculer pour chaque point combien d'itérations sont nécessaires pour que la norme de $z_n$ dépasse $2$.

Pour éviter de calculer indéfiniment pour les points qui sont dans l'ensemble ou bien très proche du bord, 
on fixe un nombre maximum d'itérations.

Observez la taille des vecteurs $z_n$ dans l'illustration suivante. Ceux coloriés en cyan ont une norme inférieure à $2$, 
celui coloriés en rouge a une norme supérieure à $2$. 

Le calcul s'arrête dès que la norme dépasse $2$ ou bien que le nombre maximum d'itérations est atteint.

<MandelbrotOrbits
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1.5'"
:angle="'0.0'"
:showMandelbrot="true"
:showOrbitLabels="false"
:showPalette="false"
:showOrbitVectors="true"
:orbitIterations="100"
/>

Voici un exemple de code source en *TypeScript* qui calcule le nombre 
d'itérations nécessaires pour que la norme de $z_n$ dépasse $2$ pour un point $c$ donné.

```typescript
function mandelbrotEscapeTime(c: Complex, maxIterations: number): number {
    let z = new Complex(0, 0);
    for (let n = 0; n < maxIterations; n++) {
        if (z.norm() > 2) {
            return n; // Le point n'appartient pas à l'ensemble de Mandelbrot
        }
        z = z.mul(z).add(c); // z = z^2 + c
    }
    return maxIterations; // Le point appartient probablement à l'ensemble de Mandelbrot
}
```

Voici ce que ça donne en coloriant les points en fonction du nombre d'itérations nécessaires pour que la norme de $z_n$ dépasse $2$.

Plus le nombre d'itérations est grand, plus la couleur est clair.

<MandelbrotOrbits
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1.5'"
:angle="'0.0'"
:showMandelbrot="true"
:showOrbitLabels="false"
:showPalette="true"
:showOrbitVectors="true"
:orbitIterations="100"
/>

Voilà un exemple simple code source en *TypeScript* qui dessine l'ensemble de Mandelbrot dans un canvas HTML, en utilisant la fonction `mandelbrotEscapeTime` définie précédemment.

```typescript
function drawMandelbrot(canvas: HTMLCanvasElement, maxIterations: number) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // Convertir les coordonnées du pixel en coordonnées du plan complexe
            const real = (x / width) * 3.5 - 2.5;
            const imag = (y / height) * 2.0 - 1.0;
            const c = new Complex(real, imag);
            const n = mandelbrotEscapeTime(c, maxIterations);
            // Noir pour l'ensemble, nuances de gris pour l'extérieur
            const color = n === maxIterations ? [0, 0, 0] : [n % 256, n % 256, n % 256]; 
            const index = (x + y * width) * 4;
            imageData.data[index] = color[0];     // Rouge
            imageData.data[index + 1] = color[1]; // Vert
            imageData.data[index + 2] = color[2]; // Bleu
            imageData.data[index + 3] = 255;      // Alpha
        }
    }
    ctx.putImageData(imageData, 0, 0);
}
```
    

Voici ce que ça donne avec une palette de couleurs cyclique.

<Mandelbrot
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1.5'"
:angle="'0.0'"
:activatePalette="true"
:activateSkybox="false"
:activateTessellation="false"
:activateWebcam="false"
:activateShading="false"
:activateZebra="false"
/>

Vous noterez qu'il y a un effet de bandes dû au fait que le nombre d'itérations est un entier.

On peut le faire ressortir en ne coloriant que les itérations impaires.

<Mandelbrot
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1.5'"
:angle="'0.0'"
:activatePalette="true"
:activateSkybox="false"
:activateTessellation="false"
:activateWebcam="false"
:activateShading="false"
:activateZebra="true"
/>

On peut également lisser les couleurs en utilisant la valeur de $\|z_n\|$.

La formule de lissage est la suivante :

$n_{smooth} = n + 1 - \delta$

$\delta = \frac{\log(\frac{\|z_n\|}{2 \log(2)})}{\log(2)}$

On se sert du nombre entier d'itérations $n$ et on ajoute un $\delta$ calculé en fonction $\|z_n\|$.

Voici ce que ça donne avec un lissage.

<Mandelbrot
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1.5'"
:angle="'0.0'"
:activatePalette="true"
:activateSkybox="false"
:activateTessellation="false"
:activateWebcam="false"
:activateShading="false"
:activateZebra="false"
:activateSmoothness="true"
/>

## Quelques caractéristiques intéressantes

Une des caractéristiques intéressantes de l'ensemble de Mandelbrot et des fractals en général est que l'on peut zoomer 
indéfiniment sur sa structure et qu'il est auto-similaire.
C'est-à-dire que si l'on zoome sur certaines parties de l'ensemble, on retrouve des structures similaires à l'ensemble global.
Dans le cas de l'ensemble de Mandelbrot, on retrouve des mini-Mandelbrots un peu partout.

Contrairement à d'autres fractales, l'ensemble de Mandelbrot n'est pas strictement auto-similaire, 
c'est aussi ce qui le rend intéressant, car il présente une grande variété de formes et de structures.

<ClassicMandelbrot />

Ce sont là quelques exemples choisis parmi une infinité de possibilités.

Ce qui est intéressant finalement, c'est plutôt de naviguer librement dans l'ensemble et découvrir ses structures.

<MandelbrotController
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1.5'"
:angle="'0.0'"
:activatePalette="true"
:activateSkybox="false"
:activateTessellation="false"
:activateWebcam="false"
:activateShading="true"
:activateZebra="false"
:activateSmoothness="true"
/>

## Performance

Le dessin de l'ensemble de Mandelbrot est assez coûteux en calculs.

En effet, pour chaque pixel de l'image, il faut effectuer un certain nombre d'itérations 
pour déterminer si le point correspondant dans le plan complexe appartient ou non à l'ensemble de Mandelbrot.

Sachant que chaque itération implique plusieurs opérations sur des nombres complexes (multiplications et additions).

Par ailleurs, plus le niveau de zoom est élevé, plus le nombre d'itérations nécessaires pour obtenir une image de qualité augmente.

C'est parce que lorsque l'on zoome, on cherche toujours à se rapprocher du bord de l'ensemble de Mandelbrot, afin de découvrir ses détails.
Or, plus on se rapproche du bord, plus la suite diverge lentement, 
et donc plus il faut d'itérations pour déterminer l'appartenance à l'ensemble.

Sinon, on se retrouve avec une image entièrement noire car on n'a pas itéré assez longtemps pour que la norme dépasse $2$ et donc tout les points sont considérés comme appartenant à l'ensemble.

A des niveaux de zoom très élevés, là où les motifs sont les plus intéressants,
il peut être nécessaire d'effectuer des milliers, voire des millions d'itérations par pixel.

Voici un exemple de rendu typique que l'on peut obtenir avec des calculs en double précision côté CPU en JavaScript.

<IframeMandelbrotLowPrecision />

## Précision numérique

Un autre défi majeur dans le rendu à des niveaux de zoom élevés est la précision numérique.

Les calculs sont effectués en utilisant des nombres à virgule flottante, qui ont une précision limitée.

### Rappel sur les nombres flottants

Les flottants de simple précision (32 bits) offrent environ 7 chiffres significatifs (en base 10),
tandis que les flottants double précision (64 bits) en offrent environ 15.

Exemple de représentation en simple précision (32 bits) selon la norme IEEE 754 :

| Signe (1 bit)  | Exposant (8 bits) | Mantisse (23 bits)      |
|----------------|-------------------|-------------------------|
| S              | EEEEEEEE          | MMMMMMMMMMMMMMMMMMMMMMM |

 - **La mantisse** représente la partie significative du nombre. 
23 bits permet de représenter environ 7 chiffres significatifs.
 - **L'exposant** détermine l'échelle du nombre. 
8 bits permet de représenter des exposants allant de -126 à +127.
 - **Le signe** indique si le nombre est positif ou négatif.

C'est-à-dire, que l'on peut représenter des nombres allant d'environ $10^{-38}$ à $10^{38}$, mais avec une précision d'environ $7$ chiffres significatifs.

Par exemple, le nombre $12345.67$ peut être représenté avec une précision suffisante.

Il s'agit de $1.234567 \times 10^4$. Ou une mantisse de $1.234567$ et un exposant de $4$.

Sur le même principe, on peut représenter des nombres très grands comme $3.402823 \times 10^{38}$ 
ou très petits comme $1.175494 \times 10^{-38}$.

Bien sûr, les flottants ne sont pas représentés en base 10, mais en base 2, mais le principe est le même.

On pourra donc représenter des nombres très grands ou très petits, mais avec une précision limitée.

On dit que la virgule "flotte" car la position de la virgule varie en fonction de l'exposant.

Cela implique que l'on a plus de valeur représentable très proche de $0$. Les flottant suivent en effet une distribution logarithmique.

Cela implique aussi que l'on ne peut pas additionner deux nombres de manière fiable si leur ordre de grandeur est très différent.

Par exemple, si l'on ajoute $4.2 \times 10^{-3}$ à $4.2 \times 10^7$, le résultat sera  $4.2 \times 10^7$.

En effet, le résultat réel demanderait une précision de $10$ chiffres significatifs : $4200000.0042$.

Ce qui correspond à la différence entre leurs exposants respectifs : $7 - (-3) = 10$.

Un flottant en simple précision ne peut donc pas représenter ce nombre avec une précision suffisante.

### Perte de précision lors du zoom

Lorsque qu'on calcule chaque point, on utilise une valeur de $c$ qui correspond à la position du pixel dans le plan complexe.
Quand on est à un niveau de zoom élevé, la différence entre les coordonnées des pixels devient très petite.
On va vouloir ajouter un nombre très petit à un nombre $c$ (qui représente le centre de l'écran) potentiellement grand.
C'est à ce moment-là que l'on perd de la précision. Car le nombre petit n'a plus d'effet sur le nombre-grand.

Sans surprise, on pourra donc atteindre des niveaux de zoom qui correspondent à la précision des nombres flottants utilisés.

Pour du simple précision, on pourra atteindre un zoom d'environ $10^{-7}$ et pour du double précision, un zoom d'environ $10^{-15}$.

On ne se le représente peut-être pas comme ça, mais en réalité $10^{-7}$ c'est assez vite atteint 
et l'on se sent vite frustré de ne pas pouvoir zoomer plus.

Voici ce que ça donne avec des calculs en simple précision, 32 bit.

<iframe 
width="688" height="500" 
frameborder="0"
style="border-radius: 10px;"
src="https://www.shadertoy.com/embed/tXfyDM?gui=false&t=10&paused=false&muted=false" 
allowfullscreen></iframe>

Même avec du double précision, on se retrouve vite limité.

## Solutions

Pour améliorer les performances et la précision, plusieurs solutions existent.

### Gagner en performance

#### Le choix du langage

Pour améliorer les performances, on pourrait déjà utiliser un langage compilé comme *Rust* ou *C++*.
Mais pour de l'algorithmique pure, on ne gagnerait pas énormément.
Cela peut permettre pas exemple au compilateur de vectorisé certains calculs grâce à des instructions SIMD bien que ce ne soit pas garanti.
De plus le gain serait limité à un facteur 2 ou 4.

#### La parallelisation

On peut tirer parti de la parallélisation.
L'algorithme de dessin est entièrement parallélisable puisque le calcul de chaque pixel est indépendant des autres.
On peut donc utiliser plusieurs cœurs de CPU pour effectuer les calculs en parallèle.
Cependant, le gain est limité au nombre de cœurs disponibles sur la machine, souvent entre 4 et 16.

On peut aussi utiliser des techniques de vectorisation pour traiter plusieurs pixels en une seule opération.
On peut en particulier utiliser les instructions SIMD (Single Instruction, Multiple Data) disponibles sur les processeurs modernes.
On peut espérer un gain de performance supplémentaire d'un facteur 4.
Mais cela demande un peu plus de travail pour écrire du code qui utilise ces instructions.

Le meilleur moyen, et de loin, est en fait d'utiliser le GPU (Graphics Processing Unit) qui est exactement fait pour ce genre de tâches parallèles.

Les GPU modernes disposent de milliers de cœurs qui peuvent effectuer des calculs en parallèle. 
Ça nous donne cette fois-ci trois ordres de grandeur en performance.

En revanche, cela vient avec un inconvénient : seuls les flottants en simple précision sont supportés de manière efficace par les GPU actuels.

### WebGPU



#### Présentation de la technologie

WebGPU est une API web moderne qui permet d'accéder aux capacités de calcul des GPU.

Il existe une implémentation de l'API WebGPU web, appelée *WGPU* et écrite entirement en *Rust*, qui peut être décorrélée du navigateur.
Cela permet d'écrire des applications natives en Rust, C++ ou autres langages en utilisant l'API de WebGPU.

En effet, l'avantage de l'API de WebGPU est qu'elle permet d'apporter une couche d'abstraction au-dessus des différentes
API GPU natives (DirectX, Metal, Vulkan) tout en offrant des fonctionnalités modernes et bas niveau, ce qui manque à OpenGL/WebGL.
Elle est donc intéressante en dehors du contexte web, par exemple pour la construction d'un moteur graphique d'une application native sans dépendre d'une API graphique spécifique.

Vous connaissez peut-être *WebGL*, qui est une API web pour le rendu 3D basée sur OpenGL ES 2.0.
WebGL est largement supporté par les navigateurs, mais il est assez ancien et limité en fonctionnalités.

WebGPU offre plusieurs avantages par rapport à WebGL, il permet notamment :

 - de faire des calculs généraux sur le GPU (*General Purpose GPU* ou GPGPU), pas seulement du rendu graphique, en utilisant des *compute shaders*.
 - d'accéder à une gestion mémoire plus flexible et performante (buffers, textures, bind groups).
 - d'utiliser des commandes asynchrones pour gérer les opérations GPU. En permettant de mieux contrôler le flux de données entre le CPU et le GPU. Ce qui améliore très nettement les performances.
 - d'avoir une API plus moderne et plus proche des API graphiques natives (Vulkan, DirectX 12, Metal) qui permet d'exploiter les dernières avancées matérielles des GPU.

Au global, on peut dire qu'il permet de mieux exploiter les capacités des GPU.
L'API est plus bas niveau et plus proche du matériel. 
Cela implique aussi que l'API est un peu plus complexe à utiliser que WebGL.

Une bonne ressource pour comparer WebGL et WebGPU est disponible ici : https://webgpufundamentals.org/webgpu/lessons/webgpu-from-webgl.html

WebGPU est une technologie très récente et n'est pas encore supportée par tous les navigateurs.
Elle est disponible sur Chrome et Edge depuis 2023, sur Firefox depuis juillet 2025 (hors macOS, linux et mobile) et sur Safari depuis septembre 2025 (uniquement sur Tahoa).
C'est donc vraiment ce mois-ci que WebGPU se lance pour le grand public.

#### Initialiser WebGPU

Voici un exemple de code source *TypeScript* qui initialise un contexte WebGPU et crée un buffer pour stocker les données des pixels.

```typescript
async function initWebGPU(canvas: HTMLCanvasElement) {
    if (!navigator.gpu) {
        throw new Error("WebGPU is not supported on this browser.");
    }
    // Permet de demander un "adapter" 
    // qui lui même permet de demander un objet "device"
    // Cela demande au système de sélectionner 
    // un GPU selon ses prôpre critères (ex. batterie, secteur).
    // En effet, certains appareils en dispose de plusieurs.
    // Il peut également retourner un adaptateur de secour 
    // entiérement logiciel si aucun adaptateur matériel n'est disponible.
    // On peut forcer le choix vers le GPU le plus performant
    // grâce à un paramètre
    const adapter = await navigator.gpu.requestAdapter();
    // Permet de demander un device qui est l'objet nécessaire
    // pour effectuer tout les rendu.
    // Il permet de demander en particulier un ensemble de fonctionnalités
    // ainsi que de définir des limites. Par exemple, sur les tailles maximum
    // de texture, de buffer, etc.
    // Si l'adaptateur ne sait pas honnorer la demande, une erreur est retournée.
    const device = await adapter.requestDevice();
    // Ce qui suit configure un canvas pour que son contenue puisse être
    // utilisé comme surface de rendu par le device.
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: format,
        alphaMode: 'opaque',
    });
    const width = canvas.width;
    const height = canvas.height;
    return { device, context, format };
}
```

#### Concepts de base de WebGPU

Maintenant, que nous avons initialisé qui est notre interface de commande du GPU, `GPUDevice`, 
comment l'utilise-t-on ?

##### Comment parler au GPU ?

Il faut d'abord comprendre comment le CPU et le GPU intéragissent.

Le CPU reste bien sûr le chef d'orchestre, 
le GPU n'est un périphérique,
auquel le CPU doit : 

 * donner des instructions
 * fournir les données utiles à un calcul
 * récupérer les résultats du calcul

##### Un mot sur la gestion de la mémoire

Il faut avoir à l'esprit que, 
au moins d'un point de vue logique et bien souvent physique, 
le GPU dispose de sa propre mémoire, parfois appelée la mémoire vidéo.

Si on a des données en mémoire RAM dont on veut qu'elles soient 
utilisées dans un calcul fait par le GPU, 
il faudra les copier au préalable dans la mémoire vidéo.

Le principe du GPU est de permettre de faire des calculs de manière massivement parallel.
Aussi, la manière de lui mettre à disposition des données reflète cette capacité.
Tout doit donc être très organisé.

Voici quelques exemples qui illustrent ceci : 

 - Il existe des manières pré-établies de fournir une liste de sommets, avec des formats de données pré-définies.
   Par exemple, on fournit les coordonnées de chaque triangle, 
   en fournissant les coordonnées en trois dimensions des trois points du triangle.
   Ou bien on fournit les coordonnées de chaque point, et on fournit un tableau d'indices qui indique quels points forment chaque triangle.
 - Les formats des textures sont pré-définies : par exemple `rgba16`, `rbg8`, etc.
 - Les tableaux de données génériques doivent être fournis dans des buffers alignés sur quatre bytes. Ce qui permet d'optimiser les accès mémoire.
 - Les tableaux de données `GPUBuffer` doivent être créés avec des options qui indiquent comment ils seront utilisés : 
   comme source de données pour un calcul, comme destination pour un calcul, ou bien les deux. Tout cela permet au driver de faire des optimisations.

Tout est pensé pour que le GPU puisse accéder aux données de manière efficace et rapide.
Les formats de données, l'alignement en mémoire, la taille des buffers, etc. utilisent au maximum des puissances de 2.

Ce n'est pas par soucis d'esthétique mais,
car cela permet d'utiliser des opérations binaires très rapides pour calculer les adresses mémoire.
En effet, les opérations binaires `<<` (shift left) ou `>>` sont les plus simples et les plus rapides à exécuter par un processeur.
Or, multiplier ou diviser par deux revient à faire un shift binaire.

Ça peut sembler dérisoire, mais à l'échelle d'un GPU qui doit répartir ces calculs sur des milliers de cœurs,
ça fait une différence notable, car il doit savoir en permanence où sont les données en mémoire.

##### Principaux éléments de WebGPU

Voici une liste des principaux éléments à connaître pour utiliser WebGPU :

| Ressource                                       | Définition                                                                                                                                                                                                       |
|-------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
 | `GPUQueue`                                      | Le CPU interagit avec le GPU avec des commandes asynchrones transmises via une *queue*. Les commandes sont créées à l'aide d'un *encodeur de commande* et sont soumises au GPU sous forme de `GPUCommandBuffer`. |
 | `GPUCommandEncoder`                             | permet de créer des *encodeurs de passe de rendu ou de calcul*.                                                                                                                                                  |
 | `GPURenderPassEncoder`, `GPUComputePassEncoder` | Un *encodeur de passe de rendu ou de calcul* permet de définir une passe de rendu à partir d'un *pipeline de rendu ou de calcul*.                                                                                |
 | `GPURenderPipeline`, `GPUComputePipeline`       | : Un *pipeline de rendu ou de calcul* définit les *shaders* à utiliser, les données traitées et la manière dont elles sont structurées.                                                                          |
 | `GPUPipelineLayout`                             | Un *layout de pipeline* est composée de plusieurs *bind group layouts*.                                                                                                                                          |
 | `GPUBindGroupLayout`                            | Un *bind group layout* définit la structure d'un *bind group* avec une liste de `GPUBindGroupLayoutEntry`.                                                                                                       |
 | `GPUBindGroup`                                  | Un *bind group* est une liste de ressources (buffers, textures, samplers), `GPUBindGroupEntry`, qui sont liées ensemble pour être utilisées par un shader.                                                       |
 | `GPUBuffer`                                     | Un *buffer* est une zone de mémoire allouée sur le GPU pour stocker des données (par exemple, des sommets, des indices, des constantes).                                                                         |
 | `GPUTexture`                                    | Une *texture* est une image stockée sur le GPU qui peut être utilisée comme source ou destination dans un shader.                                                                                                |
 | `GPUSampler`                                    | Un *sampler* est un objet qui définit comment une texture est échantillonnée (par exemple, filtrage, répétition).                                                                                                |

Voici un schéma qui illustre les interactions entre ces différents éléments.

![WebGPU Ressource Schema](./webGPU.svg)

##### Un exemple concret

Voici un exemple de code source *TypeScript* qui crée un pipeline de rendu simple avec un shader de vertex et un shader de fragment.

```typescript

export async function render(
    canvas: HTMLCanvasElement,
    options?: {
        // Fournir des fichiers .wgsl ou des constantes
        compute: string;
        render: string;
    }
) {
    // a) Initialiser WebGPU et le canvas
    const {device, context, format} = await initWebGPU(canvas);
    const lenght = {width: canvas.width, height: canvas.height};
    // b) Préparer les ressources cibles
    const ressources = createResource(device, length);
    // c) Charger les shaders (depuis fichier ou constante)
    const moduleCompute = await device.createShaderModule({code: compute});
    const moduleRender = await device.createShaderModule({code: render});
    // d) Construire layouts, pipelines et bind groups
    const layouts = createLayouts(device);
    const pipelines = createPipelines(device, {compute: moduleCompute, render: moduleRender}, layouts, format);
    const bindGroups = createBindGroups(device, layouts, ressources);
    // e) Encoder et soumettre une frame
    encodeAndSubmit(device, context, pipelines, bindGroups, length);
}

function createResource(device: GPUDevice, size: GPUExtent3DStrict) {
    const texture = device.createTexture({
        size,
        format: 'rgba8unorm',
        usage: GPUTextureUsage.STORAGE_BINDING 
               | GPUTextureUsage.TEXTURE_BINDING,
    });
    const vueTexture = texture.createView();
    const sampler = device.createSampler(
        {minFilter: 'nearest', magFilter: 'nearest'}
    );
    return {texture, vueTexture, sampler};
}

function createLayouts(device: GPUDevice) {
    const bglCompute = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    access: 'write-only', 
                    format: 'rgba8unorm', 
                    viewDimension: '2d'
                },
            },
        ],
    });
    const bglRender = device.createBindGroupLayout({
        entries: [
            {
                binding: 0, 
                visibility: GPUShaderStage.FRAGMENT, 
                texture: {
                    sampleType: 'float', 
                    viewDimension: '2d'
                }
            },
            {
                binding: 1, 
                visibility: GPUShaderStage.FRAGMENT, 
                sampler: {type: 'filtering'}
            },
        ],
    });
    const layoutCompute = device.createPipelineLayout({
        bindGroupLayouts: [bglCompute]
    });
    const layoutRender = device.createPipelineLayout({
        bindGroupLayouts: [bglRender]
    });
    return {bglCompute, bglRender, layoutCompute, layoutRender};
}

function createPipelines(
    device: GPUDevice,
    modules: { compute: GPUShaderModule; render: GPUShaderModule },
    layouts: { layoutCompute: GPUPipelineLayout; layoutRender: GPUPipelineLayout },
    formatCible: GPUTextureFormat
) {
    const compute = device.createComputePipeline({
        layout: layouts.layoutCompute,
        compute: {module: modules.compute, entryPoint: 'main'},
    });
    const render = device.createRenderPipeline({
        layout: layouts.layoutRender,
        vertex: {module: modules.render, entryPoint: 'vs'},
        fragment: {
            module: modules.render, 
            entryPoint: 'fs', 
            targets: [{format: formatCible}]
        },
        primitive: {topology: 'triangle-list'},
    });
    return {compute, render};
}

function createBindGroups(
    device: GPUDevice,
    layouts: { bglCompute: GPUBindGroupLayout; bglRender: GPUBindGroupLayout },
    ressources: { vueTexture: GPUTextureView; sampler: GPUSampler }
) {
    const bgCompute = device.createBindGroup({
        layout: layouts.bglCompute,
        entries: [{binding: 0, resource: ressources.vueTexture}],
    });
    const bgRender = device.createBindGroup({
        layout: layouts.bglRender,
        entries: [
            {binding: 0, resource: ressources.vueTexture},
            {binding: 1, resource: ressources.sampler},
        ],
    });
    return {bgCompute, bgRender};
}

function encodeAndSubmit(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipelines: { compute: GPUComputePipeline; render: GPURenderPipeline },
    bindGroups: { bgCompute: GPUBindGroup; bgRender: GPUBindGroup },
    length: { width: number; height: number }
) {
    const encoder = device.createCommandEncoder();
    // Passe de calcul: écrit dans la texture
    {
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipelines.compute);
        pass.setBindGroup(0, bindGroups.bgCompute);
        const wgX = Math.ceil(length.width / 8);
        const wgY = Math.ceil(length.height / 8);
        pass.dispatchWorkgroups(wgX, wgY);
        pass.end();
    }
    // Passe de rendu: échantillonne la texture et affiche à l'écran
    {
        const view = context.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view, 
                loadOp: 'clear', 
                clearValue: {r: 0, g: 0, b: 0, a: 1}, 
                storeOp: 'store'
            }],
        });
        pass.setPipeline(pipelines.render);
        pass.setBindGroup(0, bindGroups.bgRender);
        pass.draw(3, 1, 0, 0);
        pass.end();
    }
    device.queue.submit([encoder.finish()]);
}
```

##### Pour aller plus loin

Pour aller plus loin, voici une bonne ressource sur WebGPU : 
https://thesyntaxdiaries.com/webgpu-complete-guide-next-generation-graphics-computing-2025

#### Shaders

Les shaders sont des petits programmes qui s'exécutent sur le GPU.

Ils sont écrits dans un langage spécifique, le *WGSL* (WebGPU Shading Language).

Ce langage est ensuite compilé en code intermédiaire *SPIR-V* (Standard Portable Intermediate Representation) 
ou dans un autre langage en fonction de l'API graphique sous-jacente, grâce à un compilateur comme *Naga*.

SPIR-V est un format binaire standardisé pour les shaders, qui permet de les rendre portables entre différentes plateformes et API graphiques.

Ce code portable est ensuite compilés par le driver du GPU en code machine spécifique au GPU. 
C'est une légère simplification, car en réalité le driver peut faire plusieurs étapes de compilation intermédiaire.
Par exemple, pour un GPU NVIDIA, le code SPIR-V est d'abord compilé en PTX (Parallel Thread Execution) 
et envoyé au GPU qui le compile en code machine. 
De manière générale, ce qui se passe dans le driver est propriétaire et n'est pas documenté.

![WGSL Compile Path](./shader.svg)

Voici un exemple de code source WGSL qui définit un shader de vertex et un shader de fragment.

```wgsl
// Bindings Group 0
// |_ Binding 0 : Texture
@group(0) @binding(0) var tex0: texture_2d<f32>;
// |_ Binding 1 : Sampler
@group(0) @binding(1) var smp0: sampler;


struct VSOut { 
    @builtin(position) pos: vec4<f32>;
    @location(0) uv: vec2<f32>; 
};

// Simple vertex shader qui dessine un triangle couvrant tout l'écran
// et qui génère des coordonnées UV pour échantillonner la texture
@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VSOut {
    // Trois sommets pour un triangle couvrant tout l'écran
    var pos = array<vec2<f32>, 3>(
      vec2<f32>(-1.0, -3.0), vec2<f32>( 3.0,  1.0), vec2<f32>(-1.0,  1.0)
    );
    // Coordonnées UV correspondantes
    var uv  = array<vec2<f32>, 3>(
      vec2<f32>(0.0, 2.0), vec2<f32>(2.0, 0.0), vec2<f32>(0.0, 0.0)
    );
    // Construire la sortie
    var o: VSOut;
    o.pos = vec4<f32>(pos[vi], 0.0, 1.0);
    o.uv = uv[vi];
    // Retourner la sortie
    return o;
}

// Simple fragment shader qui échantillonne la texture
@fragment
fn fs(i: VSOut) -> @location(0) vec4<f32> {
    // Échantillonner la texture avec les coordonnées UV
    return textureSample(tex0, smp0, i.uv);
}
```

### Gagner en précision

Maintenant que nous avons une solution pour paralléliser massivement les calculs sur un matériel dédié, 
il nous reste à adresser le problème de la précision numérique.

Pour cette partie, de prime abort, on pourrait se dire qu'on est borné aux limitations du matériel.

On pourrait utiliser des bibliothèques de calcul en précision arbitraire sur le CPU, mais sur le GPU, il n'y a pas vraiment d'équivalent.
Il existe quelques implémentations qui fonctionnent sur des *compute shader* et qui demandent d'utiliser CUDA.
Ceci bornerait à un usage sur Nvidia et ne permettrait pas de cibler le web.
Par ailleurs ces bibliothèques sont très lente, car elle ne tire pas parti de l'accélération matérielle.

On peut aussi utiliser une solution intermédiaire entre le calcul arbitraire et les nombre flottant matériel.
Il s'agit de la notion de *floatExp*. 
Il s'agit de représenter un chiffre en combinant un flottant 32 bit et un entier non signé de 32 bit supplémentaire pour stocker un exposant supplémentaire.
Une autre variation, les *softfloat* consiste à utiliser deux entiers non signés. Un pour l'exposant et pour la mantisse.

Il existe des implémentations sur GPU de ces derniers : [exemple](https://github.com/Hopetech/libSoftFloat).

Leur utilisation est entre 10 et 20 fois plus lente que les flottant classique.
Mais surtout, si vous avez bien suivi, ne permettent de gagner que très peu de précision dans le cas de softfloat, et à peu près aucune pour les floatExp.
En effet, la mantisse des *floatExp* ne change pas et augmente légèrement pour les *softfloat*, 32 bit, 
sans même atteindre celle des *double* qui est de 52 bit.

Cela veut dire que la perte de précision aura toujours lieu si l'on additionne un grand nombre à un très petit.

On dirait donc que nous sommes dans une impasse.

Ce qu'il faudrait donc c'est de pouvoir faire des calculs avec des nombres de même ordre de grandeur, ou en tout suffisamment proche pour conserver une bonne précision.

On peut remarquer que dans ce cas, un plus grand exposant nous permettrait alors de représenter des valeurs bien plus petites et plus grandes que les flottant standard.

#### Théorie de la perturbation

Vous vous souvenez que plus haut, on a montré que :

$$
\begin{cases}
z_0=0\\
z_1={z_0}^2+c=0^2 + c=c\\
z_3={z_1}^2+c=c^2 + c\\
z_3={z_2}^2+c=(c^2 + c)^2 + c\\
...
\end{cases}
$$

On remarque que le calcul de $z$ peut être définie avec uniquement des termes de $c$.

On a aussi constanté les valeurs de $z$ reste dans le même ordre de grandeur environ avant de diverger rapidement.
Elles semblent tourner autour d'un orbit.

Cela implique donc que pour une valeur $c$ donnée, la précision du calcul est plutôt bien conservée, 
même pour un grand nombre d'itérations.

La précision est en fait perdu avant, quand on calcule la valeur de $c$. 
Car à des niveaux de zoom élevés, la différence entre les coordonnées des pixels devient très petite.
On va vouloir ajouter un nombre très petit à un nombre $c$ (qui représente le centre de l'écran) potentiellement grand.

Ce qu'il faudrait donc c'est avoir de petites valeurs de $c$. 
On pourrait donc s'amuser à zoomer près du point $(0,0)$.
Mais il ne présente aucun intérêt puisque ce point appartient à l'ensemble.
L'écran serait tout noir.

C'est à ce moment qu'on peut faire intervenir la théorie de la perturbation.

#### Précision arbitraire

#### Rust + WebAssembly

### Astuce de rendu, vers le temps réel

#### Ne recalculer que ce qui a changé

##### Le cas de la translation

##### Le cas de la rotation

##### Le cas du zoom

#### Le rendu progressif

#### Améliorer la qualité du rendu avec l'anti-aliasing adaptatif

## Techniques de rendu avancées

### Ajout de la dérivée

#### Blinn-Phong

#### Gouraud

#### Projection de texture

### Tessellation

#### Avec la valeur de l'itération

#### Avec la valeur de $z$

### Un mot sur les couleurs

#### Palettes cycliques

#### Des dégradés agréables grâce à la science des couleurs

[//]: # (https://www.shadertoy.com/view/ttscWn)
[//]: # (https://www.shadertoy.com/view/7ly3Wh)
[//]: # (https://github.com/bertbaron/mandelbrot/tree/main)
[//]: # ()
[//]: # (Avec Shading)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="false")

[//]: # (:activateSkybox="false")

[//]: # (:activateTessellation="false")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="true")

[//]: # (/>)

[//]: # ()
[//]: # (Avec Shading et Palette)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="true")

[//]: # (:activateSkybox="false")

[//]: # (:activateTessellation="false")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="true")

[//]: # (/>)

[//]: # ()
[//]: # (Avec Tesselation)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="false")

[//]: # (:activateSkybox="false")

[//]: # (:activateTessellation="true")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="false")

[//]: # (/>)

[//]: # ()
[//]: # (Avec Tesselation et Palette)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="true")

[//]: # (:activateSkybox="false")

[//]: # (:activateTessellation="true")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="false")

[//]: # (/>)

[//]: # ()
[//]: # (Avec Skybox)

[//]: # ()
[//]: # (<Mandelbrot)

[//]: # (:scale="'1.1'")

[//]: # (:angle="'0.0'")

[//]: # (:cx="'-0.75'")

[//]: # (:cy="'0.0'")

[//]: # (:activatePalette="false")

[//]: # (:activateSkybox="true")

[//]: # (:activateTessellation="false")

[//]: # (:activateWebcam="false")

[//]: # (:activateShading="true")

[//]: # (/>)

## TODO 

Expliquer ce que sont les fractales.

Présentation de la formule

Démonstration intéractive.

Expliquer que c'est facile à coder.

Montrer les limitations : calcul intensif et limite de précision.

Objectif : faire tourner en temps réél et pourquoi pas sur un navigateur

JS lent. Faire du natif ? Multithread, c'est lent aussi. Calcul sur GPU, limite de précision.

Expliquer le modèle de parallélisation des GPU. Pourquoi c'est plus rapide, quels sont les compromis (modèle de mémoire, etc.)

Comment obtenir le meilleur des deux mondes ?

Expliquer d'où vient le problème de précision.

Expliquer comment fonctionne les flottant et ce qui permettrait de conserver de la précision.
C'est-à-dire faire des calculs avec des nombres de même ordre de grandeur.
