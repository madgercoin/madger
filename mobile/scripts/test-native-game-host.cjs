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
 assert.equal(renderSnapshot(state,'LOW ROOT CANOPY · BURROW · 20m').hint,'LOW ROOT CANOPY · BURROW · 20m');
 assert.equal(renderSnapshot({...state,lastJumpAt:4.2}).jumpAt,4.2);
 assert.equal(JSON.stringify(state),before);
 assert.equal(renderSnapshot({...state,y:.3}).action,'jumping');
 assert.equal(renderSnapshot({...state,slide:0}).action,'running');
 assert.equal(renderSnapshot({...state,mode:'paused'}).mode,'paused');
});

// Exercise the Android wrapper's actual handlers with a minimal hook host. This
// checks save/exit ordering and recovery UI, not Android rendering or GPU health.
const turn = () => new Promise(resolve => setImmediate(resolve));
function mountAndroid(storage) {
 const slots=[], effects=[], exits=[], callbacks={}; let cursor=0, mounted=false, afterUnmountUpdates=0;
 const react={
  useState(initial){const index=cursor++;if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;return [slots[index],value=>{if(!mounted)afterUnmountUpdates++;slots[index]=typeof value==='function'?value(slots[index]):value;}];},
  useRef(initial){const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];},
  useEffect(effect){const index=cursor++;if(!(index in slots)){slots[index]=true;effects.push(effect);}},
 };
 const jsx=(type,props)=>({type,props});
 const Screen=load('src/app/expedition.android.tsx',{
  react,'react/jsx-runtime':{jsx,jsxs:jsx},
  'react-native':{View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:v=>v},
   AppState:{currentState:'active',addEventListener:(name,callback)=>{callbacks.appState=callback;return{remove(){delete callbacks.appState;}};}},
   BackHandler:{addEventListener:(name,callback)=>{callbacks.back=callback;return{remove(){delete callbacks.back;}};}},
  },
  'expo-modules-core':{requireNativeViewManager:()=> 'OfflineGame'},
  '@react-native-async-storage/async-storage':{__esModule:true,default:storage},
  'expo-router':{useRouter:()=>({replace:route=>exits.push(route)})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  '@/game/expedition/profile':{EXPEDITION_KEY:key},
 }).default;
 const render=()=>{cursor=0;return Screen();};
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat()){const match=find(child,predicate);if(match)return match;}return null;}
 mounted=true;render();const cleanups=effects.map(effect=>effect());
 return {render,exits,callbacks,
  game:()=>find(render(),node=>node.type==='OfflineGame'),
  button:label=>find(render(),node=>node.props?.accessibilityLabel===label),
  text:()=>JSON.stringify(render()),
  unmount:()=>{cleanups.forEach(cleanup=>cleanup?.());mounted=false;},
  afterUnmountUpdates:()=>afterUnmountUpdates,
 };
}
const saveEvent=value=>({nativeEvent:{message:JSON.stringify({type:'storage',key,value})}});
const exitEvent={nativeEvent:{message:'{"type":"exit"}'}};

test('Android read failure can retry in place without writing or clearing any save',async()=>{
 const value='{"version":1,"coins":23}',writes=[];let reads=0;
 const app=mountAndroid({getItem:async()=>{if(++reads===1)throw Error('temporarily unavailable');return value;},setItem:async(...args)=>writes.push(args)});
 await turn();assert.equal(app.game(),null);assert.match(app.text(),/no records have been changed/);
 app.button('Retry offline Expedition').props.onPress();await turn();
 assert.equal(JSON.parse(app.game().props.initialStorage)[key],value);
 assert.deepEqual(writes,[]);assert.equal(reads,2);app.unmount();
});

test('Android backup recovery waits queued saves and retries the newest value only',async()=>{
 let value='{"version":1,"coins":3}',releaseSecond;const writes=[];
 const app=mountAndroid({getItem:async()=>value,setItem:async(k,v)=>{
  writes.push(v);if(writes.length===1)throw Error('disk unavailable');
  if(writes.length===2)await new Promise(resolve=>{releaseSecond=resolve;});value=v;
 }});
 await turn();const onMessage=app.game().props.onMessage;
 const old='{"version":1,"coins":4}',latest='{"version":1,"coins":5}';
 onMessage(saveEvent(old));onMessage(saveEvent(latest));onMessage(exitEvent);await turn();
 assert.equal(app.game(),null);assert.deepEqual(app.exits,[]);assert.deepEqual(writes,[old,latest]);
 const retry=app.button('Retry offline Expedition').props.onPress;retry();retry();await turn();
 assert.deepEqual(writes,[old,latest],'retry must wait for the existing write and ignore repeated taps');
 assert.equal(app.button('Retry offline Expedition').props.disabled,true);
 releaseSecond();await turn();
 assert.deepEqual(writes,[old,latest,latest]);assert.equal(JSON.parse(app.game().props.initialStorage)[key],latest);
 app.game().props.onMessage(exitEvent);await turn();assert.deepEqual(app.exits,['/legacy']);app.unmount();
});

test('Android normal exit waits for its native backup to become durable',async()=>{
 let release;const app=mountAndroid({getItem:async()=>null,setItem:()=>new Promise(resolve=>{release=resolve;})});
 await turn();const onMessage=app.game().props.onMessage;onMessage(saveEvent('{"version":1}'));onMessage(exitEvent);await turn();
 assert.deepEqual(app.exits,[]);release();await turn();assert.deepEqual(app.exits,['/legacy']);app.unmount();
});

test('Android failed retry remains actionable and does not mount the game',async()=>{
 const app=mountAndroid({getItem:async()=>null,setItem:async()=>{throw Error('still unavailable');}});
 await turn();app.game().props.onMessage(saveEvent('{"version":1}'));await turn();
 app.button('Retry offline Expedition').props.onPress();await turn();
 assert.equal(app.game(),null);assert.equal(app.button('Retry offline Expedition').props.disabled,false);
 assert.match(app.text(),/native backup could not be updated/);assert.deepEqual(app.exits,[]);app.unmount();
});

test('Android malformed bridge save retains prior backup and blocks automatic exit',async()=>{
 const writes=[],value='{"version":1,"coins":8}';
 const app=mountAndroid({getItem:async()=>value,setItem:async(k,v)=>writes.push(v)});
 await turn();const onMessage=app.game().props.onMessage;
 onMessage(saveEvent('{broken'));onMessage(exitEvent);await turn();assert.deepEqual(writes,[]);assert.deepEqual(app.exits,[]);
 app.button('Retry offline Expedition').props.onPress();await turn();assert.equal(JSON.parse(app.game().props.initialStorage)[key],value);app.unmount();
});

test('Android graphics restart reopens the same save without clearing game data',async()=>{
 const value='{"version":1,"checkpoint":{"distance":355}}',writes=[];
 const app=mountAndroid({getItem:async()=>value,setItem:async(k,v)=>writes.push(v)});
 await turn();app.game().props.onError({nativeEvent:{message:'The 3D graphics process stopped.'}});
 assert.equal(app.game(),null);app.button('Retry offline Expedition').props.onPress();await turn();
 assert.equal(JSON.parse(app.game().props.initialStorage)[key],value);assert.deepEqual(writes,[]);app.unmount();
});

test('Android pending callbacks cannot navigate or update an unmounted screen',async()=>{
 let release;const app=mountAndroid({getItem:async()=>null,setItem:()=>new Promise((resolve,reject)=>{release=reject;})});
 await turn();const onMessage=app.game().props.onMessage;onMessage(saveEvent('{"version":1}'));onMessage(exitEvent);await turn();
 app.unmount();release(Error('unmounted failure'));await turn();
 assert.deepEqual(app.exits,[]);assert.equal(app.afterUnmountUpdates(),0);
 assert.equal(app.callbacks.appState,undefined);assert.equal(app.callbacks.back,undefined);
});


test('entrance evidence uses a bounded denser cadence without mutating play',()=>{
 const {renderObservationInterval}=load('src/game/expedition/render-observation.ts',{});
 const state=Object.freeze({board:'overgrown',mode:'running',distance:134});
 const before=JSON.stringify(state);
 assert.equal(renderObservationInterval(state),80);
 assert.equal(JSON.stringify(state),before);
 for(const distance of [120,130,134,136.9,140.9,435,450,455.9])assert.equal(renderObservationInterval({...state,distance}),80);
 for(const distance of [0,119.9,141,434.9,456,700,1080])assert.equal(renderObservationInterval({...state,distance}),500);
 for(const mode of ['ready','countdown','paused','fork','chamber','upgrade','won','lost'])assert.equal(renderObservationInterval({...state,mode}),500);
 assert.equal(renderObservationInterval({...state,board:'classic'}),500);
});

test('entrance evidence no longer skips the recorded 131m to 137m sample gap',()=>{
 const {renderObservationInterval}=load('src/game/expedition/render-observation.ts',{});
 // The Nov 11 native run published 131m and then 137m 607ms later.
 // Reproduce that healthy-render/sparse-heartbeat case without claiming phone QA.
 const frames=[{at:0,distance:131},{at:100,distance:132},{at:200,distance:133},
   {at:300,distance:134},{at:400,distance:135},{at:490,distance:136},{at:607,distance:137}];
 const publish=interval=>{let last=0;return frames.filter((frame,index)=>{
  if(index===0||frame.at-last>=interval({board:'overgrown',mode:'running',distance:frame.distance})){
   last=frame.at;return true;
  }return false;
 }).map(frame=>frame.distance);};
 // 500ms can miss the trigger for different frame/phase alignment.
 assert.deepEqual(publish(()=>500),[131,137]);
 assert.equal(publish(()=>500).some(d=>d>=134&&d<137),false);
 assert.ok(publish(renderObservationInterval).some(d=>d>=134&&d<137));
});

test('ordinary rendered frame rates retain entrance samples across heartbeat phase offsets',()=>{
 const {renderObservationInterval}=load('src/game/expedition/render-observation.ts',{});
 for(const hz of [10,15,20,30,60])for(let phase=0;phase<500;phase+=10){
  let last=-phase,seen=false;
  for(let at=0;at<2500;at+=1000/hz){
   const distance=120+at/1000*10.3;
   if(at-last>=renderObservationInterval({board:'overgrown',mode:'running',distance})){
    last=at;if(Math.floor(distance)>=134&&Math.floor(distance)<137)seen=true;
   }
  }
  assert.ok(seen,`No entrance sample at ${hz}Hz / ${phase}ms phase`);
 }
 const source=fs.readFileSync(path.join(root,'src/app/expedition.tsx'),'utf8');
 assert.match(source,/timestamp-lastObservation\.current>=renderObservationInterval\(s\)/);
 assert.ok(source.indexOf('sceneRef.current.draw(s,visualTime.current,calm)')<source.indexOf('>=renderObservationInterval(s)'));
 assert.match(source,/if\(nativeGameHost\(\)&&renderedSnapshot\.current\)/);
});
