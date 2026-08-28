import { Image, Linking, StyleSheet, Text } from 'react-native';
import { ActionButton, BrandHeader, Card, ListRow, Screen, SectionTitle, textStyles } from '@/components/ui';
import { COLORS, LINKS } from '@/constants/brand';

export default function CommunityScreen() {
  return <Screen>
    <BrandHeader eyebrow="Welcome underground" title="The Burrow" subtitle="Official channels. One unmistakable community." />
    <Image source={require('../../../assets/images/madger-community.webp')} style={styles.madger} />
    <Card><SectionTitle>Join the conversation</SectionTitle><Text style={textStyles.body}>Get announcements, meet the community, and follow MADGER in the places the team actually uses.</Text><ActionButton label="Community Telegram" icon="send-circle" onPress={() => Linking.openURL(LINKS.telegramCommunity)} /><ActionButton label="Announcement channel" icon="bullhorn" onPress={() => Linking.openURL(LINKS.telegramNews)} secondary /><ActionButton label="Follow @madgercoin" icon="alpha-x-circle" onPress={() => Linking.openURL(LINKS.x)} secondary /></Card>
    <Card><ListRow icon="shield-account" title="Official links only" body="Use this directory or madgercoin.com to avoid impersonators." /><ListRow icon="account-heart" title="Respect the Burrow" body="Keep the community sharp, useful, and welcoming." /><ListRow icon="email-outline" title="Contact the team" body="madgercoin@gmail.com" /><ActionButton label="Email MADGER" icon="email-fast" onPress={() => Linking.openURL(LINKS.email)} secondary /></Card>
  </Screen>;
}

const styles = StyleSheet.create({ madger: { width: '100%', height: 390, resizeMode: 'cover', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(157,255,0,0.28)', backgroundColor: COLORS.surface } });
