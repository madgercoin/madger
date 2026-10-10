import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActionButton, Card, ListRow, Screen } from "@/components/ui";
import { GameHeader, SaveStatus, gameStyles } from "@/components/game-ui";
import { useGameProfile } from "@/components/game-profile";
import { COLORS, LINKS } from "@/constants/brand";

export default function SettingsScreen() {
  const { profile, ready, saving, activeRun, setPreferences, resetProgress } = useGameProfile();
  const router = useRouter();
  function reset() {
    const message = "This removes saved scores, run history, achievements, and unlocked trails on this device. Sound and accessibility settings are kept.";
    if (Platform.OS === "web") { if (window.confirm(message)) void resetProgress(); return; }
    Alert.alert("Reset game progress?", message, [{ text: "Cancel", style: "cancel" }, { text: "Reset progress", style: "destructive", onPress: () => void resetProgress() }]);
  }
  return <Screen>
    <GameHeader title="Your game" subtitle="Make the Burrow feel right for you." />
    <SaveStatus />
    <Card><Text style={gameStyles.section}>Play your way.</Text>
      <Preference icon="volume-high" label="Sound" detail="Original game effects. Off by default." enabled={profile.preferences.sound} disabled={!ready} onPress={() => setPreferences({ sound: !profile.preferences.sound })} />
      <Preference icon="vibrate" label="Haptics" detail="Feel signals, hits, and lane changes." enabled={profile.preferences.haptics} disabled={!ready} onPress={() => setPreferences({ haptics: !profile.preferences.haptics })} />
      <Preference icon="motion-pause-outline" label="Calm effects" detail="Reduce glow, dust, and character motion. System reduced motion is always respected." enabled={profile.preferences.calm} disabled={!ready} onPress={() => setPreferences({ calm: !profile.preferences.calm })} />
    </Card>
    <Card><Text style={gameStyles.section}>A little fieldcraft.</Text><ListRow icon="gesture-swipe-horizontal" title="Find your line" body="Swipe left or right, or tap the arrows. Follow gold signals and avoid red noise. Three hits end the run." /><ListRow icon="lightning-bolt" title="Keep your streak" body="Every five signals lifts your multiplier, up to ×5. A hit resets the combo. A close dodge earns 50 points." /><ListRow icon="shield-check" title="Grab an advantage" body="A shield covers one hit for eight seconds. A magnet collects gold from every lane for six seconds. Hearts restore grit." /><ListRow icon="flash" title="Dig Burst" body="Collect signals to charge Burst. Tap it for three seconds of double points and protection from noise." /><ListRow icon="calendar-star" title="Learn the daily route" body="Classic is a fresh run every time. Today’s run uses the same route until midnight UTC, with its own high-score board." /><Text style={gameStyles.body}>Keyboard: ← / → to steer, Space for Burst, P or Escape to pause.</Text></Card>
    <Card><Text style={gameStyles.section}>Your saved game.</Text><Text style={gameStyles.body}>High scores, recent runs, achievements, trails, and settings are stored on this device. Closing the app keeps them. Clearing app storage or uninstalling removes them.</Text><ActionButton label="View my scores" icon="podium" secondary onPress={() => router.push("/scores")} />{activeRun ? <Text style={gameStyles.body}>End your current run and bank its score before resetting progress.</Text> : null}<ActionButton label="Reset game progress" icon="delete-outline" secondary onPress={reset} disabled={!ready || saving || activeRun} /></Card>
    <Card><Text style={gameStyles.section}>About MADGER.</Text><Text style={gameStyles.body}>No account or payment is needed to play. Game records stay private on your device.</Text><ActionButton label="Privacy policy" icon="shield-lock" secondary onPress={() => Linking.openURL(LINKS.privacy)} /><ActionButton label="Official MADGER website" icon="web" secondary onPress={() => Linking.openURL(LINKS.website)} /><ActionButton label="Community & official links" icon="account-group" secondary onPress={() => router.push("/community")} /></Card>
    <Text style={styles.footer}>MADGER Burrow Run · v{Constants.expoConfig?.version ?? "1.3.0"}{"\n"}Small badger. Big run.</Text>
  </Screen>;
}
function Preference({ icon, label, detail, enabled, disabled, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; detail: string; enabled: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: enabled, disabled }} aria-checked={enabled} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.preference, pressed && { opacity: 0.7 }]}><MaterialCommunityIcons name={icon} size={24} color={COLORS.gold} /><View style={{ flex: 1, gap: 4 }}><Text style={styles.preferenceTitle}>{label}</Text><Text style={gameStyles.body}>{detail}</Text></View><View style={[styles.switch, enabled && styles.switchOn]}><View style={[styles.thumb, enabled && { alignSelf: "flex-end", backgroundColor: COLORS.gold }]} /></View></Pressable>;
}
const styles = StyleSheet.create({ preference: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.border, minHeight: 64 }, preferenceTitle: { color: COLORS.cream, fontSize: 17, fontWeight: "800" }, switch: { width: 44, padding: 4, backgroundColor: "#33382D", borderRadius: 20 }, switchOn: { backgroundColor: "#54451A" }, thumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.muted }, footer: { color: COLORS.muted, textAlign: "center", lineHeight: 21, fontSize: 12 } });
