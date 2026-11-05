import { useEffect, useRef } from "react";
import { Animated, DimensionValue, Platform, StyleSheet, View } from "react-native";
import { Radius, useThemeColors } from "../constants/design";

/** 불러오는 동안 자리를 잡아 두는 회색 막대. 천천히 깜박여 "기다리는 중"임을 알린다. */
export function SkeletonBlock({ width = "100%", height = 14 }: { width?: DimensionValue; height?: number }) {
  const Colors = useThemeColors();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={{ width, height, borderRadius: Radius.control, backgroundColor: Colors.border, opacity }} />;
}

/** 응급실 카드와 같은 뼈대의 대기 화면. 결과가 들어와도 화면이 덜 출렁이게 높이를 맞춘다. */
export function HospitalCardSkeleton() {
  const Colors = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <View style={styles.row}>
        <View style={styles.grow}>
          <SkeletonBlock width="70%" height={18} />
          <View style={styles.gapSm} />
          <SkeletonBlock width="50%" height={12} />
        </View>
        <SkeletonBlock width={54} height={26} />
      </View>
      <View style={styles.gapMd} />
      <SkeletonBlock height={52} />
      <View style={styles.gapMd} />
      <View style={styles.row}>
        <View style={styles.grow}><SkeletonBlock height={46} /></View>
        <View style={styles.grow}><SkeletonBlock height={46} /></View>
        <SkeletonBlock width={46} height={46} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 10, borderRadius: Radius.card, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  grow: { flex: 1 },
  gapSm: { height: 8 },
  gapMd: { height: 12 },
});
