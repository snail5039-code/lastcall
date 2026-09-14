import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";
import { Colors, Radius, Type } from "../constants/design";
import { getCurrentLocationFast } from "../services/location";
import { Hospital, toHospitalDetailParams } from "../types/hospital";

const formatUpdatedAt = (value?: string) => {
  if (!value) return "갱신 시각 확인 필요";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 12) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
  return value.replace("T", " ").slice(0, 16);
};

const isUpdatedAtStale = (value?: string) => {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return false;
  const updatedAt = new Date(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)) - 1, Number(digits.slice(6, 8)), Number(digits.slice(8, 10)), Number(digits.slice(10, 12)));
  return Date.now() - updatedAt.getTime() > 15 * 60 * 1000;
};


export default function HospitalsScreen() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  const { stage1, stage2, lat, lon, symptom, keyword, sort, department, bedTypes, facilities, severeTypes } = useLocalSearchParams<{
    stage1: string;
    stage2?: string;
    lat?: string;
    lon?: string;
    symptom?: string;
    keyword?: string;
    sort?: string;
    department?: string;
    bedTypes?: string;
    facilities?: string;
    severeTypes?: string;
  }>();

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        if (!stage1 && !keyword) {
          console.log("시/도 정보가 없습니다.");
          return;
        }

        let latitude = Number(lat);
        let longitude = Number(lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          const location = await getCurrentLocationFast();
          latitude = location.latitude;
          longitude = location.longitude;
        }

        let url = keyword
          ? apiUrl(`/emergency/search?keyword=${encodeURIComponent(String(keyword))}&lat=${latitude}&lon=${longitude}`)
          : apiUrl(`/emergency/nearby?stage1=${encodeURIComponent(stage1)}&lat=${latitude}&lon=${longitude}`);

        if (!keyword && stage2) {
          url += `&stage2=${encodeURIComponent(stage2)}`;
        }

        if (symptom) {
          url += `&symptom=${encodeURIComponent(String(symptom))}`;
        }

        if (sort) url += `&sort=${encodeURIComponent(sort)}`;
        if (department) url += `&department=${encodeURIComponent(department)}`;
        if (bedTypes) url += `&bedTypes=${encodeURIComponent(bedTypes)}`;
        if (facilities) url += `&facilities=${encodeURIComponent(facilities)}`;
        if (severeTypes) url += `&severeTypes=${encodeURIComponent(severeTypes)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
        const data = await response.json();
        setHospitals(data);
      } catch (error) {
        console.error("응급실 목록 불러오기 실패:", error);
        setErrorMessage("응급실 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
  }, [stage1, stage2, lat, lon, symptom, keyword, sort, department, bedTypes, facilities, severeTypes, requestVersion]);

  const handleCall = (phone?: string) => {
    if (!phone) {
      Alert.alert("전화번호 없음", "등록된 전화번호가 없습니다.");
      return;
    }

    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigation = (hospital: Hospital) => {
    if (!hospital.latitude || !hospital.longitude) {
      Alert.alert("위치 정보 없음", "병원 위치 정보가 없습니다.");
      return;
    }

    Alert.alert(
      "길찾기",
      "사용할 지도 앱을 선택하세요.",
      [
        {
          text: "카카오맵",
          onPress: () => {
            const name = encodeURIComponent(hospital.hospitalName);

            Linking.openURL(
              `https://map.kakao.com/link/to/${name},${hospital.latitude},${hospital.longitude}`
            );
          },
        },
        {
          text: "티맵",
          onPress: () => {
            const name = encodeURIComponent(hospital.hospitalName);

            Linking.openURL(
              `tmap://route?goalname=${name}&goalx=${hospital.longitude}&goaly=${hospital.latitude}`
            );
          },
        },
        {
          text: "취소",
          style: "cancel",
        },
      ]
    );
  };

  const handleShare = async (hospital: Hospital) => {
    const name = encodeURIComponent(hospital.hospitalName);

    const kakaoMapUrl = `https://map.kakao.com/link/to/${name},${hospital.latitude},${hospital.longitude}`;

    const message =
      `${hospital.hospitalName}\n\n` +
      `주소: ${hospital.address}\n` +
      `응급실 전화: ${hospital.emergencyPhone || hospital.phone}\n` +
      `거리: ${hospital.distance}km\n\n` +
      `길찾기: ${kakaoMapUrl}\n\n` +
      `살려줌 추천 응급실`;

    await Share.share({
      message,
    });
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기">
            <FontAwesome6 name="chevron-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>추천 응급실</Text>

          <TouchableOpacity onPress={() => router.push({ pathname: "/filter", params: { stage1, ...(stage2 && { stage2 }), ...(lat && { lat }), ...(lon && { lon }), ...(symptom && { symptom }), ...(keyword && { keyword }), ...(sort && { sort }), ...(department && { department }), ...(bedTypes && { bedTypes }), ...(facilities && { facilities }), ...(severeTypes && { severeTypes }) } })}>
            <FontAwesome6 name="sliders" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{keyword ? `“${keyword}” 검색 결과입니다.` : "증상 관련 진료과, 가용 병상, 거리를 기준으로 추천합니다."}</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {loading && <View style={styles.stateBox}><ActivityIndicator size="large" color={Colors.navy} /><Text style={styles.stateText}>가까운 응급실을 찾고 있습니다</Text></View>}
          {!loading && errorMessage ? <View style={styles.stateBox}><FontAwesome6 name="triangle-exclamation" size={28} color={Colors.urgent} /><Text style={styles.stateText}>{errorMessage}</Text><TouchableOpacity style={styles.retryButton} onPress={() => setRequestVersion((value) => value + 1)}><FontAwesome6 name="rotate-right" size={13} color={Colors.onDark} /><Text style={styles.retryButtonText}>다시 시도</Text></TouchableOpacity></View> : null}
          {!loading && !errorMessage && hospitals.length === 0 ? <View style={styles.stateBox}><FontAwesome6 name="hospital" size={28} color={Colors.textFaint} /><Text style={styles.stateText}>선택한 조건에 맞는 응급실이 없습니다</Text></View> : null}
          {hospitals.map((hospital, index) => (
            <View key={hospital.hpid} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.rankBox}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>

                <View style={styles.titleBox}>
                  <Text style={styles.hospitalName} numberOfLines={1}>{hospital.hospitalName}</Text>
                  <View style={styles.distanceRow}><FontAwesome6 name="location-dot" size={11} color={Colors.textMuted} /><Text style={styles.distanceText} numberOfLines={1}>{hospital.address}</Text></View>
                </View>

                <Text style={styles.distanceFigure}>
                  {hospital.distance}<Text style={styles.distanceUnit}>km</Text>
                </Text>
              </View>

              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.statusBadge,
                    hospital.availableBeds <= 0 && styles.warningBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      hospital.availableBeds <= 0 && styles.warningText,
                    ]}
                  >
                    {hospital.availableBeds > 0 ? "병상 있음" : "확인 필요"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoArea}>
                <View style={styles.updateRow}>
                  <FontAwesome6 name="clock-rotate-left" size={12} color={isUpdatedAtStale(hospital.dataUpdatedAt) ? Colors.urgent : Colors.textMuted} />
                  <Text style={[styles.updateText, isUpdatedAtStale(hospital.dataUpdatedAt) && styles.staleUpdateText]}>병상정보 {formatUpdatedAt(hospital.dataUpdatedAt)}{isUpdatedAtStale(hospital.dataUpdatedAt) ? " · 오래된 정보" : ""}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>응급실 가용 병상</Text>
                  <Text style={styles.bedText}>
                    {hospital.availableBeds > 0 ? `${hospital.availableBeds}개` : '확인 필요'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>추천 점수</Text>
                  <Text style={styles.scoreText}>{hospital.recommendScore}점</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>증상 관련 진료과</Text>
                  <Text style={styles.departmentText} numberOfLines={1}>
                    {hospital.matchedDepartments
                      ? hospital.matchedDepartments
                      : "관련 진료과 확인 필요"}
                  </Text>
                </View>
              </View>

              <View style={styles.callNotice}>
                <FontAwesome6 name="phone" size={12} color={Colors.caution} />
                <Text style={styles.callNoticeText}>운영·수용 여부는 출발 전 응급실에 전화로 확인해주세요.</Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCall(hospital.emergencyPhone || hospital.phone)}
                >
                  <Text style={styles.actionButtonText}>전화</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleNavigation(hospital)}
                >
                  <Text style={styles.actionButtonText}>길찾기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() =>
                    router.push({
                      pathname: "/hospital-detail",
                      params: toHospitalDetailParams(hospital),
                    })
                  }
                >
                  <Text style={styles.detailButtonText}>상세보기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => handleShare(hospital)}
                >
                  <Text style={styles.shareButtonText}>공유</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screen },
  screen: { flex: 1 },
  header: { minHeight: 56, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: Type.screenTitle, fontWeight: "900", color: Colors.text },

  noticeBox: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: Colors.surfaceSunken, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  noticeText: { color: Colors.textSub, fontSize: Type.caption, lineHeight: 17 },

  listContent: { padding: 12, paddingBottom: 24 },

  stateBox: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 54 },
  stateText: { color: Colors.textMuted, fontSize: Type.body, textAlign: "center", paddingHorizontal: 24 },
  retryButton: { marginTop: 6, flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: Colors.navy, paddingHorizontal: 18, minHeight: 44, borderRadius: Radius.control, justifyContent: "center" },
  retryButtonText: { color: Colors.onDark, fontSize: Type.label, fontWeight: "800" },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 9 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  rankBox: { width: 26, height: 26, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken, alignItems: "center", justifyContent: "center" },
  rankText: { color: Colors.navySoft, fontSize: Type.label, fontWeight: "800" },
  titleBox: { flex: 1, minWidth: 0 },
  hospitalName: { fontSize: Type.title, fontWeight: "900", color: Colors.text },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  distanceText: { flex: 1, color: Colors.textMuted, fontSize: Type.caption },
  distanceFigure: { fontSize: Type.figure, fontWeight: "900", color: Colors.text },
  distanceUnit: { fontSize: Type.caption, fontWeight: "700", color: Colors.textMuted },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.control, backgroundColor: Colors.okBg },
  statusText: { color: Colors.ok, fontSize: Type.caption, fontWeight: "800" },
  warningBadge: { backgroundColor: Colors.surfaceSunken },
  warningText: { color: Colors.textSub },

  infoArea: { marginTop: 9, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 8 },
  updateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  updateText: { color: Colors.textMuted, fontSize: Type.caption },
  staleUpdateText: { color: Colors.urgent, fontWeight: "800" },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 26, gap: 10 },
  infoLabel: { color: Colors.textMuted, fontSize: Type.label },
  bedText: { color: Colors.text, fontSize: Type.figureSm, fontWeight: "900" },
  scoreText: { color: Colors.textSub, fontSize: Type.label, fontWeight: "800" },
  departmentText: { flex: 1, textAlign: "right", color: Colors.textSub, fontSize: Type.label, fontWeight: "700" },

  callNotice: { flexDirection: "row", gap: 7, alignItems: "flex-start", marginTop: 9, padding: 9, borderRadius: Radius.control, backgroundColor: Colors.cautionBg },
  callNoticeText: { flex: 1, color: Colors.caution, fontSize: Type.caption, lineHeight: 17 },

  buttonRow: { flexDirection: "row", gap: 5, marginTop: 10 },
  actionButton: { flex: 1, minHeight: 44, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.borderStrong, alignItems: "center", justifyContent: "center" },
  actionButtonText: { color: Colors.text, fontSize: Type.label, fontWeight: "800" },
  detailButton: { flex: 1, minHeight: 44, borderRadius: Radius.control, backgroundColor: Colors.navy, alignItems: "center", justifyContent: "center" },
  detailButtonText: { color: Colors.onDark, fontSize: Type.label, fontWeight: "800" },
  shareButton: { flex: 1, minHeight: 44, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.borderStrong, alignItems: "center", justifyContent: "center" },
  shareButtonText: { color: Colors.text, fontSize: Type.label, fontWeight: "800" },
});
