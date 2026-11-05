/** 의료정보 한 사람분. my-info 화면에 저장된 항목과 같은 모양이다. */
export type MedicalPerson = {
  relation: string;
  name: string;
  birth: string;
  gender: string;
  bloodType: string;
  disease: string;
  medicine: string;
  allergy: string;
  guardianName: string;
  guardianPhone: string;
  memo: string;
};

/** 보안 저장소의 JSON 문자열을 목록으로 바꾼다. 형식이 깨졌으면 빈 목록을 돌려준다. */
export function parseMedicalList(raw: string | null): MedicalPerson[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MedicalPerson[]) : [];
  } catch {
    return [];
  }
}

/** 문자·공유로 보낼 의료정보 요약. 입력하지 않은 항목은 "미입력"으로 채워 받는 사람이 빈칸을 오해하지 않게 한다. */
export function buildMedicalSummary(person: MedicalPerson) {
  return [
    "[살려줌 응급 의료정보]",
    `이름: ${person.name} (${person.relation})`,
    `생년월일: ${person.birth || "미입력"}`,
    `성별/혈액형: ${person.gender || "미입력"} / ${person.bloodType || "미입력"}`,
    `기저질환: ${person.disease || "없음/미입력"}`,
    `복용약: ${person.medicine || "없음/미입력"}`,
    `알레르기: ${person.allergy || "없음/미입력"}`,
    `응급 메모: ${person.memo || "없음"}`,
    `보호자: ${person.guardianName || "미입력"} ${person.guardianPhone || ""}`,
  ].join("\n");
}
