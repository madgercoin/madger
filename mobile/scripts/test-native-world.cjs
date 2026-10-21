const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),pack=JSON.parse(fs.readFileSync(path.join(root,'assets/expedition-world/meshes.json')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'madger-native-world-'));test.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
for(const name of ['math','gl','scene','core','animation','companions','companion-models'])fs.writeFileSync(path.join(temp,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(root,'src/game/expedition',name+'.ts'),'utf8')+(name==='gl'?'\nexport const geometryForTest=geometry;':''),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const {ExpeditionRenderer}=require(path.join(temp,'gl.js')),{ExpeditionScene}=require(path.join(temp,'scene.js')),C=require(path.join(temp,'core.js'));

test('native scans are finite indexed 3D meshes with UVs and a bounded triangle budget',()=>{
 assert.equal(pack.version,1);assert.equal(pack.meshes.length,8);assert.equal(new Set(pack.meshes.map(m=>m.name)).size,8);
 let triangles=0;
 for(const m of pack.meshes){
  assert.equal(m.vertices.length%8,0);assert.equal(m.indices.length%3,0);assert(m.vertices.every(Number.isFinite));assert(m.indices.every(i=>Number.isInteger(i)&&i>=0&&i<m.vertices.length/8));
  const axes=[0,1,2].map(a=>m.vertices.filter((_,i)=>i%8===a));
  for(const axis of axes)assert(Math.max(...axis)-Math.min(...axis)>.05,`${m.name} has physical volume`);
  for(let i=0;i<m.vertices.length;i+=8)assert(Math.abs(Math.hypot(...m.vertices.slice(i+3,i+6))-1)<.01,`${m.name} normal`);
  triangles+=m.indices.length/3;
 }
 assert(triangles<19000,`pack has ${triangles} triangles`);
 const png=fs.readFileSync(path.join(root,'assets/expedition-world/forest-atlas.png'));
 assert.equal(png.readUInt32BE(16),2048);assert.equal(png.readUInt32BE(20),2048);
});
function glMock(indexed=true){
 const log={draws:[],textures:0,deleted:0,uniforms:{}};let id=0;
 const obj={drawingBufferWidth:430,drawingBufferHeight:920,createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),createTexture:()=>{log.textures++;return ++id;},deleteTexture:()=>{log.deleted++;},getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_,name)=>({name}),getExtension:()=>null,getParameter:()=>0,
  drawArraysInstanced:()=>{},vertexAttribDivisor:()=>{},drawElementsInstanced:indexed?(_m,n,_t,_o,c)=>log.draws.push([n,c]):undefined,drawElements:(_m,n)=>log.draws.push([n,1]),uniform1f:(u,v)=>log.uniforms[u.name]=v,flushEXP:undefined,endFrameEXP:undefined};
 return {log,gl:new Proxy(obj,{get:(t,k)=>k in t?t[k]:()=>{}})};
}
for(const indexed of [true,false])test(`scanned meshes draw and release texture resources, indexed instancing ${indexed}`,()=>{
 const {gl,log}=glMock(indexed),r=new ExpeditionRenderer(gl);r.setWorldAssets(pack,{},[{},{},{}]);assert.equal(r.worldReady,true);
 r.reset();r.sceneryBudget=0;r.shape('scanRock',[1,1,1,0],0,0,0,1,1,1);r.render([0,3,8],[0,1,0],0,0);
 assert(log.draws.some(([n])=>n===pack.meshes.find(m=>m.name==='scanRock').indices.length));assert.equal(log.uniforms.uAtlasReady,1);
 r.dispose();assert.equal(log.deleted,log.textures);
});
test('native terrain leaves the playable lane open over an authored gap',()=>{
 const scene=Object.create(ExpeditionScene.prototype),drawn=[];
 scene.renderer={worldReady:true,sceneryBudget:0,shape:(shape,c,x,y,z,sx,sy,sz)=>drawn.push({shape,x,y,z,sx,sy,sz}),add:()=>{}};
 const run=C.freshOvergrownExpedition(4242,'gap-check');run.distance=60;run.mode='running';
 scene.setCourse([{id:999,kind:'gap',route:'main',lane:0,d:60,phase:0}]);scene.overgrownScenery(run,2,false);
 const centreFloor=drawn.filter(o=>o.shape==='trail'&&Math.abs(o.x)<.3&&Math.abs(o.z)<1.5);
 assert.equal(centreFloor.length,0,'the visible ground cannot cover the hole');
 assert(drawn.some(o=>o.shape==='trail'&&Math.abs(o.x)>1.5&&Math.abs(o.z)<1.5),'neighboring lanes remain visibly safe');
 assert(drawn.some(o=>o.shape==='terrain'),'connected off-track terrain stays visible');
 assert(drawn.some(o=>o.shape==='scanTreeTrunk'),'low budget retains actual 3D trees');
});

test('cave ceiling has matching end rings, inward normals and safe headroom',()=>{
 const v=require(path.join(temp,'gl.js')).geometryForTest('ceiling');const rings=[new Map(),new Map()];
 let lowest=Infinity;
 for(let i=0;i<v.length;i+=6){lowest=Math.min(lowest,v[i+1]);assert(v[i+4]<0,'ceiling normals face into the cave');if(Math.abs(v[i+2])===1)rings[v[i+2]===-1?0:1].set(v[i],v[i+1]);}
 assert.deepEqual([...rings[0]].sort(),[...rings[1]].sort());assert(10+lowest*4.2>6.5,'roof stays well above jumping characters');
});
