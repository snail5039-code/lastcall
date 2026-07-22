import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InitialConsent } from "../components/initial-consent";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <InitialConsent>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="hospitals" />
          <Stack.Screen name="hospital-detail" />
          <Stack.Screen name="admin-reports" />
          <Stack.Screen name="filter" />
          <Stack.Screen name="emergency-help" />
          <Stack.Screen name="community-board" />
          <Stack.Screen name="community-write" />
        </Stack>
      </InitialConsent>
    </SafeAreaProvider>
  );
}
