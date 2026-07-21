import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTHORED_POSTS_KEY = "lastcall.authored-posts";
const READ_COMMENT_IDS_KEY = "lastcall.read-comment-ids";

export type AuthoredPost = {
  id: number;
  title: string;
  boardType: string;
  createdAt: string;
};

export async function getAuthoredPosts(): Promise<AuthoredPost[]> {
  const stored = await AsyncStorage.getItem(AUTHORED_POSTS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as AuthoredPost[];
  } catch {
    return [];
  }
}

export async function saveAuthoredPost(post: AuthoredPost) {
  const posts = await getAuthoredPosts();
  const next = [post, ...posts.filter((item) => item.id !== post.id)].slice(0, 100);
  await AsyncStorage.setItem(AUTHORED_POSTS_KEY, JSON.stringify(next));
}

export async function getReadCommentIds(): Promise<number[]> {
  const stored = await AsyncStorage.getItem(READ_COMMENT_IDS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as number[];
  } catch {
    return [];
  }
}

export async function markCommentsRead(commentIds: number[]) {
  if (commentIds.length === 0) return;
  const current = await getReadCommentIds();
  const next = Array.from(new Set([...current, ...commentIds])).slice(-1000);
  await AsyncStorage.setItem(READ_COMMENT_IDS_KEY, JSON.stringify(next));
}
