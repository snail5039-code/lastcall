import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SECURE_KEY = "lastcall.medicalInfo.v1";

export async function loadMedicalInfo(): Promise<string | null> {
  if (typeof SecureStore.getItemAsync !== "function" || !(await SecureStore.isAvailableAsync())) return null;
  const secured = await SecureStore.getItemAsync(SECURE_KEY);
  if (secured) return secured;

  const legacyList = await AsyncStorage.getItem("myInfoList");
  const legacySingle = legacyList ? null : await AsyncStorage.getItem("myInfo");
  const legacy = legacyList ?? (legacySingle ? JSON.stringify([{ relation: "본인", ...JSON.parse(legacySingle) }]) : null);
  if (legacy) {
    await SecureStore.setItemAsync(SECURE_KEY, legacy, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.multiRemove(["myInfoList", "myInfo"]);
  }
  return legacy;
}

export async function saveMedicalInfo(value: string) {
  if (typeof SecureStore.setItemAsync !== "function" || !(await SecureStore.isAvailableAsync())) {
    throw new Error("이 기기에서는 보안 저장소를 사용할 수 없습니다.");
  }
  await SecureStore.setItemAsync(SECURE_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await AsyncStorage.multiRemove(["myInfoList", "myInfo"]);
}
