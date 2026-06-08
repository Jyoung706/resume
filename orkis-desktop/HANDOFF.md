# orkis-desktop Handoff (04-06)

## 현재 상태

Mac dev 모드 정상 동작. Windows NAT 모드(B PC) 정상 동작.
Windows Mirrored 모드(A PC) `--network host` + `localhost` 전략 적용, 테스트 필요.

## 테스트 환경

| 구분 | Mac | A PC (Windows) | B PC (Windows) |
|------|-----|---------------|---------------|
| WSL2 네트워크 | N/A | **mirrored** | NAT (기본) |
| vEthernet (WSL) | N/A | 없음 | 있음 |
| Docker Desktop | N/A | 이전 설치 이력 있음 | 없음 |
| 상태 | 정상 동작 | 테스트 필요 | 정상 동작 |

---

## 수정된 파일

### 1. `src/main/config/container.config.ts`

- Backend `port`: `8080` → `process.env.MAIN_BACKEND_PORT || 19800`
- **단일 진실 공급원**: dev 모드는 `.env.dev`의 `MAIN_BACKEND_PORT=18080`, prod 모드는 기본값 19800
- 19800: IANA 미등록 범위, 일반 서비스(3000, 8080 등)와 충돌 방지

### 2. `src/main/services/container/machine.manager.ts`

191줄 → 120줄. Mac과 동일한 단순 흐름으로 리팩토링.

**제거**: SSH 서비스 수동 시작, 10회 폴링, 좀비 복구 등 Windows 전용 workaround 전부

**유지**: `--rootful` 플래그 (WSL2에서 user scope systemd 미작동 우회)

**추가**: `initMachine()`에 "already exists" 복구
- `podman system connection rm`으로 고아 항목만 제거 (파일 전체 삭제 아님)
- 이전 podman 설치 이력으로 `%APPDATA%\containers\podman-connections.json`에 잔존하는 connection 대응

**`ensureMachine()` 흐름**:
```
Linux → skip
Windows → WSL2 확인 (없으면 에러 다이얼로그)
machine inspect → 없으면 initMachine()
  initMachine: machine init → "already exists" 시 connection rm → 재시도
State 확인 → running + ping OK → 완료
              running + ping 실패 → stop → start
machine start → ping OK → 완료
ping 실패 → stop → rm -f → initMachine → start → ping → 최종 실패 시 throw
```

### 3. `src/main/services/container/container.service.ts`

전면 리팩토링. 핵심 변경 3가지:

#### a. `ContainerNetConfig` — 플랫폼별 네트워크 설정 집중

```typescript
interface ContainerNetConfig {
  mode: "mac" | "windows-nat" | "windows-mirrored";
  networkArgs: string[];
  hostAddress: string;
  portArgs: (port: number) => string[];
}
```

`getNetConfig()`가 플랫폼을 1회 감지하고 캐싱. 플랫폼 분기가 이 함수 한 곳에만 존재.

| 모드 | networkArgs | hostAddress | portArgs |
|------|------------|-------------|----------|
| mac | [] (bridge) | host.docker.internal | -p {port}:{port} |
| windows-nat | [] (bridge) | vEthernet(WSL) IP | -p {port}:{port} |
| windows-mirrored | --network host | localhost | [] (없음) |

Mirrored 감지: `%USERPROFILE%\.wslconfig`에서 `networkingMode=mirrored` 정규식 매칭
WSL 주소: `os.networkInterfaces()`에서 1차 "wsl" 어댑터, 2차 아무 non-internal IPv4

#### b. `findAvailablePort()` — 포트 사전 확보

```typescript
private findAvailablePort(startPort: number, maxRetries = 10): Promise<number>
```

- `net.createServer().listen()`으로 포트 사용 가능 확인
- 충돌 시 +1씩 올려서 최대 10회 재시도
- 이전 `waitForPort()` (podman port 폴링 5회) 삭제 — 타이밍 이슈 제거

#### c. 컨테이너 실행 통일

- `podman run`에 `--rm` 플래그 → stop 시 자동 삭제
- `-e PORT={backendPort}` → Backend가 이 포트로 listen (config 기본값 또는 env 값)
- `stopAll()`에서 `rm -f` 제거, `stop`만 수행
- `cleanupStaleContainers()` 유지 (비정상 종료 대비)
- `startAll(socketPort)` — `fixedBackendPort` 파라미터 제거

### 4. `src/main/index.ts`

#### app:ready 이벤트 기반 전환

이전: `startAll()` 직후 즉시 `app:ready` → Backend 부팅 전 ECONNREFUSED
이후: `client:connected` 콜백에서 Backend + AI 양쪽 연결 확인 후 `app:ready`

```
startAll() 전에 리스너 등록 (빠른 연결 놓치지 않기 위해)
  → client:connected("backend") → requiredClients에서 제거
  → client:connected("ai") → requiredClients 비었으면 app:ready 전송
```

- 60초 타임아웃 + 최대 2회 재시도 (총 3분)
- 타임아웃 시 에러 다이얼로그 + 앱 종료
- `startAll(socketPort)` — `fixedBackendPort` 제거 (포트 결정을 container.service.ts에 위임)
- `fixedBackendPort`는 detached 모드에서만 사용 (유지)

### 5. `build/installer.nsh`

- 프로세스 종료 대기: `tasklist | findstr` 루프 (최대 10초, 1초 간격)
  - 이전: `Sleep 3000` 하드코딩 → 사양별 대응 불가
- `SetShellVarContext current` → `$APPDATA`가 현재 사용자 경로를 가리키도록
  - `perMachine: true`에서 관리자 계정 경로로 해석되는 문제 수정

### 6. `package.json`

PKG 설치 경로 고정:
```json
"pkg": {
  "installLocation": "/Applications",
  "allowAnywhere": false,
  "allowCurrentUserHome": false,
  "isRelocatable": false
}
```
- 설치 위치 선택 단계 최소화 (완전 제거는 Distribution XML 수정 필요 — 미적용)

---

## 해결된 이슈

### Issue 1: Podman machine 시작 실패 (Windows)
- **원인**: WSL2 user scope systemd 미작동 → podman.socket 미생성
- **해결**: `--rootful` 플래그로 root systemd 사용

### Issue 2: 컨테이너→호스트 소켓 연결 실패 (Windows NAT)
- **원인**: `host.docker.internal`이 podman bridge gateway(10.88.0.1)로 해석
- **해결**: `os.networkInterfaces()`로 vEthernet(WSL) IP 탐색 → `EVENT_SOCKET_HOST`

### Issue 3: Windows 방화벽
- **원인**: WSL 가상 네트워크 트래픽이 외부로 분류
- **현재**: Electron 첫 실행 시 팝업 허용

### Issue 4: `machine init` "already exists"
- **원인**: `%APPDATA%\containers\podman-connections.json`에 고아 connection 잔존
- **해결**: `system connection rm`으로 고아 항목만 제거 후 재시도

### Issue 5: 언인스톨러 AppData 삭제 실패
- **원인**: 파일 핸들 미해제 + `$APPDATA` 경로 해석 오류
- **해결**: 프로세스 종료 대기 루프 + `SetShellVarContext current`

### Issue 6: ECONNREFUSED (Backend 부팅 전 API 호출)
- **원인**: `podman run -d` 즉시 반환, Express 부팅 전 Renderer API 호출
- **해결**: `client:connected` 이벤트 기반 `app:ready` — 실제 준비 완료 시점에 전송

### Issue 7: Mirrored 모드 소켓 연결 실패
- **원인**: bridge에서 나온 트래픽이 Linux 소켓 테이블에서 리스너 탐색 → Windows 프로세스 미도달
- **해결**: `.wslconfig` mirrored 감지 → `--network host` + `EVENT_SOCKET_HOST=localhost`

---

## 컨테이너 네트워크 아키텍처

### 플랫폼별 네트워크 경로

**Mac (bridge)**:
```
소켓: Container → bridge → VM → host.docker.internal → Mac 호스트 ✓
HTTP: Mac 호스트 → 127.0.0.1:{port} → gvproxy(-p 포워딩) → VM → Container ✓
```

**Windows NAT (bridge)**:
```
소켓: Container → bridge → WSL2 VM → vEthernet(WSL) IP → Windows 호스트 ✓
HTTP: Windows → 127.0.0.1:{port} → podman(-p 포워딩) → WSL2 → Container ✓
```

**Windows Mirrored (--network host)**:
```
소켓: Container → WSL2 namespace(=Windows) → localhost → Windows 호스트 ✓
HTTP: Windows → 127.0.0.1:{port} → WSL2(=Windows, 같은 namespace) → Container ✓
```

### 왜 Mac에서 --network host를 쓸 수 없는가

Mac의 podman은 Apple HV **VM** 안에서 동작. `--network host`는 컨테이너를 VM의 네트워크에 넣지만, **VM 포트가 Mac 호스트에 자동 노출되지 않음**. `-p` 플래그가 gvproxy에게 포트 포워딩을 등록하는데, `--network host`와 `-p`는 동시 사용 불가.

### 왜 Windows Mirrored에서 bridge를 쓸 수 없는가

Mirrored 모드에서 WSL2와 Windows가 네트워크 스택을 공유하지만, podman bridge는 Linux 커널 내부에 존재. bridge에서 나온 트래픽이 호스트 IP로 향해도 **Linux 소켓 테이블**에서 리스너를 찾음 → Windows 프로세스(Electron) 미도달 → ECONNREFUSED.

### 검토한 대안

| 전략 | Mac | Win NAT | Win Mirrored | 결론 |
|------|-----|---------|-------------|------|
| 항상 bridge + -p | ✓ | ✓ | ✗ (소켓 실패) | 불가 |
| 항상 --network host | ✗ (HTTP 실패) | ✓ | ✓ | 불가 |
| bridge + mirrored 감지 (현재) | ✓ | ✓ | ✓ | **채택** |

---

## 포트 결정 흐름

```
container.config.ts:
  port: process.env.MAIN_BACKEND_PORT || 19800    ← 단일 진실 공급원

container.service.ts:
  findAvailablePort(CONTAINERS.backend.port!)      ← config 값에서 시작
    → 사용 가능하면 그대로 사용
    → 충돌 시 +1씩 올려서 최대 10회 재시도

dev 모드 (.env.dev):   MAIN_BACKEND_PORT=18080 → findAvailablePort(18080) → 18080
prod 모드 (.env.prod): env 없음 → 기본값 19800 → findAvailablePort(19800) → 19800
```

Vite dev 프록시(`electron.vite.config.ts`)도 `MAIN_BACKEND_PORT`를 읽으므로 dev 모드에서 포트가 일치.

---

## Podman 기본 개념

### Container vs Image
- **Image**: `podman load -i *.tar`로 로드, VM 디스크에 영구 저장, `podman rmi`로만 삭제
- **Container**: Image의 실행 인스턴스, `--rm` 플래그로 stop 시 자동 삭제
- PC 재부팅/machine restart 후에도 Image 유지 → tar 재로드 불필요

### Machine CPU/Memory
- `--cpus 2`: VM vCPU 상한 (예약 아님). I/O bound 워크로드에 충분
- `--memory`: `Math.min(4096, 시스템RAM * 0.75)` — 동적 할당

### System Connection 저장 위치
- Windows: `%APPDATA%\containers\podman-connections.json`
- 번들 podman과 시스템 설치 podman이 공유 → 고아 connection 원인

### .wslconfig 위치
- `%USERPROFILE%\.wslconfig` (고정 경로, 다른 위치 불가)
- `networkingMode=mirrored` 설정 시 NAT → Mirrored 전환

---

## Mac PKG 설치

### 바이너리 위치
```
/Applications/orkis.app/Contents/Resources/
  podman/mac/
    bin/podman, gvproxy, vfkit, krunkit, podman-mac-helper
    lib/libMoltenVK.dylib, ...
  images/
    orkis-backend.tar, orkis-ai.tar
```

### postinstall 스크립트
- 설치 직후 `podman machine init`을 미리 실행 (첫 실행 속도 최적화)
- `ensureMachine()`이 앱 시작 시 동일 작업을 하므로 필수는 아님

### 언인스톨
- Mac PKG에는 공식 언인스톨러 없음
- `scripts/cleanup-mac.sh` 수동 실행 또는 앱 내부 메뉴로 제공 예정

---

## AI 통신 구조 전환 (04-10)

### 변경 전후

**Before**: AI는 소켓 클라이언트 only — 수신/송신 모두 TCP 소켓
```
Backend → socket "chat:ai:start" → Electron → socket → AI
AI → socket "raw:chat:token" → Electron → socket → Backend
```

**After**: HTTP 수신 + 소켓 송신 분리
```
요청: Backend → HTTP POST /chat/start → AI (직접 통신, Electron 경유 안 함)
이벤트: AI → socket "raw:chat:token" → Electron → socket → Backend
```

### orkis-desktop-ai 변경

| 파일 | 변경 |
|------|------|
| `requirements.txt` | fastapi, uvicorn 추가 |
| `app/api/app.py` | **NEW** — FastAPI 앱 + lifespan (소켓 클라이언트 관리) |
| `app/api/routers/__init__.py` | **NEW** — 라우터 통합 (`/chat`, `/preprocess` prefix) |
| `app/api/routers/chat.py` | **NEW** — POST `/chat/start`, `/chat/cancel` |
| `app/api/routers/preprocess.py` | **NEW** — POST `/preprocess/start` |
| `app/socket/handler.py` | `client` 파라미터 제거 (HTTP/소켓 양쪽 호출 가능) |
| `app/socket/preprocess_handler.py` | `client` 파라미터 제거 |
| `main.py` | `asyncio.run()` → uvicorn ASGI 진입점 |
| `Dockerfile.desktop` | CMD: `sh -c "uvicorn main:app --port ${PORT:-8000}"` |

**아키텍처**: orkis-ai의 FastAPI 구조 차용 (controller → handler 2계층, service 생략)

### orkis-backend 변경

| 파일 | 변경 |
|------|------|
| `socket/aiClient.ts` | **NEW** — `HttpModule({ baseURL: AI_SERVER_URL })` |
| `socket/handlers/chat.handler.ts` | `sender.send("chat:ai:start")` → `await aiApi.post("/chat/start")` |
| `socket/services/preprocess.service.ts` | `sender.send("preprocess:start")` → `await aiApi.post("/preprocess/start")` |
| `socket/socketClient.ts` | dispatch에서 async 핸들러 Promise 에러 catch |

### orkis-desktop 변경

| 파일 | 변경 |
|------|------|
| `config/container.config.ts` | AI에 `port: 19900` 추가 |
| `services/container/container.service.ts` | AI 포트 매핑 (`-p`, `-e PORT`) + Backend에 `AI_SERVER_URL` 환경변수 전달 |

### 포트 결정 흐름 (Backend + AI)

```
container.config.ts:
  backend.port: process.env.MAIN_BACKEND_PORT || 19800
  ai.port:      process.env.MAIN_AI_PORT || 19900

container.service.ts startAll():
  backendPort = findAvailablePort(19800)
  aiPort      = findAvailablePort(19900)
  aiUrl       = http://{hostAddress}:{aiPort}

  startBackend(socketPort, backendPort, aiUrl)  ← -e AI_SERVER_URL 전달
  startAI(socketPort, aiPort)                   ← -e PORT, -p aiPort:aiPort
```

### uvicorn 도입 효과

| 항목 | 이전 (소켓 only) | 이후 (uvicorn + 소켓) |
|------|-----------------|---------------------|
| 요청 수신 | read_loop 직렬 파싱 | uvicorn 병렬 수신 |
| 요청 도착 확인 | 불가 | HTTP 200 OK 즉시 |
| 비즈니스 에러 격리 | uncaught → 프로세스 사망 가능 | 500 응답, 프로세스 유지 |
| 프로세스 관리 | 없음 | uvicorn (시그널, graceful shutdown) |
| 리소스 증가 | - | 이미지 ~4MB, 메모리 ~10-15MB |

### uvicorn 에러 격리 범위

- HTTP 엔드포인트 내부 에러 → uvicorn이 500 응답, 프로세스 유지 **O**
- BackgroundTasks 내부 에러 → 이미 200 반환 후이므로 uvicorn 보호 **X**
  - `handle_chat_start`, `handle_preprocess_start`는 BackgroundTasks로 실행
  - 내부에 자체 try-except 있으므로 프로세스는 죽지 않음
- 컨테이너 프로세스 자체 crash (OOM, segfault) → uvicorn 관할 밖, `--restart` 정책 필요

### Dockerfile CMD vs main.py 실행

- **CMD** `uvicorn main:app`: uvicorn CLI가 PID 1 → SIGTERM 직접 수신 → graceful shutdown
- **`python main.py`**: python이 PID 1 → `__main__` 블록에서 `uvicorn.run()` → 한 단계 간접적
- Dockerfile은 CLI 방식, `__main__` 블록은 로컬 개발 편의용 (없어도 컨테이너 동작에 영향 없음)

### 커밋 상태 (04-13)

- orkis-desktop-ai: `18b1ffa` 커밋 완료 (main)
- orkis-backend: 미커밋 (aiClient.ts, chat.handler.ts, preprocess.service.ts, socketClient.ts)
- orkis-desktop: 미커밋 (container.config.ts, container.service.ts, HANDOFF.md)

### 컨테이너 간 네트워크 (AI 포트 노출)

호스트 포트 매핑(`-p`) 방식 채택. 사용자 정의 네트워크는 mirrored 모드(`--network host`)와 공존 불가.

```
Backend 컨테이너 → host.docker.internal:{aiPort} → 호스트 → AI 컨테이너:{aiPort}
```

### 검토한 이벤트 전송 대안 (소켓 유지 결정)

| 방법 | 장점 | 단점 | 결론 |
|------|------|------|------|
| TCP 소켓 (현재) | 최소 오버헤드 | 수동 버퍼 관리 | **유지** |
| WebSocket | 자동 프레이밍, 이중 구조 제거 | TCP 대비 오버헤드 | 현 단계 불필요 |
| gRPC streaming | 타입 안정성, 바이너리 | 복잡도, 디버깅 어려움 | 과도 |
| Redis Pub/Sub | Cloud 코드 재사용 | 컨테이너 추가 | Desktop에 부적합 |

---

## 미해결 / 향후 작업

- [ ] A PC(Windows mirrored)에서 `--network host` + `localhost` 전략 테스트
- [ ] Mac PKG 설치 위치 선택 단계 완전 제거 (Distribution XML 수정 필요)
- [ ] 방화벽 규칙 자동 등록/제거 (installer에서 netsh)
- [ ] chat:step:update id 타입 str 통일
- [ ] AI API 인터페이스 명세 정의
- [ ] Preprocess 실패 후 재접속 시 버튼 비활성화 잔존 — AI HTTP 요청 실패(fetch failed) 시 processing 상태가 해제되지 않아 버튼이 disabled로 남음. markStaleProcessingAsFailed가 소켓 재연결 시에만 실행되므로 커버 안 되는 케이스 존재

---

## 2026-04-20~21 작업

### src/main 폴더 구조 정리 (커밋 897f840, 913e918)

기존 구조의 파일명-클래스명 불일치 + 계층 혼재를 정리. 커밋 완료.

- `services/container/*` → `container/*` (top-level 승격)
- `container.service.ts` → `container.manager.ts` (클래스 `ContainerManager`와 일치)
- `utils/protocol.ts` → `protocol/protocol.ts` (232줄 서브시스템 승격)
- `ipc/socket.routes.ts` → `config/socket-routes.config.ts` (정적 상수)
- `services/process.service.ts` 삭제 (`ProcessManager` 데드코드, 호출처 0)
- 빈 `events/` 디렉토리 제거
- `doc/2026-04-01/handoff.md` 삭제 (HANDOFF.md로 내용 통합)

### UDS 데드코드 제거 + 쿠키 관리를 Chromium net.fetch로 위임

UDS(Unix Domain Socket) 경로는 podman 컨테이너화 이전의 잔재로 현재 모든 실행 환경에서 `MAIN_SOCKET_MODE=tcp`가 강제되어 도달 불가 코드였음. UDS 경로 제거와 함께 `http.request` 기반 수동 프록시를 Electron `net.fetch`(Chromium net stack)로 교체하여 쿠키 관리 전반을 Chromium에 위임.

**UDS 제거**:
- `services/socket.service.ts`에서 `getSocketPath()`, `listen(socketPath)` 메서드 삭제. `listenTcp` → `listen`으로 리네임
- `index.ts`에서 `isTcpMode` 분기, `ORKIS_DATA_PATH` 세팅, `path`/`getDataPath`/`getSocketPath` import 제거
- `.env.*` 파일의 `MAIN_SOCKET_MODE=tcp` 라인 제거 (코드에서 체크 안 하므로 무의미)

**쿠키 관리 위임**:
- `protocol/protocol.ts`의 `http.request` 블록을 `net.fetch`로 교체 → Chromium이 Cookie 헤더 주입, Set-Cookie 파싱, Max-Age/Expires 만료 처리를 RFC 6265대로 자동 수행
- `BACKEND_ORIGIN`/`parseSetCookie`/`storeCookies`/`getBackendTarget` 전부 삭제 (약 196줄 감소)
- `clearBackendCookies`는 `session.defaultSession.clearStorageData({ origin, storages: ["cookies"] })` 한 줄
- `ipc/auth.ipc.ts`에 `session:clear` IPC 핸들러 추가
- `preload/api/auth.api.ts`에 `clearSession(): Promise<void>` 노출

**orkis-front 연동** (`feat/desktop`):
- `src/types/electron.d.ts`에 `clearSession` 타입 추가
- `src/services/electron/electronAuth.ts`에 `clearElectronSession()` 래퍼 추가
- `src/stores/authStore.ts`, `src/services/auth/sessionManager.ts` 로그아웃 경로에서 동적 import로 호출

**핵심 이득**: 서버가 어떤 Set-Cookie 속성을 보내든(Max-Age, Expires, Partitioned, Priority 등) Chromium이 자동 처리. 우리가 파싱하거나 분기할 필요 없음.

**검증 방법**: `yarn pack:mac:debug`로 빌드 후 터미널 실행 → 로그인 후 다음 API 요청에 `Cookie: connect.sid=...` 헤더가 주입되는지 Backend 로그 또는 Main stdout으로 확인.

### prod:debug 빌드

DevTools가 열리는 packaged 앱을 별도 `appId`로 생성. 일반 prod와 공존 설치 가능.

**구현**:
- `electron.vite.config.ts`: `process.env.ORKIS_DEBUG_BUILD`를 Vite define으로 주입 (빌드 타임 문자열 리터럴 치환)
- `services/window.service.ts`: `isDebugBuild` 상수에 따라 `openDevTools({ mode: "detach" })` 자동 오픈 + `F12`/`Cmd+Option+I`/`Ctrl+Shift+I` 토글 단축키 등록
- `package.json`: `pack:mac:debug` 스크립트 추가 — `ORKIS_DEBUG_BUILD=true yarn build:prod && electron-builder --mac -c.appId=kr.orkis.app.debug -c.productName='Orkis Debug' ...`

**사용법**:
```bash
yarn pack:mac         # Orkis.app (DevTools 비활성, 일반 prod)
yarn pack:mac:debug   # Orkis Debug.app (DevTools 자동 오픈 + 단축키)
```

두 앱은 `appId`가 다르므로 같은 Mac에 공존. userData도 분리(`~/Library/Application Support/Orkis` vs `Orkis Debug`).

### 쿠키 동작 검증 방법 (prod:debug 빌드)

custom protocol(orkis://) 특성상 Renderer DevTools에서 쿠키가 바로 안 보임. net.fetch가 `http://127.0.0.1:{port}` origin으로 저장하므로 검증은 3개 경로 중 하나로.

**1. DevTools → Application → Storage → Cookies (가장 빠름)**

Orkis Debug 앱의 DevTools를 F12로 열고 Application 탭 → Storage 섹션 → Cookies 펼치기. 좌측 트리에:
- `orkis://app` — 비어있음 (정상, Set-Cookie 헤더를 strip하므로)
- `http://127.0.0.1:19800` — 여기에 `connect.sid` 같은 세션 쿠키 행이 보이면 저장 성공

Application 탭은 세션 내 모든 origin을 나열하므로 Backend origin 칸이 자동 노출됨.

**2. Podman Backend 컨테이너 로그 (가장 확실)**

```bash
podman logs -f orkis-backend 2>&1 | grep -i -E "cookie|set-cookie|connect\.sid"
```

- 로그인 응답에 `Set-Cookie: connect.sid=...` 찍히는지
- 후속 API 요청에 `Cookie: connect.sid=...` 헤더 들어오는지

둘 다 보이면 파이프라인 정상.

**3. 임시 디버그 IPC (재빌드 필요)**

`ipcMain.handle("session:debug:cookies", ...)`를 임시로 추가하고 preload에 노출하면 DevTools console에서 `await window.electronAPI.auth.debugCookies()` 호출 가능. 검증 끝나면 제거 필수.

### 검증 체크리스트

| 단계 | DevTools Application | Podman Backend log |
|------|-------------------|-------------------|
| 앱 시작 (미로그인) | `127.0.0.1:{port}` 빈 상태 | 요청 시 Cookie 없음 |
| 로그인 API 호출 | - | 응답에 `Set-Cookie: connect.sid=...` |
| 로그인 직후 | `connect.sid` 행 존재 | - |
| 다른 API 호출 | - | 요청에 `Cookie: connect.sid=...` |
| 로그아웃 (clearSession) | `connect.sid` 행 사라짐 | 이후 요청에 Cookie 없음 |

### 돌발 상황 대응

| 증상 | 가능한 원인 |
|------|----------|
| `127.0.0.1:{port}` 칸 아예 없음 | Backend 응답에 Set-Cookie 없거나, net.fetch가 저장 안 함 |
| Application 탭엔 있는데 Backend로 안 감 | net.fetch 자동 첨부 실패 — `credentials: "include"` 명시 필요할 수 있음 |
| 로그아웃 후에도 쿠키 남음 | `clearSession` 호출 안 되는 것. authStore/sessionManager 로그아웃 경로 확인 |
| DevTools 안 열림 | prod:debug 빌드가 아니라 일반 pack:mac으로 빌드된 것 |

### 남은 작업 (이 세션 기준)

- [ ] 쿠키 전환 + UDS 제거 실제 테스트 (로그인/로그아웃/재로그인 흐름)
- [ ] 사용자 전환 시나리오 정책 결정 (tray minimize 시 쿠키 clear 여부 — 현재는 로그아웃 명시 호출만)
- [ ] debug 빌드의 서명/공증(notarization) 정책 결정 (외부 배포 여부에 따라)

---

## 2026-04-28~29 작업 — Socket server.ts 취약점 분석 + 단계 1·2 적용

### 의사결정 흐름

1. UDS 검토 → 불가 (podman machine = host 위 Linux VM, sock 경로 공유 안 됨)
2. WebSocket 검토 → 거부 (cloud 색채, same-host IPC에 부적합)
3. 결정: raw TCP loopback 유지 + framing 만 LDJSON → length-prefix (4-byte BE) 교체
4. 단계 분리: 단계 1 (server.ts 단독, side effect 0) + 단계 2 (3 리포 wire format 동시 교체)

### 단계 1 (커밋 `34cc195` + super `9883048`)

`src/main/socket/server.ts` 단독 변경. wire format은 LDJSON 유지.

차단 항목:
- ① burst-100: setImmediate 분산 → while-loop burst dispatch
- ③ invalid-json: silent catch → console.warn(sample) + errorReporter.report
- ④ no-handshake: 5초 timeout + destroy
- R1: handshake timer 누수 → close 에서 clearTimeout
- R2: listener throw → dispatch try/catch + errorReporter
- #7: setNoDelay + setKeepAlive(30s)
- #8: socket error → errorReporter

미차단 (단계 2로 이월): ② utf8-frag, ⑤ 1MB no-newline (둘 다 wire format 변경 필요)

### 단계 2 (3 리포 동시 + super atomic)

| 리포 | 커밋 | 변경 파일 |
|---|---|---|
| desktop | `9e0ecbe` | server.ts (Buffer[] 누적, length-prefix decode/encode, register token), index.ts (secret 생성), container.manager.ts (-e EVENT_SOCKET_SECRET) |
| backend | `e99b81f` | socketSender.ts (encodeFrame export), socketClient.ts (tryReadOne + register token) |
| desktop-ai | `d9df906` | client.py (`struct.pack(">I")`, register token) |
| super | `d14ccae` | desktop + backend pointer atomic |

Wire format:
```
Frame  := Header(4 bytes BE UInt32) | Body(N bytes UTF-8 JSON)
MAX_MSG := 4 MB
Register := { type: "register", name: "<backend|ai>", token: <32-byte hex secret> }
```

환경변수: `EVENT_SOCKET_SECRET` — desktop이 매 실행 `crypto.randomBytes(32).toString("hex")` 생성, podman container `-e` 주입.

차단 항목: ② utf8-frag (한국어 replChar 23 → 0), ⑤ 1MB no-newline → huge-declared (header만 보고 즉시 destroy), S1 register 무인증.

### Production 검증

- standalone server_phase2.js + length-prefix client (6 시나리오): dispatchCount=102, parseFailCount=2, handshakeTimeoutCount=1, registerRejectCount=1, oversizeCount=1, **totalReplChar=0** (totalTokenChars=300499)
- yarn dev GUI 통합: backend `Client registered: backend` + AI `Client registered: ai` + AI intent classifier 한국어 무손상 도달

### 미차단 (의도적 보류)

| 항목 | 보류 이유 |
|---|---|
| TLS | same-host loopback. cert 관리 비용 |
| BufferList O(1) read | 트래픽 작아 효과 미미 |
| connection 수 제한 / rate limit | single-user desktop |
| metric / histogram | observability stack 없음 |
| slow loris idle timeout | handshake timeout + size guard 로 충분 |
| graceful close in-flight 대기 | desktop close = process 종료 |

컨텍스트 변경 시점 (cloud renderer, multi-user, browser 직접 connect) 에 재평가.

### desktop-ai super-project pointer 미추적 (운영 주의)

`apps/orkis-desktop-ai/`는 super-project submodule이 아님 (untracked). 단계 2의 desktop-ai `d9df906`은 super-project hash로 추적되지 않음. **deploy 시점 짝**: desktop `9e0ecbe` ↔ backend `e99b81f` ↔ desktop-ai `d9df906`. hash pin 별도 관리 필요.

---

## 2026-05-04~06 작업 — Socket reader backpressure + observability

### 변경 (양쪽 reader 동일 패턴)

`src/main/socket/server.ts` (desktop) + `src/main/socket/socketClient.ts` (backend) `'data'` 핸들러에 backpressure 2단 방어 + 관찰성 추가. 상수는 `socket/constants.ts`로 분리 (양쪽 파일 일치 강제).

### 동작

| 임계 | 동작 | 의미 |
|---|---|---|
| 누적 buffer > 8MB | `socket.pause()` | TCP window 0 광고 → sender 자동 멈춤 (무손실) |
| 누적 buffer < 1MB | `socket.resume()` | 회복 |
| 누적 buffer > 32MB | `socket.destroy()` | 악성/버그 sender 마지막 방어 |
| backend handler inflight > 100 | `logger.warn` | 가시화만 (차단 안 함) |
| desktop emit burst > 100 in single 'data' | `console.warn` | 가시화 |

### 효과

| 위험 | Before | After |
|---|---|---|
| OOM 누적 | 무제한 | 32MB hard limit |
| 데이터 손실 (정상 burst) | 차단 시 발생 | 0 (pause는 무손실) |
| backlog 가시성 | 0% | 임계 초과 시 log |
| 임계값 발견 시간 | 분 (grep) | 초 (constants.ts) |

### 미적용 (측정 후 결정)

- Buffer.concat O(N²) 최적화 (peekBytes/consumeBytes): 채팅 토큰 트래픽엔 chunk 5~10개라 효과 미미. backpressure 적용 후 chunk 누적 자체가 줄어듦
- handler sync/async 검증 (위험 #4): grep으로 sync 존재 확인 후 변환 결정
