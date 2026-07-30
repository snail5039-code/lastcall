import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#DC2626",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 7),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="house" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "주변 응급실",
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="hospital" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "즐겨찾기",
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="star" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="my-info"
        options={{
          title: "내정보",
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
