import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Href, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../../config/api";
import { Radius, Tap, ThemeColors, ThemeMode, Type, useThemeColors, useThemeMode, useThemeStyles } from "../../constants/design";
import { getAuthoredPosts, getReadCommentIds, markCommentsRead } from "../../services/community-notifications";
import { formatUpdatedAt, isUpdatedAtStale } from "../../services/data-freshness";
import { fetchWithRetry } from "../../services/http";
import { CurrentLocation, getCurrentLocationFast, hasLocationConsent } from "../../services/location";
import { callPhone } from "../../services/navigation";
import { Hospital } from "../../types/hospital";

type CommentNotification = {
  commentId: number;
  postId: number;
  postTitle: string;
  nickname: string;
  content: string;
  createdAt?: string;
};
/** 시스템 설정을 따르는 상태를 남겨 두기 위해 두 단계가 아니라 세 단계로 돈다. */
const THEME_ORDER: ThemeMode[] = ["system", "light", "dark"];
const THEME_ICON = { system: "circle-half-stroke", light: "sun", dark: "moon" } as const;
const THEME_LABEL = { system: "시스템 설정", light: "밝게", dark: "어둡게" } as const;

export default function HomeScreen() {
  const Colors = useThemeColors();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const cycleThemeMode = () =>
    setThemeMode(THEME_ORDER[(THEME_ORDER.indexOf(themeMode) + 1) % THEME_ORDER.length]);
  const styles = useThemeStyles(createStyles);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<CommentNotification[]>([]);

  const [addressText, setAddressText] = useState("현재 위치를 설정해주세요");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);
  const [stage1, setStage1] = useState("");
  const [nearest, setNearest] = useState<Hospital | null>(null);
  const [nearestStatus, setNearestStatus] = useState<"idle" | "loading" | "ready" | "none" | "error">("idle");

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

  // 화면을 처음 열 때 한 번만 위치를 확인한다.
  useEffect(() => {
    Promise.all([Location.getForegroundPermissionsAsync(), hasLocationConsent()]).then(([permission, consented]) => {
      if (consented && permission.status === "granted") void getCurrentLocation();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 가장 가까우면서 응급병상이 있는 응급실을 찾는다. 최신 정보(15분 이내)를 먼저 찾고, 없으면 오래된 정보라도 보여주되 표시한다. */
  const loadNearest = async (latitude: number, longitude: number, region1: string, region2: string) => {
    setNearestStatus("loading");
    try {
      const query =
        `/emergency/nearby?stage1=${encodeURIComponent(region1)}` +
        (region2 ? `&stage2=${encodeURIComponent(region2)}` : "") +
        `&lat=${latitude}&lon=${longitude}&sort=distance&bedTypes=emergency&includeDetails=false`;
      for (const fresh of [true, false]) {
        const response = await fetchWithRetry(apiUrl(query + (fresh ? "&freshOnly=true" : "")));
        if (!response.ok) throw new Error(`응급실 응답 오류: ${response.status}`);
        const list: Hospital[] = await response.json();
        const found = list.find((item) => item.availableBeds > 0 && Number.isFinite(item.latitude));
        if (found) {
          setNearest(found);
          setNearestStatus("ready");
          return;
        }
      }
      setNearest(null);
      setNearestStatus("none");
    } catch (error) {
      console.log("가까운 응급실 요약 조회 실패:", error);
      setNearest(null);
      setNearestStatus("error");
    }
  };

  const applyLocation = (location: CurrentLocation) => {
    setCurrentLat(location.latitude);
    setCurrentLon(location.longitude);
    setStage1(location.stage1);
    setAddressText(location.addressText);
    void fetch(apiUrl("/emergency/warmup/search"), { method: "POST" })
      .catch((error) => console.log("전국 병원 검색 사전 로딩 실패:", error));
    void fetch(apiUrl(`/emergency/warmup?stage1=${encodeURIComponent(location.stage1)}`), {
      method: "POST",
    }).catch((error) => console.log("지역 응급실 사전 로딩 실패:", error));
    if (location.stage1) void loadNearest(location.latitude, location.longitude, location.stage1, location.stage2);
  };

  const getCurrentLocation = async () => {
    try {
      setAddressText("현재 위치 확인 중...");
      applyLocation(await getCurrentLocationFast());
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
  const shareCurrentLocation = async () => {
    if (currentLat === null || currentLon === null) {
      Alert.alert("위치 확인 필요", "먼저 현재 위치를 설정해주세요.");
      return;
    }
    try {
      await Share.share({
        message: `[살려줌 현재 위치]\n${addressText}\nhttps://maps.google.com/?q=${currentLat},${currentLon}`,
      });
    } catch {
      Alert.alert("공유 실패", "이 기기에서는 공유를 사용할 수 없습니다. 주소를 직접 전달해주세요.");
    }
  };

  /** 응급실 목록으로 간다. 위치를 아직 모르면 여기서 확인하고, 끝내 모르면 지역을 직접 고르게 한다. */
  const goFindEmergency = async () => {
    let region = stage1;
    let latitude = currentLat;
    let longitude = currentLon;

    if (!region || latitude === null || longitude === null) {
      try {
        const location = await getCurrentLocationFast();
        applyLocation(location);
        region = location.stage1;
        latitude = location.latitude;
        longitude = location.longitude;
      } catch {
        // 위치 없이도 쓸 수 있게 지역 직접 선택으로 안내한다.
      }
    }

    if (!region || latitude === null || longitude === null) {
      Alert.alert("위치를 확인하지 못했어요", "지역을 직접 골라 응급실을 찾을 수 있어요.", [
        { text: "취소", style: "cancel" },
        { text: "지역 선택", onPress: () => router.push("/filter") },
      ]);
      return;
    }

    router.push({
      pathname: "/hospitals",
      params: { stage1: region, lat: String(latitude), lon: String(longitude) },
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
            <TouchableOpacity
              style={styles.topIconButton}
              onPress={cycleThemeMode}
              accessibilityRole="button"
              accessibilityLabel={`화면 테마: ${THEME_LABEL[themeMode]}. 누르면 다음 설정으로 바뀝니다.`}
            >
              <FontAwesome6 name={THEME_ICON[themeMode]} size={19} color={Colors.textSub} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topIconButton} onPress={() => { setIsNotificationOpen(!isNotificationOpen); setIsMenuOpen(false); }} accessibilityLabel="댓글 알림" accessibilityRole="button">
              <FontAwesome6 name="bell" size={20} color={Colors.textSub} />
              {notifications.length > 0 && <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{notifications.length > 9 ? "9+" : notifications.length}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.topIconButton} onPress={() => setIsMenuOpen(!isMenuOpen)} accessibilityLabel="메뉴" accessibilityRole="button">
              <FontAwesome6 name="bars" size={21} color={Colors.textSub} />
            </TouchableOpacity>
          </View>
        </View>

        {isNotificationOpen && (
          <View style={styles.notificationBox}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>댓글 알림</Text>
              {notifications.length > 0 && <TouchableOpacity onPress={readAllNotifications} accessibilityRole="button"><Text style={styles.readAllText}>모두 읽음</Text></TouchableOpacity>}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.emptyNotification}><FontAwesome6 name="bell-slash" size={22} color={Colors.textFaint} /><Text style={styles.emptyNotificationText}>새로운 댓글이 없습니다</Text></View>
            ) : notifications.slice(0, 8).map((notification) => (
              <TouchableOpacity key={notification.commentId} style={styles.notificationItem} onPress={() => openNotification(notification)} accessibilityRole="button">
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
              accessibilityRole="button"
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
              accessibilityRole="button"
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
              accessibilityRole="button"
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
              accessibilityRole="button"
            >
              <FontAwesome6 name="circle-question" size={15} color={Colors.textSub} /><Text style={styles.menuItemText}>Q&A 게시판</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.adminMenuItem]} onPress={() => { setIsMenuOpen(false); router.push("/admin-reports"); }} accessibilityRole="button">
              <FontAwesome6 name="user-shield" size={15} color={Colors.textMuted} /><Text style={styles.adminMenuText}>관리자 로그인</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.headline}>어떤 도움이 필요하세요?</Text>

        {/* 판단을 돕는 한 줄 요약. 확정 안내가 아니라 참고이므로 갱신 시각을 항상 함께 보여준다. */}
        {nearestStatus === "ready" && nearest ? (
          <TouchableOpacity style={styles.summaryCard} onPress={() => void goFindEmergency()} accessibilityRole="button" accessibilityLabel={`가장 가까운 응급실 ${nearest.hospitalName}, 목록 보기`}>
            <Text style={styles.summaryLabel}>가장 가까운 응급실 (병상 있음)</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryName} numberOfLines={1}>{nearest.hospitalName}</Text>
              <Text style={styles.summaryDistance}>{nearest.distance}km</Text>
            </View>
            <Text style={[styles.summaryMeta, isUpdatedAtStale(nearest.dataUpdatedAt) && styles.summaryStale]}>
              병상 {nearest.availableBeds}개 · {formatUpdatedAt(nearest.dataUpdatedAt, "갱신 시각 확인 필요")} 기준
              {isUpdatedAtStale(nearest.dataUpdatedAt) ? " · 오래된 정보, 전화로 확인" : ""}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.summaryCard}
            onPress={currentLat === null ? requestCurrentLocation : () => void goFindEmergency()}
            accessibilityRole="button"
          >
            <Text style={styles.summaryLabel}>가장 가까운 응급실</Text>
            <Text style={styles.summaryEmpty}>
              {currentLat === null
                ? "위치를 설정하면 가까운 응급실을 알려드려요"
                : nearestStatus === "loading"
                  ? "가까운 응급실을 찾고 있어요"
                  : nearestStatus === "none"
                    ? "병상이 있는 응급실을 찾지 못했어요. 목록에서 직접 확인해보세요"
                    : "응급실 정보를 불러오지 못했어요. 목록에서 다시 시도해보세요"}
            </Text>
            {currentLat === null ? <Text style={styles.summaryAction}>위치 설정</Text> : null}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.bigCall} onPress={() => callPhone("119")} accessibilityRole="button" accessibilityLabel="119에 전화">
          <FontAwesome6 name="phone" size={26} color={Colors.onDark} />
          <View style={styles.bigTextBox}>
            <Text style={styles.bigTitle}>119 전화</Text>
            <Text style={styles.bigCallSub}>의식이 없거나 숨쉬기 힘들면 먼저 신고하세요</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bigFind} onPress={() => void goFindEmergency()} accessibilityRole="button" accessibilityLabel="응급실 찾기">
          <FontAwesome6 name="hospital" size={24} color={Colors.onDark} />
          <View style={styles.bigTextBox}>
            <Text style={styles.bigTitle}>응급실 찾기</Text>
            <Text style={styles.bigFindSub}>가까운 순으로 병상과 전화를 보여드려요</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.tileRow}>
          <TouchableOpacity style={styles.tile} onPress={() => router.push("/aed" as Href)} accessibilityRole="button">
            <FontAwesome6 name="heart-pulse" size={22} color={Colors.navySoft} />
            <Text style={styles.tileTitle}>AED 찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tile} onPress={() => router.push("/emergency-help")} accessibilityRole="button">
            <FontAwesome6 name="kit-medical" size={22} color={Colors.navySoft} />
            <Text style={styles.tileTitle}>응급처치 보기</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.modeLink} onPress={() => router.push("/emergency-mode" as Href)} accessibilityRole="button">
          <Text style={styles.modeLinkText}>응급 모드 · 내 의료정보와 보호자 문자</Text>
          <FontAwesome6 name="chevron-right" size={11} color={Colors.textFaint} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.locationLine} onPress={requestCurrentLocation} accessibilityRole="button" accessibilityLabel="현재 위치 설정">
          <FontAwesome6 name="location-dot" size={12} color={Colors.textMuted} />
          <Text style={styles.locationLineText} numberOfLines={1}>{addressText}</Text>
          <Text style={styles.locationLineAction}>{currentLat === null ? "설정" : "새로고침"}</Text>
        </TouchableOpacity>
        {currentLat !== null && (
          <TouchableOpacity style={styles.shareLink} onPress={() => void shareCurrentLocation()} accessibilityRole="button">
            <Text style={styles.shareLinkText}>내 위치 공유하기</Text>
          </TouchableOpacity>
        )}
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

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  topActions: { flexDirection: "row", alignItems: "center" },
  topIconButton: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 20, fontWeight: "700", color: Colors.text },
  logoAccent: { color: Colors.navy },
  headline: { fontSize: 26, lineHeight: 34, fontWeight: "700", color: Colors.text, marginTop: 4, marginBottom: 16 },

  summaryCard: { padding: 16, borderRadius: Radius.card, backgroundColor: Colors.surface, marginBottom: 12, gap: 6 },
  summaryLabel: { fontSize: Type.caption, fontWeight: "600", color: Colors.textMuted },
  summaryRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  summaryName: { flex: 1, fontSize: 18, fontWeight: "700", color: Colors.text },
  summaryDistance: { fontSize: 18, fontWeight: "700", color: Colors.text },
  summaryMeta: { fontSize: Type.label, color: Colors.ok, fontWeight: "600" },
  summaryStale: { color: Colors.urgent },
  summaryEmpty: { fontSize: Type.body, lineHeight: 21, color: Colors.textSub },
  summaryAction: { fontSize: Type.label, fontWeight: "700", color: Colors.navySoft },

  bigTextBox: { flex: 1 },
  bigTitle: { fontSize: 24, fontWeight: "700", color: Colors.onDark },
  bigCall: { minHeight: 104, paddingHorizontal: 22, borderRadius: Radius.card, backgroundColor: Colors.urgentFill, flexDirection: "row", alignItems: "center", gap: 18 },
  bigCallSub: { marginTop: 3, fontSize: Type.label, color: Colors.onUrgent },
  bigFind: { marginTop: 10, minHeight: 104, paddingHorizontal: 22, borderRadius: Radius.card, backgroundColor: Colors.navy, flexDirection: "row", alignItems: "center", gap: 18 },
  bigFindSub: { marginTop: 3, fontSize: Type.label, color: Colors.navyOnDark },

  tileRow: { marginTop: 10, flexDirection: "row", gap: 10 },
  tile: { flex: 1, minHeight: 88, padding: 16, borderRadius: Radius.card, backgroundColor: Colors.surface, justifyContent: "space-between" },
  tileTitle: { fontSize: Type.title, fontWeight: "700", color: Colors.text },

  modeLink: { marginTop: 14, minHeight: 44, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modeLinkText: { fontSize: Type.label, fontWeight: "600", color: Colors.textSub },

  locationLine: { minHeight: 40, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 8 },
  locationLineText: { flex: 1, fontSize: Type.caption, color: Colors.textMuted },
  locationLineAction: { fontSize: Type.caption, fontWeight: "700", color: Colors.navySoft },
  shareLink: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4 },
  shareLinkText: { fontSize: Type.caption, fontWeight: "600", color: Colors.navySoft },

  dataSourceText: { marginTop: 14, color: Colors.textFaint, fontSize: 11, lineHeight: 16, textAlign: "center" },

  notificationBadge: { position: "absolute", top: 4, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: Radius.control, backgroundColor: Colors.urgentFill, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.screen },
  notificationBadgeText: { color: Colors.onDark, fontSize: 9, fontWeight: "700" },
  notificationBox: { position: "absolute", top: 50, right: 18, width: 300, maxHeight: 420, backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, padding: 12, zIndex: 120, elevation: 10, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  notificationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 9 },
  notificationTitle: { fontSize: Type.screenTitle, fontWeight: "700", color: Colors.text },
  readAllText: { fontSize: Type.label, fontWeight: "700", color: Colors.navySoft },
  emptyNotification: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 26 },
  emptyNotificationText: { fontSize: Type.body, color: Colors.textMuted },
  notificationItem: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: Colors.divider, paddingVertical: 10 },
  notificationDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.navySoft },
  notificationTextBox: { flex: 1 },
  notificationPostTitle: { fontSize: Type.label, fontWeight: "700", color: Colors.text, marginBottom: 3 },
  notificationContent: { fontSize: Type.label, lineHeight: 18, color: Colors.textMuted },

  menuBox: { position: "absolute", top: 50, right: 18, width: 210, backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: Colors.border, paddingVertical: 6, zIndex: 100, elevation: 8, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: Tap.min, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuItemText: { fontSize: Type.body, fontWeight: "700", color: Colors.text },
  adminMenuItem: { borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 0 },
  adminMenuText: { fontSize: Type.label, fontWeight: "700", color: Colors.textMuted },
});
