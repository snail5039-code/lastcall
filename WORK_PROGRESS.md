# LastCall 작업 진행 상황

## Runtime verification (2026-07-21)

- Home spacing rebalanced after the compact-layout pass.
- Hospital detail now shows all bed types, equipment/facilities, severe-care capabilities, and department-specific Font Awesome icons.
- Native map now includes a vertically scrollable nearest-hospital list; both markers and rows open hospital detail.
- Detail API verification: HTTP 200, 51 hospitals, bed/facility/severe fields present, nearest distances sorted ascending.
- Latest changed-file ESLint: 0 errors (1 pre-existing hook dependency warning). Server tests: 1 passed, 0 failed.
- Home layout compacted so search, detailed search, and emergency guide fit the main viewport.
- Detailed-search navigation now preserves latitude/longitude; hospital results no longer reacquire GPS on every screen.
- Map search now uses the full current city/province, renders up to 30 nearest valid markers, and fits the camera to nearby hospitals.
- Public API calls for beds and hospital metadata run concurrently; department calls are conditional, parallel, and cached.
- Final API timing: first request 1,855 ms; same-region cached request 14 ms; filtered cached request 11 ms.
- Map result verification: HTTP 200, 51 results, all 51 with valid coordinates.
- Changed app files ESLint: passed. Server tests: 1 passed, 0 failed. `git diff --check`: passed (line-ending warnings only).
- Full TypeScript check still fails on pre-existing Expo template/component type errors outside these changes.
- Expo LAN dev server: `http://192.168.0.9:8081` returned HTTP 200.
- Spring server: port 8080 started successfully with Maven 3.9.16.
- `GET /emergency/nearby` with Seoul coordinates returned HTTP 200 and 51 records.

마지막 업데이트: 2026-07-21

## 완료

- [x] 앱 서버 주소를 `lastcall-app-sdk54/src/config/api.ts`로 통합
- [x] 현재 개발 PC IPv4 `192.168.0.9` 적용
- [x] 지역, 정렬, 진료과, 병상, 장비·시설, 중증질환 필터 UI 구현
- [x] 앱 필터 파라미터와 서버 검색 API 연결
- [x] 공공데이터 실시간 병상·장비 필드 매핑
- [x] 공공데이터 중증질환 수용가능정보 API 결합
- [x] 루트 `AGENTS.md` 작성
- [x] 메인 화면 독립 세부검색 버튼 추가
- [x] 기기 저장 기반 내 게시글 등록 기록
- [x] 내 게시글 새 댓글 알림 배지 및 목록
- [x] 알림 선택 시 게시글 이동 및 개별 읽음 처리
- [x] 댓글 알림 모두 읽음 처리

## 진행 중

- [x] 앱의 텍스트 이모지와 문자 아이콘을 Font Awesome 6 아이콘으로 교체
- [x] Expo 웹 프로덕션 번들 생성
- [x] 프론트 개발 서비스 기동 및 HTTP 200 확인
- [ ] 자동 브라우저 육안 점검
- [x] Spring 서버 컴파일 및 테스트
- [ ] 실제 공공데이터 API 호출 점검

## 현재 검증 결과

- 앱 소스 전체 ESLint: 오류 0, 기존 경고 6
- 전체 TypeScript 검사: 기존 Expo 템플릿 파일 오류로 실패, 이번 변경 파일의 신규 오류 없음
- `git diff --check`: 통과
- 서버: VS Code Red Hat Java 확장의 Temurin JDK 21 사용 가능
- Maven 테스트: 1개 성공, 실패 0, 오류 0, `BUILD SUCCESS`
- 댓글 알림 변경 후 Maven 테스트: 1개 성공, 실패 0, 오류 0
- 알림 관련 프론트 파일 ESLint: 오류 0
- Expo 웹 번들 1·2차: `react-native-maps` 네이티브 모듈 때문에 실패
- 지도 구현을 라우트 밖의 `map-screen.native.tsx` / `map-screen.web.tsx`로 분리
- Expo 웹 번들 최종: 성공, 정적 라우트 17개 생성
- 로컬 및 LAN 주소 `http://192.168.0.9:8081`: HTTP 200 확인
- 자동 브라우저: 현재 세션에서 사용 가능한 브라우저가 없어 육안 점검 불가
- 시스템 JDK 설치는 불필요하며 VS Code 확장 내 JDK를 테스트에 사용

## 확인할 사항

- 실제 공공데이터 호출에는 `EMERGENCY_API_KEY` 환경변수가 필요함
- DB 연결 환경변수가 없으면 Spring 애플리케이션 전체 기동이 실패할 수 있음
- 실기기 점검 시 휴대폰과 PC를 동일 Wi-Fi에 연결해야 함
