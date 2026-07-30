import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../../config/api";
import { getCurrentLocationFast } from "../../services/location";
import { clearRecentHospitals, getRecentHospitals, RecentHospital } from "../../services/recent-hospitals";
import { Hospital, toHospitalDetailParams } from "../../types/hospital";

type FavoriteHospital = Partial<Hospital> & {
  hpid: string;
  hospitalName: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  availableBeds: number | string;
  distance: number | string;
  latitude: number | string;
  longitude: number | string;
};

export default function FavoritesScreen() {
  const [favoriteList, setFavoriteList] = useState<FavoriteHospital[]>([]);
  const [recentList, setRecentList] = useState<RecentHospital[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadFavoriteHospitals = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favoriteHospitals");

      if (!savedFavorites) {
        setFavoriteList([]);
        return;
      }

      const parsedList: FavoriteHospital[] = JSON.parse(savedFavorites);

      setFavoriteList(parsedList);
      setIsRefreshing(true);

      const location = await getCurrentLocationFast();
      const stage1List = [...new Set(parsedList.map((hospital) => hospital.address.split(" ")[0]).filter(Boolean))];
      const responses = await Promise.all(stage1List.map(async (stage1) => {
        const response = await fetch(apiUrl(`/emergency/nearby?stage1=${encodeURIComponent(stage1)}&lat=${location.latitude}&lon=${location.longitude}&includeDetails=true`));
        if (!response.ok) return [] as Hospital[];
        return response.json() as Promise<Hospital[]>;
      }));
      const latestById = new Map(responses.flat().map((hospital) => [hospital.hpid, hospital]));
      const refreshed = parsedList.map((saved) => latestById.get(saved.hpid) ?? saved);
      setFavoriteList(refreshed);
      await AsyncStorage.setItem("favoriteHospitals", JSON.stringify(refreshed));
    } catch (error) {
      console.log("즐겨찾기 목록 불러오기 실패:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const moveToDetail = (hospital: FavoriteHospital) => {
    router.push({
      pathname: "/hospital-detail",
      params: {
        ...toHospitalDetailParams(hospital as Hospital),
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadFavoriteHospitals();
      getRecentHospitals().then(setRecentList).catch(() => setRecentList([]));
    }, [])
  );
  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome6 name="chevron-left" size={20} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>즐겨찾기 병원</Text>

          <View style={{ width: 24 }} />
        </View>

        {isRefreshing && <View style={styles.refreshRow}><ActivityIndicator size="small" color="#EF4444" /><Text style={styles.refreshText}>최신 병상정보 확인 중</Text></View>}

        {favoriteList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>저장된 병원이 없습니다</Text>
            <Text style={styles.emptyText}>
              병원 상세 화면에서 별표를 눌러 즐겨찾기를 추가해보세요.
            </Text>
          </View>
        ) : (
          <View style={styles.listBox}>
            {favoriteList.map((hospital) => (
              <TouchableOpacity
                key={hospital.hpid}
                style={styles.hospitalCard}
                onPress={() => moveToDetail(hospital)}
              >
                <Text style={styles.hospitalName}>{hospital.hospitalName}</Text>
                <Text style={styles.address}>{hospital.address}</Text>

                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>응급실 전화</Text>
                  <Text style={styles.cardInfoValue}>
                    {hospital.emergencyPhone || hospital.phone || "정보 없음"}
                  </Text>
                </View>

                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>가용 병상</Text>
                  <Text style={styles.cardInfoValue}>
                    {Number(hospital.availableBeds) > 0 ? `${hospital.availableBeds}개` : "확인 필요"}
                  </Text>
                </View>

                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>거리</Text>
                  <Text style={styles.cardInfoValue}>
                    {hospital.distance ? `${hospital.distance}km` : "정보 없음"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View>
              <Text style={styles.recentTitle}>최근 본 응급실</Text>
              <Text style={styles.recentSubtitle}>최근 확인한 병원은 최대 5곳까지 이 기기에 저장됩니다.</Text>
            </View>
            {recentList.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  void clearRecentHospitals().then(() => setRecentList([]));
                }}
              >
                <Text style={styles.clearText}>기록 삭제</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentList.length === 0 ? (
            <View style={styles.recentEmpty}><Text style={styles.recentEmptyText}>아직 확인한 응급실이 없습니다.</Text></View>
          ) : recentList.map((hospital) => (
            <TouchableOpacity
              key={`recent-${hospital.hpid}`}
              style={styles.recentCard}
              onPress={() => router.push({ pathname: "/hospital-detail", params: hospital })}
            >
              <View style={styles.recentIcon}><FontAwesome6 name="clock-rotate-left" size={14} color="#DC2626" /></View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentName} numberOfLines={1}>{hospital.hospitalName}</Text>
                <Text style={styles.recentMeta} numberOfLines={1}>{hospital.distance ? `${hospital.distance}km · ` : ""}{hospital.address}</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={12} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 18,
    marginTop: 24,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
  },
  listBox: {
    paddingHorizontal: 18,
    paddingBottom: 36,
  },
  refreshRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingBottom: 12 },
  refreshText: { fontSize: 13, color: "#64748B", fontWeight: "700" },

  hospitalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  hospitalName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },

  address: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
    marginBottom: 14,
  },

  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  cardInfoLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  cardInfoValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },
  recentSection: { marginHorizontal: 18, marginTop: 10, marginBottom: 36 },
  recentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  recentTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  recentSubtitle: { marginTop: 4, color: "#64748B", fontSize: 11 },
  clearText: { color: "#DC2626", fontSize: 12, fontWeight: "800" },
  recentEmpty: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, alignItems: "center" },
  recentEmptyText: { color: "#94A3B8", fontSize: 13 },
  recentCard: { minHeight: 70, paddingHorizontal: 14, flexDirection: "row", gap: 11, alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, marginBottom: 9, borderWidth: 1, borderColor: "#E2E8F0" },
  recentIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFF1F1", alignItems: "center", justifyContent: "center" },
  recentInfo: { flex: 1 },
  recentName: { color: "#1F2937", fontSize: 14, fontWeight: "900" },
  recentMeta: { marginTop: 5, color: "#64748B", fontSize: 11 },
});
