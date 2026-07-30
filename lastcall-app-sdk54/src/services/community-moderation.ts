import AsyncStorage from "@react-native-async-storage/async-storage";

const HIDDEN_POSTS_KEY = "lastcall.community.hiddenPosts";
const HIDDEN_AUTHORS_KEY = "lastcall.community.hiddenAuthors";

async function loadList(key: string): Promise<string[]> {
  try {
    const saved = await AsyncStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function addUnique(key: string, value: string) {
  const values = await loadList(key);
  if (values.includes(value)) return;
  await AsyncStorage.setItem(key, JSON.stringify([...values, value]));
}

export async function getHiddenPostIds() {
  return (await loadList(HIDDEN_POSTS_KEY))
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);
}

export async function getHiddenAuthors() {
  return loadList(HIDDEN_AUTHORS_KEY);
}

export async function hideCommunityPost(postId: number) {
  await addUnique(HIDDEN_POSTS_KEY, String(postId));
}

export async function hideCommunityAuthor(nickname: string) {
  const normalized = nickname.trim();
  if (normalized) await addUnique(HIDDEN_AUTHORS_KEY, normalized);
}

export async function getCommunityHiddenState() {
  const [postIds, authors] = await Promise.all([getHiddenPostIds(), getHiddenAuthors()]);
  return { postIds: new Set(postIds), authors: new Set(authors) };
}

export async function clearCommunityHiddenState() {
  await AsyncStorage.multiRemove([HIDDEN_POSTS_KEY, HIDDEN_AUTHORS_KEY]);
}
