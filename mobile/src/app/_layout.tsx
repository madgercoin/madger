import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/brand';

export default function RootLayout() {
  return <SafeAreaProvider><StatusBar style="light" /><Stack screenOptions={{ contentStyle: { backgroundColor: COLORS.background }, headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.cream, headerShadowVisible: false }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="watch" options={{ title: 'Launch Film', presentation: 'modal' }} /></Stack></SafeAreaProvider>;
}
