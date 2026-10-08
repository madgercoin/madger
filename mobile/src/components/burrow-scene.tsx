import { memo, useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@/constants/brand";
import {
  RUNNER_Y,
  lanePosition,
  phaseFor,
  type Entity,
  type RunState,
} from "@/lib/burrowRun";

const RUNNER = require("../../assets/images/madger-runner.png");
const PICKUP_ICONS = {
  signal: "lightning-bolt",
  noise: "close-thick",
  boost: "heart-plus",
  shield: "shield-check",
  magnet: "magnet",
} as const;
const PICKUP_COLORS = {
  signal: "#FFC928",
  noise: "#FF785B",
  boost: "#B9F477",
  shield: "#8BE8E0",
  magnet: "#C2AEFF",
} as const;
export type Feedback = {
  id: number;
  label: string;
  tone: "gold" | "danger" | "mint";
  lane: number;
};

// A transparent derivative of pose 8 on MADGER's approved pose card.
export function RunningMadger({ width = 94 }: { width?: number }) {
  return (
    <Image
      accessible={false}
      source={RUNNER}
      style={{ width, height: (width * 1152) / 1360 }}
      resizeMode="contain"
    />
  );
}

export const BurrowScene = memo(function BurrowScene({
  elapsed,
  entities,
  lane,
  run,
  playing,
  reducedMotion,
  feedback,
  children,
}: {
  elapsed: number;
  entities: Entity[];
  lane: number;
  run: RunState;
  playing: boolean;
  reducedMotion: boolean;
  feedback: Feedback[];
  children?: ReactNode;
}) {
  const [size, setSize] = useState({ width: 320, height: 440 });
  const [laneMotion] = useState(() => new Animated.Value(1));
  const [bob] = useState(() => new Animated.Value(0));
  const phase = phaseFor(elapsed);
  const sceneryTime = reducedMotion ? 0 : elapsed;
  const runnerSize = Math.min(100, size.width * 0.27);
  useEffect(() => {
    if (reducedMotion) {
      laneMotion.setValue(lane);
      return;
    }
    const animation = Animated.spring(laneMotion, {
      toValue: lane,
      speed: 28,
      bounciness: 3,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [lane, laneMotion, reducedMotion]);
  useEffect(() => {
    if (!playing || reducedMotion) {
      bob.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -4,
          duration: 155,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 155,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [bob, playing, reducedMotion]);
  const rail = (topX: number, bottomX: number) => {
    const dx = (bottomX - topX) * size.width;
    const length = Math.hypot(dx, size.height);
    return {
      left: topX * size.width + dx / 2,
      top: (size.height - length) / 2,
      height: length,
      transform: [{ rotate: `${-Math.atan2(dx, size.height)}rad` }],
    };
  };
  return (
    <View
      style={styles.scene}
      onLayout={(event) =>
        setSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })
      }
    >
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <LinearGradient
          colors={
            phase.id === "bedrock"
              ? ["#24140C", "#140F0A", "#090907"]
              : phase.id === "deep"
                ? ["#092724", "#0C1815", "#080C09"]
                : ["#272012", "#16160E", "#0A0D08"]
          }
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={require("../../assets/images/burrow-tunnel.png")}
          resizeMode="cover"
          style={[
            StyleSheet.absoluteFill,
            {
              width: "100%",
              height: "100%",
              opacity: phase.id === "surface" ? 0.6 : 0.32,
            },
          ]}
        />
        <View style={styles.vanishingGlow}>
          <LinearGradient
            colors={["transparent", `${phase.accent}22`, "transparent"]}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View
          style={[styles.tunnelMouth, { borderColor: `${phase.accent}55` }]}
        />
        <View
          style={[
            styles.rail,
            rail(0.32, -0.16),
            { backgroundColor: `${phase.accent}40`, width: 2 },
          ]}
        />
        <View
          style={[
            styles.rail,
            rail(0.68, 1.16),
            { backgroundColor: `${phase.accent}40`, width: 2 },
          ]}
        />
        <View style={[styles.rail, rail(0.455, 0.33)]} />
        <View style={[styles.rail, rail(0.545, 0.67)]} />
        {Array.from({ length: 9 }, (_, index) => {
          const depth = (index / 9 + sceneryTime * phase.speed * 0.45) % 1;
          const width = size.width * (0.25 + depth * 1.45);
          return (
            <View
              key={`beam-${index}`}
              style={[
                styles.crossbeam,
                {
                  width,
                  left: (size.width - width) / 2,
                  top: depth * size.height,
                  opacity: 0.12 + depth * 0.18,
                  borderColor: phase.accent,
                  height: 2 + depth * 3,
                },
              ]}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, index) => {
          const depth = (index / 12 + sceneryTime * 0.1) % 1;
          const side = index % 2 === 0 ? -1 : 1;
          const x = (0.5 + side * (0.2 + depth * 0.38)) * size.width;
          return (
            <View
              key={`spark-${index}`}
              style={[
                styles.spark,
                {
                  left: x,
                  top: depth * size.height,
                  backgroundColor: phase.accent,
                  opacity: 0.2 + depth * 0.5,
                  transform: [{ scale: 0.4 + depth }],
                },
              ]}
            />
          );
        })}
        <LinearGradient
          colors={["#0B0F08", "transparent"]}
          style={styles.ceilingShade}
        />
        <LinearGradient
          colors={["transparent", "#070B07"]}
          style={styles.floorShade}
        />
        {entities
          .filter((entity) => entity.y > 0.02 && entity.y < 1.1)
          .map((entity) => {
            const depth = Math.max(0, entity.y);
            const itemSize =
              (entity.type === "noise" ? 52 : 38) * (0.38 + depth * 0.74);
            const color = PICKUP_COLORS[entity.type];
            return (
              <View
                key={entity.id}
                style={[
                  styles.pickupPosition,
                  {
                    left:
                      lanePosition(entity.lane, depth) * size.width -
                      itemSize / 2,
                    top: depth * size.height - itemSize / 2,
                    width: itemSize,
                    height: itemSize,
                    opacity: entity.passed ? 0.3 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.pickupHalo,
                    {
                      backgroundColor: `${color}15`,
                      borderColor: `${color}25`,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.pickup,
                    entity.type === "noise"
                      ? styles.rock
                      : entity.type === "signal"
                        ? styles.signal
                        : styles.power,
                    {
                      borderColor: color,
                      backgroundColor:
                        entity.type === "signal"
                          ? "#EFB735"
                          : entity.type === "noise"
                            ? "#4E2920"
                            : "#18312B",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={PICKUP_ICONS[entity.type]}
                    size={itemSize * 0.55}
                    color={entity.type === "signal" ? "#372408" : color}
                  />
                </View>
              </View>
            );
          })}
        <Animated.View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`MADGER in the ${["left", "center", "right"][lane]} lane`}
          style={[
            styles.runner,
            {
              top: RUNNER_Y * size.height - runnerSize * 0.55,
              width: runnerSize,
              transform: [
                {
                  translateX: laneMotion.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, 1, 2].map(
                      (value) =>
                        lanePosition(value, RUNNER_Y) * size.width -
                        runnerSize / 2,
                    ),
                  }),
                },
                { translateY: bob },
              ],
              opacity:
                run.invulnerable > 0 && !reducedMotion
                  ? 0.5 + Math.sin(elapsed * 22) * 0.25
                  : 1,
            },
          ]}
        >
          {run.burst > 0 ? (
            <View style={styles.burstTrail}>
              <LinearGradient
                colors={["#FFD45C88", "transparent"]}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ) : null}
          <View
            style={[
              styles.runnerShadow,
              run.burst > 0 && { backgroundColor: "#F9C53A55" },
            ]}
          />
          {run.shield > 0 ? <View style={styles.shieldRing} /> : null}
          {run.magnet > 0 ? <View style={styles.magnetRing} /> : null}
          <RunningMadger width={runnerSize} />
        </Animated.View>
        {feedback.map((item) => (
          <PickupFeedback
            key={item.id}
            item={item}
            width={size.width}
            height={size.height}
            reducedMotion={reducedMotion}
          />
        ))}
        {run.burst > 0 ? <View style={styles.burstBorder} /> : null}
      </View>
      {children}
    </View>
  );
});

function PickupFeedback({
  item,
  width,
  height,
  reducedMotion,
}: {
  item: Feedback;
  width: number;
  height: number;
  reducedMotion: boolean;
}) {
  const [motion] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(motion, {
      toValue: 1,
      duration: 750,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [motion]);
  return (
    <Animated.View
      style={[
        styles.feedback,
        {
          left: lanePosition(item.lane, RUNNER_Y) * width - 65,
          top: height * (RUNNER_Y - 0.14),
          opacity: motion.interpolate({
            inputRange: [0, 0.6, 1],
            outputRange: [1, 1, 0],
          }),
          transform: [
            {
              translateY: reducedMotion
                ? 0
                : motion.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -36],
                  }),
            },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.feedbackText,
          {
            color:
              item.tone === "danger"
                ? COLORS.danger
                : item.tone === "mint"
                  ? "#8BE8E0"
                  : COLORS.gold,
          },
        ]}
      >
        {item.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#5F4E2A",
    backgroundColor: "#11140C",
  },
  vanishingGlow: {
    position: "absolute",
    top: -60,
    left: "15%",
    width: "70%",
    height: "60%",
    borderRadius: 150,
  },
  tunnelMouth: {
    position: "absolute",
    top: -48,
    left: "31%",
    width: "38%",
    height: 106,
    borderRadius: 55,
    backgroundColor: "#030804",
    borderWidth: 3,
  },
  rail: { position: "absolute", width: 1, backgroundColor: "#C5A65135" },
  crossbeam: {
    position: "absolute",
    borderTopWidth: 1,
    backgroundColor: "#5D503822",
    borderRadius: 4,
  },
  spark: { position: "absolute", width: 4, height: 10, borderRadius: 3 },
  ceilingShade: { position: "absolute", top: 0, left: 0, right: 0, height: 65 },
  floorShade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
  },
  pickupPosition: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupHalo: {
    position: "absolute",
    width: "140%",
    height: "140%",
    borderRadius: 50,
    borderWidth: 1,
  },
  pickup: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  signal: {
    borderRadius: 12,
    shadowColor: "#FFC928",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  rock: {
    borderRadius: 13,
    borderBottomWidth: 5,
    transform: [{ rotate: "-8deg" }],
  },
  power: { borderRadius: 50, borderBottomWidth: 4 },
  runner: { position: "absolute", left: 0, alignItems: "center" },
  runnerShadow: {
    position: "absolute",
    bottom: 0,
    width: "90%",
    height: 15,
    borderRadius: 50,
    backgroundColor: "#00000099",
  },
  shieldRing: {
    position: "absolute",
    top: -7,
    bottom: -7,
    left: -7,
    right: -7,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "#8BE8E0",
    backgroundColor: "#8BE8E011",
  },
  magnetRing: {
    position: "absolute",
    top: -15,
    bottom: -15,
    left: -15,
    right: -15,
    borderRadius: 60,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C2AEFF",
  },
  burstTrail: {
    position: "absolute",
    top: "55%",
    width: "65%",
    height: 140,
    borderRadius: 30,
  },
  burstBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    borderColor: "#FFD45C99",
    borderRadius: 23,
  },
  feedback: { position: "absolute", width: 130, alignItems: "center" },
  feedbackText: {
    fontSize: 17,
    fontWeight: "900",
    textShadowColor: "#000",
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 2 },
  },
});
