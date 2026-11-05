import { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EXPEDITION_KEY } from '@/game/expedition/profile';

const OfflineGame = requireNativeViewManager('MadgerOfflineGame');
const loadError = 'Your saved Expedition could not be loaded. Retry opening the game; no records have been changed.';
const backupError = 'The Expedition is saved in its local game storage, but the native backup could not be updated. Retry before continuing.';

type HostEvent = { nativeEvent: { message: string } };

export default function AndroidExpedition() {
  const router = useRouter(), insets = useSafeAreaInsets();
  const [initialStorage, setInitialStorage] = useState<string | null>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [error, setError] = useState(''), [recovering, setRecovering] = useState(false);
  const [backRequest, setBackRequest] = useState(0);
  const mounted = useRef(false), pending = useRef(Promise.resolve());
  const backupFailed = useRef(false), latestBackup = useRef<string | null>(null);
  const hasError = useRef(false), retrying = useRef(false);

  const showError = (message: string) => {
    hasError.current = true;
    if (mounted.current) setError(message);
  };

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(EXPEDITION_KEY).then(value => {
      if (mounted.current) setInitialStorage(JSON.stringify({ [EXPEDITION_KEY]: value }));
    }).catch(() => {
      hasError.current = true;
      if (mounted.current) setError(loadError);
    });
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasError.current) return false;
      setBackRequest(value => value + 1);
      return true;
    });
    return () => { mounted.current = false; subscription.remove(); back.remove(); };
  }, []);

  const retry = async () => {
    if (retrying.current) return;
    retrying.current = true;
    setRecovering(true);
    try {
      // The error screen has unmounted the WebView. Finish its existing writes
      // before retrying the newest backup, so an older save cannot win the race.
      await pending.current;
      if (backupFailed.current && latestBackup.current !== null) {
        await AsyncStorage.setItem(EXPEDITION_KEY, latestBackup.current);
        backupFailed.current = false;
      }
      const value = await AsyncStorage.getItem(EXPEDITION_KEY);
      if (!mounted.current) return;
      setInitialStorage(JSON.stringify({ [EXPEDITION_KEY]: value }));
      hasError.current = false;
      setError('');
    } catch {
      showError(backupFailed.current ? backupError : loadError);
    } finally {
      retrying.current = false;
      if (mounted.current) setRecovering(false);
    }
  };

  const message = ({ nativeEvent }: HostEvent) => {
    if (!mounted.current) return;
    try {
      const payload = JSON.parse(nativeEvent.message);
      if (payload.type === 'exit') {
        void pending.current.then(() => {
          if (mounted.current && !backupFailed.current && !hasError.current) router.replace('/legacy');
        });
        return;
      }
      if (payload.type === 'storage' && payload.key === EXPEDITION_KEY && typeof payload.value === 'string') {
        JSON.parse(payload.value);
        latestBackup.current = payload.value;
        pending.current = pending.current.then(() => AsyncStorage.setItem(EXPEDITION_KEY, payload.value)).catch(() => {
          backupFailed.current = true;
          showError(backupError);
        });
      }
    } catch {
      showError('The offline game sent an invalid local save. Retry opening the game; your previous save is retained.');
    }
  };

  if (error) return <View style={styles.message}>
    <Text accessibilityLiveRegion="polite" style={styles.text}>{error}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Retry offline Expedition" accessibilityState={{ disabled: recovering }} disabled={recovering} onPress={() => { void retry(); }} style={styles.action}>
      <Text style={styles.text}>{recovering ? 'Retrying…' : 'Retry offline Expedition'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Return to classic games" onPress={() => { void pending.current.then(() => { if (mounted.current) router.replace('/legacy'); }); }} style={styles.action}>
      <Text style={styles.text}>Return to classic games</Text>
    </Pressable>
  </View>;
  if (initialStorage === null) return <View style={styles.message}><Text style={styles.text}>Opening the 3D Expedition…</Text></View>;
  return <View style={{ flex: 1, backgroundColor: '#071813', paddingTop: insets.top, paddingBottom: insets.bottom }}>
    <OfflineGame style={{ flex: 1 }} active={active} backRequest={backRequest} initialStorage={initialStorage} onMessage={message} onError={({ nativeEvent }: HostEvent) => showError(nativeEvent.message)} />
  </View>;
}

const styles = StyleSheet.create({
  message: { flex: 1, backgroundColor: '#071813', justifyContent: 'center', padding: 24 },
  text: { color: '#F9EED6', fontSize: 18 },
  action: { minHeight: 48, justifyContent: 'center', marginTop: 16 },
});
