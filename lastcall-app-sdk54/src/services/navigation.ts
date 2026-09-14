import { router } from "expo-router";

/**
 * 뒤로 가되, 돌아갈 곳이 없으면 홈으로 보낸다.
 *
 * 알림이나 링크로 화면을 바로 열면 이력이 비어 있어 router.back() 이 아무 일도
 * 하지 않는다. 사용자 눈에는 뒤로가기 버튼이 고장 난 것으로 보인다.
 */
export function goBack() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/");
}
