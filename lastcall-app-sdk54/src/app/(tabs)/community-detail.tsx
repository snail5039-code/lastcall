import { useLocalSearchParams } from "expo-router";
import { goBack } from "../../services/navigation";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
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
import { apiUrl } from "../../config/api";
import { LEGAL_PAGE_URL } from "../../config/legal";
import { clearAdminToken, getAdminToken } from "../../services/admin-auth";
import { getHiddenAuthors, hideCommunityAuthor, hideCommunityPost } from "../../services/community-moderation";
import { Radius, ThemeColors, useThemeColors, useThemeStyles, Tap } from "../../constants/design";

type CommunityPost = {
    id: number;
    boardType: string;
    nickname: string;
    title: string;
    content: string;
    viewCount: number;
    createdAt?: string;
};

type CommunityComment = {
    id: number;
    postId: number;
    nickname: string;
    content: string;
    isAdmin: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export default function CommunityDetailScreen() {
  const Colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
    const params = useLocalSearchParams();

    const id =
        typeof params.id === "string"
            ? params.id
            : "";

    const [post, setPost] = useState<CommunityPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editPassword, setEditPassword] = useState("");

    const [isDeleting, setIsDeleting] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [adminToken, setAdminToken] = useState("");

    const [commentNickname, setCommentNickname] = useState("");
    const [commentPassword, setCommentPassword] = useState("");
    const [commentContent, setCommentContent] = useState("");
    const [commentPolicyAccepted, setCommentPolicyAccepted] = useState(false);
    const [hiddenAuthors, setHiddenAuthors] = useState<string[]>([]);

    const [comments, setComments] = useState<CommunityComment[]>([]);

    const [editingCommentId, setEditingCommentId] =
        useState<number | null>(null);

    const [editingCommentContent, setEditingCommentContent] =
        useState("");

    const [editingCommentPassword, setEditingCommentPassword] =
        useState("");

    const [deletingCommentId, setDeletingCommentId] =
        useState<number | null>(null);

    const [deletingCommentPassword, setDeletingCommentPassword] =
        useState("");

    const submitReport = async (targetType: "POST" | "COMMENT", targetId: number, reason: string) => {
        try {
            const response = await fetch(apiUrl("/community/report"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetType, targetId, reason }),
            });
            if (!response.ok) throw new Error(`신고 실패: ${response.status}`);
            Alert.alert("신고 접수", "관리자 검토 목록에 전달되었습니다.");
        } catch (error) {
            console.error("신고 접수 실패:", error);
            Alert.alert("신고 실패", "잠시 후 다시 시도해주세요.");
        }
    };

    const openReport = (targetType: "POST" | "COMMENT", targetId: number) => {
        Alert.alert("신고 사유 선택", "관리자에게만 전달됩니다.", [
            { text: "욕설·비방", onPress: () => submitReport(targetType, targetId, "욕설·비방") },
            { text: "광고·도배", onPress: () => submitReport(targetType, targetId, "광고·도배") },
            { text: "부적절한 내용", onPress: () => submitReport(targetType, targetId, "부적절한 내용") },
            { text: "취소", style: "cancel" },
        ]);
    };

    const hidePost = () => {
        Alert.alert("게시글 숨기기", "이 기기에서 해당 게시글을 숨길까요?", [
            { text: "취소", style: "cancel" },
            {
                text: "숨기기",
                onPress: () => {
                    void hideCommunityPost(Number(id)).then(() => goBack());
                },
            },
        ]);
    };

    const hideAuthor = (nickname: string) => {
        Alert.alert(
            "작성자 숨기기",
            `'${nickname}' 닉네임의 게시글과 댓글을 이 기기에서 숨길까요? 같은 닉네임을 다른 사람이 사용할 수도 있습니다.`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "숨기기",
                    onPress: () => {
                        void hideCommunityAuthor(nickname).then(() => {
                            setHiddenAuthors((current) => current.includes(nickname) ? current : [...current, nickname]);
                            if (post?.nickname === nickname) goBack();
                        });
                    },
                },
            ],
        );
    };

    const fetchPostDetail = useCallback(async () => {
        try {
            setIsLoading(true);
            setErrorMessage("");

            const response = await fetch(
                apiUrl(`/community/post/${id}`)
            );

            if (!response.ok) {
                throw new Error(`서버 응답 오류: ${response.status}`);
            }

            const data: CommunityPost = await response.json();

            setPost(data);
        } catch (error) {
            console.error("게시글 상세 조회 실패:", error);
            setErrorMessage("게시글을 불러오지 못했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void getHiddenAuthors().then(setHiddenAuthors);
    }, []);
    const startEditing = () => {
        setEditTitle(post?.title ?? "");
        setEditContent(post?.content ?? "");
        setEditPassword("");
        setIsEditing(true);
    };

    const updatePost = async () => {
        if (!editTitle.trim()) {
            Alert.alert("알림", "제목을 입력해주세요.");
            return;
        }

        if (!editContent.trim()) {
            Alert.alert("알림", "내용을 입력해주세요.");
            return;
        }

        if (!editPassword.trim()) {
            Alert.alert("알림", "게시글 비밀번호를 입력해주세요.");
            return;
        }

        try {
            const response = await fetch(
                apiUrl(`/community/post/${id}`),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: editTitle,
                        content: editContent,
                        password: editPassword,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`수정 실패: ${response.status}`);
            }

            const result = await response.json();

            if (result === -1) {
                Alert.alert("수정 실패", "비밀번호가 일치하지 않습니다.");
                return;
            }

            if (result === 0) {
                Alert.alert("수정 실패", "게시글을 찾을 수 없습니다.");
                return;
            }

            setPost((prevPost) => {
                if (!prevPost) {
                    return prevPost;
                }

                return {
                    ...prevPost,
                    title: editTitle,
                    content: editContent,
                };
            });

            setIsEditing(false);
            setEditPassword("");

            Alert.alert("수정 완료", "게시글이 수정되었습니다.");
        } catch (error) {
            console.error("게시글 수정 실패:", error);
            Alert.alert(
                "수정 실패",
                "비밀번호가 틀렸거나 게시글 수정에 실패했습니다."
            );
        }
    };

    const deletePost = async () => {
        if (!adminToken && !deletePassword.trim()) {
            Alert.alert("알림", "게시글 비밀번호를 입력해주세요.");
            return;
        }

        try {
            const response = await fetch(
                adminToken
                    ? apiUrl(`/community/admin/posts/${id}`)
                    : apiUrl(`/community/post/${id}`),
                {
                    method: "DELETE",
                    headers: adminToken
                        ? { Authorization: `Bearer ${adminToken}` }
                        : { "Content-Type": "application/json" },
                    ...(!adminToken && {
                        body: JSON.stringify({ password: deletePassword }),
                    }),
                }
            );

            if (response.status === 401 && adminToken) {
                await clearAdminToken();
                setAdminToken("");
                Alert.alert("관리자 로그인 만료", "다시 관리자 로그인을 해주세요.");
                return;
            }

            if (!response.ok) {
                throw new Error(`삭제 실패: ${response.status}`);
            }

            const result = await response.json();

            if (result === -1) {
                Alert.alert("삭제 실패", "비밀번호가 일치하지 않습니다.");
                return;
            }

            if (result === 0) {
                Alert.alert("삭제 실패", "게시글을 찾을 수 없습니다.");
                return;
            }

            Alert.alert(
                "삭제 완료",
                "게시글이 삭제되었습니다.",
                [
                    {
                        text: "확인",
                        onPress: () => goBack(),
                    },
                ]
            );
        } catch (error) {
            console.error("게시글 삭제 실패:", error);
            Alert.alert("삭제 실패", "게시글 삭제 중 오류가 발생했습니다.");
        }
    };

    const requestPostDelete = () => {
        if (!adminToken) {
            setDeletePassword("");
            setIsDeleting(true);
            return;
        }
        Alert.alert("관리자 권한으로 삭제", "이 게시글을 비밀번호 없이 삭제할까요?", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => void deletePost() },
        ]);
    };

    const fetchComments = useCallback(async () => {
        try {
            const response = await fetch(
                apiUrl(`/community/post/${id}/comments`)
            );

            if (!response.ok) {
                throw new Error(`댓글 조회 실패: ${response.status}`);
            }

            const data: CommunityComment[] = await response.json();

            setComments(data);
        } catch (error) {
            console.error("댓글 목록 조회 실패:", error);
        }
    }, [id]);

    useEffect(() => {
        void getAdminToken().then((saved) => setAdminToken(saved ?? ""));
        if (id) {
            void fetchPostDetail();
            void fetchComments();
        }
    }, [fetchComments, fetchPostDetail, id]);

    const insertComment = async () => {
        if (!commentNickname.trim()) {
            Alert.alert("알림", "닉네임을 입력해주세요.");
            return;
        }

        if (!commentPassword.trim()) {
            Alert.alert("알림", "비밀번호를 입력해주세요.");
            return;
        }

        if (!commentContent.trim()) {
            Alert.alert("알림", "댓글 내용을 입력해주세요.");
            return;
        }
        if (!commentPolicyAccepted) {
            Alert.alert("운영정책 동의 필요", "댓글을 등록하려면 커뮤니티 운영정책에 동의해주세요.");
            return;
        }

        try {
            const response = await fetch(
                apiUrl("/community/comment"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        postId: Number(id),
                        nickname: commentNickname,
                        password: commentPassword,
                        content: commentContent,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`댓글 등록 실패: ${response.status}`);
            }

            const result = await response.json();

            if (result !== 1) {
                Alert.alert("등록 실패", "댓글 등록에 실패했습니다.");
                return;
            }

            setCommentNickname("");
            setCommentPassword("");
            setCommentContent("");
            setCommentPolicyAccepted(false);

            await fetchComments();
            Alert.alert("등록 완료", "댓글이 등록되었습니다.");
        } catch (error) {
            console.error("댓글 등록 실패:", error);
            Alert.alert("등록 실패", "댓글 등록 중 오류가 발생했습니다.");
        }
    };

    const updateComment = async () => {
        if (editingCommentId === null) {
            return;
        }

        if (!editingCommentContent.trim()) {
            Alert.alert("알림", "댓글 내용을 입력해주세요.");
            return;
        }

        if (!editingCommentPassword.trim()) {
            Alert.alert("알림", "댓글 비밀번호를 입력해주세요.");
            return;
        }

        try {
            const response = await fetch(
                apiUrl(`/community/comment/${editingCommentId}`),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        content: editingCommentContent,
                        password: editingCommentPassword,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `댓글 수정 실패: ${response.status}`
                );
            }

            const result = await response.json();

            if (result === -1) {
                Alert.alert(
                    "수정 실패",
                    "비밀번호가 일치하지 않습니다."
                );
                return;
            }

            if (result === 0) {
                Alert.alert(
                    "수정 실패",
                    "댓글을 찾을 수 없습니다."
                );
                return;
            }

            setEditingCommentId(null);
            setEditingCommentContent("");
            setEditingCommentPassword("");

            await fetchComments();

            Alert.alert(
                "수정 완료",
                "댓글이 수정되었습니다."
            );
        } catch (error) {
            console.error("댓글 수정 실패:", error);

            Alert.alert(
                "수정 실패",
                "댓글 수정 중 오류가 발생했습니다."
            );
        }
    };


    const deleteComment = async () => {
        if (deletingCommentId === null) {
            return;
        }

        if (!deletingCommentPassword.trim()) {
            Alert.alert("알림", "댓글 비밀번호를 입력해주세요.");
            return;
        }

        try {
            const response = await fetch(
                apiUrl(`/community/comment/${deletingCommentId}`),
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ password: deletingCommentPassword }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `댓글 삭제 실패: ${response.status}`
                );
            }

            const result = await response.json();

            if (result === -1) {
                Alert.alert(
                    "삭제 실패",
                    "비밀번호가 일치하지 않습니다."
                );
                return;
            }

            if (result === 0) {
                Alert.alert(
                    "삭제 실패",
                    "댓글을 찾을 수 없습니다."
                );
                return;
            }

            setDeletingCommentId(null);
            setDeletingCommentPassword("");

            await fetchComments();

            Alert.alert(
                "삭제 완료",
                "댓글이 삭제되었습니다."
            );
        } catch (error) {
            console.error("댓글 삭제 실패:", error);

            Alert.alert(
                "삭제 실패",
                "댓글 삭제 중 오류가 발생했습니다."
            );
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" />

                <Text style={styles.loadingText}>
                    게시글을 불러오는 중입니다.
                </Text>
            </SafeAreaView>
        );
    }

    if (errorMessage || !post) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <Text style={styles.errorText}>
                    {errorMessage || "게시글이 없습니다."}
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => goBack()}
                        accessibilityRole="button"
                        accessibilityLabel="뒤로 가기"
                      >
                        <FontAwesome6 name="chevron-left" size={20} color={Colors.text} />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>
                        게시글 상세
                    </Text>

                    <View style={styles.rightSpacer} />
                </View>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.postContainer}>
                        {isEditing ? (
                            <TextInput
                                style={styles.titleInput}
                                value={editTitle}
                                onChangeText={setEditTitle}
                                placeholder="제목을 입력하세요."
                            />
                        ) : (
                            <Text style={styles.title}>
                                {post.title}
                            </Text>
                        )}

                        <View style={styles.metaRow}>
                            <Text style={styles.metaText}>
                                {post.nickname}
                                {post.createdAt
                                    ? ` · ${post.createdAt.slice(0, 10)}`
                                    : ""}
                            </Text>

                            <Text style={styles.metaText}>
                                조회 {post.viewCount}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.contentLabel}>
                            내용
                        </Text>

                        {isEditing ? (
                            <>
                                <TextInput
                                    style={styles.contentInput}
                                    value={editContent}
                                    onChangeText={setEditContent}
                                    placeholder="내용을 입력하세요."
                                    multiline
                                    textAlignVertical="top"
                                />

                                <TextInput
                                    style={styles.passwordInput}
                                    value={editPassword}
                                    onChangeText={setEditPassword}
                                    placeholder="게시글 비밀번호"
                                    secureTextEntry
                                />
                            </>
                        ) : (
                            <Text style={styles.content}>
                                {post.content}
                            </Text>
                        )}
                        <View style={styles.actionRow}>
                            {isEditing ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => {
                                            setIsEditing(false);
                                            setEditPassword("");
                                        }}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.cancelButtonText}>
                                            취소
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={updatePost}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.saveButtonText}>
                                            저장
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={startEditing}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.editButtonText}>
                                            수정
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={requestPostDelete}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.deleteButtonText}>
                                            삭제
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => openReport("POST", Number(id))} accessibilityRole="button">
                                        <Text style={styles.reportText}>신고</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={hidePost} accessibilityRole="button">
                                        <Text style={styles.hideText}>게시글 숨김</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => hideAuthor(post.nickname)} accessibilityRole="button">
                                        <Text style={styles.hideText}>작성자 숨김</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {isDeleting && !adminToken ? (
                            <View style={styles.deleteConfirmBox}>
                                <TextInput
                                    style={styles.deletePasswordInput}
                                    value={deletePassword}
                                    onChangeText={setDeletePassword}
                                    placeholder="게시글 비밀번호"
                                    secureTextEntry
                                />

                                <View style={styles.deleteConfirmRow}>
                                    <TouchableOpacity
                                        style={styles.deleteCancelButton}
                                        onPress={() => {
                                            setIsDeleting(false);
                                            setDeletePassword("");
                                        }}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.deleteCancelButtonText}>
                                            취소
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.deleteConfirmButton}
                                        onPress={deletePost}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.deleteConfirmButtonText}>
                                            삭제 확인
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.commentListContainer}>
                        <Text style={styles.commentSectionTitle}>
                            댓글 {comments.filter((comment) => !hiddenAuthors.includes(comment.nickname)).length}
                        </Text>

                        {comments.filter((comment) => !hiddenAuthors.includes(comment.nickname)).length === 0 ? (
                            <Text style={styles.emptyCommentText}>
                                등록된 댓글이 없습니다.
                            </Text>
                        ) : (

                            comments.filter((comment) => !hiddenAuthors.includes(comment.nickname)).map((comment) => (
                                <View
                                    key={comment.id}
                                    style={styles.commentItem}
                                >
                                    <View style={styles.commentHeader}>
                                        <Text style={styles.commentNickname}>
                                            {comment.isAdmin
                                                ? "관리자"
                                                : comment.nickname}
                                        </Text>

                                        <Text style={styles.commentDate}>
                                            {comment.createdAt
                                                ? comment.createdAt.slice(0, 10)
                                                : ""}
                                        </Text>
                                    </View>

                                    {editingCommentId === comment.id ? (
                                        <>
                                            <TextInput
                                                style={styles.commentEditInput}
                                                value={editingCommentContent}
                                                onChangeText={setEditingCommentContent}
                                                multiline
                                                textAlignVertical="top"
                                            />

                                            <TextInput
                                                style={styles.commentEditPasswordInput}
                                                value={editingCommentPassword}
                                                onChangeText={setEditingCommentPassword}
                                                placeholder="댓글 비밀번호"
                                                secureTextEntry
                                            />

                                            <View style={styles.commentActionRow}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setEditingCommentId(null);
                                                        setEditingCommentPassword("");
                                                    }}
                                                    accessibilityRole="button"
                                                >
                                                    <Text style={styles.commentEditText}>
                                                        취소
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={updateComment}
                                                    accessibilityRole="button"
                                                >
                                                    <Text style={styles.commentSaveText}>
                                                        저장
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.commentContent}>
                                                {comment.content}
                                            </Text>

                                            <View style={styles.commentActionRow}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setEditingCommentId(comment.id);
                                                        setEditingCommentContent(
                                                            comment.content
                                                        );
                                                        setEditingCommentPassword("");

                                                        setDeletingCommentId(null);
                                                    }}
                                                    accessibilityRole="button"
                                                >
                                                    <Text style={styles.commentEditText}>
                                                        수정
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setDeletingCommentId(comment.id);
                                                        setDeletingCommentPassword("");

                                                        setEditingCommentId(null);
                                                    }}
                                                    accessibilityRole="button"
                                                >
                                                    <Text style={styles.commentDeleteText}>
                                                        삭제
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => openReport("COMMENT", comment.id)} accessibilityRole="button">
                                                    <Text style={styles.reportText}>신고</Text>
                                                </TouchableOpacity>
                                                {!comment.isAdmin && (
                                                    <TouchableOpacity onPress={() => hideAuthor(comment.nickname)} accessibilityRole="button">
                                                        <Text style={styles.hideText}>작성자 숨김</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </>
                                    )}

                                    {deletingCommentId === comment.id ? (
                                        <View style={styles.commentDeleteBox}>
                                            <TextInput
                                                style={styles.commentEditPasswordInput}
                                                value={deletingCommentPassword}
                                                onChangeText={setDeletingCommentPassword}
                                                placeholder="댓글 비밀번호"
                                                secureTextEntry
                                            />

                                            <View style={styles.commentActionRow}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setDeletingCommentId(null);
                                                        setDeletingCommentPassword("");
                                                    }}
                                                    accessibilityRole="button"
                                                >
                                                    <Text style={styles.commentEditText}>
                                                        취소
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={deleteComment}
                                                    accessibilityRole="button"
                                                >
                                                    <Text style={styles.commentDeleteText}>
                                                        삭제 확인
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : null}
                                </View>
                            ))
                        )}
                    </View>

                    <View style={styles.commentWriteContainer}>
                        <Text style={styles.commentSectionTitle}>
                            댓글 작성
                        </Text>

                        <View style={styles.commentInputRow}>
                            <TextInput
                                style={styles.commentNicknameInput}
                                value={commentNickname}
                                onChangeText={setCommentNickname}
                                placeholder="닉네임"
                            />

                            <TextInput
                                style={styles.commentPasswordInput}
                                value={commentPassword}
                                onChangeText={setCommentPassword}
                                placeholder="비밀번호"
                                secureTextEntry
                            />
                        </View>

                        <TextInput
                            style={styles.commentContentInput}
                            value={commentContent}
                            onChangeText={setCommentContent}
                            placeholder="댓글을 입력하세요."
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.commentPolicy, commentPolicyAccepted && styles.commentPolicyAccepted]}
                            onPress={() => setCommentPolicyAccepted((current) => !current)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: commentPolicyAccepted }}
                        >
                            <FontAwesome6
                                name={commentPolicyAccepted ? "square-check" : "square"}
                                size={18}
                                color={commentPolicyAccepted ? Colors.ok : Colors.textMuted}
                            />
                            <Text style={styles.commentPolicyText}>커뮤니티 운영정책을 지키며 개인정보·욕설·허위 의료정보를 게시하지 않습니다.</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.policyLink}
                            onPress={() => void Linking.openURL(`${LEGAL_PAGE_URL}#community`)}
                            accessibilityRole="link"
                        >
                            <Text style={styles.policyLinkText}>운영정책 전문 보기</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.commentSubmitButton, !commentPolicyAccepted && styles.commentSubmitButtonDisabled]}
                            onPress={insertComment}
                            accessibilityRole="button"
                        >
                            <Text style={styles.commentSubmitButtonText}>
                                댓글 등록
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
const createStyles = (Colors: ThemeColors) => StyleSheet.create({
    reportText: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },
    hideText: { color: Colors.textSub, fontSize: 13, fontWeight: "700" },
    commentPolicy: { flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: Radius.control, backgroundColor: Colors.surfaceSunken, marginTop: 12 },
    commentPolicyAccepted: { borderColor: Colors.ok, backgroundColor: Colors.okBg },
    commentPolicyText: { flex: 1, color: Colors.textSub, fontSize: 12, lineHeight: 18, fontWeight: "600" },
    policyLink: { minHeight: Tap.min, justifyContent: "center" },
    policyLinkText: { color: Colors.navySoft, fontSize: 12, fontWeight: "800", textDecorationLine: "underline" },
    commentSubmitButtonDisabled: { backgroundColor: Colors.textFaint },
    container: {
        flex: 1,
        backgroundColor: Colors.surfaceSunken,
        paddingTop: 20,
    },

    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.surfaceSunken,
    },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 16,
    },

    backButton: {
        width: 54,
        height: Tap.min,
        justifyContent: "center",
        alignItems: "flex-start",
    },

    backButtonText: {
        fontSize: 28,
        color: Colors.text,
    },

    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: 22,
        fontWeight: "700",
        color: Colors.text,
    },

    rightSpacer: {
        width: 54,
        height: 40,
    },

    postContainer: {
        marginHorizontal: 16,
        backgroundColor: Colors.surface,
        padding: 20,
        borderRadius: Radius.card,
    },

    title: {
        fontSize: 22,
        fontWeight: "700",
        color: Colors.text,
    },

    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },

    metaText: {
        fontSize: 13,
        color: Colors.textMuted,
    },

    createdAt: {
        marginTop: 6,
        fontSize: 12,
        color: Colors.textFaint,
    },

    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 18,
    },

    content: {
        fontSize: 16,
        lineHeight: 25,
        color: Colors.textSub,
    },

    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.textMuted,
    },

    errorText: {
        fontSize: 15,
        color: Colors.urgent,
    },

    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
    },

    label: {
        width: 70,
        fontSize: 14,
        fontWeight: "700",
        color: Colors.textSub,
    },

    titleValue: {
        flex: 1,
        fontSize: 18,
        fontWeight: "700",
        color: Colors.text,
    },

    infoValue: {
        flex: 1,
        fontSize: 14,
        color: Colors.textSub,
    },

    contentLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: Colors.textSub,
        marginBottom: 12,
    },

    actionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 24,
    },

    editButton: {
        width: 72,
        height: Tap.min,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: Radius.control,
        borderWidth: 1,
        borderColor: Colors.navy,
    },

    editButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.navy,
    },

    deleteButton: {
        width: 72,
        height: Tap.min,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: Radius.control,
        borderWidth: 1,
        borderColor: Colors.urgent,
    },

    deleteButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.urgent,
    },
    titleInput: {
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 18,
        fontWeight: "700",
        color: Colors.text,
    },

    contentInput: {
        minHeight: 180,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        padding: 12,
        fontSize: 16,
        lineHeight: 25,
        color: Colors.textSub,
    },

    passwordInput: {
        height: 44,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        paddingHorizontal: 12,
        marginTop: 12,
        fontSize: 14,
        color: Colors.text,
    },

    cancelButton: {
        width: 72,
        height: Tap.min,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: Radius.control,
        borderWidth: 1,
        borderColor: Colors.textFaint,
    },

    cancelButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.textMuted,
    },

    saveButton: {
        width: 72,
        height: Tap.min,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: Radius.control,
        backgroundColor: Colors.navy,
    },

    saveButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.onDark,
    },

    keyboardContainer: {
        flex: 1,
    },

    scrollContent: {
        paddingBottom: 40,
    },

    deleteConfirmBox: {
        marginTop: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.control,
        backgroundColor: Colors.surfaceSunken,
    },

    deletePasswordInput: {
        height: 44,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        paddingHorizontal: 12,
        fontSize: 14,
        color: Colors.text,
        backgroundColor: Colors.surface,
    },

    deleteConfirmRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 12,
    },

    deleteCancelButton: {
        width: 72,
        height: Tap.min,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: Radius.control,
        borderWidth: 1,
        borderColor: Colors.textFaint,
    },

    deleteCancelButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.textMuted,
    },

    deleteConfirmButton: {
        width: 92,
        height: Tap.min,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: Radius.control,
        backgroundColor: Colors.urgentFill,
    },

    deleteConfirmButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.onDark,
    },

    commentWriteContainer: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        backgroundColor: Colors.surface,
        borderRadius: Radius.card,
    },

    commentSectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: Colors.text,
        marginBottom: 12,
    },

    commentInputRow: {
        flexDirection: "row",
        gap: 10,
    },

    commentNicknameInput: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        paddingHorizontal: 12,
        fontSize: 14,
        color: Colors.text,
    },

    commentPasswordInput: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        paddingHorizontal: 12,
        fontSize: 14,
        color: Colors.text,
    },

    commentContentInput: {
        minHeight: 90,
        marginTop: 10,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        padding: 12,
        fontSize: 14,
        lineHeight: 21,
        color: Colors.text,
    },

    commentSubmitButton: {
        alignSelf: "flex-end",
        minWidth: 90,
        height: Tap.min,
        marginTop: 12,
        paddingHorizontal: 14,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.navy,
        borderRadius: Radius.control,
    },

    commentSubmitButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.onDark,
    },

    commentListContainer: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        backgroundColor: Colors.surface,
        borderRadius: Radius.card,
    },

    emptyCommentText: {
        paddingVertical: 20,
        textAlign: "center",
        fontSize: 14,
        color: Colors.textFaint,
    },

    commentItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },

    commentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    commentNickname: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.text,
    },

    commentDate: {
        fontSize: 12,
        color: Colors.textFaint,
    },

    commentContent: {
        marginTop: 10,
        fontSize: 14,
        lineHeight: 21,
        color: Colors.textSub,
    },

    commentActionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 10,
    },

    commentEditText: {
        fontSize: 12,
        color: Colors.textSub,
    },

    commentDeleteText: {
        fontSize: 12,
        color: Colors.urgent,
    },

    commentEditInput: {
        minHeight: 80,
        marginTop: 10,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        padding: 10,
        fontSize: 14,
        color: Colors.text,
    },

    commentEditPasswordInput: {
        height: 42,
        marginTop: 10,
        borderWidth: 1,
        borderColor: Colors.borderStrong,
        borderRadius: Radius.control,
        paddingHorizontal: 10,
        fontSize: 14,
        color: Colors.text,
    },

    commentSaveText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.navy,
    },

    commentDeleteBox: {
        marginTop: 10,
        padding: 10,
        backgroundColor: Colors.surfaceSunken,
        borderRadius: Radius.control,
    },
});
