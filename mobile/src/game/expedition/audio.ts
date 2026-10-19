import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { GameEvent } from './core';
const SOURCES={
  snow:require('../../../assets/audio/expedition/snow-bark.wav'),
  gorilla:require('../../../assets/audio/expedition/gorilla-guard.wav'),
  bot:require('../../../assets/audio/expedition/bot-hack.wav'),
  step:require('../../../assets/audio/expedition/step.wav'),
  metal:require('../../../assets/audio/expedition/metal-step.wav'),
  jump:require('../../../assets/audio/expedition/jump.wav'),
  land:require('../../../assets/audio/expedition/land.wav'),
  slide:require('../../../assets/audio/expedition/slide.wav'),
  coin:require('../../../assets/audio/expedition/pickup.wav'),
  gem:require('../../../assets/audio/expedition/relic.wav'),
  shield:require('../../../assets/audio/expedition/shield.wav'),
  power:require('../../../assets/audio/expedition/power.wav'),
  secret:require('../../../assets/audio/expedition/secret.wav'),
  burst:require('../../../assets/audio/expedition/burst.wav'),
  splash:require('../../../assets/audio/expedition/splash.wav'),
  finish:require('../../../assets/audio/expedition/finish.wav'),
  happy:require('../../../assets/audio/expedition/happy.mp3'),
  hurt:require('../../../assets/audio/expedition/hurt.mp3'),
  ambience:require('../../../assets/audio/expedition/ambience.wav'),
  music:require('../../../assets/audio/expedition/music.mp3'),
} as const;
type Cue=keyof typeof SOURCES;
/** Audio is an optional observer; a missing device route can never stop physics.
 * Global and per-cue tokens cancel delayed seeks after stops or priority pauses.
 */
export function createExpeditionAudio(){
  let enabled=true,musicEnabled=true,active=false,disposed=false,generation=0,lastVoice=-100,lastAlly=-100;
  const players=new Map<Cue,ReturnType<typeof createAudioPlayer>>(),lastPlayed=new Map<Cue,number>();
  const cueGeneration=new Map<Cue,number>();
  for(const [key,source] of Object.entries(SOURCES)){
    try{const p=createAudioPlayer(source,{updateInterval:1000});p.volume=0;players.set(key as Cue,p);}catch{/* Optional audio stays unavailable without affecting play. */}
  }
  for(const key of ['ambience','music'] as Cue[]){const p=players.get(key);if(p)p.loop=true;}
  void setAudioModeAsync({playsInSilentMode:false,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'}).catch(()=>{});
  const safePause=(key:Cue)=>{cueGeneration.set(key,(cueGeneration.get(key)??0)+1);try{players.get(key)?.pause();}catch{}};
  const stop=()=>{generation++;for(const key of players.keys())safePause(key);};
  const beds=()=>{
    if(disposed||!enabled||!active)return;
    try{const p=players.get('ambience');if(p){p.volume=.22;p.play();}}catch{}
    try{const p=players.get('music');if(p){p.volume=musicEnabled?.12:0;if(musicEnabled)p.play();else p.pause();}}catch{}
  };
  function cue(key:Cue,time:number,volume:number,cooldown=.10){
    if(!enabled||!active||disposed)return;
    if(time-(lastPlayed.get(key)??-100)<cooldown)return;
    const p=players.get(key);if(!p)return;lastPlayed.set(key,time);const token=generation;
    const cueToken=(cueGeneration.get(key)??0)+1;cueGeneration.set(key,cueToken);
    try{p.volume=volume;void p.seekTo(0).then(()=>{if(!disposed&&enabled&&active&&generation===token&&cueGeneration.get(key)===cueToken)p.play();}).catch(()=>{});}catch{}
  }
  function voice(key:'happy'|'hurt',time:number){
    if(key==='happy'&&time-lastVoice<1.6)return;
    if(key==='hurt'&&time-lastVoice<.50)return;
    lastVoice=time;safePause(key==='happy'?'hurt':'happy');cue(key,time,.50,.55);
  }
  function allyCue(key:'snow'|'gorilla'|'bot',time:number){
    if(key!=='gorilla'&&time-lastAlly<.20)return;
    lastAlly=time;
    if(key==='gorilla'){safePause('snow');safePause('bot');}
    cue(key,time,key==='gorilla'?.35:.30,.55);
  }
  return {
    settings:(sound:boolean,music:boolean)=>{if(disposed)return;const changed=enabled!==sound||musicEnabled!==music;enabled=sound;musicEnabled=music;if(changed){if(!sound)stop();else beds();if(!music)safePause('music');}},
    active:(next:boolean)=>{if(disposed||next===active)return;active=next;if(next)beds();else stop();},
    events:(events:GameEvent[],zone:number)=>{
      for(const e of events){
        if(e.kind==='companion-join'&&e.companion)allyCue(e.companion,e.at);
        if(e.kind==='companion-attack')allyCue('snow',e.at);
        if(e.kind==='companion-guard')allyCue('gorilla',e.at);
        if(e.kind==='companion-boost')allyCue('bot',e.at);
        if(e.kind==='step')cue(zone===1?'metal':'step',e.at,.28,.12);
        if(e.kind==='coin')cue('coin',e.at,.24,.085);
        if(e.kind==='gem')cue('gem',e.at,.27,.14);
        if(e.kind==='jump')cue('jump',e.at,.34,.16);
        if(e.kind==='land')cue('land',e.at,.32,.16);
        if(e.kind==='slide')cue('slide',e.at,.32,.20);
        if(e.kind==='hit'){cue('land',e.at,.42,.15);voice('hurt',e.at);}
        if(e.kind==='block')cue('shield',e.at,.33,.22);
        if(e.kind==='splash')cue('splash',e.at,.31,.25);
        if(e.kind==='burst'){cue('burst',e.at,.36,.30);voice('happy',e.at);}
        if(e.kind==='secret'){cue('secret',e.at,.33,.45);voice('happy',e.at);}
        if(e.kind==='power'||e.kind==='upgrade'||e.kind==='revive'){cue('power',e.at,.30,.30);voice('happy',e.at);}
        if(e.kind==='near')cue('gem',e.at,.18,.32);
        if(e.kind==='win'){cue('finish',e.at,.40,1);voice('happy',e.at);}
        if(e.kind==='lose')voice('hurt',e.at);
      }
    },
    reset:()=>{lastVoice=-100;lastAlly=-100;lastPlayed.clear();stop();if(active)beds();},
    stop,
    dispose:()=>{disposed=true;active=false;stop();for(const p of players.values()){try{p.remove();}catch{}}players.clear();},
  };
}
export type ExpeditionAudio=ReturnType<typeof createExpeditionAudio>;
