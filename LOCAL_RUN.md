# LastCall 로컬 실행 방법

이 문서는 Windows PC에서 Spring Boot 백엔드와 Expo 앱을 실행하고, 같은 Wi-Fi에 연결된 휴대폰의 Expo Go로 확인하는 방법을 설명합니다.

## 1. 준비물

- Java 17 이상
- Node.js와 npm
- MySQL
- 휴대폰의 Expo Go 앱
- 개발 PC와 휴대폰이 연결된 동일한 Wi-Fi 네트워크

처음 한 번 앱 패키지를 설치합니다.

```powershell
cd C:\project\lastcall\lastcall-app-sdk54
npm install
```

MySQL에는 `lastcall` 데이터베이스가 필요합니다. 최초 구성 시 `lastcall-server\sql` 파일의 테이블 생성 SQL도 실행합니다.

## 2. PC의 IP 주소 확인 및 앱 주소 변경

PowerShell에서 다음 명령을 실행합니다.

```powershell
ipconfig
```

현재 사용 중인 Wi-Fi 어댑터의 `IPv4 주소`를 확인합니다. 예를 들어 주소가 `192.168.0.25`라면 아래 파일만 수정합니다.

- `lastcall-app-sdk54/src/config/api.ts`

```ts
export const API_BASE_URL = "http://192.168.0.25:8080";
```

`localhost`나 `127.0.0.1`을 입력하면 휴대폰 자기 자신을 가리키므로 실제 휴대폰 테스트에서는 사용할 수 없습니다. 공유기나 네트워크가 바뀌어 PC IP가 달라질 때마다 이 값을 다시 확인합니다.

웹에서도 앱을 테스트한다면 백엔드의 `CORS_ALLOWED_ORIGINS`에 새 Expo 주소(예: `http://192.168.0.25:8081`)를 추가합니다. Expo Go로 실행하는 네이티브 앱에는 보통 이 설정이 필요하지 않습니다.

## 3. 백엔드 실행

첫 번째 PowerShell 창에서 환경변수를 설정하고 서버를 실행합니다. 실제 비밀번호와 API 키는 저장소 파일에 기록하거나 커밋하지 않습니다.

```powershell
cd C:\project\lastcall\lastcall-server

$env:SPRING_PROFILES_ACTIVE="default"
$env:DB_URL="jdbc:mysql://localhost:3306/lastcall"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="본인의_MYSQL_비밀번호"
$env:EMERGENCY_API_KEY="본인의_국립중앙의료원_API_키"

.\mvnw.cmd spring-boot:run
```

관리자 로그인을 확인해야 한다면 실행 전에 관리자 환경변수도 설정합니다.

```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="사용할_관리자_비밀번호"
```

콘솔에 Spring 애플리케이션이 시작되었다는 로그가 표시되면 백엔드는 `8080` 포트에서 실행 중입니다. 브라우저에서 다음 주소를 열어 서버 응답 여부를 간단히 확인할 수 있습니다.

```text
http://localhost:8080/emergency/nearby
```

이 API는 검색 파라미터가 필요하므로 오류 응답이 나오더라도 서버 자체에 연결되었다면 백엔드가 실행 중인 것입니다.

## 4. Expo 앱 실행

백엔드를 종료하지 않은 상태에서 두 번째 PowerShell 창을 열고 실행합니다.

```powershell
cd C:\project\lastcall\lastcall-app-sdk54
npx expo start
```

캐시 문제로 변경 내용이 반영되지 않으면 다음 명령으로 다시 실행합니다.

```powershell
npx expo start --clear
```

이후 휴대폰에서 다음 순서로 접속합니다.

1. PC와 휴대폰이 같은 Wi-Fi인지 확인합니다.
2. 휴대폰에서 Expo Go를 실행합니다.
3. 터미널 또는 Expo 개발 도구에 표시된 QR 코드를 스캔합니다.
4. 앱이 열리면 위치 권한을 허용하고 기능을 확인합니다.

정상 실행 상태는 다음과 같습니다.

- Spring Boot: `http://PC_IP:8080`
- Expo 개발 서버: `http://PC_IP:8081`
- 휴대폰: Expo Go에서 QR 코드로 접속

## 5. 종료 방법

백엔드와 Expo를 실행한 각 PowerShell 창에서 `Ctrl+C`를 누릅니다.

현재 PowerShell 창에 설정한 `$env:...` 값은 그 창을 닫으면 사라집니다.

## 연결되지 않을 때 확인할 것

- `api.ts`의 IP가 현재 PC의 Wi-Fi IPv4 주소와 같은지 확인합니다.
- 휴대폰과 PC가 같은 Wi-Fi인지 확인합니다. 게스트 Wi-Fi는 기기 간 통신을 차단할 수 있습니다.
- 백엔드가 `8080`, Expo가 `8081` 포트에서 실행 중인지 확인합니다.
- Windows 방화벽 알림이 뜨면 Java와 Node.js의 개인 네트워크 통신을 허용합니다.
- VPN이나 모바일 데이터가 연결을 방해하면 잠시 끄고 다시 시도합니다.
- Expo 터미널에서 LAN 연결이 어렵다면 `npx expo start --tunnel`을 시도할 수 있습니다. 단, 앱의 백엔드 주소 `http://PC_IP:8080`은 휴대폰에서 여전히 접근 가능해야 합니다.
- MySQL 연결 오류가 나면 MySQL 서버 실행 여부, 데이터베이스 이름, 계정과 비밀번호를 확인합니다.

## 전체 실행 순서 요약

1. `ipconfig`로 PC IP를 확인합니다.
2. `lastcall-app-sdk54/src/config/api.ts`의 IP를 변경합니다.
3. 첫 번째 터미널에서 환경변수를 설정하고 백엔드를 실행합니다.
4. 두 번째 터미널에서 `npx expo start`를 실행합니다.
5. 같은 Wi-Fi의 휴대폰에서 Expo Go로 QR 코드를 스캔합니다.
