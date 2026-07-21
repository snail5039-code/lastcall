import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

const emergencyInfo = [
  { label: "응급실 가용 병상", value: "8 / 15개", status: "good" },
  { label: "중환자실 가용 병상", value: "3 / 8개", status: "good" },
  { label: "수술실 가능 여부", value: "가능", status: "good" },
  { label: "CT 촬영 가능", value: "가능", status: "good" },
  { label: "MRI 촬영 가능", value: "가능", status: "good" },
];

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
  } = useLocalSearchParams<{
    hpid: string;
    hospitalName: string;
    address: string;
    phone: string;
    emergencyPhone: string;
    availableBeds: string;
    distance: string;
    latitude: string;
    longitude: string;
  }>();

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
  const [departmentList, setDepartmentList] = useState<string[]>([]);
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
        // 여기도 와이파이 연결할때 마다 주소 바꿔야함
        const url = `http://192.168.45.113:8080/emergency/basic-info-test?hpid=${hpid}`;

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
      `🏥 ${hospitalName}\n\n` +
      `📍 주소: ${address}\n` +
      `☎️ 응급실 전화: ${emergencyPhone || phone}\n` +
      `🚑 거리: ${distance}km\n\n` +
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>응급실 상세</Text>

          <TouchableOpacity>
            <Text style={styles.infoIcon}>ⓘ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.imageBox}>
          <Text style={styles.imageIcon}>🏥</Text>
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
                <Text
                  style={[
                    styles.favoriteStar,
                    isFavorite && styles.favoriteStarActive,
                  ]}
                >
                  {isFavorite ? "★" : "☆"}
                </Text>
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
            <Text style={styles.phoneIcon}>☎</Text>
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
                      <Text style={styles.departmentIcon}>◆</Text>
                      <Text style={styles.departmentText}>{department}</Text>
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
  backIcon: {
    fontSize: 36,
    color: "#111827",
  },
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
    paddingVertical: 16,
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
  departmentIcon: {
    fontSize: 18,
    color: "#E53935",
    marginBottom: 8,
  },
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