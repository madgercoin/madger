const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/game/expedition/audio.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

// Native seek completion can arrive after pause(), a priority cue or unmount.
// These promises deliberately stay unresolved until each test chooses an order.
function harness({web=false}={}) {
  const players = new Map(), requests=[];
  const exports = {};
  const audioMock = {
    createAudioPlayer(asset) {
      const player = {
        volume: 0, loop: false, playing: false, playCalls: 0, pauseCalls: 0,
        removed: false, seeks: [], throwOnPause: false,
        seekTo(position) {
          assert.equal(position, 0);requests.push({name:path.basename(asset),volume:this.volume,rate:this.playbackRate});
          return new Promise((resolve, reject) => this.seeks.push({ resolve, reject }));
        },
        play() { assert.equal(this.removed, false); if(web)this.media.play();this.playing = true; this.playCalls++; },
        pause() {
          this.pauseCalls++;
          if (this.throwOnPause) throw new Error('Native route unavailable');
          this.playing = false;
        },
        remove() { this.removed = true; this.playing = false; },
      };
      if(web)player.media={play:()=>player.rejectMediaPlay?Promise.reject(new Error('HTML play interrupted')):Promise.resolve()};
      players.set(path.basename(asset), player);
      return player;
    },
    setAudioModeAsync: () => Promise.resolve(),
  };
  vm.runInNewContext(compiled, {
    exports,
    ...(web?{document:{}}:{}),
    require(id) {
      if (id === 'expo-audio') return audioMock;
      if (/\.(wav|mp3)$/.test(id)) return id;
      throw new Error('Unexpected dependency: ' + id);
    },
  }, { filename: 'expedition-audio.js' });
  const audio = exports.createExpeditionAudio();
  audio.active(true);
  return {
    audio, players, requests,
    emit: (kind, at) => audio.events([{ kind, at }], 0),
    player: name => { const player = players.get(name); assert(player, name); return player; },
    async complete(name, index = 0) {
      const player = players.get(name);
      assert(player && player.seeks[index], 'Expected pending seek for ' + name);
      player.seeks.splice(index, 1)[0].resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
    async completeAll() {
      for (const player of players.values()) {
        for (const seek of player.seeks.splice(0)) seek.resolve();
      }
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

test('an allowed delayed cue plays once at its requested volume', async () => {
  const h = harness();
  h.emit('companion-attack', 1);
  const snow = h.player('snow-bark.wav');
  assert.equal(snow.playCalls, 0);
  await h.complete('snow-bark.wav');
  assert.equal(snow.playCalls, 1);
  assert.equal(snow.volume, .20);
  assert.equal(snow.playing, true);
});

test('web audio fetches only active beds and requested cues, reusing players',async()=>{
 const h=harness({web:true});assert.equal(h.players.size,2,'only the two active audio beds preload');
 assert(!h.players.has('snow-bark.wav'));assert(!h.players.has('finish.wav'));
 h.emit('coin',1);assert.equal(h.players.size,3);await h.complete('pickup.wav');assert.equal(h.player('pickup.wav').playCalls,1);
 h.emit('coin',2);assert.equal(h.players.size,4);await h.complete('pickup-3.wav');assert.equal(h.player('pickup-3.wav').playCalls,1);h.emit('coin',2.1);assert.equal(h.players.size,4);
 h.audio.active(false);assert([...h.players.values()].every(p=>!p.playing));
});
test('a browser play promise interrupted by pause is consumed without an unhandled rejection',async()=>{
 const h=harness({web:true});h.emit('coin',1);
 h.player('pickup.wav').play=()=>Promise.reject(new Error('play interrupted by pause'));
 await h.complete('pickup.wav');await new Promise(resolve=>setImmediate(resolve));
});
test('the pinned web player can drop its internal media promise without leaking cancellation',async()=>{
 const h=harness({web:true});h.emit('coin',1);h.player('pickup.wav').rejectMediaPlay=true;
 await h.complete('pickup.wav');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.player('pickup.wav').playCalls,1);
});

for (const guardFirst of [false, true]) {
  test('Gorilla cancels pending Snow and Bot cues, guard resolves ' + (guardFirst ? 'first' : 'last'), async () => {
    const h = harness();
    h.emit('companion-attack', 1);
    h.emit('companion-boost', 1.25);
    h.emit('companion-guard', 1.3);
    const names = guardFirst ? ['gorilla-guard.wav', 'snow-bark.wav', 'bot-hack.wav']
      : ['snow-bark.wav', 'bot-hack.wav', 'gorilla-guard.wav'];
    for (const name of names) await h.complete(name);
    assert.equal(h.player('snow-bark.wav').playCalls, 0);
    assert.equal(h.player('bot-hack.wav').playCalls, 0);
    assert.equal(h.player('gorilla-guard.wav').playCalls, 1);
  });
}

for (const [first, second, firstAsset, secondAsset, secondAt] of [
  ['secret', 'hit', 'happy.mp3', 'hurt.mp3', 1.6],
  ['hit', 'secret', 'hurt.mp3', 'happy.mp3', 10.1],
]) {
  test(secondAsset + ' excludes an unresolved ' + firstAsset + ' seek', async () => {
    const h = harness();
    h.emit(first, 1);
    h.emit(second, secondAt);
    await h.complete(secondAsset);
    await h.complete(firstAsset);
    assert.equal(h.player(firstAsset).playCalls, 0);
    assert.equal(h.player(secondAsset).playCalls, 1);
  });
}

test('a newer request for the same cue supersedes the older pending seek', async () => {
  const h = harness();h.emit('jump',1);h.emit('jump',1.4);
  await h.complete('jump.wav',1);await h.complete('jump.wav');
  assert.equal(h.player('jump.wav').playCalls,1);
});

test('priority pause invalidates a pending seek even if native pause throws', async () => {
  const h = harness();
  h.emit('companion-attack', 1);
  h.player('snow-bark.wav').throwOnPause = true;
  assert.doesNotThrow(() => h.emit('companion-guard', 1.1));
  await h.completeAll();
  assert.equal(h.player('snow-bark.wav').playCalls, 0);
  assert.equal(h.player('gorilla-guard.wav').playCalls, 1);
});

for (const [name, cancel] of [
  ['stop', audio => audio.stop()],
  ['pause and resume', audio => { audio.active(false); audio.active(true); }],
  ['mute and unmute', audio => { audio.settings(false, true); audio.settings(true, true); }],
  ['reset', audio => audio.reset()],
  ['dispose', audio => audio.dispose()],
]) {
  test(name + ' prevents a stale seek from reviving a cue', async () => {
    const h = harness();
    h.emit('coin', 1);
    cancel(h.audio);
    await h.completeAll();
    assert.equal(h.player('pickup.wav').playCalls, 0);
  });
}

test('danger cancels routine rewards while leaving a discovery cue available', async () => {
  const h = harness();
  h.emit('coin', 1);h.emit('fork',1);
  h.emit('companion-attack', 1);
  h.emit('companion-guard', 1.1);
  await h.completeAll();
  assert.equal(h.player('pickup.wav').playCalls, 0);assert.equal(h.player('secret.wav').playCalls,1);
  assert.equal(h.player('snow-bark.wav').playCalls, 0);
  assert.equal(h.player('gorilla-guard.wav').playCalls, 1);
});

test('a cue can play again after a prior request is cancelled', async () => {
  const h = harness();
  h.emit('companion-attack', 1);
  h.emit('companion-guard', 1.1);
  h.emit('companion-attack', 5);
  await h.complete('snow-bark.wav');
  assert.equal(h.player('snow-bark.wav').playCalls, 0);
  await h.complete('snow-bark.wav');
  assert.equal(h.player('snow-bark.wav').playCalls, 1);
});


test('continuous running uses all four distinct quiet contacts, with no adjacent repeat or backlog',async()=>{
 const h=harness();for(let i=0;i<200;i++){h.emit('step',i*.05);await h.completeAll();}
 const steps=h.requests.filter(x=>x.name.startsWith('paw-'));
 assert(steps.length>=30&&steps.length<=40,`ten seconds produced ${steps.length} steps`);
 assert.equal(new Set(steps.map(x=>x.name)).size,4);
 for(let i=1;i<steps.length;i++)assert.notEqual(steps[i].name,steps[i-1].name);
 assert(steps.every(x=>x.volume<=.15&&x.rate>=.96&&x.rate<=1.04));
 const before=h.requests.length;
 h.audio.events(Array.from({length:40},(_,i)=>({kind:'step',at:20+i*.05})),0);
 assert(h.requests.length-before<=1,'one late frame must not produce a footstep burst');
});
test('coins share a family budget and cycle four timbres; near misses are silent',async()=>{
 const h=harness();for(let i=0;i<100;i++){h.emit('coin',i*.05);h.emit('near',i*.05);await h.completeAll();}
 const pickups=h.requests.filter(x=>x.name.startsWith('pickup'));
 assert(pickups.length<=13);assert.equal(new Set(pickups.map(x=>x.name)).size,4);
 assert.equal(h.requests.filter(x=>x.name==='relic.wav').length,0);
});
test('routine boosts and shards do not repeat the celebration voice',async()=>{
 const h=harness();for(let i=0;i<30;i++)for(const kind of ['hero-shard','burst','power'])h.emit(kind,i);
 assert.equal(h.player('happy.mp3').seeks.length,0);
 h.emit('secret',40);h.emit('secret',42);h.emit('win',43);
 assert.equal(h.player('happy.mp3').seeks.length,1,'major moments still share the voice budget');
});
test('a damage event suppresses coincident rewards regardless of event order',async()=>{
 for(const events of [[{kind:'coin',at:2},{kind:'hit',at:2}],[{kind:'hit',at:2},{kind:'coin',at:2}]]){
  const h=harness();h.audio.events(events,0);await h.completeAll();
  assert.equal(h.player('pickup.wav').playCalls,0);assert.equal(h.player('hurt.mp3').playCalls,1);
 }
});
test('stone routes use a separate contact bank and cave routes silence outdoor birds',()=>{
 const h=harness();h.audio.events([{kind:'step',at:1}],1);
 assert.equal(h.requests.at(-1).name,'stone-1.wav');
 h.audio.events([{kind:'step',at:2}],2);assert.equal(h.player('forest-air.mp3').volume,0);
 h.audio.events([{kind:'step',at:3}],0);assert(h.player('forest-air.mp3').volume>0);
});
test('prepared contact variants have separate signals, soft edges and bounded peaks',()=>{
 const hashes=new Set();const crypto=require('node:crypto');
 for(let i=1;i<=4;i++){
  const b=fs.readFileSync(path.join(__dirname,`../assets/audio/expedition/paw-${i}.wav`));
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),24000);
  let peak=0;for(let j=44;j<b.length;j+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(j)));
  assert(peak>10000&&peak<16000);assert(Math.abs(b.readInt16LE(44))<10);assert(Math.abs(b.readInt16LE(b.length-2))<10);
  hashes.add(crypto.createHash('sha256').update(b).digest('hex'));
 }
 assert.equal(hashes.size,4);
});
