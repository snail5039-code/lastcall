export const LOCATION_POLICY = {
  version: "2026-07-22",
  operatorName: process.env.EXPO_PUBLIC_OPERATOR_NAME?.trim() || "살려줌 운영팀",
  contact: process.env.EXPO_PUBLIC_LOCATION_CONTACT?.trim() || "snail5039@gmail.com · 010-5018-2483",
} as const;
