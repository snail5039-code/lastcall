import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

export default function FavoritesScreen() {
  const [favoriteList, setFavoriteList] = useState<FavoriteHospital[]>([]);
  const loadFavoriteHospitals = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favoriteHospitals");

      if (!savedFavorites) {
        setFavoriteList([]);
        return;
      }

      const parsedList: FavoriteHospital[] = JSON.parse(savedFavorites);

      setFavoriteList(parsedList);
    } catch (error) {
      console.log("즐겨찾기 목록 불러오기 실패:", error);
    }
  };

  const moveToDetail = (hospital: FavoriteHospital) => {
    router.push({
      pathname: "/hospital-detail",
      params: {
        hpid: hospital.hpid,
        hospitalName: hospital.hospitalName,
        address: hospital.address,
        phone: hospital.phone,
        emergencyPhone: hospital.emergencyPhone,
        availableBeds: hospital.availableBeds,
        distance: hospital.distance,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadFavoriteHospitals();
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
                    {hospital.availableBeds ? `${hospital.availableBeds}개` : "확인 필요"}
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
});
