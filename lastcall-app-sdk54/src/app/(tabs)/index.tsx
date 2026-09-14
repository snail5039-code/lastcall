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
import { Radius, Tap, ThemeColors, Type, useThemeColors, useThemeStyles } from "../../constants/design";
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
  const Colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
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
          <Text style={styles.logo}>
            <Text style={styles.logoAccent}>살려</Text>줌
          </Text>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.topIconButton} onPress={() => { setIsNotificationOpen(!isNotificationOpen); setIsMenuOpen(false); }} accessibilityLabel="댓글 알림">
              <FontAwesome6 name="bell" size={20} color={Colors.textSub} />
              {notifications.length > 0 && <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{notifications.length > 9 ? "9+" : notifications.length}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.topIconButton} onPress={() => setIsMenuOpen(!isMenuOpen)} accessibilityLabel="메뉴">
              <FontAwesome6 name="bars" size={21} color={Colors.textSub} />
            </TouchableOpacity>
          </View>
        </View>

        {isNotificationOpen && (
          <View style={styles.notificationBox}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>댓글 알림</Text>
              {notifications.length > 0 && <TouchableOpacity onPress={readAllNotifications}><Text style={styles.readAllText}>모두 읽음</Text></TouchableOpacity>}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.emptyNotification}><FontAwesome6 name="bell-slash" size={22} color={Colors.textFaint} /><Text style={styles.emptyNotificationText}>새로운 댓글이 없습니다</Text></View>
            ) : notifications.slice(0, 8).map((notification) => (
              <TouchableOpacity key={notification.commentId} style={styles.notificationItem} onPress={() => openNotification(notification)}>
                <View style={styles.notificationDot} />
                <View style={styles.notificationTextBox}>
                  <Text style={styles.notificationPostTitle} numberOfLines={1}>{notification.postTitle}</Text>
                  <Text style={styles.notificationContent} numberOfLines={2}>{notification.nickname}: {notification.content}</Text>
                </View>
                <FontAwesome6 name="chevron-right" size={12} color={Colors.textFaint} />
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
              <FontAwesome6 name="bullhorn" size={15} color={Colors.textSub} /><Text style={styles.menuItemText}>공지사항</Text>
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
              <FontAwesome6 name="comments" size={15} color={Colors.textSub} /><Text style={styles.menuItemText}>자유게시판</Text>
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
              <FontAwesome6 name="pen-to-square" size={15} color={Colors.textSub} /><Text style={styles.menuItemText}>건의사항</Text>
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
              <FontAwesome6 name="circle-question" size={15} color={Colors.textSub} /><Text style={styles.menuItemText}>Q&A 게시판</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.adminMenuItem]} onPress={() => { setIsMenuOpen(false); router.push("/admin-reports"); }}>
              <FontAwesome6 name="user-shield" size={15} color={Colors.textMuted} /><Text style={styles.adminMenuText}>관리자 로그인</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.emergencyHero}>
          <Text style={styles.emergencyDescription}>의식 저하 · 호흡곤란 · 심한 흉통</Text>
          <View style={styles.emergencyTitleRow}>
            <Text style={styles.emergencyTitle}>검색보다 119가 먼저입니다</Text>
            <TouchableOpacity style={styles.call119Button} onPress={call119} accessibilityRole="button">
              <FontAwesome6 name="phone" size={15} color={Colors.urgent} />
              <Text style={styles.call119ButtonText}>119</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.locationCard}>
          <TouchableOpacity style={styles.locationMain} onPress={requestCurrentLocation} activeOpacity={0.8}>
          <View style={styles.locationRow}>
            <FontAwesome6 name="location-dot" size={20} color={Colors.navySoft} />
            <View style={styles.locationTextBox}>
              <Text style={styles.locationLabel} numberOfLines={1}>현재 위치</Text>
              <Text style={styles.locationText} numberOfLines={1}>{addressText}</Text>
            </View>
          </View>
          <FontAwesome6 name={currentLat === null ? "location-crosshairs" : "rotate"} size={19} color={Colors.textMuted} />
          </TouchableOpacity>
          {currentLat !== null && (
            <TouchableOpacity style={styles.locationShareButton} onPress={() => void shareCurrentLocation()}>
              <FontAwesome6 name="share-nodes" size={14} color={Colors.navySoft} />
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
                <FontAwesome6 name={symptom.icon} size={23} color={selectedSymptom === symptom.name ? Colors.onDark : Colors.navySoft} />
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
          <FontAwesome6 name="magnifying-glass" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.keywordInput}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            placeholder="병원명 또는 주소를 입력하세요"
            placeholderTextColor={Colors.textFaint}
            returnKeyType="search"
            onSubmitEditing={handleSearchEmergency}
            autoCorrect={false}
            accessibilityLabel="응급실 검색어"
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword("")} accessibilityLabel="검색어 지우기">
              <FontAwesome6 name="circle-xmark" size={17} color={Colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearchEmergency}>
          <View style={styles.buttonLabel}><FontAwesome6 name="magnifying-glass" size={17} color={Colors.onDark} /><Text style={styles.searchButtonText}>응급실 검색</Text></View>
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={openDetailedSearch}>
            <FontAwesome6 name="sliders" size={18} color={Colors.navySoft} />
            <Text style={styles.secondaryButtonText}>세부검색</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/aed" as Href)}>
            <FontAwesome6 name="heart-pulse" size={18} color={Colors.navySoft} />
            <Text style={styles.secondaryButtonText}>AED 찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/emergency-help")}>
            <FontAwesome6 name="kit-medical" size={18} color={Colors.navySoft} />
            <Text style={styles.secondaryButtonText}>응급처치</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.dataSourceText}>
          응급실 정보 출처: 보건복지부·국립중앙의료원 / 공공데이터포털
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screen },
  screen: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 26 },
  keyboardArea: { flex: 1 },
  scrollView: { flex: 1 },

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  topActions: { flexDirection: "row", alignItems: "center" },
  topIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 19, fontWeight: "900", color: Colors.text },
  logoAccent: { color: Colors.urgent },

  emergencyHero: { backgroundColor: Colors.urgent, borderRadius: Radius.control, padding: 14, marginBottom: 12 },
  emergencyCopy: { flex: 1 },
  emergencyTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  emergencyTitle: { flex: 1, color: Colors.onDark, fontSize: Type.title, fontWeight: "800" },
  emergencyDescription: { color: "#FFD9D9", fontSize: Type.caption, lineHeight: 17 },
  call119Button: { minWidth: 84, minHeight: Tap.min, paddingHorizontal: 14, borderRadius: Radius.control, backgroundColor: Colors.onDark, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  call119ButtonText: { color: Colors.urgent, fontSize: Type.body, fontWeight: "900" },

  locationCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: "hidden" },
  locationMain: { minHeight: 58, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  locationRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  locationTextBox: { flex: 1 },
  locationLabel: { fontSize: 10, color: Colors.textMuted },
  locationText: { fontSize: Type.body, fontWeight: "800", color: Colors.text, marginTop: 2 },
  locationShareButton: { minHeight: 44, borderTopWidth: 1, borderTopColor: Colors.divider, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surfaceSunken },
  locationShareText: { color: Colors.navySoft, fontSize: Type.label, fontWeight: "800" },

  sectionTitle: { fontSize: Type.label, fontWeight: "800", color: Colors.navySoft },
  sectionSubText: { fontSize: Type.caption, color: Colors.textFaint, marginTop: 2, marginBottom: 7 },
  symptomCard: { marginBottom: 10 },
  symptomGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 5 },
  symptomItem: { width: "32%", minHeight: 60, backgroundColor: Colors.surface, borderRadius: Radius.control, alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: Colors.border },
  selectedSymptom: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  symptomText: { fontSize: Type.caption, fontWeight: "700", color: Colors.navySoft },
  selectedSymptomText: { color: Colors.onDark },

  keywordSearchBox: { minHeight: Tap.min, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: Radius.control, paddingHorizontal: 13, marginBottom: 8 },
  keywordInput: { flex: 1, paddingVertical: 12, fontSize: Type.body, color: Colors.text },

  buttonLabel: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  searchButton: { backgroundColor: Colors.navy, borderRadius: Radius.control, minHeight: 54, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  searchButtonText: { color: Colors.onDark, fontSize: Type.screenTitle, fontWeight: "900" },

  secondaryRow: { flexDirection: "row", gap: 5 },
  secondaryButton: { flex: 1, minHeight: Tap.min, backgroundColor: Colors.surface, borderRadius: Radius.control, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 9 },
  secondaryButtonText: { fontSize: Type.caption, fontWeight: "700", color: Colors.navySoft },

  dataSourceText: { marginTop: 14, color: Colors.textFaint, fontSize: 10, lineHeight: 16, textAlign: "center" },

  notificationBadge: { position: "absolute", top: 4, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: Radius.control, backgroundColor: Colors.urgent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.screen },
  notificationBadgeText: { color: Colors.onDark, fontSize: 9, fontWeight: "900" },
  notificationBox: { position: "absolute", top: 50, right: 18, width: 300, maxHeight: 420, backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, padding: 12, zIndex: 120, elevation: 10, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  notificationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 9 },
  notificationTitle: { fontSize: Type.screenTitle, fontWeight: "900", color: Colors.text },
  readAllText: { fontSize: Type.label, fontWeight: "800", color: Colors.navySoft },
  emptyNotification: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 26 },
  emptyNotificationText: { fontSize: Type.body, color: Colors.textMuted },
  notificationItem: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: Colors.divider, paddingVertical: 10 },
  notificationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.navySoft },
  notificationTextBox: { flex: 1 },
  notificationPostTitle: { fontSize: Type.label, fontWeight: "800", color: Colors.text, marginBottom: 3 },
  notificationContent: { fontSize: Type.label, lineHeight: 18, color: Colors.textMuted },

  menuBox: { position: "absolute", top: 50, right: 18, width: 210, backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, paddingVertical: 6, zIndex: 100, elevation: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: Tap.min, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuItemText: { fontSize: Type.body, fontWeight: "700", color: Colors.text },
  adminMenuItem: { borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 0 },
  adminMenuText: { fontSize: Type.label, fontWeight: "700", color: Colors.textMuted },
});
