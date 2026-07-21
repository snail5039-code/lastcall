import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useLocalSearchParams } from "expo-router";
import { ComponentProps, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";

type IconName = ComponentProps<typeof FontAwesome6>["name"];

const departmentIconRules: { keyword: string; icon: IconName }[] = [
  { keyword: "소아", icon: "baby" }, { keyword: "응급", icon: "truck-medical" },
  { keyword: "심장", icon: "heart-pulse" }, { keyword: "순환기", icon: "heart-pulse" },
  { keyword: "호흡기", icon: "lungs" }, { keyword: "흉부", icon: "lungs" },
  { keyword: "신경", icon: "brain" }, { keyword: "정형", icon: "bone" },
  { keyword: "외과", icon: "scalpel" }, { keyword: "산부", icon: "person-pregnant" },
  { keyword: "안과", icon: "eye" }, { keyword: "이비인후", icon: "ear-listen" },
  { keyword: "치과", icon: "tooth" }, { keyword: "정신", icon: "head-side-virus" },
  { keyword: "영상", icon: "x-ray" }, { keyword: "마취", icon: "syringe" },
  { keyword: "재활", icon: "wheelchair-move" }, { keyword: "내과", icon: "stethoscope" },
];

const severeLabels: Record<string, string> = {
  brainHemorrhage: "뇌출혈 수술", cerebralInfarction: "뇌경색 재관류", myocardialInfarction: "심근경색 재관류",
  abdominalInjury: "복부손상 수술", limbReattachment: "사지접합", emergencyEndoscopy: "응급내시경",
  emergencyDialysis: "응급투석", prematureLabor: "조산 산모", mentalEmergency: "정신질환자",
  newborn: "신생아", severeBurn: "중증화상",
};

const iconForDepartment = (department: string): IconName =>
  departmentIconRules.find(({ keyword }) => department.includes(keyword))?.icon ?? "user-doctor";

type FavoriteHospital = {
  hpid: string;
  hospitalName: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  availableBeds: string;
  distance: string;
  latitude: string;
  longitude: string;
};
export default function HospitalDetailScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const {
    hpid,
    hospitalName,
    address,
    phone,
    emergencyPhone,
    availableBeds,
    distance,
    latitude,
    longitude,
    operatingRooms, neuroIcuBeds, neonatalIcuBeds, chestIcuBeds, generalIcuBeds, inpatientBeds,
    ctAvailable, mriAvailable, angiographyAvailable, ventilatorAvailable, ambulanceAvailable,
    pediatricVentilatorAvailable, incubatorAvailable, severeCapabilities, departments,
  } = params;

  const [isFavorite, setIsFavorite] = useState(false);
  const currentHospital: FavoriteHospital = {
    hpid: String(hpid || ""),
    hospitalName: String(hospitalName || ""),
    address: String(address || ""),
    phone: String(phone || ""),
    emergencyPhone: String(emergencyPhone || ""),
    availableBeds: String(availableBeds || ""),
    distance: String(distance || ""),
    latitude: String(latitude || ""),
    longitude: String(longitude || ""),
  };

  const checkFavoriteStatus = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favoriteHospitals");

      if (!savedFavorites) {
        setIsFavorite(false);
        return;
      }

      const favoriteList: FavoriteHospital[] = JSON.parse(savedFavorites);

      const exists = favoriteList.some(
        (hospital) => hospital.hpid === currentHospital.hpid
      );

      setIsFavorite(exists);
    } catch (error) {
      console.log("즐겨찾기 확인 실패:", error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favoriteHospitals");

      const favoriteList: FavoriteHospital[] = savedFavorites
        ? JSON.parse(savedFavorites)
        : [];

      const exists = favoriteList.some(
        (hospital) => hospital.hpid === currentHospital.hpid
      );

      let newFavoriteList: FavoriteHospital[] = [];

      if (exists) {
        newFavoriteList = favoriteList.filter(
          (hospital) => hospital.hpid !== currentHospital.hpid
        );

        await AsyncStorage.setItem(
          "favoriteHospitals",
          JSON.stringify(newFavoriteList)
        );

        setIsFavorite(false);
        Alert.alert("해제 완료", "즐겨찾기에서 해제되었습니다.");
        return;
      }

      newFavoriteList = [...favoriteList, currentHospital];

      await AsyncStorage.setItem(
        "favoriteHospitals",
        JSON.stringify(newFavoriteList)
      );

      setIsFavorite(true);
      Alert.alert("추가 완료", "즐겨찾기에 추가되었습니다.");
    } catch (error) {
      console.log("즐겨찾기 처리 실패:", error);
      Alert.alert("오류", "즐겨찾기 처리 중 문제가 발생했습니다.");
    }
  };

  useEffect(() => {
    checkFavoriteStatus();
  }, [hpid]);

  const bedCount = Number(availableBeds);
  const [departmentList, setDepartmentList] = useState<string[]>(() => (departments ?? "").split(",").map((item) => item.trim()).filter(Boolean));
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const visibleDepartments = showAllDepartments
    ? departmentList
    : departmentList.slice(0, 6);

  useEffect(() => {
    const fetchDepartmentInfo = async () => {
      try {
        if (!hpid) {
          return;
        }
        const url = apiUrl(`/emergency/basic-info-test?hpid=${hpid}`);

        console.log("진료과목 요청 URL =", url);

        const response = await fetch(url);
        const data = await response.json();

        const departmentText =
          data?.response?.body?.items?.item?.dgidIdName ?? "";

        const departments = departmentText
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean);

        console.log("진료과목 =", departments);

        setDepartmentList(departments);
      } catch (error) {
        console.log("진료과목 불러오기 실패:", error);
      }
    };

    fetchDepartmentInfo();
  }, [hpid]);

  const bedItems = [
    { label: "응급실", value: Number(availableBeds), icon: "bed-pulse" as IconName },
    { label: "일반 중환자실", value: Number(generalIcuBeds), icon: "heart-pulse" as IconName },
    { label: "신경 중환자실", value: Number(neuroIcuBeds), icon: "brain" as IconName },
    { label: "신생아 중환자실", value: Number(neonatalIcuBeds), icon: "baby" as IconName },
    { label: "흉부 중환자실", value: Number(chestIcuBeds), icon: "lungs" as IconName },
    { label: "입원실", value: Number(inpatientBeds), icon: "bed" as IconName },
    { label: "수술실", value: Number(operatingRooms), icon: "scalpel" as IconName },
  ];
  const facilityItems = [
    { label: "CT", available: ctAvailable === "true", icon: "x-ray" as IconName },
    { label: "MRI", available: mriAvailable === "true", icon: "magnet" as IconName },
    { label: "조영촬영기", available: angiographyAvailable === "true", icon: "camera-retro" as IconName },
    { label: "인공호흡기", available: ventilatorAvailable === "true", icon: "lungs" as IconName },
    { label: "소아 인공호흡기", available: pediatricVentilatorAvailable === "true", icon: "baby" as IconName },
    { label: "인큐베이터", available: incubatorAvailable === "true", icon: "baby-carriage" as IconName },
    { label: "구급차", available: ambulanceAvailable === "true", icon: "truck-medical" as IconName },
  ];
  const severeSet = new Set((severeCapabilities ?? "").split(",").filter(Boolean));

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert("전화번호 없음", "등록된 전화번호가 없습니다.");
      return;
    }

    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleNavigation = () => {
    if (!latitude || !longitude) {
      Alert.alert("위치 정보 없음", "병원 위치 정보가 없습니다.");
      return;
    }

    Alert.alert("길찾기", "사용할 지도 앱을 선택하세요.", [
      {
        text: "카카오맵",
        onPress: () => {
          const name = encodeURIComponent(String(hospitalName));

          Linking.openURL(
            `https://map.kakao.com/link/to/${name},${latitude},${longitude}`
          );
        },
      },
      {
        text: "티맵",
        onPress: () => {
          const name = encodeURIComponent(String(hospitalName));

          Linking.openURL(
            `tmap://route?goalname=${name}&goalx=${longitude}&goaly=${latitude}`
          );
        },
      },
      {
        text: "취소",
        style: "cancel",
      },
    ]);
  };

  const handleShare = async () => {
    const name = encodeURIComponent(String(hospitalName));

    const kakaoMapUrl = `https://map.kakao.com/link/to/${name},${latitude},${longitude}`;

    const message =
      `${hospitalName}\n\n` +
      `주소: ${address}\n` +
      `응급실 전화: ${emergencyPhone || phone}\n` +
      `거리: ${distance}km\n\n` +
      `길찾기: ${kakaoMapUrl}\n\n` +
      `살려줌 추천 응급실`;

    await Share.share({
      message,
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기">
            <FontAwesome6 name="chevron-left" size={20} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>응급실 상세</Text>

          <TouchableOpacity style={styles.headerIconButton} accessibilityLabel="병원 정보">
            <FontAwesome6 name="circle-info" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.imageBox}>
          <FontAwesome6 name="hospital" size={42} color="#94A3B8" />
          <Text style={styles.imageText}>병원 이미지 영역</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleBox}>
              <Text style={styles.hospitalName}>{hospitalName}</Text>
              <Text style={styles.address}>{address}</Text>
            </View>

            <View style={styles.rightActionBox}>
              <TouchableOpacity
                style={[
                  styles.favoriteIconButton,
                  isFavorite && styles.favoriteIconButtonActive,
                ]}
                onPress={toggleFavorite}
              >
                <FontAwesome6 name="star" solid={isFavorite} size={19} color={isFavorite ? "#EF4444" : "#64748B"} />
              </TouchableOpacity>

              <View
                style={[
                  styles.statusBadge,
                  bedCount <= 0 && styles.warningBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    bedCount <= 0 && styles.statusWarningText,
                  ]}
                >
                  {bedCount > 0 ? "수용 가능" : "확인 필요"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.phoneRow}>
            <FontAwesome6 name="phone" size={15} color="#334155" />
            <Text style={styles.phoneText}>
              {emergencyPhone || phone || "전화번호 정보 없음"}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(emergencyPhone || phone)}
            >
              <Text style={styles.callButtonText}>전화</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapButton}
              onPress={handleNavigation}
            >
              <Text style={styles.mapButtonText}>길찾기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Text style={styles.shareButtonText}>공유</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>진료 가능 항목</Text>

            {departmentList.length > 0 ? (
              <>
                <View style={styles.departmentGrid}>
                  {visibleDepartments.map((department, index) => (
                    <View key={`${department}-${index}`} style={styles.departmentItem}>
                      <View style={styles.departmentIconBox}><FontAwesome6 name={iconForDepartment(department)} size={20} color="#E53935" /></View>
                      <Text style={styles.departmentText} numberOfLines={1}>{department}</Text>
                    </View>
                  ))}
                </View>

                {departmentList.length > 6 && (
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => setShowAllDepartments(!showAllDepartments)}
                  >
                    <Text style={styles.moreButtonText}>
                      {showAllDepartments ? "접기" : `더보기 ${departmentList.length - 6}개`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyInfoBox}>
                <Text style={styles.emptyInfoText}>
                  진료과목 정보가 없습니다.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>응급실 정보</Text>
              <Text style={styles.updateText}>실시간 정보</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>응급실 가용 병상</Text>
                <Text
                  style={[
                    styles.infoValue,
                    bedCount <= 0 && styles.statusWarningText,
                  ]}
                >
                  {bedCount > 0 ? `${bedCount}개` : "확인 필요"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>현재 위치와의 거리</Text>
                <Text style={styles.infoValue}>{distance}km</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>응급실 전화번호</Text>
                <Text style={styles.infoValue}>
                  {emergencyPhone || "정보 없음"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>대표 전화번호</Text>
                <Text style={styles.infoValue}>
                  {phone || "정보 없음"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>병상 현황</Text>
            <View style={styles.detailGrid}>
              {bedItems.map((item) => (
                <View key={item.label} style={styles.detailItem}>
                  <FontAwesome6 name={item.icon} size={18} color={item.value > 0 ? "#16A34A" : "#94A3B8"} />
                  <Text style={styles.detailLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={[styles.detailStatus, item.value <= 0 && styles.detailUnknown]}>{item.value > 0 ? `${item.value}개` : "확인 필요"}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>장비·시설</Text>
            <View style={styles.detailGrid}>
              {facilityItems.map((item) => (
                <View key={item.label} style={styles.detailItem}>
                  <FontAwesome6 name={item.icon} size={18} color={item.available ? "#2563EB" : "#94A3B8"} />
                  <Text style={styles.detailLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={[styles.detailStatus, item.available ? styles.detailAvailable : styles.detailUnknown]}>{item.available ? "가능" : "확인 필요"}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>중증질환 수용 정보</Text>
            <View style={styles.capabilityCard}>
              {Object.entries(severeLabels).map(([key, label]) => {
                const available = severeSet.has(key);
                return <View key={key} style={styles.capabilityRow}><Text style={styles.capabilityLabel}>{label}</Text><View style={[styles.capabilityBadge, available && styles.capabilityBadgeActive]}><FontAwesome6 name={available ? "check" : "minus"} size={11} color={available ? "#15803D" : "#94A3B8"} /><Text style={[styles.capabilityText, available && styles.capabilityTextActive]}>{available ? "가능" : "확인 필요"}</Text></View></View>;
              })}
            </View>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>방문 전 확인</Text>
            <Text style={styles.warningText}>
              실제 수용 가능 여부는 병원 상황에 따라 달라질 수 있으니 방문 전
              전화 확인을 권장합니다.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6FB",
  },
  header: {
    height: 56,
    paddingHorizontal: 18,
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
  infoIcon: {
    fontSize: 22,
    color: "#111827",
  },
  imageBox: {
    height: 190,
    marginHorizontal: 18,
    borderRadius: 22,
    backgroundColor: "#DDE6F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  imageIcon: {
    fontSize: 42,
    marginBottom: 8,
  },
  imageText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titleBox: {
    flex: 1,
    marginRight: 12,
  },
  hospitalName: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
  },
  statusBadge: {
    backgroundColor: "#E8F8EF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#16A34A",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  phoneIcon: {
    fontSize: 18,
    marginRight: 8,
    color: "#2563EB",
  },
  phoneText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2563EB",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 26,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  callButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  mapButton: {
    flex: 1,
    backgroundColor: "#061A44",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  mapButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  shareButton: {
    flex: 1,
    backgroundColor: "#EEF2F7",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareButtonText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "900",
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
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  updateText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "700",
    marginBottom: 14,
  },
  departmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  departmentItem: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 5,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  departmentIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFF1F1", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  departmentText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#16A34A",
  },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailItem: { width: "31%", minHeight: 104, backgroundColor: "#FFFFFF", borderRadius: 16, paddingHorizontal: 7, paddingVertical: 13, alignItems: "center", justifyContent: "center", gap: 6, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  detailLabel: { fontSize: 12, fontWeight: "800", color: "#475569", textAlign: "center" },
  detailStatus: { fontSize: 12, fontWeight: "900", color: "#16A34A" },
  detailAvailable: { color: "#2563EB" },
  detailUnknown: { color: "#94A3B8" },
  capabilityCard: { backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 5, elevation: 2 },
  capabilityRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  capabilityLabel: { fontSize: 14, fontWeight: "700", color: "#475569" },
  capabilityBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F1F5F9", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  capabilityBadgeActive: { backgroundColor: "#DCFCE7" },
  capabilityText: { fontSize: 11, fontWeight: "900", color: "#94A3B8" },
  capabilityTextActive: { color: "#15803D" },
  warningBox: {
    backgroundColor: "#FFF1F1",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#E53935",
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 20,
  },
  warningBadge: {
    backgroundColor: "#FFF4D8",
  },
  statusWarningText: {
    color: "#F59E0B",
  },
  emptyInfoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  emptyInfoText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  moreButton: {
    marginTop: 12,
    backgroundColor: "#EEF2F7",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },

  moreButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#334155",
  },
  rightActionBox: {
    alignItems: "flex-end",
    gap: 8,
  },

  favoriteIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  favoriteIconButtonActive: {
    backgroundColor: "#FFF1F1",
    borderColor: "#E53935",
  },

  favoriteStar: {
    fontSize: 22,
    fontWeight: "900",
    color: "#9CA3AF",
  },

  favoriteStarActive: {
    color: "#E53935",
  },
});
