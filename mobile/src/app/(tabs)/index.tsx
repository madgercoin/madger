import { useCallback, useState } from "react";
import { AppState, Linking, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActionButton,
  BrandHeader,
  Card,
  Pill,
  Screen,
  SectionTitle,
  textStyles,
} from "@/components/ui";
import { COLORS, LINKS } from "@/constants/brand";
import {
  checkInDig,
  dayKey,
  readDig,
  visibleStreak,
  type DigState,
} from "@/lib/dailyDig";

export default function HomeScreen() {
  const router = useRouter();
  const [dig, setDig] = useState<DigState>({ lastDate: "", streak: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [today, setToday] = useState(dayKey);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function refresh() {
        try {
          const saved = await readDig();
          if (active) {
            setDig(saved);
            setLoadError(false);
          }
        } catch {
          if (active) setLoadError(true);
        } finally {
          if (active) {
            setLoading(false);
            setToday(dayKey());
          }
        }
      }
      void refresh();
      const timer = setInterval(() => setToday(dayKey()), 30000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      return () => {
        active = false;
        clearInterval(timer);
        subscription.remove();
      };
    }, []),
  );
  const checked = dig.lastDate === today;

  async function dailyDig() {
    const next = await checkInDig();
    setDig(next);
    setLoadError(false);
    setToday(dayKey());
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
  }

  return (
    <Screen>
      <BrandHeader
        eyebrow="Original By Design. Relentless by Nature."
        title="MADGER"
        subtitle="Dig past the noise. Verify everything."
      />
      <View style={styles.hero}>
        <View style={styles.heroArt}>
          <Image
            source={require("../../../assets/images/burrow-tunnel.png")}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            accessible={false}
          />
          <LinearGradient
            colors={["transparent", "#080E09"]}
            style={StyleSheet.absoluteFill}
          />
          <Image
            source={require("../../../assets/images/madger-runner.png")}
            contentFit="contain"
            accessibilityLabel="MADGER running into the Burrow"
            style={styles.heroCharacter}
          />
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons
              name="gamepad-variant"
              size={15}
              color={COLORS.gold}
            />
            <Text style={styles.heroBadgeText}>THE BURROW IS OPEN</Text>
          </View>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>PLAY · EXPLORE · BELONG</Text>
          <Text style={styles.heroTitle}>
            Small badger.{"\n"}
            <Text style={{ color: COLORS.gold }}>Big run.</Text>
          </Text>
          <Text style={textStyles.body}>
            One minute. Three tunnels. Your next personal best. Chase the signal
            and leave the noise behind.
          </Text>
          <ActionButton
            label="Play Burrow Run"
            icon="gamepad-variant"
            onPress={() => router.push("/play")}
          />
          <ActionButton
            label="Meet the Burrow"
            icon="account-group"
            onPress={() => router.push("/community")}
            secondary
          />
        </View>
      </View>
      <Card>
        <SectionTitle>Daily Dig</SectionTitle>
        <Text style={textStyles.body}>
          A private, on-device community streak. No wallet connection, no
          tracking, no purchase.
        </Text>
        <View accessibilityLiveRegion="polite" style={styles.streakRow}>
          <Text style={styles.streak}>
            {loading || loadError ? "—" : visibleStreak(dig)}
          </Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
        <Text accessibilityLiveRegion="polite" style={textStyles.body}>
          {loadError
            ? "Your saved streak could not be loaded. Try checking in again."
            : checked
              ? "You’re checked in. Your next dig opens at midnight UTC."
              : "Check in once a day. Each new day starts at midnight UTC."}
        </Text>
        <ActionButton
          label={
            loading
              ? "Loading your streak…"
              : checked
                ? "Checked in today"
                : "Dig in for today"
          }
          icon={checked ? "check-circle" : "shovel"}
          onPress={dailyDig}
          disabled={loading || (checked && !loadError)}
          secondary={checked}
          errorMessage="Your check-in could not be saved on this device. Please try again."
        />
      </Card>
      <Card>
        <Pill tone="gold">VERIFY BEFORE YOU TRUST</Pill>
        <SectionTitle>Know who you’re talking to.</SectionTitle>
        <Text style={textStyles.body}>
          Check the official mint, find trusted community links, and spot
          impersonators before they waste your time.
        </Text>
        <ActionButton
          label="Open verification tools"
          icon="shield-check"
          onPress={() => router.push("/verify")}
          secondary
        />
      </Card>
      <Card>
        <Pill tone="gold">TRADING LIVE · SOLANA</Pill>
        <SectionTitle>Explore $MADGER</SectionTitle>
        <Text style={textStyles.body}>
          Already use Solana? Open the verified market. New to crypto? Start
          with the complete buying guide.
        </Text>
        <ActionButton
          label="Buy $MADGER on Raydium"
          icon="open-in-new"
          onPress={() => Linking.openURL(LINKS.raydiumSwap)}
          secondary
        />
        <ActionButton
          label="New to Crypto? Start Here"
          icon="school"
          onPress={() => Linking.openURL(LINKS.buyGuide)}
          secondary
        />
      </Card>
      <Card>
        <SectionTitle>Official home</SectionTitle>
        <Text style={textStyles.body}>
          News, the litepaper, safety notes, and every official link live at
          madgercoin.com.
        </Text>
        <ActionButton
          label="Open madgercoin.com"
          icon="open-in-new"
          onPress={() => Linking.openURL(LINKS.website)}
          secondary
        />
        <ActionButton
          label="View verified Blockspot profile"
          icon="shield-check"
          onPress={() => Linking.openURL(LINKS.blockspot)}
          secondary
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,201,40,0.3)",
  },
  heroArt: { width: "100%", height: 230 },
  heroCharacter: {
    position: "absolute",
    top: 28,
    right: "8%",
    width: "66%",
    height: 195,
  },
  heroBadge: {
    position: "absolute",
    left: 18,
    top: 18,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#060C08D9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7A55766",
  },
  heroBadgeText: {
    color: COLORS.gold,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "900",
  },
  heroCopy: { padding: 20, gap: 14, backgroundColor: "#080E09" },
  heroEyebrow: {
    color: "#C5AF79",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "900",
  },
  heroTitle: {
    color: COLORS.cream,
    fontSize: 38,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -1,
  },
  streakRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  streak: { color: COLORS.gold, fontSize: 44, fontWeight: "900" },
  streakLabel: { color: COLORS.cream, fontSize: 16, fontWeight: "800" },
});
