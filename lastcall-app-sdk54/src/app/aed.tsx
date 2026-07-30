import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AedScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기">
          <FontAwesome6 name="chevron-left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주변 AED 찾기</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome6 name="heart-pulse" size={34} color="#DC2626" />
          </View>
          <Text style={styles.heroTitle}>AED 검색 서비스를 준비하고 있습니다</Text>
          <Text style={styles.heroText}>
            공공데이터포털 시스템 전환 작업으로 OpenAPI 신규 활용신청과 인증키 발급이 일시 제한되어 현재 주변 AED 정보를 제공할 수 없습니다.
          </Text>
          <View style={styles.statusBadge}>
            <FontAwesome6 name="clock" size={13} color="#92400E" />
            <Text style={styles.statusText}>공공데이터 API 이용 제한 중</Text>
          </View>
        </View>

        <View style={styles.warningCard}>
          <FontAwesome6 name="triangle-exclamation" size={22} color="#B91C1C" />
          <View style={styles.warningTextBox}>
            <Text style={styles.warningTitle}>심정지가 의심되면 기다리지 마세요</Text>
            <Text style={styles.warningText}>
              반응과 정상 호흡이 없으면 즉시 119에 신고하고, 주변 사람에게 AED를 찾아달라고 요청한 뒤 가슴압박을 시작하세요.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>서비스가 열리면 제공할 기능</Text>
          <InfoRow icon="location-dot" text="현재 위치에서 가까운 AED 거리순 안내" />
          <InfoRow icon="map-location-dot" text="지도에서 AED 설치 장소 확인" />
          <InfoRow icon="clock" text="운영시간과 실제 접근 가능 여부 안내" />
          <InfoRow icon="building" text="설치기관·관리기관·상세 위치 확인" />
        </View>

        <Text style={styles.notice}>
          AED 위치와 운영시간은 실제 현장과 다를 수 있습니다. 기능 제공 이후에도 위급한 상황에서는 119의 안내를 우선합니다.
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.guideButton} onPress={() => router.push("/emergency-help")}>
          <FontAwesome6 name="book-medical" size={15} color="#061A44" />
          <Text style={styles.guideButtonText}>응급 대처 안내</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton} onPress={() => void Linking.openURL("tel:119")}>
          <FontAwesome6 name="phone" size={15} color="#FFFFFF" />
          <Text style={styles.callButtonText}>119 전화</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: "location-dot" | "map-location-dot" | "clock" | "building"; text: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><FontAwesome6 name={icon} size={14} color="#1D4ED8" /></View>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6FB" },
  header: { height: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFFFFF" },
  headerButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  content: { padding: 18, paddingBottom: 26 },
  hero: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 22, paddingHorizontal: 22, paddingVertical: 28, borderWidth: 1, borderColor: "#E2E8F0" },
  heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  heroTitle: { color: "#111827", fontSize: 20, lineHeight: 28, fontWeight: "900", textAlign: "center" },
  heroText: { marginTop: 11, color: "#64748B", fontSize: 13, lineHeight: 21, textAlign: "center" },
  statusBadge: { marginTop: 18, flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: "#FEF3C7", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  statusText: { color: "#92400E", fontSize: 12, fontWeight: "900" },
  warningCard: { marginTop: 14, flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "#FFF1F2", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#FECDD3" },
  warningTextBox: { flex: 1 },
  warningTitle: { color: "#B91C1C", fontSize: 15, fontWeight: "900" },
  warningText: { marginTop: 6, color: "#9F1239", fontSize: 12, lineHeight: 19 },
  infoCard: { marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 17 },
  infoTitle: { color: "#111827", fontSize: 16, fontWeight: "900", marginBottom: 8 },
  infoRow: { minHeight: 46, flexDirection: "row", gap: 11, alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  infoIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1, color: "#475569", fontSize: 13, fontWeight: "700" },
  notice: { marginTop: 14, color: "#64748B", fontSize: 11, lineHeight: 18, textAlign: "center", paddingHorizontal: 8 },
  actions: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  guideButton: { flex: 1, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: "#CBD5E1", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  guideButtonText: { color: "#061A44", fontSize: 14, fontWeight: "900" },
  callButton: { flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: "#DC2626", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  callButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
