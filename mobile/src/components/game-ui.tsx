import { type PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@/constants/brand";
import { ActionButton, Card, textStyles } from "./ui";
import { useGameProfile } from "./game-profile";
export const gameStyles = StyleSheet.create({
  eyebrow: { color: "#C5AF79", fontSize: 10, letterSpacing: 2, fontWeight: "900" },
  title: { color: COLORS.cream, fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  label: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  section: { color: COLORS.cream, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  body: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  track: { height: 5, borderRadius: 4, backgroundColor: "#30362B", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: COLORS.gold },
});
export function GameHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ gap: 6 }}><Text style={gameStyles.eyebrow}>MADGER / BURROW RUN</Text><Text accessibilityRole="header" accessibilityLabel={title} style={gameStyles.title}>{title}<Text style={{ color: COLORS.gold }}>.</Text></Text>{subtitle ? <Text style={gameStyles.body}>{subtitle}</Text> : null}</View>;
}
export function StatStrip({ stats }: { stats: { label: string; value: string | number }[] }) {
  return <View style={styles.stats}>{stats.map(stat => <View key={stat.label} style={styles.stat}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.value}>{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</Text><Text style={gameStyles.label}>{stat.label}</Text></View>)}</View>;
}
export function Segments<T extends string>({ options, selected, onSelect, label }: { options: { value: T; label: string }[]; selected: T; onSelect: (value: T) => void; label: string }) {
  return <View accessibilityLabel={label} style={styles.segments}>{options.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: selected === option.value }} accessibilityLabel={option.label} onPress={() => onSelect(option.value)} style={({ pressed }) => [styles.segment, selected === option.value && styles.selected, pressed && { opacity: 0.7 }]}><Text style={[styles.segmentLabel, selected === option.value && { color: COLORS.gold }]}>{option.label}</Text></Pressable>)}</View>;
}
export function SaveStatus() {
  const { ready, error, saving, retry } = useGameProfile();
  if (!error && ready) return null;
  return <Card><Text accessibilityRole={error ? "alert" : undefined} style={textStyles.body}>{error || "Loading your saved scores…"}</Text>{error ? <ActionButton label={ready ? "Retry saving scores" : "Retry loading scores"} icon="refresh" onPress={retry} disabled={saving} secondary /> : null}</Card>;
}
export function EmptyGameCard({ title, children }: PropsWithChildren<{ title: string }>) {
  return <Card><MaterialCommunityIcons name="trophy-outline" size={42} color={COLORS.gold} /><Text style={gameStyles.section}>{title}</Text><Text style={gameStyles.body}>{children}</Text></Card>;
}
const styles = StyleSheet.create({
  stats: { flexDirection: "row", paddingVertical: 16, backgroundColor: "#11170D", borderRadius: 18, borderWidth: 1, borderColor: COLORS.border },
  stat: { flex: 1, gap: 5, paddingHorizontal: 8, alignItems: "center" },
  value: { color: COLORS.cream, fontSize: 23, fontWeight: "900" },
  segments: { flexDirection: "row", padding: 4, gap: 4, borderRadius: 16, backgroundColor: "#11170D", borderWidth: 1, borderColor: COLORS.border },
  segment: { flex: 1, minHeight: 46, paddingVertical: 12, paddingHorizontal: 5, justifyContent: "center", alignItems: "center", borderRadius: 12 },
  selected: { backgroundColor: "#2B2512" },
  segmentLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "800", textAlign: "center" },
});
