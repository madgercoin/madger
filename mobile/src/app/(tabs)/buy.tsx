import { Linking, StyleSheet, Text } from 'react-native';
import { ActionButton, BrandHeader, Card, ListRow, Pill, Screen, SectionTitle, textStyles } from '@/components/ui';
import { COLORS, LINKS, MINT } from '@/constants/brand';

export default function BuyScreen() {
  return <Screen>
    <BrandHeader eyebrow="Official purchase path" title="Buy $MADGER" subtitle="Choose the path that matches your experience." />
    <Card style={styles.actionCard}>
      <Pill tone="gold">TRADING LIVE • RAYDIUM</Pill>
      <SectionTitle>Ready to swap?</SectionTitle>
      <Text style={textStyles.body}>If you already have SOL in a compatible wallet, open the official SOL-to-MADGER route and verify the complete mint before approving anything.</Text>
      <ActionButton label="Buy $MADGER on Raydium" icon="open-in-new" onPress={() => Linking.openURL(LINKS.raydiumSwap)} />
      <ActionButton label="New to Crypto? Start Here" icon="school" onPress={() => Linking.openURL(LINKS.buyGuide)} />
    </Card>
    <Card>
      <SectionTitle>First crypto purchase?</SectionTitle>
      <ListRow icon="wallet-outline" title="1. Set up a Solana wallet" body="Use only the wallet provider's official site or verified app-store listing. Never share your recovery phrase." />
      <ListRow icon="currency-usd" title="2. Get SOL" body="You need SOL for the purchase and a small network fee. Availability depends on your provider and location." />
      <ListRow icon="shield-search" title="3. Verify MADGER" body={`Compare the complete mint before you connect or approve: ${MINT}`} />
      <ListRow icon="swap-horizontal" title="4. Review the swap" body="Confirm SOL is the input, MADGER is the output, and review price impact and the minimum received before signing." />
      <ActionButton label="Open the Step-by-Step Guide" icon="book-open-variant" onPress={() => Linking.openURL(LINKS.buyGuide)} />
    </Card>
    <Card style={styles.riskCard}>
      <SectionTitle>Know the risk</SectionTitle>
      <Text style={textStyles.body}>MADGER is speculative. Liquidity and price can change quickly, and you could lose the full amount you spend. The app never asks for a seed phrase, connects to your wallet, or executes a transaction.</Text>
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  actionCard: { borderColor: 'rgba(255,201,40,0.55)', backgroundColor: 'rgba(18,14,3,0.97)' },
  riskCard: { borderColor: COLORS.danger },
});
