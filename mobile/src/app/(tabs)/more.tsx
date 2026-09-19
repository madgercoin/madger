import { Image, Linking, StyleSheet, Text } from 'react-native';
import { ActionButton, BrandHeader, Card, ListRow, Screen, SectionTitle } from '@/components/ui';
import { COLORS, LINKS } from '@/constants/brand';
import { useRouter } from 'expo-router';

export default function MoreScreen() {
  const router = useRouter();
  return <Screen>
    <BrandHeader eyebrow="Official MADGER" title="Explore More" subtitle="The story, the records, and the fine print." />
    <Card><SectionTitle>The Burrow</SectionTitle><ActionButton label="Community & official channels" icon="account-group" onPress={() => router.push('/community')} /></Card>
    <Card><SectionTitle>Read & verify</SectionTitle><ActionButton label="How to buy $MADGER" icon="school" onPress={() => Linking.openURL(LINKS.buyGuide)} /><ActionButton label="Read the litepaper" icon="book-open-page-variant" onPress={() => Linking.openURL(LINKS.litepaper)} secondary /><ActionButton label="Verified on Blockspot" icon="shield-check" onPress={() => Linking.openURL(LINKS.blockspot)} secondary /><ActionButton label="Visit the website" icon="web" onPress={() => Linking.openURL(LINKS.website)} secondary /></Card>
    <Card><SectionTitle>About this app</SectionTitle><ListRow icon="cellphone-check" title="Native companion" body="Designed for Android and iPhone with app-native navigation, video, sharing, and local utility." /><ListRow icon="database-lock" title="Private by design" body="The Daily Dig stays on your device. No account or wallet is required." /><ListRow icon="cash-remove" title="No trading or custody" body="The app does not sell tokens, execute transactions, or hold assets." /><ActionButton label="Privacy policy" icon="shield-lock" onPress={() => Linking.openURL(LINKS.privacy)} secondary /></Card>
    <Image source={require('../../../assets/images/madger-logo-transparent.png')} style={styles.logo} />
    <Text style={styles.footer}>MADGER v1.1.0{`\n`}Dig past the noise.</Text>
  </Screen>;
}

const styles = StyleSheet.create({ logo: { width: 150, height: 150, resizeMode: 'contain', alignSelf: 'center', marginTop: 10 }, footer: { color: COLORS.muted, textAlign: 'center', lineHeight: 21, fontWeight: '700' } });
