import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/design";

/**
 * 아이콘(24) + 라벨(14) + 사이 여백이 들어갈 실제 내용 높이.
 * Android 제스처 바가 겹치면 탭이 눌리지 않으므로 이 높이 위에 안전영역을 따로 더한다.
 */
const TAB_CONTENT_HEIGHT = 52;
const TAB_PADDING = 8;

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          height: TAB_CONTENT_HEIGHT + TAB_PADDING * 2 + insets.bottom,
          paddingTop: TAB_PADDING,
          paddingBottom: TAB_PADDING + insets.bottom,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
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
