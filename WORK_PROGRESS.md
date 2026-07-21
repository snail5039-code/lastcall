# LastCall 작업 진행 상황

## 테스트 관리자 계정 확정 (2026-07-22)

- 테스트 관리자 계정은 로컬 환경변수로 설정했다(비밀번호 값은 저장소에 기록하지 않음).
- 서버와 앱 로그인 요청에 관리자 아이디 검증을 추가했다.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`를 Windows 사용자 환경변수로 설정했다.
- 서버를 해당 계정으로 재기동하고 실제 로그인, 토큰 발급, 신고 목록 조회, 로그아웃을 확인했다.
- `sql` 파일에 `communityReport` 테이블과 게시글/댓글 관리 조회용 복합 인덱스 쿼리를 추가했다.
- 관리자 계정 정보는 SQL이나 저장소에 넣지 않고 환경변수로만 관리한다.
- 현재 비밀번호는 테스트 전용이며 외부 배포 전 반드시 강한 비밀번호로 변경해야 한다.

## 관리자 신고 관리 (2026-07-22)

- 홈 메뉴에 `관리자 로그인` 진입점을 추가했다.
- 관리자 비밀번호는 코드가 아닌 `ADMIN_PASSWORD` 환경변수로만 설정한다.
- 로그인 성공 시 추측하기 어려운 임시 토큰을 발급하며 유효시간은 8시간이다.
- 모바일 앱은 관리자 토큰만 Expo SecureStore에 저장하고 비밀번호는 저장하지 않는다.
- 동일 접속지에서 10분 내 5회 로그인 실패 시 10분간 로그인을 차단한다.
- 관리자 전용 신고 목록(처리 대기/완료/전체), 처리 완료, 신고 원문 삭제, 로그아웃 기능을 추가했다.
- 신고 조회·처리·삭제 API는 Bearer 관리자 토큰이 없거나 만료되면 HTTP 401로 차단한다.
- 실제 인증 검증: 무토큰 401, 로그인 토큰 발급 성공, 신고 목록 200, 로그아웃 후 기존 토큰 401.
- 공개된 테스트 비밀번호는 제거하고 서버를 `ADMIN_PASSWORD` 미설정 상태로 안전하게 재기동했다(현재 로그인 시 503).
- 관리자 화면 웹 번들 경로 `/admin-reports` HTTP 200 확인.
- 앱 ESLint 오류 0(기존 Hook 경고 1), 서버 Maven 테스트 1개 성공/실패 0.

## 현재 위치 기반 사전 캐시 (2026-07-22)

- 홈에서 위치 확인이 끝나는 즉시 해당 시·도의 병원·진료과 데이터를 백그라운드로 사전 로딩한다.
- `POST /emergency/warmup?stage1=...`은 HTTP 202로 즉시 응답하고 실제 캐시는 비동기로 수행한다.
- 같은 지역의 중복 워밍업 요청은 하나의 작업으로 합치며 실패해도 일반 검색 흐름에는 영향을 주지 않는다.
- 부산 실데이터 검증: 워밍업 응답 121ms, 백그라운드 완료 후 첫 가슴통증 검색 29곳/84ms/HTTP 200.
- 기존 캐시 없는 서울 첫 증상 검색 12,796ms 대비 사용자 체감 대기시간이 크게 감소했다.
- 앱 ESLint 오류 0, 서버 Maven 테스트 1개 성공/실패 0, `git diff --check` 통과.

## 응급실 검색 안정성 개선 (2026-07-22)

- 공공 API 호출을 최대 2회 재시도하고, 재시도 실패 시 만료된 캐시라도 활용하도록 변경했다.
- 병원별 진료과 API 실패는 해당 병원의 진료과 정보만 비우고 전체 응급실 검색은 계속 진행하도록 격리했다.
- 응급실 목록 오류 화면에 `다시 시도` 버튼을 추가했다.
- 병상 갱신 시각이 없거나 15분을 초과하면 목록과 상세 화면에 `오래된 정보` 경고를 표시한다.
- 음수·0 병상 및 수술실 값은 숫자 대신 `확인 필요`로 표시하며 지도 마커 설명도 동일하게 처리했다.
- 개선 코드로 Spring 서버를 재기동하고 서울/가슴통증 검색을 3회 연속 실제 호출했다.
- 실제 결과: 첫 호출 51곳/12,796ms, 캐시 호출 51곳/18ms 및 9ms, 3회 모두 HTTP 200.
- 변경 앱 파일 ESLint: 오류 0(기존 Hook 경고 1), Maven 테스트: 1개 성공/실패 0.

## 전체 로컬 기동 및 출시 전 점검 (2026-07-22)

- Spring 서버를 8080 포트에 실제 기동하고 Expo 웹/LAN 서버를 8081 포트에 실제 기동했다.
- LAN 주소: 앱 `http://192.168.0.9:8081`, 서버 `http://192.168.0.9:8080` 모두 HTTP 200 확인.
- Expo 웹 번들: 홈, 응급실 목록, 즐겨찾기, 내 정보, 커뮤니티, 응급안내 경로 모두 HTTP 200.
- 서울시청 좌표 실데이터: 첫 조회 51곳/2,404ms, 캐시 조회 51곳/499ms, 병원명 검색 2곳/3ms, 병상 필터 49곳/6ms, CT+MRI 필터 51곳/8ms.
- 실제 응답에서 `dataUpdatedAt=20260722073538`, 가용 병상, 주소, 전화번호를 확인했다.
- 증상 추천 첫 호출은 공공 API 진료과 요청 중 일시적 HTTP 500이 발생했고 재호출은 성공했다. 개별 외부 API 실패가 전체 요청 실패로 전파되지 않도록 보완이 필요하다.
- 웹 Origin 요청에 CORS 허용 헤더가 없어 웹 서비스에서는 API 호출이 차단된다. 모바일 네이티브 앱에는 브라우저 CORS 제한이 적용되지 않는다.
- Expo가 `expo@54.0.35` 대신 `~54.0.36` 사용을 권고하며 웹 shadow/pointerEvents 폐기 경고가 존재한다.
- 자동 클릭/시각 검증은 현재 세션에 연결 가능한 브라우저가 없어 수행하지 못했다.

## 응급정보 신뢰성·보안·커뮤니티 안전 개선 (2026-07-22)

- 공공데이터 실시간 응답의 `hvidate`, `hvdnm`, `hv1` 필드를 병상 갱신 시각, 당직의, 당직의 연락처로 매핑했다.
- 검색 결과와 상세 화면에 갱신 시각 및 방문 전 전화 확인 안내를 추가했다.
- 공공 API에 응급실의 현재 영업 여부를 확정하는 단일 필드가 없어 병상 유무를 운영 여부로 단정하지 않도록 처리했다.
- 즐겨찾기 화면 진입 시 현재 위치와 병원 소재 시·도로 공공 API를 재조회하여 최신 병상·장비·거리 정보를 갱신한다.
- 의료정보 저장을 AsyncStorage에서 Expo SecureStore로 변경하고 기존 데이터는 자동 이전 후 일반 저장소에서 제거한다.
- 내 정보 화면에 119 전화, 보호자 문자, 의료정보 시스템 공유 기능과 민감정보 경고를 추가했다.
- 게시글·댓글 등록 및 수정에 서버 금칙어 검사를 추가했다.
- 게시글·댓글 신고를 관리자 전용 DB 목록(`communityReport`)에 적재하며 공개 조회 API는 제공하지 않는다.
- 변경 앱 파일 ESLint: 오류 0(기존 Hook 의존성 경고만 존재).
- 서버 Maven 테스트: 1개 성공, 실패 0, `BUILD SUCCESS`.
- 전체 TypeScript 검사는 기존 Expo 템플릿/컴포넌트 타입 오류로 실패했으며 변경 파일 신규 오류는 확인되지 않았다.

## 사용자 입력 검색 및 홈/공지 개선 (2026-07-22)

- 홈 화면에 병원명 또는 주소를 직접 입력하는 응급실 검색 필드를 추가했다.
- 검색어를 앱 요청 파라미터, 서버 컨트롤러, 서비스의 병원명/주소 필터링까지 연결했다.
- 검색 결과와 세부검색 사이를 이동해도 입력 검색어가 유지되도록 처리했다.
- 검색 입력란과 버튼 간 여백, 버튼별 간격을 늘려 `응급실 검색하기` 이하 영역을 아래로 조정했다.
- 공지사항 화면에 119 우선 신고, 방문 전 전화 확인, 검색 기능, 위치 정보 관련 공지 4개를 하드코딩했다.
- 변경 앱 파일 ESLint: 오류 0, 기존 Hook 의존성 경고 1.
- 전체 TypeScript 검사: 이번 변경과 무관한 기존 Expo 템플릿/컴포넌트 타입 오류로 실패(변경 파일 신규 오류 없음).
- 서버 Maven 테스트: 1개 성공, 실패 0, `BUILD SUCCESS`.

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
# 2026-07-22 전국 직접 검색 및 키보드 스크롤 개선

- 홈에서 병원명/주소를 입력한 경우 현재 시·도 조건을 사용하지 않는 `/emergency/search` 전국 검색 API로 분리
- 병원명/주소 검색 시 공백·기호 무시, 부분 일치, `서울대병원` 같은 대학병원 축약, 짧은 단어 오타 1자 허용
- 직접 검색 결과는 검색어 일치도를 먼저 반영하고 같은 일치도 안에서 거리/병상 정렬 조건 적용
- 전국 병원 기본정보 캐시를 홈 진입 시 백그라운드로 준비하는 `/emergency/warmup/search` 추가
- 위치 조회가 실패해도 직접 입력 검색은 가능하도록 처리(거리 계산 기준만 서울 시청 좌표로 대체)
- 홈 전체를 `ScrollView`와 `KeyboardAvoidingView`로 감싸 자판이 입력창/검색 버튼을 가리지 않도록 개선
- 실제 공공데이터 확인: 서울 현재 좌표에서 `부산광역시` 주소 검색 36건 반환, 현재 위치와 무관한 검색 확인
- 실제 공공데이터 확인: `서울대병원` 축약 검색 2건 반환, 첫 결과 서울대학교병원
- 성능 확인: 전국 색인 사전 로딩 후 새 지역의 실시간 병상 첫 조회 약 5.9~6.3초, 같은 조건 재조회는 서버 캐시 사용
- 검증: 변경 앱 화면 ESLint 통과, 서버 테스트 1건 통과(실패 0), 전체 TypeScript 검사는 기존 템플릿/Native Tabs 타입 오류로 실패
# 2026-07-22 증상 토글 및 관리자 게시글 삭제 권한

- 홈 증상 항목을 선택한 상태에서 같은 항목을 다시 누르면 선택 해제되도록 변경
- 관리자 세션 토큰 키를 공용 보안 저장소 서비스로 분리
- 관리자 로그인 상태에서 게시글 상세의 삭제 버튼을 누르면 작성자 비밀번호 없이 관리자 확인 후 삭제
- 서버에 관리자 토큰 전용 `DELETE /community/admin/posts/{id}` 추가
- 관리자 계정은 SQL 테이블이 아닌 `ADMIN_USERNAME`, `ADMIN_PASSWORD` 환경변수 방식 유지(평문 비밀번호 DB 저장 방지)
- 실제 검증: 임시 게시글 생성 → 환경변수 관리자 계정 로그인 → 관리자 API 삭제 결과 1 → 토큰 없는 동일 API 요청 401 확인
- 검증 후 임시 게시글은 삭제되어 DB에 남지 않음
- 검증: 앱 변경 파일 ESLint 오류 0(기존 Hook 경고 2), 서버 테스트 1건 성공(실패 0)
