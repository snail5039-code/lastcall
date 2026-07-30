export const LOCATION_POLICY = {
  version: "2026-08",
  operatorName: process.env.EXPO_PUBLIC_OPERATOR_NAME?.trim() || "박의혁",
  contact: process.env.EXPO_PUBLIC_LOCATION_CONTACT?.trim() || "snail5039@gmail.com",
} as const;

export const LEGAL_PAGE_URL =
  process.env.EXPO_PUBLIC_LEGAL_PAGE_URL?.trim() ||
  "https://snail5039-code.github.io/lastcall/";
