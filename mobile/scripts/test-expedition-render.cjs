/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'madger-render-test-'));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
for (const name of ['math', 'gl']) {
  const source = fs.readFileSync(path.join(__dirname, '../src/game/expedition', name + '.ts'), 'utf8');
  fs.writeFileSync(path.join(dir, name + '.js'), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const { ExpeditionRenderer, adaptNativeSceneryBudget } = require(path.join(dir, 'gl.js'));

// Model Expo's asynchronous frame batches: submission does not present them.
// A blocking native drain must finish the preceding batch before JS gets ahead.
function context({ native = true, instanced = true, webShim = false } = {}) {
  const state = { pending: [], presented: [], maxPending: 0, flushes: 0, drains: 0, draws: 0, instancedDraws: 0, travel: 0 };
  const noop = () => {};
  const gl = {
    drawingBufferWidth: 480, drawingBufferHeight: 960,
    createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}),
    getShaderParameter: () => true, getProgramParameter: () => true,
    getUniformLocation: (_, name) => ({ name }), getExtension: () => null,
    uniform1f: (location, value) => { if (location.name === 'uTravel') state.travel = value; },
    flush: () => { state.flushes++; },
    drawArrays: () => { state.draws++; },
    drawArraysInstanced: instanced ? () => { state.instancedDraws++; } : undefined,
    vertexAttribDivisor: instanced ? noop : undefined,
    endFrameEXP: native ? () => {
      state.pending.push(state.travel);
      state.maxPending = Math.max(state.maxPending, state.pending.length);
    } : webShim ? noop : undefined,
    flushEXP: native ? () => {
      state.drains++;
      state.presented.push(...state.pending);
      state.pending.length = 0;
    } : undefined,
  };
  let constant = 1;
  const proxy = new Proxy(gl, { get(target, key) {
    if (key in target) return target[key];
    if (/^[A-Z_0-9]+$/.test(String(key))) return target[key] = constant++;
    return noop;
  } });
  return { gl: proxy, state };
}

function frame(renderer, index, instances = 100) {
  renderer.reset();
  for (let i = 0; i < instances; i++) renderer.shape('box', [1, 1, 1, 0], i / 10, 0, -i, 1, 1, 1);
  renderer.render([0, 4, 9], [0, 1, -14], index / 60, 0, index);
}

test('native submission cannot accumulate stale frames behind current simulation state', t => {
  t.mock.method(console, 'info', () => {});
  const { gl, state } = context();
  const renderer = new ExpeditionRenderer(gl);
  for (let i = 1; i <= 60; i++) {
    frame(renderer, i);
    assert.equal(state.pending.length, 0, 'frame must drain before another render can be submitted');
    assert.equal(state.presented.at(-1), i, 'presentation must contain the current travel state');
  }
  assert.equal(state.maxPending, 1);
  assert.equal(state.drains, 60);
  assert.equal(state.instancedDraws, 60);
  assert.equal(state.draws, 0);
  assert.equal(renderer.stats.drawCalls, 1);
  assert.equal(renderer.stats.instances, 100);
  assert(Number.isFinite(renderer.stats.nativeDrainMs));
});

test('non-instanced native rendering remains synchronized and exposes its real draw count', t => {
  t.mock.method(console, 'info', () => {});
  const { gl, state } = context({ instanced: false });
  const renderer = new ExpeditionRenderer(gl);
  frame(renderer, 7, 12);
  assert.deepEqual(state.presented, [7]);
  assert.equal(state.draws, 12);
  assert.equal(renderer.stats.drawCalls, 12);
});

test('browser rendering does not require a native synchronization method', () => {
  for (const webShim of [false, true]) {
    const { gl, state } = context({ native: false, webShim });
    const renderer = new ExpeditionRenderer(gl);
    frame(renderer, 3);
    assert.equal(state.drains, 0);
    assert.equal(state.flushes, 1);
    assert.equal(state.instancedDraws, 1);
    assert.equal(renderer.stats.nativeDrainMs ?? 0, 0);
  }
});

test('a failed native drain propagates so the screen can pause and save', () => {
  const { gl } = context();
  gl.flushEXP = () => { throw Error('GPU unavailable'); };
  assert.throws(() => frame(new ExpeditionRenderer(gl), 2), /GPU unavailable/);
});

test('native-only scenery budget reacts to expensive drains without oscillation', () => {
  let state = { level: 2, fastFrames: 0, slowFrames: 0 };
  state = adaptNativeSceneryBudget(state, 218.72); // Observed software-emulator drain
  assert.equal(state.level, 1);
  state = adaptNativeSceneryBudget(state, 110);
  assert.equal(state.level, 0, 'slow devices retain playable collision geometry and discard far dressing');
  for (let i = 0; i < 20; i++) state = adaptNativeSceneryBudget(state, 25);
  assert.equal(state.level, 0, 'ordinary frame timings cannot immediately raise detail');
  for (let i = 0; i < 149; i++) state = adaptNativeSceneryBudget(state, 12);
  assert.equal(state.level, 0);
  state = adaptNativeSceneryBudget(state, 12);
  assert.equal(state.level, 1, 'sustained real headroom restores some scenery');
  state = adaptNativeSceneryBudget(state, 62);
  assert.equal(state.level, 1, 'one moderately slow frame cannot oscillate quality');
  state = adaptNativeSceneryBudget(state, 62);
  assert.equal(state.level, 0);
  assert.equal(adaptNativeSceneryBudget(state, NaN), state, 'invalid timing must not invent an upgrade');
});
test('native starts conservative but browser scene retains full detail', () => {
  const native = new ExpeditionRenderer(context({ native:true }).gl);
  const web = new ExpeditionRenderer(context({ native:false }).gl);
  assert.equal(native.sceneryBudget, 1);
  assert.equal(web.sceneryBudget, 2);
  native.dispose();web.dispose();
});

test('native moving background uses one bounded smooth ridgeline batch', t => {
  t.mock.method(console, 'info', () => {});
  const {gl,state} = context();
  const renderer=new ExpeditionRenderer(gl);
  try {
    const ridge=renderer.batches.get('ridge');
    assert(ridge,'procedural far-bank mesh is absent on native GL');
    assert.equal(ridge.vertices,12*8*2*3,'tessellation exceeds the mobile background budget');
    assert(Number.isFinite(ridge.bounds.half[0]));
    assert(ridge.bounds.half[0]>.95,'ridgeline cannot collapse to a billboard');
    assert(ridge.bounds.half[1]>.20,'ridgeline has no real 3D relief');
    renderer.reset();
    renderer.shape('ridge',[.43,.52,.46,-8],0,-.2,-18,9,9,13);
    renderer.shape('ridge',[.43,.52,.46,-8],0,-.2,-38,10,7,12);
    renderer.render([0,4,9],[0,1,-14],2,0,340);
    assert.equal(renderer.stats.drawCalls,1,'new bank cannot add one draw call per rock');
    assert.equal(renderer.stats.instances,2);
    assert.equal(renderer.stats.triangles,2*12*8*2);
    assert.equal(state.pending.length,0,'background frames must drain before new simulation');
  }finally {renderer.dispose();}
});

test('animated native sky uses the existing sphere batch and completes frame draining', t => {
  t.mock.method(console, 'info', () => {});
  const {gl,state}=context();
  const shaderSources=[];
  gl.shaderSource=(_shader,source)=>shaderSources.push(source);
  const renderer=new ExpeditionRenderer(gl);
  try{
    const fragment=shaderSources.find(source=>source.includes('GL_FRAGMENT_PRECISION_HIGH'));
    assert(fragment,'native fragment shader not provided to GL');
    assert.match(fragment,/vColor\.a < -8\.5 && vColor\.a > -9\.5/);
    assert.match(fragment,/float drift=uTime\*\.023/,'sky has no frame-time cloud motion');
    renderer.reset();
    renderer.shape('sphere',[.70,.81,.78,-9],0,4.4,9.6,138,138,138);
    renderer.render([0,4.4,9.6],[0,1,-14],3,0,200);
    assert.equal(renderer.stats.instances,1,'sky globe was frustum culled');
    assert.equal(renderer.stats.drawCalls,1,'sky added an independent draw pass');
    assert.equal(state.pending.length,0,'sky cannot queue unpresented frames');
    assert.equal(renderer.stats.triangles,renderer.batches.get('sphere').vertices/3);
  }finally{renderer.dispose();}
});

test('native scene pixel budget preserves aspect and bounds high-density fill cost', () => {
  const {nativeSceneSize}=require(path.join(dir,'gl.js'));
  for(const [w,h] of [[480,960],[1080,2400],[1440,3120],[2400,1080]]) {
    let previous=0;
    for(const budget of [0,1,2]) {
      const size=nativeSceneSize(w,h,budget);
      assert(size.width*size.height<=800000);
      assert(size.width*size.height>=previous);
      assert(Math.abs(size.width/size.height-w/h)<.01);
      previous=size.width*size.height;
    }
  }
});

test('native scene composites into the Expo-owned framebuffer and releases GPU resources', () => {
  const {NativeSceneTarget}=require(path.join(dir,'gl.js'));
  const {gl}=context();const output={expoPresentation:true};let bound=output;
  const allocations=[],deletions=[],viewports=[],draws=[];
  gl.createFramebuffer=()=>({kind:'framebuffer'});gl.createTexture=()=>({kind:'texture'});
  gl.createRenderbuffer=()=>({kind:'depth'});
  gl.getParameter=()=>bound;gl.bindFramebuffer=(_,value)=>{bound=value;};
  gl.checkFramebufferStatus=()=>gl.FRAMEBUFFER_COMPLETE;
  gl.texImage2D=(...args)=>allocations.push(args.slice(3,5));
  gl.viewport=(...args)=>viewports.push(args);
  gl.drawArrays=()=>draws.push(bound);
  for(const method of ['deleteFramebuffer','deleteTexture','deleteRenderbuffer','deleteBuffer','deleteProgram'])gl[method]=obj=>deletions.push(obj);
  const target=new NativeSceneTarget(gl);
  const first=target.begin(1080,2400,1);
  assert.notEqual(bound,output);target.present(1080,2400);
  assert.equal(bound,output);assert.deepEqual(draws,[output]);
  assert.deepEqual(viewports.at(-1),[0,0,1080,2400]);
  target.begin(1080,2400,1);target.present(1080,2400);
  assert.equal(allocations.length,1,'stable targets do not reallocate each frame');
  target.begin(480,960,0);target.present(480,960);
  assert.equal(allocations.length,2,'rotation/size/quality changes recreate bounded attachments');
  assert(first.width*first.height<=800000);
  target.dispose();assert.equal(deletions.length,5);
});

test('an incomplete native framebuffer restores the presentation target and fails closed',()=>{
 const {NativeSceneTarget}=require(path.join(dir,'gl.js'));
 const {gl}=context();const output={expo:true};let bound=output;
 gl.createFramebuffer=()=>({});gl.createTexture=()=>({});gl.createRenderbuffer=()=>({});
 gl.getParameter=()=>bound;gl.bindFramebuffer=(_,value)=>{bound=value;};
 gl.checkFramebufferStatus=()=>-1;
 const target=new NativeSceneTarget(gl);
 assert.throws(()=>target.begin(480,960,1),/incomplete/);
 assert.equal(bound,output);
 target.dispose();
});
