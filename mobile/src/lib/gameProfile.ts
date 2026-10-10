import { emptyRecord, objectiveFor, objectiveValue, runRank, sanitizeRecord, type FieldRecord, type RunState } from "./burrowRun";

export const PROFILE_KEY = "madger-arcade-profile-v2";
export const LEGACY_RECORD_KEY = "madger-burrow-run-native-v1";
export type RunMode = "classic" | "daily";
export type Trail = "gold" | "mint" | "violet" | "ember";
export type Preferences = { sound: boolean; haptics: boolean; calm: boolean; trail: Trail };
export type SavedRun = {
  id: string; mode: RunMode; day: string; finishedAt: string; score: number;
  signals: number; bestStreak: number; hits: number; dodges: number;
  seconds: number; reason: "time" | "grit" | "quit"; rank: "S" | "A" | "B" | "C";
};
export type GameProfile = {
  version: 2; record: FieldRecord; highScores: SavedRun[]; recentRuns: SavedRun[];
  legacyBest: number; xp: number; completed: number; perfectRuns: number;
  playedDays: string[]; preferences: Preferences;
};
export const TRAILS: { id: Trail; label: string; color: string; hint: string }[] = [
  { id: "gold", label: "Original gold", color: "#FFC928", hint: "Yours from the start" },
  { id: "mint", label: "Tunnel mint", color: "#8BE8E0", hint: "Collect 100 signals" },
  { id: "violet", label: "Signal violet", color: "#C2AEFF", hint: "Build a 20-signal streak" },
  { id: "ember", label: "Bedrock ember", color: "#FFAD66", hint: "Finish a 60-second run" },
];
export const emptyProfile = (): GameProfile => ({
  version: 2, record: emptyRecord(), highScores: [], recentRuns: [], legacyBest: 0,
  xp: 0, completed: 0, perfectRuns: 0, playedDays: [],
  preferences: { sound: false, haptics: true, calm: false, trail: "gold" },
});
const integer = (value: unknown, maximum = Number.MAX_SAFE_INTEGER) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, maximum) : 0;
export function validDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function savedRun(value: unknown): SavedRun | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Partial<SavedRun>;
  if (typeof r.id !== "string" || !r.id || r.id.length > 100 || !validDay(r.day) || typeof r.finishedAt !== "string" || !Number.isFinite(Date.parse(r.finishedAt)) || !["classic", "daily"].includes(r.mode ?? "") || !["time", "grit", "quit"].includes(r.reason ?? "") || typeof r.score !== "number" || !Number.isSafeInteger(r.score) || r.score < 0) return null;
  const hits = integer(r.hits, 100), score = integer(r.score);
  return { id: r.id, mode: r.mode!, day: r.day, finishedAt: r.finishedAt, score, hits,
    signals: integer(r.signals), bestStreak: integer(r.bestStreak), dodges: integer(r.dodges),
    seconds: typeof r.seconds === "number" && Number.isFinite(r.seconds) ? Math.max(0, Math.min(60, r.seconds)) : 0,
    reason: r.reason!, rank: runRank({ score, hits }),
  };
}
const uniqueRuns = (value: unknown): SavedRun[] => {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : []).flatMap(item => { const run = savedRun(item); if (!run || seen.has(run.id)) return []; seen.add(run.id); return [run]; });
};
export const rankScores = (runs: SavedRun[]) => [...runs].sort((a, b) => b.score - a.score || a.finishedAt.localeCompare(b.finishedAt) || a.id.localeCompare(b.id));
function boundScores(runs: SavedRun[]) {
  const days = [...new Set(runs.filter(r => r.mode === "daily").map(r => r.day))].sort().reverse().slice(0, 30);
  return rankScores(runs.filter(r => r.mode === "classic")).slice(0, 25).concat(days.flatMap(day => rankScores(runs.filter(r => r.mode === "daily" && r.day === day)).slice(0, 5)));
}
export function trailUnlocked(profile: GameProfile, trail: Trail) {
  return trail === "gold" || (trail === "mint" && profile.record.signals >= 100) || (trail === "violet" && profile.record.bestStreak >= 20) || (trail === "ember" && profile.completed >= 1);
}
export function sanitizeProfile(value: unknown, legacy?: unknown): GameProfile {
  if (!value || typeof value !== "object" || (value as Partial<GameProfile>).version !== 2) {
    const record = sanitizeRecord(legacy);
    return { ...emptyProfile(), record, legacyBest: record.bestScore, playedDays: record.marks.filter(validDay) };
  }
  const p = value as Partial<GameProfile>, defaults = emptyProfile();
  const preferences = p.preferences && typeof p.preferences === "object" ? p.preferences : defaults.preferences;
  const highScores = boundScores(uniqueRuns(p.highScores)), recentRuns = uniqueRuns(p.recentRuns).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, 20);
  const record = sanitizeRecord(p.record);
  const profile: GameProfile = { ...defaults, record: { ...record, bestScore: Math.max(record.bestScore, ...highScores.map(r => r.score), 0) },
    highScores, recentRuns, legacyBest: integer(p.legacyBest), xp: integer(p.xp), completed: integer(p.completed), perfectRuns: integer(p.perfectRuns),
    playedDays: [...new Set((Array.isArray(p.playedDays) ? p.playedDays : []).filter(validDay))].sort().slice(-90),
    preferences: { sound: preferences.sound === true, haptics: preferences.haptics !== false, calm: preferences.calm === true,
      trail: TRAILS.some(t => t.id === preferences.trail) ? preferences.trail : "gold" },
  };
  if (!trailUnlocked(profile, profile.preferences.trail)) profile.preferences.trail = "gold";
  return profile;
}
export function makeSavedRun(run: RunState, details: { id: string; mode: RunMode; day: string; finishedAt: string; seconds: number; reason: SavedRun["reason"] }): SavedRun {
  return { ...details, score: run.score, signals: run.signals, bestStreak: run.bestStreak, hits: run.hits, dodges: run.dodges, rank: runRank(run) };
}
export function addCompletedRun(profile: GameProfile, run: SavedRun): GameProfile {
  if (profile.recentRuns.some(r => r.id === run.id) || profile.highScores.some(r => r.id === run.id)) return profile;
  const objective = objectiveFor(Math.floor(Date.parse(run.day) / 86400000));
  const cleared = run.mode === "daily" && objectiveValue(objective, { score: run.score, signals: run.signals, bestStreak: run.bestStreak }) >= objective.target;
  const earned = run.seconds >= 5 ? 20 + Math.floor(run.score / 100) + (run.reason === "time" ? 100 : 0) : 0;
  return { ...profile, record: { runs: profile.record.runs + 1, signals: profile.record.signals + run.signals,
    bestScore: Math.max(profile.record.bestScore, run.score), bestStreak: Math.max(profile.record.bestStreak, run.bestStreak),
    marks: [...new Set([...profile.record.marks, ...(cleared ? [run.day] : [])])].slice(-30) },
    highScores: boundScores([...profile.highScores, run]), recentRuns: [run, ...profile.recentRuns].slice(0, 20),
    xp: profile.xp + earned, completed: profile.completed + (run.reason === "time" ? 1 : 0),
    perfectRuns: profile.perfectRuns + (run.reason === "time" && run.hits === 0 ? 1 : 0),
    playedDays: [...new Set([...profile.playedDays, ...(run.seconds >= 5 ? [run.day] : [])])].sort().slice(-90),
  };
}
export function scoresFor(profile: GameProfile, mode: RunMode, day?: string) {
  return rankScores(profile.highScores.filter(r => r.mode === mode && (!day || r.day === day)));
}
export function bestFor(profile: GameProfile, mode: RunMode, day?: string) {
  return Math.max(scoresFor(profile, mode, day)[0]?.score ?? 0, mode === "classic" && !day ? profile.legacyBest : 0);
}
export function levelFor(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 250)) + 1;
  const floor = 250 * (level - 1) ** 2, next = 250 * level ** 2;
  return { level, progress: (xp - floor) / (next - floor), remaining: next - xp };
}
export function streakFor(days: string[], today: string) {
  const played = new Set(days), date = new Date(today);
  if (!played.has(today)) date.setUTCDate(date.getUTCDate() - 1);
  let streak = 0;
  while (played.has(date.toISOString().slice(0, 10))) { streak++; date.setUTCDate(date.getUTCDate() - 1); }
  return streak;
}
export function achievementsFor(profile: GameProfile) {
  return [
    { id: "first", title: "First dig", detail: "Bank your first score", icon: "flag-checkered", value: profile.record.runs, target: 1 },
    { id: "collector", title: "Signal collector", detail: "Collect 100 signals · unlock mint", icon: "lightning-bolt", value: profile.record.signals, target: 100 },
    { id: "combo", title: "On a roll", detail: "20-signal streak · unlock violet", icon: "fire", value: profile.record.bestStreak, target: 20 },
    { id: "depth", title: "Full tunnel", detail: "Finish 60 seconds · unlock ember", icon: "routes", value: profile.completed, target: 1 },
    { id: "score", title: "Five figures", detail: "Score 10,000 in one run", icon: "trophy", value: profile.record.bestScore, target: 10000 },
    { id: "perfect", title: "Untouchable", detail: "Finish a run without a hit", icon: "shield-star", value: profile.perfectRuns, target: 1 },
    { id: "daily", title: "Marked territory", detail: "Clear 3 daily field marks", icon: "calendar-check", value: profile.record.marks.length, target: 3 },
    { id: "regular", title: "Keep digging", detail: "Bank 25 scores", icon: "shovel", value: profile.record.runs, target: 25 },
  ];
}
export function seedForDay(day: string) { let seed = 2166136261; for (const char of day) { seed ^= char.charCodeAt(0); seed = Math.imul(seed, 16777619); } return seed >>> 0; }
export function randomFromSeed(initial: number) { let seed = initial >>> 0; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
