import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { StyleSheet, Text, View } from "react-native";
import { Radius, useThemeColors } from "../constants/design";
import type { AedMapProps } from "./aed-map";

/** 웹에는 네이티브 지도가 없으므로 안내만 보여주고 목록을 쓰게 한다. */
export default function AedMap(_props: AedMapProps) {
  const Colors = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
      <FontAwesome6 name="map-location-dot" size={28} color={Colors.textFaint} />
      <Text style={[styles.text, { color: Colors.textMuted }]}>지도는 모바일 앱에서 제공됩니다. 목록을 이용해주세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 14, marginTop: 10, padding: 24, borderRadius: Radius.card, borderWidth: 1, alignItems: "center", gap: 10 },
  text: { fontSize: 13, textAlign: "center" },
});
