import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/brand';
import { useSyncExternalStore } from 'react';
import { Image, Platform, Text, View } from 'react-native';

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function RootLayout() {
  // Native navigation and font/media state are client-owned. A stable web boot
  // screen prevents cached fonts and local records from disagreeing with export HTML.
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
  if (Platform.OS === 'web' && !hydrated) return <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 16 }} accessibilityLiveRegion="polite"><Image accessible={false} source={require('../../assets/images/madger-logo-transparent.png')} style={{ width: 84, height: 84 }} /><Text style={{ color: COLORS.cream, fontSize: 15, fontWeight: '800' }}>Entering the Burrow…</Text></View>;
  return <SafeAreaProvider><StatusBar style="light" /><Stack screenOptions={{ contentStyle: { backgroundColor: COLORS.background }, headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.cream, headerShadowVisible: false }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /></Stack></SafeAreaProvider>;
}
