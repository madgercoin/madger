/* Placement reuse must preserve every matrix, count and grounding diagnostic.
 * This CPU-only test does not establish native GPU frame rate or visual QA. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const sourcePath=process.env.MADGER_RENDERER_SOURCE||path.join(__dirname,'../public/blackroot/renderer.mjs');
const source=fs.readFileSync(sourcePath,'utf8');
const begin=source.indexOf('    const start=Math.floor(travel/12)*12;');
const end=source.indexOf('    this.stats.groundedSceneryInstances=anchored;',begin);
assert(begin>=0&&end>begin);
const body=source.slice(begin,end)+'\nreturn anchored;';
const args=['travel','s','scenery','ruins','underground','breezeTime','hash','road','curve','bankX','surface','matrix','foliageSway','canopyFade','canopyWind'];
const optimized=new Function(...args,'let anchored=0;'+body.replace(/surface\(/g,'(anchored++,surface)('));
// Force the exact same placement code to recompute each material's matrices.
const reference=new Function(...args,'let anchored=0;'+body.replace('placements.get(id)','undefined').replace(/surface\(/g,'(anchored++,surface)('));
// Shipped material primitives; rock variants are capped at two by the loader.
const materials={fern_02:4,rock_face_02:1,dead_tree_trunk:1,rock_moss_set_01:2,island_tree_02:3,root_cluster_01:1,grass_medium_02:5};
function scene(quality,budget){
 const result={sceneryQuality:quality,budget:{scenery:budget},trees:{count:1},scanBatches:[],writes:0};
 for(const [id,copies] of Object.entries(materials))for(let copy=0;copy<copies;copy++){
  const attribute={array:new Float32Array((['fern_02','grass_medium_02'].includes(id)?96:32)*16),ranges:[],clearUpdateRanges(){this.ranges=[];},addUpdateRange(start,count){this.ranges.push({start,count});}};
  result.scanBatches.push({id,mesh:{count:0,instanceMatrix:attribute,setMatrixAt(i,m){result.writes++;attribute.array.set(m,i*16);}}});
 }
 return result;
}
function run(fn,target,travel,ruins,underground,time){
 const hash=n=>{const v=Math.sin(n*127.13+91.7)*43758.5453;return v-Math.floor(v);};
 return fn.call(target,travel,{route:ruins?'ruins':underground?'cavern':'forest'},
  {seed:7,understory:1,rootScale:1,treeScale:1},ruins,underground,time,hash,
  (_s,d)=>Math.sin(d/76),d=>Math.sin(d/185),(x,d,m)=>x+Math.sin(d)*m,
  (x,d)=>Math.sin(x)*Math.cos(d),(...v)=>Float32Array.from([...v,...Array(16-v.length).fill(0)]),
  (t,d,side)=>Math.sin(t+d+side)*.03,ahead=>Math.max(0,Math.min(1,(110-ahead)/20)),
  (t,d,r)=>Math.sin(t+d+r)*.02);
}
test('all biome/quality placements remain byte-identical while duplicate material work drops',()=>{
 let before=0,after=0,capacity=0,uploads=0,cases=0;
 for(const [ruins,underground] of [[false,false],[true,false],[false,true]])
 for(const [q,b] of [[1,2],[.7,1],[.44,0]])
 for(const travel of [0,11.9,12,53,66,139.9,140,181,353,455,812]){
  const a=scene(q,b),c=scene(q,b);
  assert.equal(run(reference,a,travel,ruins,underground,10),run(optimized,c,travel,ruins,underground,10));
  for(let i=0;i<a.scanBatches.length;i++){
   const old=a.scanBatches[i].mesh,next=c.scanBatches[i].mesh;
   assert.equal(next.count,old.count);assert.deepEqual(next.instanceMatrix.array,old.instanceMatrix.array);
   assert.deepEqual(next.instanceMatrix.ranges,next.count?[{start:0,count:next.count*16}]:[]);
   capacity+=next.instanceMatrix.array.byteLength;uploads+=next.count*16*4;
  }
  assert(a.writes>c.writes);before+=a.writes;after+=c.writes;cases++;
 }
 console.log(JSON.stringify({cases,matrixWritesBefore:before,matrixWritesAfter:after,capacityBytes:capacity,activeUploadBytes:uploads}));
});
test('per-frame caches do not preserve stale wind, travel or quality',()=>{
 const a=scene(1,2),b=scene(1,2);
 run(optimized,b,66,false,false,10);
 a.sceneryQuality=b.sceneryQuality=.44;a.budget.scenery=b.budget.scenery=0;
 run(reference,a,181,true,false,20);run(optimized,b,181,true,false,20);
 for(let i=0;i<a.scanBatches.length;i++){
  const left=a.scanBatches[i].mesh,right=b.scanBatches[i].mesh;
  assert.equal(left.count,right.count);
  assert.deepEqual(left.instanceMatrix.array.subarray(0,left.count*16),right.instanceMatrix.array.subarray(0,right.count*16));
 }
});

/* These tests compare complete attribute bytes and material policies on the
 * shipped scans. They do not decode textures or establish pixel/FPS parity. */
const {pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
let fixturePromise;
function scanFixture(){return fixturePromise??=(async()=>{
 const root=path.join(__dirname,'../public/blackroot');
 const T=await import(pathToFileURL(path.join(root,'vendor/build/three.module.js')).href);
 const {mergeGeometries}=await import(pathToFileURL(path.join(root,'vendor/examples/jsm/utils/BufferGeometryUtils.js')).href);
 const clusterBody=source.slice(source.indexOf('function clusterScan('),source.indexOf('\nlet bridge;'));
 const clusterScan=new Function('T',clusterBody+'\nreturn clusterScan;')(T);
 const assetBegin=source.indexOf('    for(const {id,model} of models) {'),assetEnd=source.indexOf('    // Project unchanged',assetBegin);
 assert(assetBegin>=0&&assetEnd>assetBegin);
 const assetLoop=new Function('T','models','clusterScan','mergeGeometries',source.slice(assetBegin,assetEnd));
 const execute=models=>{const renderer={scene:new T.Scene(),scanBatches:[]};assetLoop.call(renderer,T,models,clusterScan,mergeGeometries);return renderer.scanBatches;};
 // The pre-batching pipeline is intentionally independent from assetLoop.
 function unmerged(models){
  const result=[];
  for(const {id,model} of models){
   model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
   const unit=['dead_tree_trunk','rock_face_02','rock_moss_set_01','root_cluster_01'].includes(id)?Math.max(size.x,size.y,size.z):size.y;
   const normalizer=new T.Matrix4().makeScale(1/unit,1/unit,1/unit).multiply(new T.Matrix4().makeTranslation(-centre.x,-bounds.min.y,-centre.z));
   let rockVariant=0;
   model.traverse(node=>{if(!node.isMesh)return;if(id==='rock_moss_set_01'&&rockVariant++>=2)return;
    assert(!Array.isArray(node.material),'Actual shipped nodes are single-material');
    let geometry=node.geometry.clone();geometry.applyMatrix4(node.matrixWorld);geometry.applyMatrix4(normalizer);
    if(!['fern_02','island_tree_02','root_cluster_01','grass_medium_02'].includes(id))geometry=clusterScan(geometry,id==='dead_tree_trunk'?.025:id==='rock_face_02'?.045:.04);
    const material=id==='fern_02'?new T.MeshLambertMaterial({map:node.material.map,color:'#a6b987',side:T.DoubleSide}):node.material.clone();
    const foliageCutout=['island_tree_02','grass_medium_02'].includes(id)&&material.transparent;
    if(foliageCutout){material.alphaTest=.16;material.transparent=false;material.depthWrite=true;material.alphaToCoverage=true;}
    material.envMapIntensity=.4;material.side=['fern_02','island_tree_02','grass_medium_02'].includes(id)?T.DoubleSide:T.FrontSide;
    result.push({id,mesh:{geometry,material,castShadow:id==='island_tree_02'&&!foliageCutout,receiveShadow:true,frustumCulled:false}});
   });
  }
  return result;
 }
 const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
 const constructors={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
 const readers={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'};
 const models=[];
 for(const id of Object.keys(materials)){
  const file=path.join(root,'assets',id,id+(['island_tree_02','root_cluster_01','grass_medium_02'].includes(id)?'_mobile.glb':'.gltf'));
  const bytes=fs.readFileSync(file);let json,bin;
  if(file.endsWith('.glb')){
   assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
   const length=bytes.readUInt32LE(12);json=JSON.parse(bytes.subarray(20,20+length));
   for(let offset=20+length;offset<bytes.length;){const n=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);if(type===0x004e4942)bin=bytes.subarray(offset+8,offset+8+n);offset+=8+n;}
  }else json=JSON.parse(bytes.toString());
  const buffers=json.buffers.map(b=>b.uri?fs.readFileSync(path.join(path.dirname(file),b.uri)):bin);
  const decode=index=>{
   const a=json.accessors[index];assert(!a.sparse,'No unsupported sparse accessor');
   const v=json.bufferViews[a.bufferView],buffer=buffers[v.buffer],Ctor=constructors[a.componentType],width=components[a.type];
   assert(Ctor&&width);const size=Ctor.BYTES_PER_ELEMENT,values=new Ctor(a.count*width);
   const start=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||width*size,view=new DataView(buffer.buffer,buffer.byteOffset,buffer.byteLength);
   for(let i=0;i<a.count;i++)for(let k=0;k<width;k++)values[i*width+k]=view[readers[a.componentType]](start+i*stride+k*size,true);
   return new T.BufferAttribute(values,width,a.normalized||false);
  };
  // Source texture identity is retained without image decoding or WebGL.
  const textures=(json.textures||[]).map(()=>new T.Texture());
  const mats=json.materials.map(m=>{
   const pbr=m.pbrMetallicRoughness||{},material=new T.MeshStandardMaterial({name:m.name||'',transparent:m.alphaMode==='BLEND',alphaTest:m.alphaMode==='MASK'?(m.alphaCutoff??.5):0,side:m.doubleSided?T.DoubleSide:T.FrontSide,roughness:pbr.roughnessFactor??1,metalness:pbr.metallicFactor??1});
   if(pbr.baseColorFactor){material.color.fromArray(pbr.baseColorFactor);material.opacity=pbr.baseColorFactor[3];}
   if(pbr.baseColorTexture)material.map=textures[pbr.baseColorTexture.index];
   if(m.normalTexture)material.normalMap=textures[m.normalTexture.index];
   if(pbr.metallicRoughnessTexture)material.roughnessMap=material.metalnessMap=textures[pbr.metallicRoughnessTexture.index];
   if(m.occlusionTexture)material.aoMap=textures[m.occlusionTexture.index];
   return material;
  });
  const nodes=json.nodes.map(node=>{
   const group=new T.Group();group.name=node.name||'';
   if(node.matrix){group.matrix.fromArray(node.matrix);group.matrix.decompose(group.position,group.quaternion,group.scale);}
   else{if(node.translation)group.position.fromArray(node.translation);if(node.rotation)group.quaternion.fromArray(node.rotation);if(node.scale)group.scale.fromArray(node.scale);}
   if(node.mesh!==undefined)for(const p of json.meshes[node.mesh].primitives){
    assert(p.mode===undefined||p.mode===4,'Triangles only');const g=new T.BufferGeometry();
    for(const [name,index] of Object.entries(p.attributes)){const mapped={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',TEXCOORD_1:'uv1',COLOR_0:'color',TANGENT:'tangent'}[name];assert(mapped,'Known attribute '+name);g.setAttribute(mapped,decode(index));}
    if(p.indices!==undefined)g.setIndex(decode(p.indices));group.add(new T.Mesh(g,mats[p.material]));
   }
   return group;
  });
  json.nodes.forEach((node,i)=>(node.children||[]).forEach(child=>nodes[i].add(nodes[child])));
  const model=new T.Group();json.scenes[json.scene||0].nodes.forEach(i=>model.add(nodes[i]));models.push({id,model});
 }
 return {T,execute,unmerged,models};
})();}
function triangleStream(geometries){
 const names=Object.keys(geometries[0].attributes).sort(),hash=createHash('sha256');
 for(const name of names){
  const first=geometries[0].attributes[name];hash.update(JSON.stringify([name,first.itemSize,first.normalized,first.array.constructor.name]));
  for(const geometry of geometries){
   assert.deepEqual(Object.keys(geometry.attributes).sort(),names);
   const attr=geometry.attributes[name];assert.equal(attr.itemSize,first.itemSize);assert.equal(attr.normalized,first.normalized);assert.equal(attr.array.constructor,first.array.constructor);
   const bytes=Buffer.from(attr.array.buffer,attr.array.byteOffset,attr.array.byteLength),stride=attr.itemSize*attr.array.BYTES_PER_ELEMENT;
   for(let i=0,count=geometry.index?.count??attr.count;i<count;i++){const vertex=geometry.index?geometry.index.getX(i):i;hash.update(bytes.subarray(vertex*stride,(vertex+1)*stride));}
  }
 }
 return hash.digest('hex');
}
const triangleCount=geometry=>(geometry.index?.count??geometry.attributes.position.count)/3;
function assertMaterialPolicy(actual,expected){
 for(const key of ['type','name','transparent','opacity','alphaTest','alphaToCoverage','side','depthWrite','depthTest','envMapIntensity','roughness','metalness','map','normalMap','roughnessMap','metalnessMap','aoMap'])assert.equal(actual[key],expected[key],'material '+key);
 assert.equal(actual.color.getHexString(),expected.color.getHexString());
 if(expected.normalScale)assert.deepEqual(actual.normalScale.toArray(),expected.normalScale.toArray());
}
test('same-material scan batching preserves exact shipped attribute streams and shader policies',async()=>{
 const {execute,unmerged,models}=await scanFixture(),before=unmerged(models),after=execute(models);
 assert.equal(before.length,17);assert.equal(after.length,9);
 const expected={fern_02:[4,1,6232],rock_face_02:[1,1,2024],dead_tree_trunk:[1,1,1064],rock_moss_set_01:[2,1,784],island_tree_02:[3,3,68282],root_cluster_01:[1,1,12359],grass_medium_02:[5,1,4702]};
 const report=[];
 for(const [id,[oldCount,newCount,triangles]] of Object.entries(expected)){
  const a=before.filter(b=>b.id===id),b=after.filter(b=>b.id===id);
  assert.equal(a.length,oldCount);assert.equal(b.length,newCount);assert.equal(b.reduce((n,v)=>n+v.sourceMeshCount,0),oldCount);
  assert.equal(triangleStream(b.map(v=>v.mesh.geometry)),triangleStream(a.map(v=>v.mesh.geometry)),id+' expanded attribute bytes');
  assert.equal(a.reduce((n,v)=>n+triangleCount(v.mesh.geometry),0),triangles);assert.equal(b.reduce((n,v)=>n+triangleCount(v.mesh.geometry),0),triangles);
  for(let i=0;i<b.length;i++){
   const current=b[i].mesh,old=a[newCount===1?0:i].mesh;
   assertMaterialPolicy(current.material,old.material);
   for(const key of ['castShadow','receiveShadow','frustumCulled'])assert.equal(current[key],old[key]);
   assert.equal(current.geometry.groups.length,0);
  }
  report.push({id,before:oldCount,after:newCount,triangles,attributeBytesIdentical:true});
 }
 console.log(JSON.stringify({scanBatchValidation:report}));
});

test('scan merge guards preserve material identity, transparency, arrays, groups and incompatible attributes',async()=>{
 const {T,execute}=await scanFixture();
 function build(id,materialList,geometryFor=()=>new T.PlaneGeometry(1,1)){
  const model=new T.Group();materialList.forEach((material,i)=>{const mesh=new T.Mesh(geometryFor(i),material);mesh.position.x=i*2;model.add(mesh);});return execute([{id,model}]);
 }
 const shared=new T.MeshStandardMaterial({name:'shared'});
 assert.equal(build('fern_02',[shared,shared]).length,1);
 assert.equal(build('fern_02',[shared,shared.clone()]).length,2,'Equal material values are not source identity');
 const transparent=new T.MeshStandardMaterial({transparent:true,opacity:.5});
 const alpha=build('root_cluster_01',[transparent,transparent]);assert.equal(alpha.length,2);assert(alpha.every(b=>b.mesh.material.transparent&&b.sourceMeshCount===1));
 const cutout=build('grass_medium_02',[transparent,transparent]);assert.equal(cutout.length,1);assert.equal(cutout[0].mesh.material.transparent,false);assert.equal(cutout[0].mesh.material.alphaTest,.16);
 const withGroups=()=>{const g=new T.PlaneGeometry(1,1);g.addGroup(0,3,0);g.addGroup(3,3,1);return g;};
 const grouped=build('fern_02',[shared,shared],withGroups);assert.equal(grouped.length,2);assert(grouped.every(b=>b.mesh.geometry.groups.length===2&&b.sourceMeshCount===1));
 const materialArray=[shared,shared.clone()],arrays=build('root_cluster_01',[materialArray,materialArray],withGroups);
 assert.equal(arrays.length,2);for(const batch of arrays){assert(Array.isArray(batch.mesh.material));assert.equal(batch.mesh.material.length,2);assert.deepEqual(batch.mesh.geometry.groups,[{start:0,count:3,materialIndex:0},{start:3,count:3,materialIndex:1}]);assert.equal(batch.sourceMeshCount,1);}
 const drawRange=build('fern_02',[shared,shared],()=>{const g=new T.PlaneGeometry(1,1);g.setDrawRange(0,3);return g;});assert.equal(drawRange.length,2);assert(drawRange.every(b=>b.mesh.geometry.drawRange.count===3));
 const errors=[],previous=console.error;let incompatible;
 try{console.error=(...args)=>errors.push(args.join(' '));incompatible=build('fern_02',[shared,shared],i=>{const g=new T.PlaneGeometry(1,1);if(i)g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3),3));return g;});}finally{console.error=previous;}
 assert.equal(incompatible.length,2);assert(incompatible.every(b=>b.sourceMeshCount===1));assert.equal(errors.length,1);assert.equal(incompatible[0].mesh.geometry.attributes.color,undefined);assert(incompatible[1].mesh.geometry.attributes.color);
});

function groupedScene(layout,quality,budget){
 const result={sceneryQuality:quality,budget:{scenery:budget},trees:{count:1},scanBatches:[],writes:0};
 for(const [id,groups] of Object.entries(layout))for(const sourceMeshCount of groups){
  const attribute={array:new Float32Array((['fern_02','grass_medium_02'].includes(id)?96:32)*16),ranges:[],clearUpdateRanges(){this.ranges=[];},addUpdateRange(start,count){this.ranges.push({start,count});}};
  result.scanBatches.push({id,sourceMeshCount,mesh:{count:0,instanceMatrix:attribute,setMatrixAt(i,m){result.writes++;attribute.array.set(m,i*16);}}});
 }
 return result;
}
test('merged batches retain source-mesh grounding metrics and matrices across cached mixed groups',()=>{
 const unmerged=Object.fromEntries(Object.entries(materials).map(([id,n])=>[id,Array(n).fill(1)]));
 const merged=Object.fromEntries(Object.entries(materials).map(([id,n])=>[id,id==='island_tree_02'?[1,1,1]:[n]]));
 let cases=0;
 for(const [oldLayout,newLayout] of [[unmerged,merged],[{fern_02:[1,1,1,1,1]},{fern_02:[2,3]}],[{fern_02:[1,1,1,1,1]},{fern_02:[3,2]}]])
 for(const [ruins,underground] of [[false,false],[true,false],[false,true]])
 for(const [quality,budget] of [[1,2],[.7,1],[.44,0]])
 for(const travel of [0,11.9,12,53,66,79,139.9,140,181,353,455,812]){
  const a=groupedScene(oldLayout,quality,budget),b=groupedScene(newLayout,quality,budget);
  assert.equal(run(reference,a,travel,ruins,underground,10),run(optimized,b,travel,ruins,underground,10),'Source-mesh-weighted grounding metric');
  for(const next of b.scanBatches){
   const old=a.scanBatches.find(v=>v.id===next.id);assert.equal(next.mesh.count,old.mesh.count);assert.deepEqual(next.mesh.instanceMatrix.array,old.mesh.instanceMatrix.array);
   assert.deepEqual(next.mesh.instanceMatrix.ranges,next.mesh.count?[{start:0,count:next.mesh.count*16}]:[]);
  }
  // Repeat a different frame on the same merged object: no stale raw cache.
  const fresh=groupedScene(oldLayout,.44,0);b.sceneryQuality=.44;b.budget.scenery=0;
  assert.equal(run(reference,fresh,travel+13,!ruins,false,21),run(optimized,b,travel+13,!ruins,false,21));
  cases++;
 }
 console.log(JSON.stringify({mergedGroundingCases:cases,metric:'source-mesh placements',mixedSourceMeshCounts:[[2,3],[3,2]]}));
});


/* Opt-in browser pixel gate. Both variants use this checkout's identical assets;
 * only /blackroot/renderer.mjs is replaced by the explicitly pinned baseline.
 * Screenshots are encoded from the same immediate readPixels buffer we compare,
 * never from a later compositor frame (WebGL preserveDrawingBuffer is false).
 * This is deterministic renderer evidence, not Android device/FPS evidence. */
test('frozen authored routes are pixel-identical to the pinned renderer', {
 skip: !process.env.MADGER_PIXEL_BASELINE && 'Set MADGER_PIXEL_BASELINE to a pinned pre-change renderer.mjs',
 timeout: 20*60*1000,
}, async()=>{
 const http=require('node:http'),os=require('node:os'),crypto=require('node:crypto');
 const ts=require('typescript'),{chromium}=require('playwright');
 const mobile=path.resolve(__dirname,'..'),publicRoot=path.join(mobile,'public');
 const baselinePath=path.resolve(process.env.MADGER_PIXEL_BASELINE);
 const candidatePath=path.join(publicRoot,'blackroot','renderer.mjs');
 assert(fs.statSync(baselinePath).isFile(),'Baseline renderer must be an existing file');
 const baseline=fs.readFileSync(baselinePath),candidate=fs.readFileSync(candidatePath);
 const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
 const out=path.resolve(process.env.MADGER_PIXEL_OUTPUT||path.join(mobile,'expedition-evidence','batching-comparison'));
 fs.mkdirSync(out,{recursive:true});
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'madger-pixel-'));
 const report={scope:'Frozen browser RGBA equality; no native GPU/FPS claim',
  baseline:{path:baselinePath,sha256:sha(baseline)},candidate:{sha256:sha(candidate)},
  viewport:{width:430,height:920,deviceScaleFactor:1},visualTime:12,stateTime:12,
  pixelTolerance:0,assets:{},cases:[],errors:[],status:'running'};
 const assetHashes=new Map();
 let browser,server;
 try {
  for(const name of ['companions','core'])fs.writeFileSync(path.join(temporary,name+'.js'),ts.transpileModule(
   fs.readFileSync(path.join(mobile,'src/game/expedition',name+'.ts'),'utf8'),
   {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
  const G=require(path.join(temporary,'core.js'));
  const presets=JSON.parse(fs.readFileSync(path.join(publicRoot,'blackroot/world-presets.json'),'utf8'));
  const fixtures=[];
  for(const major of G.MAJOR_FORKS){
   const s=G.freshOvergrownExpedition(19,'render-'+major.id);
   Object.assign(s,{mode:'fork',distance:140,forkStage:1});G.chooseFork(s,major.id,[]);
   Object.assign(s,{distance:230,mode:'paused'});fixtures.push(structuredClone(s));
   for(const sub of G.SUB_FORKS[major.id]){
    const child=structuredClone(s);Object.assign(child,{route:'main',mode:'fork',distance:455,forkStage:2,keys:1});
    G.chooseFork(child,sub.id,[]);Object.assign(child,{distance:680,mode:'paused'});fixtures.push(child);
   }
  }
  for(const meta of G.CHAMBERS){
   const s=G.freshOvergrownExpedition(19,'interior-'+meta.id);
   const major=meta.route==='root-arch'?'rootway':meta.route==='gearworks'?'ridge':'deep';
   Object.assign(s,{mode:'running',forkStage:2,majorPath:major,subPath:meta.route,route:meta.route,
    routeStart:455,routeEnd:900,routeSide:G.SUB_FORKS[major].find(o=>o.id===meta.route).side,
    distance:meta.d-.7,x:meta.lane*G.LANE_WIDTH,lane:meta.lane});
   if(meta.action==='burrow')G.burrow(s,[]);else{s.y=1;s.vy=0;}
   const course=G.buildOvergrownCourse(s.seed);
   for(let i=0;i<8&&s.mode==='running';i++)G.fixedStep(s,course,[]);
   assert.equal(s.mode,'chamber');fixtures.push(s);
  }
  for(const route of ['main','hollow','grotto']){
   const s=G.freshOvergrownExpedition(19,'render-'+route);
   Object.assign(s,{route,mode:'paused',distance:route==='main'?86:680,routeStart:route==='main'?0:455,
    routeEnd:900,routeSide:0,majorPath:route==='main'?null:'deep',subPath:route==='main'?null:route});fixtures.push(s);
  }
  const covered=new Set(fixtures.filter(s=>s.mode!=='chamber').map(s=>s.route));
  assert.deepEqual([...covered].sort(),Object.keys(presets.routes).sort());
  assert.equal(fixtures.length,covered.size+G.CHAMBERS.length);
  const main79=structuredClone(fixtures.find(s=>s.route==='main'));main79.distance=79;fixtures.push(main79);
  fixtures.forEach(s=>{s.time=12;});
  const types={'.mjs':'application/javascript','.js':'application/javascript','.json':'application/json',
   '.html':'text/html','.jpg':'image/jpeg','.png':'image/png','.gltf':'model/gltf+json'};
  server=http.createServer((req,res)=>{
   try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/fixture'){
     res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
     res.end('<!doctype html><body style="margin:0;background:#101d1d"><canvas width="430" height="920" style="display:block;width:430px;height:920px"></canvas><script type="module">import "/blackroot/renderer.mjs";window.rendererLoaded=true;</script>');return;
    }
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const file=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(publicRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
     res.writeHead(404);res.end();return;
    }
    const bytes=fs.readFileSync(file),digest=sha(bytes);
    if(assetHashes.has(url.pathname))assert.equal(assetHashes.get(url.pathname),digest,'Asset changed during comparison');
    else assetHashes.set(url.pathname,digest);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
   } catch(e){report.errors.push(String(e.stack||e));res.writeHead(500);res.end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  browser=await chromium.launch({headless:true,
   ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
   args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  report.browserVersion=browser.version();
  const context=await browser.newContext({viewport:{width:430,height:920},deviceScaleFactor:1});
  const pages={};
  for(const [variant,rendererBytes] of [['baseline',baseline],['candidate',candidate]]){
   const page=pages[variant]=await context.newPage();
   page.on('pageerror',e=>report.errors.push(variant+': '+e.message));
   page.on('requestfailed',r=>report.errors.push(variant+': '+r.url()+' '+r.failure()?.errorText));
   page.on('response',r=>{if(r.status()>=400)report.errors.push(variant+': HTTP '+r.status()+' '+r.url());});
   await page.route('**/blackroot/renderer.mjs',route=>route.fulfill({status:200,contentType:'application/javascript',body:rendererBytes}));
   await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');
   await page.waitForFunction(()=>window.rendererLoaded);
   await page.evaluate(async()=>{
    const gl=document.querySelector('canvas').getContext('webgl2');
    if(!gl)throw Error('WebGL2 unavailable');window.pixelScene=await window.madgerOvergrownScene(gl);
   });
  }
  async function capture(page,run,scenery){
   return page.evaluate(({run,course,scenery})=>{
    const scene=window.pixelScene,r=scene.renderer,gl=document.querySelector('canvas').getContext('webgl2');
    scene.setCourse(course);
    // Reset camera interpolation and transient renderer timing each capture.
    // Chamber state is static and intentionally retains its authored camera.
    scene.initializedCamera=false;scene.lastTime=12;scene.particles=[];
    r.budget={scenery,scale:1,fastFrames:0};r.quality=1;r.sceneryQuality=[.44,.70,1][scenery];
    r.frameSamples=[];r.previousFrameMode='paused';r.previousFrame=performance.now();
    const stateBefore=JSON.stringify(run);scene.draw(run,12,false);
    const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
    const rgba=new Uint8Array(width*height*4);
    // Must stay in this synchronous evaluate immediately after draw.
    gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
    const glError=gl.getError();
    const pngCanvas=document.createElement('canvas');pngCanvas.width=width;pngCanvas.height=height;
    const ctx=pngCanvas.getContext('2d'),pixels=ctx.createImageData(width,height);
    for(let y=0;y<height;y++)pixels.data.set(rgba.subarray(y*width*4,(y+1)*width*4),(height-y-1)*width*4);
    ctx.putImageData(pixels,0,0);
    let binary='';for(let i=0;i<rgba.length;i+=32768)binary+=String.fromCharCode(...rgba.subarray(i,i+32768));
    return {rgba:btoa(binary),png:pngCanvas.toDataURL('image/png').split(',')[1],width,height,glError,
     stateUnchanged:stateBefore===JSON.stringify(run),stats:{...scene.stats},
     camera:{position:r.camera.position.toArray(),quaternion:r.camera.quaternion.toArray(),projection:r.camera.projectionMatrix.toArray()},
     budget:{...r.budget},quality:r.quality,sceneryQuality:r.sceneryQuality,
     scans:r.scanBatches.map(({id,mesh,sourceMeshCount})=>({id,count:mesh.count,visible:mesh.visible,
      sourceMeshCount:sourceMeshCount??mesh.userData?.sourceMeshCount??1,triangles:mesh.geometry.index?mesh.geometry.index.count/3:mesh.geometry.attributes.position.count/3})),
     gpu:{vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)}};
   },{run:structuredClone(run),course:G.buildOvergrownCourse(run.seed),scenery});
  }
  function difference(a,b){
   if(a.length!==b.length)return {equal:false,bytesBefore:a.length,bytesAfter:b.length};
   let changedBytes=0,changedPixels=0,maxChannelDelta=0;
   for(let i=0;i<a.length;i+=4){let changed=false;for(let c=0;c<4;c++)if(a[i+c]!==b[i+c]){
    changed=true;changedBytes++;maxChannelDelta=Math.max(maxChannelDelta,Math.abs(a[i+c]-b[i+c]));
   }if(changed)changedPixels++;}
   return {equal:changedBytes===0,changedBytes,changedPixels,totalPixels:a.length/4,maxChannelDelta};
  }
  let totalDrawReduction=0;
  for(const run of fixtures)for(const scenery of [2,0]){
   const name=(run.chamber||run.route)+'-d'+run.distance.toFixed(2).replace('.','_')+'-scenery'+scenery;
   // Repeating the baseline is a prerequisite, not an accepted tolerance.
   const before=await capture(pages.baseline,run,scenery),repeat=await capture(pages.baseline,run,scenery);
   const after=await capture(pages.candidate,run,scenery),afterRepeat=await capture(pages.candidate,run,scenery);
   const buffers=[before,repeat,after,afterRepeat].map(c=>Buffer.from(c.rgba,'base64'));
   for(const bytes of buffers)assert(bytes.some((v,i)=>i%4!==3&&v!==bytes[i%4]),name+' framebuffer is a flat color');
   const record={name,route:run.route,chamber:run.chamber||null,distance:run.distance,scenery,
    baselineRepeat:difference(buffers[0],buffers[1]),candidateRepeat:difference(buffers[2],buffers[3]),
    comparison:difference(buffers[0],buffers[2]),baseline:before,candidate:after,
    rgbaSha256:buffers.map(sha)};
   for(const [i,label] of ['before','before-repeat','after','after-repeat'].entries()){
    fs.writeFileSync(path.join(out,name+'-'+label+'.png'),Buffer.from([before,repeat,after,afterRepeat][i].png,'base64'));
   }
   delete before.rgba;delete before.png;delete after.rgba;delete after.png;
   report.cases.push(record);
   for(const c of [before,repeat,after,afterRepeat]){
    assert.equal(c.glError,0,name);assert.equal(c.stateUnchanged,true,name+' mutated gameplay');
    assert.equal(c.stats.assetsReady,true,name);assert(c.stats.triangles>10000,name+' has no scene geometry');
    assert.equal(c.width,430,name);assert.equal(c.height,920,name);
    assert.equal(c.quality,1,name);assert.equal(c.budget.scenery,scenery,name);
    assert.equal(c.sceneryQuality,scenery===2?1:.44,name);
    if(run.mode!=='chamber')assert(c.scans.some(b=>b.visible&&b.count>0),name+' missing active scenery');
   }
   assert.deepEqual(before.camera,repeat.camera,name+' baseline camera drift');
   assert.deepEqual(after.camera,afterRepeat.camera,name+' candidate camera drift');
   assert.deepEqual(before.camera,after.camera,name+' changed camera');
   assert(record.baselineRepeat.equal,name+' baseline is nondeterministic: '+JSON.stringify(record.baselineRepeat));
   assert(record.candidateRepeat.equal,name+' candidate is nondeterministic: '+JSON.stringify(record.candidateRepeat));
   assert(record.comparison.equal,name+' pixel mismatch: '+JSON.stringify(record.comparison));
   assert.equal(after.stats.triangles,before.stats.triangles,name+' changed triangle count');
   const active=c=>c.scans.filter(b=>b.visible&&b.count>0);
   // Every scan is one single-material draw. Actual active baseline/candidate
   // batch counts establish the expected reduction, including zero in rooms.
   const batchReduction=active(before).length-active(after).length;
   const savedDraws=c=>active(c).reduce((sum,b)=>sum+b.sourceMeshCount-1,0);
   const expectedReduction=savedDraws(after)-savedDraws(before);
   assert.equal(batchReduction,expectedReduction,name+' merged source counts do not match active batches');
   const actualReduction=before.stats.drawCalls-after.stats.drawCalls;
   record.expectedDrawReduction=expectedReduction;record.actualDrawReduction=actualReduction;
   assert(expectedReduction>=0,name+' added scan batches');
   assert.equal(actualReduction,expectedReduction,name+' draw-call delta differs from active batches');
   totalDrawReduction+=actualReduction;
   console.log('MADGER_FROZEN_PIXEL_CASE',JSON.stringify({name,...record.comparison,expectedReduction,actualReduction,triangles:after.stats.triangles}));
  }
  assert(totalDrawReduction>0,'No actual draw-call reduction across the frozen route fixtures');
  assert.deepEqual(report.errors,[]);report.totalDrawReduction=totalDrawReduction;report.status='passed';
 }catch(error){report.status='failed';report.failure=String(error.stack||error);throw error;}
 finally{
  report.assets=Object.fromEntries([...assetHashes].sort());
  fs.writeFileSync(path.join(out,'pixel-comparison.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();
  if(server?.listening){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  fs.rmSync(temporary,{recursive:true,force:true});
 }
});
