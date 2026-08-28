import { Image, Linking, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { ActionButton, BrandHeader, Card, ListRow, Screen, SectionTitle } from '@/components/ui';
import { COLORS, LINKS } from '@/constants/brand';

export default function MoreScreen() {
  return <Screen>
    <BrandHeader eyebrow="Official MADGER" title="Explore More" subtitle="The story, the film, and the fine print." />
    <Card><SectionTitle>Watch & read</SectionTitle><ActionButton label="Play launch film" icon="movie-open-play" onPress={() => router.push('/watch')} /><ActionButton label="Read the litepaper" icon="book-open-page-variant" onPress={() => Linking.openURL(LINKS.litepaper)} secondary /><ActionButton label="Visit the website" icon="web" onPress={() => Linking.openURL(LINKS.website)} secondary /></Card>
    <Card><SectionTitle>About this app</SectionTitle><ListRow icon="cellphone-check" title="Native companion" body="Designed for Android and iPhone with app-native navigation, video, sharing, and local utility." /><ListRow icon="database-lock" title="Private by design" body="The Daily Dig stays on your device. No account or wallet is required." /><ListRow icon="cash-remove" title="No trading or custody" body="The app does not sell tokens, execute transactions, or hold assets." /><ActionButton label="Privacy policy" icon="shield-lock" onPress={() => Linking.openURL(LINKS.privacy)} secondary /></Card>
    <Image source={require('../../../assets/images/madger-logo-transparent.png')} style={styles.logo} />
    <Text style={styles.footer}>MADGER v1.0.0{`\n`}Dig past the noise.</Text>
  </Screen>;
}

const styles = StyleSheet.create({ logo: { width: 150, height: 150, resizeMode: 'contain', alignSelf: 'center', marginTop: 10 }, footer: { color: COLORS.muted, textAlign: 'center', lineHeight: 21, fontWeight: '700' } });
