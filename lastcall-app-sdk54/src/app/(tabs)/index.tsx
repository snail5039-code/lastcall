import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Href, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../../config/api";
import { getAuthoredPosts, getReadCommentIds, markCommentsRead } from "../../services/community-notifications";
import { getCurrentLocationFast, hasLocationConsent } from "../../services/location";

type CommentNotification = {
  commentId: number;
  postId: number;
  postTitle: string;
  nickname: string;
  content: string;
  createdAt?: string;
};
const symptoms = [
  { id: 1, name: "고열", icon: "temperature-high" as const },
  { id: 2, name: "가슴통증", icon: "heart-pulse" as const },
  { id: 3, name: "호흡곤란", icon: "lungs" as const },
  { id: 4, name: "복통", icon: "person-dots-from-line" as const },
  { id: 5, name: "외상", icon: "bandage" as const },
  { id: 6, name: "소아응급", icon: "baby" as const },
];

export default function HomeScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<CommentNotification[]>([]);

  const [addressText, setAddressText] = useState("현재 위치를 설정해주세요");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [stage1, setStage1] = useState("");
  const [stage2, setStage2] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const [posts, readIds] = await Promise.all([getAuthoredPosts(), getReadCommentIds()]);
      const readSet = new Set(readIds);
      const results = await Promise.all(posts.map(async (post) => {
        const response = await fetch(apiUrl(`/community/post/${post.id}/comments`));
        if (!response.ok) return [];
        const comments: { id: number; nickname: string; content: string; createdAt?: string }[] = await response.json();
        return comments.filter((comment) => !readSet.has(comment.id)).map((comment) => ({
          commentId: comment.id,
          postId: post.id,
          postTitle: post.title,
          nickname: comment.nickname,
          content: comment.content,
          createdAt: comment.createdAt,
        }));
      }));
      setNotifications(results.flat().sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")));
    } catch (error) {
      console.error("댓글 알림 조회 실패", error);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  useEffect(() => {
    Promise.all([Location.getForegroundPermissionsAsync(), hasLocationConsent()]).then(([permission, consented]) => {
      if (consented && permission.status === "granted") void getCurrentLocation();
    });
  }, []);

  const getCurrentLocation = async () => {
    try {
      setAddressText("현재 위치 확인 중...");
      const location = await getCurrentLocationFast();
      const { latitude, longitude } = location;
      setCurrentLat(latitude);
      setCurrentLon(longitude);
      setStage1(location.stage1);
      setStage2(location.stage2);
      setAddressText(location.addressText);
      void fetch(apiUrl("/emergency/warmup/search"), { method: "POST" })
        .catch((error) => console.log("전국 병원 검색 사전 로딩 실패:", error));
      void fetch(apiUrl(`/emergency/warmup?stage1=${encodeURIComponent(location.stage1)}`), {
        method: "POST",
      }).catch((error) => console.log("지역 응급실 사전 로딩 실패:", error));
    } catch (error) {
      console.log("현재 위치 조회 실패:", error);
      setAddressText("위치 조회 실패");
    }
  };
  const requestCurrentLocation = () => {
    Alert.alert(
      "현재 위치 사용",
      "가까운 응급실과 거리를 안내하기 위해 현재 위치가 필요합니다. 위치는 서버에 저장하지 않습니다.",
      [
        { text: "나중에", style: "cancel" },
        { text: "위치 허용", onPress: () => void getCurrentLocation() },
      ],
    );
  };
  const call119 = () => {
    Alert.alert("119에 전화", "생명이 위급한 상황이면 즉시 신고하세요.", [
      { text: "취소", style: "cancel" },
      { text: "전화하기", style: "destructive", onPress: () => void Linking.openURL("tel:119") },
    ]);
  };
  const shareCurrentLocation = async () => {
    if (currentLat === null || currentLon === null) {
      Alert.alert("위치 확인 필요", "먼저 현재 위치를 설정해주세요.");
      return;
    }
    await Share.share({
      message: `[살려줌 현재 위치]\n${addressText}\nhttps://maps.google.com/?q=${currentLat},${currentLon}`,
    });
  };
  const handleSearchEmergency = () => {
    if ((currentLat === null || currentLon === null) && !searchKeyword.trim()) {
      Alert.alert("위치 확인 필요", "응급실을 검색하려면 현재 위치를 먼저 확인해주세요.");
      return;
    }

    if (!stage1 && !searchKeyword.trim()) {
      Alert.alert("지역 확인 필요", "현재 지역을 확인하지 못했습니다. 세부검색에서 지역을 선택해주세요.");
      return;
    }

    console.log("검색 버튼 클릭 selectedSymptom =", selectedSymptom);

    router.push({
      pathname: "/hospitals",
      params: {
        stage1: stage1,
        lat: String(currentLat ?? 37.5665),
        lon: String(currentLon ?? 126.978),
        symptom: selectedSymptom ?? "",
        ...(searchKeyword.trim() && { keyword: searchKeyword.trim() }),
      },
    });
  };

  const openDetailedSearch = () => {
    Keyboard.dismiss();
    router.push({
      pathname: "/filter",
      params: {
        ...(stage1 && { stage1 }),
        ...(stage2 && { stage2 }),
        ...(selectedSymptom && { symptom: selectedSymptom }),
        ...(searchKeyword.trim() && { keyword: searchKeyword.trim() }),
        ...(currentLat !== null && { lat: String(currentLat) }),
        ...(currentLon !== null && { lon: String(currentLon) }),
      },
    });
  };

  const openNotification = async (notification: CommentNotification) => {
    await markCommentsRead([notification.commentId]);
    setNotifications((current) => current.filter((item) => item.commentId !== notification.commentId));
    setIsNotificationOpen(false);
    router.push({ pathname: "/community-detail", params: { id: String(notification.postId) } });
  };

  const readAllNotifications = async () => {
    await markCommentsRead(notifications.map((notification) => notification.commentId));
    setNotifications([]);
    setIsNotificationOpen(false);
  };
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topIconButton} onPress={() => setIsMenuOpen(!isMenuOpen)} accessibilityLabel="메뉴">
            <FontAwesome6 name="bars" size={21} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topIconButton} onPress={() => { setIsNotificationOpen(!isNotificationOpen); setIsMenuOpen(false); }} accessibilityLabel="댓글 알림">
            <FontAwesome6 name="bell" size={20} color="#111827" />
            {notifications.length > 0 && <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{notifications.length > 9 ? "9+" : notifications.length}</Text></View>}
          </TouchableOpacity>
        </View>

        {isNotificationOpen && (
          <View style={styles.notificationBox}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>댓글 알림</Text>
              {notifications.length > 0 && <TouchableOpacity onPress={readAllNotifications}><Text style={styles.readAllText}>모두 읽음</Text></TouchableOpacity>}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.emptyNotification}><FontAwesome6 name="bell-slash" size={22} color="#94A3B8" /><Text style={styles.emptyNotificationText}>새로운 댓글이 없습니다</Text></View>
            ) : notifications.slice(0, 8).map((notification) => (
              <TouchableOpacity key={notification.commentId} style={styles.notificationItem} onPress={() => openNotification(notification)}>
                <View style={styles.notificationDot} />
                <View style={styles.notificationTextBox}>
                  <Text style={styles.notificationPostTitle} numberOfLines={1}>{notification.postTitle}</Text>
                  <Text style={styles.notificationContent} numberOfLines={2}>{notification.nickname}: {notification.content}</Text>
                </View>
                <FontAwesome6 name="chevron-right" size={12} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isMenuOpen && (
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);

                router.push({
                  pathname: "/community-board",
                  params: {
                    boardType: "NOTICE",
                  },
                });
              }}
            >
              <FontAwesome6 name="bullhorn" size={15} color="#334155" /><Text style={styles.menuItemText}>공지사항</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);

                router.push({
                  pathname: "/community-board",
                  params: {
                    boardType: "FREE",
                  },
                });
              }}
            >
              <FontAwesome6 name="comments" size={15} color="#334155" /><Text style={styles.menuItemText}>자유게시판</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setIsMenuOpen(false);

                router.push({
                  pathname: "/community-board",
                  params: {
                    boardType: "SUGGESTION",
                  },
                });
              }}
            >
              <FontAwesome6 name="pen-to-square" size={15} color="#334155" /><Text style={styles.menuItemText}>건의사항</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setIsMenuOpen(false);

                router.push({
                  pathname: "/community-board",
                  params: {
                    boardType: "QNA",
                  },
                });
              }}
            >
              <FontAwesome6 name="circle-question" size={15} color="#334155" /><Text style={styles.menuItemText}>Q&A 게시판</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.adminMenuItem]} onPress={() => { setIsMenuOpen(false); router.push("/admin-reports"); }}>
              <FontAwesome6 name="user-shield" size={15} color="#64748B" /><Text style={styles.adminMenuText}>관리자 로그인</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.emergencyHero}>
          <View style={styles.emergencyCopy}>
            <View style={styles.emergencyTitleRow}>
              <FontAwesome6 name="shield-heart" size={18} color="#FFFFFF" />
              <Text style={styles.emergencyTitle}>지금 위급한 상황인가요?</Text>
            </View>
            <Text style={styles.emergencyDescription}>의식 저하·호흡곤란·심한 흉통은 검색보다 119 신고가 먼저입니다.</Text>
          </View>
          <TouchableOpacity style={styles.call119Button} onPress={call119}>
            <FontAwesome6 name="phone" size={15} color="#DC2626" />
            <Text style={styles.call119ButtonText}>119 전화</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoArea}>
          <Text style={styles.logo}>
            <Text style={styles.logoRed}>살려</Text>줌
          </Text>
          <Text style={styles.mainText}>응급상황, 가장 가까운</Text>
          <Text style={styles.mainText}>응급실을 빠르게 찾아드립니다</Text>
        </View>

        <View style={styles.locationCard}>
          <TouchableOpacity style={styles.locationMain} onPress={requestCurrentLocation} activeOpacity={0.8}>
          <View style={styles.locationRow}>
            <FontAwesome6 name="location-dot" size={20} color="#EF4444" />
            <View>
              <Text style={styles.locationLabel} numberOfLines={1}>현재 위치</Text>
              <Text style={styles.locationText}>{addressText}</Text>
            </View>
          </View>
          <FontAwesome6 name={currentLat === null ? "location-crosshairs" : "rotate"} size={19} color="#64748B" />
          </TouchableOpacity>
          {currentLat !== null && (
            <TouchableOpacity style={styles.locationShareButton} onPress={() => void shareCurrentLocation()}>
              <FontAwesome6 name="share-nodes" size={14} color="#1D4ED8" />
              <Text style={styles.locationShareText}>위치 공유</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.symptomCard}>
          <Text style={styles.sectionTitle}>증상 선택</Text>
          <Text style={styles.sectionSubText}>해당 증상을 선택해주세요</Text>

          <View style={styles.symptomGrid}>
            {symptoms.map((symptom) => (
              <TouchableOpacity
                key={symptom.id}
                style={[
                  styles.symptomItem,
                  selectedSymptom === symptom.name && styles.selectedSymptom,
                ]}
                onPress={() => setSelectedSymptom((current) => current === symptom.name ? null : symptom.name)}
              >
                <FontAwesome6 name={symptom.icon} size={23} color={selectedSymptom === symptom.name ? "#EF4444" : "#475569"} />
                <Text
                  style={[
                    styles.symptomText,
                    selectedSymptom === symptom.name && styles.selectedSymptomText,
                  ]}
                >
                  {symptom.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.keywordSearchBox}>
          <FontAwesome6 name="magnifying-glass" size={16} color="#64748B" />
          <TextInput
            style={styles.keywordInput}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder="병원명 또는 주소를 입력하세요"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            onSubmitEditing={handleSearchEmergency}
            autoCorrect={false}
            accessibilityLabel="응급실 검색어"
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword("")} accessibilityLabel="검색어 지우기">
              <FontAwesome6 name="circle-xmark" size={17} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchEmergency}
        >
          <View style={styles.buttonLabel}><FontAwesome6 name="magnifying-glass" size={16} color="#FFFFFF" /><Text style={styles.searchButtonText}>응급실 검색하기</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailSearchButton} onPress={openDetailedSearch}>
          <View style={styles.buttonLabel}><FontAwesome6 name="sliders" size={16} color="#061A44" /><Text style={styles.detailSearchButtonText}>세부검색</Text></View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => router.push("/emergency-help")}
        >
          <View style={styles.buttonLabel}><FontAwesome6 name="triangle-exclamation" size={16} color="#DC2626" /><Text style={styles.helpButtonText}>응급 대처 안내</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.aedButton} onPress={() => router.push("/aed" as Href)}>
          <View style={styles.buttonLabel}><FontAwesome6 name="heart-pulse" size={16} color="#1D4ED8" /><Text style={styles.aedButtonText}>주변 AED 찾기</Text></View>
          <Text style={styles.aedStatusText}>서비스 준비 중</Text>
        </TouchableOpacity>
        <Text style={styles.dataSourceText}>
          응급실 정보 출처: 보건복지부·국립중앙의료원 / 공공데이터포털
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6FB",
  },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
  },
  keyboardArea: { flex: 1 },
  scrollView: { flex: 1 },
  dataSourceText: { marginTop: 14, color: "#64748B", fontSize: 11, lineHeight: 17, textAlign: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  topIconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  emergencyHero: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#B91C1C", borderRadius: 18, padding: 15, marginBottom: 14 },
  emergencyCopy: { flex: 1 },
  emergencyTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  emergencyTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  emergencyDescription: { marginTop: 6, color: "#FEE2E2", fontSize: 11, lineHeight: 16 },
  call119Button: { minWidth: 76, height: 42, borderRadius: 12, backgroundColor: "#FFFFFF", flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  call119ButtonText: { color: "#B91C1C", fontSize: 13, fontWeight: "900" },
  notificationBadge: { position: "absolute", top: 1, right: 0, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#F3F6FB" },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  notificationBox: { position: "absolute", top: 52, right: 22, width: 310, maxHeight: 420, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, zIndex: 120, elevation: 10, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  notificationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 10 },
  notificationTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  readAllText: { fontSize: 13, fontWeight: "800", color: "#EF4444" },
  emptyNotification: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 26 },
  emptyNotificationText: { fontSize: 14, color: "#64748B" },
  notificationItem: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingVertical: 10 },
  notificationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  notificationTextBox: { flex: 1 },
  notificationPostTitle: { fontSize: 14, fontWeight: "900", color: "#1F2937", marginBottom: 4 },
  notificationContent: { fontSize: 13, lineHeight: 18, color: "#64748B" },
  logoArea: {
    alignItems: "center",
    marginBottom: 13,
  },
  logo: {
    fontSize: 31,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 3,
  },
  logoRed: {
    color: "#E53935",
  },
  mainText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 19,
  },

  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 9,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  locationIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  locationLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  settingIcon: {
    fontSize: 20,
  },
  symptomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
    marginBottom: 9,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  sectionSubText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 8,
  },
  symptomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 7,
  },
  symptomItem: {
    width: "31%",
    height: 57,
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  selectedSymptom: {
    backgroundColor: "#FFF1F1",
    borderColor: "#E53935",
  },
  symptomIcon: {
    fontSize: 25,
    marginBottom: 8,
  },
  locationMain: { minHeight: 60, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  locationShareButton: { minHeight: 40, borderTopWidth: 1, borderTopColor: "#EFF6FF", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FBFF", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  locationShareText: { color: "#1D4ED8", fontSize: 12, fontWeight: "900" },
  buttonLabel: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  symptomText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  selectedSymptomText: {
    color: "#E53935",
  },
  keywordSearchBox: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginTop: 8,
    marginBottom: 10,
  },
  keywordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  searchButton: {
    backgroundColor: "#061A44",
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 9,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  detailSearchButton: { backgroundColor: "#FFFFFF", borderRadius: 15, paddingVertical: 11, alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1", marginBottom: 9 },
  detailSearchButtonText: { color: "#061A44", fontSize: 15, fontWeight: "900" },

  helpButton: {
    backgroundColor: "#FFF1F1",
    borderRadius: 15,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 4,
  },
  helpButtonText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "900",
  },

  menuBox: {
    position: "absolute",
    top: 52,
    left: 22,
    width: 210,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    zIndex: 100,
    elevation: 8,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  menuItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  aedButton: { minHeight: 48, backgroundColor: "#EFF6FF", borderRadius: 15, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#BFDBFE", marginBottom: 4 },
  aedButtonText: { color: "#1E3A8A", fontSize: 15, fontWeight: "900" },
  aedStatusText: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  adminMenuItem: { borderTopWidth: 1, borderTopColor: "#E2E8F0", borderBottomWidth: 0 },
  adminMenuText: { fontSize: 13, fontWeight: "700", color: "#64748B" },
});
