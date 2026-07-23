# LastCall

LastCall은 현재 위치와 검색 조건을 바탕으로 주변 응급실 정보를 확인하고, 필요한 의료 정보를 빠르게 찾아볼 수 있도록 만든 모바일 앱 프로젝트입니다. 응급 상황에서 병원 정보를 찾는 과정을 줄이고, 지도·검색·즐겨찾기·커뮤니티 기능을 한곳에서 제공하는 것이 목적입니다.

> LastCall이 제공하는 정보는 실제 의료진의 판단이나 119의 안내를 대신하지 않습니다. 위급한 상황에서는 즉시 119에 연락하세요.

## 주요 기능

- 현재 위치 주변 응급실 조회
- 지역, 병상 및 진료 조건을 이용한 병원 검색과 필터링
- 지도와 목록을 통한 병원 위치 확인
- 병원 상세 정보 및 즐겨찾기 관리
- 응급 상황 행동 요령과 사용자 의료 정보 저장
- 게시글, 댓글, 좋아요 및 신고를 지원하는 커뮤니티
- 신고 내역을 처리하는 관리자 기능

응급실 정보는 국립중앙의료원 공공데이터 API를 백엔드에서 조회해 앱으로 전달합니다.

## 프로젝트 구성

```text
lastcall/
├── lastcall-app-sdk54/   # Expo SDK 54 / React Native 모바일 앱
├── lastcall-server/      # Spring Boot 4 / Java 17 백엔드
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
- 국립중앙의료원 공공데이터 API 키
- 휴대폰의 Expo Go 앱
- 동일한 Wi-Fi에 연결된 개발 PC와 휴대폰

API 키와 DB 비밀번호는 소스에 작성하지 않고 환경변수로 설정합니다.

## 빠른 실행 방법

### 1. PC IP 설정

PowerShell에서 `ipconfig`를 실행하고 현재 Wi-Fi의 IPv4 주소를 확인합니다. 앱의 백엔드 주소는 다음 파일 한 곳에서만 관리합니다.

```text
lastcall-app-sdk54/src/config/api.ts
```

예를 들어 PC IP가 `192.168.0.25`라면 다음과 같이 변경합니다.

```ts
export const API_BASE_URL = "http://192.168.0.25:8080";
```

휴대폰에서는 `localhost`가 PC가 아닌 휴대폰 자체를 의미하므로 반드시 PC의 실제 IPv4 주소를 사용해야 합니다.

### 2. 백엔드 실행

첫 번째 PowerShell 창에서 실행합니다.

```powershell
cd C:\project\lastcall\lastcall-server

$env:SPRING_PROFILES_ACTIVE="default"
$env:DB_URL="jdbc:mysql://localhost:3306/lastcall"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="본인의_MYSQL_비밀번호"
$env:EMERGENCY_API_KEY="본인의_공공데이터_API_키"

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
5. 주변 병원 조회, 검색, 지도 등의 기능을 확인합니다.

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

- 앱에서 서버에 연결되지 않으면 `api.ts`의 IP, 동일 Wi-Fi 연결 여부, Windows 방화벽을 확인합니다.
- 백엔드는 `8080`, Expo 개발 서버는 `8081`, MySQL은 기본적으로 `3306` 포트를 사용합니다.
- Expo 변경 사항이 보이지 않으면 `npx expo start --clear`로 캐시를 비우고 다시 시작합니다.
- MySQL 오류가 발생하면 MySQL 실행 여부와 `lastcall` 데이터베이스, 계정 정보를 확인합니다.
- 네트워크가 바뀌면 `ipconfig`로 새 IP를 확인하고 `api.ts`를 다시 수정합니다.

## 문서

- [상세 로컬 실행 방법](./LOCAL_RUN.md)
- [작업 진행 및 검증 기록](./WORK_PROGRESS.md)
