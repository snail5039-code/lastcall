import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { ThemeContext, ThemeMode } from "../constants/design";

const THEME_MODE_KEY = "lastcall.themeMode.v1";

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "system" || value === "light" || value === "dark";

/**
 * 화면 테마를 기억한다.
 *
 * 기본값은 시스템 설정을 따르되, 사용자가 직접 밝게·어둡게로 고정할 수 있다.
 * 밤에 응급 상황이 잦은 앱이라 기기 설정과 무관하게 어둡게 두고 싶은 경우가 있다.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY)
      .then((saved) => {
        if (isThemeMode(saved)) setModeState(saved);
      })
      .catch(() => undefined);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    // 저장에 실패해도 이번 실행 동안의 선택은 유지한다.
    AsyncStorage.setItem(THEME_MODE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "system" ? systemScheme === "dark" : mode === "dark",
      setMode,
    }),
    [mode, systemScheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
