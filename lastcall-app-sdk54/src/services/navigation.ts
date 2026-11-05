import { router } from "expo-router";
import { Alert, Linking } from "react-native";

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

/** 전화번호가 있으면 전화 앱을 열고, 없으면 안내한다. */
export function callPhone(phoneNumber?: string) {
  const number = phoneNumber?.trim();
  if (!number) {
    Alert.alert("전화번호 없음", "등록된 전화번호가 없습니다.");
    return;
  }
  void Linking.openURL(`tel:${number}`).catch(() => {
    Alert.alert("전화 연결 실패", "전화 앱을 열 수 없습니다.");
  });
}

type Destination = { name: string; latitude: number | string; longitude: number | string };

/** 지도 앱이 없을 때 대신 여는 웹 길찾기 주소. 카카오맵은 앱이 없어도 웹으로 열린다. */
function kakaoWebUrl({ name, latitude, longitude }: Destination) {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${latitude},${longitude}`;
}

async function openWithFallback(appUrl: string, destination: Destination) {
  try {
    await Linking.openURL(appUrl);
  } catch {
    // 앱이 설치돼 있지 않으면 웹 길찾기로 대신한다.
    try {
      await Linking.openURL(kakaoWebUrl(destination));
    } catch {
      Alert.alert("길찾기 실패", "지도 앱 또는 브라우저를 열 수 없습니다.");
    }
  }
}

/** 목적지까지 길찾기할 지도 앱을 고르게 한다. 네이버지도, 카카오맵, 티맵을 지원한다. */
export function openDirections(destination: Destination) {
  const { name, latitude, longitude } = destination;
  if (!Number(latitude) || !Number(longitude)) {
    Alert.alert("위치 정보 없음", "병원 위치 정보가 없습니다.");
    return;
  }

  const encodedName = encodeURIComponent(name);
  Alert.alert("길찾기", "사용할 지도 앱을 선택하세요.", [
    {
      text: "네이버지도",
      onPress: () =>
        void openWithFallback(
          `nmap://route/car?dlat=${latitude}&dlng=${longitude}&dname=${encodedName}&appname=com.snail5039.lastcall`,
          destination,
        ),
    },
    { text: "카카오맵", onPress: () => void openWithFallback(kakaoWebUrl(destination), destination) },
    {
      text: "티맵",
      onPress: () =>
        void openWithFallback(`tmap://route?goalname=${encodedName}&goalx=${longitude}&goaly=${latitude}`, destination),
    },
    { text: "취소", style: "cancel" },
  ]);
}
