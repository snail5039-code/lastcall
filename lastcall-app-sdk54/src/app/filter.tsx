import { router } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { stage2Options } from "../data/regions";

const stage1Options = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

const departments = ["전체", "소아과", "내과", "외과", "정형외과", "신경과"];

const options = [
  "가용 병상 있는 곳",
  "소아 진료 가능",
  "CT 촬영 가능",
  "MRI 촬영 가능",
  "수술실 가능",
];

const sortOptions = [
  "거리순",
  "응급실 병상 많은순",
  "중환자실 병상 많은순",
  "수술실 많은순",
];

export default function FilterScreen() {
  const [selectedStage1, setSelectedStage1] = useState("");
  const [selectedStage2, setSelectedStage2] = useState("");
  const [isStage1Open, setIsStage1Open] = useState(false);
  const [isStage2Open, setIsStage2Open] = useState(false);
  const [selectedSort, setSelectedSort] = useState("거리순");

  const [isRegionOpen, setIsRegionOpen] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(true);
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isBedOpen, setIsBedOpen] = useState(false);
  const [isFacilityOpen, setIsFacilityOpen] = useState(false);
  const [isSevereOpen, setIsSevereOpen] = useState(false);

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

          <Text style={styles.headerTitle}>검색 필터</Text>

          <TouchableOpacity>
            <Text style={styles.resetText}>초기화</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>지역 설정</Text>

            <View style={styles.regionBox}>
              <TouchableOpacity style={styles.currentLocationButton}>
                <Text style={styles.currentLocationText}>
                  현재 위치 사용
                </Text>
              </TouchableOpacity>

              <View style={styles.regionSelectRow}>
                <TouchableOpacity
                  style={styles.regionSelectButton}
                  onPress={() => setIsStage1Open(!isStage1Open)}
                >
                  <Text style={styles.regionSelectText}>
                    {selectedStage1 || "시·도 선택"}
                  </Text>

                  <Text style={styles.regionArrow}>
                    {isStage1Open ? "⌃" : "⌄"}
                  </Text>
                </TouchableOpacity>
                {isStage1Open && (
                  <View style={styles.regionOptionList}>
                    <ScrollView
                      style={styles.regionOptionScroll}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {stage1Options.map((stage1) => (
                        <TouchableOpacity
                          key={stage1}
                          style={styles.regionOptionButton}
                          onPress={() => {
                            setSelectedStage1(stage1);
                            setSelectedStage2("");
                            setIsStage1Open(false);
                            setIsStage2Open(false);
                          }}
                        >
                          <Text style={styles.regionOptionText}>
                            {stage1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.regionSelectButton,
                    !selectedStage1 && styles.disabledRegionButton,
                  ]}
                  disabled={!selectedStage1}
                  onPress={() => setIsStage2Open(!isStage2Open)}
                >
                  <Text
                    style={[
                      styles.regionSelectText,
                      !selectedStage1 && styles.disabledRegionText,
                    ]}
                  >
                    {selectedStage2 || "시·군·구 선택"}
                  </Text>

                  <Text
                    style={[
                      styles.regionArrow,
                      !selectedStage1 && styles.disabledRegionText,
                    ]}
                  >
                    {isStage2Open ? "⌃" : "⌄"}
                  </Text>
                </TouchableOpacity>
                {isStage2Open && selectedStage1 !== "세종특별자치시" && (
                  <View style={styles.regionOptionList}>
                    <ScrollView
                      style={styles.regionOptionScroll}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {(stage2Options[selectedStage1] || []).map((stage2) => (
                        <TouchableOpacity
                          key={stage2}
                          style={styles.regionOptionButton}
                          onPress={() => {
                            setSelectedStage2(stage2);
                            setIsStage2Open(false);
                          }}
                        >
                          <Text style={styles.regionOptionText}>
                            {stage2}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setIsSortOpen(!isSortOpen)}
            >
              <Text style={styles.sectionTitle}>정렬 기준</Text>

              <Text style={styles.sectionArrow}>
                {isSortOpen ? "⌃" : "⌄"}
              </Text>
            </TouchableOpacity>

            {isSortOpen && (
              <View style={styles.sortBox}>
                {sortOptions.map((sortOption) => (
                  <TouchableOpacity
                    key={sortOption}
                    style={[
                      styles.sortButton,
                      selectedSort === sortOption &&
                      styles.selectedSortButton,
                    ]}
                    onPress={() => setSelectedSort(sortOption)}
                  >
                    <Text
                      style={[
                        styles.sortText,
                        selectedSort === sortOption &&
                        styles.selectedSortText,
                      ]}
                    >
                      {sortOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>진료 과목</Text>

            <View style={styles.grid}>
              {departments.map((department) => (
                <TouchableOpacity
                  key={department}
                  style={[
                    styles.departmentButton,
                    department === "전체" && styles.selectedDepartmentButton,
                  ]}
                >
                  <Text
                    style={[
                      styles.departmentText,
                      department === "전체" && styles.selectedDepartmentText,
                    ]}
                  >
                    {department}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>상세 조건</Text>

            <View style={styles.optionBox}>
              {options.map((option, index) => (
                <TouchableOpacity key={option} style={styles.optionRow}>
                  <Text style={styles.optionText}>{option}</Text>

                  <View
                    style={[
                      styles.checkBox,
                      index < 2 && styles.checkedBox,
                    ]}
                  >
                    {index < 2 && <Text style={styles.checkText}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={styles.bottomArea}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => router.back()}
          >
            <Text style={styles.applyButtonText}>필터 적용하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView >
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
    height: 54,
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
  resetText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EF4444",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  sortBox: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  selectedSortButton: {
    backgroundColor: "#061A44",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  selectedSortText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  sortButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  sortText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  departmentButton: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedDepartmentButton: {
    backgroundColor: "#FFF1F1",
    borderColor: "#EF4444",
  },
  departmentText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },
  selectedDepartmentText: {
    color: "#EF4444",
  },
  optionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  optionRow: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkedBox: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  checkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  bottomArea: {
    marginTop: "auto",
    paddingBottom: 24,
  },
  applyButton: {
    backgroundColor: "#061A44",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  scrollArea: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 24,
  },
  regionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  currentLocationButton: {
    backgroundColor: "#061A44",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },

  currentLocationText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  regionSelectRow: {
    gap: 10,
  },

  regionSelectButton: {
    minHeight: 52,
    paddingHorizontal: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  regionSelectText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
  },

  regionArrow: {
    fontSize: 20,
    fontWeight: "800",
    color: "#64748B",
  },
  regionOptionList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },

  regionOptionButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  regionOptionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },

  regionOptionScroll: {
    maxHeight: 240,
  },

  disabledRegionButton: {
    backgroundColor: "#E5E7EB",
  },

  disabledRegionText: {
    color: "#9CA3AF",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionArrow: {
    fontSize: 22,
    fontWeight: "800",
    color: "#64748B",
  },
});