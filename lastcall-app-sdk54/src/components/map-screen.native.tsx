import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { NaverMapMarkerOverlay, NaverMapView } from "@mj-studio/react-native-naver-map";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";
import { fetchWithRetry } from "../services/http";
import { getCurrentLocationFast } from "../services/location";
import { Hospital, toHospitalDetailParams } from "../types/hospital";
import { Radius, ThemeColors, useThemeColors, useThemeStyles } from "../constants/design";

export default function MapScreen() {
  const Colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }>();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const location = await getCurrentLocationFast();
      if (!location.stage1) throw new Error("현재 지역을 확인하지 못했습니다.");
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
      const response = await fetchWithRetry(apiUrl(`/emergency/nearby?stage1=${encodeURIComponent(location.stage1)}&lat=${location.latitude}&lon=${location.longitude}&sort=distance`));
      if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
      const data: Hospital[] = await response.json();
      const validHospitals = data.filter((hospital) => Number.isFinite(hospital.latitude) && Number.isFinite(hospital.longitude)).slice(0, 30);
      setHospitals(validHospitals);
    } catch (loadError) {
      console.error("주변 응급실 조회 실패", loadError);
      setError("주변 응급실을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openMap = async (hospital: Hospital) => {
    const label = encodeURIComponent(hospital.hospitalName);
    const url = `geo:${hospital.latitude},${hospital.longitude}?q=${hospital.latitude},${hospital.longitude}(${label})`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("지도 열기 실패", "휴대폰에 설치된 지도 앱을 확인해주세요.");
    }
  };

  const call119 = () => {
    Alert.alert("119에 전화", "위급한 상황이면 즉시 119에 신고하세요.", [
      { text: "취소", style: "cancel" },
      { text: "전화하기", style: "destructive", onPress: () => void Linking.openURL("tel:119") },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>주변 응급실</Text>
          <Text style={styles.subtitle}>거리순 목록 · 선택하면 지도 앱으로 연결됩니다</Text>
        </View>
        <TouchableOpacity style={styles.emergencyButton} onPress={call119}>
          <FontAwesome6 name="phone" size={14} color={Colors.onDark} />
          <Text style={styles.emergencyText}>119</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.notice}>
        <FontAwesome6 name="triangle-exclamation" size={14} color={Colors.caution} />
        <Text style={styles.noticeText}>병상 정보는 변동될 수 있으니 출발 전 응급실에 전화로 확인하세요.</Text>
      </View>

      {region ? (
        <View style={styles.mapContainer}>
          <NaverMapView
            style={styles.map}
            initialRegion={region}
            isShowLocationButton
            isShowZoomControls={false}
            isShowScaleBar
            isShowCompass
          >
            <NaverMapMarkerOverlay
              latitude={region.latitude}
              longitude={region.longitude}
              image={{ symbol: "lightblue" }}
              width={28}
              height={36}
              caption={{ text: "현재 위치" }}
              zIndex={100}
            />
            {hospitals.map((hospital, index) => (
              <NaverMapMarkerOverlay
                key={`${hospital.hpid}-marker-${index}`}
                latitude={hospital.latitude}
                longitude={hospital.longitude}
                image={{ symbol: hospital.availableBeds > 0 ? "red" : "gray" }}
                width={30}
                height={40}
                caption={{ text: hospital.hospitalName }}
                subCaption={{ text: `${hospital.distance}km · ${hospital.availableBeds > 0 ? `${hospital.availableBeds}병상` : "확인 필요"}` }}
                onTap={() => router.push({ pathname: "/hospital-detail", params: toHospitalDetailParams(hospital) })}
              />
            ))}
          </NaverMapView>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.state}><ActivityIndicator size="large" color={Colors.navy} /><Text style={styles.stateText}>가까운 응급실을 찾고 있습니다</Text></View>
      ) : error ? (
        <View style={styles.state}>
          <FontAwesome6 name="location-crosshairs" size={34} color={Colors.textFaint} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void load()}><Text style={styles.retryText}>다시 시도</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hospitals}
          keyExtractor={(hospital, index) => `${hospital.hpid}-${index}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>표시할 응급실이 없습니다.</Text>}
          renderItem={({ item: hospital, index }) => (
            <View style={styles.card}>
              <TouchableOpacity style={styles.cardMain} onPress={() => router.push({ pathname: "/hospital-detail", params: toHospitalDetailParams(hospital) })}>
                <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
                <View style={styles.hospitalInfo}>
                  <Text style={styles.hospitalName} numberOfLines={1}>{hospital.hospitalName}</Text>
                  <Text style={styles.hospitalMeta} numberOfLines={1}>{hospital.distance}km · 응급병상 {hospital.availableBeds > 0 ? `${hospital.availableBeds}개` : "확인 필요"}</Text>
                  <Text style={styles.address} numberOfLines={1}>{hospital.address}</Text>
                </View>
                <FontAwesome6 name="chevron-right" size={13} color={Colors.textFaint} />
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.mapButton} onPress={() => void openMap(hospital)}>
                  <FontAwesome6 name="map-location-dot" size={14} color={Colors.navySoft} /><Text style={styles.mapText}>지도 앱에서 보기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.callButton} onPress={() => void Linking.openURL(`tel:${hospital.emergencyPhone || hospital.phone}`)}>
                  <FontAwesome6 name="phone" size={13} color={Colors.ok} /><Text style={styles.callText}>응급실 전화</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screen },
  header: { minHeight: 72, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface },
  title: { fontSize: 20, fontWeight: "900", color: Colors.text },
  subtitle: { marginTop: 4, fontSize: 11, color: Colors.textMuted },
  emergencyButton: { minWidth: 68, minHeight: 44, borderRadius: Radius.control, backgroundColor: Colors.urgent, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  emergencyText: { color: Colors.onDark, fontSize: 15, fontWeight: "900" },
  notice: { flexDirection: "row", gap: 8, alignItems: "flex-start", margin: 14, marginBottom: 4, padding: 12, borderRadius: Radius.card, backgroundColor: Colors.cautionBg },
  noticeText: { flex: 1, color: Colors.caution, fontSize: 12, lineHeight: 18 },
  mapContainer: { height: 270, marginHorizontal: 14, marginTop: 10, borderRadius: Radius.card, overflow: "hidden", backgroundColor: Colors.border },
  map: { flex: 1 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  stateText: { marginTop: 12, color: Colors.textMuted, fontSize: 14 },
  errorText: { marginTop: 12, color: Colors.urgent, fontSize: 15, fontWeight: "800" },
  retryButton: { marginTop: 16, backgroundColor: Colors.navy, paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.card },
  retryText: { color: Colors.onDark, fontWeight: "900" },
  list: { padding: 14, paddingBottom: 28 },
  card: { marginBottom: 11, borderRadius: Radius.card, backgroundColor: Colors.surface, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  cardMain: { minHeight: 84, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  rank: { width: 30, height: 30, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken, alignItems: "center", justifyContent: "center" },
  rankText: { color: Colors.navySoft, fontWeight: "900" },
  hospitalInfo: { flex: 1 },
  hospitalName: { color: Colors.text, fontSize: 15, fontWeight: "900" },
  hospitalMeta: { marginTop: 5, color: Colors.textSub, fontSize: 12, fontWeight: "700" },
  address: { marginTop: 4, color: Colors.textFaint, fontSize: 11 },
  actions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: Colors.surfaceSunken },
  mapButton: { flex: 1, minHeight: 44, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: Colors.surfaceSunken },
  mapText: { color: Colors.navySoft, fontSize: 12, fontWeight: "800" },
  callButton: { flex: 1, minHeight: 44, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  callText: { color: Colors.ok, fontSize: 12, fontWeight: "800" },
  emptyText: { textAlign: "center", color: Colors.textMuted, paddingVertical: 40 },
});
