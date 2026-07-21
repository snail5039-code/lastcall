import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";

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

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      console.time("게시글 API 시간");

      const response = await fetch(
        apiUrl(`/community/posts?boardType=${boardType}&page=${currentPage}&size=10`)
      );

      console.timeEnd("게시글 API 시간");

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data: CommunityPostPage = await response.json();

      console.log(`${boardType} 게시글 목록:`, data);

      setPosts(data.posts);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("게시글 조회 실패:", error);
      setErrorMessage("게시글을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [boardType, currentPage])
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
        style={styles.centerContainer}
        edges={["top", "bottom"]}
      >
        <Text style={styles.errorText}>
          {errorMessage}
        </Text>
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
          <Text style={styles.backButtonText}>←</Text>
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
          renderItem={({ item }) => (
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
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
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
    color: "#DC2626",
  },

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
