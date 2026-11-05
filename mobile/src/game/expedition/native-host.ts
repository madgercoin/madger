import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXPEDITION_KEY } from './profile';
declare global { interface Window { __madgerNativeActive?: boolean; MadgerNative?: {getInitialStorage:()=>string;postMessage:(message:string)=>void}; } }
export function nativeGameHost(){return typeof window!=='undefined'?window.MadgerNative:undefined;}
let migrated=false;
export function installNativeGameStorage(){
 const host=nativeGameHost();if(!host||migrated)return;
 const initial=JSON.parse(host.getInitialStorage()) as Record<string,unknown>,value=initial[EXPEDITION_KEY];
 if(typeof value==='string'&&localStorage.getItem(EXPEDITION_KEY)===null){JSON.parse(value);localStorage.setItem(EXPEDITION_KEY,value);}
 migrated=true;
}
export const expeditionStorage={getItem:(key:string)=>AsyncStorage.getItem(key),async setItem(key:string,value:string){await AsyncStorage.setItem(key,value);if(key===EXPEDITION_KEY)nativeGameHost()?.postMessage(JSON.stringify({type:'storage',key,value}));}};
