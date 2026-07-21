import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="hospitals" />
        <Stack.Screen name="hospital-detail" />
        <Stack.Screen name="filter" />
        <Stack.Screen name="emergency-help" />
        <Stack.Screen name="community-board" />
        <Stack.Screen name="community-write" />
      </Stack>
    </SafeAreaProvider>
  );
}