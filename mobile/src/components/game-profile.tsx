import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createGameStore } from "@/lib/gameStore";
const Context = createContext<ReturnType<typeof createGameStore> | null>(null);
export function GameProfileProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => createGameStore(AsyncStorage));
  useEffect(() => { void store.init(); }, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useGameProfile() {
  const store = useContext(Context);
  if (!store) throw new Error("GameProfileProvider is missing");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...snapshot, bankRun: store.bankRun, checkpointRun: store.checkpointRun, setPreferences: store.setPreferences, retry: store.retry, resetProgress: store.resetProgress, setRunActive: store.setRunActive };
}
export function useGameDay() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  useEffect(() => {
    const refresh = () => setDay(new Date().toISOString().slice(0, 10));
    const timer = setInterval(refresh, 30000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return day;
}
