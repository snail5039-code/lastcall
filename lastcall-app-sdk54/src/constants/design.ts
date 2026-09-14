import { useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";

/**
 * 살려줌 디자인 토큰.
 *
 * 두 가지를 지키려고 만들었다.
 * 1. 빨강은 긴급에만 쓴다. 선택·강조처럼 긴급하지 않은 곳은 navy 계열을 쓴다.
 *    화면 곳곳이 빨강이면 정작 119 버튼이 묻힌다.
 * 2. 모서리 반경은 두 종류만 쓴다. control(4)과 card(8) 외의 값을 새로 만들지 않는다.
 *
 * 색은 라이트/다크 두 벌이며 화면은 useThemeColors 로 현재 벌을 받는다.
 */

const light = {
  /** 기준색. 헤더·주 버튼·선택 상태가 모두 이 계열이다. */
  navy: "#0B1F3A",
  navySoft: "#33456B",
  navyMuted: "#5B6B87",
  navyOnDark: "#AFC3DE",

  /** 긴급 전용. 119, 응급실 전화, 오래된 정보 경고에만 쓴다. */
  urgent: "#A61B1B",
  urgentBg: "#FBEAEA",
  urgentText: "#7A1414",

  /** 상태 표시. 색만으로 심각도를 전달하지 않고 항상 숫자나 문구를 함께 둔다. */
  ok: "#1B5E36",
  okBg: "#E8F3EC",
  caution: "#8A6D14",
  cautionBg: "#F4F0E4",

  screen: "#EEF1F6",
  surface: "#FFFFFF",
  surfaceSunken: "#F1F4F9",
  border: "#D8E0EC",
  borderStrong: "#C7D2E4",
  divider: "#E4EAF3",

  text: "#0B1F3A",
  textSub: "#33456B",
  textMuted: "#5B6B87",
  textFaint: "#8A97AD",

  /** 채워진 버튼 위의 글자·아이콘. 테마와 무관하게 항상 흰색이다. */
  onDark: "#FFFFFF",
} as const;

/**
 * 다크 팔레트.
 *
 * 응급 상황은 밤에 더 잦다. 어두운 곳에서 흰 화면이 터지면 눈이 적응하는 동안 글을 못 읽는다.
 * 순수 검정 대신 짙은 남회색을 쓴다. 순수 검정은 OLED 에서 스크롤 잔상이 생긴다.
 * 라이트에서 채움색이던 navy 는 어두운 배경에서 묻히므로 한 단계 밝은 파랑으로 올린다.
 */
const dark: ThemeColors = {
  navy: "#3B5BA5",
  navySoft: "#93B4F5",
  navyMuted: "#8A99B0",
  navyOnDark: "#C3D4F0",

  urgent: "#E4574F",
  urgentBg: "#3A1A1A",
  urgentText: "#F7B4B0",

  ok: "#4ADE80",
  okBg: "#14301F",
  caution: "#E0B341",
  cautionBg: "#332813",

  screen: "#0E1420",
  surface: "#171E2B",
  surfaceSunken: "#1F2735",
  border: "#2A3443",
  borderStrong: "#3A4657",
  divider: "#232C3A",

  text: "#E8EDF5",
  textSub: "#B6C2D4",
  textMuted: "#8A99B0",
  textFaint: "#6B7A91",

  onDark: "#FFFFFF",
} as const;

/** 각 색은 문자열로 넓혀 둔다. as const 리터럴 그대로면 다크 팔레트가 라이트 타입에 맞지 않는다. */
export type ThemeColors = Record<keyof typeof light, string>;

/** 모듈 로드 시점에 색이 필요한 곳(정적 스타일)을 위한 기본값. 화면에서는 useThemeColors 를 쓴다. */
export const Colors: ThemeColors = light;

/** 현재 기기 설정에 맞는 색 한 벌. app.json 의 userInterfaceStyle 이 automatic 이라 시스템 설정을 따른다. */
export function useThemeColors(): ThemeColors {
  return useColorScheme() === "dark" ? dark : light;
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
  control: 4,
  card: 8,
} as const;

export const Type = {
  /** 병상 수·거리처럼 판단에 쓰는 숫자. 라벨보다 확실히 커야 한다. */
  figure: 22,
  figureSm: 15,
  screenTitle: 16,
  title: 15,
  body: 14,
  label: 12,
  caption: 11,
} as const;

/** WCAG 권장 44px 이상을 기본으로 둔다. */
export const Tap = {
  min: 48,
  row: 52,
} as const;

export const Space = {
  xs: 5,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;
