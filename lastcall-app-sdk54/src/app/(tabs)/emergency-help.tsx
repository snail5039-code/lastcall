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
import { Radius, ThemeColors, useThemeColors, useThemeStyles, Tap } from "../../constants/design";
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
  const Colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const call119 = () => {
    Linking.openURL("tel:119");
  };
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기" accessibilityRole="button">
            <FontAwesome6 name="chevron-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>긴급 상황 도움</Text>

          <View style={styles.emptyBox} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.alertBox}>
            <FontAwesome6 name="triangle-exclamation" size={30} color={Colors.urgent} />
            <Text style={styles.alertTitle}>위급한 상황이면 즉시 119에 신고하세요</Text>
            <Text style={styles.alertText}>
              앱 정보보다 실제 응급 신고와 의료진 안내가 우선입니다.
            </Text>
          </View>

          <View style={styles.offlineBox}>
            <FontAwesome6 name="wifi" size={18} color={Colors.navySoft} />
            <View style={styles.offlineTextBox}>
              <Text style={styles.offlineTitle}>인터넷이 없어도 사용할 수 있습니다</Text>
              <Text style={styles.offlineText}>119 전화, 이 응급처치 안내, 기기에 저장된 의료정보는 네트워크 연결 없이도 확인할 수 있습니다.</Text>
            </View>
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
                  <FontAwesome6 name={guide.icon} size={22} color={Colors.navySoft} />
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
          accessibilityRole="button"
        >
          <Text style={styles.call119Text}>119 전화하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screen,
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
  iconButton: { width: Tap.min, height: Tap.min, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
  },
  emptyBox: {
    width: 24,
  },
  content: {
    paddingBottom: 20,
  },
  alertBox: {
    backgroundColor: Colors.urgentBg,
    borderRadius: Radius.card,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.urgent,
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
    color: Colors.urgent,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 26,
  },
  alertText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.urgent,
    textAlign: "center",
    lineHeight: 21,
  },
  section: {
    marginBottom: 26,
  },
  offlineBox: { flexDirection: "row", gap: 11, alignItems: "flex-start", backgroundColor: Colors.surfaceSunken, borderRadius: Radius.card, padding: 15, marginBottom: 24 },
  offlineTextBox: { flex: 1 },
  offlineTitle: { color: Colors.navy, fontSize: 14, fontWeight: "900" },
  offlineText: { marginTop: 5, color: Colors.textSub, fontSize: 12, lineHeight: 18 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    marginBottom: 14,
  },
  signCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
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
    borderRadius: Radius.control,
    backgroundColor: Colors.navy,
    color: Colors.onDark,
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
    color: Colors.textSub,
    lineHeight: 21,
  },
  guideCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
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
    borderRadius: Radius.card,
    backgroundColor: Colors.surfaceSunken,
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
    color: Colors.text,
    marginBottom: 6,
  },
  guideDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    lineHeight: 20,
  },
  call119Button: {
    backgroundColor: Colors.urgent,
    borderRadius: Radius.card,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 24,
  },
  call119Text: {
    color: Colors.onDark,
    fontSize: 17,
    fontWeight: "900",
  },
  callButton: {
    backgroundColor: Colors.urgent,
    paddingVertical: 16,
    borderRadius: Radius.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
});
