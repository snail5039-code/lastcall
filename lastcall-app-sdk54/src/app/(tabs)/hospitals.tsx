import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useLocalSearchParams } from "expo-router";
import { callPhone, goBack, openDirections } from "../../services/navigation";
import { formatUpdatedAt, isUpdatedAtStale } from "../../services/data-freshness";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HospitalCardSkeleton } from "../../components/skeleton";
import { StateView } from "../../components/state-view";
import { apiUrl } from "../../config/api";
import { Radius, Tap, ThemeColors, Type, useThemeColors, useThemeStyles } from "../../constants/design";
import { getCurrentLocationFast } from "../../services/location";
import { Hospital, toHospitalDetailParams } from "../../types/hospital";

/**
 * 카드 색띠와 배지가 따르는 병상 상태.
 * ok: 병상이 있고 정보가 최신 / stale: 병상이 있다고 나오지만 정보가 오래됨 / none: 병상 정보 없음
 */
type BedState = "ok" | "stale" | "none";

/** 고르면 관련 진료과가 있는 응급실을 먼저 추천한다. 고르지 않아도 된다. */
const SYMPTOMS = ["고열", "가슴통증", "호흡곤란", "복통", "외상", "소아응급"];

const bedStateOf = (hospital: Hospital): BedState =>
  hospital.availableBeds <= 0 ? "none" : isUpdatedAtStale(hospital.dataUpdatedAt) ? "stale" : "ok";

export default function HospitalsScreen() {
  const Colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [keywordInput, setKeywordInput] = useState("");

  const { stage1, stage2, lat, lon, symptom, keyword, sort, department, bedTypes, facilities, severeTypes, freshOnly } = useLocalSearchParams<{
    stage1: string;
    stage2?: string;
    lat?: string;
    lon?: string;
    symptom?: string;
    keyword?: string;
    sort?: string;
    department?: string;
    bedTypes?: string;
    facilities?: string;
    severeTypes?: string;
    freshOnly?: string;
  }>();

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        if (!stage1 && !keyword) {
          console.log("시/도 정보가 없습니다.");
          return;
        }

        let latitude = Number(lat);
        let longitude = Number(lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          const location = await getCurrentLocationFast();
          latitude = location.latitude;
          longitude = location.longitude;
        }

        let url = keyword
          ? apiUrl(`/emergency/search?keyword=${encodeURIComponent(String(keyword))}&lat=${latitude}&lon=${longitude}`)
          : apiUrl(`/emergency/nearby?stage1=${encodeURIComponent(stage1)}&lat=${latitude}&lon=${longitude}`);

        if (!keyword && stage2) {
          url += `&stage2=${encodeURIComponent(stage2)}`;
        }

        if (symptom) {
          url += `&symptom=${encodeURIComponent(String(symptom))}`;
        }

        if (sort) url += `&sort=${encodeURIComponent(sort)}`;
        if (department) url += `&department=${encodeURIComponent(department)}`;
        if (bedTypes) url += `&bedTypes=${encodeURIComponent(bedTypes)}`;
        if (facilities) url += `&facilities=${encodeURIComponent(facilities)}`;
        if (severeTypes) url += `&severeTypes=${encodeURIComponent(severeTypes)}`;
        if (freshOnly === "true") url += "&freshOnly=true";

        const response = await fetch(url);
        if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
        const data = await response.json();
        setHospitals(data);
      } catch (error) {
        console.error("응급실 목록 불러오기 실패:", error);
        setErrorMessage("응급실 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
  }, [stage1, stage2, lat, lon, symptom, keyword, sort, department, bedTypes, facilities, severeTypes, freshOnly, requestVersion]);

  const handleCall = (phone?: string) => callPhone(phone);

  const handleNavigation = (hospital: Hospital) =>
    openDirections({ name: hospital.hospitalName, latitude: hospital.latitude, longitude: hospital.longitude });

  const openDetail = (hospital: Hospital) =>
    router.push({ pathname: "/hospital-detail", params: toHospitalDetailParams(hospital) });

  const handleShare = async (hospital: Hospital) => {
    const name = encodeURIComponent(hospital.hospitalName);

    const kakaoMapUrl = `https://map.kakao.com/link/to/${name},${hospital.latitude},${hospital.longitude}`;

    const message =
      `${hospital.hospitalName}\n\n` +
      `주소: ${hospital.address}\n` +
      `응급실 전화: ${hospital.emergencyPhone || hospital.phone}\n` +
      `거리: ${hospital.distance}km\n\n` +
      `길찾기: ${kakaoMapUrl}\n\n` +
      `살려줌 추천 응급실`;

    try {
      await Share.share({ message });
    } catch {
      Alert.alert("공유 실패", "이 기기에서는 공유를 사용할 수 없습니다.");
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconButton} onPress={() => goBack()} accessibilityLabel="뒤로 가기" accessibilityRole="button">
            <FontAwesome6 name="chevron-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>추천 응급실</Text>

          <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push({ pathname: "/filter", params: { stage1, ...(stage2 && { stage2 }), ...(lat && { lat }), ...(lon && { lon }), ...(symptom && { symptom }), ...(keyword && { keyword }), ...(sort && { sort }), ...(department && { department }), ...(bedTypes && { bedTypes }), ...(facilities && { facilities }), ...(severeTypes && { severeTypes }), ...(freshOnly && { freshOnly }) } })} accessibilityRole="button" accessibilityLabel="세부 검색">
            <FontAwesome6 name="sliders" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* 좁히기 도구. 결과 목록이 바로 아래에서 바뀌므로 화면을 떠나지 않고 쓴다. */}
        <View style={styles.filterArea}>
          <View style={styles.searchBox}>
            <FontAwesome6 name="magnifying-glass" size={14} color={Colors.textFaint} />
            <TextInput
              style={styles.searchInput}
              value={keywordInput}
              onChangeText={setKeywordInput}
              placeholder={keyword ? String(keyword) : "병원명 또는 주소로 검색"}
              placeholderTextColor={Colors.textFaint}
              returnKeyType="search"
              onSubmitEditing={() => router.setParams({ keyword: keywordInput.trim() })}
              autoCorrect={false}
              accessibilityLabel="병원명 또는 주소 검색"
            />
            {keyword || keywordInput ? (
              <TouchableOpacity
                onPress={() => { setKeywordInput(""); router.setParams({ keyword: "" }); }}
                accessibilityLabel="검색어 지우기"
                accessibilityRole="button"
              >
                <FontAwesome6 name="circle-xmark" size={16} color={Colors.textFaint} />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {SYMPTOMS.map((name) => {
              const selected = symptom === name;
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => router.setParams({ symptom: selected ? "" : name })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 안내는 카드마다 반복하지 않고 여기 한 번만 둔다. */}
        <View style={styles.noticeBox}>
          <FontAwesome6 name="circle-info" size={14} color={Colors.textFaint} style={{ marginTop: 3 }} />
          <View style={styles.noticeTexts}>
            <Text style={styles.noticeTitle}>
              {keyword ? `“${keyword}” 검색 결과` : "가까운 순 · 병상 정보 기준"}
            </Text>
            <Text style={styles.noticeText}>병상은 수시로 바뀝니다. 출발 전 응급실에 전화로 수용 여부를 확인하세요.</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {loading ? (
            <>
              <HospitalCardSkeleton />
              <HospitalCardSkeleton />
              <HospitalCardSkeleton />
            </>
          ) : null}

          {!loading && errorMessage ? (
            <StateView
              icon="triangle-exclamation"
              tone="error"
              title="응급실 정보를 불러오지 못했습니다"
              description="네트워크 상태를 확인하고 다시 시도해주세요. 급하면 바로 119에 전화하세요."
              actionLabel="다시 시도"
              onAction={() => setRequestVersion((value) => value + 1)}
            />
          ) : null}

          {!loading && !errorMessage && hospitals.length === 0 ? (
            <StateView
              icon="hospital"
              title="조건에 맞는 응급실이 없습니다"
              description="세부 검색의 조건을 줄이거나 지역을 바꿔보세요."
              actionLabel="조건 바꾸기"
              onAction={() => goBack()}
            />
          ) : null}

          {!loading && !errorMessage ? hospitals.map((hospital, index) => {
            const state = bedStateOf(hospital);
            const stale = isUpdatedAtStale(hospital.dataUpdatedAt);
            return (
              <View key={hospital.hpid} style={styles.card}>
                <Pressable style={styles.cardMain} onPress={() => openDetail(hospital)} accessibilityRole="button" accessibilityLabel={`${hospital.hospitalName} 상세 보기`}>
                  <View style={styles.cardTop}>
                    <View style={styles.rankBox}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.titleBox}>
                      <Text style={styles.hospitalName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{hospital.hospitalName}</Text>
                      <View style={styles.addressRow}>
                        <FontAwesome6 name="location-dot" size={11} color={Colors.textMuted} />
                        <Text style={styles.addressText} numberOfLines={1}>{hospital.address}</Text>
                      </View>
                    </View>
                    <View style={styles.distanceBox}>
                      <Text style={styles.distanceFigure}>{hospital.distance}<Text style={styles.distanceUnit}>km</Text></Text>
                      <FontAwesome6 name="chevron-right" size={11} color={Colors.textFaint} />
                    </View>
                  </View>

                  <View style={[styles.bedTile, state === "ok" && styles.bedTileOk, state === "stale" && styles.bedTileStale]}>
                    <View style={styles.bedLeft}>
                      <FontAwesome6 name="bed-pulse" size={18} color={state === "ok" ? Colors.ok : state === "stale" ? Colors.caution : Colors.textMuted} />
                      <View>
                        <Text style={styles.bedLabel}>응급병상</Text>
                        <Text style={[styles.bedStatus, state === "ok" && { color: Colors.ok }, state === "stale" && { color: Colors.caution }]}>
                          {state === "ok" ? "병상 있음" : state === "stale" ? "오래된 정보" : "확인 필요"}
                        </Text>
                      </View>
                    </View>
                    {state === "none" ? (
                      <Text style={styles.bedUnknown}>전화 확인</Text>
                    ) : (
                      <Text style={[styles.bedFigure, state === "ok" && { color: Colors.ok }, state === "stale" && { color: Colors.caution }]}>
                        {hospital.availableBeds}<Text style={styles.bedUnit}>개</Text>
                      </Text>
                    )}
                  </View>

                  <View style={styles.metaRow}>
                    <FontAwesome6 name="clock-rotate-left" size={11} color={stale ? Colors.urgent : Colors.textMuted} />
                    <Text style={[styles.metaText, stale && styles.metaStale]}>
                      {formatUpdatedAt(hospital.dataUpdatedAt, "갱신 시각 확인 필요")} 기준{stale ? " · 오래됨" : ""}
                    </Text>
                  </View>

                  {hospital.matchedDepartments ? (
                    <View style={styles.deptChip}>
                      <FontAwesome6 name="stethoscope" size={11} color={Colors.navySoft} />
                      <Text style={styles.deptChipText} numberOfLines={1}>{hospital.matchedDepartments}</Text>
                    </View>
                  ) : null}
                </Pressable>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCall(hospital.emergencyPhone || hospital.phone)}
                    accessibilityRole="button"
                    accessibilityLabel={`${hospital.hospitalName} 응급실에 전화`}
                  >
                    <FontAwesome6 name="phone" size={14} color={Colors.urgent} />
                    <Text style={styles.callButtonText}>전화</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.routeButton}
                    onPress={() => handleNavigation(hospital)}
                    accessibilityRole="button"
                    accessibilityLabel={`${hospital.hospitalName} 길찾기`}
                  >
                    <FontAwesome6 name="route" size={14} color={Colors.onDark} />
                    <Text style={styles.routeButtonText}>길찾기</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => handleShare(hospital)}
                    accessibilityRole="button"
                    accessibilityLabel="공유"
                  >
                    <FontAwesome6 name="share-nodes" size={15} color={Colors.navySoft} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screen },
  screen: { flex: 1 },
  header: { minHeight: 56, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: Type.screenTitle, fontWeight: "700", color: Colors.text },

  filterArea: { paddingTop: 12, gap: 10 },
  searchBox: { marginHorizontal: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: Radius.control, backgroundColor: Colors.surface, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: Type.body, color: Colors.text },
  chipRow: { paddingHorizontal: 12, gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  chipSelected: { backgroundColor: Colors.navy },
  chipText: { fontSize: Type.label, fontWeight: "600", color: Colors.textSub },
  chipTextSelected: { color: Colors.onDark, fontWeight: "700" },

  noticeBox: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  noticeTexts: { flex: 1 },
  noticeTitle: { color: Colors.text, fontSize: Type.body, fontWeight: "700" },
  noticeText: { marginTop: 3, color: Colors.textMuted, fontSize: Type.caption, lineHeight: 17 },

  listContent: { padding: 12, paddingBottom: 24 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.card, marginBottom: 12, overflow: "hidden" },
  cardMain: { padding: 14, paddingBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rankBox: { width: 26, height: 26, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken, alignItems: "center", justifyContent: "center", marginTop: 1 },
  rankText: { color: Colors.navySoft, fontSize: Type.label, fontWeight: "700" },
  titleBox: { flex: 1, minWidth: 0 },
  hospitalName: { fontSize: Type.body, fontWeight: "700", color: Colors.text, lineHeight: 21 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  addressText: { flex: 1, color: Colors.textMuted, fontSize: Type.caption },
  distanceBox: { alignItems: "flex-end", gap: 4 },
  distanceFigure: { fontSize: Type.figure, fontWeight: "700", color: Colors.text },
  distanceUnit: { fontSize: Type.caption, fontWeight: "700", color: Colors.textMuted },

  bedTile: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bedTileOk: { backgroundColor: Colors.okBg },
  bedTileStale: { backgroundColor: Colors.cautionBg },
  bedLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  bedLabel: { color: Colors.textMuted, fontSize: Type.caption, fontWeight: "700" },
  bedStatus: { marginTop: 1, color: Colors.textSub, fontSize: Type.body, fontWeight: "700" },
  bedFigure: { fontSize: 28, fontWeight: "700", color: Colors.text },
  bedUnit: { fontSize: Type.label, fontWeight: "700" },
  bedUnknown: { color: Colors.textSub, fontSize: Type.body, fontWeight: "700" },

  metaRow: { marginTop: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: Colors.textMuted, fontSize: Type.caption },
  metaStale: { color: Colors.urgent, fontWeight: "700" },

  deptChip: { alignSelf: "flex-start", marginTop: 9, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken },
  deptChipText: { color: Colors.navySoft, fontSize: Type.caption, fontWeight: "700" },

  buttonRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  callButton: { flex: 1, minHeight: Tap.min, borderRadius: Radius.control, backgroundColor: Colors.urgentBg, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  callButtonText: { color: Colors.urgent, fontSize: Type.body, fontWeight: "700" },
  routeButton: { flex: 1, minHeight: Tap.min, borderRadius: Radius.control, backgroundColor: Colors.navy, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  routeButtonText: { color: Colors.onDark, fontSize: Type.body, fontWeight: "700" },
  shareButton: { width: Tap.min, minHeight: Tap.min, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken, alignItems: "center", justifyContent: "center" },
});
