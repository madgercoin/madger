import { useCallback, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActionButton, BrandHeader, Card, Pill, Screen, SectionTitle, textStyles } from '@/components/ui';
import { COLORS, LINKS } from '@/constants/brand';
import { checkInDig, dayKey, readDig, visibleStreak, type DigState } from '@/lib/dailyDig';

export default function HomeScreen() {
  const router = useRouter();
  const [dig, setDig] = useState<DigState>({ lastDate: '', streak: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [today, setToday] = useState(dayKey);
  useFocusEffect(useCallback(() => {
    let active = true;
    async function refresh() {
      try { const saved = await readDig(); if (active) { setDig(saved); setLoadError(false); } }
      catch { if (active) setLoadError(true); }
      finally { if (active) { setLoading(false); setToday(dayKey()); } }
    }
    void refresh();
    const timer = setInterval(() => setToday(dayKey()), 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, []));
  const checked = dig.lastDate === today;

  async function dailyDig() {
    const next = await checkInDig(); setDig(next); setLoadError(false); setToday(dayKey());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  return <Screen>
    <BrandHeader eyebrow="Original By Design. Relentless by Nature." title="MADGER" subtitle="Dig past the noise. Verify everything." />
    <View style={styles.hero}>
      <Image source={require('../../../assets/images/madger-hero.webp')} contentFit="cover" contentPosition="right center" accessibilityLabel="MADGER honey badger mascot" style={styles.heroImage} />
      <View style={styles.heroCopy}>
        <Pill tone="gold">TRADING LIVE • SOLANA</Pill>
        <Text style={styles.heroTitle}>Buy $MADGER your way.</Text>
        <Text style={textStyles.body}>Already use Solana? Open the verified Raydium swap. First crypto purchase? Follow the complete guide before you buy.</Text>
        <ActionButton label="Buy $MADGER on Raydium" icon="open-in-new" onPress={() => Linking.openURL(LINKS.raydiumSwap)} />
        <ActionButton label="New to Crypto? Start Here" icon="school" onPress={() => Linking.openURL(LINKS.buyGuide)} secondary />
      </View>
    </View>
    <Card>
      <SectionTitle>Daily Dig</SectionTitle>
      <Text style={textStyles.body}>A private, on-device community streak. No wallet connection, no tracking, no purchase.</Text>
      <View accessibilityLiveRegion="polite" style={styles.streakRow}><Text style={styles.streak}>{loading || loadError ? '—' : visibleStreak(dig)}</Text><Text style={styles.streakLabel}>day streak</Text></View>
      <Text accessibilityLiveRegion="polite" style={textStyles.body}>{loadError ? 'Your saved streak could not be loaded. Try checking in again.' : checked ? 'You’re checked in. Your next dig opens at midnight UTC.' : 'Check in once a day. Each new day starts at midnight UTC.'}</Text>
      <ActionButton label={loading ? 'Loading your streak…' : checked ? 'Checked in today' : 'Dig in for today'} icon={checked ? 'check-circle' : 'shovel'} onPress={dailyDig} disabled={loading || (checked && !loadError)} secondary={checked} errorMessage="Your check-in could not be saved on this device. Please try again." />
    </Card>
    <Card><Pill tone="gold">NATIVE GAME • NO WALLET</Pill><SectionTitle>Burrow Run</SectionTitle><Text style={textStyles.body}>Find the signal, dodge the noise, clear a daily field mark, and keep a private record on this device.</Text><ActionButton label="Play Burrow Run" icon="gamepad-variant" onPress={() => router.push('/play')} /></Card>
    <Card><SectionTitle>Official home</SectionTitle><Text style={textStyles.body}>News, the litepaper, safety notes, and every official link live at madgercoin.com.</Text><ActionButton label="Open madgercoin.com" icon="open-in-new" onPress={() => Linking.openURL(LINKS.website)} secondary /><ActionButton label="View verified Blockspot profile" icon="shield-check" onPress={() => Linking.openURL(LINKS.blockspot)} secondary /></Card>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,201,40,0.3)' }, heroImage: { width: '100%', height: 190 }, heroCopy: { padding: 20, gap: 14, backgroundColor: COLORS.surface }, heroTitle: { color: COLORS.cream, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1 },
  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 }, streak: { color: COLORS.gold, fontSize: 44, fontWeight: '900' }, streakLabel: { color: COLORS.cream, fontSize: 16, fontWeight: '800' },
});
