import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InitialConsent } from "../components/initial-consent";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <InitialConsent>
        {/* 모든 화면이 (tabs) 안에 있어 어디로 이동해도 하단 탭이 유지된다. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </InitialConsent>
    </SafeAreaProvider>
  );
}
