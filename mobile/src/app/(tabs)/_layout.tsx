import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/brand';

const icon = (name: keyof typeof MaterialCommunityIcons.glyphMap) => function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
  return <MaterialCommunityIcons accessible={false} name={name} size={size} color={color as string} />;
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const bottom = Math.max(insets.bottom, 10);
  return <Tabs backBehavior="history" screenOptions={{ headerShown: false, tabBarActiveTintColor: COLORS.gold, tabBarInactiveTintColor: COLORS.muted, tabBarLabelPosition: 'below-icon', tabBarStyle: { backgroundColor: '#080C05', borderTopColor: COLORS.border, height: 60 + bottom + Math.max(0, fontScale - 1) * 16, paddingTop: 7, paddingBottom: bottom }, tabBarLabelStyle: { fontSize: 11, fontWeight: '800' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home', tabBarIcon: icon('home-variant') }} />
    <Tabs.Screen name="play" options={{ title: 'Play', tabBarAccessibilityLabel: 'Play', tabBarIcon: icon('gamepad-variant') }} />
    <Tabs.Screen name="scores" options={{ title: 'Scores', tabBarAccessibilityLabel: 'Scores', tabBarIcon: icon('podium') }} />
    <Tabs.Screen name="buy" options={{ title: 'Buy', href: null }} />
    <Tabs.Screen name="verify" options={{ title: 'Verify', href: null }} />
    <Tabs.Screen name="community" options={{ title: 'Burrow', href: null }} />
    <Tabs.Screen name="more" options={{ title: 'Settings', tabBarAccessibilityLabel: 'Settings', tabBarIcon: icon('cog-outline') }} />
  </Tabs>;
}
