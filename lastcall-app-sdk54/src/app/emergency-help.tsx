import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const dangerSigns = [
  "의식이 없거나 반응이 없는 경우",
  "호흡이 어렵거나 멈춘 경우",
  "가슴 통증이 심하게 지속되는 경우",
  "출혈이 멈추지 않는 경우",
];

const guides = [
  {
    id: 1,
    title: "심폐소생술",
    desc: "의식과 호흡이 없으면 즉시 119 신고 후 가슴 압박을 시작합니다.",
    icon: "heart-pulse" as const,
  },
  {
    id: 2,
    title: "출혈 압박",
    desc: "깨끗한 천이나 거즈로 출혈 부위를 강하게 눌러 지혈합니다.",
    icon: "droplet" as const,
  },
  {
    id: 3,
    title: "화상 응급처치",
    desc: "흐르는 시원한 물로 화상 부위를 식히고 물집은 터뜨리지 않습니다.",
    icon: "fire-flame-simple" as const,
  },
  {
    id: 4,
    title: "발작 대처",
    desc: "주변 위험 물건을 치우고 억지로 붙잡거나 입에 물건을 넣지 않습니다.",
    icon: "bolt" as const,
  },
];

export default function EmergencyHelpScreen() {
  const call119 = () => {
    Linking.openURL("tel:119");
  };
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기">
            <FontAwesome6 name="chevron-left" size={20} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>긴급 상황 도움</Text>

          <View style={styles.emptyBox} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.alertBox}>
            <FontAwesome6 name="triangle-exclamation" size={30} color="#DC2626" />
            <Text style={styles.alertTitle}>위급한 상황이면 즉시 119에 신고하세요</Text>
            <Text style={styles.alertText}>
              앱 정보보다 실제 응급 신고와 의료진 안내가 우선입니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>즉시 신고가 필요한 상황</Text>

            <View style={styles.signCard}>
              {dangerSigns.map((sign) => (
                <View key={sign} style={styles.signRow}>
                  <Text style={styles.checkIcon}>!</Text>
                  <Text style={styles.signText}>{sign}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>응급 대처 요령</Text>

            {guides.map((guide) => (
              <View key={guide.id} style={styles.guideCard}>
                <View style={styles.guideIconBox}>
                  <FontAwesome6 name={guide.icon} size={22} color="#DC2626" />
                </View>

                <View style={styles.guideTextBox}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideDesc}>{guide.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.callButton}
          onPress={call119}
        >
          <Text style={styles.call119Text}>119 전화하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6FB",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  emptyBox: {
    width: 24,
  },
  content: {
    paddingBottom: 20,
  },
  alertBox: {
    backgroundColor: "#FFF1F1",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 10,
    marginBottom: 26,
  },
  alertIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#B91C1C",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 26,
  },
  alertText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
    textAlign: "center",
    lineHeight: 21,
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 14,
  },
  signCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  signRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#EF4444",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 14,
    fontWeight: "900",
    marginRight: 10,
  },
  signText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
    lineHeight: 21,
  },
  guideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  guideIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  guideIcon: {
    fontSize: 24,
  },
  guideTextBox: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },
  guideDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 20,
  },
  call119Button: {
    backgroundColor: "#EF4444",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 24,
  },
  call119Text: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  callButton: {
    backgroundColor: "#E53935",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
});
