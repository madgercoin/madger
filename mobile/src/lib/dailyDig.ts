import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@madger/daily-dig';
export type DigState = { lastDate: string; streak: number };

export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

function previousDayKey(date = new Date()) {
  const prior = new Date(date);
  prior.setUTCDate(prior.getUTCDate() - 1);
  return dayKey(prior);
}

export async function readDig(): Promise<DigState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { lastDate: '', streak: 0 };
  try { return JSON.parse(raw) as DigState; } catch { return { lastDate: '', streak: 0 }; }
}

export async function checkInDig(now = new Date()): Promise<DigState> {
  const current = await readDig();
  const today = dayKey(now);
  if (current.lastDate === today) return current;
  const next = { lastDate: today, streak: current.lastDate === previousDayKey(now) ? current.streak + 1 : 1 };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
