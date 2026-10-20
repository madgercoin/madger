const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..','public','blackroot');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'FOREST_ASSETS_PROVENANCE.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function glb(bytes){
 assert.equal(bytes.toString('ascii',0,4),'glTF','must be an actual game-ready binary glTF mesh');
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 const end=20+bytes.readUInt32LE(12);
 const data=JSON.parse(bytes.subarray(20,end).toString('utf8'));
 return {materials:data.materials||[],triangles:data.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+data.accessors[p.indices].count/3,0)};
}
test('every forest scan is CC0, reduced in size and verifies against the shipped source',()=>{
 assert.equal(manifest.schema,1);assert.equal(manifest.assets.length,3);
 const budgets={island_tree_02:90000,root_cluster_01:20000,grass_medium_02:7000};
 for(const item of manifest.assets){
  assert.equal(item.license,'CC0-1.0');assert.equal(item.source,'Poly Haven');
  assert.equal(item.homepage,'https://polyhaven.com/a/'+item.id);
  assert(item.originalSourceHashes?.length>0);
  const file=path.join(root,item.optimizedFile),bytes=fs.readFileSync(file),mesh=glb(bytes);
  assert.equal(bytes.length,item.optimizedBytes,item.id);
  assert.equal(sha(bytes),item.sha256,item.id+' SHA mismatch');
  assert.equal(mesh.triangles,item.triangles,item.id+' triangle budget changed');
  assert(mesh.triangles>1000&&mesh.triangles<budgets[item.id],item.id+' exceeds mobile LOD budget');
  assert(bytes.length<item.originalSourceBytes,item.id+' not actually reduced');
  assert(mesh.materials.length>=1,item.id+' has no materials');
 }
});
test('forest pack contains identical binary LOD trees, roots and grasses with no source mesh duplicates',()=>{
 const pack=fs.readFileSync(path.join(root,'forest.pack')),header=pack.readUInt32LE(0);
 assert(header>0&&header<1000000);
 const entries=JSON.parse(pack.subarray(4,4+header).toString('utf8'));
 for(const item of manifest.assets){
  const entry=entries.find(e=>e.path===item.optimizedFile.replace(/^assets\//,''));
  assert(entry,item.id+' missing from playable forest pack');
  assert.equal(entry.length,item.optimizedBytes);
  const bytes=pack.subarray(4+header+entry.offset,4+header+entry.offset+entry.length);
  assert.equal(sha(bytes),item.sha256,item.id+' packed bytes changed');
  assert(!entries.some(e=>e.path.startsWith(item.id+'/')&&e.path.endsWith('.bin')),'raw scanner meshes must not ship');
 }
 assert(pack.length<30*1024*1024,'Web foliage package grew beyond agreed mobile download cap');
});
