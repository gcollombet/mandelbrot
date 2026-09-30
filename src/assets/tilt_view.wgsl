// Tilted 3D view of the current frame: an orthographic camera leaning by
// `tilt` over the relief height field, heading `heading` (screen frame), ray
// cast through the height raster written for cast shadows (h / T, view
// half-heights) and coloured by the final linear image of the same raster.
//
// Ground coordinates are view half-heights, x in [-aspect, aspect], y in
// [-1, 1], y up. The surface is z = clamp(relief · h / T, -1, 0): h <= 0
// peaks at the set boundary, and the interior (no surface) is the floor
// z = -1, as in the stereo depth. At the top plane z = 0 a ray crosses the
// ground at g0 = sx·r + sy/cos(tilt)·e - tan(tilt)/2·e (e the heading, r its
// right-hand normal; the depth-0..1 segment is centred on the frame), then
// travels tan(tilt) along e per unit of depth. `fit` < 1
// shrinks the view so every ray stays inside the computed frame.

// Derivatives of the per-pixel hit are taken after the march loop, whose exit
// is pixel-dependent; a stale lane only mis-triggers supersampling.
diagnostic(off, derivative_uniformity);

struct TiltParams {
  raster: vec2<f32>,   // source / height raster size in pixels
  aspect: f32,
  tilt: f32,           // radians, [0, 50°]
  heading: vec2<f32>,  // e = (cos, sin) of the heading, screen frame, y up
  relief: f32,         // exaggeration of h / T
  fit: f32,            // view scale applied to the output coordinates
  interiorDepth: f32,  // basin depth D in z, [0, 1]; 0 = flat plateau at the rim
  basinRadius: f32,    // basin length scale R, in half-heights
  _pad: vec2<f32>,
};

@group(0) @binding(0) var sourceTex: texture_2d<f32>;   // linear rgb, sample count in alpha
@group(0) @binding(1) var heightTex: texture_2d<f32>;   // h / T, -1e4 where no surface
@group(0) @binding(2) var linearSampler: sampler;
@group(0) @binding(3) var<uniform> params: TiltParams;
@group(0) @binding(4) var seedTex: texture_2d<f32>;     // nearest surface pixel (tilt_distance.wgsl)

const NO_SURFACE: f32 = -1e4;
const MIN_STEPS: f32 = 32.0;
const MAX_STEPS: f32 = 640.0;
const REFINE_STEPS: i32 = 6;
// Supersample where the depth jumps (silhouette) or one output pixel spans
// more than this many source pixels (distant or grazing surface).
const SILHOUETTE_DEPTH: f32 = 0.004;
const FOOTPRINT_PIXELS: f32 = 1.5;

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

// Interior (no surface): a basin z = -D·(1 - exp(-d/R)), d the distance to
// the nearest surface pixel in half-heights. It starts level with the rim and
// sinks smoothly, so no vertical cliff holds the rim colour; D = 0 leaves a
// flat plateau at the rim's height.
fn interior_z(p: vec2<i32>) -> f32 {
  let depth = params.interiorDepth;
  if (depth <= 0.0) { return 0.0; }
  let seed = textureLoad(seedTex, p, 0).xy;
  if (seed.x < 0.0) { return -depth; }
  let d = length(seed - (vec2<f32>(p) + vec2<f32>(0.5))) * 2.0 / params.raster.y;
  return -depth * (1.0 - exp(-d / max(params.basinRadius, 1e-4)));
}

fn height_at(p: vec2<i32>) -> f32 {
  let dims = vec2<i32>(textureDimensions(seedTex));
  if (any(p < vec2<i32>(0)) || any(p >= dims)) { return -params.interiorDepth; }
  let h = textureLoad(heightTex, p, 0).r;
  return select(clamp(params.relief * h, -1.0, 0.0), interior_z(p), h <= NO_SURFACE * 0.5);
}

// Surface depth z at a ground point, bilinear between raster pixel centres.
fn surface_z(g: vec2<f32>) -> f32 {
  let q = ground_to_pixel(g) - vec2<f32>(0.5);
  let base = floor(q);
  let f = q - base;
  let i = vec2<i32>(base);
  return mix(
    mix(height_at(i), height_at(i + vec2<i32>(1, 0)), f.x),
    mix(height_at(i + vec2<i32>(0, 1)), height_at(i + vec2<i32>(1, 1)), f.x),
    f.y);
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
  // March depth d from the top plane (0) to the floor (1): the ray is at
  // z = -d over ground g0 + d·tan(tilt)·e. About one source pixel of ground
  // per step, so thin crests are not stepped over; then bisection.
  let travelPixels = tanTilt * 0.5 * params.raster.y;
  let steps = i32(clamp(ceil(travelPixels), MIN_STEPS, MAX_STEPS));
  var front = 0.0;
  var back = 1.0;
  var hit = false;
  for (var i = 1; i <= steps; i = i + 1) {
    let d = f32(i) / f32(steps);
    if (-d <= surface_z(g0 + d * tanTilt * e)) { back = d; hit = true; break; }
    front = d;
  }
  if (hit) {
    for (var i = 0; i < REFINE_STEPS; i = i + 1) {
      let d = 0.5 * (front + back);
      if (-d <= surface_z(g0 + d * tanTilt * e)) { back = d; } else { front = d; }
    }
  }
  let depth = select(1.0, 0.5 * (front + back), hit);
  return vec3<f32>(g0 + depth * tanTilt * e, depth);
}

fn source_color(g: vec2<f32>) -> vec3<f32> {
  let c = textureSampleLevel(sourceTex, linearSampler, ground_to_pixel(g) / params.raster, 0.0);
  return c.rgb / max(c.a, 1e-6);
}

// Walls: a steep face (terrace walls, filament ridges) holds no
// colour of its own in the top-down image; every column would take the
// colour of the single rim pixel above it, i.e. vertical streaks. The faces
// the camera sees drop away from it, so a hit is on a wall when the terrain
// just beyond it (along the ray) stands well above the ray; there the colour
// is averaged along that rim (across the heading) and darkens with depth,
// like a face falling into shade.
const WALL_RISE_START: f32 = 0.005;   // terrain above the ray, in z (half-heights)
const WALL_RISE_FULL: f32 = 0.03;
const WALL_TINT_GRID: i32 = 5;
const WALL_TINT_RADIUS_PIXELS: f32 = 48.0;
const WALL_DEPTH_SHADE: f32 = 0.8;

fn shade_hit(hit: vec3<f32>) -> vec3<f32> {
  let color = source_color(hit.xy);
  let e = params.heading;
  let pixel = 2.0 / params.raster.y; // one raster pixel, in half-heights
  // The ray sits at z = -hit.z; the rim topping the face lies beyond it.
  var beyond = -1.0;
  for (var k = 1; k <= 4; k = k + 1) {
    beyond = max(beyond, surface_z(hit.xy + f32(k) * e * pixel));
  }
  let wall = smoothstep(WALL_RISE_START, WALL_RISE_FULL, beyond + hit.z);
  if (wall <= 0.0) { return color; }
  // Rim colour: the top of the face, averaged along it.
  let r = vec2<f32>(e.y, -e.x);
  let rim = hit.xy + 2.0 * e * pixel;
  // The rim is fractal, so a 1D average along it still jumps from column to
  // column. The wall takes the local surface tint instead: a 5x5 tent-weighted
  // grid around the rim, skipping taps that fall into the hole (floor).
  var rimColor = vec3<f32>(0.0);
  var rimWeight = 0.0;
  for (var j = 0; j < WALL_TINT_GRID; j = j + 1) {
    for (var k = 0; k < WALL_TINT_GRID; k = k + 1) {
      let o = (vec2<f32>(f32(k), f32(j)) / f32(WALL_TINT_GRID - 1) - vec2<f32>(0.5)) * 2.0;
      let tap = rim + (r * o.x + e * o.y) * (WALL_TINT_RADIUS_PIXELS * pixel);
      let w = select(0.0, 1.0, surface_z(tap) > -0.9) * (1.0 - 0.5 * length(o));
      rimColor = rimColor + w * source_color(tap);
      rimWeight = rimWeight + w;
    }
  }
  rimColor = select(color, rimColor / max(rimWeight, 1e-6), rimWeight > 1e-3);
  // Deeper is darker: hit.z is the depth below the top plane, in [0, 1].
  let shade = 1.0 - WALL_DEPTH_SHADE * smoothstep(0.0, 1.0, hit.z);
  return mix(color, rimColor * shade, wall);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let center = cast_ray(pos.xy);
  var color = shade_hit(center);
  // Silhouettes and minified areas: 4 more rays on a rotated grid.
  let footprint = max(length(dpdx(center.xy)), length(dpdy(center.xy))) * 0.5 * params.raster.y;
  let depthJump = max(abs(dpdx(center.z)), abs(dpdy(center.z)));
  if (depthJump > SILHOUETTE_DEPTH || footprint > FOOTPRINT_PIXELS) {
    let offsets = array<vec2<f32>, 4>(
      vec2<f32>(-0.375, -0.125), vec2<f32>(0.125, -0.375),
      vec2<f32>(0.375, 0.125), vec2<f32>(-0.125, 0.375));
    for (var k = 0; k < 4; k = k + 1) {
      color = color + shade_hit(cast_ray(pos.xy + offsets[k]));
    }
    color = color / 5.0;
  }
  return vec4<f32>(color, 1.0);
}
