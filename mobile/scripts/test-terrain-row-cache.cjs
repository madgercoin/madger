/* CPU equivalence for terrain-row caching. Does not establish native FPS or pixel QA. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'../public/blackroot');
const source=fs.readFileSync(process.env.MADGER_RENDERER_SOURCE||path.join(root,'renderer.mjs'),'utf8');
// Frozen pre-cache loop from commit 004fc8c5b2867c7101d787a2063455815806d985.
// Independent reference prevents the candidate implementation redefining its oracle.
const referenceBody="    const gapRows=new Map();\n    const vertices=this.terrain.geometry.attributes.position,uv=this.terrain.geometry.attributes.uv,tint=this.terrain.geometry.attributes.color;\n\n    for(let i=0;i<vertices.count;i++){\n      const x=vertices.getX(i),z=vertices.getZ(i)-84,d=terrainAnchor-z;\n      const paths=roadsAt(d).map(r=>({...r,centre:r.centre+curve(travel)})),near=nearestRoad(paths,x),centre=near.centre,lateral=Math.abs(x-centre);\n      const localBiome=terrainBiome(this.worldPresets,near.route);\n      this.trailTint.set(localBiome==='cavern'?'#80746D':localBiome==='ruins'?'#A19782':'#B5A184');\n      this.mossTint.set(localBiome==='cavern'?'#52605D':localBiome==='ruins'?'#6A7967':'#4C6648');\n      const shoulder=Math.max(0,lateral-near.halfWidth);\n      if(!gapRows.has(d))gapRows.set(d,(this.gaps||[]).filter(o=>Math.abs(o.d-d)<2.8));\n      const inGap=gapRows.get(d).some(o=>o.route===near.route&&Math.abs(x-centre-o.lane*2.15)<1.55);\n      // Authored profiles shape each route while preserving the three flat\n      // gameplay lanes and original collision gap depth.\n      vertices.setY(i,roadSurfaceHeight(terrainProfile(this.worldPresets,near.route),near,x,d,Boolean(inGap)));\n      uv.setXY(i,x*.18,d*.18);\n      this.soilTint.copy(this.trailTint).lerp(this.mossTint,smooth(shoulder/1.7));\n      this.soilTint.multiplyScalar(.94+.055*Math.sin(d*.63+x*.55)+.035*Math.cos(x*.36-d*.29));\n      tint.setXYZ(i,this.soilTint.r,this.soilTint.g,this.soilTint.b);\n    }\n";
const start=source.indexOf('    const gapRows=new Map()'),end=source.indexOf('    vertices.needsUpdate=uv.needsUpdate=tint.needsUpdate=true;',start);
assert(start>=0&&end>start,'Terrain update block exists');
const parameters=['travel','terrainAnchor','roadsAt','curve','nearestRoad','terrainBiome','terrainProfile','roadSurfaceHeight','smooth','T'];
const reference=new Function(...parameters,referenceBody),candidate=new Function(...parameters,source.slice(start,end));
const curve=d=>Math.sin(d/76)*.8+Math.sin(d/185)*1.1;
const smooth=v=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x)};
test('terrain row cache preserves exact Three geometry and colors across routes and changing presets',async()=>{
 const T=await import(pathToFileURL(process.env.MADGER_THREE_CORE_SOURCE||path.join(root,'vendor/build/three.core.js')).href);
 const terrain=await import(pathToFileURL(path.join(root,'terrain.mjs')).href);
 const {legacyCharacters}=await import(pathToFileURL(path.join(root,'characters.mjs')).href);
 const bridge=legacyCharacters(class {});
 const originalPresets=JSON.parse(fs.readFileSync(path.join(root,'world-presets.json'),'utf8'));
 const families={rootway:['rootway','mosswalk','root-arch','log-crossing'],ridge:['ridge','causeway','watchtower','gearworks'],deep:['deep','mudslide','crystal-vein','ancient-vault']};
 const distances=[0,119,134,139,139.9,140,140.1,150,218,449.9,450,454.9,455,455.1,479,480,680,899.9,900];
 let cases=0,beforeRoads=0,afterRoads=0,beforeProfiles=0,afterProfiles=0;
 function fixture(){
  const geometry=new T.PlaneGeometry(100,205,56,96);geometry.rotateX(-Math.PI/2);
  geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*3),3));
  return {terrain:{geometry},trailTint:new T.Color(),mossTint:new T.Color(),soilTint:new T.Color(),worldPresets:structuredClone(originalPresets),gaps:[]};
 }
 function execute(fn,target,run,travel){
  const rowCache=new Map(),counts={roads:0,profiles:0};
  const roadsAt=d=>{counts.roads++;if(!rowCache.has(d))rowCache.set(d,terrain.visibleRoads(run,d,bridge.pathOffset,bridge.pathHeight,bridge.pathWidth).map(r=>({...r,centre:r.centre+curve(d)-curve(travel)})));return rowCache.get(d)};
  fn.call(target,travel,Math.floor(travel/(205/96))*(205/96),roadsAt,curve,terrain.nearestRoad,terrain.terrainBiome,
   (...args)=>{counts.profiles++;return terrain.terrainProfile(...args)},terrain.roadSurfaceHeight,smooth,T);
  target.terrain.geometry.computeVertexNormals();return counts;
 }
 function compare(a,b,run,travel){
  const unchanged=JSON.stringify(run),left=execute(reference,a,run,travel),right=execute(candidate,b,run,travel);
  for(const key of ['position','normal','uv','color'])assert.deepEqual(b.terrain.geometry.attributes[key].array,a.terrain.geometry.attributes[key].array,key+' '+run.route+' '+travel);
  assert.equal(JSON.stringify(run),unchanged);
  assert.equal(left.roads,5529);assert.equal(right.roads,97);
  assert.equal(left.profiles,5529);assert(right.profiles>=1&&right.profiles<=7);
  assert.deepEqual(b.soilTint,a.soilTint);
  beforeRoads+=left.roads;afterRoads+=right.roads;beforeProfiles+=left.profiles;afterProfiles+=right.profiles;cases++;
 }
 for(const route of Object.keys(originalPresets.routes))for(const travel of distances){
  const majorPath=Object.keys(families).find(f=>families[f].includes(route))||'deep';
  const run={route,majorPath},a=fixture(),b=fixture();
  const gaps=Object.keys(originalPresets.routes).flatMap(route=>[-1,0,1].map(lane=>({route,lane,d:Math.floor(travel)+4})));
  a.gaps=structuredClone(gaps);b.gaps=structuredClone(gaps);compare(a,b,run,travel);
  // Reuse both renderers after replacing/mutating authoring inputs: caches
  // belong to one rebuild and may not retain a previous route or preset.
  for(const target of [a,b]){
   for(const [name,p] of Object.entries(target.worldPresets.terrainProfiles))target.worldPresets.terrainProfiles[name]={...p,bank:2.7,ripple:.23,frequency:.41,strata:.86};
   target.worldPresets.routes={...target.worldPresets.routes,rootway:['cavern'],ridge:['forest'],deep:['ruins']};
   target.gaps=[];
  }
  compare(a,b,{route:route==='hollow'?'grotto':route,majorPath:'ridge'},travel+2.2);
  a.terrain.geometry.dispose();b.terrain.geometry.dispose();
 }
 assert(afterRoads*57===beforeRoads);assert(afterProfiles<beforeProfiles/100);
 console.log(JSON.stringify({terrainCacheEquivalence:{cases,vertices:5529,rows:97,beforeRoads,afterRoads,beforeProfiles,afterProfiles,exactAttributes:['position','normal','uv','color'],nativeFrameRateClaim:false}}));
});
