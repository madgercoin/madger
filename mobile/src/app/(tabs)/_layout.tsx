import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { COLORS } from '@/constants/brand';

const icon = (name: keyof typeof MaterialCommunityIcons.glyphMap) => function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={color as string} />;
};

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: COLORS.gold, tabBarInactiveTintColor: '#7B856F', tabBarStyle: { position: 'absolute', backgroundColor: '#080C05', borderTopColor: COLORS.border, height: 76, paddingTop: 7, paddingBottom: 10 }, tabBarLabelStyle: { fontSize: 10, fontWeight: '800' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-variant') }} />
    <Tabs.Screen name="hunt" options={{ title: 'Hunt', tabBarIcon: icon('map-search') }} />
    <Tabs.Screen name="verify" options={{ title: 'Verify', tabBarIcon: icon('shield-check') }} />
    <Tabs.Screen name="community" options={{ title: 'Burrow', tabBarIcon: icon('account-group') }} />
    <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('dots-horizontal-circle') }} />
  </Tabs>;
}
