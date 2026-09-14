/**
 * 살려줌 디자인 토큰.
 *
 * 두 가지를 지키려고 만들었다.
 * 1. 빨강은 긴급에만 쓴다. 선택·강조처럼 긴급하지 않은 곳은 navy 계열을 쓴다.
 *    화면 곳곳이 빨강이면 정작 119 버튼이 묻힌다.
 * 2. 모서리 반경은 두 종류만 쓴다. control(4)과 card(8) 외의 값을 새로 만들지 않는다.
 */

export const Colors = {
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
  onDark: "#FFFFFF",
} as const;

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
