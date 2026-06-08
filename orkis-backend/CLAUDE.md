# ORKIS Backend - Claude Instructions

## 프로젝트 개요

- **프로젝트명**: ORKIS Backend
- **기술 스택**: Node.js, TypeScript, Express, Redis
- **프레임워크**: Orkis Core Framework
- **데이터베이스**: File-based JSON storage

## 아키텍처

### 로그인 시스템 (Handler Pattern)

- **Handler Pattern 구현**: 다양한 로그인 방식을 지원하는 확장 가능한 구조
- **지원 로그인 방식**:
  - Password Login (ID/PW)
  - OAuth (Naver, Kakao, Google)
- **핸들러 위치**: `src/main/auth/handlers/`
  - `ILoginHandler.ts` - 핸들러 인터페이스
  - `BaseLoginHandler.ts` - 공통 로직
  - `PasswordLoginHandler.ts` - ID/PW 로그인
  - `NaverLoginHandler.ts` - 네이버 OAuth
  - `KakaoLoginHandler.ts` - 카카오 OAuth
  - `GoogleLoginHandler.ts` - 구글 OAuth
  - `LoginHandlerFactory.ts` - 핸들러 팩토리

### 인터페이스 구조

- **공유 인터페이스**: `orkis-interface` 서브모듈 사용
- **내부 타입**: `src/types/compatibility.ts`에서 하위 호환성 유지
- **Core 인터페이스**: `orkis-interface/src/core/`에서 프레임워크 타입 정의

## 주요 컴포넌트

### Controllers

- `LoginController.ts` - 인증 관련 엔드포인트
- `ChatController.ts` - 채팅 기능 엔드포인트 (Legacy)
- `MenuController.ts` - 메뉴 관련 엔드포인트

### Chat Module (Clean Architecture)

- **구조**: `src/main/chat/`
- **Controllers**:
  - `ChatSessionController.ts` - 세션 관리 API
  - `ChatMessageController.ts` - 메시지 관리 API
  - `ChatStreamController.ts` - 실시간 스트리밍 API
  - `ChatExportController.ts` - 내보내기 API
  - `ChatController.legacy.ts` - 기존 API 호환성
- **Services**:
  - `ChatValidationService.ts` - 입력 검증 및 권한
  - `ChatSessionService.ts` - 세션 비즈니스 로직
  - `ChatMessageService.ts` - 메시지 처리 및 RAG 연동
  - `ChatStreamService.ts` - 실시간 스트림 처리
  - `ChatExportService.ts` - 다양한 형식 내보내기
- **Repositories**:
  - `BaseChatRepository.ts` - 공통 CRUD 연산
  - `ChatSessionRepository.ts` - 세션 데이터 액세스
  - `ChatMessageRepository.ts` - 메시지 데이터 액세스

### Services

- `LoginService.ts` - 핸들러 패턴 기반 로그인 서비스
- `ChatDao.ts` - 채팅 데이터 액세스

### 데이터베이스

- **FileDatabase**: JSON 파일 기반 데이터 저장
- **위치**: `src/db_file/`
- **테이블**: USER_INFO.json 등

## 환경 설정

### 개발 환경

- **Docker Compose**: `docker-compose.dev.yml`
- **환경 변수**: `resources/dev.env`
- **포트**: 8080 (컨테이너 내부: 3000)

### 실행 방법

```bash
# 개발 서버 시작
docker-compose -f docker-compose.dev.yml up --build -d

# 로그 확인
docker logs orkis-backend-dev

# 서비스 중지
docker-compose -f docker-compose.dev.yml down
```

## API 엔드포인트

### 인증 관련

- `POST /auth/login` - ID/PW 로그인
- `POST /auth/oauthToken` - OAuth URL 생성
- `POST /auth/loginCheck` - OAuth 콜백 처리
- `POST /auth/refresh` - 토큰 갱신
- `POST /auth/logout` - 로그아웃

### 채팅 관련 (새로운 구조)

#### 세션 관리

- `POST /chat/sessions` - 세션 생성
- `GET /chat/sessions` - 세션 목록 조회
- `GET /chat/sessions/:id` - 특정 세션 조회
- `PUT /chat/sessions/:id` - 세션 정보 수정
- `DELETE /chat/sessions/:id` - 세션 삭제

#### 메시지 관리

- `POST /chat/messages` - 메시지 전송
- `GET /chat/messages` - 메시지 목록 조회
- `PUT /chat/messages/:id` - 메시지 수정
- `DELETE /chat/messages/:id` - 메시지 삭제
- `POST /chat/messages/save` - 메시지 일괄 저장

#### 실시간 스트리밍

- `POST /chat/stream/start` - 스트림 시작
- `GET /chat/stream/:id` - SSE 스트림 연결
- `GET /chat/stream/:id/status` - 스트림 상태 조회
- `POST /chat/stream/:id/stop` - 스트림 중지

#### 데이터 내보내기

- `POST /chat/export/session` - 단일 세션 내보내기
- `POST /chat/export/sessions` - 다중 세션 내보내기
- `POST /chat/export/daterange` - 날짜 범위별 내보내기
- `GET /chat/export/:id/status` - 내보내기 상태 조회
- `GET /chat/export/:id/download` - 내보내기 파일 다운로드
- `GET /chat/export/formats` - 지원 형식 조회

## 개발 가이드라인

### 로깅 정책

- **STRICTLY NO console.log**: Backend 코드에서는 절대 `console.log`, `console.error`, `console.warn` 등을 사용하지 않음
- **Orkis Core Logger 사용 필수**: 모든 로깅은 `orkis-core/utils/Logger`를 사용
- **Logger 사용법**:

  ```typescript
  import { logger } from "@orkis/core/utils";

  // 정보 로그
  logger.info("사용자 로그인 시도", { userId, timestamp });

  // 경고 로그
  logger.warn("토큰 만료 임박", { token: token.substring(0, 8) });

  // 에러 로그
  logger.error("데이터베이스 연결 실패", error);

  // 디버그 로그 (개발환경에서만 출력)
  logger.debug("OAuth 요청 디버깅", { url: req.url, filteredType });
  ```

### 디버깅 및 개발용 로깅

- **개발 환경에서만 출력**: `logger.debug()` 사용하여 개발용 로그 작성
- **운영 환경 고려**: `logger.info()` 이상의 레벨만 운영 환경에서 출력
- **구조화된 로깅**: 객체 형태로 정보 전달하여 로그 분석 용이성 향상
- **민감정보 보호**: 토큰, 패스워드 등은 일부분만 로깅 (예: `token.substring(0, 8)`)

### 새로운 로그인 방식 추가

1. `src/main/auth/handlers/`에 새 핸들러 클래스 생성
2. `ILoginHandler` 인터페이스 구현
3. `LoginHandlerFactory`에 핸들러 등록
4. 환경 변수 및 설정 추가

### 타입 정의

- **공유 타입**: `orkis-interface` 서브모듈 사용
- **내부 타입**: `src/types/` 폴더에 정의
- **호환성**: `compatibility.ts`로 기존 코드와의 호환성 유지

### 에러 처리

- **OrkisError**: 커스텀 에러 클래스 사용
- **응답 형식**: `{success: boolean, data/error, timestamp}` 구조
- **로깅**: 자동 요청/응답 로깅

## 주의사항

- **STRICTLY NO EMOJIS**: Absolutely do not use emojis, emoticons, or any decorative symbols in any file creation, source code modification, comments, documentation, or any other content. This applies to all files including but not limited to .ts, .js, .md, .json, and any other file types.
- **서브모듈**: orkis-interface는 git submodule로 관리
- **Docker**: 컨테이너 이름 충돌 시 `docker rm -f` 사용
- **환경변수**: 민감한 정보는 .env 파일에서 관리
- **포트**: 호스트 8080, 컨테이너 3000 포트 매핑

## 문서 작성 기준

- **새로운 설계/분석 문서**: 루트의 `doc/YYYY-MM-DD/` 폴더에 생성
- **백엔드 전용 문서**: 이 프로젝트 내 유지 (README.md 등)
- **공통 문서**: 루트 레벨에서 관리

## 최근 변경사항

- 로그인 시스템을 Handler Pattern으로 리팩토링
- orkis-interface 서브모듈 구조 개선 (ai/backend/core/shared)
- 타입 호환성 레이어 추가 (src/types/compatibility.ts)
- Docker 개발 환경 안정화
- Jenkins 빌드 최적화 - better-sqlite3 의존성 제거로 Alpine Linux 빌드 안정화
- 런타임 테스트 완료 - Handler Pattern 정상 동작 확인
- 서브모듈 동기화 완료 - Frontend/Backend 모두 최신 인터페이스 사용
- **Chat 모듈 Clean Architecture 리팩토링 완료**:
  - 900+ 라인 단일 컨트롤러를 계층별로 분리
  - Repository Pattern으로 데이터 액세스 추상화
  - Service Layer로 비즈니스 로직 분리
  - 실시간 스트리밍 (SSE) 지원
  - 다양한 형식 내보내기 (JSON/TXT/CSV/MD/PDF)
  - 압축 지원 (ZIP/GZIP)
  - 기존 API와 100% 호환성 유지 (ChatController.legacy.ts)

## Backend 코드 수정 시 필수 준수사항

### API 엔드포인트 보존 원칙

#### 기존 API 유지 필수

```typescript
//  올바른 방법: 새로운 API 추가하면서 기존 API 유지
// 기존 API (절대 삭제하지 않음)
@RequestMapping({ route: "/chat/send", method: REQUEST_TYPE.POST })
async sendMessage() { /* 기존 로직 유지 */ }

// 새로운 API
@RequestMapping({ route: "/chat/v2/send", method: REQUEST_TYPE.POST })
async sendMessageV2() { /* 새로운 로직 */ }

// ❌ 잘못된 방법: 기존 API 삭제 또는 시그니처 변경
// @RequestMapping({ route: "/chat/send", method: REQUEST_TYPE.POST })
// async sendMessage(newParam: string) { /* 기존과 다른 파라미터 */ }
```

#### 응답 형식 호환성 유지

```typescript
//  응답에 필드 추가 (기존 필드는 유지)
interface ChatResponse {
  success: boolean; // 기존 필드 유지
  data: any; // 기존 필드 유지
  timestamp: string; // 기존 필드 유지
  // 새로운 필드 추가 가능
  metadata?: any; // Optional로 추가
  version?: string; // Optional로 추가
}

// ❌ 기존 필드 제거 또는 이름 변경 금지
interface BadChatResponse {
  result: boolean; // ❌ success → result 이름 변경 금지
  payload: any; // ❌ data → payload 이름 변경 금지
}
```

### 데이터베이스 및 파일 시스템 보존

#### 파일 DB 구조 변경 시 주의사항

```typescript
//  올바른 방법: 기존 필드 유지하며 새로운 필드 추가
interface ChatSessionV2 {
  id: string; // 기존 필드 유지
  userId: string; // 기존 필드 유지
  title: string; // 기존 필드 유지
  createdAt: string; // 기존 필드 유지
  updatedAt: string; // 기존 필드 유지
  messageCount: number; // 기존 필드 유지
  // 새로운 필드 추가
  tags?: string[]; // Optional 필드로 추가
  metadata?: any; // Optional 필드로 추가
}
```

#### 마이그레이션 스크립트 필수

```typescript
// 데이터 구조 변경 시 마이그레이션 함수 작성
async function migrateChatSessions() {
  const sessions = this.readJsonFile(this.DB_FILES.SESSIONS);
  const migratedSessions = sessions.map((session: any) => ({
    ...session, // 기존 필드 모두 유지
    tags: session.tags || [], // 새로운 필드 기본값 설정
    metadata: session.metadata || {} // 새로운 필드 기본값 설정
  }));
  this.writeJsonFile(this.DB_FILES.SESSIONS, migratedSessions);
}
```

### Clean Architecture 적용 시 점진적 변경

#### Service Layer 도입 시

```typescript
//  기존 Controller는 유지하면서 새로운 Service 추가
@Controller("/chat")
export class ChatController {
  @Autowired
  private chatService: ChatService; // 새로운 Service 주입

  @Autowired
  private chatDao: ChatDao; // 기존 DAO 유지 (Legacy 지원)

  // 기존 메서드는 그대로 유지 (Legacy API)
  @RequestMapping({ route: "/send", method: REQUEST_TYPE.POST })
  async sendMessage(@RequestBody() request: any) {
    // 기존 로직을 Service로 위임하되, 인터페이스는 동일하게 유지
    return await this.chatService.sendMessageLegacy(request);
  }

  // 새로운 Clean Architecture 적용 메서드
  @RequestMapping({ route: "/v2/send", method: REQUEST_TYPE.POST })
  async sendMessageV2(@RequestBody() request: SendMessageRequest) {
    return await this.chatService.sendMessage(request);
  }
}
```

#### Repository Pattern 도입 시

```typescript
//  기존 DAO와 병행하여 Repository 운영
export class ChatMessageService {
  @Autowired
  private messageRepository: ChatMessageRepository; // 새로운 Repository

  @Autowired
  private chatDao: ChatDao; // 기존 DAO 유지

  async createMessage(message: ChatMessage): Promise<ChatMessage> {
    try {
      // 새로운 Repository 사용 시도
      return await this.messageRepository.createMessage(message);
    } catch (error) {
      console.warn("Repository failed, falling back to DAO:", error);
      // 실패 시 기존 DAO로 fallback
      return await this.chatDao.createMessage(message);
    }
  }
}
```

### Redis 연동 주의사항

#### 읽기 전용 정책 준수

```typescript
//  Redis에서 읽기만 수행
export class ChatDao {
  async getRagStatus(chatId: string): Promise<any> {
    //  읽기 작업만 수행
    const processKey = `${chatId}:process`;
    const processData = await redis.hgetall(processKey);
    return processData;
  }

  // ❌ Redis 쓰기 작업 금지 (AI 서버만 쓰기 가능)
  // async setProcessStatus(chatId: string, status: any): Promise<void> {
  //   await redis.hset(`${chatId}:process`, status); // 이런 코드 작성 금지
  // }
}

//  세션 매핑은 메모리 기반 관리 사용
export class SessionMappingManager {
  private static instance: SessionMappingManager;
  private mappings: Map<string, any> = new Map();

  setMapping(sessionId: string, chatId: string, ttl: number): void {
    // 메모리 기반으로 관리 (Redis 쓰기 대신)
    this.mappings.set(sessionId, {
      chatId,
      expiresAt: Date.now() + ttl * 1000
    });
  }
}
```

### 환경변수 및 설정 호환성

#### 환경변수 추가 시

```typescript
//  기존 환경변수는 유지하고 새로운 변수 추가
const config = {
  // 기존 변수 (절대 제거하지 않음)
  PORT: process.env.PORT || 3000,
  RAG_SERVER_URL: process.env.RAG_SERVER_URL,
  USE_RAG_SERVER: process.env.USE_RAG_SERVER !== "false",

  // 새로운 변수 추가 (기본값 설정)
  ENABLE_NEW_FEATURE: process.env.ENABLE_NEW_FEATURE === "true",
  NEW_TIMEOUT: parseInt(process.env.NEW_TIMEOUT || "30000")
};

// ❌ 기존 환경변수 이름 변경 금지
// const config = {
//   SERVER_PORT: process.env.PORT,  // ❌ PORT → SERVER_PORT 변경 금지
// };
```

### 채팅 스트리밍 (SSE) 프로토콜 보존

#### 이벤트 형식 호환성

```typescript
//  기존 이벤트 형식 유지하면서 새로운 이벤트 추가
export class ChatStreamService {
  private sendEventToClient(eventType: string, data: any, onChunk: Function) {
    switch (eventType) {
      // 기존 이벤트 형식 유지
      case "title_update":
        onChunk(
          JSON.stringify({
            type: "title_update",
            sessionId: data.sessionId,
            title: data.title
          })
        );
        break;

      // 새로운 이벤트 추가
      case "process_update":
        onChunk(
          JSON.stringify({
            type: "process_update",
            processes: data.processes,
            sqlQuery: data.sqlQuery
          })
        );
        break;

      // 기존 content 스트림 유지
      default:
        onChunk(data.content || data);
        break;
    }
  }
}
```

### 에러 처리 및 Fallback

#### 견고한 오류 처리

```typescript
//  기존 기능 실패 시 안전한 fallback 제공
export class ChatStreamService {
  async streamMessage(
    userId: string,
    request: SendMessageRequest,
    abortSignal: AbortSignal,
    onChunk: Function
  ): Promise<void> {
    try {
      // 새로운 기능 시도
      if (process.env.USE_NEW_STREAMING === "true") {
        await this.streamWithNewLogic(userId, request, abortSignal, onChunk);
        return;
      }
    } catch (error) {
      console.warn("New streaming failed, falling back to legacy:", error);
    }

    // 실패 시 기존 방식으로 fallback
    await this.streamWithLegacyLogic(userId, request, abortSignal, onChunk);
  }

  private async streamWithLegacyLogic(...args: any[]): Promise<void> {
    // 기존 검증된 로직 유지
    // 절대 이 부분은 변경하지 않음
  }
}
```

### 로깅 및 모니터링 일관성

#### 로그 형식 표준화

```typescript
//  기존 로그 패턴 유지하면서 새로운 정보 추가
console.log(`[STREAM] 스트리밍 요청 받음: ${sessionId}`); // 기존 형식 유지
console.log(`[STREAM] 프로세스 업데이트 전송: ${chatId}`); // 새로운 로그 추가

// ❌ 기존 로그 형식 변경 금지
// logger.info('Stream request received', { sessionId }); // 형식 변경 금지
```

### 테스트 및 검증

#### 기존 기능 회귀 테스트 필수

```typescript
// 수정 전/후 이 테스트들이 반드시 통과해야 함
describe("Backend Legacy Compatibility Tests", () => {
  test("기존 로그인 API 정상 동작", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ id: "test", password: "test" });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("기존 채팅 전송 API 정상 동작", async () => {
    const response = await request(app)
      .post("/chat/send")
      .send({ sessionId: "test", message: "hello" });
    expect(response.status).toBe(200);
  });

  test("SSE 스트리밍 기존 형식 유지", async () => {
    // SSE 이벤트 형식이 기존과 동일한지 확인
  });
});
```

### 배포 체크리스트

#### 배포 전 필수 확인사항

- [ ] 기존 로그인 기능 정상 동작 확인
- [ ] 기존 채팅 전송/수신 기능 정상 동작 확인
- [ ] SSE 스트리밍 기존 클라이언트와 호환성 확인
- [ ] 파일 DB 읽기/쓰기 정상 동작 확인
- [ ] Redis 연동 (읽기 전용) 정상 동작 확인
- [ ] 환경변수 호환성 확인
- [ ] Docker 컨테이너 정상 구동 확인
- [ ] 성능 저하 없음 확인 (기존 대비 30% 이내)

이러한 원칙을 준수하여 **기존 Backend 기능의 안정성을 보장**하면서 새로운 기능을 안전하게 추가할 수 있습니다.

## 문서 작성 기준

### 기술 문서 위치 가이드라인

1. **Backend 관련 기술 문서** → `doc/YYYY-MM-DD/orkis-backend/filename.md`

   - 예: API 설계, 아키텍처 분석, 성능 최적화 방안
   - 날짜 형식: `YYYY-MM-DD` (예: 2025-08-14)

2. **공통/프로젝트 전체 문서** → `doc/YYYY-MM-DD/filename.md`

   - 예: 전체 시스템 아키텍처, 마이그레이션 계획

3. **API 문서** → `doc/api/filename.md`
   - 예: REST API 명세, 인터페이스 정의

### 파일명 규칙

- kebab-case 사용 (예: `chat-module-clean-architecture.md`)
- 한글 파일명 허용 (예: `채팅-시스템-분석.md`)
- Backend 관련임을 명시 시 접두사 사용 (예: `backend-authentication-system.md`)
