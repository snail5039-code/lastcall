import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MapWebScreen() {
  return <SafeAreaView style={styles.container} edges={["top"]}><View style={styles.content}>
    <View style={styles.iconBox}><FontAwesome6 name="map-location-dot" size={38} color="#EF4444" /></View>
    <Text style={styles.title}>지도는 모바일 앱에서 제공됩니다</Text>
    <Text style={styles.description}>웹에서는 홈 화면의 응급실 검색을 이용해 가까운 병원 목록을 확인해주세요.</Text>
    <TouchableOpacity style={styles.button} onPress={() => router.replace("/")}><FontAwesome6 name="magnifying-glass" size={15} color="#FFFFFF" /><Text style={styles.buttonText}>응급실 검색으로 이동</Text></TouchableOpacity>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6FB" }, content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  iconBox: { width: 82, height: 82, borderRadius: 24, backgroundColor: "#FFF1F1", alignItems: "center", justifyContent: "center", marginBottom: 22 },
  title: { fontSize: 21, fontWeight: "900", color: "#111827", textAlign: "center" }, description: { marginTop: 12, fontSize: 15, lineHeight: 23, color: "#64748B", textAlign: "center", maxWidth: 420 },
  button: { marginTop: 26, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#061A44", borderRadius: 15, paddingHorizontal: 22, paddingVertical: 15 }, buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});
