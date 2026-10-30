import { Text } from 'react-native';
import { BrandHeader, Card, ListRow, Screen, textStyles } from '@/components/ui';

export default function VerifyScreen() {
  return <Screen>
    <BrandHeader eyebrow="Play safely" title="Official MADGER game" subtitle="Keep your game and personal information safe." />
    <Card><ListRow icon="shield-check" title="No account needed" body="Play without signing in. Your game progress stays on this device." /><ListRow icon="key-alert" title="Keep secrets private" body="This game never requests passwords, payment details, recovery phrases, or private keys." /><ListRow icon="email-outline" title="Contact the team" body="For game support, contact madgercoin@gmail.com." /></Card>
    <Card><Text style={textStyles.body}>Game coins and relics are earned through play. They have no cash value and cannot be purchased, traded, or withdrawn.</Text></Card>
  </Screen>;
}
