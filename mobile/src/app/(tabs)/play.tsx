import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { BrandHeader, Card, Pill, Screen } from '@/components/ui';
import { COLORS } from '@/constants/brand';
import { MAX_GRIT, ROUND_SECONDS, applyPickup, createWave, emptyRecord, freshRun, multiplierFor, objectiveFor, objectiveValue, phaseFor, sanitizeRecord, type FieldRecord, type PickupType, type RunState } from '@/lib/burrowRun';

const RECORD_KEY = 'madger-burrow-run-native-v1';
const LANES = ['17%', '50%', '83%'] as const;
type Entity = { id: number; lane: number; type: PickupType; y: number };
type Mode = 'ready' | 'running' | 'paused' | 'ended';

export default function PlayScreen() {
  const [mode, setMode] = useState<Mode>('ready');
  const [lane, setLane] = useState(1);
  const [run, setRun] = useState<RunState>(freshRun);
  const [remaining, setRemaining] = useState(ROUND_SECONDS);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [record, setRecord] = useState<FieldRecord>(emptyRecord);
  const [message, setMessage] = useState('Ready to dig?');
  const laneRef = useRef(1);
  const runRef = useRef<RunState>(freshRun());
  const elapsedRef = useRef(0);
  const spawnRef = useRef(0.65);
  const entityId = useRef(0);
  const lastTick = useRef(0);
  const phaseRef = useRef('surface');
  const endingRef = useRef(false);
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10));
  const objective = useMemo(() => objectiveFor(Math.floor(Date.parse(today) / 86400000)), [today]);
  const elapsed = ROUND_SECONDS - remaining;
  const phase = phaseFor(elapsed);
  const objectiveCurrent = objectiveValue(objective, run);

  useEffect(() => {
    AsyncStorage.getItem(RECORD_KEY).then(value => setRecord(sanitizeRecord(value ? JSON.parse(value) : null))).catch(() => setRecord(emptyRecord()));
  }, []);

  const finishRun = useCallback((reason: 'time' | 'grit') => {
    if (endingRef.current) return;
    endingRef.current = true;
    const finalRun = runRef.current;
    const markCleared = objectiveValue(objective, finalRun) >= objective.target;
    setMode('ended');
    setEntities([]);
    setMessage(reason === 'time' ? 'Run complete.' : 'Buried in noise.');
    setRecord(previous => {
      const next = sanitizeRecord({
        runs: previous.runs + 1,
        signals: previous.signals + finalRun.signals,
        bestScore: Math.max(previous.bestScore, finalRun.score),
        bestStreak: Math.max(previous.bestStreak, finalRun.bestStreak),
        marks: markCleared ? [...previous.marks, today] : previous.marks,
      });
      AsyncStorage.setItem(RECORD_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    void Haptics.notificationAsync(reason === 'time' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  }, [objective, today]);

  useEffect(() => {
    if (mode !== 'running') return;
    lastTick.current = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const delta = Math.min((now - lastTick.current) / 1000, 0.1);
      lastTick.current = now;
      elapsedRef.current += delta;
      const nextRemaining = Math.max(0, ROUND_SECONDS - elapsedRef.current);
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) { finishRun('time'); return; }

      const currentPhase = phaseFor(elapsedRef.current);
      if (currentPhase.id !== phaseRef.current) {
        phaseRef.current = currentPhase.id;
        setMessage(`${currentPhase.label} • SPEED UP`);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      spawnRef.current -= delta;
      if (spawnRef.current <= 0) {
        const additions = createWave(Math.random, elapsedRef.current).map(item => ({ id: entityId.current++, lane: item.lane, type: item.type, y: -0.1 + item.offset }));
        setEntities(current => [...current, ...additions]);
        spawnRef.current = currentPhase.interval + Math.random() * 0.24;
      }

      setEntities(current => {
        let nextRun = runRef.current;
        const survivors: Entity[] = [];
        for (const entity of current) {
          const moved = { ...entity, y: entity.y + currentPhase.speed * delta };
          if (moved.y >= 0.76 && moved.y <= 0.94 && moved.lane === laneRef.current) {
            nextRun = applyPickup(nextRun, moved.type);
            if (moved.type === 'noise') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else if (moved.y <= 1.08) survivors.push(moved);
        }
        if (nextRun !== runRef.current) {
          runRef.current = nextRun;
          setRun(nextRun);
          if (nextRun.grit <= 0) setTimeout(() => finishRun('grit'), 0);
        }
        return survivors;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [finishRun, mode]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') setMode(current => current === 'running' ? 'paused' : current);
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(useCallback(() => () => {
    setMode(current => current === 'running' ? 'paused' : current);
  }, []));

  function startRun() {
    setToday(new Date().toISOString().slice(0, 10));
    const initial = freshRun();
    endingRef.current = false;
    laneRef.current = 1;
    runRef.current = initial;
    elapsedRef.current = 0;
    phaseRef.current = 'surface';
    spawnRef.current = 0.65;
    setLane(1); setRun(initial); setRemaining(ROUND_SECONDS); setEntities([]); setMessage('Upper Tunnel'); setMode('running');
  }

  function move(direction: -1 | 1) {
    if (mode !== 'running') return;
    const next = Math.max(0, Math.min(2, laneRef.current + direction));
    laneRef.current = next; setLane(next);
    void Haptics.selectionAsync();
  }

  function togglePause() {
    if (mode === 'running') { setMode('paused'); setMessage('Run paused.'); }
    else if (mode === 'paused') { lastTick.current = Date.now(); setMode('running'); setMessage(phaseFor(elapsedRef.current).label); }
  }

  function resetRecord() {
    Alert.alert('Reset field record?', 'This permanently removes Burrow Run progress stored on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => {
        AsyncStorage.removeItem(RECORD_KEY).catch(() => {});
        setRecord(emptyRecord());
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } },
    ]);
  }

  return <Screen>
    <BrandHeader eyebrow="Native field game" title="Burrow Run" subtitle="Find the signal. Dodge the noise. Keep digging." />
    <View style={styles.hud}>
      <Stat label="SCORE" value={String(run.score).padStart(4, '0')} gold />
      <Stat label="MULTI" value={`×${multiplierFor(run.streak)}`} gold />
      <Stat label="TIME" value={remaining.toFixed(1)} />
      <Stat label="GRIT" value={`${'◆'.repeat(run.grit)}${'◇'.repeat(MAX_GRIT - run.grit)}`} danger />
    </View>
    <View style={styles.mission}><View><Text style={styles.micro}>ZONE</Text><Text style={styles.missionValue}>{phase.label}</Text></View><View style={styles.objective}><Text style={styles.micro}>DAILY FIELD MARK</Text><Text style={styles.missionValue}>{objective.label}</Text><Text style={styles.progress}>{Math.min(objectiveCurrent, objective.target)} / {objective.target}</Text></View></View>
    <View style={styles.field} accessibilityLabel="Three-lane Burrow Run game field">
      <View style={[styles.laneLine, { left: '33%' }]} /><View style={[styles.laneLine, { left: '66%' }]} />
      {entities.map(entity => <View key={entity.id} style={[styles.pickup, styles[entity.type], { left: LANES[entity.lane], top: `${entity.y * 100}%` }]}><MaterialCommunityIcons name={entity.type === 'signal' ? 'check-bold' : entity.type === 'noise' ? 'alert' : 'diamond-stone'} color={entity.type === 'signal' ? COLORS.background : COLORS.cream} size={22} /></View>)}
      <View style={[styles.runner, { left: LANES[lane] }]}><View style={styles.runnerGlow} /><Image source={require('../../../assets/images/madger-logo-transparent.png')} style={styles.runnerImage} /></View>
      {mode !== 'running' ? <View style={styles.overlay}><Pill tone="gold">{mode === 'paused' ? 'RUN PAUSED' : 'LOCAL • NO WALLET'}</Pill><Text style={styles.overlayTitle}>{mode === 'ended' ? message : mode === 'paused' ? 'Stay sharp.' : 'Ready to dig?'}</Text>{mode === 'ended' ? <View style={styles.report}><Text style={styles.reportText}>{run.signals} signals</Text><Text style={styles.reportText}>Best streak {run.bestStreak}</Text></View> : <Text style={styles.overlayCopy}>Collect gold signals. Avoid red noise. Three hits ends the run.</Text>}<Pressable accessibilityRole="button" onPress={mode === 'paused' ? togglePause : startRun} style={styles.start}><Text style={styles.startText}>{mode === 'paused' ? 'RESUME RUN' : mode === 'ended' ? 'RUN AGAIN' : 'START RUN'} →</Text></Pressable></View> : null}
    </View>
    <View style={styles.controls}><Control icon="arrow-left" label="LEFT" onPress={() => move(-1)} /><Control icon={mode === 'paused' ? 'play' : 'pause'} label={mode === 'paused' ? 'RESUME' : 'PAUSE'} onPress={togglePause} /><Control icon="arrow-right" label="RIGHT" onPress={() => move(1)} /></View>
    <Text accessibilityLiveRegion="polite" style={styles.status}>{message}</Text>
    <Card><View style={styles.recordHead}><View><Text style={styles.micro}>PRIVATE / ON THIS DEVICE</Text><Text style={styles.recordTitle}>Your field record</Text></View><Pressable accessibilityRole="button" onPress={resetRecord}><Text style={styles.reset}>RESET</Text></Pressable></View><View style={styles.recordGrid}><Stat label="RUNS" value={String(record.runs)} /><Stat label="SIGNALS" value={String(record.signals)} gold /><Stat label="BEST" value={String(record.bestScore)} /><Stat label="MARKS" value={String(record.marks.length)} /></View><Text style={styles.privateNote}>No account. No leaderboard. No data leaves this app.</Text></Card>
  </Screen>;
}

function Stat({ label, value, gold, danger }: { label: string; value: string; gold?: boolean; danger?: boolean }) { return <View style={styles.stat}><Text style={styles.micro}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, gold && styles.gold, danger && styles.danger]}>{value}</Text></View>; }
function Control({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.control, pressed && styles.pressed]}><MaterialCommunityIcons name={icon} color={COLORS.cream} size={25} /><Text style={styles.controlText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.surface }, stat: { flex: 1, minWidth: 0, padding: 10, borderRightWidth: 1, borderColor: COLORS.border }, micro: { color: COLORS.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, statValue: { color: COLORS.cream, fontSize: 19, fontWeight: '900', marginTop: 4, fontVariant: ['tabular-nums'] }, gold: { color: COLORS.gold }, danger: { color: COLORS.danger, fontSize: 15 },
  mission: { marginTop: -20, padding: 12, borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.border, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: COLORS.surfaceRaised, gap: 10 }, missionValue: { color: COLORS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 0.7, marginTop: 3 }, objective: { borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 9 }, progress: { position: 'absolute', right: 0, bottom: 0, color: COLORS.cream, fontSize: 11, fontWeight: '900' },
  field: { height: 390, marginTop: -20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, backgroundColor: '#070A05' }, laneLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,201,40,0.15)' }, pickup: { position: 'absolute', width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2 }, signal: { backgroundColor: COLORS.gold, borderColor: '#FFE999' }, noise: { backgroundColor: '#42160F', borderColor: COLORS.danger }, boost: { backgroundColor: '#668D23', borderColor: COLORS.lime, borderRadius: 12 }, runner: { position: 'absolute', bottom: 16, width: 72, height: 72, marginLeft: -36 }, runnerGlow: { position: 'absolute', inset: 13, borderRadius: 30, backgroundColor: 'rgba(255,201,40,0.34)' }, runnerImage: { width: 72, height: 72, resizeMode: 'contain' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(3,5,0,0.88)' }, overlayTitle: { color: COLORS.cream, fontSize: 38, lineHeight: 42, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', marginTop: 14 }, overlayCopy: { color: COLORS.muted, textAlign: 'center', fontSize: 14, lineHeight: 21, marginVertical: 14 }, start: { minHeight: 52, minWidth: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 14, borderRadius: 14, backgroundColor: COLORS.gold }, startText: { color: COLORS.background, fontSize: 14, fontWeight: '900', letterSpacing: 1 }, report: { flexDirection: 'row', gap: 18, marginVertical: 12 }, reportText: { color: COLORS.gold, fontWeight: '900' },
  controls: { flexDirection: 'row', marginTop: -20, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, overflow: 'hidden' }, control: { flex: 1, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: COLORS.surface }, controlText: { color: COLORS.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, pressed: { opacity: 0.65, backgroundColor: COLORS.surfaceRaised }, status: { color: COLORS.muted, textAlign: 'center', fontSize: 12, marginTop: -10 }, recordHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, recordTitle: { color: COLORS.cream, fontSize: 22, fontWeight: '900', marginTop: 4 }, reset: { color: COLORS.danger, fontSize: 11, fontWeight: '900', padding: 10 }, recordGrid: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: 'hidden' }, privateNote: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
});
