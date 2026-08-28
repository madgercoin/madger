import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ActionButton, BrandHeader, Card, ListRow, Pill, Screen, SectionTitle, textStyles } from '@/components/ui';
import { COLORS, MINT } from '@/constants/brand';

export default function VerifyScreen() {
  const [copied, setCopied] = useState(false);
  async function copyMint() { await Clipboard.setStringAsync(MINT); setCopied(true); await Haptics.selectionAsync(); setTimeout(() => setCopied(false), 1800); }
  return <Screen>
    <BrandHeader eyebrow="Trust, then verify" title="Official Mint" subtitle="Keep the exact address close. Reject lookalikes." />
    <Card style={styles.mintCard}><Pill tone="gold">SOLANA</Pill><Text selectable style={styles.mint}>{MINT}</Text><View style={styles.actions}><ActionButton label={copied ? 'Copied' : 'Copy address'} icon={copied ? 'check' : 'content-copy'} onPress={copyMint} /><ActionButton label="Share" icon="share-variant" onPress={() => Share.share({ message: `Official MADGER Solana mint:\n${MINT}\n\nVerify at madgercoin.com` })} secondary /></View></Card>
    <SectionTitle>Safety first</SectionTitle>
    <Card><ListRow icon="key-alert" title="Never share a seed phrase" body="MADGER will never ask for your seed phrase or private key." /><ListRow icon="link-variant-off" title="Check every link" body="Start from madgercoin.com and verify the domain before acting." /><ListRow icon="wallet-outline" title="No wallet required here" body="This app does not connect to, custody, or transact from your wallet." /><ListRow icon="alert-circle-outline" title="Crypto carries risk" body="MADGER is community entertainment, not financial advice. Do your own research." /></Card>
    <Card><Text style={textStyles.strong}>Why the app does not trade</Text><Text style={textStyles.body}>Keeping verification separate from transactions reduces confusion and lets you make decisions in the wallet or exchange you already trust.</Text></Card>
  </Screen>;
}

const styles = StyleSheet.create({ mintCard: { borderColor: 'rgba(255,201,40,0.42)' }, mint: { color: COLORS.cream, fontSize: 17, lineHeight: 27, fontWeight: '800', letterSpacing: 0.4 }, actions: { gap: 10 } });
