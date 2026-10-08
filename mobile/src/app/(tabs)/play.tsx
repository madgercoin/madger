import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  AppState,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { ActionButton, Card, Screen } from "@/components/ui";
import { BurrowScene, type Feedback } from "@/components/burrow-scene";
import { COLORS } from "@/constants/brand";
import { useGameAudio } from "@/lib/gameAudio";
import {
  BURST_COST,
  MAX_GRIT,
  ROUND_SECONDS,
  activateBurst,
  emptyRecord,
  freshSimulation,
  multiplierFor,
  objectiveFor,
  objectiveValue,
  phaseFor,
  runRank,
  sanitizeRecord,
  stepSimulation,
  type Entity,
  type FieldRecord,
  type GameEvent,
} from "@/lib/burrowRun";

const RECORD_KEY = "madger-burrow-run-native-v1";
type Mode = "ready" | "countdown" | "running" | "paused" | "ended";
type Notice = {
  title: string;
  detail: string;
  tone: "gold" | "danger" | "mint";
  until: number;
};
const DEMO: Entity[] = [
  { id: -1, lane: 0, type: "signal", y: 0.64, passed: false },
  { id: -2, lane: 0, type: "signal", y: 0.44, passed: false },
  { id: -3, lane: 2, type: "noise", y: 0.6, passed: false },
  { id: -4, lane: 1, type: "shield", y: 0.42, passed: false },
];

export default function PlayScreen() {
  const [mode, setMode] = useState<Mode>("ready");
  const modeRef = useRef<Mode>("ready");
  const simulationRef = useRef(freshSimulation());
  const [simulation, setSimulation] = useState(freshSimulation);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef(2.4);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const feedbackId = useRef(0);
  const [haptics, setHaptics] = useState(true);
  const [sound, setSound] = useState(false);
  const { cue, stop: stopAudio } = useGameAudio(sound);
  const hapticsRef = useRef(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [record, setRecord] = useState<FieldRecord>(emptyRecord);
  const [recordReady, setRecordReady] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);
  const savingRef = useRef(false);
  const [recordError, setRecordError] = useState("");
  const recordRef = useRef<FieldRecord>(emptyRecord());
  const [newBest, setNewBest] = useState(false);
  const [finishReason, setFinishReason] = useState<"time" | "grit">("time");
  const [message, setMessage] = useState("Swipe to find your line.");
  const endingRef = useRef(false);
  const pausedFrom = useRef<"countdown" | "running">("running");
  const [today, setToday] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const runDayRef = useRef(today);
  const { height, fontScale } = useWindowDimensions();
  const { run, lane, elapsed, entities } = simulation;
  const phase = phaseFor(elapsed);
  const activeRun =
    mode === "countdown" || mode === "running" || mode === "paused";
  const scrollRun = activeRun && (fontScale > 1.5 || height < 640);
  const objective = useMemo(
    () => objectiveFor(Math.floor(Date.parse(today) / 86400000)),
    [today],
  );
  const objectiveCurrent = objectiveValue(objective, run);
  const progress = Math.min(1, objectiveCurrent / objective.target);
  const comboProgress = run.streak >= 20 ? 1 : (run.streak % 5) / 5;
  const burstReady = run.energy >= BURST_COST;

  const loadRecord = useCallback(
    () =>
      AsyncStorage.getItem(RECORD_KEY)
        .then((value) => {
          let saved: unknown = null;
          try {
            saved = value ? JSON.parse(value) : null;
          } catch {
            /* Malformed local data starts a fresh record. */
          }
          const next = sanitizeRecord(saved);
          recordRef.current = next;
          setRecord(next);
          setRecordReady(true);
          setRecordError("");
        })
        .catch(() =>
          setRecordError(
            "Your field record could not be loaded. Retry before starting a run.",
          ),
        ),
    [],
  );
  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReducedMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const pulse = useCallback((kind: "light" | "hit" | "success") => {
    if (!hapticsRef.current) return;
    void (
      kind === "hit"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        : kind === "success"
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    ).catch(() => {});
  }, []);

  const saveRecord = useCallback(async (next: FieldRecord) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setRecordSaving(true);
    try {
      await AsyncStorage.setItem(RECORD_KEY, JSON.stringify(next));
      setRecordError("");
    } catch {
      setRecordError(
        "Your latest record is only in memory. Retry saving before closing the app.",
      );
    } finally {
      savingRef.current = false;
      setRecordSaving(false);
    }
  }, []);

  const finishRun = useCallback(
    (reason: "time" | "grit") => {
      if (endingRef.current) return;
      endingRef.current = true;
      const finalRun = simulationRef.current.run;
      const previous = recordRef.current;
      const runDay = runDayRef.current;
      const runObjective = objectiveFor(
        Math.floor(Date.parse(runDay) / 86400000),
      );
      const markCleared =
        objectiveValue(runObjective, finalRun) >= runObjective.target;
      modeRef.current = "ended";
      setMode("ended");
      setFinishReason(reason);
      setNewBest(finalRun.score > previous.bestScore);
      setMessage(
        reason === "time"
          ? "Run complete. Keep digging."
          : "Shake it off. Find a new line.",
      );
      setNotice(null);
      setFeedback([]);
      const next = sanitizeRecord({
        runs: previous.runs + 1,
        signals: previous.signals + finalRun.signals,
        bestScore: Math.max(previous.bestScore, finalRun.score),
        bestStreak: Math.max(previous.bestStreak, finalRun.bestStreak),
        marks: markCleared ? [...previous.marks, runDay] : previous.marks,
      });
      recordRef.current = next;
      setRecord(next);
      void saveRecord(next);
      pulse(reason === "time" ? "success" : "hit");
      cue(reason === "time" ? "finish" : "hit");
    },
    [cue, pulse, saveRecord],
  );

  const showEvents = useCallback(
    (events: GameEvent[]) => {
      const current = simulationRef.current;
      const additions: Feedback[] = [];
      let announcement: Notice | null = null;
      for (const event of events) {
        if (event.kind === "pickup" || event.kind === "dodge") {
          additions.push({
            id: feedbackId.current++,
            label: event.kind === "dodge" ? "CLOSE! +50" : `+${event.points}`,
            tone: "gold",
            lane: current.lane,
          });
          if (event.type === "shield")
            announcement = {
              title: "SHIELD UP",
              detail: "One hit covered · 8 seconds",
              tone: "mint",
              until: current.elapsed + 2.2,
            };
          if (event.type === "magnet")
            announcement = {
              title: "SIGNAL MAGNET",
              detail: "Every lane · 6 seconds",
              tone: "mint",
              until: current.elapsed + 2.2,
            };
          if (event.type === "boost")
            announcement = {
              title: "GRIT RESTORED",
              detail: "Back in the fight.",
              tone: "mint",
              until: current.elapsed + 2.2,
            };
        }
        if (event.kind === "hit") {
          announcement = {
            title: "OUCH. KEEP DIGGING.",
            detail: "One grit lost · combo reset",
            tone: "danger",
            until: current.elapsed + 1.8,
          };
          additions.push({
            id: feedbackId.current++,
            label: "−1 GRIT",
            tone: "danger",
            lane: current.lane,
          });
        }
        if (event.kind === "blocked")
          additions.push({
            id: feedbackId.current++,
            label: current.run.burst > 0 ? "SMASH! +100" : "BLOCKED",
            tone: "mint",
            lane: current.lane,
          });
        if (event.kind === "phase")
          announcement = {
            title: phaseFor(current.elapsed).label,
            detail: `ZONE ${phaseFor(current.elapsed).number} / 3 · Faster. Stay sharp.`,
            tone: "gold",
            until: current.elapsed + 2.4,
          };
        if (event.kind === "burst-ready")
          announcement = {
            title: "DIG BURST READY",
            detail: "Tap BURST · break through the noise",
            tone: "gold",
            until: current.elapsed + 2.5,
          };
      }
      if (additions.length)
        setFeedback((previous) => [...previous, ...additions].slice(-5));
      if (announcement) {
        setNotice(announcement);
        setMessage(`${announcement.title}. ${announcement.detail}`);
      }
      if (events.some((event) => event.kind === "hit")) pulse("hit");
      else if (events.some((event) => event.kind === "pickup")) pulse("light");
      if (events.some((event) => event.kind === "hit")) cue("hit");
      else if (
        events.some(
          (event) => event.kind === "pickup" && event.type !== "signal",
        )
      )
        cue("power");
      else if (events.some((event) => event.kind === "pickup")) cue("signal");
    },
    [cue, pulse],
  );

  useEffect(() => {
    if (mode !== "running" && mode !== "countdown") return;
    let lastTick = performance.now();
    const timer = setInterval(() => {
      if (modeRef.current !== "running" && modeRef.current !== "countdown")
        return;
      const now = performance.now();
      const delta = Math.max(0, Math.min((now - lastTick) / 1000, 0.1));
      lastTick = now;
      if (modeRef.current === "countdown") {
        countdownRef.current -= delta;
        setCountdown(Math.max(1, Math.ceil(countdownRef.current / 0.8)));
        if (countdownRef.current <= 0) {
          modeRef.current = "running";
          setMode("running");
          setMessage("Go! Follow the gold trail.");
        }
        return;
      }
      const result = stepSimulation(simulationRef.current, delta);
      simulationRef.current = result.state;
      setSimulation(result.state);
      showEvents(result.events);
      if (result.ended) finishRun(result.ended);
    }, 33);
    return () => clearInterval(timer);
  }, [finishRun, mode, showEvents]);

  const pause = useCallback(() => {
    stopAudio();
    if (modeRef.current !== "running" && modeRef.current !== "countdown")
      return;
    pausedFrom.current = modeRef.current;
    modeRef.current = "paused";
    setMode("paused");
    setMessage("Run paused. Resume when you’re ready.");
  }, [stopAudio]);
  const resume = useCallback(() => {
    if (modeRef.current !== "paused") return;
    modeRef.current = pausedFrom.current;
    setMode(pausedFrom.current);
    setMessage("Back to the Burrow.");
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") pause();
    });
    return () => subscription.remove();
  }, [pause]);
  useFocusEffect(
    useCallback(() => {
      if (modeRef.current === "ready" || modeRef.current === "ended")
        setToday(new Date().toISOString().slice(0, 10));
      return pause;
    }, [pause]),
  );

  const move = useCallback((direction: -1 | 1) => {
    if (modeRef.current !== "running" && modeRef.current !== "countdown")
      return;
    const current = simulationRef.current;
    const nextLane = Math.max(0, Math.min(2, current.lane + direction));
    if (nextLane === current.lane) return;
    const next = { ...current, lane: nextLane };
    simulationRef.current = next;
    setSimulation(next);
    if (hapticsRef.current) void Haptics.selectionAsync().catch(() => {});
  }, []);
  const burst = useCallback(() => {
    if (modeRef.current !== "running") return;
    const current = simulationRef.current;
    const nextRun = activateBurst(current.run);
    if (nextRun === current.run) return;
    const next = { ...current, run: nextRun };
    simulationRef.current = next;
    setSimulation(next);
    setNotice({
      title: "DIG BURST!",
      detail: "3 seconds · double points · smash noise",
      tone: "gold",
      until: current.elapsed + 3,
    });
    setMessage("Dig burst! Double signal points. Break through the noise.");
    pulse("success");
    cue("burst");
  }, [cue, pulse]);

  // PanResponder stores these event callbacks; it does not invoke them during render.
  /* eslint-disable react-hooks/refs */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          (mode === "running" || mode === "countdown") &&
          Math.abs(gesture.dx) > 14 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) >= 24) move(gesture.dx < 0 ? -1 : 1);
        },
      }),
    [mode, move],
  );
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (Platform.OS !== "web") return;
    function key(event: KeyboardEvent) {
      if (modeRef.current === "ready" || modeRef.current === "ended") return;
      if (
        event.target instanceof HTMLElement &&
        /INPUT|TEXTAREA/.test(event.target.tagName)
      )
        return;
      // Space retains normal activation for a focused accessibility button.
      // Arrow keys still steer after using an on-screen movement control.
      if (
        event.key === " " &&
        event.target instanceof HTMLElement &&
        event.target.closest('[role="button"], button')
      )
        return;
      if (
        ["ArrowLeft", "ArrowRight", " ", "Escape", "a", "d", "p"].includes(
          event.key,
        )
      )
        event.preventDefault();
      if (event.key === "ArrowLeft" || event.key === "a") move(-1);
      if (event.key === "ArrowRight" || event.key === "d") move(1);
      if (event.key === " ") burst();
      if (!event.repeat && (event.key === "Escape" || event.key === "p")) {
        if (modeRef.current === "paused") resume();
        else pause();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [burst, move, pause, resume]);

  function startRun() {
    if (!recordReady || savingRef.current || recordError) return;
    const day = new Date().toISOString().slice(0, 10);
    setToday(day);
    runDayRef.current = day;
    endingRef.current = false;
    countdownRef.current = 2.4;
    const initial = freshSimulation();
    simulationRef.current = initial;
    setSimulation(initial);
    setCountdown(3);
    setNotice(null);
    setFeedback([]);
    setNewBest(false);
    modeRef.current = "countdown";
    setMode("countdown");
    setMessage("Get ready. Swipe or use the arrows to move.");
  }

  function resetRecord() {
    if (!recordReady || savingRef.current || activeRun) return;
    Alert.alert(
      "Reset field record?",
      "This permanently removes Burrow Run progress stored on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            savingRef.current = true;
            setRecordSaving(true);
            try {
              await AsyncStorage.removeItem(RECORD_KEY);
              recordRef.current = emptyRecord();
              setRecord(recordRef.current);
              setRecordError("");
            } catch {
              Alert.alert(
                "Record not reset",
                "Your field record has been kept. Please try again.",
              );
            } finally {
              savingRef.current = false;
              setRecordSaving(false);
            }
          },
        },
      ],
    );
  }

  const visibleNotice = notice && elapsed < notice.until ? notice : null;
  const startLabel = !recordReady
    ? "Loading record…"
    : recordSaving
      ? "Saving record…"
      : mode === "ended"
        ? "Dig again"
        : "Let’s dig";
  const startDisabled = !recordReady || recordSaving || !!recordError;
  return (
    <Screen
      scroll={!activeRun || scrollRun}
      footer={
        activeRun ? (
          <View style={styles.controls}>
            <Control
              icon="chevron-left"
              label="LEFT"
              disabled={mode === "paused" || lane === 0}
              onPress={() => move(-1)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                burstReady
                  ? "Activate dig burst"
                  : `Dig burst charging, ${run.energy} percent`
              }
              accessibilityHint="Three seconds of double points and protection from noise"
              accessibilityState={{
                disabled: mode !== "running" || !burstReady,
              }}
              disabled={mode !== "running" || !burstReady}
              onPress={burst}
              style={({ pressed }) => [
                styles.burstButton,
                burstReady && styles.burstReady,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={22}
                color={burstReady ? "#231802" : COLORS.gold}
              />
              <Text
                style={[styles.burstLabel, burstReady && { color: "#231802" }]}
              >
                {run.burst > 0
                  ? "BURSTING"
                  : burstReady
                    ? "BURST!"
                    : `${run.energy}%`}
              </Text>
              <View style={styles.energyTrack}>
                <View
                  style={[styles.energyFill, { width: `${run.energy}%` }]}
                />
              </View>
            </Pressable>
            <Control
              icon="chevron-right"
              label="RIGHT"
              disabled={mode === "paused" || lane === 2}
              onPress={() => move(1)}
            />
          </View>
        ) : undefined
      }
    >
      <View style={styles.topbar}>
        <View>
          <Text style={styles.eyebrow}>MADGER / FIELD ARCADE</Text>
          <Text accessibilityRole="header" style={styles.screenTitle}>
            Burrow Run<Text style={styles.titleDot}>.</Text>
          </Text>
        </View>
        {activeRun ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === "paused" ? "Resume run" : "Pause run"}
            onPress={mode === "paused" ? resume : pause}
            style={styles.roundButton}
          >
            <MaterialCommunityIcons
              name={mode === "paused" ? "play" : "pause"}
              size={24}
              color={COLORS.cream}
            />
          </Pressable>
        ) : (
          <View style={styles.bestChip}>
            <MaterialCommunityIcons
              name="trophy-outline"
              size={16}
              color={COLORS.gold}
            />
            <Text style={styles.bestText}>
              {recordReady ? record.bestScore.toLocaleString() : "—"}
            </Text>
          </View>
        )}
      </View>
      {activeRun ? (
        <View style={styles.liveHud}>
          <View style={styles.scoreBlock}>
            <Text style={styles.micro}>SCORE</Text>
            <Text style={styles.score}>{run.score.toLocaleString()}</Text>
          </View>
          <View style={styles.comboBlock}>
            <Text style={styles.combo}>
              ×{multiplierFor(run.streak) * (run.burst > 0 ? 2 : 1)}
            </Text>
            <View style={styles.comboTrack}>
              <View
                style={[styles.comboFill, { width: `${comboProgress * 100}%` }]}
              />
            </View>
            <Text style={styles.micro}>{run.streak} STREAK</Text>
          </View>
          <View style={styles.vitals}>
            <Text
              style={[
                styles.time,
                ROUND_SECONDS - elapsed <= 10 && { color: COLORS.danger },
              ]}
            >
              {Math.ceil(Math.max(0, ROUND_SECONDS - elapsed))}
              <Text style={styles.seconds}>s</Text>
            </Text>
            <View
              style={styles.grit}
              accessibilityLabel={`${run.grit} of ${MAX_GRIT} grit remaining`}
            >
              {[0, 1, 2].map((index) => (
                <MaterialCommunityIcons
                  key={index}
                  name={index < run.grit ? "heart" : "heart-outline"}
                  size={15}
                  color={index < run.grit ? "#FF977B" : "#786A5E"}
                />
              ))}
            </View>
          </View>
        </View>
      ) : null}
      {activeRun ? (
        <View style={styles.zoneRow}>
          <Text style={[styles.zoneText, { color: phase.accent }]}>
            0{phase.number} / {phase.label}
          </Text>
          <View style={styles.zoneSegments}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.zoneSegment,
                  {
                    backgroundColor:
                      index < phase.number ? phase.accent : "#35382A",
                  },
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}
      <View
        {...panResponder.panHandlers}
        style={
          activeRun && !scrollRun
            ? styles.activeArena
            : {
                height:
                  (scrollRun
                    ? 380
                    : Math.max(470, Math.min(540, height * 0.66))) +
                  Math.max(0, fontScale - 1) * 170,
              }
        }
        accessibilityLabel="Three-lane tunnel. Swipe left or right, or use movement buttons to collect gold signals and avoid red noise."
      >
        <BurrowScene
          elapsed={elapsed}
          entities={mode === "ready" ? DEMO : entities}
          lane={lane}
          run={run}
          playing={mode === "running"}
          reducedMotion={reducedMotion}
          feedback={feedback}
        >
          {mode === "running" ? (
            <View pointerEvents="none" style={styles.arenaHud}>
              <View style={styles.arenaGoal}>
                <MaterialCommunityIcons
                  name={progress >= 1 ? "check-circle" : "flag-checkered"}
                  size={15}
                  color={COLORS.gold}
                />
                <Text style={styles.goalText}>
                  {progress >= 1 ? "DAILY MARK CLEARED" : objective.label}
                </Text>
                <Text style={styles.goalCount}>
                  {Math.min(objectiveCurrent, objective.target)}/
                  {objective.target}
                </Text>
              </View>
              <View style={styles.goalTrack}>
                <View
                  style={[styles.goalFill, { width: `${progress * 100}%` }]}
                />
              </View>
              {visibleNotice ? (
                <View
                  style={[
                    styles.notice,
                    visibleNotice.tone === "danger" && {
                      borderColor: "#FF785B88",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.noticeTitle,
                      {
                        color:
                          visibleNotice.tone === "danger"
                            ? COLORS.danger
                            : visibleNotice.tone === "mint"
                              ? "#8BE8E0"
                              : COLORS.gold,
                      },
                    ]}
                  >
                    {visibleNotice.title}
                  </Text>
                  <Text style={styles.noticeDetail}>
                    {visibleNotice.detail}
                  </Text>
                </View>
              ) : null}
              <View style={styles.powerRow}>
                {run.shield > 0 ? (
                  <PowerChip
                    icon="shield-check"
                    label={`${Math.ceil(run.shield)}s`}
                    color="#8BE8E0"
                  />
                ) : null}
                {run.magnet > 0 ? (
                  <PowerChip
                    icon="magnet"
                    label={`${Math.ceil(run.magnet)}s`}
                    color="#C2AEFF"
                  />
                ) : null}
                {run.burst > 0 ? (
                  <PowerChip
                    icon="lightning-bolt"
                    label={`${run.burst.toFixed(1)}s`}
                    color={COLORS.gold}
                  />
                ) : null}
              </View>
              {elapsed < 5 ? (
                <Text style={styles.swipeHint}>
                  ← SWIPE TO FOLLOW THE GOLD →
                </Text>
              ) : null}
            </View>
          ) : null}
          {mode === "countdown" ? (
            <View pointerEvents="none" style={styles.countdownOverlay}>
              <Text style={styles.countdownMicro}>FIND YOUR LINE</Text>
              <Text
                accessibilityLiveRegion="polite"
                style={styles.countdownNumber}
              >
                {countdown}
              </Text>
              <Text style={styles.countdownCopy}>
                Gold is good. Red is trouble.
              </Text>
            </View>
          ) : null}
          {mode === "ready" ? (
            <View style={styles.lobbyOverlay}>
              <LinearGradient
                colors={["#080E09F5", "#080E09DB", "transparent"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.lobbyContent}>
                <View style={styles.modeTag}>
                  <View style={styles.tagDot} />
                  <Text style={styles.tagText}>
                    60 SECONDS. ZERO HESITATION.
                  </Text>
                </View>
                <Text style={styles.heroTitle}>
                  SMALL BADGER.{"\n"}BIG <Text style={styles.gold}>RUN.</Text>
                </Text>
                <Text style={styles.heroCopy}>
                  Chase the signal. Cut through the noise.{"\n"}How deep can you
                  dig?
                </Text>
                <View style={styles.lobbyFacts}>
                  <Fact icon="routes" label="3 zones" />
                  <Fact icon="lightning-bolt" label="Dig burst" />
                  <Fact icon="shield-check" label="Power-ups" />
                </View>
                <ActionButton
                  label={startLabel}
                  icon="play"
                  disabled={startDisabled}
                  onPress={startRun}
                />
                <Text style={styles.lobbyHint}>
                  Swipe or tap arrows to switch lanes
                </Text>
              </View>
            </View>
          ) : null}
          {mode === "paused" || mode === "ended" ? (
            <ScrollView
              style={styles.resultOverlay}
              contentContainerStyle={styles.resultContent}
            >
              <View style={styles.modeTag}>
                <Text style={styles.tagText}>
                  {mode === "paused"
                    ? "TAKE A BREATHER"
                    : newBest
                      ? "NEW PERSONAL BEST"
                      : "RUN DEBRIEF"}
                </Text>
              </View>
              {mode === "paused" ? (
                <>
                  <MaterialCommunityIcons
                    name="pause-circle-outline"
                    color={COLORS.gold}
                    size={54}
                  />
                  <Text style={styles.resultTitle}>
                    The tunnel{"\n"}can wait.
                  </Text>
                  <Text style={styles.heroCopy}>
                    Your run is frozen. Pick up where you left off.
                  </Text>
                  <ActionButton
                    label="Back to the run"
                    icon="play"
                    onPress={resume}
                  />
                </>
              ) : (
                <>
                  <View style={styles.rankDisc}>
                    <Text style={styles.rankLetter}>{runRank(run)}</Text>
                    <Text style={styles.rankLabel}>RUN RANK</Text>
                  </View>
                  <Text style={styles.resultTitle}>
                    {finishReason === "time"
                      ? "Made your mark."
                      : "Dust off. Dig again."}
                  </Text>
                  <Text style={styles.resultScore}>
                    {run.score.toLocaleString()}
                    <Text style={styles.resultPoints}> PTS</Text>
                  </Text>
                  <View style={styles.resultStats}>
                    <ResultStat value={run.signals} label="SIGNALS" />
                    <ResultStat value={run.bestStreak} label="BEST STREAK" />
                    <ResultStat value={run.dodges} label="CLOSE CALLS" />
                  </View>
                  <Text style={styles.resultTip}>
                    {progress >= 1
                      ? "Daily mark cleared. The Burrow remembers."
                      : run.hits > 0
                        ? "Tip: save your burst for a crowded tunnel."
                        : "Tip: follow signal trails to build your multiplier."}
                  </Text>
                  <ActionButton
                    label={startLabel}
                    icon="refresh"
                    disabled={startDisabled}
                    onPress={startRun}
                  />
                </>
              )}
            </ScrollView>
          ) : null}
        </BurrowScene>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.status}>
        {message}
      </Text>
      {!activeRun ? (
        <>
          {recordError ? (
            <Card>
              <Text accessibilityRole="alert" style={styles.body}>
                {recordError}
              </Text>
              <ActionButton
                label={
                  recordReady ? "Retry saving record" : "Retry loading record"
                }
                icon="refresh"
                onPress={() =>
                  recordReady ? saveRecord(recordRef.current) : loadRecord()
                }
                disabled={recordSaving}
                secondary
              />
            </Card>
          ) : null}
          <View style={styles.dailyCard}>
            <View style={styles.dailyIcon}>
              <MaterialCommunityIcons
                name="flag-checkered"
                size={24}
                color={COLORS.gold}
              />
            </View>
            <View style={styles.dailyCopy}>
              <Text style={styles.micro}>TODAY’S FIELD MARK</Text>
              <Text style={styles.dailyTitle}>{objective.label}</Text>
              <Text style={styles.dailyNote}>
                {record.marks.includes(today)
                  ? "Cleared today. Go beat your best."
                  : "A fresh challenge every day · midnight UTC"}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={
                record.marks.includes(today) ? "check-circle" : "chevron-right"
              }
              size={23}
              color={COLORS.gold}
            />
          </View>
          <Card>
            <Text style={styles.sectionTitle}>A little fieldcraft.</Text>
            <View style={styles.guideRow}>
              <Guide
                icon="lightning-bolt"
                color={COLORS.gold}
                title="Follow the gold"
                copy="Each 5 signals lifts your multiplier. Keep the trail going."
              />
              <Guide
                icon="close-thick"
                color="#FF977B"
                title="Watch the noise"
                copy="Three hits end your run. A close dodge earns 50 points."
              />
            </View>
            <View style={styles.guideRow}>
              <Guide
                icon="shield-check"
                color="#8BE8E0"
                title="Grab an advantage"
                copy="Shields cover a hit. Magnets collect across all three lanes."
              />
              <Guide
                icon="flash"
                color={COLORS.gold}
                title="Charge. Then burst."
                copy="Collect signals, then tap BURST for 3 seconds of double points and protection."
              />
            </View>
          </Card>
          <View style={styles.settings}>
            <Setting
              icon={sound ? "volume-high" : "volume-off"}
              label="Sound"
              enabled={sound}
              onPress={() => setSound((value) => !value)}
            />
            <Setting
              icon="vibrate"
              label="Haptics"
              enabled={haptics}
              onPress={() => {
                const next = !haptics;
                hapticsRef.current = next;
                setHaptics(next);
              }}
            />
            <Setting
              icon="motion-pause-outline"
              label="Calm effects"
              enabled={reducedMotion}
              onPress={() => setReducedMotion((value) => !value)}
            />
          </View>
          <Card>
            <View style={styles.recordHead}>
              <View>
                <Text style={styles.micro}>YOUR PRIVATE FIELD RECORD</Text>
                <Text style={styles.sectionTitle}>Progress worth keeping.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset field record"
                accessibilityState={{ disabled: !recordReady || recordSaving }}
                disabled={!recordReady || recordSaving}
                onPress={resetRecord}
                style={styles.resetButton}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={21}
                  color={COLORS.muted}
                />
              </Pressable>
            </View>
            <View style={styles.recordGrid}>
              <ResultStat value={record.runs} label="RUNS" />
              <ResultStat value={record.bestScore} label="BEST SCORE" />
              <ResultStat value={record.marks.length} label="MARKS" />
            </View>
            <Text style={styles.privateNote}>
              Offline. No wallet. Your record stays on this device.
            </Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
function Control({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move ${label.toLowerCase()}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons name={icon} color={COLORS.cream} size={30} />
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}
function PowerChip({
  icon,
  label,
  color,
}: {
  icon: IconName;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.powerChip}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={[styles.powerText, { color }]}>{label}</Text>
    </View>
  );
}
function Fact({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.fact}>
      <MaterialCommunityIcons name={icon} size={16} color={COLORS.gold} />
      <Text style={styles.factText}>{label}</Text>
    </View>
  );
}
function ResultStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.resultStat}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.resultValue}>
        {value.toLocaleString()}
      </Text>
      <Text style={styles.micro}>{label}</Text>
    </View>
  );
}
function Guide({
  icon,
  color,
  title,
  copy,
}: {
  icon: IconName;
  color: string;
  title: string;
  copy: string;
}) {
  return (
    <View style={styles.guide}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={styles.guideTitle}>{title}</Text>
      <Text style={styles.guideCopy}>{copy}</Text>
    </View>
  );
}
function Setting({
  icon,
  label,
  enabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: enabled }}
      aria-checked={enabled}
      onPress={onPress}
      style={styles.setting}
    >
      <MaterialCommunityIcons name={icon} size={18} color={COLORS.muted} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={[styles.settingValue, enabled && styles.gold]}>
        {enabled ? "ON" : "OFF"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: "#B8AA87",
  },
  screenTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: COLORS.cream,
    letterSpacing: -0.8,
    marginTop: 3,
  },
  titleDot: { color: COLORS.gold },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#1B2116",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: "#76603766",
    padding: 10,
    borderRadius: 13,
  },
  bestText: { color: COLORS.gold, fontWeight: "800", fontSize: 12 },
  liveHud: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: -8,
    paddingHorizontal: 3,
  },
  scoreBlock: { flex: 1.4 },
  score: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.cream,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.6,
  },
  micro: { color: "#B9BDAA", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  comboBlock: { flex: 1, alignItems: "center", gap: 5 },
  combo: { color: COLORS.gold, fontSize: 23, fontWeight: "900" },
  comboTrack: {
    width: 60,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#3C3825",
    overflow: "hidden",
  },
  comboFill: { height: "100%", backgroundColor: COLORS.gold },
  vitals: { flex: 1, alignItems: "flex-end", gap: 3 },
  time: {
    color: COLORS.cream,
    fontSize: 27,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  seconds: { color: COLORS.muted, fontSize: 13 },
  grit: { flexDirection: "row", gap: 4 },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: -9,
  },
  zoneText: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: "900",
    flexShrink: 1,
  },
  zoneSegments: { flexDirection: "row", gap: 4 },
  zoneSegment: { width: 19, height: 3, borderRadius: 3 },
  activeArena: { flex: 1, minHeight: 160, marginTop: -8 },
  arenaHud: { ...StyleSheet.absoluteFill, padding: 12 },
  arenaGoal: { flexDirection: "row", alignItems: "center", gap: 6 },
  goalText: { color: COLORS.cream, flex: 1, fontSize: 10, fontWeight: "800" },
  goalCount: { fontSize: 10, fontWeight: "900", color: COLORS.gold },
  goalTrack: {
    height: 2,
    backgroundColor: "#5F4E2A",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 7,
  },
  goalFill: { height: "100%", backgroundColor: COLORS.gold },
  notice: {
    alignSelf: "center",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: "#080C07ED",
    borderWidth: 1,
    borderColor: "#6A623977",
    gap: 3,
  },
  noticeTitle: {
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  noticeDetail: { color: COLORS.cream, fontSize: 10, textAlign: "center" },
  powerRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  powerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 6,
    backgroundColor: "#080C07DD",
    borderRadius: 9,
  },
  powerText: { fontSize: 10, fontWeight: "800" },
  swipeHint: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    color: "#E0D4B5",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  lobbyOverlay: { ...StyleSheet.absoluteFill },
  lobbyContent: { padding: 23, gap: 16 },
  modeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: "#AE833322",
    borderWidth: 1,
    borderColor: "#C7A55755",
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  tagText: {
    color: "#EDD9A4",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 37,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -1.4,
    color: COLORS.cream,
  },
  gold: { color: COLORS.gold },
  heroCopy: { color: "#C8C7B7", fontSize: 13, lineHeight: 20 },
  lobbyFacts: { flexDirection: "row", flexWrap: "wrap", gap: 13 },
  fact: { flexDirection: "row", alignItems: "center", gap: 4 },
  factText: { color: "#DAD5C1", fontSize: 11, fontWeight: "700" },
  lobbyHint: { color: "#C8C7B7", textAlign: "center", fontSize: 10 },
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#050B0677",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownMicro: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 3,
  },
  countdownNumber: {
    color: COLORS.cream,
    fontSize: 100,
    fontWeight: "900",
    lineHeight: 118,
  },
  countdownCopy: { color: COLORS.cream, fontSize: 13 },
  resultOverlay: { ...StyleSheet.absoluteFill, backgroundColor: "#060C08F2" },
  resultContent: {
    flexGrow: 1,
    padding: 23,
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
  },
  resultTitle: {
    color: COLORS.cream,
    fontWeight: "900",
    fontSize: 30,
    lineHeight: 33,
    textAlign: "center",
    letterSpacing: -0.8,
  },
  rankDisc: {
    alignItems: "center",
    justifyContent: "center",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: "#D1AC55",
    backgroundColor: "#C7982422",
  },
  rankLetter: {
    color: COLORS.gold,
    fontSize: 46,
    lineHeight: 52,
    fontWeight: "900",
  },
  rankLabel: {
    color: "#D6C495",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  resultScore: {
    fontSize: 35,
    fontWeight: "900",
    color: COLORS.gold,
    fontVariant: ["tabular-nums"],
  },
  resultPoints: { fontSize: 11, color: COLORS.muted, letterSpacing: 2 },
  resultStats: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  resultStat: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 5,
  },
  resultValue: {
    color: COLORS.cream,
    fontWeight: "900",
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },
  resultTip: {
    fontSize: 12,
    lineHeight: 18,
    color: "#C8C7B7",
    textAlign: "center",
  },
  controls: { flexDirection: "row", gap: 10 },
  control: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#181E13",
    borderWidth: 1,
    borderColor: "#494D32",
    gap: 1,
  },
  controlText: {
    color: COLORS.cream,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  burstButton: {
    flex: 1.35,
    minHeight: 60,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#876B35",
    backgroundColor: "#312611",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: 9,
  },
  burstReady: { backgroundColor: COLORS.gold, borderColor: "#FFE7A0" },
  burstLabel: {
    color: COLORS.gold,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1,
  },
  energyTrack: {
    width: "85%",
    height: 3,
    borderRadius: 3,
    backgroundColor: "#FFFFFF22",
    overflow: "hidden",
  },
  energyFill: { height: "100%", backgroundColor: COLORS.gold },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.38 },
  status: {
    textAlign: "center",
    color: "#B9BDAA",
    fontSize: 10,
    lineHeight: 14,
    marginTop: -12,
  },
  dailyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 19,
    backgroundColor: "#292210",
    borderWidth: 1,
    borderColor: "#AE883A55",
  },
  dailyIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C19C3022",
  },
  dailyCopy: { flex: 1, gap: 5 },
  dailyTitle: { color: COLORS.cream, fontWeight: "800", fontSize: 14 },
  dailyNote: { color: "#B9BDAA", fontSize: 10, lineHeight: 15 },
  sectionTitle: {
    color: COLORS.cream,
    fontWeight: "900",
    fontSize: 19,
    marginTop: 3,
    letterSpacing: -0.3,
  },
  guideRow: { flexDirection: "row", gap: 17 },
  guide: { flex: 1, gap: 5, paddingTop: 6 },
  guideTitle: { color: COLORS.cream, fontSize: 12, fontWeight: "800" },
  guideCopy: { color: "#B9BDAA", fontSize: 11, lineHeight: 17 },
  settings: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  setting: {
    flex: 1,
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: "#141B10",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingLabel: { flex: 1, fontSize: 11, color: COLORS.cream },
  settingValue: { fontSize: 10, color: COLORS.muted, fontWeight: "900" },
  recordHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  },
  resetButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  recordGrid: {
    flexDirection: "row",
    paddingVertical: 13,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  privateNote: {
    color: "#B9BDAA",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  body: { color: COLORS.cream, fontSize: 13, lineHeight: 20 },
});
