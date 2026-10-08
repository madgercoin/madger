import { useCallback, useEffect, useRef } from "react";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";

export type GameCue = "signal" | "hit" | "power" | "burst" | "finish";

// Short original PCM cues, loaded locally; playback never needs microphone access.
export function useGameAudio(enabled: boolean) {
  const signal = useAudioPlayer(require("../../assets/audio/signal.wav"));
  const hit = useAudioPlayer(require("../../assets/audio/hit.wav"));
  const power = useAudioPlayer(require("../../assets/audio/power.wav"));
  const burst = useAudioPlayer(require("../../assets/audio/burst.wav"));
  const finish = useAudioPlayer(require("../../assets/audio/finish.wav"));
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
    void setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
    for (const player of [signal, hit, power, burst, finish]) {
      player.volume = enabled ? 0.5 : 0;
      if (!enabled) player.pause();
    }
  }, [enabled, signal, hit, power, burst, finish]);
  useEffect(
    () => () => {
      enabledRef.current = false;
    },
    [],
  );

  const stop = useCallback(() => {
    for (const player of [signal, hit, power, burst, finish]) player.pause();
  }, [signal, hit, power, burst, finish]);
  const cue = useCallback(
    (kind: GameCue) => {
      if (!enabledRef.current) return;
      const player = { signal, hit, power, burst, finish }[kind];
      // A disabled, interrupted, or unavailable audio route must never stop gameplay.
      void player
        .seekTo(0)
        .then(() => {
          if (enabledRef.current) player.play();
        })
        .catch(() => {});
    },
    [signal, hit, power, burst, finish],
  );
  return { cue, stop };
}
