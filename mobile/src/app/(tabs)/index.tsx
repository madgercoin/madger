import { useEffect, useState } from 'react';
import { ImageBackground, Linking, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ActionButton, BrandHeader, Card, Pill, Screen, SectionTitle, textStyles } from '@/components/ui';
import { COLORS, LINKS } from '@/constants/brand';
import { checkInDig, dayKey, readDig, type DigState } from '@/lib/dailyDig';

export default function HomeScreen() {
  const [dig, setDig] = useState<DigState>({ lastDate: '', streak: 0 });
  useEffect(() => { readDig().then(setDig); }, []);
  const checked = dig.lastDate === dayKey();

  async function dailyDig() {
    const next = await checkInDig(); setDig(next);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return <Screen>
    <BrandHeader eyebrow="Original By Design. Relentless by Nature." title="MADGER" subtitle="Dig past the noise. Verify everything." />
    <ImageBackground source={require('../../../assets/images/madger-hero.webp')} imageStyle={styles.heroImage} style={styles.hero}>
      <View style={styles.heroShade} />
      <View style={styles.heroCopy}>
        <Pill tone="gold">TRADING LIVE • SOLANA</Pill>
        <Text style={styles.heroTitle}>Buy $MADGER your way.</Text>
        <Text style={textStyles.body}>Already use Solana? Open the verified Raydium swap. First crypto purchase? Follow the complete guide before you buy.</Text>
        <ActionButton label="Buy $MADGER on Raydium" icon="open-in-new" onPress={() => Linking.openURL(LINKS.raydiumSwap)} />
        <ActionButton label="New to Crypto? Start Here" icon="school" onPress={() => Linking.openURL(LINKS.buyGuide)} />
      </View>
    </ImageBackground>
    <Card>
      <SectionTitle>Daily Dig</SectionTitle>
      <Text style={textStyles.body}>A private, on-device community streak. No wallet connection, no tracking, no purchase.</Text>
      <View style={styles.streakRow}><Text style={styles.streak}>{dig.streak}</Text><Text style={styles.streakLabel}>day streak</Text></View>
      <ActionButton label={checked ? 'Checked in today' : 'Dig in for today'} icon={checked ? 'check-circle' : 'shovel'} onPress={dailyDig} secondary={checked} />
    </Card>
    <Card><SectionTitle>Official home</SectionTitle><Text style={textStyles.body}>News, the litepaper, safety notes, and every official link live at madgercoin.com.</Text><ActionButton label="Open madgercoin.com" icon="open-in-new" onPress={() => Linking.openURL(LINKS.website)} secondary /></Card>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { minHeight: 430, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1, borderColor: 'rgba(255,201,40,0.3)' }, heroImage: { borderRadius: 28 }, heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.38)' }, heroCopy: { padding: 20, gap: 14, backgroundColor: 'rgba(3,5,0,0.60)' }, heroTitle: { color: COLORS.cream, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1 },
  streakRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 }, streak: { color: COLORS.gold, fontSize: 44, fontWeight: '900' }, streakLabel: { color: COLORS.cream, fontSize: 16, fontWeight: '800' },
});
