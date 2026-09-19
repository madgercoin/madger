export type DigState = { lastDate: string; streak: number };
export const emptyDig = (): DigState => ({ lastDate: '', streak: 0 });
export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export function sanitizeDig(candidate: unknown): DigState {
  if (!candidate || typeof candidate !== 'object') return emptyDig();
  const value = candidate as Partial<DigState>;
  if (typeof value.lastDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.lastDate)) return emptyDig();
  const timestamp = Date.parse(`${value.lastDate}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || dayKey(new Date(timestamp)) !== value.lastDate) return emptyDig();
  if (!Number.isSafeInteger(value.streak) || Number(value.streak) < 1) return emptyDig();
  return { lastDate: value.lastDate, streak: Number(value.streak) };
}

export function nextDig(current: DigState, now = new Date()): DigState {
  const valid = sanitizeDig(current);
  const today = dayKey(now);
  if (valid.lastDate === today) return valid;
  const previous = new Date(now);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return { lastDate: today, streak: valid.lastDate === dayKey(previous) ? Math.min(Number.MAX_SAFE_INTEGER, valid.streak + 1) : 1 };
}

export function visibleStreak(current: DigState, now = new Date()): number {
  const valid = sanitizeDig(current);
  const previous = new Date(now);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return [dayKey(now), dayKey(previous)].includes(valid.lastDate) ? valid.streak : 0;
}
