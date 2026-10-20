import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/brand';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GameProfileProvider } from '@/components/game-profile';

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function RootLayout() {
  // Native navigation and font/media state are client-owned. A stable web boot
  // screen prevents cached fonts and local records from disagreeing with export HTML.
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  const [iconsReady,setIconsReady]=useState(Platform.OS!=='web'),[fontFailed,setFontFailed]=useState(false),[fontAttempt,setFontAttempt]=useState(0);
  useEffect(()=>{
    if(Platform.OS!=='web')return;
    let mounted=true;
    const iconSource=MaterialCommunityIcons.font['material-community'];
    // Icon fonts contain private-use glyphs, not the FontObserver Latin probe.
    // Load with a real paw glyph before any icon component starts its own load.
    void Font.loadAsync('material-community',{
      uri:typeof iconSource==='number'?Asset.fromModule(iconSource).uri:iconSource,
      testString:String.fromCodePoint(MaterialCommunityIcons.glyphMap.paw as number),
    }).then(()=>{if(mounted)setIconsReady(true);}).catch(()=>{if(mounted)setFontFailed(true);});
    return()=>{mounted=false;};
  },[fontAttempt]);
  if (Platform.OS === 'web' && (!hydrated||!iconsReady)) return <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 16 }} accessibilityLiveRegion="polite"><Image accessible={false} source={require('../../assets/images/madger-logo-transparent.png')} style={{ width: 84, height: 84 }} /><Text style={{ color: COLORS.cream, fontSize: 15, fontWeight: '800' }}>{fontFailed?'The interface could not load. Please retry.':'Entering the Burrow…'}</Text>{fontFailed?<Text accessibilityRole="button" onPress={()=>{setFontFailed(false);setFontAttempt(n=>n+1);}} style={{color:COLORS.cream,padding:16}}>Retry loading</Text>:null}</View>;
  return <SafeAreaProvider><GameProfileProvider><StatusBar style="light" /><Stack screenOptions={{ contentStyle: { backgroundColor: COLORS.background }, headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.cream, headerShadowVisible: false }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="expedition" options={{ headerShown: false, gestureEnabled: false }} /></Stack></GameProfileProvider></SafeAreaProvider>;
}
