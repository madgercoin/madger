const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const root=path.join(__dirname,'..');
function load(file,deps,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>{if(!(n in deps))throw Error(n);return deps[n]},...globals});return exports;}
const key='madger-expedition-3d-v1';
function bridge(initial,existing){const values=new Map(existing?[[key,existing]]:[]),messages=[];const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};const storage={getItem:async k=>localStorage.getItem(k),setItem:async(k,v)=>localStorage.setItem(k,v)};const api=load('src/game/expedition/native-host.ts',{'@react-native-async-storage/async-storage':{__esModule:true,default:storage},'./profile':{EXPEDITION_KEY:key}},{localStorage,window:{MadgerNative:{getInitialStorage:()=>JSON.stringify({[key]:initial}),postMessage:m=>messages.push(JSON.parse(m))}}});return {api,values,messages};}
test('primary cold route and Play 3D route open Expedition',()=>{for(const file of ['index','expedition-entry']){const Redirect=()=>{};const route=load(`src/app/(tabs)/${file}.tsx`,{'expo-router':{Redirect},'react/jsx-runtime':{jsx:(type,props)=>({type,props})}}).default();assert.equal(route.type,Redirect);assert.equal(route.props.href,'/expedition');}});
test('first native launch imports checkpoint without erasing other records',async()=>{const value=JSON.stringify({version:1,checkpoint:{distance:186}}),b=bridge(value);b.values.set('legacy','unchanged');b.api.installNativeGameStorage();assert.equal(await b.api.expeditionStorage.getItem(key),value);assert.equal(b.values.get('legacy'),'unchanged');});
test('newer hosted save wins over prior native import',()=>{const b=bridge('{"version":1,"old":true}','{"version":1,"new":true}');b.api.installNativeGameStorage();assert.equal(b.values.get(key),'{"version":1,"new":true}');});
test('durable writes back up only Expedition',async()=>{const b=bridge(null);await b.api.expeditionStorage.setItem(key,'{"version":1}');await b.api.expeditionStorage.setItem('legacy','kept');assert.deepEqual(JSON.parse(JSON.stringify(b.messages)),[{type:'storage',key,value:'{"version":1}'}]);});
test('malformed import fails without overwriting existing record',()=>{const b=bridge('{broken');assert.throws(()=>b.api.installNativeGameStorage());assert.equal(b.values.has(key),false);});
test('native host refuses primitive fallback when authored module fails',async()=>{let fallback=0;const api=load('src/game/expedition/web-renderer.ts',{'./scene':{ExpeditionScene:class {constructor(){fallback++}}},'./native-host':{nativeGameHost:()=>({})}},{window:{},console,document:{createElement:()=>({remove(){}}),head:{appendChild:s=>s.onerror()}}});await assert.rejects(api.createWebExpeditionScene({}),/No simplified scene/);assert.equal(fallback,0);});
test('render observer only snapshots actual state and never mutates gameplay',()=>{
 const {renderSnapshot}=load('src/game/expedition/render-observation.ts',{});
 const state=Object.freeze({id:'actual-run',mode:'running',distance:353.8,lane:1,y:0,slide:.5,route:'deep',score:2825});
 const before=JSON.stringify(state),a=renderSnapshot(state);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),{runId:'actual-run',mode:'running',distance_m:353,lane:1,action:'burrowing',route:'deep',score:2825});
 assert.equal(JSON.stringify(state),before);
 assert.equal(renderSnapshot({...state,y:.3}).action,'jumping');
 assert.equal(renderSnapshot({...state,slide:0}).action,'running');
 assert.equal(renderSnapshot({...state,mode:'paused'}).mode,'paused');
});
