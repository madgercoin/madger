
import { Share, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActionButton, Card, Screen } from "@/components/ui";
import { EmptyGameCard, GameHeader, SaveStatus, Segments, StatStrip, gameStyles } from "@/components/game-ui";
import { useGameProfile, useGameDay } from "@/components/game-profile";
import { achievementsFor, bestFor, levelFor, scoresFor, TRAILS, trailUnlocked, type RunMode, type SavedRun } from "@/lib/gameProfile";
import { COLORS } from "@/constants/brand";

export default function ScoresScreen() {
  const { profile, ready, setPreferences } = useGameProfile();
  const params = useLocalSearchParams<{ section?: string; category?: string; entry?: string }>();
  const section = params.section === "progress" ? "progress" : params.section === "history" ? "history" : "scores";
  const runMode: RunMode = params.category === "daily" ? "daily" : "classic";
  const router = useRouter();
  const setSection = (value: "scores" | "history" | "progress") => router.setParams({ section: value });
  const setRunMode = (value: RunMode) => router.setParams({ category: value });
  const today = useGameDay(), level = levelFor(profile.xp);
  const runs = scoresFor(profile, runMode, runMode === "daily" ? today : undefined);
  const entries = runs.map(run => ({ id: run.id, score: run.score, run: run as SavedRun | null }));
  if (runMode === "classic" && profile.legacyBest > 0 && !runs.some(run => run.score === profile.legacyBest)) entries.push({ id: "previous-best", score: profile.legacyBest, run: null });
  entries.sort((a, b) => b.score - a.score);
  const best = bestFor(profile, runMode, runMode === "daily" ? today : undefined);
  return <Screen>
    <GameHeader title="Your scores" subtitle="Every good run deserves a place in the Burrow." />
    <SaveStatus />
    <Segments label="Score screen sections" selected={section} onSelect={setSection} options={[{ value: "scores", label: "High scores" }, { value: "history", label: "Run history" }, { value: "progress", label: "Progress" }]} />
    {section === "scores" ? <>
      <Segments label="Score categories" selected={runMode} onSelect={setRunMode} options={[{ value: "classic", label: "Classic" }, { value: "daily", label: "Today’s run" }]} />
      <View style={styles.bestCard}><MaterialCommunityIcons name="trophy" size={38} color={COLORS.gold} /><Text style={gameStyles.eyebrow}>{runMode === "daily" ? "TODAY’S PERSONAL BEST" : "CLASSIC PERSONAL BEST"}</Text><Text accessibilityLabel={`Best score ${best}`} style={styles.bestValue}>{ready ? best.toLocaleString() : "—"}</Text><Text style={gameStyles.body}>{runMode === "daily" ? `Daily route · ${today} UTC` : "Your highest scores, saved on this device"}</Text></View>
      {entries.length ? <Card><View style={styles.tableHead}><Text style={gameStyles.label}>RANK / RUN</Text><Text style={gameStyles.label}>POINTS</Text></View>{entries.slice(0, 10).map((entry, index) => <View key={entry.id} style={styles.scoreRow} accessible accessibilityLabel={`Rank ${index + 1}, ${entry.score} points${entry.run ? `, ${entry.run.rank} run` : ", previous best"}`}><View style={[styles.place, index === 0 && styles.first]}><Text style={[styles.placeText, index === 0 && { color: COLORS.gold }]}>{index + 1}</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={styles.runName}>{entry.run ? `${entry.run.rank} RANK · ${Math.round(entry.run.seconds)}s` : "Previous best"}</Text><Text style={styles.runDetail}>{entry.run ? `${entry.run.signals} signals · ${dateLabel(entry.run.finishedAt)}` : "Kept from your earlier field record"}</Text></View><Text adjustsFontSizeToFit numberOfLines={1} style={styles.scoreValue}>{entry.score.toLocaleString()}</Text></View>)}</Card> : <EmptyGameCard title={runMode === "daily" ? "Today’s board is yours." : "Start your score story."}>Play a run and bank your score. Your best runs will stay here after you close the app.</EmptyGameCard>}
      <ActionButton label={runMode === "daily" ? "Play today’s run" : "Beat your best"} icon="play" onPress={() => router.push({ pathname: "/play", params: { challenge: runMode, entry: String(Date.now()) } })} />
      {best > 0 ? <ActionButton label="Share my best" icon="share-variant" secondary onPress={() => Share.share({ message: `I scored ${best.toLocaleString()} in MADGER Burrow Run${runMode === "daily" ? ` on the ${today} daily route` : ""}. Small badger. Big run.` })} /> : null}
      <Text style={styles.privateNote}>Saved on this device. No account, ads, or online leaderboard.</Text>
    </> : section === "history" ? <>
      <StatStrip stats={[{ label: "RUNS", value: ready ? profile.record.runs : "—" }, { label: "SIGNALS", value: ready ? profile.record.signals : "—" }, { label: "FINISHED", value: ready ? profile.completed : "—" }]} />
      {profile.recentRuns.length ? profile.recentRuns.map(run => <Card key={run.id}><View style={gameStyles.row}><View style={styles.rank}><Text style={styles.rankLetter}>{run.rank}</Text></View><View style={{ flex: 1, gap: 5 }}><Text style={gameStyles.section}>{run.score.toLocaleString()} <Text style={gameStyles.label}>PTS</Text></Text><Text style={gameStyles.body}>{run.mode === "daily" ? "Daily run" : "Classic"} · {dateLabel(run.finishedAt)}</Text></View></View><Text style={gameStyles.body}>{Math.round(run.seconds)}s · {run.signals} signals · {run.bestStreak} best streak · {run.dodges} close calls</Text><Text style={styles.runDetail}>{run.reason === "time" ? "All three tunnels completed" : run.reason === "quit" ? "Score banked early" : "Out of grit. Ready for another line."}</Text></Card>) : <EmptyGameCard title="Your next run goes here.">Your last 20 runs will show their score, rank, streak, and finish here.</EmptyGameCard>}
    </> : <>
      <Card><Text style={gameStyles.eyebrow}>KEEP DIGGING</Text><Text style={gameStyles.title}>Digger level {level.level}</Text><View style={gameStyles.track}><View style={[gameStyles.fill, { width: `${level.progress * 100}%` }]} /></View><Text style={gameStyles.body}>{profile.xp.toLocaleString()} XP · {level.remaining.toLocaleString()} to the next level</Text></Card>
      <Text style={gameStyles.section}>Make the tunnel yours.</Text><Text style={gameStyles.body}>Unlock trails by playing. They change your glow, never your score.</Text>
      {TRAILS.map(trail => { const unlocked = trailUnlocked(profile, trail.id), equipped = profile.preferences.trail === trail.id; return <Card key={trail.id}><View style={gameStyles.row}><View style={[styles.trail, { backgroundColor: `${trail.color}22`, borderColor: trail.color }]}><MaterialCommunityIcons name={unlocked ? "motion" : "lock-outline"} size={26} color={trail.color} /></View><View style={{ flex: 1 }}><Text style={styles.runName}>{trail.label}</Text><Text style={gameStyles.body}>{trail.hint}</Text></View></View><ActionButton label={equipped ? `${trail.label} equipped` : unlocked ? `Equip ${trail.label.toLowerCase()}` : `${trail.label} locked`} icon={equipped ? "check" : unlocked ? "palette" : "lock"} disabled={!ready || !unlocked || equipped} secondary onPress={() => setPreferences({ trail: trail.id })} /></Card>; })}
      <Text style={gameStyles.section}>Achievements</Text>
      {achievementsFor(profile).map(achievement => { const unlocked = achievement.value >= achievement.target; return <Card key={achievement.id}><View style={gameStyles.row}><MaterialCommunityIcons name={achievement.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={30} color={unlocked ? COLORS.gold : COLORS.muted} /><View style={{ flex: 1, gap: 4 }}><Text style={styles.runName}>{achievement.title}</Text><Text style={gameStyles.body}>{achievement.detail}</Text></View><MaterialCommunityIcons name={unlocked ? "check-circle" : "lock-outline"} color={unlocked ? COLORS.gold : COLORS.muted} size={21} /></View><View style={gameStyles.track}><View style={[gameStyles.fill, { width: `${Math.min(1, achievement.value / achievement.target) * 100}%` }]} /></View><Text style={styles.runDetail}>{unlocked ? "Unlocked" : `${Math.min(achievement.value, achievement.target).toLocaleString()} / ${achievement.target.toLocaleString()}`}</Text></Card>; })}
    </>}
  </Screen>;
}
function dateLabel(date: string) { return new Date(date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
const styles = StyleSheet.create({
  bestCard: { borderRadius: 24, borderWidth: 1, borderColor: "#8F732D", backgroundColor: "#201D0E", alignItems: "center", padding: 24, gap: 10 },
  bestValue: { color: COLORS.gold, fontSize: 48, fontWeight: "900", letterSpacing: -2 },
  tableHead: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 5 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, borderTopWidth: 1, borderTopColor: COLORS.border },
  place: { width: 30, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: "#1A2116" },
  first: { backgroundColor: "#3B3013" }, placeText: { color: COLORS.muted, fontWeight: "900", fontSize: 16 },
  runName: { color: COLORS.cream, fontWeight: "800", fontSize: 15 }, runDetail: { color: COLORS.muted, fontSize: 11, lineHeight: 17 },
  scoreValue: { color: COLORS.cream, fontSize: 21, fontWeight: "900", maxWidth: "34%" },
  privateNote: { color: COLORS.muted, fontSize: 12, textAlign: "center", lineHeight: 19 },
  rank: { width: 54, height: 54, borderRadius: 17, backgroundColor: "#2C2613", alignItems: "center", justifyContent: "center" }, rankLetter: { color: COLORS.gold, fontSize: 30, fontWeight: "900" },
  trail: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
