import { NaverMapMarkerOverlay, NaverMapView } from "@mj-studio/react-native-naver-map";
import { StyleSheet, View } from "react-native";
import { Radius, useThemeColors } from "../constants/design";
import type { AedMapProps } from "./aed-map";

/** 닫힌 AED 는 회색, 이용 가능하거나 운영시간을 모르는 AED 는 초록으로 구분한다. */
export default function AedMap({ aeds, center, hasLocation, onSelect }: AedMapProps) {
  const Colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: Colors.border }]}>
      <NaverMapView
        style={styles.map}
        initialRegion={{ ...center, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        isShowLocationButton
        isShowZoomControls={false}
        isShowScaleBar
        isShowCompass
      >
        {hasLocation ? (
          <NaverMapMarkerOverlay
            latitude={center.latitude}
            longitude={center.longitude}
            image={{ symbol: "lightblue" }}
            width={28}
            height={36}
            caption={{ text: "현재 위치" }}
            zIndex={100}
          />
        ) : null}
        {aeds.map((aed, index) => (
          <NaverMapMarkerOverlay
            key={`${aed.serialSeq || aed.latitude}-${index}`}
            latitude={aed.latitude}
            longitude={aed.longitude}
            image={{ symbol: aed.openNow === false ? "gray" : "green" }}
            width={26}
            height={34}
            caption={{ text: aed.org || "AED" }}
            subCaption={{ text: `${aed.distance}km${aed.place ? ` · ${aed.place}` : ""}` }}
            onTap={() => onSelect(aed)}
          />
        ))}
      </NaverMapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 320, marginHorizontal: 14, marginTop: 10, borderRadius: Radius.card, overflow: "hidden" },
  map: { flex: 1 },
});
