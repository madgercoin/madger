import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActionButton, Card, Screen } from "@/components/ui";
import { GameHeader, SaveStatus, StatStrip, gameStyles } from "@/components/game-ui";
import { useGameProfile, useGameDay } from "@/components/game-profile";
import { achievementsFor, bestFor, levelFor, streakFor } from "@/lib/gameProfile";
import { objectiveFor } from "@/lib/burrowRun";
import { COLORS } from "@/constants/brand";

export default function HomeScreen() {
  const router = useRouter(), { profile, ready } = useGameProfile();
  const today = useGameDay(), level = levelFor(profile.xp);
  const daily = objectiveFor(Math.floor(Date.parse(today) / 86400000));
  const next = achievementsFor(profile).find(achievement => achievement.value < achievement.target);
  return <Screen>
    <GameHeader title="Keep digging" subtitle="Small badger. Your next big run." />
    <SaveStatus />
    <Card><View style={gameStyles.row}><MaterialCommunityIcons name="compass-rose" size={30} color={COLORS.gold} /><View style={{flex:1}}><Text style={gameStyles.eyebrow}>NEW / FULL 3D EXPEDITION</Text><Text style={gameStyles.section}>A world worth discovering.</Text></View></View><Text style={gameStyles.body}>Run, jump and slide through living forests, forgotten machinery and crystal caverns. Find hidden shortcuts, choose upgrades and bank valuable discoveries.</Text><ActionButton label="Play the 3D Expedition" icon="play" onPress={() => router.push("/expedition")} /><Text style={gameStyles.body}>Snow White attacks. Gorilla White guards. MADGER Bot powers you up. Recruit the crew, uncover secrets and bring the treasure home.</Text></Card>
    {profile.checkpoint ? <Card><Text style={gameStyles.section}>Your tunnel is waiting.</Text><Text style={gameStyles.body}>Continue your interrupted {profile.checkpoint.mode === "daily" ? `Daily run (${profile.checkpoint.day})` : "Classic run"}. It stays paused until you resume.</Text><ActionButton label="Continue interrupted run" icon="play" onPress={() => router.push("/play")} /></Card> : null}
    <View style={styles.hero}>
      <Image accessible={false} source={require("../../../assets/images/burrow-tunnel.png")} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["#060B0730", "#080E09", "#080E09"]} locations={[0, 0.62, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.heroArt}><View style={styles.badge}><MaterialCommunityIcons name="gamepad-variant" size={15} color={COLORS.gold} /><Text style={styles.badgeText}>THE TUNNEL IS YOURS</Text></View><Image accessible={false} source={require("../../../assets/images/madger-runner.png")} contentFit="contain" style={styles.character} /></View>
      <View style={styles.heroCopy}><Text style={gameStyles.eyebrow}>60 SECONDS / 3 ZONES / ONE BADGER</Text><Text style={styles.heroTitle}>One more run<Text style={{ color: COLORS.gold }}>.</Text></Text><Text style={gameStyles.body}>Chase glowing trails. Dodge the noise. Charge your burst and smash through.</Text><ActionButton label="Play Burrow Run" icon="play" onPress={() => router.push({ pathname: "/play", params: { challenge: "classic", entry: String(Date.now()) } })} /></View>
    </View>
    <StatStrip stats={[{ label: "BEST SCORE", value: ready ? bestFor(profile, "classic") : "—" }, { label: "DAY STREAK", value: ready ? streakFor(profile.playedDays, today) : "—" }, { label: "LEVEL", value: ready ? level.level : "—" }]} />
    <Card><View style={gameStyles.row}><View style={styles.dailyIcon}><MaterialCommunityIcons name="calendar-star" size={27} color={COLORS.gold} /></View><View style={{ flex: 1, gap: 4 }}><Text style={gameStyles.eyebrow}>TODAY’S RUN</Text><Text style={gameStyles.section}>Same route. Better line.</Text></View></View><Text style={gameStyles.body}>Learn today’s tunnel and chase your daily best. A fresh route arrives at midnight UTC.</Text><View style={styles.goal}><Text style={styles.goalTitle}>{daily.label}</Text><Text style={styles.goalDetail}>{profile.record.marks.includes(today) ? "Field mark cleared ✓" : "Today’s bonus field mark"}</Text></View><ActionButton label="Play today’s run" icon="flag-checkered" secondary onPress={() => router.push({ pathname: "/play", params: { challenge: "daily", entry: String(Date.now()) } })} /></Card>
    <Card><View style={gameStyles.row}><MaterialCommunityIcons name="trophy-outline" size={28} color={COLORS.gold} /><View style={{ flex: 1 }}><Text style={gameStyles.section}>Scores worth keeping.</Text><Text style={gameStyles.body}>Your best runs and last 20 digs.</Text></View></View><ActionButton label="See my high scores" icon="podium" secondary onPress={() => router.push({ pathname: "/scores", params: { section: "scores", category: "classic", entry: String(Date.now()) } })} /></Card>
    <Card><Text style={gameStyles.eyebrow}>DIGGER LEVEL {level.level}</Text><Text style={gameStyles.section}>{next ? next.title : "The Burrow knows your name."}</Text><Text style={gameStyles.body}>{next ? next.detail : "Every achievement unlocked. Keep chasing your best."}</Text><View style={gameStyles.track}><View style={[gameStyles.fill, { width: `${next ? Math.min(1, next.value / next.target) * 100 : 100}%` }]} /></View><Text style={gameStyles.body}>{next ? `${Math.min(next.value, next.target).toLocaleString()} / ${next.target.toLocaleString()}` : `${profile.xp.toLocaleString()} XP earned`}</Text><ActionButton label="View achievements & trails" icon="star-circle-outline" secondary onPress={() => router.push({ pathname: "/scores", params: { section: "progress", entry: String(Date.now()) } })} /></Card>
    <Text style={styles.footer}>Play offline. Your scores stay in the app.</Text>
  </Screen>;
}
const styles = StyleSheet.create({
  hero: { borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: "#8A702D" },
  heroArt: { height: 210 }, character: { position: "absolute", top: 28, right: "7%", width: "67%", height: 185 },
  badge: { position: "absolute", top: 16, left: 16, flexDirection: "row", gap: 6, padding: 9, borderRadius: 10, backgroundColor: "#081008DD", borderWidth: 1, borderColor: "#B7973A66" },
  badgeText: { color: COLORS.gold, fontWeight: "900", fontSize: 9, letterSpacing: 0.8 },
  heroCopy: { gap: 13, padding: 20 }, heroTitle: { color: COLORS.cream, fontSize: 36, fontWeight: "900", letterSpacing: -1.2 },
  dailyIcon: { padding: 12, borderRadius: 16, backgroundColor: "#2C2613" },
  goal: { gap: 5, padding: 14, borderRadius: 13, backgroundColor: "#1A2113" }, goalTitle: { color: COLORS.gold, fontWeight: "800", fontSize: 16 }, goalDetail: { color: COLORS.muted, fontSize: 12 },
  footer: { color: COLORS.muted, textAlign: "center", fontSize: 12, paddingBottom: 5 },
});
