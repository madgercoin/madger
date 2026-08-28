import { Linking, StyleSheet, Text, View } from 'react-native';
import { ActionButton, BrandHeader, Card, ListRow, Pill, Screen, SectionTitle, textStyles } from '@/components/ui';
import { COLORS, LINKS } from '@/constants/brand';

const prizes = [['1st', '$30'], ['2nd', '$20'], ['3rd', '$10'], ['MADGER pick', '$5'], ['MADGER pick', '$5'], ['MADGER pick', '$5']];

export default function HuntScreen() {
  return <Screen>
    <BrandHeader eyebrow="Active now" title="Launch Hunt" subtitle="$75 in SOL • 6 winners • no purchase necessary" />
    <Card style={styles.live}><Pill>ENDS SEP 1 • 14:00 UTC</Pill><Text style={styles.big}>Find the hidden Burrow Field Mark.</Text><Text style={textStyles.body}>The clue is waiting on the official website. Hunt carefully, record the exact mark, then submit it privately.</Text><ActionButton label="Start on the official site" icon="magnify" onPress={() => Linking.openURL(LINKS.website)} /></Card>
    <SectionTitle>How to enter</SectionTitle>
    <Card><ListRow icon="numeric-1-circle" title="Visit madgercoin.com" body="Start only from the official domain." /><ListRow icon="numeric-2-circle" title="Find the hidden mark" body="Search the site for the Burrow Field Mark." /><ListRow icon="numeric-3-circle" title="Join the Burrow" body="Join the official Telegram community." /><ListRow icon="numeric-4-circle" title="Submit privately" body="Email your exact answer. Never post it publicly." /><ActionButton label="Join Telegram" icon="send-circle" onPress={() => Linking.openURL(LINKS.telegramCommunity)} secondary /><ActionButton label="Submit my entry" icon="email-lock" onPress={() => Linking.openURL(`${LINKS.email}?subject=MADGER%20Launch%20Hunt%20Entry`)} /></Card>
    <SectionTitle>Prize breakdown</SectionTitle>
    <Card>{prizes.map(([place, amount]) => <View key={`${place}-${amount}`} style={styles.prize}><Text style={styles.place}>{place}</Text><Text style={styles.amount}>{amount} in SOL</Text></View>)}</Card>
    <Card><SectionTitle>Bonus entries</SectionTitle><Text style={textStyles.body}>Share on X for +1 entry. Bring one friend who completes a verified entry for +1 entry.</Text><Text style={styles.max}>MAX 3 ENTRIES PER PERSON</Text><ActionButton label="Read complete rules" icon="file-document-check" onPress={() => Linking.openURL(LINKS.hunt)} secondary /></Card>
  </Screen>;
}

const styles = StyleSheet.create({ live: { borderColor: 'rgba(157,255,0,0.42)' }, big: { color: COLORS.cream, fontSize: 28, lineHeight: 32, fontWeight: '900' }, prize: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, paddingVertical: 9 }, place: { color: COLORS.cream, fontWeight: '800' }, amount: { color: COLORS.gold, fontWeight: '900' }, max: { color: COLORS.lime, fontSize: 13, fontWeight: '900', letterSpacing: 1 } });
