import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

type MyLocation = {
  latitude: number;
  longitude: number;
}
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
};
export default function MapScreen() {
  const [myLocation, setMyLocation] = useState<MyLocation | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  useEffect(() => {
    const getMyLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("위치 권한이 필요합니다.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      setMyLocation({
        latitude,
        longitude,
      });
      // 여기도 바꿔야됌!
      const url = `http://192.168.45.152:8080/emergency/nearby?stage1=${encodeURIComponent(
        "대전광역시"
      )}&lat=${latitude}&lon=${longitude}`;

      console.log("지도 요청 URL =", url);

      const response = await fetch(url);
      const data = await response.json();

      console.log("지도 병원 데이터 =", data);

      setHospitals(data);
    };

    getMyLocation();
  }, []);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>지도 보기</Text>

        <View style={{ width: 32 }} />
      </View>

      <MapView
        style={styles.map}
        region={{
          latitude: myLocation?.latitude ?? 36.325,
          longitude: myLocation?.longitude ?? 127.41,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
        showsUserLocation={true}
      >

        {hospitals.map((hospital) => (
          <Marker
            key={hospital.hpid}
            coordinate={{
              latitude: hospital.latitude,
              longitude: hospital.longitude,
            }}
            title={hospital.hospitalName}
            description={`${hospital.distance}km · 가용 병상 ${hospital.availableBeds}개`}
          />
        ))}
      </MapView>

      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>주변 응급실</Text>

        <ScrollView
          style={styles.hospitalScroll}
          showsVerticalScrollIndicator={false}
        >
          {hospitals.map((hospital) => (
            <TouchableOpacity
              key={hospital.hpid}
              style={styles.hospitalCard}
              onPress={() => router.push("/hospital-detail")}
            >
              <View style={styles.hospitalTextBox}>
                <Text style={styles.hospitalName} numberOfLines={1}>
                  {hospital.hospitalName}
                </Text>
                <Text style={styles.hospitalInfo} numberOfLines={1}>
                  {hospital.distance}km · 가용 병상 {hospital.availableBeds}개
                </Text>
              </View>

              <Text style={styles.detailText}>상세</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backText: {
    fontSize: 36,
    color: "#111827",
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  hospitalCard: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hospitalScroll: {
    maxHeight: 210,
  },
  hospitalTextBox: {
    flex: 1,
    marginRight: 8,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  hospitalInfo: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  detailText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
});