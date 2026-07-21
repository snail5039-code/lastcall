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
            <FontAwesome6 name="chevron-left" size={20} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>추천 응급실</Text>

          <TouchableOpacity onPress={() => router.push({ pathname: "/filter", params: { stage1, ...(stage2 && { stage2 }), ...(lat && { lat }), ...(lon && { lon }), ...(symptom && { symptom }), ...(keyword && { keyword }), ...(sort && { sort }), ...(department && { department }), ...(bedTypes && { bedTypes }), ...(facilities && { facilities }), ...(severeTypes && { severeTypes }) } })}>
            <FontAwesome6 name="sliders" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{keyword ? `“${keyword}” 검색 결과입니다.` : "증상 관련 진료과, 가용 병상, 거리를 기준으로 추천합니다."}</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {loading && <View style={styles.stateBox}><ActivityIndicator size="large" color="#EF4444" /><Text style={styles.stateText}>가까운 응급실을 찾고 있습니다</Text></View>}
          {!loading && errorMessage ? <View style={styles.stateBox}><FontAwesome6 name="triangle-exclamation" size={28} color="#EF4444" /><Text style={styles.stateText}>{errorMessage}</Text><TouchableOpacity style={styles.retryButton} onPress={() => setRequestVersion((value) => value + 1)}><FontAwesome6 name="rotate-right" size={13} color="#FFFFFF" /><Text style={styles.retryButtonText}>다시 시도</Text></TouchableOpacity></View> : null}
          {!loading && !errorMessage && hospitals.length === 0 ? <View style={styles.stateBox}><FontAwesome6 name="hospital" size={28} color="#94A3B8" /><Text style={styles.stateText}>선택한 조건에 맞는 응급실이 없습니다</Text></View> : null}
          {hospitals.map((hospital, index) => (
            <View key={hospital.hpid} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.rankBox}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>

                <View style={styles.titleBox}>
                  <Text style={styles.hospitalName}>{hospital.hospitalName}</Text>
                  <View style={styles.distanceRow}><FontAwesome6 name="location-dot" size={12} color="#6B7280" /><Text style={styles.distanceText}>{hospital.distance}km · {hospital.address}</Text></View>
                </View>

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
                    {hospital.availableBeds > 0 ? "수용 가능" : "확인 필요"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoArea}>
                <View style={styles.updateRow}>
                  <FontAwesome6 name="clock-rotate-left" size={12} color={isUpdatedAtStale(hospital.dataUpdatedAt) ? "#DC2626" : "#64748B"} />
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
                <FontAwesome6 name="phone" size={12} color="#B45309" />
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
  container: {
    flex: 1,
    backgroundColor: "#F3F6FB",
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  filterIcon: {
    fontSize: 22,
    color: "#111827",
  },
  noticeBox: {
    backgroundColor: "#EAF3FF",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  noticeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4777A8",
  },
  listContent: {
    paddingBottom: 30,
  },
  stateBox: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
  stateText: { textAlign: "center", color: "#64748B", fontSize: 14, fontWeight: "700" },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#061A44", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  retryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  rankBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rankText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  titleBox: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
  },
  distanceText: {
    fontSize: 13,
    color: "#6B7280",
  },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusBadge: {
    backgroundColor: "#E8F8EF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#16A34A",
  },
  warningBadge: {
    backgroundColor: "#FFF4D8",
  },
  warningText: {
    color: "#F59E0B",
  },
  infoArea: {
    marginBottom: 14,
  },
  updateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  updateText: { fontSize: 12, color: "#64748B", fontWeight: "700" },
  staleUpdateText: { color: "#DC2626" },
  callNotice: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#FFFBEB", borderRadius: 10, padding: 10, marginBottom: 12 },
  callNoticeText: { flex: 1, fontSize: 12, lineHeight: 17, color: "#92400E", fontWeight: "700" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  bedText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#16A34A",
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#DC2626",
  },
  departmentText: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "900",
    color: "#2563EB",
    marginLeft: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  detailButton: {
    flex: 1,
    backgroundColor: "#061A44",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  shareButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
});
