import { Linking, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ui';
import { COLORS, LINKS } from '@/constants/brand';

export default function WatchScreen() {
  const player = useVideoPlayer(LINKS.film, instance => { instance.loop = false; instance.play(); });
  return <SafeAreaView style={styles.screen} edges={['bottom']}><View style={styles.playerWrap}><VideoView player={player} style={styles.video} nativeControls fullscreenOptions={{ enable: true }} allowsPictureInPicture contentFit="contain" /></View><View style={styles.copy}><Text style={styles.eyebrow}>MADGER ORIGINAL</Text><Text style={styles.title}>Launch Film</Text><Text style={styles.body}>The cinematic entrance to the Burrow. Runtime: 1 minute 28 seconds.</Text><ActionButton label="Open official website" icon="open-in-new" onPress={() => Linking.openURL(LINKS.website)} secondary /></View></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: COLORS.background }, playerWrap: { backgroundColor: '#000', flex: 1, justifyContent: 'center' }, video: { width: '100%', aspectRatio: 16 / 9 }, copy: { padding: 22, gap: 10 }, eyebrow: { color: COLORS.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.7 }, title: { color: COLORS.cream, fontSize: 30, fontWeight: '900' }, body: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginBottom: 8 } });
