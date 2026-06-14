## Context

Lors des translations, le moteur WebGPU réutilise la texture précédemment calculée en la décalant d'un nombre entier de texels, puis calcule uniquement les nouveaux pixels aux bordures. Ce décalage est modélisé dans `Engine.ts` via :
```typescript
shiftTexX = -(deltaDx * texSize) / (2 * scale * neutralExtent)
```
Ce décalage de texture est ensuite arrondi à l'entier le plus proche via `Math.round(shiftTexX)`. Cependant, le calcul des nouveaux pixels par le shader utilise le centre exact (`cx`, `cy`) passé dans les uniforms. S'il existe une partie fractionnaire non nulle dans `shiftTexX`, une couture visuelle (un décalage sub-pixel) apparaît entre les pixels réutilisés et les nouveaux pixels calculés.

## Goals / Non-Goals

**Goals:**
- Éliminer complètement les coutures et artefacts visuels lors des translations en dehors des phases de zoom.
- Garantir que le décalage calculé par le GPU correspond toujours exactement à un nombre entier de pixels physiques.
- Préserver un mouvement fluide à basse vitesse (comme la décélération physique) en accumulant les déplacements sub-pixel sans figer la vue.
- Assurer le fonctionnement correct à n'importe quel niveau de zoom profond sans risque d'underflow des réels double précision.

**Non-Goals:**
- Aligner les pixels lors des zooms/dézooms : le changement d'échelle modifie de toute façon la grille de pixels, rendant l'alignement impossible.

## Decisions

### 1. Stockage séparé du centre continu et du centre de rendu
Pour éviter de figer le mouvement lorsque la vitesse de translation est très faible (déplacement inférieur à $0.5$ pixel par frame), nous séparons l'état du centre en deux :
- `cx_continuous` / `cy_continuous` : accumulateurs en haute précision de la physique continue (avec inertie et friction).
- `cx` / `cy` : les coordonnées de rendu réellement exposées et utilisées par l'Engine, qui sont projetées sur la grille de pixels.

### 2. Snapping basé sur la hauteur physique du Canvas
Le pixel grid du moteur WebGPU est déterminé par la diagonale de la zone d'affichage $D$ (appelée `neutralSize` dans `Engine.ts`) et par le facteur d'aspect $E_N$ (appelé `neutralExtent`). 
Le ratio de conversion complexe-vers-pixels est $P = \frac{D}{2 \cdot E_N} \approx \frac{\text{canvas\_height}}{2}$.
Nous passons les dimensions physiques du canvas au navigateur Rust :
```rust
pub fn step(&mut self, canvas_width: Option<f64>, canvas_height: Option<f64>) -> Vec<String>
pub fn translate_direct(&mut self, dx: f64, dy: f64, canvas_width: Option<f64>, canvas_height: Option<f64>)
```
Si les dimensions sont présentes et que le zoom n'est pas actif (`self.vscale == 1.0` et pas de transition d'échelle), nous appliquons le snapping. Sinon, le centre de rendu prend directement la valeur du centre continu.

### 3. Calcul du Snapping en coordonnées relatives
Pour éviter l'underflow de l'échelle $S$ à des profondeurs de zoom extrême (ex: $10^{-100}$), le snapping est calculé sur le déplacement relatif au centre de référence actuel :
$$rx_{\text{big}} = \frac{cx_{\text{continuous}} - cx_{\text{ref}}}{S}$$
$$ry_{\text{big}} = \frac{cy_{\text{continuous}} - cy_{\text{ref}}}{S}$$
Ces valeurs relatives sont ensuite converties en `f64` (car elles sont à échelle humaine autour de $1.0$), projetées en pixels via $P$, arrondies à l'entier le plus proche, puis reconverties et ajoutées en précision arbitraire :
$$cx = cx_{\text{ref}} + rx_{\text{snapped}} \cdot S$$
$$cy = cy_{\text{ref}} + ry_{\text{snapped}} \cdot S$$

## Risks / Trade-offs

- **[Risk] Saccades à très basse vitesse :** Si la vitesse est extrêmement lente, le centre de rendu peut sembler faire des sauts brusques d'un pixel (staircasing).
  * **Mitigation :** À haute fréquence de rafraîchissement (60 fps+), un saut d'exactement 1 pixel physique sur un écran haute densité est imperceptible, et visuellement bien plus propre qu'un artefact de déchirement ou de flou.
