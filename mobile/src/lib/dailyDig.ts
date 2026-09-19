import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyDig, nextDig, sanitizeDig, type DigState } from './dailyDigState';
export { dayKey, visibleStreak, type DigState } from './dailyDigState';

const KEY = '@madger/daily-dig';

export async function readDig(): Promise<DigState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return emptyDig();
  try { return sanitizeDig(JSON.parse(raw)); } catch { return emptyDig(); }
}

export async function checkInDig(now = new Date()): Promise<DigState> {
  const current = await readDig();
  const next = nextDig(current, now);
  if (next.lastDate === current.lastDate) return current;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
