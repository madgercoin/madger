import { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EXPEDITION_KEY } from '@/game/expedition/profile';
const OfflineGame=requireNativeViewManager('MadgerOfflineGame');
export default function AndroidExpedition(){
 const router=useRouter(),insets=useSafeAreaInsets();
 const [initialStorage,setInitialStorage]=useState<string|null>(null),[active,setActive]=useState(AppState.currentState==='active'),[error,setError]=useState(''),[backRequest,setBackRequest]=useState(0);
 const pending=useRef(Promise.resolve()),backupFailed=useRef(false),hasError=useRef(false);
 useEffect(()=>{hasError.current=!!error;},[error]);
 useEffect(()=>{
  let mounted=true;
  AsyncStorage.getItem(EXPEDITION_KEY).then(value=>{if(mounted)setInitialStorage(JSON.stringify({[EXPEDITION_KEY]:value}));}).catch(()=>{if(mounted)setError('Your saved Expedition could not be loaded. Close and retry; no records have been changed.');});
  const subscription=AppState.addEventListener('change',state=>setActive(state==='active'));
  const back=BackHandler.addEventListener('hardwareBackPress',()=>{if(hasError.current)return false;setBackRequest(value=>value+1);return true;});
  return()=>{mounted=false;subscription.remove();back.remove();};
 },[]);
 const message=({nativeEvent}:{nativeEvent:{message:string}})=>{
  try{const payload=JSON.parse(nativeEvent.message);
   if(payload.type==='exit'){void pending.current.then(()=>{if(!backupFailed.current)router.replace('/legacy');});return;}
   if(payload.type==='storage'&&payload.key===EXPEDITION_KEY&&typeof payload.value==='string'){
    JSON.parse(payload.value);pending.current=pending.current.then(()=>AsyncStorage.setItem(EXPEDITION_KEY,payload.value)).catch(()=>{backupFailed.current=true;setError('The Expedition is saved in its local game storage, but the native backup could not be updated. Restart before continuing.');});
   }
  }catch{setError('The offline game sent an invalid local save. Close and retry; your previous save is retained.');}
 };
 if(error)return <View style={styles.message}><Text style={styles.text}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Return to classic games" onPress={()=>router.replace('/legacy')}><Text style={[styles.text,{paddingTop:24}]}>Return to classic games</Text></Pressable></View>;
 if(initialStorage===null)return <View style={styles.message}><Text style={styles.text}>Opening the 3D Expedition…</Text></View>;
 return <View style={{flex:1,backgroundColor:'#071813',paddingTop:insets.top,paddingBottom:insets.bottom}}><OfflineGame style={{flex:1}} active={active} backRequest={backRequest} initialStorage={initialStorage} onMessage={message} onError={({nativeEvent}:{nativeEvent:{message:string}})=>setError(nativeEvent.message)}/></View>;
}
const styles=StyleSheet.create({message:{flex:1,backgroundColor:'#071813',justifyContent:'center',padding:24},text:{color:'#F9EED6',fontSize:18}});
