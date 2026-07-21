# LastCall 작업 지침

## 프로젝트 구성

- `lastcall-app-sdk54`: Expo SDK 54 / React Native 앱
- `lastcall-server`: Spring Boot 4 / Java 17 서버
- 앱의 서버 주소는 반드시 `lastcall-app-sdk54/src/config/api.ts` 한 곳에서 관리한다.

## 개발 원칙

- 사용자 화면의 아이콘은 텍스트 이모지 대신 `@expo/vector-icons`를 사용한다.
- 응급실 검색 필드는 국립중앙의료원 공공데이터 API의 실제 응답 필드와 일치시킨다.
- 필터를 추가하거나 변경하면 앱 요청 파라미터, 서버 컨트롤러, 서비스 필터링을 함께 수정한다.
- API 키와 DB 비밀번호는 저장소에 커밋하지 않고 환경변수로만 관리한다.
- 기존 사용자 변경사항과 무관한 파일은 되돌리지 않는다.

## 검증

- 앱: `npx expo lint` 또는 변경 파일 대상 ESLint, `npx tsc --noEmit`
- 서버: `mvnw.cmd test` 및 서버 기동 후 `/emergency/nearby` 실제 호출
- 변경 후 `git diff --check`로 공백 오류를 확인한다.
- 진행 상황과 검증 결과는 루트의 `WORK_PROGRESS.md`에 기록한다.

## 로컬 실행

- Java 17 이상 필요. 시스템 Java가 없으면 Red Hat Java VS Code 확장에 포함된 JDK를 사용할 수 있다.
- 서버 환경변수: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `EMERGENCY_API_KEY`
- 휴대폰과 개발 PC는 같은 네트워크에 연결한다.
