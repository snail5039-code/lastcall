import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { stage2Options } from "../data/regions";
import { getCurrentLocationFast } from "../services/location";

const stage1Options = Object.keys(stage2Options);

const sortOptions = [
  { key: "distance", label: "거리순" },
  { key: "emergencyBeds", label: "응급실 병상 많은순" },
  { key: "icuBeds", label: "중환자실 병상 많은순" },
  { key: "operatingRooms", label: "수술실 많은순" },
] as const;

const departments = ["전체", "소아청소년과", "내과", "외과", "정형외과", "신경과", "신경외과", "응급의학과"];

const bedOptions = [
  { key: "emergency", label: "응급실" },
  { key: "generalIcu", label: "일반 중환자실" },
  { key: "neuroIcu", label: "신경 중환자실" },
  { key: "neonatalIcu", label: "신생아 중환자실" },
  { key: "chestIcu", label: "흉부 중환자실" },
  { key: "inpatient", label: "입원실" },
  { key: "operatingRoom", label: "수술실" },
];

const facilityOptions = [
  { key: "ct", label: "CT" },
  { key: "mri", label: "MRI" },
  { key: "angiography", label: "조영촬영기" },
  { key: "ventilator", label: "인공호흡기" },
  { key: "pediatricVentilator", label: "소아 인공호흡기" },
  { key: "incubator", label: "인큐베이터" },
  { key: "ambulance", label: "구급차" },
];

const severeOptions = [
  { key: "brainHemorrhage", label: "뇌출혈 수술" },
  { key: "cerebralInfarction", label: "뇌경색 재관류" },
  { key: "myocardialInfarction", label: "심근경색 재관류" },
  { key: "abdominalInjury", label: "복부손상 수술" },
  { key: "limbReattachment", label: "사지접합" },
  { key: "emergencyEndoscopy", label: "응급내시경" },
  { key: "emergencyDialysis", label: "응급투석" },
  { key: "prematureLabor", label: "조산 산모" },
  { key: "mentalEmergency", label: "정신질환자" },
  { key: "newborn", label: "신생아" },
  { key: "severeBurn", label: "중증화상" },
];

function splitParam(value?: string) {
  return value ? value.split(",").filter(Boolean) : [];
}

export default function FilterScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [selectedStage1, setSelectedStage1] = useState(params.stage1 ?? "");
  const [selectedStage2, setSelectedStage2] = useState(params.stage2 ?? "");
  const [selectedSort, setSelectedSort] = useState(params.sort ?? "distance");
  const [selectedDepartment, setSelectedDepartment] = useState(params.department ?? "전체");
  const [selectedBeds, setSelectedBeds] = useState<string[]>(splitParam(params.bedTypes));
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(splitParam(params.facilities));
  const [selectedSevere, setSelectedSevere] = useState<string[]>(splitParam(params.severeTypes));
  const [latitude, setLatitude] = useState(params.lat ?? "");
  const [longitude, setLongitude] = useState(params.lon ?? "");
  const [isStage1Open, setIsStage1Open] = useState(false);
  const [isStage2Open, setIsStage2Open] = useState(false);
  const [openSections, setOpenSections] = useState({ sort: true, department: true, bed: false, facility: false, severe: false });

  const toggleValue = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const reset = () => {
    setSelectedStage1("");
    setSelectedStage2("");
    setSelectedSort("distance");
    setSelectedDepartment("전체");
    setSelectedBeds([]);
    setSelectedFacilities([]);
    setSelectedSevere([]);
  };

  const useCurrentLocation = async () => {
    try {
      const location = await getCurrentLocationFast();
      if (!stage1Options.includes(location.stage1)) {
        Alert.alert("지역 확인 실패", "현재 위치의 시·도 정보를 확인하지 못했습니다. 직접 선택해주세요.");
        return;
      }
      setSelectedStage1(location.stage1);
      setSelectedStage2((stage2Options[location.stage1] ?? []).includes(location.stage2) ? location.stage2 : "");
      setLatitude(String(location.latitude));
      setLongitude(String(location.longitude));
    } catch {
      Alert.alert("위치 권한 필요", "현재 위치를 사용하려면 위치 권한을 허용해주세요.");
    }
  };

  const applyFilters = () => {
    if (!selectedStage1) {
      Alert.alert("지역을 선택해주세요", "병원을 검색할 시·도를 선택해야 합니다.");
      return;
    }
    router.replace({
      pathname: "/hospitals",
      params: {
        stage1: selectedStage1,
        ...(selectedStage2 && { stage2: selectedStage2 }),
        ...(params.symptom && { symptom: params.symptom }),
        sort: selectedSort,
        ...(latitude && { lat: latitude }),
        ...(longitude && { lon: longitude }),
        ...(selectedDepartment !== "전체" && { department: selectedDepartment }),
        ...(selectedBeds.length && { bedTypes: selectedBeds.join(",") }),
        ...(selectedFacilities.length && { facilities: selectedFacilities.join(",") }),
        ...(selectedSevere.length && { severeTypes: selectedSevere.join(",") }),
      },
    });
  };

  const section = (key: keyof typeof openSections, title: string, options: { key: string; label: string }[], selected: string[], setter: (next: string[]) => void) => (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))}>
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {selected.length > 0 && <Text style={styles.countBadge}>{selected.length}</Text>}
        </View>
        <FontAwesome6 name={openSections[key] ? "chevron-up" : "chevron-down"} size={15} color="#64748B" />
      </TouchableOpacity>
      {openSections[key] && (
        <View style={styles.optionBox}>
          {options.map((option) => {
            const checked = selected.includes(option.key);
            return (
              <TouchableOpacity key={option.key} style={styles.optionRow} onPress={() => toggleValue(option.key, selected, setter)}>
                <Text style={styles.optionText}>{option.label}</Text>
                <View style={[styles.checkBox, checked && styles.checkedBox]}>{checked && <FontAwesome6 name="check" size={13} color="#FFFFFF" />}</View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기"><FontAwesome6 name="chevron-left" size={20} color="#111827" /></TouchableOpacity>
          <Text style={styles.headerTitle}>검색 필터</Text>
          <TouchableOpacity onPress={reset}><Text style={styles.resetText}>초기화</Text></TouchableOpacity>
        </View>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>지역 설정</Text>
            <View style={styles.regionBox}>
              <TouchableOpacity style={styles.currentLocationButton} onPress={useCurrentLocation}><Text style={styles.currentLocationText}>현재 위치 사용</Text></TouchableOpacity>
              <TouchableOpacity style={styles.regionSelectButton} onPress={() => setIsStage1Open(!isStage1Open)}>
                <Text style={styles.regionSelectText}>{selectedStage1 || "시·도 선택"}</Text><FontAwesome6 name={isStage1Open ? "chevron-up" : "chevron-down"} size={14} color="#64748B" />
              </TouchableOpacity>
              {isStage1Open && <View style={styles.regionOptionList}><ScrollView style={styles.regionOptionScroll} nestedScrollEnabled>{stage1Options.map((stage1) => <TouchableOpacity key={stage1} style={styles.regionOptionButton} onPress={() => { setSelectedStage1(stage1); setSelectedStage2(""); setIsStage1Open(false); }}><Text style={styles.regionOptionText}>{stage1}</Text></TouchableOpacity>)}</ScrollView></View>}
              <TouchableOpacity style={[styles.regionSelectButton, !selectedStage1 && styles.disabledRegionButton]} disabled={!selectedStage1} onPress={() => setIsStage2Open(!isStage2Open)}>
                <Text style={[styles.regionSelectText, !selectedStage1 && styles.disabledRegionText]}>{selectedStage2 || "시·군·구 전체"}</Text><FontAwesome6 name={isStage2Open ? "chevron-up" : "chevron-down"} size={14} color={selectedStage1 ? "#64748B" : "#9CA3AF"} />
              </TouchableOpacity>
              {isStage2Open && <View style={styles.regionOptionList}><ScrollView style={styles.regionOptionScroll} nestedScrollEnabled><TouchableOpacity style={styles.regionOptionButton} onPress={() => { setSelectedStage2(""); setIsStage2Open(false); }}><Text style={styles.regionOptionText}>시·군·구 전체</Text></TouchableOpacity>{(stage2Options[selectedStage1] ?? []).map((stage2) => <TouchableOpacity key={stage2} style={styles.regionOptionButton} onPress={() => { setSelectedStage2(stage2); setIsStage2Open(false); }}><Text style={styles.regionOptionText}>{stage2}</Text></TouchableOpacity>)}</ScrollView></View>}
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpenSections((prev) => ({ ...prev, sort: !prev.sort }))}><Text style={styles.sectionTitle}>정렬 기준</Text><FontAwesome6 name={openSections.sort ? "chevron-up" : "chevron-down"} size={15} color="#64748B" /></TouchableOpacity>
            {openSections.sort && <View style={styles.sortBox}>{sortOptions.map((option) => <TouchableOpacity key={option.key} style={[styles.sortButton, selectedSort === option.key && styles.selectedSortButton]} onPress={() => setSelectedSort(option.key)}><Text style={[styles.sortText, selectedSort === option.key && styles.selectedSortText]}>{option.label}</Text></TouchableOpacity>)}</View>}
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpenSections((prev) => ({ ...prev, department: !prev.department }))}><Text style={styles.sectionTitle}>진료과</Text><FontAwesome6 name={openSections.department ? "chevron-up" : "chevron-down"} size={15} color="#64748B" /></TouchableOpacity>
            {openSections.department && <View style={styles.grid}>{departments.map((department) => <TouchableOpacity key={department} style={[styles.departmentButton, selectedDepartment === department && styles.selectedDepartmentButton]} onPress={() => setSelectedDepartment(department)}><Text style={[styles.departmentText, selectedDepartment === department && styles.selectedDepartmentText]}>{department}</Text></TouchableOpacity>)}</View>}
          </View>

          {section("bed", "병상 종류 (1개 이상 가용)", bedOptions, selectedBeds, setSelectedBeds)}
          {section("facility", "장비·시설", facilityOptions, selectedFacilities, setSelectedFacilities)}
          {section("severe", "중증질환 수용 가능", severeOptions, selectedSevere, setSelectedSevere)}
        </ScrollView>
        <View style={styles.bottomArea}><TouchableOpacity style={styles.applyButton} onPress={applyFilters}><Text style={styles.applyButtonText}>필터 적용하기</Text></TouchableOpacity></View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6FB" },
  screen: { flex: 1, paddingHorizontal: 18, paddingTop: 8 },
  header: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  resetText: { fontSize: 14, fontWeight: "800", color: "#EF4444" },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 28 },
  section: { marginTop: 22 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  countBadge: { minWidth: 22, textAlign: "center", color: "#FFFFFF", backgroundColor: "#EF4444", borderRadius: 11, paddingHorizontal: 6, paddingVertical: 2, fontSize: 12, fontWeight: "800" },
  regionBox: { marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 14, gap: 10, elevation: 2 },
  currentLocationButton: { backgroundColor: "#061A44", borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  currentLocationText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  regionSelectButton: { minHeight: 52, paddingHorizontal: 16, backgroundColor: "#F1F5F9", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  regionSelectText: { fontSize: 15, fontWeight: "800", color: "#334155" },
  regionOptionList: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  regionOptionScroll: { maxHeight: 240 },
  regionOptionButton: { minHeight: 48, paddingHorizontal: 16, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  regionOptionText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  disabledRegionButton: { backgroundColor: "#E5E7EB" },
  disabledRegionText: { color: "#9CA3AF" },
  sortBox: { marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 14, gap: 10, elevation: 2 },
  sortButton: { backgroundColor: "#F1F5F9", borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  selectedSortButton: { backgroundColor: "#061A44" },
  sortText: { color: "#334155", fontSize: 15, fontWeight: "800" },
  selectedSortText: { color: "#FFFFFF" },
  grid: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  departmentButton: { width: "31%", backgroundColor: "#FFFFFF", borderRadius: 15, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  selectedDepartmentButton: { backgroundColor: "#FFF1F1", borderColor: "#EF4444" },
  departmentText: { fontSize: 13, fontWeight: "800", color: "#374151" },
  selectedDepartmentText: { color: "#EF4444" },
  optionBox: { marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, elevation: 2 },
  optionRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optionText: { fontSize: 15, fontWeight: "800", color: "#334155" },
  checkBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  checkedBox: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  bottomArea: { paddingTop: 10, paddingBottom: 24 },
  applyButton: { backgroundColor: "#061A44", borderRadius: 16, paddingVertical: 17, alignItems: "center" },
  applyButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
