/** 병상 정보가 이 시간(분)보다 오래되면 오래된 정보로 본다. 서버의 freshOnly 기준과 같아야 한다. */
export const STALE_MINUTES = 15;

/** "20261105091233", "2026-11-05T09:12" 같은 공공데이터 갱신 시각을 "2026-11-05 09:12"로 바꾼다. */
export function formatUpdatedAt(value?: string, emptyText = "확인 필요") {
  if (!value) return emptyText;
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
  }
  return value.replace("T", " ").slice(0, 16);
}

/** 갱신 시각이 없거나 STALE_MINUTES 분보다 오래됐으면 true. 형식을 해석할 수 없으면 false(서버와 달리 경고하지 않는다). */
export function isUpdatedAtStale(value?: string, now = Date.now()) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return false;
  const updatedAt = new Date(
    Number(digits.slice(0, 4)),
    Number(digits.slice(4, 6)) - 1,
    Number(digits.slice(6, 8)),
    Number(digits.slice(8, 10)),
    Number(digits.slice(10, 12)),
  );
  return now - updatedAt.getTime() > STALE_MINUTES * 60 * 1000;
}
