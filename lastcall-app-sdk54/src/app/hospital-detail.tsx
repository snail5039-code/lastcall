import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useLocalSearchParams } from "expo-router";
import { ComponentProps, useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";
import { Colors, Radius, Type } from "../constants/design";
import {
  findOpenHospitalImage,
  HospitalImage,
} from "../services/hospital-image";
import { saveRecentHospital } from "../services/recent-hospitals";

type IconName = ComponentProps<typeof FontAwesome6>["name"];

const departmentIconRules: { keyword: string; icon: IconName }[] = [
  { keyword: "소아", icon: "baby" }, { keyword: "응급", icon: "truck-medical" },
  { keyword: "심장", icon: "heart-pulse" }, { keyword: "순환기", icon: "heart-pulse" },
  { keyword: "호흡기", icon: "lungs" }, { keyword: "흉부", icon: "lungs" },
  { keyword: "신경", icon: "brain" }, { keyword: "정형", icon: "bone" },
  { keyword: "외과", icon: "user-doctor" }, { keyword: "산부", icon: "person-pregnant" },
  { keyword: "안과", icon: "eye" }, { keyword: "이비인후", icon: "ear-listen" },
  { keyword: "치과", icon: "tooth" }, { keyword: "정신", icon: "head-side-virus" },
  { keyword: "영상", icon: "x-ray" }, { keyword: "마취", icon: "syringe" },
  { keyword: "재활", icon: "wheelchair-move" }, { keyword: "내과", icon: "stethoscope" },
];

const severeLabels: Record<string, string> = {
  brainHemorrhage: "뇌출혈 수술", cerebralInfarction: "뇌경색 재관류", myocardialInfarction: "심근경색 재관류",
  abdominalInjury: "복부손상 수술", limbReattachment: "사지접합", emergencyEndoscopy: "응급내시경",
  emergencyDialysis: "응급투석", prematureLabor: "조산 산모", mentalEmergency: "정신질환자",
  newborn: "신생아", severeBurn: "중증화상",
};

type HospitalFallbackTheme = {
  label: string;
  icon: IconName;
  backgroundColor: string;
  accentColor: string;
  iconColor: string;
};

const getHospitalFallbackTheme = (name: string): HospitalFallbackTheme => {
  if (/소아|어린이/.test(name)) {
    return {
      label: "어린이·소아 전문 의료기관",
      icon: "baby",
      backgroundColor: Colors.surfaceSunken,
      accentColor: Colors.borderStrong,
      iconColor: Colors.navySoft,
    };
  }
  if (/산부인과|여성|모자/.test(name)) {
    return {
      label: "여성 전문 의료기관",
      icon: "person-pregnant",
      backgroundColor: Colors.surfaceSunken,
      accentColor: Colors.borderStrong,
      iconColor: Colors.navySoft,
    };
  }
  if (/대학교|대학병원/.test(name)) {
    return {
      label: "대학병원",
      icon: "building-columns",
      backgroundColor: Colors.surfaceSunken,
      accentColor: Colors.borderStrong,
      iconColor: Colors.navySoft,
    };
  }
  return {
    label: "응급의료기관",
    icon: "hospital",
    backgroundColor: Colors.okBg,
    accentColor: Colors.ok,
    iconColor: Colors.ok,
  };
};

const getRegionLabel = (value: string) => {
  const [stage1 = "", stage2 = ""] = value.trim().split(/\s+/);
  return [stage1, stage2].filter(Boolean).join(" ");
};

const iconForDepartment = (department: string): IconName =>
  departmentIconRules.find(({ keyword }) => department.includes(keyword))?.icon ?? "user-doctor";

const formatUpdatedAt = (value?: string) => {
  if (!value) return "확인 필요";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 12) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
  return value.replace("T", " ").slice(0, 16);
};

const isUpdatedAtStale = (value?: string) => {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return false;
  const updatedAt = new Date(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)) - 1, Number(digits.slice(6, 8)), Number(digits.slice(8, 10)), Number(digits.slice(10, 12)));
  return Date.now() - updatedAt.getTime() > 15 * 60 * 1000;
};

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
export default function HospitalDetailScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const {
    hpid,
    hospitalName,
    address,
    phone,
    emergencyPhone,
    availableBeds,
    distance,
    latitude,
    longitude,
    operatingRooms, neuroIcuBeds, neonatalIcuBeds, chestIcuBeds, generalIcuBeds, inpatientBeds,
    ctAvailable, mriAvailable, angiographyAvailable, ventilatorAvailable, ambulanceAvailable,
    pediatricVentilatorAvailable, incubatorAvailable, severeCapabilities, departments,
    dataUpdatedAt, dutyDoctor, dutyDoctorPhone,
  } = params;

  const [isFavorite, setIsFavorite] = useState(false);
  const [hospitalImage, setHospitalImage] = useState<HospitalImage | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const fallbackTheme = getHospitalFallbackTheme(String(hospitalName || ""));
  const regionLabel = getRegionLabel(String(address || ""));
  const currentHospital: FavoriteHospital = {
    hpid: String(hpid || ""),
    hospitalName: String(hospitalName || ""),
    address: String(address || ""),
    phone: String(phone || ""),
    emergencyPhone: String(emergencyPhone || ""),
    availableBeds: String(availableBeds || ""),
    distance: String(distance || ""),
    latitude: String(latitude || ""),
    longitude: String(longitude || ""),
  };

  const checkFavoriteStatus = useCallback(async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favoriteHospitals");

      if (!savedFavorites) {
        setIsFavorite(false);
        return;
      }

      const favoriteList: FavoriteHospital[] = JSON.parse(savedFavorites);

      const exists = favoriteList.some(
        (hospital) => hospital.hpid === currentHospital.hpid
      );

      setIsFavorite(exists);
    } catch (error) {
      console.log("즐겨찾기 확인 실패:", error);
    }
  }, [currentHospital.hpid]);

  const toggleFavorite = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem("favoriteHospitals");

      const favoriteList: FavoriteHospital[] = savedFavorites
        ? JSON.parse(savedFavorites)
        : [];

      const exists = favoriteList.some(
        (hospital) => hospital.hpid === currentHospital.hpid
      );

      let newFavoriteList: FavoriteHospital[] = [];

      if (exists) {
        newFavoriteList = favoriteList.filter(
          (hospital) => hospital.hpid !== currentHospital.hpid
        );

        await AsyncStorage.setItem(
          "favoriteHospitals",
          JSON.stringify(newFavoriteList)
        );

        setIsFavorite(false);
        Alert.alert("해제 완료", "즐겨찾기에서 해제되었습니다.");
        return;
      }

      newFavoriteList = [...favoriteList, currentHospital];

      await AsyncStorage.setItem(
        "favoriteHospitals",
        JSON.stringify(newFavoriteList)
      );

      setIsFavorite(true);
      Alert.alert("추가 완료", "즐겨찾기에 추가되었습니다.");
    } catch (error) {
      console.log("즐겨찾기 처리 실패:", error);
      Alert.alert("오류", "즐겨찾기 처리 중 문제가 발생했습니다.");
    }
  };

  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  useEffect(() => {
    void saveRecentHospital({
      ...params,
      hpid: String(hpid || ""),
      hospitalName: String(hospitalName || ""),
      address: String(address || ""),
      phone: String(phone || ""),
      emergencyPhone: String(emergencyPhone || ""),
      availableBeds: String(availableBeds || ""),
      distance: String(distance || ""),
      latitude: String(latitude || ""),
      longitude: String(longitude || ""),
      viewedAt: new Date().toISOString(),
    }).catch((error) => console.log("최근 본 응급실 저장 실패:", error));
  }, [address, availableBeds, distance, emergencyPhone, hpid, hospitalName, latitude, longitude, params, phone]);

  useEffect(() => {
    let active = true;
    setHospitalImage(null);
    setImageLoadFailed(false);

    void findOpenHospitalImage({
      hospitalName: String(hospitalName || ""),
      address: String(address || ""),
      latitude: Number(latitude),
      longitude: Number(longitude),
    }).then((image) => {
      if (active) {
        setHospitalImage(image);
      }
    });

    return () => {
      active = false;
    };
  }, [address, hospitalName, latitude, longitude]);

  const bedCount = Number(availableBeds);
  const [departmentList, setDepartmentList] = useState<string[]>(() => (departments ?? "").split(",").map((item) => item.trim()).filter(Boolean));
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const visibleDepartments = showAllDepartments
    ? departmentList
    : departmentList.slice(0, 6);

  useEffect(() => {
    const fetchDepartmentInfo = async () => {
      try {
        if (!hpid) {
          return;
        }
        const url = apiUrl(`/emergency/basic-info?hpid=${hpid}`);

        console.log("진료과목 요청 URL =", url);

        const response = await fetch(url);
        const data = await response.json();

        const departmentText =
          data?.response?.body?.items?.item?.dgidIdName ?? "";

        const departments = departmentText
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean);

        console.log("진료과목 =", departments);

        setDepartmentList(departments);
      } catch (error) {
        console.log("진료과목 불러오기 실패:", error);
      }
    };

    fetchDepartmentInfo();
  }, [hpid]);

  const bedItems = [
    { label: "응급실", value: Number(availableBeds), icon: "bed-pulse" as IconName },
    { label: "일반 중환자실", value: Number(generalIcuBeds), icon: "heart-pulse" as IconName },
    { label: "신경 중환자실", value: Number(neuroIcuBeds), icon: "brain" as IconName },
    { label: "신생아 중환자실", value: Number(neonatalIcuBeds), icon: "baby" as IconName },
    { label: "흉부 중환자실", value: Number(chestIcuBeds), icon: "lungs" as IconName },
    { label: "입원실", value: Number(inpatientBeds), icon: "bed" as IconName },
    { label: "수술실", value: Number(operatingRooms), icon: "hospital" as IconName },
  ];
  const facilityItems = [
    { label: "CT", available: ctAvailable === "true", icon: "x-ray" as IconName },
    { label: "MRI", available: mriAvailable === "true", icon: "magnet" as IconName },
    { label: "조영촬영기", available: angiographyAvailable === "true", icon: "camera-retro" as IconName },
    { label: "인공호흡기", available: ventilatorAvailable === "true", icon: "lungs" as IconName },
    { label: "소아 인공호흡기", available: pediatricVentilatorAvailable === "true", icon: "baby" as IconName },
    { label: "인큐베이터", available: incubatorAvailable === "true", icon: "baby-carriage" as IconName },
    { label: "구급차", available: ambulanceAvailable === "true", icon: "truck-medical" as IconName },
  ];
  const severeSet = new Set((severeCapabilities ?? "").split(",").filter(Boolean));

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert("전화번호 없음", "등록된 전화번호가 없습니다.");
      return;
    }

    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleNavigation = () => {
    if (!latitude || !longitude) {
      Alert.alert("위치 정보 없음", "병원 위치 정보가 없습니다.");
      return;
    }

    Alert.alert("길찾기", "사용할 지도 앱을 선택하세요.", [
      {
        text: "카카오맵",
        onPress: () => {
          const name = encodeURIComponent(String(hospitalName));

          Linking.openURL(
            `https://map.kakao.com/link/to/${name},${latitude},${longitude}`
          );
        },
      },
      {
        text: "티맵",
        onPress: () => {
          const name = encodeURIComponent(String(hospitalName));

          Linking.openURL(
            `tmap://route?goalname=${name}&goalx=${longitude}&goaly=${latitude}`
          );
        },
      },
      {
        text: "취소",
        style: "cancel",
      },
    ]);
  };

  const handleShare = async () => {
    const name = encodeURIComponent(String(hospitalName));

    const kakaoMapUrl = `https://map.kakao.com/link/to/${name},${latitude},${longitude}`;

    const message =
      `${hospitalName}\n\n` +
      `주소: ${address}\n` +
      `응급실 전화: ${emergencyPhone || phone}\n` +
      `거리: ${distance}km\n\n` +
      `길찾기: ${kakaoMapUrl}\n\n` +
      `살려줌 추천 응급실`;

    await Share.share({
      message,
    });
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()} accessibilityLabel="뒤로 가기">
            <FontAwesome6 name="chevron-left" size={20} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>응급실 상세</Text>

          <TouchableOpacity style={styles.headerIconButton} accessibilityLabel="병원 정보">
            <FontAwesome6 name="circle-info" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.imageBox}>
          {hospitalImage && !imageLoadFailed ? (
            <>
              <Image
                source={{ uri: hospitalImage.imageUrl }}
                style={styles.hospitalImage}
                resizeMode="cover"
                accessibilityLabel={`${hospitalName} 병원 사진`}
                onError={() => setImageLoadFailed(true)}
              />
              <TouchableOpacity
                style={styles.imageAttribution}
                onPress={() => Linking.openURL(hospitalImage.sourceUrl)}
                accessibilityLabel="병원 사진 출처 열기"
              >
                <Text style={styles.imageAttributionText} numberOfLines={1}>
                  {hospitalImage.author} · {hospitalImage.license} · Wikimedia Commons
                </Text>
                <FontAwesome6 name="arrow-up-right-from-square" size={10} color={Colors.surface} />
              </TouchableOpacity>
            </>
          ) : (
            <View
              style={[
                styles.fallbackImage,
                { backgroundColor: fallbackTheme.backgroundColor },
              ]}
              accessibilityLabel={`${hospitalName} ${fallbackTheme.label} 기본 이미지`}
            >
              <View
                style={[
                  styles.fallbackDecorLarge,
                  { backgroundColor: fallbackTheme.accentColor },
                ]}
              />
              <View
                style={[
                  styles.fallbackDecorSmall,
                  { backgroundColor: fallbackTheme.accentColor },
                ]}
              />
              <View style={styles.fallbackContent}>
                <View
                  style={[
                    styles.fallbackIconBox,
                    { borderColor: fallbackTheme.accentColor },
                  ]}
                >
                  <FontAwesome6
                    name={fallbackTheme.icon}
                    size={34}
                    color={fallbackTheme.iconColor}
                  />
                </View>
                <View style={styles.fallbackTextBox}>
                  <Text
                    style={[styles.fallbackType, { color: fallbackTheme.iconColor }]}
                  >
                    {fallbackTheme.label}
                  </Text>
                  <Text style={styles.fallbackHospitalName} numberOfLines={2}>
                    {hospitalName}
                  </Text>
                  {regionLabel ? (
                    <View style={styles.fallbackRegionRow}>
                      <FontAwesome6
                        name="location-dot"
                        size={11}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.fallbackRegion}>{regionLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text style={styles.fallbackNotice}>
                등록된 공개 라이선스 사진이 없어 기본 이미지로 표시됩니다
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleBox}>
              <Text style={styles.hospitalName}>{hospitalName}</Text>
              <Text style={styles.address}>{address}</Text>
            </View>

            <View style={styles.rightActionBox}>
              <TouchableOpacity
                style={[
                  styles.favoriteIconButton,
                  isFavorite && styles.favoriteIconButtonActive,
                ]}
                onPress={toggleFavorite}
              >
                <FontAwesome6 name="star" solid={isFavorite} size={19} color={isFavorite ? Colors.navy : Colors.textMuted} />
              </TouchableOpacity>

              <View
                style={[
                  styles.statusBadge,
                  bedCount <= 0 && styles.warningBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    bedCount <= 0 && styles.statusWarningText,
                  ]}
                >
                  {bedCount > 0 ? "수용 가능" : "확인 필요"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.phoneRow}>
            <FontAwesome6 name="phone" size={15} color={Colors.textSub} />
            <Text style={styles.phoneText}>
              {emergencyPhone || phone || "전화번호 정보 없음"}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(emergencyPhone || phone)}
            >
              <Text style={styles.callButtonText}>전화</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapButton}
              onPress={handleNavigation}
            >
              <Text style={styles.mapButtonText}>길찾기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Text style={styles.shareButtonText}>공유</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>진료 가능 항목</Text>

            {departmentList.length > 0 ? (
              <>
                <View style={styles.departmentGrid}>
                  {visibleDepartments.map((department, index) => (
                    <View key={`${department}-${index}`} style={styles.departmentItem}>
                      <View style={styles.departmentIconBox}><FontAwesome6 name={iconForDepartment(department)} size={20} color={Colors.navySoft} /></View>
                      <Text style={styles.departmentText} numberOfLines={1}>{department}</Text>
                    </View>
                  ))}
                </View>

                {departmentList.length > 6 && (
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => setShowAllDepartments(!showAllDepartments)}
                  >
                    <Text style={styles.moreButtonText}>
                      {showAllDepartments ? "접기" : `더보기 ${departmentList.length - 6}개`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptyInfoBox}>
                <Text style={styles.emptyInfoText}>
                  진료과목 정보가 없습니다.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>응급실 정보</Text>
              <Text style={styles.updateText}>실시간 정보</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>응급실 가용 병상</Text>
                <Text
                  style={[
                    styles.infoValue,
                    bedCount <= 0 && styles.statusWarningText,
                  ]}
                >
                  {bedCount > 0 ? `${bedCount}개` : "확인 필요"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>현재 위치와의 거리</Text>
                <Text style={styles.infoValue}>{distance}km</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>응급실 전화번호</Text>
                <Text style={styles.infoValue}>
                  {emergencyPhone || "정보 없음"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>대표 전화번호</Text>
                <Text style={styles.infoValue}>
                  {phone || "정보 없음"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.realtimeNotice}>
            <Text style={styles.realtimeTitle}>실시간 운영 정보</Text>
            <Text style={[styles.realtimeText, isUpdatedAtStale(dataUpdatedAt) && styles.staleRealtimeText]}>병상정보 갱신: {formatUpdatedAt(dataUpdatedAt)}{isUpdatedAtStale(dataUpdatedAt) ? " · 오래된 정보" : ""}</Text>
            {dutyDoctor ? <Text style={styles.realtimeText}>응급실 당직의: {dutyDoctor}</Text> : null}
            {dutyDoctorPhone ? <Text style={styles.realtimeText}>당직의 연락처: {dutyDoctorPhone}</Text> : null}
            <Text style={styles.realtimeWarning}>병상과 운영 상태는 변동될 수 있으니 출발 전 반드시 전화로 확인해주세요.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>병상 현황</Text>
            <View style={styles.detailGrid}>
              {bedItems.map((item) => (
                <View key={item.label} style={styles.detailItem}>
                  <FontAwesome6 name={item.icon} size={18} color={item.value > 0 ? Colors.ok : Colors.textFaint} />
                  <Text style={styles.detailLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={[styles.detailStatus, item.value <= 0 && styles.detailUnknown]}>{item.value > 0 ? `${item.value}개` : "확인 필요"}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>장비·시설</Text>
            <View style={styles.detailGrid}>
              {facilityItems.map((item) => (
                <View key={item.label} style={styles.detailItem}>
                  <FontAwesome6 name={item.icon} size={18} color={item.available ? Colors.navySoft : Colors.textFaint} />
                  <Text style={styles.detailLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={[styles.detailStatus, item.available ? styles.detailAvailable : styles.detailUnknown]}>{item.available ? "가능" : "확인 필요"}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>중증질환 수용 정보</Text>
            <View style={styles.capabilityCard}>
              {Object.entries(severeLabels).map(([key, label]) => {
                const available = severeSet.has(key);
                return <View key={key} style={styles.capabilityRow}><Text style={styles.capabilityLabel}>{label}</Text><View style={[styles.capabilityBadge, available && styles.capabilityBadgeActive]}><FontAwesome6 name={available ? "check" : "minus"} size={11} color={available ? Colors.ok : Colors.textFaint} /><Text style={[styles.capabilityText, available && styles.capabilityTextActive]}>{available ? "가능" : "확인 필요"}</Text></View></View>;
              })}
            </View>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>방문 전 확인</Text>
            <Text style={styles.warningText}>
              실제 수용 가능 여부는 병원 상황에 따라 달라질 수 있으니 방문 전
              전화 확인을 권장합니다.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screen },
  header: { minHeight: 56, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: Type.screenTitle, fontWeight: "900", color: Colors.text },
  infoIcon: { fontSize: 22, color: Colors.text },

  imageBox: { height: 170, marginHorizontal: 14, marginTop: 12, borderRadius: Radius.card, backgroundColor: Colors.border, overflow: "hidden", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  hospitalImage: { width: "100%", height: "100%" },
  fallbackImage: { width: "100%", height: "100%", justifyContent: "center", paddingHorizontal: 20 },
  fallbackDecorLarge: { position: "absolute", width: 150, height: 150, borderRadius: 75, top: -70, right: -35, opacity: 0.3 },
  fallbackDecorSmall: { position: "absolute", width: 74, height: 74, borderRadius: 37, bottom: -30, left: -18, opacity: 0.25 },
  fallbackContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  fallbackIconBox: { width: 64, height: 64, borderRadius: Radius.card, borderWidth: 1, backgroundColor: "rgba(255,255,255,0.82)", alignItems: "center", justifyContent: "center" },
  fallbackTextBox: { flex: 1 },
  fallbackType: { fontSize: Type.caption, fontWeight: "900", marginBottom: 5 },
  fallbackHospitalName: { color: Colors.text, fontSize: 18, lineHeight: 24, fontWeight: "900" },
  fallbackRegionRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  fallbackRegion: { color: Colors.textMuted, fontSize: Type.caption, fontWeight: "700" },
  fallbackNotice: { position: "absolute", left: 20, right: 20, bottom: 12, color: Colors.textMuted, fontSize: 9, fontWeight: "600" },
  imageAttribution: { position: "absolute", left: 10, right: 10, bottom: 10, minHeight: 28, borderRadius: Radius.control, paddingHorizontal: 9, backgroundColor: "rgba(11, 31, 58, 0.82)", flexDirection: "row", alignItems: "center", gap: 6 },
  imageAttributionText: { flex: 1, color: Colors.onDark, fontSize: 10, fontWeight: "700" },

  content: { paddingHorizontal: 14, paddingBottom: 32 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  titleBox: { flex: 1, marginRight: 12 },
  hospitalName: { fontSize: 21, fontWeight: "900", color: Colors.text, marginBottom: 6 },
  address: { fontSize: Type.label, color: Colors.textMuted, lineHeight: 19 },
  statusBadge: { backgroundColor: Colors.okBg, borderRadius: Radius.control, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: Type.caption, fontWeight: "900", color: Colors.ok },
  warningBadge: { backgroundColor: Colors.cautionBg },
  statusWarningText: { color: Colors.caution },

  phoneRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  phoneIcon: { fontSize: 17, marginRight: 8, color: Colors.navySoft },
  phoneText: { fontSize: Type.body, fontWeight: "800", color: Colors.navySoft },

  actionRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  callButton: { flex: 1, backgroundColor: Colors.urgent, borderRadius: Radius.control, minHeight: 50, alignItems: "center", justifyContent: "center" },
  callButtonText: { color: Colors.onDark, fontSize: Type.body, fontWeight: "900" },
  mapButton: { flex: 1, backgroundColor: Colors.navy, borderRadius: Radius.control, minHeight: 50, alignItems: "center", justifyContent: "center" },
  mapButtonText: { color: Colors.onDark, fontSize: Type.body, fontWeight: "900" },
  shareButton: { flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: Radius.control, minHeight: 50, alignItems: "center", justifyContent: "center" },
  shareButtonText: { color: Colors.text, fontSize: Type.body, fontWeight: "900" },

  realtimeNotice: { marginTop: 10, marginBottom: 14, backgroundColor: Colors.cautionBg, borderRadius: Radius.card, padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.caution },
  realtimeTitle: { fontSize: Type.body, fontWeight: "900", color: Colors.caution, marginBottom: 6 },
  realtimeText: { fontSize: Type.label, color: Colors.textSub, lineHeight: 19 },
  staleRealtimeText: { color: Colors.urgent, fontWeight: "800" },
  realtimeWarning: { fontSize: Type.caption, color: Colors.caution, fontWeight: "800", lineHeight: 17, marginTop: 6 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: Type.screenTitle, fontWeight: "900", color: Colors.text, marginBottom: 10 },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  updateText: { fontSize: Type.caption, color: Colors.textFaint, fontWeight: "700", marginBottom: 10 },

  departmentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  departmentItem: { width: "32%", backgroundColor: Colors.surface, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.border, paddingVertical: 11, paddingHorizontal: 4, alignItems: "center" },
  departmentIconBox: { width: 34, height: 34, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  departmentText: { fontSize: Type.caption, fontWeight: "800", color: Colors.textSub },

  infoCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 6 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 42, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: Type.label, color: Colors.textMuted },
  infoValue: { fontSize: Type.figureSm, fontWeight: "900", color: Colors.text },

  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  detailItem: { width: "32%", minHeight: 96, backgroundColor: Colors.surface, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 6, paddingVertical: 11, alignItems: "center", justifyContent: "center", gap: 5 },
  detailLabel: { fontSize: Type.caption, fontWeight: "800", color: Colors.textSub, textAlign: "center" },
  detailStatus: { fontSize: Type.caption, fontWeight: "900", color: Colors.ok },
  detailAvailable: { color: Colors.ok },
  detailUnknown: { color: Colors.textFaint },

  capabilityCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 2 },
  capabilityRow: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: Colors.divider },
  capabilityLabel: { fontSize: Type.label, fontWeight: "700", color: Colors.textSub },
  capabilityBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.surfaceSunken, paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.control },
  capabilityBadgeActive: { backgroundColor: Colors.okBg },
  capabilityText: { fontSize: Type.caption, fontWeight: "900", color: Colors.textFaint },
  capabilityTextActive: { color: Colors.ok },

  warningBox: { backgroundColor: Colors.urgentBg, borderRadius: Radius.card, padding: 14, borderLeftWidth: 3, borderLeftColor: Colors.urgent },
  warningTitle: { fontSize: Type.body, fontWeight: "900", color: Colors.urgent, marginBottom: 5 },
  warningText: { fontSize: Type.label, color: Colors.urgentText, lineHeight: 19 },

  emptyInfoBox: { backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, paddingVertical: 16, paddingHorizontal: 14, alignItems: "center" },
  emptyInfoText: { fontSize: Type.label, fontWeight: "700", color: Colors.textMuted },

  moreButton: { marginTop: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: Radius.control, minHeight: 46, alignItems: "center", justifyContent: "center" },
  moreButtonText: { fontSize: Type.label, fontWeight: "900", color: Colors.text },

  rightActionBox: { alignItems: "flex-end", gap: 8 },
  favoriteIconButton: { width: 44, height: 44, borderRadius: Radius.control, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  favoriteIconButtonActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  favoriteStar: { fontSize: 20, fontWeight: "900", color: Colors.textFaint },
  favoriteStarActive: { color: Colors.onDark },
});
