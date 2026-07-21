import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";
import { ADMIN_TOKEN_KEY } from "../services/admin-auth";

type AdminReport = {
  id: number;
  targetType: "POST" | "COMMENT";
  targetId: number;
  reason: string;
  status: "PENDING" | "RESOLVED";
  createdAt?: string;
  targetTitle?: string;
  targetContent?: string;
  targetNickname?: string;
};

export default function AdminReportsScreen() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(ADMIN_TOKEN_KEY).then((saved) => {
      setToken(saved ?? "");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (token) void loadReports(token, status);
  }, [token, status]);

  const loadReports = async (adminToken = token, nextStatus = status) => {
    try {
      setLoading(true);
      const response = await fetch(apiUrl(`/community/admin/reports?status=${nextStatus === "ALL" ? "" : nextStatus}`), {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (response.status === 401) {
        await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY);
        setToken("");
        Alert.alert("로그인 만료", "관리자 비밀번호를 다시 입력해주세요.");
        return;
      }
      if (!response.ok) throw new Error(`신고 목록 오류: ${response.status}`);
      setReports(await response.json());
    } catch (error) {
      console.error("관리자 신고 목록 실패:", error);
      Alert.alert("조회 실패", "신고 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (!password.trim()) return;
    try {
      setLoading(true);
      const response = await fetch(apiUrl("/community/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (response.status === 429) {
        Alert.alert("로그인 제한", "실패 횟수가 많습니다. 10분 후 다시 시도해주세요.");
        return;
      }
      if (!response.ok) {
        Alert.alert("로그인 실패", response.status === 503 ? "서버에 관리자 비밀번호가 설정되지 않았습니다." : "비밀번호를 확인해주세요.");
        return;
      }
      const session: { token: string } = await response.json();
      await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, session.token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
      setPassword("");
      setToken(session.token);
    } catch {
      Alert.alert("연결 실패", "서버 연결을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const adminRequest = async (path: string, method: "PUT" | "DELETE") => {
    const response = await fetch(apiUrl(path), { method, headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`관리 작업 실패: ${response.status}`);
    await loadReports();
  };

  const resolveReport = (report: AdminReport) => {
    Alert.alert("처리 완료", "이 신고를 처리 완료로 표시할까요?", [
      { text: "취소", style: "cancel" },
      { text: "완료", onPress: () => adminRequest(`/community/admin/reports/${report.id}/resolve`, "PUT") },
    ]);
  };

  const deleteContent = (report: AdminReport) => {
    Alert.alert("신고 대상 삭제", "원문을 삭제하고 신고를 처리 완료할까요? 이 작업은 되돌릴 수 없습니다.", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => adminRequest(`/community/admin/reports/${report.id}/content`, "DELETE") },
    ]);
  };

  const logout = async () => {
    await fetch(apiUrl("/community/admin/logout"), { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY);
    setToken("");
    setReports([]);
  };

  if (!token) {
    return <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}><TouchableOpacity style={styles.iconButton} onPress={() => router.back()}><FontAwesome6 name="chevron-left" size={20} color="#111827" /></TouchableOpacity><Text style={styles.headerTitle}>관리자 로그인</Text><View style={styles.iconButton} /></View>
      <View style={styles.loginCard}><FontAwesome6 name="user-shield" size={34} color="#061A44" /><Text style={styles.loginTitle}>신고 관리</Text><Text style={styles.loginDescription}>관리자 계정 정보를 입력해주세요.</Text><TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="관리자 아이디" autoCapitalize="none" /><TextInput style={[styles.input, styles.passwordInput]} value={password} onChangeText={setPassword} placeholder="관리자 비밀번호" secureTextEntry returnKeyType="done" onSubmitEditing={login} /><TouchableOpacity style={styles.loginButton} onPress={login} disabled={loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>로그인</Text>}</TouchableOpacity></View>
    </SafeAreaView>;
  }

  return <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
    <View style={styles.header}><TouchableOpacity style={styles.iconButton} onPress={() => router.back()}><FontAwesome6 name="chevron-left" size={20} color="#111827" /></TouchableOpacity><Text style={styles.headerTitle}>신고 관리</Text><TouchableOpacity style={styles.iconButton} onPress={logout}><FontAwesome6 name="right-from-bracket" size={18} color="#64748B" /></TouchableOpacity></View>
    <View style={styles.tabs}>{["PENDING", "RESOLVED", "ALL"].map((item) => <TouchableOpacity key={item} style={[styles.tab, status === item && styles.activeTab]} onPress={() => setStatus(item)}><Text style={[styles.tabText, status === item && styles.activeTabText]}>{item === "PENDING" ? "처리 대기" : item === "RESOLVED" ? "처리 완료" : "전체"}</Text></TouchableOpacity>)}</View>
    {loading ? <ActivityIndicator style={styles.loader} size="large" color="#EF4444" /> : <FlatList data={reports} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} ListEmptyComponent={<View style={styles.empty}><FontAwesome6 name="circle-check" size={30} color="#94A3B8" /><Text style={styles.emptyText}>해당 신고가 없습니다</Text></View>} renderItem={({ item }) => <View style={styles.card}><View style={styles.cardHeader}><Text style={styles.typeBadge}>{item.targetType === "POST" ? "게시글" : "댓글"}</Text><Text style={styles.date}>{item.createdAt?.replace("T", " ").slice(0, 16)}</Text></View><Text style={styles.reason}>신고 사유: {item.reason}</Text><Text style={styles.title}>{item.targetTitle || "삭제된 내용"}</Text><Text style={styles.author}>{item.targetNickname || "작성자 정보 없음"}</Text><Text style={styles.content} numberOfLines={4}>{item.targetContent || "원문이 이미 삭제되었습니다."}</Text>{item.status === "PENDING" && <View style={styles.actions}><TouchableOpacity style={styles.resolveButton} onPress={() => resolveReport(item)}><Text style={styles.resolveText}>처리 완료</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => deleteContent(item)}><Text style={styles.deleteText}>원문 삭제</Text></TouchableOpacity></View>}</View>} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F6FB", paddingHorizontal: 18 },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  loginCard: { marginTop: 60, backgroundColor: "#FFFFFF", borderRadius: 22, padding: 22, alignItems: "center" },
  loginTitle: { fontSize: 21, fontWeight: "900", color: "#111827", marginTop: 12 },
  loginDescription: { fontSize: 13, color: "#64748B", marginTop: 7, marginBottom: 20 },
  input: { width: "100%", minHeight: 50, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 13, paddingHorizontal: 14, fontSize: 15 },
  passwordInput: { marginTop: 10 },
  loginButton: { width: "100%", minHeight: 50, backgroundColor: "#061A44", borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 12 },
  loginButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  tabs: { flexDirection: "row", gap: 8, marginVertical: 12 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center" },
  activeTab: { backgroundColor: "#061A44" },
  tabText: { color: "#64748B", fontSize: 13, fontWeight: "800" },
  activeTabText: { color: "#FFFFFF" },
  loader: { marginTop: 80 },
  list: { paddingBottom: 32 },
  empty: { alignItems: "center", gap: 10, paddingTop: 80 },
  emptyText: { color: "#64748B", fontWeight: "700" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  typeBadge: { color: "#DC2626", backgroundColor: "#FFF1F1", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, fontSize: 12, fontWeight: "900" },
  date: { color: "#94A3B8", fontSize: 11 },
  reason: { color: "#B45309", fontSize: 13, fontWeight: "800", marginBottom: 10 },
  title: { color: "#111827", fontSize: 16, fontWeight: "900" },
  author: { color: "#64748B", fontSize: 12, marginTop: 4 },
  content: { color: "#475569", fontSize: 13, lineHeight: 19, marginTop: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  resolveButton: { flex: 1, backgroundColor: "#E2E8F0", borderRadius: 11, paddingVertical: 11, alignItems: "center" },
  resolveText: { color: "#334155", fontSize: 13, fontWeight: "900" },
  deleteButton: { flex: 1, backgroundColor: "#DC2626", borderRadius: 11, paddingVertical: 11, alignItems: "center" },
  deleteText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
