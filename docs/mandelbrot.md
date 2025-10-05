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
Cela permet de gagner environ un ordre de grandeur en performance.
Cependant, le gain est limité au nombre de cœurs disponibles sur la machine, souvent entre 4 et 16.

On peut aussi utiliser des techniques de vectorisation pour traiter plusieurs pixels en une seule opération.
On peut en particulier utiliser les instructions SIMD (Single Instruction, Multiple Data) disponibles sur les processeurs modernes.
On peut espérer un gain de performance supplémentaire d'un facteur 4.
Mais cela demande un peu plus de travail pour écrire du code qui utilise ces instructions.

Le meilleur moyen, et de loin, est en fait d'utiliser le GPU (Graphics Processing Unit) qui est exactement fait pour ce genre de tâches parallèles.

Les GPU modernes disposent de milliers de cœurs qui peuvent effectuer des calculs en parallèle. 
Ça nous donne cette fois-ci trois ordres de grandeur en performance.

En revanche, cela vient avec un inconvénient : seuls les flottants en simple précision sont supportés de manière efficace.

#### WebGPU

WebGPU est une API web moderne qui permet d'accéder aux capacités de calcul des GPU.

Il existe une implémentation de l'API WebGPU web, appelée *WGPU*, qui peut être décorrélée du navigateur.
Cela permet d'écrire des applications natives en Rust, C++ ou autres langages en utilisant l'API de WebGPU.

En effet, l'avantage de l'API de WebGPU est qu'elle permet d'apporter une couche d'abstraction au-dessus des différentes
SDKs des fabricants de GPU (DirectX, Metal, Vulkan) tout en offrant des fonctionnalités modernes et bas niveau, ce qui manque à OpenGL/WebGL.
Elle est donc intéressante en dehors du contexte web, par exemple pour la construction d'un moteur graphique d'une application native sans dépendre d'une API graphique spécifique.

Vous connaissez peut-être *WebGL*, qui est une API web pour le rendu 3D basée sur OpenGL ES 2.0.
WebGL est largement supporté par les navigateurs, mais il est assez ancien et limité en fonctionnalités.

WebGPU offre plusieurs avantages par rapport à WebGL, il permet notamment :

 - de faire des calculs généraux sur le GPU (GPGPU), pas seulement du rendu graphique, en utilisant des *compute shaders*.
 - d'accéder à une gestion mémoire plus flexible et performante (buffers, textures, bind groups).
 - d'utiliser des commandes asynchrones et des promesses pour gérer les opérations GPU. En permettant de mieux contrôler le flux de données entre le CPU et le GPU.
 - d'avoir une API plus moderne et plus proche des API graphiques natives (Vulkan, DirectX 12, Metal).
 - de précompiler les shaders

Au global, on peut dire qu'il permet de mieux exploiter les capacités des GPU.
L'API est plus bas niveau et plus proche du matériel. 
Cela implique aussi que l'API est un peu plus complexe à utiliser que WebGL.

Une bonne ressource pour comparer WebGL et WebGPU est disponible ici : https://webgpufundamentals.org/webgpu/lessons/webgpu-from-webgl.html

Voici un exemple de code source *TypeScript* qui initialise un contexte WebGPU et crée un buffer pour stocker les données des pixels.

```typescript
async function initWebGPU(canvas: HTMLCanvasElement) {
    if (!navigator.gpu) {
        throw new Error("WebGPU is not supported on this browser.");
    }
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: format,
        alphaMode: 'opaque',
    });
    const width = canvas.width;
    const height = canvas.height;
    const pixelBuffer = device.createBuffer({
        size: width * height * 4, // 4 bytes per pixel (RGBA)
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    return { device, context, format, pixelBuffer };
}
```

Une bonne ressource : https://thesyntaxdiaries.com/webgpu-complete-guide-next-generation-graphics-computing-2025

Définir les éléments de base pour utiliser WebGPU.

Adapter
Device
Queue
Buffer
Texture
Sampler
Bind Group
Pipeline
Context
Bind group layout
Shader module
Command encoder
Render pass
Command buffer




#### Shaders

### Gagner en précision

#### Théorie de la perturbation

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
