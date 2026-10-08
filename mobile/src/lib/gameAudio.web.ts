import { useCallback, useEffect, useRef } from "react";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

type GameCue = "signal" | "hit" | "power" | "burst" | "finish";
const sources = {
  signal: require("../../assets/audio/signal.wav"),
  hit: require("../../assets/audio/hit.wav"),
  power: require("../../assets/audio/power.wav"),
  burst: require("../../assets/audio/burst.wav"),
  finish: require("../../assets/audio/finish.wav"),
};

// Browser media objects are created after hydration, so static export also works.
export function useGameAudio(enabled: boolean) {
  const players = useRef<Partial<Record<GameCue, AudioPlayer>>>({});
  const enabledRef = useRef(enabled);
  useEffect(() => {
    const created: Partial<Record<GameCue, AudioPlayer>> = {};
    for (const kind of Object.keys(sources) as GameCue[]) {
      created[kind] = createAudioPlayer(sources[kind]);
    }
    players.current = created;
    return () => {
      enabledRef.current = false;
      for (const player of Object.values(created)) {
        player.pause();
        player.remove();
      }
      players.current = {};
    };
  }, []);
  useEffect(() => {
    enabledRef.current = enabled;
    for (const player of Object.values(players.current)) {
      player.volume = enabled ? 0.5 : 0;
      if (!enabled) player.pause();
    }
  }, [enabled]);
  const cue = useCallback((kind: GameCue) => {
    const player = players.current[kind];
    if (!enabledRef.current || !player) return;
    void player
      .seekTo(0)
      .then(() => {
        if (enabledRef.current) player.play();
      })
      .catch(() => {});
  }, []);
  const stop = useCallback(() => {
    for (const player of Object.values(players.current)) player.pause();
  }, []);
  return { cue, stop };
}
