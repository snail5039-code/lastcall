import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LOCATION_POLICY } from "../config/legal";

const CONSENT_STORAGE_KEY = `lastcall.initialConsent.${LOCATION_POLICY.version}`;

type InitialConsentProps = {
  children: ReactNode;
};

export function InitialConsent({ children }: InitialConsentProps) {
  const [status, setStatus] = useState<"loading" | "required" | "accepted" | "declined">("loading");
  const [checks, setChecks] = useState([false, false, false]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_STORAGE_KEY)
      .then((value) => setStatus(value === "accepted" ? "accepted" : "required"))
      .catch(() => setStatus("required"));
  }, []);

  if (status === "loading") {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>서비스 이용 정보를 확인하고 있습니다</Text>
      </SafeAreaView>
    );
  }

  if (status === "accepted") return children;

  if (status === "declined") {
    return (
      <SafeAreaView style={styles.declinedContainer}>
        <FontAwesome6 name="circle-xmark" size={48} color="#DC2626" />
        <Text style={styles.declinedTitle}>서비스가 종료되었습니다</Text>
        <Text style={styles.declinedText}>
          필수 고지와 위치정보 처리 내용에 동의하지 않아 앱 기능을 사용할 수 없습니다. 앱을 다시 실행하면 동의 여부를 다시 선택할 수 있습니다.
        </Text>
      </SafeAreaView>
    );
  }

  const allChecked = checks.every(Boolean);
  const toggleCheck = (index: number) => {
    setChecks((current) => current.map((checked, itemIndex) => itemIndex === index ? !checked : checked));
  };

  const decline = () => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
      return;
    }
    setStatus("declined");
  };

  const accept = async () => {
    if (!allChecked || saving) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
      setStatus("accepted");
    } catch {
      Alert.alert("동의 저장 실패", "동의 내용을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleIcon}>
          <FontAwesome6 name="shield-heart" size={30} color="#DC2626" />
        </View>
        <Text style={styles.title}>서비스 이용 전 확인해주세요</Text>
        <Text style={styles.subtitle}>아래 내용은 안전한 서비스 이용을 위한 필수 동의 사항입니다.</Text>

        <ConsentItem
          checked={checks[0]}
          icon="clock-rotate-left"
          title="실시간 정보의 지연·오류 가능성"
          onPress={() => toggleCheck(0)}
        >
          병상, 장비, 진료 가능 여부와 갱신 시각은 공공데이터 및 통신 상태에 따라 실제 현장보다 늦거나 누락·오류가 있을 수 있습니다. 출발 전 반드시 해당 응급실에 전화로 확인합니다.
        </ConsentItem>

        <ConsentItem
          checked={checks[1]}
          icon="truck-medical"
          title="의료진 및 119 비대체"
          onPress={() => toggleCheck(1)}
        >
          이 앱의 검색 결과와 응급처치 안내는 참고 정보이며 진단이나 의료행위가 아닙니다. 위급하거나 판단이 어려우면 앱보다 119 신고와 의료진의 지시를 우선합니다.
        </ConsentItem>

        <ConsentItem
          checked={checks[2]}
          icon="location-dot"
          title="위치정보 수집·이용 동의"
          onPress={() => toggleCheck(2)}
        >
          현재 좌표와 행정구역을 가까운 응급실 검색, 거리 계산 및 지도 표시에 사용하며 검색 시 서비스 서버로 전송합니다. 위치는 서버 DB에 저장하지 않고, 기기에서는 앱 실행 중에만 임시 보관합니다. 동의 후 위치 기능을 사용할 때 운영체제 권한을 별도로 요청합니다.
        </ConsentItem>

        <View style={styles.privacyBox}>
          <Text style={styles.privacyTitle}>위치정보 처리방침 요약</Text>
          <Text style={styles.privacyText}>시행일·버전: {LOCATION_POLICY.version}</Text>
          <Text style={styles.privacyText}>운영 주체: {LOCATION_POLICY.operatorName}</Text>
          <Text style={styles.privacyText}>위치정보 문의: {LOCATION_POLICY.contact}</Text>
          <Text style={styles.privacyText}>목적: 주변 응급실 검색·거리 계산·지도 표시</Text>
          <Text style={styles.privacyText}>항목: 현재 좌표, 시·도 및 시·군·구, 주소 표시값</Text>
          <Text style={styles.privacyText}>보유: 서버에 영구 저장하지 않으며 앱 종료 시 메모리 캐시 소멸</Text>
          <Text style={styles.privacyText}>거부: 동의를 거부할 수 있으나 핵심 위치 기반 기능을 제공할 수 없어 앱이 종료됩니다.</Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineButton} onPress={decline} accessibilityRole="button">
          <Text style={styles.declineButtonText}>거절하고 종료</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptButton, !allChecked && styles.acceptButtonDisabled]}
          onPress={accept}
          disabled={!allChecked || saving}
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>모두 동의하고 시작</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

type ConsentItemProps = {
  checked: boolean;
  icon: "clock-rotate-left" | "truck-medical" | "location-dot";
  title: string;
  children: string;
  onPress: () => void;
};

function ConsentItem({ checked, icon, title, children, onPress }: ConsentItemProps) {
  return (
    <TouchableOpacity style={[styles.card, checked && styles.cardChecked]} onPress={onPress} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}><FontAwesome6 name={icon} size={18} color="#DC2626" /></View>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <FontAwesome6 name="check" size={12} color="#FFFFFF" /> : null}
        </View>
      </View>
      <Text style={styles.cardText}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC", gap: 14 },
  loadingText: { color: "#475569", fontSize: 14, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18 },
  titleIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontSize: 25, lineHeight: 33, fontWeight: "900", color: "#0F172A" },
  subtitle: { marginTop: 8, marginBottom: 22, fontSize: 14, lineHeight: 21, color: "#64748B" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  cardChecked: { borderColor: "#FCA5A5", backgroundColor: "#FFF7F7" },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginRight: 10 },
  cardTitle: { flex: 1, color: "#1E293B", fontSize: 15, fontWeight: "900" },
  checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  cardText: { color: "#475569", fontSize: 13, lineHeight: 20 },
  privacyBox: { marginTop: 4, borderRadius: 14, backgroundColor: "#EFF6FF", padding: 15 },
  privacyTitle: { color: "#1E3A8A", fontSize: 14, fontWeight: "900", marginBottom: 7 },
  privacyText: { color: "#334155", fontSize: 12, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  declineButton: { flex: 0.8, minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  declineButtonText: { color: "#475569", fontSize: 14, fontWeight: "800" },
  acceptButton: { flex: 1.4, minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#DC2626" },
  acceptButtonDisabled: { backgroundColor: "#CBD5E1" },
  acceptButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  declinedContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, backgroundColor: "#F8FAFC" },
  declinedTitle: { marginTop: 18, color: "#0F172A", fontSize: 22, fontWeight: "900" },
  declinedText: { marginTop: 10, color: "#64748B", fontSize: 14, lineHeight: 22, textAlign: "center" },
});
