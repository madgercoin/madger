/* Spend the GPU budget on readable near-field pixels first. Reduce distant
 * dressing before lowering clarity; UI, collision geometry and physics never
 * participate in quality adaptation. */
export const MIN_SCENE_SCALE = .72;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function framePressure(samples){
 if(!Array.isArray(samples))return null;
 const valid=samples.filter(n=>Number.isFinite(n)&&n>0&&n<1800).sort((a,b)=>a-b);
 return valid.length>=3?valid[Math.floor((valid.length-1)*.75)]:null;
}
export function adjustedSceneScale(scale,samples){
 if(!Number.isFinite(scale)||scale<MIN_SCENE_SCALE||scale>1)return scale;
 const ms=framePressure(samples);
 if(ms>95)return Math.max(MIN_SCENE_SCALE,Math.round(scale*.88*100)/100);
 if(ms>48)return Math.min(scale,Math.max(.82,Math.round(scale*.94*100)/100));
 return scale;
}
export function adaptSceneBudget(state,samples){
 const ms=framePressure(samples);
 if(ms===null)return state;
 const next={...state};
 if(ms>42){
   next.fastFrames=0;
   if(next.scenery>0)next.scenery--;
   else next.scale=adjustedSceneScale(next.scale,samples);
 }else if(ms<23){
   next.fastFrames=(next.fastFrames||0)+samples.length;
   if(next.fastFrames>=150){
     next.fastFrames=0;
     if(next.scale<1)next.scale=Math.min(1,Math.round((next.scale+.04)*100)/100);
     else if(next.scenery<2)next.scenery++;
   }
 }else next.fastFrames=0;
 return next;
}
export function sceneBufferSize(width,height,deviceRatio=1,scale=1){
 const w=Math.max(2,Number.isFinite(width)?width:2),h=Math.max(2,Number.isFinite(height)?height:2);
 // High-density phones get more than one physical pixel per CSS pixel, while
 // a hard fill cap prevents 3x/4x screens from silently quadrupling PBR cost.
 const ratio=clamp(Number.isFinite(deviceRatio)?deviceRatio:1,1,1.5);
 const density=Math.min(ratio,Math.sqrt(1050000/(w*h)))*clamp(scale,MIN_SCENE_SCALE,1);
 return {width:Math.max(2,Math.round(w*density)),height:Math.max(2,Math.round(h*density))};
}
