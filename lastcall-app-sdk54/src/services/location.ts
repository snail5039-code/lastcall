import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Alert } from "react-native";

export type CurrentLocation = {
  latitude: number;
  longitude: number;
  stage1: string;
  stage2: string;
  addressText: string;
};

let cachedLocation: CurrentLocation | null = null;
const LOCATION_CONSENT_KEY = "lastcall.locationConsent";

export async function setLocationConsent(accepted: boolean) {
  await AsyncStorage.setItem(LOCATION_CONSENT_KEY, accepted ? "accepted" : "declined");
  if (!accepted) cachedLocation = null;
}

export async function hasLocationConsent() {
  return (await AsyncStorage.getItem(LOCATION_CONSENT_KEY)) === "accepted";
}

async function requestLocationConsent() {
  if (await hasLocationConsent()) return true;

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      "현재 위치 사용 동의",
      "가까운 응급실 검색, 거리 계산과 지도 표시를 위해 현재 좌표를 서비스 서버로 전송합니다. 좌표는 응답 처리 후 별도 데이터베이스에 저장하지 않습니다. 동의하지 않아도 지역을 직접 선택해 검색할 수 있습니다.",
      [
        { text: "동의하지 않음", style: "cancel", onPress: () => resolve(false) },
        {
          text: "동의하고 계속",
          onPress: () => {
            void setLocationConsent(true)
              .then(() => resolve(true))
              .catch(() => resolve(false));
          },
        },
      ],
      { cancelable: false },
    );
  });
}

export async function getCurrentLocationFast(): Promise<CurrentLocation> {
  if (cachedLocation) return cachedLocation;
  if (!(await requestLocationConsent())) throw new Error("LOCATION_CONSENT_DECLINED");

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("LOCATION_PERMISSION_DENIED");

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 2 * 60 * 1000,
    requiredAccuracy: 1000,
  });
  const position = lastKnown ?? await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const [address] = await Location.reverseGeocodeAsync(position.coords);
  const stage1 = address?.region ?? "";
  const stage2 = address?.district ?? address?.subregion ?? "";
  const addressText = [stage1, stage2, address?.street, address?.name].filter(Boolean).join(" ");

  cachedLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    stage1,
    stage2,
    addressText: addressText || "현재 위치 확인됨",
  };
  return cachedLocation;
}
