import { addCompletedRun, emptyProfile, LEGACY_RECORD_KEY, PROFILE_KEY, sanitizeProfile, trailUnlocked, type GameProfile, type Preferences, type SavedRun } from "./gameProfile";

export type ProfileStorage = { getItem(key: string): Promise<string | null>; multiSet(entries: [string, string][]): Promise<void> };
export type ProfileSnapshot = { profile: GameProfile; ready: boolean; saving: boolean; error: string; loadFailed: boolean; activeRun: boolean };
const parse = (raw: string | null) => { try { return raw ? JSON.parse(raw) as unknown : null; } catch { return null; } };

// One shared store and a serialized write queue prevent a fast replay or a
// simultaneous settings change from overwriting a newly earned high score.
export function createGameStore(storage: ProfileStorage) {
  let snapshot: ProfileSnapshot = { profile: emptyProfile(), ready: false, saving: false, error: "", loadFailed: false, activeRun: false };
  const listeners = new Set<() => void>();
  let queue = Promise.resolve(), pending = 0, revision = 0, initialized: Promise<void> | null = null;
  const update = (change: Partial<ProfileSnapshot>) => { snapshot = { ...snapshot, ...change }; listeners.forEach(listener => listener()); };
  function persist() {
    const profile = snapshot.profile, current = ++revision;
    pending++; update({ saving: true });
    queue = queue.then(async () => {
      try {
        await storage.multiSet([[PROFILE_KEY, JSON.stringify(profile)], [LEGACY_RECORD_KEY, JSON.stringify(profile.record)]]);
        if (current === revision) update({ error: "" });
      } catch {
        if (current === revision) update({ error: "Your latest scores are only in memory. Retry saving before closing the app." });
      } finally { pending--; update({ saving: pending > 0 }); }
    });
    return queue;
  }
  function init() {
    if (initialized) return initialized;
    initialized = (async () => {
      try {
        const [raw, legacy] = await Promise.all([storage.getItem(PROFILE_KEY), storage.getItem(LEGACY_RECORD_KEY)]);
        update({ profile: sanitizeProfile(parse(raw), parse(legacy)), ready: true, error: "", loadFailed: false });
      } catch { initialized = null; update({ ready: false, loadFailed: true, error: "Your saved scores could not be loaded. Retry before playing so they stay safe." }); }
    })();
    return initialized;
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    init, retry: () => snapshot.ready ? persist() : init(),
    setRunActive(activeRun: boolean) { if (snapshot.activeRun !== activeRun) update({ activeRun }); },
    bankRun(run: SavedRun) { if (!snapshot.ready) return Promise.resolve(); const profile = addCompletedRun(snapshot.profile, run); if (profile === snapshot.profile) return queue; update({ profile }); return persist(); },
    setPreferences(change: Partial<Preferences>) { if (!snapshot.ready) return Promise.resolve(); const next = { ...snapshot.profile.preferences, ...change }; if (!trailUnlocked(snapshot.profile, next.trail)) return queue; update({ profile: { ...snapshot.profile, preferences: next } }); return persist(); },
    resetProgress() { if (!snapshot.ready || snapshot.activeRun) return Promise.resolve(); update({ profile: { ...emptyProfile(), preferences: { ...snapshot.profile.preferences, trail: "gold" } } }); return persist(); },
    flush: () => queue,
  };
}
