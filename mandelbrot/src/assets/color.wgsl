    struct Uniforms {
      palettePeriod: f32,
      bloomRadius: i32,
      bloomStrength: f32,
    };
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;
    @group(0) @binding(1) var tex: texture_2d<f32>;
    struct VertexOutput {
      @builtin(position) position : vec4<f32>,
      @location(0) fragCoord : vec2<f32>
    };
    @vertex
    fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
      var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>( 1.0,  1.0)
      );
      var out : VertexOutput;
      out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
      out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
      return out;
    }
    fn palette(v: f32, d: f32, dx: f32, dy: f32) -> vec3<f32> {
      let t = abs(v * 2.0 - 1.0);
      let r = 0.5 + 0.5 * cos(1.0 + t * 6.28 - dx / 2.0);
      let g = 0.5 + 0.5 * sin(2.0 + t * 5.88 - dy / 4.0);
      let b = 0.5 + 0.5 * cos(t * 3.14 + ((dx) / 8.0));
      return vec3<f32>(r, g, b);
    }

    @fragment
    fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
      let uv = fragCoord;
      let texSize = vec2<i32>(textureDimensions(tex, 0));
      // Correction de la conversion de types pour pixelCoord
      let pixelCoord = vec2<i32>(
        i32(uv.x * f32(texSize.x)),
        i32((1.0 - uv.y) * f32(texSize.y))
      );
      let data = textureLoad(tex, pixelCoord, 0);
      let nu = data.x;
      let d = data.y;
      let period = uniforms.palettePeriod;
      if (nu < 1.0) {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
      }
      let v = nu % period / period;
      let baseColor = palette(v, d, fragCoord.x, fragCoord.y);
      return vec4<f32>(baseColor, 1.0);
    }