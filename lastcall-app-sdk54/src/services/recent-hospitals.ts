import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_HOSPITALS_KEY = "lastcall.recentHospitals.v1";
const RECENT_HOSPITALS_LIMIT = 5;

export type RecentHospital = {
  hpid: string;
  hospitalName: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  availableBeds: string;
  distance: string;
  latitude: string;
  longitude: string;
  viewedAt: string;
  [key: string]: string;
};

export async function getRecentHospitals(): Promise<RecentHospital[]> {
  const stored = await AsyncStorage.getItem(RECENT_HOSPITALS_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_HOSPITALS_LIMIT) : [];
  } catch {
    return [];
  }
}

export async function saveRecentHospital(hospital: RecentHospital) {
  if (!hospital.hpid || !hospital.hospitalName) return;
  const current = await getRecentHospitals();
  const next = [
    hospital,
    ...current.filter((item) => item.hpid !== hospital.hpid),
  ].slice(0, RECENT_HOSPITALS_LIMIT);
  await AsyncStorage.setItem(RECENT_HOSPITALS_KEY, JSON.stringify(next));
}

export async function clearRecentHospitals() {
  await AsyncStorage.removeItem(RECENT_HOSPITALS_KEY);
}
