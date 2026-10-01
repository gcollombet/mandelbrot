// Tilted 3D view of the current frame: an orthographic camera leaning by
// `tilt` over the relief height field, heading `heading` (screen frame), ray
// cast through the march height prepared by tilt_mips.wgsl and coloured by
// the final linear image of the same raster (with its mip chain).
//
// Ground coordinates are view half-heights, x in [-aspect, aspect], y in
// [-1, 1], y up; one half-height is raster.y / 2 pixels on both axes. The
// surface z lies in [-1, 0]: relief · h / T outside (h <= 0 peaks at the set
// boundary) and a basin inside (tilt_mips.wgsl). At the top plane z = 0 a ray
// crosses the ground at g0 = sx·r + sy/cos(tilt)·e - tan(tilt)/2·e (e the
// heading, r its right-hand normal; the depth-0..1 segment is centred on the
// frame), then travels tan(tilt) along e per unit of depth. `fit` < 1 shrinks
// the view so every ray stays inside the computed frame.
//
// Marching uses the maximum pyramid of z: a ray that passes above a cell's
// maximum skips the whole cell, and the pixel-level walk (then a bisection)
// only happens next to the surface.

// Derivatives of the per-pixel hit are taken after the march loop, whose exit
// is pixel-dependent; a stale lane only mis-triggers supersampling.
diagnostic(off, derivative_uniformity);

struct TiltParams {
  raster: vec2<f32>,   // colour / height raster size in pixels
  aspect: f32,
  tilt: f32,           // radians, [0, 50°]
  heading: vec2<f32>,  // e = (cos, sin) of the heading, screen frame, y up
  relief: f32,         // exaggeration of h / T (applied in tilt_mips.wgsl)
  fit: f32,            // view scale applied to the output coordinates
  interiorDepth: f32,  // basin depth D (tilt_mips.wgsl)
  basinRadius: f32,    // basin length scale R (tilt_mips.wgsl)
  _pad: vec2<f32>,
};

@group(0) @binding(0) var colorTex: texture_2d<f32>;    // linear colour, full mip chain
@group(0) @binding(1) var marchTex: texture_2d<f32>;    // surface z, maximum pyramid in the mips
@group(0) @binding(2) var linearSampler: sampler;
@group(0) @binding(3) var<uniform> params: TiltParams;

const REFINE_STEPS: i32 = 6;
const MAX_ITERATIONS: i32 = 384;
const START_LEVEL: i32 = 6;
// Supersample where the depth jumps between neighbouring output pixels
// (silhouettes); minified areas read a coarser colour mip instead.
const SILHOUETTE_DEPTH: f32 = 0.004;

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  let p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  return vec4<f32>(p[i], 0.0, 1.0);
}

// Ground (half-heights, y up) -> raster pixel (y down).
fn ground_to_pixel(g: vec2<f32>) -> vec2<f32> {
  return vec2<f32>((g.x / (2.0 * params.aspect) + 0.5) * params.raster.x,
                   (0.5 - g.y * 0.5) * params.raster.y);
}

// Surface z at a ground point, bilinear (hardware filtered half-float).
fn surface_z(g: vec2<f32>) -> f32 {
  return textureSampleLevel(marchTex, linearSampler, ground_to_pixel(g) / params.raster, 0.0).r;
}

// Highest surface z in the level-`level` cell holding raster pixel p.
fn cell_max(p: vec2<f32>, level: i32) -> f32 {
  let dims = vec2<i32>(textureDimensions(marchTex, level));
  let cell = clamp(vec2<i32>(floor(p / exp2(f32(level)))), vec2<i32>(0), dims - vec2<i32>(1));
  return textureLoad(marchTex, cell, level).r;
}

// One ray for an output pixel position: returns (ground hit xy, depth).
fn cast_ray(pixel: vec2<f32>) -> vec3<f32> {
  let uv = pixel / params.raster;
  let screen = vec2<f32>((uv.x * 2.0 - 1.0) * params.aspect, 1.0 - uv.y * 2.0) * params.fit;
  let e = params.heading;
  let r = vec2<f32>(e.y, -e.x);
  let cosTilt = cos(params.tilt);
  let tanTilt = tan(params.tilt);
  let g0 = screen.x * r + (screen.y / max(cosTilt, 1e-3) - 0.5 * tanTilt) * e;
  // Along the ray, depth d moves the ground point by pixelsPerDepth raster
  // pixels in direction dirPx (raster y points down).
  let pixelsPerDepth = max(tanTilt * 0.5 * params.raster.y, 1e-4);
  let dirPx = vec2<f32>(e.x, -e.y);
  let p0 = ground_to_pixel(g0);
  let levels = i32(textureNumLevels(marchTex));
  var level = min(START_LEVEL, levels - 1);
  var d = 0.0;
  var hit = false;
  var front = 0.0;
  var back = 1.0;
  for (var i = 0; i < MAX_ITERATIONS; i = i + 1) {
    if (d >= 1.0) { break; }
    let p = p0 + dirPx * (d * pixelsPerDepth);
    if (level > 0) {
      // The ray only descends: across this cell it is lowest where it leaves.
      let size = exp2(f32(level));
      let cellMin = floor(p / size) * size;
      let exitX = select((cellMin.x - p.x) / dirPx.x, (cellMin.x + size - p.x) / dirPx.x, dirPx.x > 0.0);
      let exitY = select((cellMin.y - p.y) / dirPx.y, (cellMin.y + size - p.y) / dirPx.y, dirPx.y > 0.0);
      let exitPx = min(select(1e9, exitX, abs(dirPx.x) > 1e-6), select(1e9, exitY, abs(dirPx.y) > 1e-6));
      let exitDepth = d + (max(exitPx, 0.0) + 0.01) / pixelsPerDepth;
      if (-exitDepth > cell_max(p, level)) {
        // Above the whole cell: jump to where the ray leaves it, then coarser.
        d = exitDepth;
        level = min(level + 1, levels - 1);
      } else {
        level = level - 1;
      }
    } else {
      // Pixel level: step one raster pixel and test the filtered surface.
      let next = min(d + 1.0 / pixelsPerDepth, 1.0);
      if (-next <= surface_z(g0 + next * tanTilt * e)) {
        front = d;
        back = next;
        hit = true;
        break;
      }
      d = next;
      // Back up the pyramid; the level-1 test above re-checks the exit depth.
      level = 1;
    }
  }
  if (hit) {
    for (var i = 0; i < REFINE_STEPS; i = i + 1) {
      let m = 0.5 * (front + back);
      if (-m <= surface_z(g0 + m * tanTilt * e)) { back = m; } else { front = m; }
    }
  }
  let depth = select(1.0, 0.5 * (front + back), hit);
  return vec3<f32>(g0 + depth * tanTilt * e, depth);
}

fn color_at(g: vec2<f32>, lod: f32) -> vec3<f32> {
  return textureSampleLevel(colorTex, linearSampler, ground_to_pixel(g) / params.raster, lod).rgb;
}

// Walls: a steep face (terrace walls, filament ridges, the basin's rim) holds
// no colour of its own in the top-down image; every column would take the
// colour of the single rim pixel above it, i.e. vertical streaks. The faces
// the camera sees drop away from it, so a hit is on a wall when the terrain
// just beyond it (along the ray) stands well above the ray; there the colour
// is the rim's local tint (a coarse colour mip) and darkens with depth.
const WALL_RISE_START: f32 = 0.005;   // terrain above the ray, in z
const WALL_RISE_FULL: f32 = 0.03;
const WALL_TINT_LOD: f32 = 5.0;       // ~32 pixels
const WALL_DEPTH_SHADE: f32 = 0.8;

fn shade_hit(hit: vec3<f32>, lod: f32) -> vec3<f32> {
  let color = color_at(hit.xy, lod);
  let e = params.heading;
  let pixel = 2.0 / params.raster.y; // one raster pixel, in half-heights
  // The ray sits at z = -hit.z; the rim topping the face lies beyond it.
  var beyond = -1.0;
  for (var k = 1; k <= 4; k = k + 1) {
    beyond = max(beyond, surface_z(hit.xy + f32(k) * e * pixel));
  }
  let wall = smoothstep(WALL_RISE_START, WALL_RISE_FULL, beyond + hit.z);
  if (wall <= 0.0) { return color; }
  let rimColor = color_at(hit.xy + 2.0 * e * pixel, WALL_TINT_LOD);
  let shade = 1.0 - WALL_DEPTH_SHADE * smoothstep(0.0, 1.0, hit.z);
  return mix(color, rimColor * shade, wall);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let center = cast_ray(pos.xy);
  let depthJump = max(abs(dpdx(center.z)), abs(dpdy(center.z)));
  // Minification: one output pixel spans `footprint` raster pixels. Across a
  // silhouette the hit jumps, which is not a footprint: keep the finest mip.
  let footprint = max(length(dpdx(center.xy)), length(dpdy(center.xy))) * 0.5 * params.raster.y;
  let lod = select(clamp(log2(max(footprint, 1.0)), 0.0, 4.0), 0.0, depthJump > SILHOUETTE_DEPTH);
  var color = shade_hit(center, lod);
  // Silhouettes: 4 more rays on a rotated grid.
  if (depthJump > SILHOUETTE_DEPTH) {
    let offsets = array<vec2<f32>, 4>(
      vec2<f32>(-0.375, -0.125), vec2<f32>(0.125, -0.375),
      vec2<f32>(0.375, 0.125), vec2<f32>(-0.125, 0.375));
    for (var k = 0; k < 4; k = k + 1) {
      color = color + shade_hit(cast_ray(pos.xy + offsets[k]), lod);
    }
    color = color / 5.0;
  }
  return vec4<f32>(color, 1.0);
}
