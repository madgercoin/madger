const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'madger-frame-gap-'));test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
for(const name of ['companions','core','frame-gap'])fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/game/expedition',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
const G=require(path.join(dir,'core.js')),F=require(path.join(dir,'frame-gap.js'));
const app=fs.readFileSync(path.join(__dirname,'../src/app/expedition.tsx'),'utf8'),tree=ts.createSourceFile('expedition.tsx',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function declaration(name){let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)===name)found=n;ts.forEachChild(n,visit);}visit(tree);assert(found,name);return found.initializer;}
function effectContaining(text){let found;function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'&&n.arguments[0].getText(tree).includes(text))found=n.arguments[0];ts.forEachChild(n,visit);}visit(tree);assert(found,text);return found;}
function harness(mode='running'){
 const s=G.freshExpedition(4242,'frame-policy');Object.assign(s,{mode,distance:99.8});const ref=current=>({current}),audio={active(){},dispose(){}},listeners={},forwarded=[],draws=[],events=[];
 const c={exports:{},...F,...G,console:{warn(){}},performance:{now:()=>0},Platform:{OS:'web'},document:{hidden:false,addEventListener:(n,fn)=>listeners[n]=fn,removeEventListener(){}},AppState:{addEventListener:(n,fn)=>(listeners.appState=fn,{remove(){}})},BackHandler:{addEventListener:(n,fn)=>(listeners.back=fn,{remove(){}})},requestAnimationFrame:()=>1,cancelAnimationFrame(){},mounted:ref(true),sceneRef:ref({stats:{},draw:(s,t)=>draws.push(t),dispose(){},setCourse(){}}),lastFrame:ref(null),runRef:ref(s),courseRef:ref([{id:1,d:100,lane:0,kind:'boulder',route:'main',phase:0}]),clockRef:ref(G.createClock()),frameGap:ref(F.createFrameGapGuard()),foreground:ref(true),focused:ref(true),visualTime:ref(0),lastDrawMs:ref(0),lastDrawn:ref({id:'',mode:null,calm:false}),needsDraw:ref(true),preferences:ref({calm:false}),finishedBanked:ref(''),lastFinish:ref(-10000),lastSave:ref(0),lastSnapshot:ref(0),raf:ref(null),bannerTimer:ref(null),audioRef:ref(audio),audio,store:{finish(){},checkpoint(){},dispose(){}},checkpoint(){},publish(){},onEvents:e=>events.push(...e),setReady3d(){},setRenderError(){}};
 c.advance=(...args)=>{forwarded.push(args[2]);G.advance(...args);};vm.createContext(c);
 const expressions={stopAndSave:declaration('stopAndSave').arguments[0],command:declaration('command').arguments[0],frame:declaration('frame').arguments[0],contextLost:declaration('contextLost').arguments[0],lifecycle:effectContaining('AppState.addEventListener')};
 for(const [name,node]of Object.entries(expressions)){const code=ts.transpileModule(`exports.${name}=${node.getText(tree)};`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInContext(code,c);c[name]=c.exports[name];}
 let focus,unmount;function lifecycleNodes(n){
  if(ts.isCallExpression(n)&&n.expression.getText(tree)==='useFocusEffect')focus=n.arguments[0].arguments[0];
  if(ts.isReturnStatement(n)&&n.expression&&ts.isArrowFunction(n.expression)&&n.expression.getText(tree).includes('mounted.current=false'))unmount=n.expression;
  ts.forEachChild(n,lifecycleNodes);
 }lifecycleNodes(tree);
 for(const [name,node]of Object.entries({focus,unmount})){assert(node,name);vm.runInContext(ts.transpileModule(`exports.${name}=${node.getText(tree)};`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);}
 listeners.blur=c.exports.focus();c.exports.lifecycle();return {c,s,events,forwarded,draws,listeners,tick:c.exports.frame,command:c.exports.command};
}
const snapshot=h=>JSON.stringify(h.s),gate=(g,dt,t,active=true)=>F.classifyFrameGap(g,dt,t,active);

test('400 ms remains the core safety boundary; isolated moderate gaps discard time',()=>{
 for(const dt of [.400001,.402,.440,.799]){const g=F.createFrameGapGuard();assert.equal(gate(g,dt,dt),'discard');assert.equal(gate(g,.316,dt+.316),'recover');assert.equal(gate(g,1/60,dt+.316+1/60),'advance');}
 const g=F.createFrameGapGuard();assert.equal(gate(g,.4,.4),'advance');for(const dt of [.8,1.2,10,NaN,Infinity,-.001])assert.equal(gate(F.createFrameGapGuard(),dt,10),'pause');
 const s=G.freshExpedition(1,'strict-core');s.mode='running';G.advance(s,[],.400001,G.createClock(),[]);assert.equal(s.mode,'paused','core guard was not raised');
});
test('actual RAF callback discards a 402/440 ms interval and healthy recovery without HP, distance or visual advance',()=>{
 for(const gap of [402,440])for(const mode of ['running','countdown']){
  const h=harness(mode);h.tick(0);h.c.clockRef.current.accumulator=G.STEP/2;const before=snapshot(h),v=h.c.visualTime.current;
  h.tick(gap);assert.equal(snapshot(h),before);assert.equal(h.c.clockRef.current.accumulator,0);assert.equal(h.c.visualTime.current,v);assert.deepEqual(h.forwarded,[0]);
  h.tick(gap+316);assert.equal(snapshot(h),before);assert.equal(h.c.visualTime.current,v);assert.deepEqual(h.forwarded,[0]);
  h.tick(gap+332);assert.equal(h.s.mode,mode);assert(h.forwarded.at(-1)>.015&&h.forwarded.at(-1)<.017);if(mode==='running')assert(h.s.distance>99.8);else assert(h.s.countdown<3);
 }
});
test('consecutive and recurring moderate stalls pause with no unseen simulation',()=>{
 for(const healthyBetween of [false,true]){const h=harness();h.tick(0);h.tick(402);if(healthyBetween)h.tick(418);const before=snapshot(h);h.tick(healthyBetween?858:842);assert.equal(h.s.mode,'paused');assert.equal(h.s.distance,JSON.parse(before).distance);assert.equal(h.s.hp,JSON.parse(before).hp);assert.deepEqual(h.forwarded,[0]);}
});
test('hard stalls including the existing 1.2 second case pause immediately',()=>{
 for(const ms of [800,1200,10000]){const h=harness();h.tick(0);const before=snapshot(h);h.tick(ms);assert.equal(h.s.mode,'paused');assert.equal(h.s.distance,JSON.parse(before).distance);assert.equal(h.s.hp,JSON.parse(before).hp);assert.equal(h.c.clockRef.current.accumulator,0);assert.deepEqual(h.forwarded,[0]);}
});
test('repeat budget expires only after a healthy period; regular 30/144 Hz input is unchanged',()=>{
 const g=F.createFrameGapGuard();gate(g,.402,.402);gate(g,.016,.418);assert.equal(gate(g,.016,2.1),'advance');assert.equal(gate(g,.440,2.54),'discard');
 for(const hz of [30,144]){const s=G.freshExpedition(9,'normal'),expected=G.freshExpedition(9,'normal'),guard=F.createFrameGapGuard(),a=G.createClock(),b=G.createClock();s.mode=expected.mode='running';for(let i=0;i<hz*4;i++){assert.equal(gate(guard,1/hz,(i+1)/hz),'advance');G.advance(s,[],1/hz,a,[]);G.advance(expected,[],1/hz,b,[]);}assert.deepEqual(s,expected);}
});
test('manual pause during recovery cannot auto-resume on a healthy frame',()=>{
 const h=harness();h.tick(0);h.tick(402);h.command('pause');const d=h.s.distance;h.tick(418);assert.equal(h.s.mode,'paused');assert.equal(h.s.distance,d);h.command('pause');h.tick(10000);assert.equal(h.s.mode,'running');assert.equal(h.s.distance,d);h.tick(10016);assert(h.s.distance>d);
});
test('actual AppState, document visibility and back handlers always pause, including pending recovery',()=>{
 for(const loss of ['background','inactive','hidden','back','focus','unmount']){const h=harness();h.tick(0);h.tick(402);const d=h.s.distance,hp=h.s.hp;
  if(loss==='focus')h.listeners.blur();else if(loss==='unmount')h.c.exports.unmount();else if(loss==='hidden'){h.c.document.hidden=true;h.listeners.visibilitychange();}else if(loss==='back')assert.equal(h.listeners.back(),true);else h.listeners.appState(loss);
  h.tick(418);assert.equal(h.s.mode,'paused',loss);assert.equal(h.s.distance,d);assert.equal(h.s.hp,hp);
  h.listeners.appState('active');h.c.document.hidden=false;h.listeners.visibilitychange();h.tick(10000);assert.equal(h.s.mode,'paused','activation cannot resume '+loss);assert.equal(h.s.distance,d);
 }
});
test('graphics context loss retains explicit pause and never advances pending recovery',()=>{
 const h=harness();h.tick(0);h.tick(402);h.c.exports.contextLost();const d=h.s.distance;h.tick(418);assert.equal(h.s.mode,'paused');assert.equal(h.s.distance,d);assert.equal(h.c.lastFrame.current,418);
});
