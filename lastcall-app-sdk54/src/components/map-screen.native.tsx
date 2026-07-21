import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";
import { getCurrentLocationFast } from "../services/location";
import { Hospital, toHospitalDetailParams } from "../types/hospital";

export default function MapScreen() {
  const [region, setRegion] = useState<Region>();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  const openDetail = (hospital: Hospital) => router.push({
    pathname: "/hospital-detail",
    params: toHospitalDetailParams(hospital),
  });

  useEffect(() => {
    const load = async () => {
      try {
        const location = await getCurrentLocationFast();
        const currentRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        };
        setRegion(currentRegion);
        if (!location.stage1) throw new Error("현재 지역을 확인하지 못했습니다.");

        const url = apiUrl(`/emergency/nearby?stage1=${encodeURIComponent(location.stage1)}&lat=${currentRegion.latitude}&lon=${currentRegion.longitude}&sort=distance`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
        const data: Hospital[] = await response.json();
        const validHospitals = data
          .filter((hospital) => Number.isFinite(hospital.latitude) && Number.isFinite(hospital.longitude) && hospital.latitude !== 0 && hospital.longitude !== 0)
          .slice(0, 30);
        setHospitals(validHospitals);

        setTimeout(() => {
          if (!mapRef.current || validHospitals.length === 0) return;
          mapRef.current.fitToCoordinates(
            [currentRegion, ...validHospitals.slice(0, 8).map(({ latitude, longitude }) => ({ latitude, longitude }))],
            { edgePadding: { top: 45, right: 35, bottom: 45, left: 35 }, animated: true },
          );
        }, 250);
      } catch (error) {
        console.error("지도 병원 조회 실패", error);
        Alert.alert("조회 실패", "위치 권한과 서버 연결을 확인해주세요.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}><Text style={styles.title}>주변 응급실 지도</Text></View>
      <View style={styles.mapArea}>
        {region ? (
          <MapView ref={mapRef} style={styles.map} initialRegion={region} showsUserLocation showsMyLocationButton>
            {hospitals.map((hospital, index) => (
              <Marker
                key={`${hospital.hpid}-${index}`}
                coordinate={{ latitude: hospital.latitude, longitude: hospital.longitude }}
                title={hospital.hospitalName}
                description={`${hospital.distance}km · 응급실 ${hospital.availableBeds}병상`}
                onCalloutPress={() => openDetail(hospital)}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.loading}>{loading ? <ActivityIndicator size="large" color="#EF4444" /> : <FontAwesome6 name="location-crosshairs" size={34} color="#94A3B8" />}</View>
        )}
        {loading && region && <View style={styles.loadingOverlay}><ActivityIndicator size="small" color="#EF4444" /><Text style={styles.loadingText}>주변 응급실을 불러오는 중입니다</Text></View>}
      </View>

      <View style={styles.listArea}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>가까운 응급실</Text>
          <Text style={styles.listCount}>{hospitals.length}곳 · 거리순</Text>
        </View>
        <FlatList
          data={hospitals}
          keyExtractor={(hospital, index) => `${hospital.hpid}-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>표시할 응급실이 없습니다.</Text> : null}
          renderItem={({ item: hospital, index }) => (
            <TouchableOpacity style={styles.hospitalRow} onPress={() => openDetail(hospital)} activeOpacity={0.75}>
              <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
              <View style={styles.hospitalTextBox}>
                <Text style={styles.hospitalName} numberOfLines={1}>{hospital.hospitalName}</Text>
                <Text style={styles.hospitalMeta} numberOfLines={1}>{hospital.distance}km · {hospital.address}</Text>
              </View>
              <View style={styles.bedBox}><Text style={styles.bedCount}>{hospital.availableBeds > 0 ? `${hospital.availableBeds}개` : "확인"}</Text><Text style={styles.bedLabel}>응급병상</Text></View>
              <FontAwesome6 name="chevron-right" size={13} color="#94A3B8" />
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6FB" },
  header: { height: 50, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },
  mapArea: { height: "48%", minHeight: 250 },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingOverlay: { position: "absolute", top: 12, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FFFFFF", paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20, elevation: 5 },
  loadingText: { color: "#475569", fontSize: 13, fontWeight: "800" },
  listArea: { flex: 1, backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, marginTop: -16, paddingTop: 16, elevation: 8 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingBottom: 10 },
  listTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  listCount: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  listContent: { paddingHorizontal: 14, paddingBottom: 24 },
  hospitalRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingVertical: 10, paddingHorizontal: 4 },
  rank: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FFF1F1", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#EF4444", fontWeight: "900", fontSize: 13 },
  hospitalTextBox: { flex: 1 },
  hospitalName: { fontSize: 14, fontWeight: "900", color: "#1F2937", marginBottom: 5 },
  hospitalMeta: { fontSize: 12, color: "#64748B" },
  bedBox: { minWidth: 43, alignItems: "center" },
  bedCount: { fontSize: 13, fontWeight: "900", color: "#16A34A" },
  bedLabel: { fontSize: 10, color: "#94A3B8", marginTop: 2 },
  emptyText: { textAlign: "center", color: "#64748B", paddingVertical: 34 },
});
