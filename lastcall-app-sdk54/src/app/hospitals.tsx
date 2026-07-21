import * as Location from "expo-location";
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
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Hospital = {
  hpid: string;
  hospitalName: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  latitude: number;
  longitude: number;
  availableBeds: number;
  distance: number;
  recommendScore: number;
  matchedDepartments: string;
};


export default function HospitalsScreen() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  const { stage1, stage2, symptom } = useLocalSearchParams<{
    stage1: string;
    stage2?: string;
    symptom?: string;
  }>();

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        console.log("stage1 =", stage1);
        console.log("stage2 =", stage2);
        console.log("symptom =", symptom);

        if (!stage1) {
          console.log("시/도 정보가 없습니다.");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});

        const latitude = location.coords.latitude;
        const longitude = location.coords.longitude;

        console.log("현재 위도 =", latitude);
        console.log("현재 경도 =", longitude);

        // 와이파이 바꾸면 ip주소 바꿔야함
        let url = `http://192.168.45.113:8080/emergency/nearby?stage1=${encodeURIComponent(
          stage1
        )}&lat=${latitude}&lon=${longitude}`;

        if (stage2) {
          url += `&stage2=${encodeURIComponent(stage2)}`;
        }

        if (symptom) {
          url += `&symptom=${encodeURIComponent(String(symptom))}`;
        }

        console.log("요청 URL =", url);

        const response = await fetch(url);

        console.log("응답 상태 =", response.status);

        const data = await response.json();

        console.log("받아온 데이터 =", data);

        setHospitals(data);
      } catch (error) {
        console.log("응급실 목록 불러오기 실패:", error);
      }
    };

    fetchHospital();
  }, [stage1, stage2, symptom]);

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
      `🏥 ${hospital.hospitalName}\n\n` +
      `📍 주소: ${hospital.address}\n` +
      `☎️ 응급실 전화: ${hospital.emergencyPhone || hospital.phone}\n` +
      `🚑 거리: ${hospital.distance}km\n\n` +
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
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>추천 응급실</Text>

          <TouchableOpacity onPress={() => router.push("/filter")}>
            <Text style={styles.filterIcon}>⌕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>증상 관련 진료과, 가용 병상, 거리를 기준으로 추천합니다.</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {hospitals.map((hospital, index) => (
            <View key={hospital.hpid} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.rankBox}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>

                <View style={styles.titleBox}>
                  <Text style={styles.hospitalName}>{hospital.hospitalName}</Text>
                  <Text style={styles.distanceText}>
                    📍 {hospital.distance}km · {hospital.address}
                  </Text>
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
                      params: {
                        hpid: hospital.hpid,
                        hospitalName: hospital.hospitalName,
                        address: hospital.address,
                        phone: hospital.phone,
                        emergencyPhone: hospital.emergencyPhone,
                        availableBeds: String(hospital.availableBeds),
                        distance: String(hospital.distance),
                        latitude: String(hospital.latitude),
                        longitude: String(hospital.longitude),
                      },
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
  backIcon: {
    fontSize: 34,
    fontWeight: "500",
    color: "#111827",
  },
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