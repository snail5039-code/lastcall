# LastCall 작업 진행 상황

## 기본 공지사항 보강 (2026-07-26)

- 공지사항은 서버 게시글과 분리된 앱 내부 `APP_NOTICES` 배열을 사용하며 네트워크 연결 없이 표시된다.
- 기존 119 우선 신고, 방문 전 전화 확인, 검색 기능, 위치정보 안내 4개를 유지했다.
- 내 의료정보가 서버로 전송되지 않고 기기의 보안 저장소에 보관된다는 공지를 추가해 총 5개로 구성했다.
- 검증: 앱 TypeScript 검사 성공, 변경 공지 화면 ESLint 성공, `git diff --check` 통과.

## 배포 전 관리자 인증 보안 강화 (2026-07-26)

- 서버와 앱에 있던 기본 관리자 아이디 `admin`을 제거했다. `ADMIN_USERNAME`이 없으면 관리자 로그인이 비활성화된다.
- 관리자 비밀번호 평문 환경변수 `ADMIN_PASSWORD`를 폐기하고 BCrypt cost 12 이상의 `ADMIN_PASSWORD_HASH`만 사용하도록 변경했다.
- 관리자 세션 기본 유효시간을 8시간에서 1시간으로 단축하고 `ADMIN_SESSION_DURATION`으로 조절할 수 있게 했다.
- 동일 접속지의 5회 실패/10분 잠금 정책은 유지하고 BCrypt 해시 로그인, 오인증 차단, 미설정 시 503을 자동 테스트로 추가했다.
- 앱 관리자 로그인 화면의 아이디 자동 입력값을 제거했으며 아이디와 비밀번호가 모두 있어야 요청한다.
- 기본 실행 시 `local` 프로필을 강제로 사용하던 설정과 특정 사설 IP CORS 기본값을 제거했다.
- Git에서 제외된 `application-local.yml`에 남아 있던 공공데이터 API 키를 제거하고 환경변수 참조로 교체했다. 기존 키는 발급처에서 재발급해야 한다.
- 배포 비밀 저장소 필수값: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `EMERGENCY_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `CORS_ALLOWED_ORIGINS`.
- 검증: 서버 테스트 7개 성공/실패 0, 앱 TypeScript 검사 성공, 변경 관리자 화면 ESLint 성공, `git diff --check` 통과.
- 사용자가 지정한 로컬 관리자 계정을 Git 제외 파일 `application-local.yml`에 BCrypt cost 12 해시로 설정했다. 평문 비밀번호는 파일에 저장하지 않았다.

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

## 최초 실행 필수 동의 및 전체 기동 검증 (2026-07-22)

- 앱 라우트보다 먼저 표시되는 최초 실행 필수 동의 화면을 추가했다.
- 필수 항목은 `실시간 정보의 지연·누락·오류 가능성`, `앱이 의료진 및 119를 대체하지 않음`, `위치정보 수집·이용 및 처리방침` 세 가지이며 모두 선택해야 시작할 수 있다.
- 위치정보 처리 내용에 목적, 처리 항목, 서버 전송, 서버 DB 미저장, 앱 실행 중 메모리 캐시, 거부 시 제한을 명시했다.
- 동의 결과는 AsyncStorage에 버전 키로 저장하며, 동의 전에는 기존 앱 라우트가 렌더링되지 않아 위치 권한 요청도 발생하지 않는다.
- 거절 시 Android는 `BackHandler.exitApp()`으로 즉시 종료한다. 임의 종료가 허용되지 않는 iOS와 일반 웹 환경은 모든 서비스 접근을 차단한 종료 안내 화면을 표시한다.
- `app.json`에 Expo Location 플러그인과 한국어 iOS 위치 권한 설명을 추가했다.
- 전체 TypeScript 검사를 방해하던 미사용 Expo 샘플 컴포넌트를 삭제하지 않고 검사 제외 대상으로 분리하고, 남아 있는 샘플 import 경로와 테마 null 처리 오류를 정리했다.
- 앱 전체 `npx expo lint`: 오류 0, 기존 Hook 의존성 경고 5.
- 앱 전체 `npx tsc --noEmit`: 성공.
- Expo 웹 프로덕션 export: 18개 정적 라우트 번들 성공.
- Maven 테스트: 1건 성공, 실패·오류 0, `BUILD SUCCESS`.
- Spring 서버를 8080에서 실제 기동하고 `GET /emergency/nearby` 서울 좌표 호출 결과 HTTP 200, 51건을 확인했다.
- Expo LAN 개발 서버를 8081에서 실제 기동하고 HTTP 200을 확인했다. LAN 주소는 `http://192.168.0.9:8081`, API 주소는 `http://192.168.0.9:8080`이다.
- 로컬 브라우저 렌더링 자동 검증을 시도했으나 현재 세션에 연결 가능한 브라우저가 없어 자동 클릭·시각 검증은 수행하지 못했다. 타입 검사와 실제 웹 번들 및 HTTP 응답으로 대체 검증했다.
- 추가 확인 사항: 서버의 외부 공공데이터 `RestTemplate`에 명시적 연결/응답 시간 제한이 없고, 브라우저용 CORS 설정이 없으며, 공개 검색·워밍업 API에 호출 제한이 없다. 운영 전 타임아웃·표준 오류 응답·CORS 허용 출처 제한·rate limit 보강이 필요하다.
- 위치정보 동의 문안은 제품 동작 기준으로 작성했으며, 운영 주체명·연락처·법정 고지 방식은 실제 사업자 정보로 출시 전 법률 검토가 필요하다.

## 운영 전 보완 사항 조치 (2026-07-22)

- 공공데이터용 `RestTemplate`을 단일 Bean으로 통합하고 연결 3초, 응답 8초 타임아웃을 적용했다. `EMERGENCY_API_CONNECT_TIMEOUT`, `EMERGENCY_API_READ_TIMEOUT`으로 운영 환경별 조정이 가능하다.
- 잘못된 요청은 `INVALID_REQUEST`/HTTP 400, 외부 API 장애는 `EXTERNAL_API_UNAVAILABLE`/HTTP 503, 예상하지 못한 오류는 `INTERNAL_ERROR`/HTTP 500 형식으로 반환하는 공통 예외 처리기를 추가했다.
- CORS는 localhost, 127.0.0.1, 현재 LAN 앱 주소만 기본 허용하며 `CORS_ALLOWED_ORIGINS` 환경변수로 배포 Origin을 지정하도록 변경했다. 실제 검증에서 허용 Origin은 HTTP 200과 허용 헤더, 비허용 Origin은 HTTP 403을 확인했다.
- 응급실 공개 API는 IP당 기본 분당 120회, 워밍업은 별도 분당 20회로 제한했다. 수치는 환경변수로 조정 가능하고 429 응답에 `Retry-After: 60`과 표준 오류 코드를 포함한다.
- 워밍업 연속 호출 실검증 결과 HTTP 202 20회 후 21번째 요청이 HTTP 429로 차단됐다.
- rate limit 자동 테스트 2건을 추가했다. 서버 전체 테스트는 총 3건 성공, 실패·오류 0, `BUILD SUCCESS`다.
- 앱의 기존 Hook 의존성 경고 5건을 정리했다. 앱 전체 ESLint는 오류·경고 0, TypeScript 검사 성공이다.
- 위치정보 처리방침에 시행 버전, 운영 주체, 문의 채널을 추가하고 `EXPO_PUBLIC_OPERATOR_NAME`, `EXPO_PUBLIC_LOCATION_CONTACT`로 실제 출시 정보를 주입하도록 분리했다. `.env.example`과 README 설정 안내도 추가했다.
- Expo 웹 프로덕션 export 18개 라우트 성공, 실제 API 서울 좌표 조회 HTTP 200/51건, Expo 8081 HTTP 200을 확인했다.
- 보완된 Spring JAR 서버는 8080에서 실행 중이며 Expo 개발 서버도 8081에서 계속 실행 중이다.

## 위치정보 문의 연락처 반영 및 재기동 (2026-07-22)

- 위치정보 문의 연락처를 `snail5039@gmail.com · 010-5018-2483`으로 변경했다.
- 앱 기본 고지값과 `.env.example`을 함께 변경했다.
- 앱 전체 ESLint 오류·경고 0, TypeScript 검사 성공, `git diff --check` 통과.
- 기존 Spring·Expo 프로세스를 종료하고 각각 8080·8081 포트에 재기동했다.
- 재기동 후 응급실 API HTTP 200/51건, Expo HTTP 200을 확인했다.
- 연락처 기재만으로 법적 요건이 모두 충족되는 것은 아니다. 실제 상호·주소, 이용자 권리와 행사방법, 확인자료 보유근거·기간, 파기 절차, 제3자 제공 여부를 포함한 정식 약관·처리방침 공개와 위치기반서비스사업 신고 대상 검토가 남아 있다.

# 로컬 실행 문서 추가 (2026-07-23)

- 루트에 `LOCAL_RUN.md`를 추가했습니다.
- Windows에서 PC IPv4 주소를 확인하고 `lastcall-app-sdk54/src/config/api.ts` 한 곳에서 API 주소를 변경하는 방법을 기록했습니다.
- 환경변수를 사용한 Spring Boot 실행, Expo 실행, 휴대폰 Expo Go QR 접속, 종료 및 연결 문제 점검 절차를 정리했습니다.
- 문서 변경이므로 앱 및 서버 코드 테스트는 생략하고 `git diff --check`로 문서 공백 오류를 확인했습니다.

# 프로젝트 README 추가 (2026-07-23)

- 루트 `README.md`에 LastCall의 제작 목적, 주요 기능, 앱·서버 구성과 기술 스택을 정리했습니다.
- IP 변경, 백엔드 및 Expo 실행, 휴대폰 Expo Go 접속을 빠른 실행 순서로 안내했습니다.
- 상세 설정은 `LOCAL_RUN.md`로 연결하고 검증 명령과 기본 문제 해결 항목을 추가했습니다.

# 공개 라이선스 병원 사진 자동 조회 (2026-07-24)

- 병원별 공식 홈페이지 이미지를 수동 등록하는 방식 대신 Wikimedia Commons API에서 재사용 조건이 명시된 사진만 조회하도록 구현했습니다.
- 병원 좌표 반경 3km의 파일에서 병원명이 일치하는 사진을 먼저 찾고, 없으면 병원명과 주소로 재검색해 동명이원 오매칭 가능성을 낮췄습니다.
- CC0, Public Domain, CC BY, CC BY-SA 계열만 허용하고 비영리 전용 등 사용 조건이 맞지 않는 이미지는 제외합니다.
- 상세 화면에 저작자, 라이선스, Wikimedia Commons 출처 링크를 표시하며 이미지 URL 오류나 검색 결과가 없으면 기본 병원 아이콘으로 대체합니다.
- 검증: `npx.cmd tsc --noEmit` 성공, 변경 파일 ESLint 오류·경고 0, `git diff --check` 공백 오류 없음.
- 실제 Commons API에서 대전선병원 사진 2건의 썸네일, 저작자 `Bongsun`, `CC BY-SA 4.0` 메타데이터가 반환되는 것을 확인했습니다.

# 병원 유형별 기본 이미지 카드 (2026-07-24)

- 자유 라이선스 실제 사진이 없는 병원은 빈 영역 대신 어린이·소아, 여성, 대학병원, 일반 응급의료기관의 네 가지 테마로 구분한 기본 카드를 표시합니다.
- 기본 카드는 `@expo/vector-icons` 아이콘, 병원명, 주소에서 추출한 시·도/시·군·구를 함께 표시하며 별도의 이미지 파일을 추가하지 않아 앱 용량을 늘리지 않습니다.
- 실제 Commons 이미지가 있으면 기존처럼 사진과 저작자·라이선스·출처를 우선 표시하고, 이미지 로딩이 실패하면 즉시 유형별 기본 카드로 대체합니다.
- 검증: `npx.cmd tsc --noEmit`, 변경 파일 ESLint, `git diff --check` 모두 통과했습니다.

# AWS EC2 배포 준비 (2026-07-29)

- EC2 Ubuntu 24.04 서버에 SSH 연결을 확인했습니다.
- 프로젝트 설정은 Java 17, Maven Wrapper 3.9.16, Spring Boot 4.0.6으로 확인했습니다.
- EC2에 OpenJDK 17 JDK, MySQL, Nginx를 설치하고 MySQL과 Nginx를 부팅 시 자동 시작하도록 활성화했습니다.
- 검증: Java/Javac 17.0.19, Git 2.43.0, MySQL/Nginx `active`·`enabled`, Nginx 로컬 HTTP 200을 확인했습니다.
- t3.micro 메모리는 총 911MiB, 가용 약 205MiB이며 swap이 없어 Maven 빌드 전 1GiB swap 추가를 권장합니다.
- 기존 EBS에 1GiB `/swapfile`을 생성하고 `/etc/fstab`에 등록해 재부팅 후에도 활성화되도록 설정했습니다.
- GitHub 저장소를 EC2의 `/home/ubuntu/lastcall`에 clone했으며 `main` 브랜치, 커밋 `e0a818d`와 깨끗한 작업 트리를 확인했습니다.
- clone된 백엔드에서도 Java 17, Spring Boot 4.0.6, Maven Wrapper 3.9.16 설정을 재확인했습니다.

# 운영 배포 전 보안 강화 (2026-07-29)

- 공공데이터 API 호출을 HTTPS로 변경하고 API 키가 포함된 전체 요청 URL 로그 및 공개 `/emergency/api-test` 엔드포인트를 제거했습니다.
- 일반 댓글의 `isAdmin` 값을 서버에서 항상 `false`로 강제하고 클라이언트가 보낸 관리자 플래그를 JSON 역직렬화 단계에서도 무시하도록 설정했습니다.
- 게시글·댓글 비밀번호와 BCrypt 해시가 API 응답에 포함되지 않도록 직렬화를 제한했습니다.
- 게시글·댓글 삭제 비밀번호를 URL 쿼리에서 JSON 요청 본문으로 옮기고 모바일 앱 호출 형식을 함께 변경했습니다.
- 게시판 종류, 페이지 크기, 닉네임·제목·본문·비밀번호 길이 검증과 커뮤니티 쓰기 API 분당 요청 제한을 추가했습니다.
- Nginx 뒤에서 클라이언트 IP 기반 제한이 동작하도록 전달 헤더 처리 설정을 추가하고 관리자 인증 상태 맵의 만료 데이터 정리를 보강했습니다.
- 실제 기능으로 사용하는 `/emergency/basic-info-test`를 `/emergency/basic-info`로 변경하고 앱 호출부를 함께 수정했습니다.
- 검증: 서버 테스트 13개 통과, 앱 `npx.cmd tsc --noEmit` 통과, 변경 앱 파일 ESLint 통과, `git diff --check` 공백 오류 없음.
- 운영 환경에서 Spring Boot 8080 포트를 로컬호스트에만 바인딩할 수 있도록 `SERVER_ADDRESS` 환경변수 설정을 추가했습니다.
- 테스트 데이터가 포함된 기존 `sql` 파일 대신 재실행 가능하고 `likeCount`를 포함한 운영 전용 `lastcall-server/schema-production.sql`을 추가했습니다.
- EC2에 `/etc/lastcall/lastcall.env`를 root 소유 디렉터리 700·파일 600 권한으로 생성하고 DB/API/관리자 설정을 저장했습니다.
- 관리자 평문 비밀번호는 BCrypt cost 12 해시로 변환해 저장하고 원격 임시 비밀 파일과 프로비저닝 스크립트를 삭제했습니다.
- MySQL `lastcall` DB, `lastcall_app@localhost` 전용 계정과 운영 테이블 4개를 생성했으며 DB 비밀번호는 서버에서 무작위로 생성했습니다.
- EC2에서 `mvnw clean package`를 실행해 테스트 13개 통과 후 25MiB 운영 JAR을 생성했습니다.
- 임시 systemd 유닛으로 JAR을 실행해 `127.0.0.1:8080` 로컬 바인딩, Hikari MySQL 연결과 `/community/posts` HTTP 200을 확인한 뒤 시험 유닛을 중지했습니다.
- `/etc/systemd/system/lastcall.service`를 등록해 부팅 자동 시작과 실패 시 재시작을 활성화하고 JVM 최대 힙 384MiB·systemd 메모리 상한 650MiB 및 보안 강화 옵션을 적용했습니다.
- 검증: `lastcall.service`는 `enabled`·`active`, Java 메모리 약 150MiB, `127.0.0.1:8080` 바인딩 및 게시판 DB API HTTP 200을 확인했습니다.
- Nginx에서 퍼블릭 80 포트를 `127.0.0.1:8080`으로 프록시하고 실제 클라이언트 전달 헤더, 1MiB 요청 제한, 보안 헤더와 버전 숨김을 적용했습니다.
- 검증: Nginx 설정 검사 통과, 내부·퍼블릭 IP 게시판 API HTTP 200, Nginx/LastCall 서비스 `active`, Spring Boot 8080 로컬 바인딩을 확인했습니다.
- UFW를 활성화해 기본 인바운드를 차단하고 OpenSSH 22 및 Nginx HTTP/HTTPS 80·443만 허용했습니다.
- 퍼블릭 IP의 `/emergency/nearby`를 대전광역시 좌표로 실제 호출해 HTTP 200, 응급실 10건, 약 8KiB JSON 응답을 확인했습니다.
- 실제 호출 후 LastCall/Nginx 서비스는 `active`, journal 오류 없음, API 키 또는 공공 API 전체 URL 로그 노출 없음으로 확인했습니다.
- EC2에 Elastic IP `13.124.37.179`를 연결하고 `api.lastcall.kro.kr` A 레코드가 로컬·Cloudflare·Google DNS에서 새 IP로 해석되는 것을 확인했습니다.
- Let's Encrypt 인증서를 발급해 HTTP를 HTTPS로 리디렉션하고 외부 HTTPS 게시판 API 200, TLS 검증 성공, Certbot 자동 갱신 모의 시험 성공을 확인했습니다.
- 모바일 앱의 중앙 API 설정을 `https://api.lastcall.kro.kr`로 변경했습니다.

# Android APK 빌드 준비 (2026-07-29)

- 앱 표시 이름을 `살려줌`, 스킴을 `lastcall`, Android/iOS 식별자를 `com.snail5039.lastcall`로 설정했습니다.
- 위치 핀과 심박 하트를 결합한 전용 1024px 앱 아이콘을 생성해 기존 Expo 기본 아이콘 대신 적용했습니다.
- `eas.json`에 휴대폰 직접 설치용 `preview` APK와 Play Store용 `production` AAB 프로필을 추가했습니다.
- Expo를 SDK 54 권장 패치 `54.0.36`으로 업데이트했습니다.
- 검증: Expo Doctor 18/18 통과, TypeScript·Expo lint·`git diff --check` 통과.
- EAS CLI 21.4.0을 확인했으며 APK 빌드 시작 전 사용자 Expo 계정 로그인이 필요합니다.

# 다음 세션 인계 사항 (2026-07-29)

## 현재 운영 환경

- EC2: Ubuntu 24.04 / t3.micro / Elastic IP `13.124.37.179`
- SSH: `ubuntu@13.124.37.179`, 로컬 키 `lastcall-key.pem` 사용
- API 도메인: `https://api.lastcall.kro.kr`
- 백엔드: Java 17, MySQL, Nginx, systemd `lastcall.service`
- 방화벽: SSH 22, HTTP 80, HTTPS 443만 허용
- HTTPS: Let's Encrypt 적용, HTTP는 HTTPS로 리디렉션, Certbot 자동 갱신 시험 통과
- 환경변수 파일: 서버 `/etc/lastcall/lastcall.env` (root 전용 권한)
- 운영 API 검증: `/community/posts`, `/emergency/nearby` HTTPS 호출 HTTP 200 확인

## 저장소 및 앱 상태

- GitHub: `https://github.com/snail5039-code/lastcall.git`
- 백엔드: `lastcall-server`
- 모바일 앱: `lastcall-app-sdk54`
- 앱 API 주소는 `lastcall-app-sdk54/src/config/api.ts`의 `https://api.lastcall.kro.kr`
- 앱 이름: `살려줌`
- Android 패키지: `com.snail5039.lastcall`
- Expo SDK: 54.0.36
- 기존 앱 아이콘 `assets/images/app-icon-v2.png`를 계속 사용합니다.
- 새 v3 아이콘 시안은 사용하지 않으며 프로젝트에 남기지 않습니다.
- EAS `preview` 프로필은 설치 가능한 Android APK, `production` 프로필은 Play Store용 AAB입니다.
- 최근 앱 빌드 준비 커밋: `10b05d3 feat: prepare Android EAS builds`

## 검증 완료

- Expo Doctor 18/18 통과
- `npx tsc --noEmit` 통과
- `npx expo lint` 통과
- `git diff --check` 통과
- EAS CLI 21.4.0 확인

## 다음 세션에서 진행할 작업

1. 사용자가 만든 무료 Expo 계정으로 로컬 CLI 로그인:
   `cd C:\project\lastcall\lastcall-app-sdk54`
   `npx.cmd eas-cli@latest login`
2. `npx.cmd eas-cli@latest whoami`로 로그인 확인
3. EAS 프로젝트를 생성하거나 현재 Expo 프로젝트와 연결하고 생성된 `projectId`를 확인
4. `preview` 프로필로 Android APK 무료 빌드 시작
5. 빌드 완료까지 상태를 확인하고 APK 다운로드 주소 또는 로컬 설치 파일 전달
6. 실제 Android 휴대폰에 설치하여 위치 권한, 로그인, 게시판, 주변 응급실 API를 점검

## 비용 관련 메모

- Expo Free 플랜은 월 $0이며 현재 공식 안내 기준 Android 빌드 15회와 iOS 빌드 15회를 제공합니다.
- 무료 빌드는 낮은 우선순위 대기열을 사용합니다.
- 무료 한도 이후 유료 Starter 플랜으로 자동 전환하지 말고, 빌드를 멈춘 뒤 사용자가 직접 판단합니다.
- Google 계정으로 Expo에 가입·연결한 것만으로 결제되지 않습니다.
- Expo 아이디, 비밀번호 및 인증 토큰은 채팅이나 저장소에 기록하지 않습니다.

# EAS 로그인 상태 확인 (2026-07-29)

- `lastcall-app-sdk54`에서 `npx.cmd eas-cli@latest whoami`를 실행한 결과 `Not logged in`을 확인했습니다.
- 다음 단계인 EAS 프로젝트 연결과 Android `preview` APK 빌드는 사용자가 로컬 터미널에서 Expo 계정 로그인을 완료한 뒤 진행합니다.
- Expo 아이디, 비밀번호, 인증 토큰은 채팅이나 저장소에 입력하거나 기록하지 않습니다.

# EAS 프로젝트 연결 및 APK 빌드 제출 (2026-07-29)

- Expo 계정 `parkeui` 로그인을 확인했습니다.
- EAS 프로젝트 `@parkeui/lastcall`을 생성하고 앱에 연결했습니다.
- EAS 프로젝트 ID는 `a5413c56-d72f-4e2f-ba8f-bc4d440729ed`이며 `lastcall-app-sdk54/app.json`에 반영됐습니다.
- Android `preview` APK 빌드를 제출했습니다.
- 빌드 ID는 `6d58d891-7bb6-4728-a6e5-81d17761ace5`이며 현재 무료 빌드 대기열 `IN_QUEUE` 상태입니다.
- 동일 빌드를 계속 추적하며, 완료 후 APK 다운로드 주소를 확인하고 실제 Android 기기 검증을 진행합니다.

# Android preview APK 빌드 완료 (2026-07-29)

- EAS Android `preview` 빌드 `6d58d891-7bb6-4728-a6e5-81d17761ace5`가 `FINISHED`로 완료됐습니다.
- 설치용 APK가 생성됐으며 EAS 빌드 페이지와 아티팩트 주소에서 다운로드할 수 있습니다.
- 다음 단계는 실제 Android 휴대폰에 APK를 설치하고 위치 권한, 주변 응급실, 로그인, 게시판 기능을 점검하는 것입니다.

# Android 실기기 1차 점검 보완 (2026-07-29)

- 실기기에서 게시판 목록 불러오기 실패, 글쓰기 진입 차단, 지도 탭 진입 시 앱 종료, 앱 시작 직후 위치 권한 창 노출을 확인했습니다.
- 운영 API를 직접 확인한 결과 `/community/posts`와 `/emergency/nearby`는 HTTPS HTTP 200으로 정상 응답했습니다.
- 게시판 요청에 12초 제한과 일시 오류 1회 자동 재시도를 추가하고, 목록 조회가 실패해도 글쓰기와 수동 재시도가 가능하도록 오류 화면을 개선했습니다.
- 글 작성 요청에도 동일한 제한·재시도를 적용했습니다.
- 앱 실행 즉시 Android 위치 권한을 요청하지 않고, 위치 카드를 누르면 앱 안내 후 운영체제 권한을 요청하도록 변경했습니다.
- Google Maps 네이티브 설정이 없는 APK에서 발생할 수 있는 지도 크래시를 제거하기 위해 내장 지도를 안전한 거리순 응급실 목록으로 교체했습니다.
- 각 응급실에서 휴대폰 지도 앱 열기와 응급실 전화가 가능하며, 화면 상단에 119 확인 후 전화 기능과 병상 변동 경고를 추가했습니다.
- Android 업데이트 설치를 위해 `versionCode`를 2로 올렸습니다.
- 검증: `npx.cmd tsc --noEmit`, `npx.cmd expo lint` 통과.

# 응급 UI 및 지도 방향 보완 (2026-07-30)

- 홈 최상단에 위급 증상 안내와 확인 후 119 전화 기능을 배치해 응급 행동을 검색보다 우선하도록 UI를 재구성했습니다.
- 현재 위치 카드에 위치 공유 기능을 추가해 주소와 좌표 지도 링크를 보호자에게 전달할 수 있도록 했습니다.
- 하단 탭의 활성 색상과 글자 가독성을 보강하고 지도 탭 이름을 `주변 응급실`로 명확히 변경했습니다.
- 앱 진입 직후 위치 권한 창을 띄우지 않고 사용자가 위치 카드를 선택한 뒤 설명을 확인하고 권한을 요청하도록 유지했습니다.
- Google Maps 연동은 제외했습니다.
- 국내 내장 지도 후보를 검토한 결과 네이버 Maps의 Mobile Dynamic Map을 우선 후보로 정했습니다. 네이버 클라우드 Client ID 발급 및 Expo 네이티브 연결은 별도 단계로 진행합니다.
- 네이버 지도 연동 전까지 주변 응급실 거리순 목록, 병원 상세, 응급실 전화, 외부 지도 앱 연결을 제공하며 내장 지도 미설정으로 앱이 종료되지 않도록 했습니다.
- 추가 기능 검토 결과 현재 단계에서는 119 전화, 위치 공유, 의료정보 공유, 보호자 문자, 병상 갱신 경고, 응급처치 안내를 핵심 기능으로 유지합니다. AED 검색과 원격 푸시 알림은 신뢰 가능한 데이터·서버 발송 체계가 준비된 뒤 추가합니다.
- 검증: Expo 공개 설정 출력 정상, `npx.cmd tsc --noEmit`, `npx.cmd expo lint` 통과.

# 전체 기능 점검 및 안전 기능 추가 (2026-07-30)

- 앱 전체 화면·서비스와 서버 컨트롤러 API를 점검해 기존 기능과 추가 후보의 중복·운영 부담·개인정보 영향을 확인했습니다.
- 병원 상세 화면에 진입하면 최근 본 응급실을 기기에 최대 5곳까지 저장하도록 추가했습니다.
- 즐겨찾기 탭에서 최근 본 응급실을 다시 열거나 기록 전체를 삭제할 수 있습니다.
- 내 정보 화면에 `의료정보 + 현재 위치 긴급 공유`를 추가했습니다. 사용자가 직접 실행할 때만 위치를 확인하며, 위치를 확인하지 못해도 의료정보 공유는 가능합니다.
- 보호자 문자 외에 보호자 바로 전화 기능을 추가했습니다.
- 응급 대처 안내에 인터넷 연결 없이도 사용할 수 있는 119 전화·기기 저장 의료정보·응급처치 안내 범위를 명시했습니다.
- 기존 병상 갱신 경고, 응급실 전화, 위치 공유, 의료정보 보안 저장, 신고 관리, 공지사항 기능은 중복 추가하지 않고 유지했습니다.
- AED 검색은 신뢰 가능한 공공데이터 API가 확정되기 전까지 보류하고, 원격 푸시는 서버 발송·수신 동의·토큰 관리 체계가 필요해 이번 범위에서 제외했습니다.
- 검증: `npx.cmd tsc --noEmit`, `npx.cmd expo lint`, Android `expo export` 성공, `git diff --check` 통과.
- 운영 API 확인: `/community/posts`, `/emergency/nearby` HTTPS HTTP 200.

# 다음 작업 확정 (2026-07-30)

- 네이버 지도를 앱 내부 지도 화면으로 연동합니다.
- 사용자가 발급받을 AED 공공데이터 API를 확인한 뒤 현재 위치 기반 AED 검색을 추가합니다.
- AED API 실제 응답 필드, 이용약관, 호출 한도와 갱신 시각을 먼저 확인하고 앱 요청·서버 중계·화면 표시를 함께 구현합니다.
- 지도와 AED 기능까지 완료한 뒤 Android `versionCode 2` preview APK를 한 번만 빌드합니다.
- 오늘은 무료 EAS 빌드를 추가로 제출하지 않습니다.

# AED 준비 화면 추가 (2026-07-30)

- 홈 화면에 `주변 AED 찾기` 진입 버튼을 추가했습니다.
- 공공데이터포털 전환 작업으로 OpenAPI 활용신청·인증키 발급이 제한된 현재 상태를 안내하는 AED 준비 화면을 추가했습니다.
- 준비 화면에서도 119 전화와 응급 대처 안내를 즉시 사용할 수 있습니다.
- 향후 제공할 현재 위치 기반 거리순 AED, 지도 표시, 운영시간, 설치기관·관리기관·상세 위치 기능을 미리 안내합니다.
- 실제 AED API 연동 후 동일 화면을 목록·지도 화면으로 교체합니다.

# 네이버 지도 연동 진행 (2026-07-30)

- 네이버 클라우드 Maps Application `lastcall`과 Android 패키지 `com.snail5039.lastcall` 등록을 완료했습니다.
- Dynamic Map의 한도 초과 사용은 기본값 `허용안함`으로 확인해 무료 한도 초과 과금을 차단했습니다.
- Expo SDK 54용 `@mj-studio/react-native-naver-map`과 `expo-build-properties`를 설치했습니다.
- 네이버 지도 Client ID와 네이버 Maven 저장소를 Expo 네이티브 빌드 설정에 연결했습니다.
- 주변 응급실 화면에 네이버 내장 지도, 현재 위치 마커, 응급실 마커, 병상 상태별 색상, 병원 상세 진입을 추가했습니다.
- 더 이상 사용하지 않는 Google 지도용 `react-native-maps` 패키지를 제거했습니다.
- 검증: Expo prebuild 설정 출력 정상, `npx.cmd tsc --noEmit`, `npx.cmd expo lint`, `git diff --check` 통과.
- Expo Doctor 18/18 검사를 통과했습니다.
- `versionCode 2` EAS APK 제출 명령은 중간에 중단됐으며, 최근 빌드 목록 확인 결과 새 빌드는 생성되지 않았습니다.

# 빌드 제출 전 웹 실행 검증 (2026-07-30)

- 사용자의 요청에 따라 EAS APK/AAB 빌드는 제출하지 않았습니다.
- 모바일 크기 웹 실행 화면에서 홈, AED 준비 화면, 지도 웹 안내 화면, 자유게시판 목록과 글쓰기 진입을 확인했습니다.
- 게시판 테스트 중 실제 게시글 등록은 서버 데이터를 변경하므로 수행하지 않았습니다.
- 브라우저 콘솔 오류는 발견되지 않았습니다.
- 웹 지도 안내 화면의 깨진 한글 문구를 수정했습니다.
- 네이버 지도는 네이티브 모듈이므로 웹과 Expo Go에서는 실제 지도를 검증할 수 없으며, 네이버 지도 모듈을 포함한 새 Android 빌드에서 실기기 검증이 필요합니다.
- 검증: `npx.cmd tsc --noEmit`, `npx.cmd expo lint`, `git diff --check` 통과.

# versionCode 2 빌드 제출 전 전체 재검증 (2026-07-30)

- 사용자의 최종 허락 전에는 EAS 빌드를 제출하지 않기로 했으며, 이번 점검에서도 새 빌드를 생성하지 않았습니다.
- 앱 검증: TypeScript, Expo ESLint, Expo Doctor 18/18, Expo 공개 설정 출력, Android 번들 생성, `git diff --check` 통과.
- 서버 검증: Maven 테스트 13개 전부 통과(실패·오류·건너뜀 0), Spring Boot 애플리케이션 컨텍스트 기동 성공.
- 운영 API 검증: 앱과 동일한 파라미터로 `/community/posts`와 `/emergency/nearby` 모두 HTTPS HTTP 200 응답 확인.
- 실행 화면 검증: 홈, 공지사항, 자유게시판, 건의사항, Q&A, 게시글 작성 진입, 응급 대처 안내, AED 준비 화면, 주변 응급실 검색 결과, 병원 상세, 즐겨찾기 빈 상태, 최근 본 응급실 저장·삭제를 확인했습니다.
- 실제 게시글 등록, 전화, 문자, 외부 지도, 공유 전송은 외부 상태 변경을 피하기 위해 마지막 실행 버튼을 누르지 않았습니다.
- 병원 상세에서 지원되지 않는 FontAwesome6 `scalpel` 아이콘 경고를 발견해 지원되는 `user-doctor`와 `hospital` 아이콘으로 교체했습니다.
- React Native Web의 `shadow*`와 `pointerEvents` 사용 중단 경고만 남아 있으며 Android 앱 기능 오류와는 무관합니다.
- 네이버 지도 네이티브 화면은 웹과 기존 APK에서 실행할 수 없으므로 새 APK 생성 후 실제 Android 기기에서 최종 확인해야 합니다.

# Android versionCode 2 Preview APK 빌드 제출 (2026-07-30)

- 사용자의 명시적 허락을 받은 뒤 Android `preview` APK 빌드를 EAS에 제출했습니다.
- 빌드 ID: `c3b781d4-7fd0-4fd9-b657-2cc301df971b`
- 앱 버전: `1.0.0`, Android `versionCode 2`
- 제출 계정: `parkeui`
- 현재 상태: `IN_PROGRESS`
- 이 빌드는 내부 테스트용 APK이며 Google Play 스토어 제출은 진행하지 않았습니다.

# Android versionCode 2 Preview APK 빌드 완료 (2026-07-30)

- 빌드 `c3b781d4-7fd0-4fd9-b657-2cc301df971b`가 `FINISHED`로 완료됐습니다.
- 생성된 APK를 Android 휴대폰에 설치해 네이버 지도, 위치 권한, 응급실 검색, 게시판과 추가 안전 기능을 최종 확인합니다.

# versionCode 2 실기기 오류 보완 (2026-07-30)

- 실기기에서 게시판 목록 조회 실패, 관리자 신고 목록 오류, 하단 탭과 Android 시스템 내비게이션 영역 중첩을 확인했습니다.
- 운영 Nginx 접근 로그에서 같은 APK의 게시글 작성·댓글·응급실 요청은 정상 도착했지만 게시판 목록 GET 요청만 서버에 도착하지 않은 것을 확인했습니다.
- 게시판 목록 요청 직전 Android 배포 환경에서 예외 가능성이 있는 `console.time`·`console.timeEnd` 계측을 제거하고 요청 흐름을 단순화했습니다.
- 관리자 만료 세션의 `ResponseStatusException(401)`이 공통 예외 처리기에 의해 500으로 변환되던 서버 오류를 수정하고 회귀 테스트를 추가했습니다.
- 운영 서버에 수정 JAR을 배포하고 `lastcall.service` 재기동 후 게시판 HTTP 200, 잘못된 관리자 토큰 HTTP 401, 서비스 `active`를 확인했습니다.
- 관리자 앱 목록 조회에 제한 시간·재시도를 적용하고 401·403 응답 시 저장된 토큰을 지운 뒤 재로그인하도록 보강했습니다.
- 하단 탭 높이와 아래쪽 패딩에 `useSafeAreaInsets()`의 Android 시스템 안전영역을 반영했습니다.
- 다음 APK를 기존 v2 위에 업데이트 설치할 수 있도록 Android `versionCode`를 3으로 올렸습니다.
- 검증: 앱 TypeScript·Expo lint·Android 번들·`git diff --check` 통과, 서버 테스트 14개 전부 통과.
- versionCode 3 EAS 빌드는 사용자의 허락 전까지 제출하지 않습니다.

# Android versionCode 3 Preview APK 빌드 제출 (2026-07-30)

- 사용자의 명시적 허락을 받은 뒤 게시판·관리자·하단 안전영역 수정이 포함된 Android `preview` APK를 제출했습니다.
- 빌드 ID: `8b6429a8-6348-4d70-882e-79a38a138120`
- 앱 버전: `1.0.0`, Android `versionCode 3`
- 현재 상태: `IN_PROGRESS`
- 내부 실기기 테스트용 APK이며 Google Play 스토어 제출은 진행하지 않았습니다.

# Android versionCode 3 Preview APK 빌드 완료 (2026-07-30)

- 빌드 `8b6429a8-6348-4d70-882e-79a38a138120`가 `FINISHED`로 완료됐습니다.
- 생성된 APK를 v2 위에 업데이트 설치하고 게시판 목록, 관리자 재로그인, 하단 시스템 안전영역을 우선 확인합니다.

# Google Play 출시 전 정책·법률 점검 (2026-07-30)

- 앱의 실제 데이터 흐름과 Google Play 사용자 데이터·건강 콘텐츠·UGC 정책, 개인정보 보호법, 위치정보법, 공공데이터 이용조건을 대조했습니다.
- 공익·무료 목적이어도 Google Play 정책과 개인정보·위치정보 관련 의무가 자동 면제되지는 않습니다.
- 출시 전 필수 보완 대상으로 공개 개인정보처리방침 URL과 앱 내 링크, 게시판 이용약관 동의 및 사용자/콘텐츠 차단 기능, 운영 주체 실명·연락처 정비를 확인했습니다.
- 현재 위치 좌표가 응급실 API 요청의 쿼리 문자열로 서버와 Nginx 접근 로그에 남을 수 있어, 앱의 "서버에 영구 저장하지 않음" 안내와 실제 처리가 일치하지 않을 위험을 확인했습니다. 쿼리 로그 비식별화 또는 정확한 보유기간 공개가 필요합니다.
- 위치기반서비스사업 신고 대상 여부는 운영자 지위와 서비스 개시일을 기준으로 관할 기관에 최종 확인해야 합니다. 소상공인·1인 창조기업도 계속 운영 시 법정 기한 내 신고 규정이 있습니다.
- Play Console에서 Data safety, Health apps declaration, 콘텐츠 등급, 타깃 연령을 실제 처리 내용에 맞게 제출해야 합니다.
- 공공데이터별 공공누리 유형을 다시 확인하고, 앱에 제공기관·출처·갱신시각을 명확히 표시하는 보완을 권고합니다.

# 법적 안내 HTML 및 앱 연결 (2026-07-30)

- `docs/index.html`에 개인정보처리방침, 위치기반서비스 이용약관, 커뮤니티 운영정책, 의료 면책·공공데이터 출처, 문의 안내를 단일 반응형 페이지로 작성했습니다.
- 운영자는 박의혁, 공개 문의 수단은 `snail5039@gmail.com`, 전화번호는 비공개, 시행 예정은 2026년 8월 출시일로 반영했습니다.
- 앱의 `내 정보` 화면에 개인정보처리방침 및 서비스 정책 링크를 추가했습니다.
- 기본 공개 주소는 `https://snail5039-code.github.io/lastcall/`이며 `EXPO_PUBLIC_LEGAL_PAGE_URL` 환경변수로 변경할 수 있습니다.
- 위치정보 정책의 기본 운영자·연락처를 새 공개 정보에 맞게 변경했습니다.
- TypeScript 검사, Expo lint, HTML 필수 섹션 검사, `git diff --check`를 통과했습니다.
- 외부 공개를 위해 저장소 반영 후 GitHub Pages의 배포 원본을 기본 브랜치 `/docs`로 활성화해야 합니다.

# GitHub Pages 정책 페이지 공개 (2026-07-30)

- 정책 HTML만 별도 커밋(`3f6802f`, `docs: publish service policies`)하여 `origin/main`에 푸시했습니다.
- GitHub Pages 배포 원본을 `main` 브랜치의 `/docs` 폴더로 설정하고 HTTPS가 적용된 것을 확인했습니다.
- 공개 주소 `https://snail5039-code.github.io/lastcall/`에서 개인정보처리방침, 위치서비스 약관, 커뮤니티 정책, 의료·데이터 안내와 운영자 문의 정보가 정상 출력되는 것을 확인했습니다.
- 앱의 정책 버튼 연결 코드는 로컬 변경에 포함되어 있으며 다음 앱 출시 빌드에 반영해야 합니다.

# Google Play 출시 전 필수 보완 구현 (2026-07-30)

- 최초 이용 화면에서 의료·공공데이터 안전 고지와 위치정보 동의를 분리했습니다. 위치 동의는 선택 사항이며 거부해도 앱이 종료되지 않고 지역 직접 검색을 이용할 수 있습니다.
- 위치 기능을 나중에 처음 실행할 때 처리 목적, 서버 전송, DB 미보관, 거부 시 수동 검색 가능 여부를 다시 고지하고 동의를 받도록 변경했습니다.
- 개인정보처리방침과 서비스 정책 전문을 최초 이용 화면과 `내 정보` 화면에서 공개 GitHub Pages 주소로 열 수 있게 연결했습니다.
- 게시글과 댓글 등록 전에 커뮤니티 운영정책을 명시적으로 확인하도록 체크 항목과 정책 전문 링크를 추가했습니다.
- 이용자가 게시글 또는 동일 닉네임 작성자를 현재 기기에서 숨길 수 있게 했고, 게시판에서 숨김 목록을 초기화할 수 있게 했습니다.
- 응급실 정보 출처를 홈 화면에 표시하고, 병상 수가 양수라는 이유만으로 실제 수용을 보장하는 것처럼 보이지 않도록 결과 배지를 `수용 가능`에서 `병상 있음`으로 변경했습니다.
- 운영 Nginx에 쿼리 문자열을 제외하는 `lastcall_noargs` 접근 로그 형식을 적용했습니다. 테스트 좌표 요청 후 로그에 `/emergency/nearby` 경로만 기록되고 위도·경도 값은 남지 않는 것을 확인했습니다.
- 운영 접근 로그는 기존 logrotate 설정에 따라 매일 순환하고 14개를 보관하므로 공개 정책의 최대 30일 이내 보관 조건을 충족합니다.
- 재현 가능한 Nginx 설정을 `ops/nginx`에 추가하고 운영 설정 원본은 `/etc/nginx/sites-available/lastcall.bak-20260730`으로 백업했습니다.
- 검증: TypeScript, Expo lint, Android Expo export, `git diff --check` 통과.
- 서버 검증: Maven 테스트 14개 통과, 운영 `/emergency/nearby` 실제 호출 HTTP 200, Nginx 설정 검사 및 서비스 상태 `active`.

# Android versionCode 4 테스트 APK 빌드 제출 (2026-07-30)

- 위치 선택권, 정책 링크, 커뮤니티 동의·숨김, 데이터 출처 표시가 포함된 Android `preview` APK 빌드를 제출했습니다.
- 앱 버전 `1.0.0`, Android `versionCode 4`.
- EAS 빌드 ID: `6bc07518-1327-488d-98f6-3962503c107c`.
- 내부 실기기 테스트용 APK이며 Google Play용 AAB 제출은 진행하지 않았습니다.

# Android versionCode 4 테스트 APK 빌드 완료 (2026-07-30)

- EAS 빌드 `6bc07518-1327-488d-98f6-3962503c107c`가 `FINISHED`로 완료됐습니다.
- APK 다운로드: `https://expo.dev/artifacts/eas/OUWuoWvh_FiGs6-A38Hgj9JPbJinb5Y9qzSOlGk1GHs.apk`
- 기존 v3 위에 업데이트 설치한 뒤 위치 없이 시작, 위치 재동의, 정책 링크, 게시판 운영정책 동의, 게시글·작성자 숨김과 숨김 초기화, 공공데이터 출처 표시를 실기기에서 확인합니다.
# 전체 변경사항 커밋 및 APK 보관 준비 (2026-07-31)

- 앱의 지도, AED 준비 화면, 게시판 안정화, 최근 본 응급실, 정책 연결 및 모바일 UI 보완 변경사항을 최종 커밋 대상으로 확인했습니다.
- Android 테스트 APK `application-6bc07518-1327-488d-98f6-3962503c107c.apk`는 약 181MB로 GitHub 일반 파일 제한(100MB)을 초과하므로 Git 이력 대신 동일 커밋의 GitHub Release 첨부파일로 보관합니다.
- 앱 검증:
  - `npx.cmd tsc --noEmit` 통과
  - `npx.cmd expo lint` 통과
- 서버 검증:
  - Maven 테스트 14개 통과
  - 실패 0, 오류 0, 건너뜀 0
- `git diff --check` 공백 오류 없음.

# README APK 다운로드 안내 추가 (2026-07-31)

- 루트 `README.md`에 GitHub Release에서 Android 테스트 APK를 내려받고 설치하는 순서를 추가했습니다.
- `v1.0.0-rc4` Release 페이지와 APK 직접 다운로드 링크를 함께 제공했습니다.
- 해당 APK가 Google Play 제출용 AAB 또는 정식 출시 버전이 아닌 테스트 파일임을 명시했습니다.

# LastCall 프로젝트 소개서 제작 (2026-08-03)

- 참고용 WorkLog 소개서의 A4 포트폴리오 구성을 바탕으로 LastCall 프로젝트 소개서 HTML과 PDF를 제작했습니다.
- `README.md`, `WORK_PROGRESS.md`, 앱·서버 설정과 핵심 컨트롤러를 확인해 프로젝트 목표, 주요 기능, 시스템 구성, 안전·보안 판단, 개발 과정과 검증 결과를 정리했습니다.
- 홈과 응급실 검색 결과 화면, 앱 아이콘을 포함하고 AED는 준비 화면 단계이며 APK는 내부 테스트 릴리스라는 현재 범위를 명시했습니다.
- 결과물: `output/pdf/LastCall_프로젝트_소개서.html`, `output/pdf/LastCall_프로젝트_소개서.pdf`
- 검증: PDF A4 2페이지 확인, 페이지별 PNG 렌더링 시 한글·이미지·레이아웃 잘림 없음, PDF 텍스트 추출 및 `git diff --check` 확인.

## 소개서 이미지 표시 수정 (2026-08-03)

- HTML 파일을 단독으로 열어도 앱 아이콘과 화면 이미지가 깨지지 않도록 PNG 3개를 데이터 URI로 문서 안에 포함했습니다.
- 앱 화면 이미지의 `object-fit`을 `cover`에서 `contain`으로 변경해 화면 전체가 비율을 유지하며 보이도록 수정했습니다.
- PDF를 다시 출력하고 A4 2페이지 PNG 렌더링에서 아이콘과 앱 화면이 잘리지 않는 것을 확인했습니다.
