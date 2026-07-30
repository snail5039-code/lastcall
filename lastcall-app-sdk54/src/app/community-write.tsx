import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUrl } from "../config/api";
import { LEGAL_PAGE_URL } from "../config/legal";
import { saveAuthoredPost } from "../services/community-notifications";
import { fetchWithRetry } from "../services/http";

export default function CommunityWriteScreen() {
    const params = useLocalSearchParams();

    const boardType =
        typeof params.boardType === "string"
            ? params.boardType
            : "FREE";

    const [nickname, setNickname] = useState("");
    const [password, setPassword] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [policyAccepted, setPolicyAccepted] = useState(false);

    const getBoardTitle = () => {
        switch (boardType) {
            case "FREE":
                return "자유게시판 글쓰기";

            case "SUGGESTION":
                return "건의사항 작성";

            case "QNA":
                return "Q&A 작성";

            default:
                return "글쓰기";
        }
    };
    const handleSubmit = async () => {
        if (!nickname.trim()) {
            Alert.alert("알림", "닉네임을 입력해주세요.");
            return;
        }

        if (!password.trim()) {
            Alert.alert("알림", "비밀번호를 입력해주세요.");
            return;
        }

        if (!title.trim()) {
            Alert.alert("알림", "제목을 입력해주세요.");
            return;
        }

        if (!content.trim()) {
            Alert.alert("알림", "내용을 입력해주세요.");
            return;
        }
        if (!policyAccepted) {
            Alert.alert("운영정책 동의 필요", "게시물을 작성하려면 커뮤니티 운영정책에 동의해주세요.");
            return;
        }

        try {
            const response = await fetchWithRetry(
                apiUrl("/community/post"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        boardType,
                        nickname: nickname.trim(),
                        password,
                        title: title.trim(),
                        content: content.trim(),
                    }),
                },
                1,
            );

            const responseText = await response.text();

            console.log("게시글 등록 응답 상태:", response.status);
            console.log("게시글 등록 응답 내용:", responseText);

            if (!response.ok) {
                throw new Error(
                    `게시글 등록 실패: ${response.status} / ${responseText}`
                );
            }

            const result = Number(responseText);

            console.log("게시글 등록 결과:", result);

            if (!Number.isInteger(result) || result <= 0) {
                throw new Error("생성된 게시글 번호를 받지 못했습니다.");
            }

            await saveAuthoredPost({
                id: result,
                title: title.trim(),
                boardType,
                createdAt: new Date().toISOString(),
            });

            Alert.alert("완료", "게시글이 등록되었습니다.", [
                {
                    text: "확인",
                    onPress: () => router.back(),
                },
            ]);
        } catch (error) {
            console.error("게시글 등록 실패:", error);
            Alert.alert("오류", "게시글 등록에 실패했습니다.");
        }
    };

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

                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>닉네임</Text>

                        <TextInput
                            style={styles.input}
                            value={nickname}
                            onChangeText={setNickname}
                            placeholder="닉네임을 입력해주세요"
                            maxLength={30}
                        />

                        <Text style={styles.label}>비밀번호</Text>

                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="수정 및 삭제에 사용할 비밀번호"
                            secureTextEntry
                            maxLength={30}
                        />

                        <Text style={styles.label}>제목</Text>

                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="제목을 입력해주세요"
                            maxLength={100}
                        />

                        <Text style={styles.label}>내용</Text>

                        <TextInput
                            style={[styles.input, styles.contentInput]}
                            value={content}
                            onChangeText={setContent}
                            placeholder="내용을 입력해주세요"
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.policyConsent, policyAccepted && styles.policyConsentAccepted]}
                            onPress={() => setPolicyAccepted((current) => !current)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: policyAccepted }}
                        >
                            <FontAwesome6
                                name={policyAccepted ? "square-check" : "square"}
                                size={20}
                                color={policyAccepted ? "#15803D" : "#64748B"}
                            />
                            <Text style={styles.policyConsentText}>
                                개인정보 노출, 욕설·혐오, 불법·허위 의료정보를 게시하지 않으며 커뮤니티 운영정책에 동의합니다.
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.policyLink}
                            onPress={() => void Linking.openURL(`${LEGAL_PAGE_URL}#community`)}
                            accessibilityRole="link"
                        >
                            <Text style={styles.policyLinkText}>커뮤니티 운영정책 전문 보기</Text>
                            <FontAwesome6 name="arrow-up-right-from-square" size={12} color="#1D4ED8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.submitButton, !policyAccepted && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitButtonText}>
                                작성하기
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F7FA",
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    formContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 18,
    },

    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 8,
    },

    input: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        color: "#111827",
        marginBottom: 18,
        backgroundColor: "#FFFFFF",
    },

    contentInput: {
        minHeight: 180,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
    },

    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },

    backButtonText: {
        fontSize: 28,
        color: "#111827",
    },

    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },

    headerSpacer: {
        width: 40,
    },

    submitButton: {
        backgroundColor: "#061A44",
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 4,
    },
    submitButtonDisabled: {
        backgroundColor: "#94A3B8",
    },
    policyConsent: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 12,
        padding: 13,
        backgroundColor: "#F8FAFC",
    },
    policyConsentAccepted: {
        borderColor: "#86EFAC",
        backgroundColor: "#F0FDF4",
    },
    policyConsentText: {
        flex: 1,
        color: "#334155",
        fontSize: 13,
        lineHeight: 19,
        fontWeight: "600",
    },
    policyLink: {
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    policyLinkText: {
        color: "#1D4ED8",
        fontSize: 13,
        fontWeight: "800",
        textDecorationLine: "underline",
    },

    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
    },

    keyboardContainer: {
        flex: 1,
    },

    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
});
