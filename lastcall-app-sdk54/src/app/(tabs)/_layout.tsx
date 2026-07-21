import { Tabs } from "expo-router";
import { Text } from "react-native";
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18 }}>{focused ? "🏠" : "⌂"}</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "지도",
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🗺️</Text>,
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "즐겨찾기",
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>☆</Text>,
        }}
      />

      <Tabs.Screen
        name="my-info"
        options={{
          title: "내정보",
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}