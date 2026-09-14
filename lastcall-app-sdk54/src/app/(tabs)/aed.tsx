import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { apiUrl } from "../../config/api";
import { stage2Options } from "../../data/regions";
import { fetchWithRetry } from "../../services/http";
import { getCurrentLocationFast } from "../../services/location";
import { Colors, Radius } from "../../constants/design";

type Aed = {
  serialSeq: string;
  org: string;
  address: string;
  place: string;
  latitude: number;
  longitude: number;
  distance: number;
  manufacturer: string;
  model: string;
  openNow: boolean | null;
  hoursText: string;
};

const stage1Options = Object.keys(stage2Options);

/** 위치를 확인하지 못했을 때 거리 계산의 기준점. 서울시청 좌표다. */
const FALLBACK_COORDS = { latitude: 37.5665, longitude: 126.978 };

export default function AedScreen() {
  const [stage1, setStage1] = useState("");
  const [stage2, setStage2] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [keyword, setKeyword] = useState("");
  const [aeds, setAeds] = useState<Aed[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [picker, setPicker] = useState<"stage1" | "stage2" | null>(null);
  const [searched, setSearched] = useState(false);

  // Modal 은 SafeAreaView 바깥에 렌더되므로 안전영역이 적용되지 않는다.
  // 제스처 내비게이션 바에 시트 하단 항목이 가려 눌리지 않는 것을 막는다.
  const insets = useSafeAreaInsets();

  // 세종처럼 시·군·구가 없는 단층제 시·도는 시·도만으로 검색한다.
  const districts = stage2Options[stage1] ?? [];
  const needsDistrict = districts.length > 0;

  // 위치 권한을 이미 허용한 사용자만 지역이 자동으로 채워진다. 거부해도 직접 선택해 쓸 수 있다.
  useEffect(() => {
    getCurrentLocationFast()
      .then((location) => {
        setCoords({ latitude: location.latitude, longitude: location.longitude });
        if (!stage1 && location.stage1 && stage2Options[location.stage1]) {
          setStage1(location.stage1);
          if (location.stage2 && stage2Options[location.stage1].includes(location.stage2)) {
            setStage2(location.stage2);
          }
        }
      })
      .catch(() => undefined);
    // 최초 1회만 시도한다. 이후에는 사용자가 고른 지역을 덮어쓰지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = useCallback(async () => {
    if (!stage1 || (needsDistrict && !stage2)) {
      Alert.alert("지역 선택 필요", "AED는 설치 대수가 많아 시·도와 시·군·구를 모두 선택해야 합니다.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSearched(true);
    try {
      const base = coords ?? FALLBACK_COORDS;
      const url = apiUrl(
        `/aed/nearby?stage1=${encodeURIComponent(stage1)}` +
          (stage2 ? `&stage2=${encodeURIComponent(stage2)}` : "") +
          `&lat=${base.latitude}&lon=${base.longitude}&limit=100` +
          (keyword.trim() ? `&keyword=${encodeURIComponent(keyword.trim())}` : ""),
      );
      const response = await fetchWithRetry(url);
      if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
      setAeds(await response.json());
    } catch (error) {
      console.error("AED 조회 실패", error);
      setAeds([]);
      setErrorMessage("AED 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [stage1, stage2, coords, keyword, needsDistrict]);

  const openMap = async (aed: Aed) => {
    const label = encodeURIComponent(aed.org || "AED");
    try {
      await Linking.openURL(`geo:${aed.latitude},${aed.longitude}?q=${aed.latitude},${aed.longitude}(${label})`);
    } catch {
      Alert.alert("지도 열기 실패", "휴대폰에 설치된 지도 앱을 확인해주세요.");
    }
  };

  const call119 = () => {
    Alert.alert("119에 전화", "심정지가 의심되면 즉시 신고하세요.", [
      { text: "취소", style: "cancel" },
      { text: "전화하기", style: "destructive", onPress: () => void Linking.openURL("tel:119") },
    ]);
  };

  const selectStage1 = (value: string) => {
    setStage1(value);
    setStage2("");
    setPicker(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기">
          <FontAwesome6 name="chevron-left" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>주변 AED 찾기</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.warning}>
        <FontAwesome6 name="triangle-exclamation" size={14} color={Colors.urgent} />
        <Text style={styles.warningText}>
          심정지가 의심되면 먼저 119에 신고하고 가슴압박을 시작하세요. AED는 주변 사람에게 요청해 가져오는 것이 빠릅니다.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <View style={styles.regionRow}>
          <TouchableOpacity style={styles.regionButton} onPress={() => setPicker("stage1")}>
            <Text style={[styles.regionText, !stage1 && styles.regionPlaceholder]} numberOfLines={1}>
              {stage1 || "시·도 선택"}
            </Text>
            <FontAwesome6 name="chevron-down" size={12} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.regionButton, !needsDistrict && styles.regionButtonDisabled]}
            onPress={() => needsDistrict && setPicker("stage2")}
            disabled={!needsDistrict}
          >
            <Text style={[styles.regionText, !stage2 && styles.regionPlaceholder]} numberOfLines={1}>
              {stage2 || (stage1 && !needsDistrict ? "시·군·구 없음" : "시·군·구 선택")}
            </Text>
            <FontAwesome6 name="chevron-down" size={12} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.keywordRow}>
          <TextInput
            style={styles.keywordInput}
            value={keyword}
            onChangeText={setKeyword}
            placeholder="기관명이나 장소로 좁히기 (선택)"
            placeholderTextColor={Colors.textFaint}
            returnKeyType="search"
            onSubmitEditing={() => void search()}
          />
          <TouchableOpacity style={styles.searchButton} onPress={() => void search()} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.surface} size="small" />
            ) : (
              <FontAwesome6 name="magnifying-glass" size={15} color={Colors.surface} />
            )}
          </TouchableOpacity>
        </View>

        {!coords ? (
          <Text style={styles.locationHint}>
            위치를 확인하지 못해 서울시청 기준으로 거리를 계산합니다. 지역을 직접 선택해 검색할 수 있습니다.
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={Colors.navy} />
          <Text style={styles.stateText}>AED를 찾고 있습니다</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.state}>
          <FontAwesome6 name="triangle-exclamation" size={32} color={Colors.textFaint} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void search()}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={aeds}
          keyExtractor={(aed, index) => `${aed.serialSeq || aed.latitude}-${index}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.state}>
              <FontAwesome6 name="heart-pulse" size={32} color={Colors.textFaint} />
              <Text style={styles.stateText}>
                {searched ? "조건에 맞는 AED가 없습니다." : "지역을 선택하고 검색해주세요."}
              </Text>
            </View>
          }
          ListHeaderComponent={
            aeds.length > 0 ? (
              <Text style={styles.resultCount}>
                가까운 순 {aeds.length}대{keyword.trim() ? ` · "${keyword.trim()}" 포함` : ""}
              </Text>
            ) : null
          }
          renderItem={({ item: aed, index }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.org} numberOfLines={2}>
                    {aed.org || "설치기관 정보 없음"}
                  </Text>
                  {aed.place ? (
                    <Text style={styles.place} numberOfLines={2}>
                      <FontAwesome6 name="location-dot" size={11} color={Colors.navySoft} /> {aed.place}
                    </Text>
                  ) : null}
                  <Text style={styles.address} numberOfLines={2}>
                    {aed.address}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>{aed.distance}km</Text>
                    </View>
                    <View
                      style={[
                        styles.hoursBadge,
                        aed.openNow === true && styles.hoursOpen,
                        aed.openNow === false && styles.hoursClosed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.hoursText,
                          aed.openNow === true && styles.hoursOpenText,
                          aed.openNow === false && styles.hoursClosedText,
                        ]}
                      >
                        {aed.openNow === true ? "지금 이용 가능" : aed.openNow === false ? "지금 닫힘" : "확인 필요"}
                        {` · ${aed.hoursText}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.mapButton} onPress={() => void openMap(aed)}>
                <FontAwesome6 name="map-location-dot" size={14} color={Colors.navySoft} />
                <Text style={styles.mapText}>지도 앱에서 위치 보기</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Text style={styles.source}>
        출처: 중앙응급의료센터 자동심장충격기 정보. 설치 위치와 운영시간은 실제와 다를 수 있습니다.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.guideButton} onPress={() => router.push("/emergency-help")}>
          <FontAwesome6 name="book-medical" size={15} color={Colors.navy} />
          <Text style={styles.guideButtonText}>응급 대처 안내</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton} onPress={call119}>
          <FontAwesome6 name="phone" size={15} color={Colors.surface} />
          <Text style={styles.callButtonText}>119 전화</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        {/* 배경을 시트의 형제로 두어야 한다. 시트를 Pressable 안에 넣으면 옵션 터치를 배경이 먼저 먹는다. */}
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} accessibilityLabel="닫기" />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{picker === "stage1" ? "시·도 선택" : "시·군·구 선택"}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setPicker(null)} accessibilityLabel="닫기">
                <FontAwesome6 name="xmark" size={18} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(picker === "stage1" ? stage1Options : districts).map((option) => {
                const selected = picker === "stage1" ? option === stage1 : option === stage2;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    onPress={() => (picker === "stage1" ? selectStage1(option) : (setStage2(option), setPicker(null)))}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                    {selected ? <FontAwesome6 name="check" size={14} color={Colors.navy} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screen },
  header: { height: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface },
  headerButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: Colors.text },
  warning: { flexDirection: "row", gap: 9, alignItems: "flex-start", marginHorizontal: 14, marginTop: 12, padding: 12, borderRadius: Radius.card, backgroundColor: Colors.urgentBg, borderWidth: 1, borderColor: Colors.border },
  warningText: { flex: 1, color: Colors.urgentText, fontSize: 12, lineHeight: 18 },
  searchBox: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: Radius.card, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  regionRow: { flexDirection: "row", gap: 8 },
  regionButton: { flex: 1, minHeight: 46, paddingHorizontal: 13, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.borderStrong, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  regionButtonDisabled: { backgroundColor: Colors.surfaceSunken, borderColor: Colors.border },
  regionText: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: "800" },
  regionPlaceholder: { color: Colors.textFaint, fontWeight: "700" },
  keywordRow: { flexDirection: "row", gap: 8, marginTop: 9 },
  keywordInput: { flex: 1, minHeight: 46, paddingHorizontal: 13, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.borderStrong, color: Colors.text, fontSize: 13 },
  searchButton: { width: 52, minHeight: 46, borderRadius: Radius.control, backgroundColor: Colors.navy, alignItems: "center", justifyContent: "center" },
  locationHint: { marginTop: 9, color: Colors.textMuted, fontSize: 11, lineHeight: 17 },
  state: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: 24 },
  stateText: { marginTop: 12, color: Colors.textMuted, fontSize: 13, textAlign: "center" },
  errorText: { marginTop: 12, color: Colors.urgent, fontSize: 14, fontWeight: "800", textAlign: "center" },
  retryButton: { marginTop: 15, backgroundColor: Colors.navy, paddingHorizontal: 20, paddingVertical: 11, borderRadius: Radius.card },
  retryText: { color: Colors.surface, fontWeight: "900" },
  list: { padding: 14, paddingBottom: 20 },
  resultCount: { marginBottom: 10, color: Colors.textSub, fontSize: 12, fontWeight: "800" },
  card: { marginBottom: 11, borderRadius: Radius.card, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  cardTop: { flexDirection: "row", gap: 11, padding: 14 },
  rank: { width: 30, height: 30, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken, alignItems: "center", justifyContent: "center" },
  rankText: { color: Colors.navySoft, fontWeight: "900", fontSize: 13 },
  cardInfo: { flex: 1 },
  org: { color: Colors.text, fontSize: 15, fontWeight: "900" },
  place: { marginTop: 5, color: Colors.textSub, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  address: { marginTop: 4, color: Colors.textFaint, fontSize: 11, lineHeight: 17 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  distanceBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken },
  distanceText: { color: Colors.navySoft, fontSize: 11, fontWeight: "900" },
  hoursBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken },
  hoursOpen: { backgroundColor: Colors.okBg },
  hoursClosed: { backgroundColor: Colors.cautionBg },
  hoursText: { color: Colors.textSub, fontSize: 11, fontWeight: "800" },
  hoursOpenText: { color: Colors.ok },
  hoursClosedText: { color: Colors.caution },
  mapButton: { minHeight: 44, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: Colors.surfaceSunken },
  mapText: { color: Colors.navySoft, fontSize: 12, fontWeight: "800" },
  source: { paddingHorizontal: 18, paddingBottom: 8, color: Colors.textFaint, fontSize: 10, lineHeight: 16, textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  guideButton: { flex: 1, minHeight: 50, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.borderStrong, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  guideButtonText: { color: Colors.navy, fontSize: 14, fontWeight: "900" },
  callButton: { flex: 1, minHeight: 50, borderRadius: Radius.control, backgroundColor: Colors.urgent, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  callButtonText: { color: Colors.surface, fontSize: 14, fontWeight: "900" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "75%", backgroundColor: Colors.surface, borderTopLeftRadius: Radius.card, borderTopRightRadius: Radius.card },
  modalHeader: { height: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: Colors.surfaceSunken },
  modalTitle: { color: Colors.text, fontSize: 16, fontWeight: "900" },
  modalClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  optionRow: { minHeight: 50, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: Colors.surfaceSunken },
  optionRowSelected: { backgroundColor: Colors.surfaceSunken },
  optionText: { color: Colors.textSub, fontSize: 14, fontWeight: "700" },
  optionTextSelected: { color: Colors.navy, fontWeight: "900" },
});
