import * as Location from "expo-location";

export type CurrentLocation = {
  latitude: number;
  longitude: number;
  stage1: string;
  stage2: string;
  addressText: string;
};

let cachedLocation: CurrentLocation | null = null;

export async function getCurrentLocationFast(): Promise<CurrentLocation> {
  if (cachedLocation) return cachedLocation;

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("LOCATION_PERMISSION_DENIED");

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 2 * 60 * 1000,
    requiredAccuracy: 1000,
  });
  const position = lastKnown ?? await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const [address] = await Location.reverseGeocodeAsync(position.coords);
  const stage1 = address?.region ?? "";
  const stage2 = address?.district ?? address?.subregion ?? "";
  const addressText = [stage1, stage2, address?.street, address?.name].filter(Boolean).join(" ");

  cachedLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    stage1,
    stage2,
    addressText: addressText || "현재 위치 확인됨",
  };
  return cachedLocation;
}
