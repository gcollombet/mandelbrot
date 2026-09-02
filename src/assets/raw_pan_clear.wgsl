// Pan by origin shift (toroidal raw texture).
//
// A pan used to reproject the whole neutral square A → B (13 to 21 r32float
// layers read and written per texel, every pan frame). The raw texture is now
// addressed through a toroidal origin (BrushUniforms.rawOrigin): shifting the
// origin by the integer pan moves every texel at zero cost, and only the strip
// wrapped in from the opposite edge holds stale content. This pass stamps that
// strip with the plain sentinel (iter = -1, step = 0): the same two stores
// reproject_cs.wgsl writes for an exposed texel.
//
// Dispatch geometry: one grid, two rectangles. Rows [0, colGroups·16) of the
// grid cover the vertical strip (|shiftX| columns × full height); the rows
// after cover the horizontal strip (full width × |shiftY| rows). The engine
// dispatches ceil(N/16) × (ceil(|sx|/16) + ceil(|sy|/16)) workgroups.
//
// Coordinates here are LOGICAL (viewport-aligned): the texel exposed on a
// positive x shift is logical column [0, sx); on a negative shift it is
// [N + sx, N). raw_coord() maps to the physical texel with the origin the
// engine already updated for this frame.

struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  dispatchOriginX: f32,
  dispatchOriginY: f32,
  copyLayerCount: f32,
  mu: f32,
  workCounterShift: f32,
  rawOriginX: f32,
  rawOriginY: f32,
  tileOriginX: f32,
  tileOriginY: f32,
  neutralSide: f32,
  rotationUnion: f32,
};

@group(0) @binding(0) var<uniform> uni: BrushUniforms;
@group(0) @binding(1) var raw: texture_storage_2d_array<r32float, write>;

fn raw_coord(coord: vec2<i32>, dims: vec2<i32>) -> vec2<i32> {
  let origin = vec2<i32>(i32(uni.rawOriginX), i32(uni.rawOriginY));
  return ((coord + origin) % dims + dims) % dims;
}

fn store_cleared(coord: vec2<i32>) {
  textureStore(raw, coord, 0, vec4<f32>(-1.0, 0.0, 0.0, 0.0));
  textureStore(raw, coord, 1, vec4<f32>(0.0));
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = vec2<i32>(textureDimensions(raw));
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let widthX = min(abs(shift.x), dims.x);
  let widthY = min(abs(shift.y), dims.y);
  let colGroupRows = ((widthX + 15) / 16) * 16;

  var logical: vec2<i32>;
  if (i32(gid.y) < colGroupRows) {
    // Vertical strip: |shift.x| columns, full height.
    let column = i32(gid.y);
    if (column >= widthX || i32(gid.x) >= dims.y) { return; }
    let startX = select(dims.x - widthX, 0, shift.x > 0);
    logical = vec2<i32>(startX + column, i32(gid.x));
  } else {
    // Horizontal strip: full width, |shift.y| rows.
    let row = i32(gid.y) - colGroupRows;
    if (row >= widthY || i32(gid.x) >= dims.x) { return; }
    let startY = select(dims.y - widthY, 0, shift.y > 0);
    logical = vec2<i32>(i32(gid.x), startY + row);
  }
  store_cleared(raw_coord(logical, dims));
}
