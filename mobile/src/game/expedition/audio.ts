import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { GameEvent } from './core';
const SOURCES={
  snow:require('../../../assets/audio/expedition/snow-bark.wav'),
  gorilla:require('../../../assets/audio/expedition/gorilla-guard.wav'),
  bot:require('../../../assets/audio/expedition/bot-hack.wav'),
  step1:require('../../../assets/audio/expedition/paw-1.wav'),
  step2:require('../../../assets/audio/expedition/paw-2.wav'),
  step3:require('../../../assets/audio/expedition/paw-3.wav'),
  step4:require('../../../assets/audio/expedition/paw-4.wav'),
  metal1:require('../../../assets/audio/expedition/stone-1.wav'),
  metal2:require('../../../assets/audio/expedition/stone-2.wav'),
  metal3:require('../../../assets/audio/expedition/stone-3.wav'),
  metal4:require('../../../assets/audio/expedition/stone-4.wav'),
  jump:require('../../../assets/audio/expedition/jump.wav'),
  land:require('../../../assets/audio/expedition/land.wav'),
  slide:require('../../../assets/audio/expedition/slide.wav'),
  coin:require('../../../assets/audio/expedition/pickup.wav'),
  coin2:require('../../../assets/audio/expedition/pickup-2.wav'),
  coin3:require('../../../assets/audio/expedition/pickup-3.wav'),
  coin4:require('../../../assets/audio/expedition/pickup-4.wav'),
  gem:require('../../../assets/audio/expedition/relic.wav'),
  shield:require('../../../assets/audio/expedition/shield.wav'),
  power:require('../../../assets/audio/expedition/power.wav'),
  secret:require('../../../assets/audio/expedition/secret.wav'),
  burst:require('../../../assets/audio/expedition/burst.wav'),
  splash:require('../../../assets/audio/expedition/splash.wav'),
  finish:require('../../../assets/audio/expedition/finish.wav'),
  happy:require('../../../assets/audio/expedition/happy.mp3'),
  hurt:require('../../../assets/audio/expedition/hurt.mp3'),
  ambience:require('../../../assets/audio/expedition/forest-air.mp3'),
  music:require('../../../assets/audio/expedition/music.mp3'),
} as const;
type Cue=keyof typeof SOURCES;
/** Audio is an optional observer; a missing device route can never stop physics.
 * Global and per-cue tokens cancel delayed seeks after stops or priority pauses.
 */
export function createExpeditionAudio(){
  let enabled=true,musicEnabled=true,active=false,disposed=false,generation=0,lastVoice=-100,lastHurt=-100,lastAlly=-100,lastStep=-100,lastPickup=-100,priorityUntil=-100,stepIndex=0,coinIndex=0,currentZone=0;
  const players=new Map<Cue,ReturnType<typeof createAudioPlayer>>(),lastPlayed=new Map<Cue,number>();
  const cueGeneration=new Map<Cue,number>();
  const player=(key:Cue)=>{
    const existing=players.get(key);if(existing)return existing;
    if(disposed)return undefined;
    try{
      const p=createAudioPlayer(SOURCES[key],{updateInterval:1000});p.volume=0;p.loop=key==='ambience'||key==='music';
      // Expo 57's web player drops HTMLMediaElement.play()'s promise. Observe
      // that instance's rejection so a deliberate pause never escapes unhandled.
      if(typeof document!=='undefined'){
        const media=(p as unknown as {media?:HTMLMediaElement}).media;
        if(media){const play=media.play.bind(media);media.play=()=>{const pending=play();void pending.catch(()=>{});return pending;};}
      }
      players.set(key,p);return p;
    }catch{return undefined;}
  };
  // Browser audio elements fetch their sources immediately. Paused recovery and
  // secret rooms need none; instantiate a sound only when play actually needs it.
  // Native retains its established preloading behavior.
  if(typeof document==='undefined')for(const key of Object.keys(SOURCES) as Cue[])player(key);
  void setAudioModeAsync({playsInSilentMode:false,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'}).catch(()=>{});
  const safePause=(key:Cue)=>{cueGeneration.set(key,(cueGeneration.get(key)??0)+1);try{players.get(key)?.pause();}catch{}};
  const stop=()=>{generation++;for(const key of players.keys())safePause(key);};
  const safePlay=(p:ReturnType<typeof createAudioPlayer>)=>{try{void Promise.resolve(p.play()).catch(()=>{});}catch{}};
  const beds=()=>{
    if(disposed||!enabled||!active)return;
    try{const p=player('ambience');if(p){p.volume=currentZone===2?0:.38;safePlay(p);}}catch{}
    try{const p=musicEnabled?player('music'):players.get('music');if(p){p.volume=musicEnabled?.085:0;if(musicEnabled)safePlay(p);else p.pause();}}catch{}
  };
  function cue(key:Cue,time:number,volume:number,cooldown=.10,rate=1){
    if(!enabled||!active||disposed)return;
    if(time-(lastPlayed.get(key)??-100)<cooldown)return;
    const p=player(key);if(!p)return;lastPlayed.set(key,time);const token=generation;
    const cueToken=(cueGeneration.get(key)??0)+1;cueGeneration.set(key,cueToken);
    try{p.volume=volume;p.playbackRate=rate;void p.seekTo(0).then(()=>{if(!disposed&&enabled&&active&&generation===token&&cueGeneration.get(key)===cueToken)safePlay(p);}).catch(()=>{});}catch{}
  }
  function voice(key:'happy'|'hurt',time:number){
    if(key==='happy'&&time-lastVoice<9)return;
    if(key==='hurt'&&time-lastHurt<1.8)return;
    if(key==='hurt')lastHurt=time;
    lastVoice=time;safePause(key==='happy'?'hurt':'happy');cue(key,time,.28,1.8);
  }
  function allyCue(key:'snow'|'gorilla'|'bot',time:number){
    if(key!=='gorilla'&&time-lastAlly<.20)return;
    lastAlly=time;
    if(key==='gorilla'){safePause('snow');safePause('bot');}
    cue(key,time,key==='gorilla'?.24:.20,key==='snow'?3.5:key==='bot'?2.5:1.3);
  }
  return {
    settings:(sound:boolean,music:boolean)=>{if(disposed)return;const changed=enabled!==sound||musicEnabled!==music;enabled=sound;musicEnabled=music;if(changed){if(!sound)stop();else beds();if(!music)safePause('music');}},
    active:(next:boolean,zone=currentZone)=>{if(disposed)return;const changed=currentZone!==zone;currentZone=zone;if(next===active){if(changed&&active)beds();return;}active=next;if(next)beds();else stop();},
    events:(events:GameEvent[],zone:number)=>{
      if(!enabled||!active||disposed)return;
      if(currentZone!==zone){currentZone=zone;beds();}
      const latest=events.reduce((at,e)=>Math.max(at,e.at),-100);
      // Catch-up frames must never replay a backlog of footsteps and coins.
      // Danger wins the mix even if a pickup occurred first in the same frame.
      if(events.some(e=>e.kind==='hit'||e.kind==='companion-guard'||e.kind==='lose')){
        priorityUntil=latest+.65;
        for(const key of ['step1','step2','step3','step4','metal1','metal2','metal3','metal4','coin','coin2','coin3','coin4'] as Cue[])safePause(key);
      }
      for(const e of events){
        const routine=e.kind==='step'||e.kind==='coin'||e.kind==='gem';
        if(routine&&(e.at<latest-.12||e.at<priorityUntil))continue;
        if(e.kind==='companion-join'&&e.companion)allyCue(e.companion,e.at);
        if(e.kind==='companion-attack')allyCue('snow',e.at);
        if(e.kind==='companion-guard')allyCue('gorilla',e.at);
        if(e.kind==='companion-boost')allyCue('bot',e.at);
        if(e.kind==='step'&&e.at-lastStep>=.24){
          lastStep=e.at;const order=[1,3,2,4,2,1,4,3],index=stepIndex++;
          const key=((zone!==0?'metal':'step')+order[index%order.length]) as Cue;
          cue(key,e.at,.12+(index%3)*.013,.20,.96+(index%5)*.02);
        }
        if(e.kind==='coin'&&e.at-lastPickup>=.38){
          lastPickup=e.at;const notes: Cue[]=['coin','coin3','coin2','coin4'];cue(notes[coinIndex++%notes.length],e.at,.16,.30);
        }
        if(e.kind==='gem'&&e.at-lastPickup>=.38){lastPickup=e.at;cue('gem',e.at,.18,.65);}
        if(e.kind==='hero-shard')cue('power',e.at,.24,1.2);
        if(e.kind==='fork')cue('secret',e.at,.32,.30);
        if(e.kind==='jump')cue('jump',e.at,.22,.30);
        if(e.kind==='land')cue('land',e.at,.23,.30);
        if(e.kind==='slide')cue('slide',e.at,.20,.50);
        if(e.kind==='hit'){cue('land',e.at,.35,.45);voice('hurt',e.at);}
        if(e.kind==='block')cue('shield',e.at,.33,.22);
        if(e.kind==='splash')cue('splash',e.at,.31,.25);
        if(e.kind==='burst')cue('burst',e.at,.24,1.5);
        if(e.kind==='secret'){cue('secret',e.at,.33,.45);voice('happy',e.at);}
        if(e.kind==='power'||e.kind==='upgrade'||e.kind==='revive'){cue('power',e.at,.24,1.2);if(e.kind==='revive')voice('happy',e.at);}
        // Near misses already have a visual cue; routine play needs breathing room.
        if(e.kind==='win'){cue('finish',e.at,.40,1);voice('happy',e.at);}
        if(e.kind==='lose')voice('hurt',e.at);
      }
    },
    reset:()=>{lastVoice=-100;lastHurt=-100;lastAlly=-100;lastStep=-100;lastPickup=-100;priorityUntil=-100;stepIndex=0;coinIndex=0;currentZone=0;lastPlayed.clear();stop();if(active)beds();},
    stop,
    dispose:()=>{disposed=true;active=false;stop();for(const p of players.values()){try{p.remove();}catch{}}players.clear();},
  };
}
export type ExpeditionAudio=ReturnType<typeof createExpeditionAudio>;
