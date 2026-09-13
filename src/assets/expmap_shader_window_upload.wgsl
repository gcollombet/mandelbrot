struct Upload { shape:vec4<u32>, block:vec4<u32>, slot:vec4<u32> }
@group(0) @binding(0) var<storage,read> words:array<vec4<u32>>;
@group(0) @binding(1) var<uniform> u:Upload;
@group(0) @binding(2) var destination:texture_storage_2d_array<rgba32uint,write>;
@compute @workgroup_size(8,8) fn upload(@builtin(global_invocation_id) id:vec3<u32>){
  if(id.x>=u.block.z||id.y>=u.block.w){return;}
  let index=(u.block.y+id.y)*u.shape.w+u.block.x+id.x;
  let area=u.shape.x*u.shape.y;
  let coord=vec2<i32>(i32(index%u.shape.x),i32((index/u.shape.x)%u.shape.y));
  let layer=u.slot.x*3u*u.shape.z+index/area;
  let source=3u*(id.y*u.block.z+id.x);
  textureStore(destination,coord,i32(layer),words[source]);
  textureStore(destination,coord,i32(layer+u.shape.z),words[source+1u]);
  textureStore(destination,coord,i32(layer+2u*u.shape.z),words[source+2u]);
}
