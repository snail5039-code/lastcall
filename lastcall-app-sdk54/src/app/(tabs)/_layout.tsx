import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Tabs } from "expo-router";
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
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
          title: "지도",
          tabBarIcon: ({ color, size }) => <FontAwesome6 name="map-location-dot" size={size} color={color} />,
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
