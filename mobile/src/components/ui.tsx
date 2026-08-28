import type { PropsWithChildren, ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/brand';

export function Screen({ children }: PropsWithChildren) {
  return <LinearGradient colors={[COLORS.background, '#101A05', COLORS.background]} style={styles.flex}><SafeAreaView style={styles.flex} edges={['top']}><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>{children}</ScrollView></SafeAreaView></LinearGradient>;
}

export function BrandHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return <View style={styles.header}><Image source={require('../../assets/images/madger-logo-transparent.png')} style={styles.logo} /><View style={styles.headerCopy}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View></View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) { return <View style={[styles.card, style]}>{children}</View>; }

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: ReactNode }>) { return <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{children}</Text>{action}</View>; }

export function ActionButton({ label, icon, onPress, secondary = false }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; onPress: () => void; secondary?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, pressed && styles.pressed]}><MaterialCommunityIcons name={icon} size={20} color={secondary ? COLORS.cream : COLORS.background} /><Text style={[styles.buttonLabel, secondary && styles.buttonLabelSecondary]}>{label}</Text></Pressable>;
}

export function Pill({ children, tone = 'lime' }: PropsWithChildren<{ tone?: 'lime' | 'gold' }>) { return <Text style={[styles.pill, tone === 'gold' && styles.pillGold]}>{children}</Text>; }

export function ListRow({ icon, title, body }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; body: string }) {
  return <View style={styles.listRow}><View style={styles.iconDisc}><MaterialCommunityIcons name={icon} size={21} color={COLORS.gold} /></View><View style={styles.listCopy}><Text style={styles.listTitle}>{title}</Text><Text style={styles.listBody}>{body}</Text></View></View>;
}

export const textStyles = StyleSheet.create({ body: { color: COLORS.muted, fontSize: 15, lineHeight: 23 }, strong: { color: COLORS.cream, fontSize: 16, fontWeight: '800' }, gold: { color: COLORS.gold }, lime: { color: COLORS.lime } });

const styles = StyleSheet.create({
  flex: { flex: 1 }, scroll: { padding: 20, paddingBottom: 118, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4 }, logo: { width: 68, height: 68, resizeMode: 'contain' }, headerCopy: { flex: 1 },
  eyebrow: { color: COLORS.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase' }, title: { color: COLORS.cream, fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: -0.8 }, subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 3 },
  card: { backgroundColor: 'rgba(11,16,6,0.94)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 18, gap: 12, overflow: 'hidden' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: COLORS.cream, fontSize: 21, fontWeight: '900', letterSpacing: -0.35 },
  button: { minHeight: 51, borderRadius: 15, paddingHorizontal: 17, backgroundColor: COLORS.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, buttonSecondary: { backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.border }, buttonLabel: { color: COLORS.background, fontSize: 15, fontWeight: '900' }, buttonLabelSecondary: { color: COLORS.cream }, pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  pill: { alignSelf: 'flex-start', backgroundColor: 'rgba(157,255,0,0.12)', borderColor: 'rgba(157,255,0,0.35)', borderWidth: 1, color: COLORS.lime, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, overflow: 'hidden' }, pillGold: { backgroundColor: 'rgba(255,201,40,0.12)', borderColor: 'rgba(255,201,40,0.35)', color: COLORS.gold },
  listRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, iconDisc: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,201,40,0.10)' }, listCopy: { flex: 1 }, listTitle: { color: COLORS.cream, fontSize: 15, fontWeight: '800', marginBottom: 3 }, listBody: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
});
