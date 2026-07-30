import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";
import { clearCommunityHiddenState, getCommunityHiddenState } from "../services/community-moderation";
import { fetchWithRetry } from "../services/http";

type CommunityPost = {
  id: number;
  boardType: string;
  nickname: string;
  title: string;
  content: string;
  viewCount: number;
  createdAt?: string;
};

type CommunityPostPage = {
  posts: CommunityPost[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
};

const APP_NOTICES: CommunityPost[] = [
  {
    id: 5,
    boardType: "NOTICE",
    nickname: "살려줌 운영팀",
    title: "내 의료정보는 기기의 보안 저장소에 보관됩니다",
    content: "내 정보에 입력한 질환, 복용약, 알레르기와 보호자 연락처는 서버로 전송하지 않고 현재 기기의 보안 저장소에만 저장됩니다.",
    viewCount: 0,
    createdAt: "2026-07-26",
  },
  {
    id: 4,
    boardType: "NOTICE",
    nickname: "살려줌 운영팀",
    title: "응급상황에는 즉시 119에 신고해주세요",
    content: "의식 저하, 호흡곤란, 심한 흉통이나 대량 출혈처럼 위급한 증상이 있다면 앱 검색보다 119 신고를 우선해주세요.",
    viewCount: 0,
    createdAt: "2026-07-22",
  },
  {
    id: 3,
    boardType: "NOTICE",
    nickname: "살려줌 운영팀",
    title: "병원 방문 전 전화 확인을 권장합니다",
    content: "표시된 병상 정보는 실시간으로 달라질 수 있습니다. 출발하기 전에 응급실에 전화해 진료 가능 여부를 확인해주세요.",
    viewCount: 0,
    createdAt: "2026-07-22",
  },
  {
    id: 2,
    boardType: "NOTICE",
    nickname: "살려줌 운영팀",
    title: "응급실 검색 기능 이용 안내",
    content: "현재 위치와 증상으로 가까운 응급실을 찾거나, 병원명·주소를 직접 입력해 검색할 수 있습니다. 세부검색에서는 병상과 장비 조건도 선택할 수 있습니다.",
    viewCount: 0,
    createdAt: "2026-07-22",
  },
  {
    id: 1,
    boardType: "NOTICE",
    nickname: "살려줌 운영팀",
    title: "위치 정보 및 검색 결과 안내",
    content: "위치 정보는 가까운 응급실과 거리를 계산하는 데 사용됩니다. 검색 결과는 의료진의 진단이나 119의 안내를 대신하지 않습니다.",
    viewCount: 0,
    createdAt: "2026-07-22",
  },
];

export default function CommunityBoardScreen() {
  const params = useLocalSearchParams();

  const boardType =
    typeof params.boardType === "string"
      ? params.boardType
      : "FREE";

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setCurrentPage(0);
  }, [boardType]);

  const getBoardTitle = () => {
    switch (boardType) {
      case "NOTICE":
        return "공지사항";

      case "FREE":
        return "자유게시판";

      case "SUGGESTION":
        return "건의사항";

      case "QNA":
        return "Q&A 게시판";

      default:
        return "커뮤니티";
    }
  };

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      if (boardType === "NOTICE") {
        setPosts(APP_NOTICES);
        setCurrentPage(0);
        setTotalPages(1);
        return;
      }

      const response = await fetchWithRetry(
        apiUrl(`/community/posts?boardType=${boardType}&page=${currentPage}&size=10`)
      );

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data: CommunityPostPage = await response.json();

      const hidden = await getCommunityHiddenState();
      setPosts(data.posts.filter((post) => !hidden.postIds.has(post.id) && !hidden.authors.has(post.nickname)));
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("게시글 조회 실패:", error);
      setErrorMessage("게시글을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [boardType, currentPage]);
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.centerContainer}
        edges={["top", "bottom"]}
      >
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          게시글을 불러오는 중입니다.
        </Text>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["top", "bottom"]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="chevron-left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getBoardTitle()}</Text>
          <TouchableOpacity
            style={styles.writeButton}
            onPress={() => router.push({ pathname: "/community-write", params: { boardType } })}
          >
            <Text style={styles.writeButtonText}>글쓰기</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome6 name="wifi" size={32} color="#DC2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.errorDescription}>인터넷 연결을 확인한 후 다시 시도해주세요.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPosts}>
            <FontAwesome6 name="rotate-right" size={14} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>다시 불러오기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome6 name="chevron-left" size={20} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {getBoardTitle()}
        </Text>

        {boardType !== "NOTICE" ? (
          <TouchableOpacity
            style={styles.writeButton}
            onPress={() =>
              router.push({
                pathname: "/community-write",
                params: {
                  boardType,
                },
              })
            }
          >
            <Text style={styles.writeButtonText}>
              글쓰기
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.rightSpacer} />
        )}
      </View>
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.headerNumber}>
            번호
          </Text>

          <Text style={styles.headerPostTitle}>
            제목
          </Text>

          <Text style={styles.headerViewCount}>
            조회
          </Text>
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => boardType === "NOTICE" ? (
            <View style={styles.noticeRow}>
              <View style={styles.noticeIcon}><FontAwesome6 name="bullhorn" size={14} color="#DC2626" /></View>
              <View style={styles.postInfo}>
                <Text style={styles.postTitle}>{item.title}</Text>
                <Text style={styles.noticeContent}>{item.content}</Text>
                <Text style={styles.postMeta}>{item.nickname} · {item.createdAt}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.postRow}
              onPress={() =>
                router.push({
                  pathname: "/community-detail",
                  params: {
                    id: item.id.toString(),
                    boardType,
                  },
                })
              }
            >
              <Text style={styles.postNumber}>
                {item.id}
              </Text>

              <View style={styles.postInfo}>
                <Text
                  style={styles.postTitle}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                <Text style={styles.postMeta}>
                  {item.nickname}
                  {item.createdAt
                    ? ` · ${item.createdAt.slice(0, 10)}`
                    : ""}
                </Text>
              </View>

              <Text style={styles.viewCount}>
                {item.viewCount}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                등록된 게시글이 없습니다.
              </Text>
            </View>
          }
          contentContainerStyle={
            posts.length === 0
              ? styles.emptyListContainer
              : styles.listContainer
          }
        />
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[
              styles.pageButton,
              currentPage === 0 && styles.disabledButton,
            ]}
            disabled={currentPage === 0}
            onPress={() => setCurrentPage(currentPage - 1)}
          >
            <Text style={styles.pageButtonText}>이전</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfo}>
            {currentPage + 1} / {totalPages === 0 ? 1 : totalPages}
          </Text>

          <TouchableOpacity
            style={[
              styles.pageButton,
              currentPage + 1 >= totalPages && styles.disabledButton,
            ]}
            disabled={currentPage + 1 >= totalPages}
            onPress={() => setCurrentPage(currentPage + 1)}
          >
            <Text style={styles.pageButtonText}>다음</Text>
          </TouchableOpacity>
        </View>
        {boardType !== "NOTICE" && (
          <TouchableOpacity
            style={styles.resetHiddenButton}
            onPress={() => {
              Alert.alert("숨김 목록 초기화", "이 기기에서 숨긴 게시글과 작성자를 다시 표시할까요?", [
                { text: "취소", style: "cancel" },
                {
                  text: "다시 표시",
                  onPress: () => {
                    void clearCommunityHiddenState().then(fetchPosts);
                  },
                },
              ]);
            }}
          >
            <FontAwesome6 name="eye" size={13} color="#64748B" />
            <Text style={styles.resetHiddenText}>숨긴 게시글·작성자 다시 표시</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  resetHiddenButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  resetHiddenText: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingTop: 20,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },

  listContainer: {
    paddingBottom: 30,
  },

  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  nickname: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 7,
  },

  content: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
    marginTop: 10,
  },

  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },

  errorText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#DC2626",
    marginTop: 14,
  },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  errorDescription: { marginTop: 7, color: "#64748B", fontSize: 13, textAlign: "center" },
  retryButton: { marginTop: 18, minHeight: 46, paddingHorizontal: 20, borderRadius: 12, backgroundColor: "#061A44", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  retryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },

  emptyListContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  backButton: {
    width: 54,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },

  backButtonText: {
    fontSize: 28,
    color: "#111827",
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F1",
  },
  noticeContent: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#4B5563",
  },

  writeButton: {
    width: 54,
    height: 40,
    backgroundColor: "#061A44",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  writeButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  rightSpacer: {
    width: 54,
    height: 40,
  },
  postRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 72,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  postNumber: {
    width: 48,
    textAlign: "center",
    fontSize: 13,
    color: "#6B7280",
  },

  postInfo: {
    flex: 1,
    paddingHorizontal: 10,
  },

  postTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  postMeta: {
    marginTop: 5,
    fontSize: 12,
    color: "#9CA3AF",
  },

  viewCount: {
    width: 48,
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#D1D5DB",
  },

  headerNumber: {
    width: 48,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  headerPostTitle: {
    flex: 1,
    paddingHorizontal: 10,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  headerViewCount: {
    width: 48,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  tableContainer: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },

  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 16,
  },

  pageButton: {
    minWidth: 64,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#061A44",
    borderRadius: 8,
  },

  disabledButton: {
    backgroundColor: "#D1D5DB",
  },

  pageButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  pageInfo: {
    minWidth: 60,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
});
