import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ActionButton, BrandHeader, Card, Pill, Screen } from '@/components/ui';
import { COLORS } from '@/constants/brand';
import { MAX_GRIT, ROUND_SECONDS, courseFor, crossesRunner, resolvePickup, scoreChase, emptyRecord, freshRun, multiplierFor, objectiveFor, objectiveValue, phaseFor, sanitizeRecord, type FieldRecord, type PickupType, type RunState } from '@/lib/burrowRun';

const RECORD_KEY = 'madger-burrow-run-native-v1';
const LANES = ['17%', '50%', '83%'] as const;
type Entity = { id: number; lane: number; type: PickupType; y: number; speed: number };
type Mode = 'ready' | 'running' | 'paused' | 'ended';

export default function PlayScreen() {
  const [mode, setMode] = useState<Mode>('ready');
  const [lane, setLane] = useState(1);
  const [run, setRun] = useState<RunState>(freshRun);
  const [remaining, setRemaining] = useState(ROUND_SECONDS);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [record, setRecord] = useState<FieldRecord>(emptyRecord);
  const [message, setMessage] = useState('Ready to dig?');
  const [recordReady, setRecordReady] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordError, setRecordError] = useState('');
  const recordRef = useRef<FieldRecord>(emptyRecord());
  const entitiesRef = useRef<Entity[]>([]);
  const modeRef = useRef<Mode>('ready');
  const { height, fontScale } = useWindowDimensions();
  const laneRef = useRef(1);
  const runRef = useRef<RunState>(freshRun());
  const elapsedRef = useRef(0);
  const waveRef = useRef(0);
  const protectionRef = useRef(0);
  const feedbackUntil = useRef(0);
  const [runBest, setRunBest] = useState(0);
  const entityId = useRef(0);
  const lastTick = useRef(0);
  const phaseRef = useRef('surface');
  const endingRef = useRef(false);
  const [today, setToday] = useState('');
  const objective = useMemo(() => objectiveFor(today ? Math.floor(Date.parse(today) / 86400000) : 0), [today]);
  const course = useMemo(() => courseFor(today ? Math.floor(Date.parse(today) / 86400000) : 0), [today]);
  const activeRun = mode === 'running' || mode === 'paused';
  const elapsed = ROUND_SECONDS - remaining;
  const phase = phaseFor(elapsed);
  const objectiveCurrent = objectiveValue(objective, run);
  const chase = scoreChase(run.score, runBest);

  const loadRecord = useCallback(() =>
    AsyncStorage.getItem(RECORD_KEY).then(value => {
      let saved: unknown = null;
      try { saved = value ? JSON.parse(value) : null; } catch { /* Malformed local data starts a fresh record. */ }
      const next = sanitizeRecord(saved);
      setToday(new Date().toISOString().slice(0, 10));
      recordRef.current = next; setRecord(next); setRecordReady(true); setRecordError('');
    }).catch(() => setRecordError('Your field record could not be loaded. Retry before starting a run.'))
  , []);
  useEffect(() => { void loadRecord(); }, [loadRecord]);

  const saveRecord = useCallback(async (next: FieldRecord) => {
    setRecordSaving(true);
    try { await AsyncStorage.setItem(RECORD_KEY, JSON.stringify(next)); setRecordError(''); }
    catch { setRecordError('Your latest record is only in memory. Retry saving before closing the app.'); }
    finally { setRecordSaving(false); }
  }, []);

  const finishRun = useCallback((reason: 'time' | 'grit') => {
    if (endingRef.current) return;
    endingRef.current = true;
    const finalRun = runRef.current;
    const markCleared = objectiveValue(objective, finalRun) >= objective.target;
    setMode('ended');
    modeRef.current = 'ended';
    setEntities([]);
    entitiesRef.current = [];
    const previous = recordRef.current;
    setMessage(finalRun.score > previous.bestScore ? 'Personal best!' : reason === 'time' ? 'Tunnel cleared!' : 'One more dig?');
      const next = sanitizeRecord({
        runs: previous.runs + 1,
        signals: previous.signals + finalRun.signals,
        bestScore: Math.max(previous.bestScore, finalRun.score),
        bestStreak: Math.max(previous.bestStreak, finalRun.bestStreak),
        marks: markCleared ? [...previous.marks, today] : previous.marks,
      });
    recordRef.current = next; setRecord(next);
    void saveRecord(next);
    void Haptics.notificationAsync(reason === 'time' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [objective, today, saveRecord]);

  useEffect(() => {
    if (mode !== 'running') return;
    lastTick.current = 0;
    let frame: number;
    const tick = (now: number) => {
      if (modeRef.current !== 'running') return;
      const delta = lastTick.current ? Math.min((now - lastTick.current) / 1000, 0.05) : 0;
      lastTick.current = now;
      elapsedRef.current += delta;
      const nextRemaining = Math.max(0, ROUND_SECONDS - elapsedRef.current);
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) { finishRun('time'); return; }

      const currentPhase = phaseFor(elapsedRef.current);
      if (currentPhase.id !== phaseRef.current) {
        phaseRef.current = currentPhase.id;
        setMessage(`${currentPhase.label} • SPEED UP`);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
      while (waveRef.current < course.length && course[waveRef.current].at <= elapsedRef.current) {
        const wave = course[waveRef.current++];
        const age = Math.max(0, elapsedRef.current - delta - wave.at);
        const additions = wave.items.map(item => ({ id: entityId.current++, lane: item.lane, type: item.type, y: -0.1 + item.offset + wave.speed * age, speed: wave.speed }));
        entitiesRef.current = [...entitiesRef.current, ...additions];
      }
      if (feedbackUntil.current && elapsedRef.current >= feedbackUntil.current) {
        setMessage('Catch at the line · tap a lane or use the arrows'); feedbackUntil.current = 0;
      }

        let nextRun = runRef.current;
        const survivors: Entity[] = [];
        for (const entity of entitiesRef.current) {
          const moved = { ...entity, y: entity.y + entity.speed * delta };
          if (crossesRunner(entity.y, moved.y) && moved.lane === laneRef.current) {
            const previous = nextRun;
            const result = resolvePickup(nextRun, moved.type, elapsedRef.current, protectionRef.current);
            nextRun = result.run; protectionRef.current = result.protectedUntil;
            if (result.ignored) continue;
            const comboUp = multiplierFor(nextRun.streak) > multiplierFor(previous.streak);
            setMessage(moved.type === 'noise' ? 'Hit! Recovery shield · keep moving' : comboUp ? `×${multiplierFor(nextRun.streak)} COMBO!` : moved.type === 'boost' ? (previous.grit < MAX_GRIT ? '+250 · GRIT RECOVERED' : '+250') : `+${nextRun.score - previous.score}`);
            feedbackUntil.current = elapsedRef.current + 0.7;
            if (moved.type === 'noise') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            else if (comboUp) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            if (nextRun.grit <= 0) break;
          } else if (moved.y <= 1.08) survivors.push(moved);
        }
        if (nextRun !== runRef.current) {
          runRef.current = nextRun;
          setRun(nextRun);
          if (nextRun.grit <= 0) { finishRun('grit'); return; }
        }
        entitiesRef.current = survivors;
        setEntities(survivors);
        frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [course, finishRun, mode]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' && modeRef.current === 'running') { modeRef.current = 'paused'; setMode('paused'); setMessage('Run paused. Resume when you’re ready.'); }
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(useCallback(() => () => {
    if (modeRef.current === 'running') { modeRef.current = 'paused'; setMode('paused'); setMessage('Run paused. Resume when you’re ready.'); }
  }, []));

  function startRun() {
    if (!recordReady || recordSaving || !today) return;
    const initial = freshRun();
    setToday(new Date().toISOString().slice(0, 10));
    setRunBest(recordRef.current.bestScore);
    endingRef.current = false;
    laneRef.current = 1;
    runRef.current = initial;
    elapsedRef.current = 0;
    phaseRef.current = 'surface';
    waveRef.current = 0; protectionRef.current = 0; feedbackUntil.current = 0;
    entitiesRef.current = []; modeRef.current = 'running';
    setLane(1); setRun(initial); setRemaining(ROUND_SECONDS); setEntities([]); setMessage('Catch at the line · tap a lane or use the arrows'); setMode('running');
  }

  function move(direction: -1 | 1) {
    if (modeRef.current !== 'running') return;
    selectLane(Math.max(0, Math.min(2, laneRef.current + direction)));
  }

  function selectLane(next: number) {
    if (modeRef.current !== 'running' || next === laneRef.current) return;
    laneRef.current = next; setLane(next);
    void Haptics.selectionAsync().catch(() => {});
  }

  function togglePause() {
    if (modeRef.current === 'running') { modeRef.current = 'paused'; setMode('paused'); setMessage('Run paused.'); }
    else if (modeRef.current === 'paused') { modeRef.current = 'running'; lastTick.current = 0; setMode('running'); setMessage(phaseFor(elapsedRef.current).label); }
  }

  function resetRecord() {
    if (!recordReady || recordSaving || modeRef.current === 'running' || modeRef.current === 'paused') return;
    Alert.alert('Reset field record?', 'This permanently removes Burrow Run progress stored on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        setRecordSaving(true);
        try {
          await AsyncStorage.removeItem(RECORD_KEY);
          recordRef.current = emptyRecord(); setRecord(recordRef.current); setRecordError('');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch { Alert.alert('Record not reset', 'Your field record has been kept. Please try again.'); }
        finally { setRecordSaving(false); }
      } },
    ]);
  }

  return <Screen scroll={!activeRun} footer={<View style={styles.controls}><Control icon="arrow-left" label="LEFT" disabled={mode !== 'running' || lane === 0} onPress={() => move(-1)} /><Control icon={mode === 'paused' ? 'play' : 'pause'} label={mode === 'paused' ? 'RESUME' : 'PAUSE'} disabled={mode !== 'running' && mode !== 'paused'} onPress={togglePause} /><Control icon="arrow-right" label="RIGHT" disabled={mode !== 'running' || lane === 2} onPress={() => move(1)} /></View>}>
    {activeRun ? <Text accessibilityRole="header" style={styles.missionValue}>Burrow Run · {phase.label}</Text> : <BrandHeader eyebrow="Native field game" title="Burrow Run" subtitle="Find the signal. Dodge the noise. Keep digging." />}
    <View style={styles.hud}>
      <Stat label="SCORE" value={String(run.score).padStart(4, '0')} gold />
      <Stat label="MULTI" value={`×${multiplierFor(run.streak)}`} gold />
      <Stat label="TIME" value={remaining.toFixed(1)} />
      <Stat label="GRIT" value={`${'◆'.repeat(run.grit)}${'◇'.repeat(MAX_GRIT - run.grit)}`} danger />
    </View>
    <View style={styles.chase}><Text style={styles.chaseText}>{chase.label} · {chase.gap.toLocaleString()} TO GO</Text><Text style={styles.micro}>{multiplierFor(run.streak) === 5 ? 'MAX COMBO' : `${5 - run.streak % 5} TO ×${multiplierFor(run.streak) + 1}`}</Text></View>
    {!activeRun ? <View style={styles.mission}><View><Text style={styles.micro}>ZONE</Text><Text style={styles.missionValue}>{phase.label}</Text></View><View style={styles.objective}><Text style={styles.micro}>DAILY FIELD MARK</Text><Text style={styles.missionValue}>{objective.label}</Text><Text style={styles.progress}>{Math.min(objectiveCurrent, objective.target)} / {objective.target}</Text></View></View> : null}
    <View style={[styles.field, activeRun ? { flex: 1, height: undefined, marginTop: 0 } : { height: Math.max(300, Math.min(390, height * 0.45)) + Math.max(0, fontScale - 1) * 60 }]} accessibilityLabel="Three-lane Burrow Run game field">
      <View style={[styles.laneLine, { left: '33%' }]} /><View style={[styles.laneLine, { left: '66%' }]} />
      <View style={styles.laneTargets}>{[0, 1, 2].map(index => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Move to ${['left', 'middle', 'right'][index]} lane`} disabled={mode !== 'running'} onPress={() => selectLane(index)} style={styles.laneTarget}><Text style={styles.laneLabel}>{['LEFT', 'MIDDLE', 'RIGHT'][index]}</Text></Pressable>)}</View>
      <View pointerEvents="none" style={styles.catchLine} />
      {entities.map(entity => <View pointerEvents="none" accessible={false} key={entity.id} style={[styles.pickup, styles[entity.type], { left: LANES[entity.lane], top: `${entity.y * 100}%` }]}><MaterialCommunityIcons name={entity.type === 'signal' ? 'check-bold' : entity.type === 'noise' ? 'alert' : 'diamond-stone'} color={entity.type === 'signal' ? COLORS.background : COLORS.cream} size={22} /></View>)}
      <View pointerEvents="none" style={[styles.runner, { left: LANES[lane] }, activeRun && elapsed < protectionRef.current && styles.recovering]}><View style={styles.runnerGlow} /><Image source={require('../../../assets/images/madger-logo-transparent.png')} style={styles.runnerImage} /></View>
      {mode !== 'running' ? <ScrollView style={styles.overlay} contentContainerStyle={styles.overlayContent}><Pill tone="gold">{mode === 'paused' ? 'RUN PAUSED' : `DAILY COURSE · ${today || 'LOADING'}`}</Pill><Text style={styles.overlayTitle}>{mode === 'ended' ? message : mode === 'paused' ? 'Stay sharp.' : 'Ready to dig?'}</Text>{mode === 'ended' ? <View style={styles.report}><Text style={styles.reportText}>{chase.medal} · {run.score.toLocaleString()} points</Text><Text style={styles.reportText}>{run.signals} signals</Text><Text style={styles.reportText}>Best streak {run.bestStreak}</Text></View> : null}<Text style={styles.overlayCopy}>{mode === 'ended' ? `${chase.gap.toLocaleString()} more for ${chase.label.toLowerCase()}. Same course today. Learn the line and beat it.` : 'Catch gold signals at the line. Dodge red noise. Tap a lane or use the arrows. Chain five signals for a bigger multiplier.'}</Text><ActionButton label={!recordReady ? 'Loading field record…' : recordSaving ? 'Saving record…' : mode === 'paused' ? 'Resume run' : mode === 'ended' ? 'Retry this course' : 'Start run'} icon="play" disabled={!recordReady || recordSaving} onPress={mode === 'paused' ? togglePause : startRun} /></ScrollView> : null}
    </View>
    <Text accessibilityLiveRegion={activeRun ? "none" : "polite"} style={styles.status}>{message}</Text>
    {!activeRun ? <Card>{recordError ? <View style={{ gap: 12 }}><Text accessibilityRole="alert" style={styles.privateNote}>{recordError}</Text><ActionButton label={recordReady ? 'Retry saving record' : 'Retry loading record'} icon="refresh" onPress={() => recordReady ? saveRecord(recordRef.current) : loadRecord()} disabled={recordSaving} secondary /></View> : null}<View style={styles.recordHead}><View><Text style={styles.micro}>PRIVATE / ON THIS DEVICE</Text><Text style={styles.recordTitle}>Your field record</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Reset field record" accessibilityState={{ disabled: !recordReady || recordSaving }} disabled={!recordReady || recordSaving} onPress={resetRecord} style={styles.resetButton}><Text style={styles.reset}>RESET</Text></Pressable></View><View style={styles.recordGrid}><Stat label="RUNS" value={String(record.runs)} /><Stat label="SIGNALS" value={String(record.signals)} gold /><Stat label="BEST" value={String(record.bestScore)} /><Stat label="MARKS" value={String(record.marks.length)} /></View><Text style={styles.privateNote}>No account. No leaderboard. No data leaves this app.</Text></Card> : null}
  </Screen>;
}

function Stat({ label, value, gold, danger }: { label: string; value: string; gold?: boolean; danger?: boolean }) { return <View style={styles.stat}><Text style={styles.micro}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, gold && styles.gold, danger && styles.danger]}>{value}</Text></View>; }
function Control({ icon, label, onPress, disabled }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void; disabled: boolean }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.control, disabled && styles.disabled, pressed && styles.pressed]}><MaterialCommunityIcons name={icon} color={COLORS.cream} size={25} /><Text style={styles.controlText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  chase: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginTop: -12, paddingHorizontal: 6 }, chaseText: { color: COLORS.gold, fontSize: 11, fontWeight: '900' },
  laneTargets: { ...StyleSheet.absoluteFill, flexDirection: 'row' }, laneTarget: { flex: 1, paddingTop: 12, alignItems: 'center' }, laneLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  catchLine: { position: 'absolute', top: '84%', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: COLORS.muted }, recovering: { borderWidth: 3, borderColor: COLORS.cream, borderRadius: 32, backgroundColor: 'rgba(242,234,217,0.15)' },
  hud: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: 'hidden', backgroundColor: COLORS.surface }, stat: { flex: 1, minWidth: 0, padding: 10, borderRightWidth: 1, borderColor: COLORS.border }, micro: { color: COLORS.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, statValue: { color: COLORS.cream, fontSize: 19, fontWeight: '900', marginTop: 4, fontVariant: ['tabular-nums'] }, gold: { color: COLORS.gold }, danger: { color: COLORS.danger, fontSize: 15 },
  mission: { marginTop: -12, padding: 12, borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.border, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: COLORS.surfaceRaised, gap: 10 }, missionValue: { color: COLORS.gold, fontSize: 11, fontWeight: '900', letterSpacing: 0.7, marginTop: 3 }, objective: { borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 9 }, progress: { marginTop: 6, color: COLORS.cream, fontSize: 11, fontWeight: '900' },
  field: { height: 390, marginTop: -20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, backgroundColor: '#070A05' }, laneLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,201,40,0.15)' }, pickup: { position: 'absolute', width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2 }, signal: { backgroundColor: COLORS.gold, borderColor: '#FFE999' }, noise: { backgroundColor: '#42160F', borderColor: COLORS.danger, borderRadius: 8 }, boost: { backgroundColor: '#668D23', borderColor: COLORS.lime, borderRadius: 12 }, runner: { position: 'absolute', top: '84%', width: 64, height: 64, marginLeft: -32, marginTop: -32 }, runnerGlow: { position: 'absolute', inset: 13, borderRadius: 30, backgroundColor: 'rgba(255,201,40,0.34)' }, runnerImage: { width: 64, height: 64, resizeMode: 'contain' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(3,5,0,0.88)' }, overlayContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }, overlayTitle: { color: COLORS.cream, fontSize: 38, lineHeight: 42, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', marginTop: 14 }, overlayCopy: { color: COLORS.muted, textAlign: 'center', fontSize: 14, lineHeight: 21, marginVertical: 14 }, start: { minHeight: 52, minWidth: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 14, borderRadius: 14, backgroundColor: COLORS.gold }, startText: { color: COLORS.background, fontSize: 14, fontWeight: '900', letterSpacing: 1 }, report: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginVertical: 12 }, reportText: { color: COLORS.gold, fontWeight: '900' },
  controls: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, overflow: 'hidden' }, control: { flex: 1, minHeight: 56, padding: 8, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: COLORS.surface }, controlText: { color: COLORS.cream, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, pressed: { opacity: 0.65, backgroundColor: COLORS.surfaceRaised }, status: { color: COLORS.muted, textAlign: 'center', fontSize: 12, marginTop: -10 }, disabled: { opacity: 0.45 }, resetButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, recordHead: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' }, recordTitle: { color: COLORS.cream, fontSize: 22, fontWeight: '900', marginTop: 4 }, reset: { color: COLORS.danger, fontSize: 11, fontWeight: '900', padding: 10 }, recordGrid: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: 'hidden' }, privateNote: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
});
