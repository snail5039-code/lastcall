import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const symptoms = [
  { id: 1, name: "고열", icon: "🌡️" },
  { id: 2, name: "가슴통증", icon: "🫀" },
  { id: 3, name: "호흡곤란", icon: "🫁" },
  { id: 4, name: "복통", icon: "🔥" },
  { id: 5, name: "외상", icon: "🩹" },
  { id: 6, name: "소아응급", icon: "👶" },
];

export default function HomeScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [addressText, setAddressText] = useState("현재 위치 확인 중...");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [stage1, setStage1] = useState("");
  const [stage2, setStage2] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setAddressText("위치 권한이 필요합니다");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const { latitude, longitude } = location.coords;
      setCurrentLat(latitude);
      setCurrentLon(longitude);

      const addressList = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const address = addressList[0];

      const region = address?.region ?? "";
      const district = address?.district ?? "";
      const street = address?.street ?? "";
      const name = address?.name ?? "";
      setStage1(region);
      setStage2(district);
      console.log("현재 위치 정보:", {
        latitude,
        longitude,
        region,
        district,
        street,
        name,
      });
      const fullAddress = [region, district, street, name]
        .filter(Boolean)
        .join(" ");

      setAddressText(fullAddress || "현재 위치 확인됨");
    } catch (error) {
      console.log("현재 위치 조회 실패:", error);
      setAddressText("위치 조회 실패");
    }
  };
  const handleSearchEmergency = () => {
    if (currentLat === null || currentLon === null) {
      console.log("현재 위치 좌표가 없습니다.");
      return;
    }

    if (!stage1) {
      console.log("시/도 정보가 없습니다.");
      return;
    }

    console.log("검색 버튼 클릭 selectedSymptom =", selectedSymptom);

    router.push({
      pathname: "/hospitals",
      params: {
        stage1: stage1,
        lat: String(currentLat),
        lon: String(currentLon),
        symptom: selectedSymptom ?? "",
      },
    });
  };
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setIsMenuOpen(!isMenuOpen)}>
            <Text style={styles.topIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.topIcon}>🔔</Text>
        </View>

        {isMenuOpen && (
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);

                router.push({
                  pathname: "/community-board",
                  params: {
                    boardType: "NOTICE",
                  },
                });
              }}
            >
              <Text style={styles.menuItemText}>📢 공지사항</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);

                router.push({
                  pathname: "/community-board",
                  params: {
                    boardType: "FREE",
                  },
                });
              }}
            >
              <Text style={styles.menuItemText}>💬 자유게시판</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);

                router.push({
                  pathname: "/community-board",
                  params: {
                    boardType: "SUGGESTION",
                  },
                });
              }}
            >
              <Text style={styles.menuItemText}>📝 건의사항</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setIsMenuOpen(false);

                router.push({
                  pathname: "/community-board",
                  params: {
                    boardType: "QNA",
                  },
                });
              }}
            >
              <Text style={styles.menuItemText}>❓ Q&A 게시판</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.logoArea}>
          <Text style={styles.logo}>
            <Text style={styles.logoRed}>살려</Text>줌
          </Text>
          <Text style={styles.mainText}>응급상황, 가장 가까운</Text>
          <Text style={styles.mainText}>응급실을 빠르게 찾아드립니다</Text>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <View>
              <Text style={styles.locationLabel} numberOfLines={1}>현재 위치</Text>
              <Text style={styles.locationText}>{addressText}</Text>
            </View>
          </View>
          <Text style={styles.settingIcon}>⚙️</Text>
        </View>

        <View style={styles.symptomCard}>
          <Text style={styles.sectionTitle}>증상 선택</Text>
          <Text style={styles.sectionSubText}>해당 증상을 선택해주세요</Text>

          <View style={styles.symptomGrid}>
            {symptoms.map((symptom) => (
              <TouchableOpacity
                key={symptom.id}
                style={[
                  styles.symptomItem,
                  selectedSymptom === symptom.name && styles.selectedSymptom,
                ]}
                onPress={() => setSelectedSymptom(symptom.name)}
              >
                <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                <Text
                  style={[
                    styles.symptomText,
                    selectedSymptom === symptom.name && styles.selectedSymptomText,
                  ]}
                >
                  {symptom.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchEmergency}
        >
          <Text style={styles.searchButtonText}>🔍 응급실 검색하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => router.push("/emergency-help")}
        >
          <Text style={styles.helpButtonText}>🚨 응급 대처 안내</Text>
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
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  topIcon: {
    fontSize: 22,
    color: "#111827",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 26,
  },
  logo: {
    fontSize: 38,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  logoRed: {
    color: "#E53935",
  },
  mainText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 24,
  },

  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  locationLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  settingIcon: {
    fontSize: 20,
  },
  symptomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  sectionSubText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 16,
  },
  symptomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  symptomItem: {
    width: "31%",
    height: 86,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  selectedSymptom: {
    backgroundColor: "#FFF1F1",
    borderColor: "#E53935",
  },
  symptomIcon: {
    fontSize: 25,
    marginBottom: 8,
  },
  symptomText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  selectedSymptomText: {
    color: "#E53935",
  },
  searchButton: {
    backgroundColor: "#061A44",
    borderRadius: 15,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 10,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  helpButton: {
    backgroundColor: "#FFF1F1",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 4,
  },
  helpButtonText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "900",
  },

  menuBox: {
    position: "absolute",
    top: 52,
    left: 22,
    width: 210,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    zIndex: 100,
    elevation: 8,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  menuItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
});