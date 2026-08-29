import { useEffect, useState } from 'react';
import { ImageBackground, Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ActionButton, BrandHeader, Card, Pill, Screen, SectionTitle, textStyles } from '@/components/ui';
import { COLORS, LINKS } from '@/constants/brand';
import { checkInDig, dayKey, readDig, type DigState } from '@/lib/dailyDig';

export default function HomeScreen() {
  const [dig, setDig] = useState<DigState>({ lastDate: '', streak: 0 });
  const [launchSeconds, setLaunchSeconds] = useState(() => Math.max(0, Math.floor((Date.parse('2026-08-31T14:00:00Z') - Date.now()) / 1000)));
  useEffect(() => { readDig().then(setDig); }, []);
  useEffect(() => {
    const update = () => setLaunchSeconds(Math.max(0, Math.floor((Date.parse('2026-08-31T14:00:00Z') - Date.now()) / 1000)));
    const timer = setInterval(update, 1000); update(); return () => clearInterval(timer);
  }, []);
  const checked = dig.lastDate === dayKey();
  const launchParts = [Math.floor(launchSeconds / 86400), Math.floor(launchSeconds / 3600) % 24, Math.floor(launchSeconds / 60) % 60, launchSeconds % 60];

  async function dailyDig() {
    const next = await checkInDig(); setDig(next);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return <Screen>
    <BrandHeader eyebrow="Original By Design. Relentless by Nature." title="MADGER" subtitle="Dig past the noise. Verify everything." />
    <Card style={styles.countdownCard}>
      <Pill tone="gold">$MADGER LAUNCH COUNTDOWN</Pill>
      <View style={styles.countdownRow}>{launchParts.map((value, index) => <View key={['days', 'hours', 'minutes', 'seconds'][index]} style={styles.countdownCell}><Text style={styles.countdownValue}>{String(value).padStart(2, '0')}</Text><Text style={styles.countdownLabel}>{['DAYS', 'HOURS', 'MIN', 'SEC'][index]}</Text></View>)}</View>
      <ActionButton label="Notify me" icon="bell-ring" onPress={() => Linking.openURL(`${LINKS.website}#launch-notify-form`)} />
    </Card>
    <ImageBackground source={require('../../../assets/images/madger-hero.webp')} imageStyle={styles.heroImage} style={styles.hero}>
      <View style={styles.heroShade} />
      <View style={styles.heroCopy}><Pill>LAUNCH FILM • 1:28</Pill><Text style={styles.heroTitle}>Meet the badger built for the burrow.</Text><ActionButton label="Watch the film" icon="play-circle" onPress={() => router.push('/watch')} /></View>
    </ImageBackground>
    <Card>
      <SectionTitle>Daily Dig</SectionTitle>
      <Text style={textStyles.body}>A private, on-device community streak. No wallet connection, no tracking, no purchase.</Text>
      <View style={styles.streakRow}><Text style={styles.streak}>{dig.streak}</Text><Text style={styles.streakLabel}>day streak</Text></View>
      <ActionButton label={checked ? 'Checked in today' : 'Dig in for today'} icon={checked ? 'check-circle' : 'shovel'} onPress={dailyDig} secondary={checked} />
    </Card>
    <Card style={styles.huntCard}><Pill tone="gold">LIVE • ENDS SEP 1</Pill><SectionTitle>Launch Hunt</SectionTitle><Text style={textStyles.body}>Six winners. $75 prize pool paid in SOL. No purchase necessary.</Text><ActionButton label="Enter the hunt" icon="map-search" onPress={() => router.push('/hunt')} /></Card>
    <Card><SectionTitle>Official home</SectionTitle><Text style={textStyles.body}>News, the litepaper, safety notes, and every official link live at madgercoin.com.</Text><ActionButton label="Open madgercoin.com" icon="open-in-new" onPress={() => Linking.openURL(LINKS.website)} secondary /></Card>
  </Screen>;
}

const styles = StyleSheet.create({
  countdownCard: { borderColor: 'rgba(255,201,40,0.55)', backgroundColor: 'rgba(18,14,3,0.97)' }, countdownRow: { flexDirection: 'row', gap: 7 }, countdownCell: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,201,40,0.26)', backgroundColor: 'rgba(255,201,40,0.08)' }, countdownValue: { color: COLORS.gold, fontSize: 28, lineHeight: 31, fontWeight: '900', fontVariant: ['tabular-nums'] }, countdownLabel: { color: COLORS.cream, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 4 },
  hero: { minHeight: 430, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1, borderColor: 'rgba(255,201,40,0.3)' }, heroImage: { borderRadius: 28 }, heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.38)' }, heroCopy: { padding: 20, gap: 14, backgroundColor: 'rgba(3,5,0,0.60)' }, heroTitle: { color: COLORS.cream, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1 },
  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 }, streak: { color: COLORS.gold, fontSize: 44, fontWeight: '900' }, streakLabel: { color: COLORS.cream, fontSize: 16, fontWeight: '800' }, huntCard: { borderColor: 'rgba(157,255,0,0.30)' },
});
