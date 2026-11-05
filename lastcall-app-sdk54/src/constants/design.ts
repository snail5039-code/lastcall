import { createContext, useContext, useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";

/**
 * 살려줌 디자인 토큰.
 *
 * 지키려는 것은 세 가지다.
 * 1. 포인트 색은 파랑 하나다. 선택·주 버튼·강조가 모두 이 색이다.
 * 2. 빨강은 긴급에만 쓴다(119, 응급실 전화, 오래된 정보 경고). 화면 곳곳이 빨강이면 정작 119 가 묻힌다.
 * 3. 배경은 옅은 회색, 카드는 흰색이다. 테두리 대신 면의 차이로 구분해 화면을 가볍게 한다.
 *    모서리 반경은 control(12)과 card(16) 두 가지만 쓴다.
 *
 * 색은 라이트/다크 두 벌이며 화면은 useThemeColors 로 현재 벌을 받는다.
 * 토큰 이름의 navy 는 예전 이름을 그대로 둔 것으로, 지금은 포인트 파랑 계열을 가리킨다.
 */

const light = {
  /** 포인트 파랑. 주 버튼·선택 상태의 채움색이다. */
  navy: "#3182F6",
  /** 파랑 글자·아이콘. 흰 바탕에서 글자로 읽히도록 채움색보다 진하다. */
  navySoft: "#1B64DA",
  navyMuted: "#6B7684",
  navyOnDark: "#C9E2FF",

  /** 긴급 전용. 119, 응급실 전화, 오래된 정보 경고에만 쓴다. */
  urgent: "#D92B3A",
  urgentBg: "#FFEEEF",
  urgentText: "#B3202D",

  /**
   * 빨강·초록을 통째로 칠하는 면의 색. 글자색으로 쓰는 urgent/ok 와 나눠 둔다.
   * 어두운 배경에서는 글자용 색을 밝게 올려야 하는데, 같은 색을 면에 칠하면
   * 그 위의 흰 글자가 안 보인다. 한 색이 두 역할을 같이 할 수 없다.
   */
  urgentFill: "#F04452",
  okFill: "#058A57",
  /** 빨간 면 위의 보조 글자. onDark 보다 한 톤 낮춰 제목과 구분한다. */
  onUrgent: "#FFE3E5",

  /** 상태 표시. 색만으로 심각도를 전달하지 않고 항상 숫자나 문구를 함께 둔다. */
  ok: "#058A57",
  okBg: "#E8F7F0",
  caution: "#9A6700",
  cautionBg: "#FFF6E0",

  screen: "#F2F4F6",
  surface: "#FFFFFF",
  surfaceSunken: "#F2F4F6",
  border: "#E5E8EB",
  borderStrong: "#D1D6DB",
  divider: "#EEF0F3",

  text: "#191F28",
  textSub: "#4E5968",
  textMuted: "#6B7684",
  textFaint: "#7A8493",

  /** 채워진 버튼 위의 글자·아이콘. 테마와 무관하게 항상 흰색이다. */
  onDark: "#FFFFFF",
} as const;

/**
 * 다크 팔레트.
 *
 * 응급 상황은 밤에 더 잦다. 어두운 곳에서 흰 화면이 터지면 눈이 적응하는 동안 글을 못 읽는다.
 * 순수 검정 대신 짙은 회색을 쓴다. 순수 검정은 OLED 에서 스크롤 잔상이 생긴다.
 */
const dark: ThemeColors = {
  navy: "#3D7FEA",
  navySoft: "#74B0FF",
  navyMuted: "#9AA5B4",
  navyOnDark: "#C9E2FF",

  urgent: "#FF6B76",
  urgentBg: "#3A1D21",
  urgentText: "#FFB4BA",

  urgentFill: "#E03A47",
  okFill: "#0E8F5E",
  onUrgent: "#FFE3E5",

  ok: "#3DDC97",
  okBg: "#12302A",
  caution: "#F2C14E",
  cautionBg: "#33290F",

  screen: "#17171C",
  surface: "#202027",
  surfaceSunken: "#2B2B33",
  border: "#33333D",
  borderStrong: "#454552",
  divider: "#2B2B33",

  text: "#F2F4F6",
  textSub: "#C3CAD4",
  textMuted: "#9AA3AF",
  textFaint: "#8A93A0",

  onDark: "#FFFFFF",
} as const;

/** 각 색은 문자열로 넓혀 둔다. as const 리터럴 그대로면 다크 팔레트가 라이트 타입에 맞지 않는다. */
export type ThemeColors = Record<keyof typeof light, string>;

/** 모듈 로드 시점에 색이 필요한 곳(정적 스타일)을 위한 기본값. 화면에서는 useThemeColors 를 쓴다. */
export const Colors: ThemeColors = light;

/** 시스템 설정을 따를지, 사용자가 고른 쪽으로 고정할지. */
export type ThemeMode = "system" | "light" | "dark";

export type ThemeState = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
};

/** 값은 ThemeProvider 가 채운다. 여기에는 컴포넌트를 두지 않아야 design.ts 와 순환 참조가 생기지 않는다. */
export const ThemeContext = createContext<ThemeState | null>(null);

export function useThemeMode(): ThemeState {
  // 훅은 조건 없이 항상 호출해야 하므로 시스템 값을 먼저 읽는다.
  const systemScheme = useColorScheme();
  const stored = useContext(ThemeContext);
  if (stored) return stored;

  // Provider 밖에서 쓰이더라도 최소한 시스템 설정은 따르게 둔다.
  return { mode: "system", isDark: systemScheme === "dark", setMode: () => {} };
}

/** 현재 테마에 맞는 색 한 벌. */
export function useThemeColors(): ThemeColors {
  return useThemeMode().isDark ? dark : light;
}

/**
 * StyleSheet 는 모듈 로드 때 한 번 만들어지므로 색이 바뀌어도 반영되지 않는다.
 * 화면마다 스타일을 함수로 두고 이 훅으로 현재 테마에 맞춰 다시 만든다.
 */
export function useThemeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useThemeColors();
  return useMemo(() => factory(colors), [factory, colors]);
}

/** 반경은 이 둘만 쓴다. */
export const Radius = {
  control: 12,
  card: 16,
} as const;

export const Type = {
  /** 병상 수·거리처럼 판단에 쓰는 숫자. 라벨보다 확실히 커야 한다. */
  figure: 24,
  figureSm: 16,
  screenTitle: 17,
  title: 16,
  body: 15,
  label: 13,
  caption: 12,
} as const;

/** WCAG 권장 44px 이상을 기본으로 둔다. */
export const Tap = {
  min: 48,
  row: 56,
} as const;

export const Space = {
  xs: 5,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;
