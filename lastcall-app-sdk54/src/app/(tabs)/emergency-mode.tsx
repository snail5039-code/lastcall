import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../../config/api";
import { Radius, Tap, ThemeColors, useThemeColors, useThemeStyles } from "../../constants/design";
import { formatUpdatedAt, isUpdatedAtStale } from "../../services/data-freshness";
import { fetchWithRetry } from "../../services/http";
import { CurrentLocation, getCurrentLocationFast } from "../../services/location";
import { loadMedicalInfo } from "../../services/medical-info-storage";
import { buildMedicalSummary, MedicalPerson, parseMedicalList } from "../../services/medical-summary";
import { callPhone, goBack, openDirections } from "../../services/navigation";
import { Hospital, toHospitalDetailParams } from "../../types/hospital";

type Aed = {
  serialSeq: string;
  org: string;
  place: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  openNow: boolean | null;
  hoursText: string;
};

type Status = "loading" | "done";

/** 위치를 이 시간 안에 못 받으면 위치 없음 상태로 보여준다. 동의 창을 오래 두고 보는 경우도 감안한 값이다. */
const LOCATION_WAIT_MS = 15000;

/**
 * 응급 상황에서 한 화면으로 쓰는 모드.
 * 119 전화, 병상이 있는 가장 가까운 응급실, 가장 가까운 AED, 저장해 둔 의료정보와 보호자 문자를 모은다.
 * 각 항목은 따로 불러오고 따로 실패한다. 위치나 서버가 안 돼도 119와 의료정보는 항상 쓸 수 있어야 한다.
 */
export default function EmergencyModeScreen() {
  const Colors = useThemeColors();
  const styles = useThemeStyles(createStyles);

  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<Status>("loading");
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [hospitalStale, setHospitalStale] = useState(false);
  const [hospitalStatus, setHospitalStatus] = useState<Status>("loading");
  const [aed, setAed] = useState<Aed | null>(null);
  const [aedStatus, setAedStatus] = useState<Status>("loading");
  const [people, setPeople] = useState<MedicalPerson[]>([]);
  const [personIndex, setPersonIndex] = useState(0);

  const loadNearby = useCallback(async (current: CurrentLocation) => {
    const base = `lat=${current.latitude}&lon=${current.longitude}`;
    const region = `stage1=${encodeURIComponent(current.stage1)}` + (current.stage2 ? `&stage2=${encodeURIComponent(current.stage2)}` : "");

    const findHospital = async () => {
      try {
        const query = `/emergency/nearby?${region}&${base}&sort=distance&bedTypes=emergency&includeDetails=false`;
        // 최신 정보만 먼저 찾고, 없으면 오래된 정보라도 보여주되 그 사실을 표시한다.
        for (const fresh of [true, false]) {
          const response = await fetchWithRetry(apiUrl(query + (fresh ? "&freshOnly=true" : "")));
          if (!response.ok) throw new Error(`응급실 응답 오류: ${response.status}`);
          const list: Hospital[] = await response.json();
          const found = list.find((item) => item.availableBeds > 0 && Number.isFinite(item.latitude));
          if (found) {
            setHospital(found);
            setHospitalStale(!fresh && isUpdatedAtStale(found.dataUpdatedAt));
            return;
          }
        }
      } catch (error) {
        console.error("응급 모드 응급실 조회 실패", error);
      } finally {
        setHospitalStatus("done");
      }
    };

    const findAed = async () => {
      try {
        const response = await fetchWithRetry(apiUrl(`/aed/nearby?${region}&${base}&limit=10`));
        if (!response.ok) throw new Error(`AED 응답 오류: ${response.status}`);
        const list: Aed[] = await response.json();
        // 닫혀 있다고 확인된 AED 는 뒤로 미룬다. 운영시간을 모르는 것은 그대로 둔다.
        setAed(list.find((item) => item.openNow !== false) ?? list[0] ?? null);
      } catch (error) {
        console.error("응급 모드 AED 조회 실패", error);
      } finally {
        setAedStatus("done");
      }
    };

    await Promise.all([findHospital(), findAed()]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadMedicalInfo()
      .then((raw) => {
        if (!cancelled) setPeople(parseMedicalList(raw));
      })
      .catch(() => undefined);

    getCurrentLocationFast()
      .then((current) => {
        if (cancelled) return;
        setLocation(current);
        setLocationStatus("done");
        void loadNearby(current);
      })
      .catch(() => {
        if (cancelled) return;
        setLocationStatus("done");
        setHospitalStatus("done");
        setAedStatus("done");
      });

    // 위치 확인이 끝나지 않아도 화면이 계속 "확인 중"에 머물지 않게 한다. 늦게라도 위치가 오면 그때 채워진다.
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setLocationStatus("done");
      setHospitalStatus("done");
      setAedStatus("done");
    }, LOCATION_WAIT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [loadNearby]);

  const person = people[personIndex];

  // 보호자에게 의료정보, 현재 위치, 가려는 응급실을 한 번에 문자로 보낸다. 문자 앱에서 사용자가 직접 보낸다.
  const buildEmergencyMessage = () => {
    const lines: string[] = [];
    if (person) lines.push(buildMedicalSummary(person));
    if (location) lines.push(`[현재 위치]\n${location.addressText}\nhttps://maps.google.com/?q=${location.latitude},${location.longitude}`);
    if (hospital) lines.push(`[이동 예정 응급실]\n${hospital.hospitalName}\n${hospital.address}\n${hospital.emergencyPhone || hospital.phone || ""}`.trim());
    return lines.join("\n\n");
  };

  const messageGuardian = () => {
    if (!person?.guardianPhone) {
      Alert.alert("보호자 연락처 없음", "내 정보에서 보호자 연락처를 먼저 입력해주세요.");
      return;
    }
    void Linking.openURL(`sms:${person.guardianPhone}?body=${encodeURIComponent(buildEmergencyMessage())}`).catch(() => {
      Alert.alert("문자 앱 열기 실패", "문자 앱을 열 수 없습니다.");
    });
  };

  const shareAll = () => {
    const message = buildEmergencyMessage();
    if (!message) {
      Alert.alert("공유할 정보 없음", "의료정보를 저장하거나 위치를 확인한 뒤 다시 시도해주세요.");
      return;
    }
    void Share.share({ message });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => goBack()} accessibilityLabel="뒤로 가기" accessibilityRole="button">
          <FontAwesome6 name="chevron-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>응급 모드</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.call119} onPress={() => callPhone("119")} accessibilityRole="button" accessibilityLabel="119에 전화">
          <FontAwesome6 name="phone" size={26} color={Colors.onDark} />
          <View>
            <Text style={styles.call119Title}>119 전화</Text>
            <Text style={styles.call119Sub}>의식 저하 · 호흡곤란 · 심한 흉통이면 먼저 신고</Text>
          </View>
        </TouchableOpacity>

        {locationStatus === "loading" ? (
          <View style={styles.notice}>
            <ActivityIndicator color={Colors.navy} />
            <Text style={styles.noticeText}>현재 위치를 확인하고 있습니다</Text>
          </View>
        ) : !location ? (
          <View style={styles.notice}>
            <FontAwesome6 name="location-crosshairs" size={16} color={Colors.caution} />
            <Text style={styles.noticeText}>위치를 확인하지 못했습니다. 119에 현재 위치를 직접 말씀하시거나, 홈에서 지역을 선택해 응급실을 검색하세요.</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>가까운 응급실 (응급병상 있음)</Text>
        {hospitalStatus === "loading" && locationStatus === "loading" ? null : hospitalStatus === "loading" ? (
          <View style={styles.card}><ActivityIndicator color={Colors.navy} /></View>
        ) : hospital ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle} numberOfLines={2}>{hospital.hospitalName}</Text>
            <Text style={styles.cardMeta}>{hospital.distance}km · 응급병상 {hospital.availableBeds}개</Text>
            <Text style={styles.cardSub} numberOfLines={2}>{hospital.address}</Text>
            <View style={styles.updateRow}>
              <FontAwesome6 name="clock-rotate-left" size={12} color={hospitalStale ? Colors.urgent : Colors.textMuted} />
              <Text style={[styles.updateText, hospitalStale && styles.staleText]}>
                병상정보 {formatUpdatedAt(hospital.dataUpdatedAt, "갱신 시각 확인 필요")}{hospitalStale ? " · 오래된 정보, 전화로 확인" : ""}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => callPhone(hospital.emergencyPhone || hospital.phone)} accessibilityRole="button">
                <FontAwesome6 name="phone" size={14} color={Colors.ok} />
                <Text style={styles.actionText}>응급실 전화</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openDirections({ name: hospital.hospitalName, latitude: hospital.latitude, longitude: hospital.longitude })}
                accessibilityRole="button"
              >
                <FontAwesome6 name="route" size={14} color={Colors.navySoft} />
                <Text style={styles.actionText}>길찾기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push({ pathname: "/hospital-detail", params: toHospitalDetailParams(hospital) })}
                accessibilityRole="button"
              >
                <FontAwesome6 name="circle-info" size={14} color={Colors.navySoft} />
                <Text style={styles.actionText}>상세</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              {location ? "병상이 있는 응급실을 찾지 못했습니다. 119에 문의하거나 홈에서 직접 검색하세요." : "위치를 확인하면 표시됩니다."}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>가까운 AED</Text>
        {aedStatus === "loading" && locationStatus === "loading" ? null : aedStatus === "loading" ? (
          <View style={styles.card}><ActivityIndicator color={Colors.navy} /></View>
        ) : aed ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle} numberOfLines={2}>{aed.org || "설치기관 정보 없음"}</Text>
            {aed.place ? <Text style={styles.cardMeta} numberOfLines={2}>{aed.place}</Text> : null}
            <Text style={styles.cardSub} numberOfLines={2}>{aed.address}</Text>
            <Text style={styles.cardMeta}>
              {aed.distance}km · {aed.openNow === false ? "지금 닫힘" : aed.openNow === true ? "지금 이용 가능" : "운영시간 확인 필요"} · {aed.hoursText}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openDirections({ name: aed.org || "AED", latitude: aed.latitude, longitude: aed.longitude })}
                accessibilityRole="button"
              >
                <FontAwesome6 name="route" size={14} color={Colors.navySoft} />
                <Text style={styles.actionText}>AED 길찾기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/aed")} accessibilityRole="button">
                <FontAwesome6 name="heart-pulse" size={14} color={Colors.navySoft} />
                <Text style={styles.actionText}>AED 더 보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              {location ? "가까운 AED를 찾지 못했습니다. 주변 사람에게 AED를 요청하세요." : "위치를 확인하면 표시됩니다."}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>내 의료정보</Text>
        {person ? (
          <View style={styles.card}>
            {people.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {people.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.name}-${index}`}
                    style={[styles.chip, index === personIndex && styles.chipActive]}
                    onPress={() => setPersonIndex(index)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: index === personIndex }}
                  >
                    <Text style={[styles.chipText, index === personIndex && styles.chipTextActive]}>{item.relation || item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            <Text style={styles.cardTitle}>{person.name} {person.relation ? `(${person.relation})` : ""}</Text>
            <View style={styles.infoGrid}>
              <InfoRow label="혈액형" value={person.bloodType} styles={styles} />
              <InfoRow label="기저질환" value={person.disease} styles={styles} />
              <InfoRow label="복용약" value={person.medicine} styles={styles} />
              <InfoRow label="알레르기" value={person.allergy} styles={styles} />
              <InfoRow label="응급 메모" value={person.memo} styles={styles} />
              <InfoRow label="보호자" value={[person.guardianName, person.guardianPhone].filter(Boolean).join(" ")} styles={styles} />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>저장된 의료정보가 없습니다. 미리 입력해 두면 응급 상황에서 보호자와 의료진에게 바로 전달할 수 있습니다.</Text>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/my-info")} accessibilityRole="button">
              <FontAwesome6 name="user-pen" size={14} color={Colors.onDark} />
              <Text style={styles.linkButtonText}>내 정보 입력하기</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.shareRow}>
          <TouchableOpacity style={[styles.shareButton, styles.shareButtonPrimary]} onPress={messageGuardian} accessibilityRole="button">
            <FontAwesome6 name="comment-sms" size={16} color={Colors.onDark} />
            <Text style={styles.shareTextPrimary}>보호자에게 문자</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={shareAll} accessibilityRole="button">
            <FontAwesome6 name="share-nodes" size={16} color={Colors.navySoft} />
            <Text style={styles.shareText}>공유</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>
          병상·AED 정보는 공공데이터 기준이며 실제와 다를 수 있습니다. 출발 전 응급실에 전화로 수용 여부를 확인하세요. 문자는 문자 앱에서 직접 전송해야 보내집니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "미입력"}</Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screen },
  header: { height: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface },
  headerButton: { width: Tap.min, height: Tap.min, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: Colors.text },
  content: { padding: 14, paddingBottom: 32 },
  call119: { minHeight: 84, paddingHorizontal: 18, borderRadius: Radius.card, backgroundColor: Colors.urgentFill, flexDirection: "row", gap: 16, alignItems: "center" },
  call119Title: { color: Colors.onDark, fontSize: 22, fontWeight: "900" },
  call119Sub: { marginTop: 3, color: Colors.onDark, fontSize: 12, opacity: 0.9 },
  notice: { marginTop: 12, padding: 12, borderRadius: Radius.card, backgroundColor: Colors.cautionBg, flexDirection: "row", gap: 10, alignItems: "center" },
  noticeText: { flex: 1, color: Colors.caution, fontSize: 12, lineHeight: 18 },
  sectionTitle: { marginTop: 18, marginBottom: 8, color: Colors.textSub, fontSize: 13, fontWeight: "900" },
  card: { padding: 14, borderRadius: Radius.card, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { color: Colors.text, fontSize: 16, fontWeight: "900" },
  cardMeta: { marginTop: 6, color: Colors.textSub, fontSize: 12, fontWeight: "800" },
  cardSub: { marginTop: 4, color: Colors.textFaint, fontSize: 11, lineHeight: 17 },
  emptyText: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },
  updateRow: { marginTop: 8, flexDirection: "row", gap: 6, alignItems: "center" },
  updateText: { flex: 1, color: Colors.textMuted, fontSize: 11 },
  staleText: { color: Colors.urgent, fontWeight: "800" },
  actionRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.borderStrong, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  actionText: { color: Colors.textSub, fontSize: 12, fontWeight: "800" },
  chipRow: { gap: 8, marginBottom: 10 },
  chip: { paddingHorizontal: 12, minHeight: 34, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.borderStrong, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  chipText: { color: Colors.navySoft, fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: Colors.onDark },
  infoGrid: { marginTop: 10, gap: 8 },
  infoRow: { flexDirection: "row", gap: 10 },
  infoLabel: { width: 70, color: Colors.textMuted, fontSize: 12, fontWeight: "800" },
  infoValue: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: "700" },
  linkButton: { marginTop: 12, minHeight: 44, borderRadius: Radius.control, backgroundColor: Colors.navy, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  linkButtonText: { color: Colors.onDark, fontSize: 13, fontWeight: "900" },
  shareRow: { marginTop: 16, flexDirection: "row", gap: 8 },
  shareButton: { flex: 1, minHeight: 50, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  shareButtonPrimary: { flex: 2, backgroundColor: Colors.navy, borderColor: Colors.navy },
  shareText: { color: Colors.navySoft, fontSize: 14, fontWeight: "900" },
  shareTextPrimary: { color: Colors.onDark, fontSize: 14, fontWeight: "900" },
  disclaimer: { marginTop: 14, color: Colors.textFaint, fontSize: 10, lineHeight: 16, textAlign: "center" },
});
