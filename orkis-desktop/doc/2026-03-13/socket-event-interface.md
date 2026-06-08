# Socket Event Interface 명세

> **PARTIAL UPDATE — 2026-04-29 단계 2 이후**
>
> 본 문서의 **wire format / 연결 / 인증** 섹션(아래 1번)은 outdated. **이벤트 페이로드 명세(2~7번)는 유효** — 단계 2가 wire/auth만 교체했고 이벤트 의미/payload는 변경 없음.
>
> 변경 요약:
> - Unix Socket → **raw TCP loopback** (podman machine 호환성 이유로 UDS 거부)
> - NDJSON(`\n` 구분) → **length-prefix** (4-byte BE header + UTF-8 JSON body, MAX_MSG=4MB)
> - register handshake에 `token: <EVENT_SOCKET_SECRET>` 추가, mismatch 시 destroy + 5초 handshake timeout
> - 자세한 변경 내역: 워크스페이스 `handoff.md` 단계 1·2 섹션 + 메모리 `project_socket_vulnerability_baseline.md`
>
> 1번 섹션은 historical reference. 코드는 `apps/orkis-desktop/src/main/socket/server.ts` 참조.

---

## 1. 시스템 구조

```
Renderer <--IPC--> Main (Electron) <--TCP loopback--> Backend
                                   <--TCP loopback--> AI
```

| 노드 | 역할 | 연결 방식 |
|------|------|----------|
| Renderer | UI, 사용자 입력/출력 | IPC (ipcRenderer/ipcMain) |
| Main | 소켓 서버, IPC 브릿지, 이벤트 라우터 | SocketServer (net.Server, TCP) |
| Backend | 데이터 정규화, DB 영속화, SQL 실행 | SocketClient (net.createConnection, TCP) |
| AI | LLM 추론, RAG 전처리 | SocketClient (net.createConnection, TCP) |

### 연결 초기화 (단계 2 이후)

1. Main이 `SocketServer.listen(port)` 실행 (loopback TCP)
2. Backend/AI가 `net.createConnection(port, host)`로 연결
3. 연결 후 `{ type: "register", name: "backend" | "ai", token: <EVENT_SOCKET_SECRET> }` handshake
4. Main이 token 검증 → mismatch 시 destroy. 5초 안에 register 안 오면 handshake timeout
5. Main이 클라이언트 이름으로 라우팅 대상 식별

### 메시지 프로토콜 (단계 2 이후)

- Wire format: **length-prefix** — `Header(4 byte BE UInt32 = msgLen) | Body(N byte UTF-8 JSON)`
- MAX_MSG_BYTES = 4 MB (header만 보고 즉시 검증)
- 구조: `{ type: "<이벤트명>", ...payload }`
- 라우팅: `socket/routes.ts`의 이벤트명 -> 대상 노드 매핑
- 인증: `EVENT_SOCKET_SECRET` (desktop main이 매 실행 random 32-byte hex 생성, container env로 주입)

---

## 2. 이벤트 라우팅 테이블

이벤트의 발신 노드와 수신 노드를 정의한다. Main은 라우터 역할이므로 발신/수신 대상에서 생략한다.

### 2-1. 채팅 (Chat)

| 이벤트명 | 발신 | 수신 | 설명 |
|----------|------|------|------|
| `chat:start` | Renderer | Backend | 채팅 시작 요청 |
| `chat:ai:start` | Backend | AI | API 키 주입 후 AI로 전달 |
| `chat:cancel` | Renderer | Backend, AI | 채팅 취소 |
| `raw:chat:type` | AI | Backend | 채팅 타입 결정 |
| `raw:token:generated` | AI | Backend | 토큰 스트리밍 |
| `raw:steps` | AI | Backend | 프로세스 단계 목록 |
| `raw:step:update` | AI | Backend | 프로세스 단계 상태 변경 |
| `raw:chat:complete` | AI | Backend | 채팅 완료 |
| `raw:chat:error` | AI | Backend | 채팅 에러 |
| `raw:title:update` | AI | Renderer, Backend | 세션 제목 생성 |
| `chat:type` | Backend | Renderer | 채팅 타입 (정규화 후) |
| `token:generated` | Backend | Renderer | 토큰 (정규화 후) |
| `steps` | Backend | Renderer | 프로세스 단계 목록 (정규화 후) |
| `step:update` | Backend | Renderer | 단계 상태 (정규화 후) |
| `result` | Backend | Renderer | 최종 결과 (SQL 실행 결과 또는 일반 응답) |
| `chat:complete` | Backend | Renderer | 채팅 완료 |
| `chat:error` | Backend | Renderer | 채팅 에러 |

### 2-2. RAG 전처리 (Preprocess)

| 이벤트명 | 발신 | 수신 | 설명 |
|----------|------|------|------|
| `preprocess:request` | Renderer | Backend | 전처리 요청 |
| `preprocess:start` | Backend | AI | DB 정보 해석 후 AI에 전달 |
| `raw:preprocess:progress` | AI | Backend | 전처리 진행 중 |
| `raw:preprocess:complete` | AI | Backend | 전처리 완료 |
| `raw:preprocess:error` | AI | Backend | 전처리 에러 |
| `preprocess:progress` | Backend | Renderer | 진행 상태 (connectionId 추가) |
| `preprocess:complete` | Backend | Renderer | 완료 (connectionId 추가) |
| `preprocess:error` | Backend | Renderer | 에러 (connectionId 추가) |

---

## 3. 이벤트별 페이로드 명세

### 3-1. 채팅 시작/취소

#### `chat:start` (Renderer -> Backend)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 고유 ID |
| sessionId | string | O | 세션 ID |
| content | string | O | 사용자 입력 메시지 |
| dbId | string | - | SQL 실행 대상 DB ID |
| connectionId | string | - | DB 연결 ID |

#### `chat:ai:start` (Backend -> AI)

`chat:start`의 전체 페이로드 + 아래 필드 추가:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| apiKey | string | O | LLM API 키 (Backend가 환경변수에서 주입) |

#### `chat:cancel` (Renderer -> Backend, AI)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 취소할 채팅 ID |

---

### 3-2. AI -> Backend (raw 이벤트)

#### `raw:chat:type`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| chatType | string | O | `"sql"` 또는 `"general"` |

#### `raw:token:generated`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| token | string | O | 생성된 토큰 조각 |

#### `raw:steps`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| steps | array | O | 프로세스 단계 배열 |

steps 배열 요소:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | number/string | O | 단계 ID |
| name | string | O | 단계 이름 |

#### `raw:step:update`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | number/string | O | 단계 ID |
| s | number/string | O | 시퀀스 |
| stat | number | O | 상태 (AI 기준: 0=running, 1=success) |

#### `raw:chat:complete`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| code | number | O | 완료 코드 (기본값: 9000) |
| sqlQuery | string | - | 생성된 SQL 쿼리 (sql 타입일 때) |

#### `raw:chat:error`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| code | number | O | 에러 코드 (기본값: 9003) |
| message | string | - | 에러 메시지 |

#### `raw:title:update`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| sessionId | string | O | 세션 ID |
| title | string | O | 생성된 제목 |

---

### 3-3. Backend -> Renderer (정규화된 이벤트)

#### `chat:type`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| chatType | string | O | `"sql"` 또는 `"general"` |

`raw:chat:type` 페이로드를 그대로 전달.

#### `token:generated`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| token | string | O | 토큰 조각 |

`raw:token:generated` 페이로드를 그대로 전달.

#### `steps`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| steps | array | O | 정규화된 단계 배열 |

steps 배열 요소:

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | **string** | O | 단계 ID (number -> string 정규화) |
| name | string | O | 단계 이름 |

**변환**: `step.id`를 `String()`으로 정규화.

#### `step:update`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | **string** | O | 단계 ID (정규화됨) |
| s | **string** | O | 시퀀스 (정규화됨) |
| stat | **number** | O | 상태 (Renderer 기준: 0=pending, 1=processing, 2=success, 3=error) |

**변환**:
- `id`, `s`: `String()` 정규화
- `stat`: AI 값 -> Renderer 값 매핑 (0->1, 1->2)

#### `result`

chatType에 따라 페이로드 구조가 다르다.

**SQL 타입** (chatType === "sql"):

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| resultType | string | O | `"sql"` |
| sqlQuery | string | O | 실행된 SQL |
| columns | string[] | O | 컬럼명 배열 |
| data | array | O | 결과 행 배열 |
| rowCount | number | O | 결과 행 수 |
| executionTime | number | - | 실행 시간 (ms) |
| queryTitle | string | - | 결과 제목 |
| querySubtitle | string | - | 결과 부제 |
| error | string | - | SQL 실행 에러 메시지 |

**General 타입** (chatType === "general"):

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| resultType | string | O | `"general"` |
| content | string | O | 전체 응답 메시지 (토큰 누적 결과) |

**생성 시점**: `raw:chat:complete` 수신 후, Backend가 메시지 영속화 완료 후 전송. `chat:complete`보다 먼저 전송된다.

#### `chat:complete`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| code | number | O | 완료 코드 |
| chatType | string | - | `"sql"` 또는 `"general"` |

`result` 이벤트 이후에 전송된다.

#### `chat:error`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| chatId | string | O | 채팅 ID |
| code | number | O | 에러 코드 |
| message | string | - | 에러 메시지 |

`raw:chat:error` 페이로드를 그대로 전달.

---

### 3-4. RAG 전처리

#### `preprocess:request` (Renderer -> Backend)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| connectionId | number | O | DB 연결 ID |
| ragType | number | O | 0=ALL, 1=SCHEMA, 2=DATA |
| userId | string | O | 사용자 ID |

#### `preprocess:start` (Backend -> AI)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| dbId | string | O | DB 식별자 (Backend가 connectionId에서 해석) |
| ragType | number | O | 0=ALL, 1=SCHEMA, 2=DATA |
| apiKey | string | O | LLM API 키 |

**변환**: Backend가 `connectionId` -> `dbId` 해석 (db_type에 따라 다름), API 키 주입.

#### `raw:preprocess:progress` (AI -> Backend)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| dbId | string | O | DB 식별자 |
| ragType | number | O | 1=SCHEMA, 2=DATA |

#### `raw:preprocess:complete` (AI -> Backend)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| dbId | string | O | DB 식별자 |
| ragType | number | O | 1=SCHEMA, 2=DATA |

#### `raw:preprocess:error` (AI -> Backend)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| dbId | string | O | DB 식별자 |
| ragType | number | O | 1=SCHEMA, 2=DATA |
| message | string | O | 에러 메시지 |

#### `preprocess:progress` (Backend -> Renderer)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| dbId | string | O | DB 식별자 |
| ragType | number | O | 1=SCHEMA, 2=DATA |
| connectionId | number | O | DB 연결 ID (Backend가 추가) |
| status | string | O | `"processing"` |

#### `preprocess:complete` (Backend -> Renderer)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| dbId | string | O | DB 식별자 |
| ragType | number | O | 1=SCHEMA, 2=DATA |
| connectionId | number | O | DB 연결 ID |
| status | string | O | `"success"` |

#### `preprocess:error` (Backend -> Renderer)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| dbId | string | O | DB 식별자 |
| ragType | number | O | 1=SCHEMA, 2=DATA |
| connectionId | number | O | DB 연결 ID |
| status | string | O | `"failed"` |
| message | string | O | 에러 메시지 |

**변환**: Backend가 내부 매핑(dbId:ragType -> connectionId)에서 `connectionId`를 조회해 추가.

---

## 4. Backend 내부 처리 (부수 효과)

이벤트 중계 외에 Backend가 수행하는 부수 효과를 정리한다.

### 4-1. 채팅

| 시점 | 처리 내용 |
|------|----------|
| `chat:start` 수신 | ChatStreamContext에 세션 등록 (chatId, sessionId, content, dbId, connectionId) |
| `raw:chat:type` 수신 | ChatStreamContext에 chatType 설정 |
| `raw:token:generated` 수신 | ChatStreamContext에 토큰 누적 |
| `raw:chat:complete` 수신 | 메시지 파일 영속화 (share/jobs/{sessionId}/{date}.json) |
| `raw:chat:complete` 수신 (sql) | 사용자 SQLite DB에서 쿼리 실행 (share/sqlite/{dbId}/) |
| `raw:chat:error` 수신 | 메시지 파일 영속화 (에러 상태) |
| `raw:title:update` 수신 | DB에 세션 제목 UPDATE (chat_sessions 테이블) |
| `chat:cancel` 수신 | ChatStreamContext에서 세션 제거 |

### 4-2. RAG 전처리

| 시점 | 처리 내용 |
|------|----------|
| `preprocess:request` 수신 | DB 연결 정보 조회, 이전 이력 삭제, 새 이력 INSERT, 메모리 매핑 등록 |
| `raw:preprocess:progress` 수신 | 이력 status -> "processing" UPDATE |
| `raw:preprocess:complete` 수신 | 이력 status -> "success" UPDATE, 메모리 매핑 삭제 |
| `raw:preprocess:error` 수신 | 이력 status -> "failed" UPDATE, 메모리 매핑 삭제 |
| Backend 시작 시 | stale "processing" 이력 -> "failed" 일괄 UPDATE |

---

## 5. 이벤트 시퀀스

### 5-1. 채팅 정상 흐름

```
Renderer         Main          Backend         AI
  |                |               |              |
  |--chat:start--->|--chat:start-->|              |
  |                |               |--chat:ai:start-->
  |                |               |              |
  |                |               |<-raw:chat:type--|
  |<--chat:type----|<--chat:type---|              |
  |                |               |              |
  |                |               |<-raw:token:generated-- (반복)
  |<-token:generated|<-token:generated|           |
  |                |               |              |
  |                |               |<-raw:steps---|
  |<--steps--------|<--steps-------|              |
  |                |               |              |
  |                |               |<-raw:step:update-- (반복)
  |<-step:update---|<-step:update--|              |
  |                |               |              |
  |                |               |<-raw:title:update--|
  |<-raw:title:update (직접)       |  (DB 저장)   |
  |                |               |              |
  |                |               |<-raw:chat:complete--|
  |                |               |  (영속화+SQL실행)    |
  |<--result-------|<--result------|              |
  |<-chat:complete-|<-chat:complete|              |
```

### 5-2. 채팅 에러 흐름

```
Renderer         Main          Backend         AI
  |                |               |              |
  |--chat:start--->|--chat:start-->|              |
  |                |               |--chat:ai:start-->
  |                |               |              |
  |                |               |<-raw:chat:error--|
  |                |               |  (영속화)     |
  |<--chat:error---|<--chat:error--|              |
```

### 5-3. 채팅 취소 흐름

```
Renderer         Main          Backend         AI
  |                |               |              |
  |--chat:cancel-->|--chat:cancel->|              |
  |                |--chat:cancel------------>    |
  |                |               | (컨텍스트 제거)|
  |                |               |              |
  |                |               |<-raw:chat:complete--|
  |                |               |  (정상 완료 흐름)    |
```

### 5-4. RAG 전처리 정상 흐름

```
Renderer         Main          Backend         AI
  |                |               |              |
  |-preprocess:request->           |              |
  |                |--preprocess:request-->        |
  |                |               | (DB 조회, 이력 생성) |
  |                |               |-preprocess:start-->
  |                |               |              |
  |                |               |<-raw:preprocess:progress--|
  |                |               |  (DB 상태 갱신)           |
  |<-preprocess:progress|<---------|              |
  |                |               |              |
  |                |               |<-raw:preprocess:complete--|
  |                |               |  (DB 상태 갱신, 매핑 삭제) |
  |<-preprocess:complete|<---------|              |
```

---

## 6. 현재 이벤트명 체계 분석

### 6-1. 네이밍 패턴

| 패턴 | 예시 | 의미 |
|------|------|------|
| `raw:<domain>:<action>` | `raw:chat:type`, `raw:step:update` | AI -> Backend (가공 전 원시 데이터) |
| `<domain>:<action>` | `chat:start`, `chat:complete` | 정규화된 이벤트 |
| `<action>` | `steps`, `result` | 단일 단어 이벤트 (일관성 없음) |
| `<domain>:<sub>:<action>` | `raw:preprocess:progress` | 3단계 네이밍 |

### 6-2. 불일치 사항

| 문제 | 현재 | 개선 방향 |
|------|------|----------|
| 단일 단어 이벤트 | `steps`, `result` | `chat:steps`, `chat:result` 등 도메인 접두사 필요 |
| token 이벤트 네이밍 | `raw:token:generated` / `token:generated` | chat 도메인에 속하지만 접두사 없음 |
| step 이벤트 네이밍 | `raw:step:update` / `step:update` | chat 도메인에 속하지만 접두사 없음 |
| steps vs step:update | `steps` (복수) vs `step:update` (단수) | 단복수 불일치 |
| `raw:title:update` 라우팅 | Renderer + Backend 동시 전송 | 다른 raw 이벤트는 Backend만 수신 |
| preprocess 에러 발신자 | Backend 내부 에러도 `preprocess:error`로 Renderer 전송 | AI 에러와 Backend 에러 구분 없음 |

### 6-3. 데이터 정규화 현황

| 변환 | 위치 | 내용 |
|------|------|------|
| step.id 타입 | StreamService.onSteps | number/string -> string |
| step:update id, s | StreamService.onStepUpdate | number/string -> string |
| step:update stat | StreamService.onStepUpdate | AI(0,1) -> Renderer(1,2) |
| title 따옴표 제거 | StreamService.onTitleUpdate | `"title"` -> `title` |
| preprocess connectionId 추가 | PreprocessService | 내부 매핑에서 조회 후 추가 |

---

## 7. 향후 작업

- [ ] 이벤트명 체계 통일 (도메인 접두사, 단복수 규칙)
- [ ] 코드에 타입 정의 반영 (`Record<string, unknown>` -> 전용 타입)
- [ ] stat 값 매핑을 상수/enum으로 명시화
- [ ] `raw:title:update`의 이중 라우팅 정리
