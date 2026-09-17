# LastCall

LastCall은 현재 위치와 검색 조건을 바탕으로 주변 응급실 정보를 확인하고, 필요한 의료 정보를 빠르게 찾아볼 수 있도록 만든 모바일 앱 프로젝트입니다. 응급 상황에서 병원 정보를 찾는 과정을 줄이고, 지도·검색·즐겨찾기·커뮤니티 기능을 한곳에서 제공하는 것이 목적입니다.

> LastCall이 제공하는 정보는 실제 의료진의 판단이나 119의 안내를 대신하지 않습니다. 위급한 상황에서는 즉시 119에 연락하세요.

## 운영 현황 (배포 중단)

| 구분 | 내용 |
| --- | --- |
| 운영 기간 | 2026년 7월 29일 ~ 2026년 9월 16일 |
| 현재 상태 | **배포 중단** |
| 중단 대상 | 운영 API 서버 `https://api.lastcall.kro.kr` (AWS EC2 + Nginx + systemd), 운영 MySQL |

2026년 7월 29일 EC2에 백엔드를 올려 HTTPS로 서비스했고, 2026년 9월 16일자로 운영 서버를 내렸습니다. 현재는 코드만 저장소에 유지되는 상태입니다.

배포 중단으로 달라지는 점은 다음과 같습니다.

- 앱의 서버 연동 기능(응급실 검색, AED 검색, 커뮤니티, 관리자)은 배포된 테스트 APK에서 더 이상 동작하지 않습니다. 위치 권한 안내, 응급 행동 요령, 내 의료 정보처럼 기기 안에서 처리되는 기능은 그대로 동작합니다.
- 전체 기능을 확인하려면 아래 [로컬 실행](#빠른-실행-방법) 순서대로 백엔드를 직접 띄우고, 앱의 서버 주소를 로컬 주소로 바꿔야 합니다.
- 개인정보처리방침과 서비스 정책 페이지는 GitHub Pages(`https://snail5039-code.github.io/lastcall/`)에 있어 운영 서버 중단과 무관하게 유지됩니다.

## 주요 기능

### 응급실

- 현재 위치 기준 주변 응급실 조회와 가까운 순 정렬
- 시·도와 시·군·구, 병상 및 진료 조건을 이용한 검색과 필터링 (광주·전남 통합 시·도 대응)
- 지도와 목록으로 위치 확인, 카카오맵 길안내 연결
- 병원 상세 정보, 즐겨찾기, 최근 본 응급실
- 병상 수를 알 수 없을 때 여유 있는 것으로 보이지 않도록 `확인 필요`로 구분 표시
- 공공데이터 라이선스를 확인한 병원 이미지 조회

### AED (자동심장충격기)

- 시·도와 시·군·구를 선택해 해당 범위의 AED를 현재 위치에서 가까운 순으로 조회
- 설치 상세 위치, 당일 운영시간, 지도 앱 연결
- 시·군·구 단위 페이지 수집으로 대량 데이터(시·군·구 최대 1,100대 이상) 전부 조회

### 안전과 개인정보

- 최초 실행 동의 화면에서 의료·공공데이터 고지와 위치정보 동의를 분리, 위치를 거부해도 지역 직접 검색 사용 가능
- 응급 상황 행동 요령과 사용자 의료 정보의 기기 내 저장
- 현재 위치와 의료 정보 공유 (실패 시 사용자에게 알림)
- 앱 안에서 개인정보처리방침과 서비스 정책 전문 열기
- 응급실 정보의 공공데이터 출처 표시

### 커뮤니티

- 게시글, 댓글, 좋아요 및 신고
- 게시 전 커뮤니티 운영정책 확인, 게시글·작성자 기기 내 숨김과 숨김 목록 초기화
- 신고 내역을 처리하는 관리자 기능

### 앱 환경

- 모든 화면의 다크 모드 지원과 홈 화면에서의 테마 전환 (시스템 / 라이트 / 다크)
- 응급 상황의 정보 우선순위에 맞춘 색·타이포 시스템
- 모든 화면에서 유지되는 하단 탭 바와 Android 시스템 내비게이션 안전영역 반영
- 스크린리더용 이름·역할 지정과 최소 48px 터치 영역
- 서버 주소를 `EXPO_PUBLIC_API_BASE_URL` 환경변수로 교체 가능

응급실과 AED 정보는 국립중앙의료원 공공데이터 API를 백엔드에서 조회해 앱으로 전달합니다.

## Android 테스트 APK

테스트용 Android APK는 GitHub Release에 남아 있습니다.

- [v1.0.0-rc4 Release 페이지](https://github.com/snail5039-code/lastcall/releases/tag/v1.0.0-rc4)
- [APK 바로 다운로드](https://github.com/snail5039-code/lastcall/releases/download/v1.0.0-rc4/application-6bc07518-1327-488d-98f6-3962503c107c.apk)

> 이 APK는 운영 서버 주소가 박혀 있는 테스트 빌드입니다. 2026년 9월 16일 배포 중단 이후에는 응급실·AED 검색과 게시판이 동작하지 않습니다. Google Play 제출용 AAB 또는 정식 출시 버전도 아닙니다. 기능을 직접 확인하려면 아래 로컬 실행을 이용하세요.

## 프로젝트 구성

```text
lastcall/
├── lastcall-app-sdk54/   # Expo SDK 54 / React Native 모바일 앱
├── lastcall-server/      # Spring Boot 4 / Java 17 백엔드
├── docs/                 # GitHub Pages 정책 페이지
├── ops/                  # 운영 Nginx 설정 원본
├── LOCAL_RUN.md          # 상세 로컬 실행 안내
├── WORK_PROGRESS.md      # 작업 및 검증 기록
└── README.md
```

| 구분 | 사용 기술 | 기본 포트 |
| --- | --- | --- |
| 모바일 앱 | Expo SDK 54, React Native, TypeScript | 8081 |
| 백엔드 | Spring Boot 4, Java 17, MyBatis | 8080 |
| 데이터베이스 | MySQL | 3306 |

## 로컬 실행 전 준비

- Java 17 이상
- Node.js와 npm
- MySQL
- 국립중앙의료원 공공데이터 API 키 (응급실, AED)
- 휴대폰의 Expo Go 앱
- 동일한 Wi-Fi에 연결된 개발 PC와 휴대폰

API 키와 DB 비밀번호는 소스에 작성하지 않고 환경변수로 설정합니다.

## 빠른 실행 방법

### 1. 서버 주소 설정

앱의 서버 주소 기본값은 중단된 운영 서버(`https://api.lastcall.kro.kr`)입니다. 로컬 백엔드에 붙이려면 환경변수로 덮어씁니다.

PowerShell에서 `ipconfig`를 실행해 현재 Wi-Fi의 IPv4 주소를 확인하고, 다음 파일을 만듭니다.

```text
lastcall-app-sdk54/.env.development
```

예를 들어 PC IP가 `192.168.0.25`라면 다음 한 줄을 넣고 Expo를 다시 시작합니다.

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.25:8080
```

휴대폰에서는 `localhost`가 PC가 아닌 휴대폰 자체를 의미하므로 반드시 PC의 실제 IPv4 주소를 사용해야 합니다. `.env`가 아닌 `.env.development`에 넣어야 `expo export`와 EAS 빌드 결과물에 로컬 주소가 섞이지 않습니다. 기본값 자체는 `lastcall-app-sdk54/src/config/api.ts` 한 곳에서만 관리합니다.

### 2. 백엔드 실행

첫 번째 PowerShell 창에서 실행합니다.

```powershell
cd C:\project\lastcall\lastcall-server

$env:SPRING_PROFILES_ACTIVE="default"
$env:DB_URL="jdbc:mysql://localhost:3306/lastcall"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="본인의_MYSQL_비밀번호"
$env:EMERGENCY_API_KEY="본인의_공공데이터_API_키"
$env:ADMIN_USERNAME="추측하기_어려운_관리자_아이디"
$env:ADMIN_PASSWORD_HASH='$2y$12$생성된_BCrypt_해시'

.\mvnw.cmd spring-boot:run
```

서버가 정상적으로 시작되면 `8080` 포트에서 요청을 받습니다.

### 3. Expo 앱 실행

백엔드를 켜둔 상태에서 두 번째 PowerShell 창을 엽니다. 최초 실행이라면 `npm install`부터 실행합니다.

```powershell
cd C:\project\lastcall\lastcall-app-sdk54
npm install
npx expo start
```

### 4. 휴대폰에서 사용

1. 개발 PC와 휴대폰을 같은 Wi-Fi에 연결합니다.
2. 휴대폰에서 Expo Go를 실행합니다.
3. Expo 터미널에 표시된 QR 코드를 스캔합니다.
4. 앱이 열리면 안내 내용을 확인하고 위치 권한을 허용합니다.
5. 주변 병원 조회, 검색, 지도, AED 검색 등의 기능을 확인합니다.

환경 설정, MySQL 초기 구성, 관리자 계정, 종료 방법 및 연결 오류 해결 방법은 [상세 로컬 실행 안내](./LOCAL_RUN.md)를 참고하세요.

## 개발 시 확인 사항

앱 검증:

```powershell
cd C:\project\lastcall\lastcall-app-sdk54
npx expo lint
npx tsc --noEmit
```

서버 검증:

```powershell
cd C:\project\lastcall\lastcall-server
.\mvnw.cmd test
```

전체 변경의 공백 오류 확인:

```powershell
cd C:\project\lastcall
git diff --check
```

변경 내용과 검증 결과는 루트의 `WORK_PROGRESS.md`에 기록합니다.

## 문제 해결

- 앱에서 서버에 연결되지 않으면 `.env.development`의 IP, 동일 Wi-Fi 연결 여부, Windows 방화벽을 확인합니다. 운영 서버는 중단되었으므로 기본 주소로는 연결되지 않습니다.
- 백엔드는 `8080`, Expo 개발 서버는 `8081`, MySQL은 기본적으로 `3306` 포트를 사용합니다.
- Expo 변경 사항이 보이지 않으면 `npx expo start --clear`로 캐시를 비우고 다시 시작합니다.
- MySQL 오류가 발생하면 MySQL 실행 여부와 `lastcall` 데이터베이스, 계정 정보를 확인합니다.
- 네트워크가 바뀌면 `ipconfig`로 새 IP를 확인하고 `.env.development`를 다시 수정한 뒤 Expo를 재시작합니다.

## 문서

- [상세 로컬 실행 방법](./LOCAL_RUN.md)
- [작업 진행 및 검증 기록](./WORK_PROGRESS.md)
- [개인정보처리방침 및 서비스 정책](https://snail5039-code.github.io/lastcall/)
