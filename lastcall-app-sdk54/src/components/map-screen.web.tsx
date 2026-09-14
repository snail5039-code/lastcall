import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Radius, ThemeColors, useThemeColors, useThemeStyles } from "../constants/design";

export default function MapWebScreen() {
  const Colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <FontAwesome6 name="map-location-dot" size={38} color={Colors.navySoft} />
        </View>
        <Text style={styles.title}>지도는 모바일 앱에서 제공됩니다</Text>
        <Text style={styles.description}>
          웹에서는 응급실 검색을 이용해 가까운 병원 목록을 확인해 주세요.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace("/")}>
          <FontAwesome6 name="magnifying-glass" size={15} color={Colors.onDark} />
          <Text style={styles.buttonText}>응급실 검색으로 이동</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screen },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconBox: {
    width: 82,
    height: 82,
    borderRadius: Radius.card,
    backgroundColor: Colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textMuted,
    textAlign: "center",
    maxWidth: 420,
  },
  button: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: Colors.navy,
    borderRadius: Radius.card,
    paddingHorizontal: 22,
    paddingVertical: 15,
  },
  buttonText: { color: Colors.onDark, fontSize: 15, fontWeight: "900" },
});
