# WebSocket 기반 채팅 시스템 플로우 문서

## 개요
이 문서는 ORKIS 프로젝트의 WebSocket 기반 실시간 채팅 시스템의 전체 플로우를 설명합니다.

## 핵심 구성 요소

### 1. 백엔드 서버
- **WebSocketServer**: WebSocket 연결 관리 (포트 8081)
- **MessageHandler**: 메시지 처리 및 라우팅
- **ChatStreamService**: AI 서버 통신
- **Redis**: 실시간 데이터 스트리밍
  - chatRedis (6380): 세션 데이터
  - stageRedis (6381): 스트리밍 데이터

### 2. AI 서버
- chat_id 발급 및 관리
- 메시지 처리
- Redis에 스트리밍 데이터 쓰기

### 3. 프론트엔드
- WebSocket 클라이언트
- 메시지 상태 관리
- UI 렌더링

## 전체 플로우

### 1. 연결 수립
```
Frontend → WebSocket Server (8081)
├─ 세션 인증 (sessionId, userId)
├─ WebSocket 연결 수립
└─ 하트비트(PING/PONG) 시작
```

### 2. 메시지 전송 플로우

#### 2.1 사용자 메시지 전송
```
Frontend:
1. 사용자가 메시지 입력
2. 임시 messageId 생성 (temp_xxx)
3. WebSocket으로 USER_MESSAGE 전송
```

#### 2.2 백엔드 처리
```
MessageHandler:
1. USER_MESSAGE 수신
2. AI 서버 호출하여 chat_id 획득 ← 핵심 변경사항
3. chat_id를 messageId로 사용
4. 질문 분류 (SQL/General)
5. CLASSIFICATION_RESULT 전송
6. PROCESSING_STATUS 전송
7. Redis 스트림 읽기 시작
```

#### 2.3 AI 서버 연동
```
ChatStreamService:
1. sendMessageAndGetChatId() 호출
2. RAG 서버로 POST 요청 (SSE와 동일한 설정)
   - URL: RAG_SERVER_URL 또는 기본값
   - 엔드포인트: /conversation
   - OpenAI API Key 포함
3. chat_id 수신
4. sessionId → chat_id 매핑 저장
5. Redis에 0_0 (app_start) 저장 ← 중요: AI 성공 직후 타임스탬프 기록
```

#### 2.4 Redis 스트림 처리
```
MessageHandler.startRedisStreamReading():
1. AI 서버 proc 키 생성 대기 (3초)
2. chat_type이 general/sql이 될 때까지 대기
3. chat_type 확인 후 0_1 (app_work) 등록
4. chat:stream:{chat_id} 키에서 스트림 읽기 (무한 대기)
5. 각 청크마다 WebSocket으로 전송:
   - STREAM_CHUNK: 컨텐츠 스트리밍
   - SQL_STEP: SQL 프로세스 단계
6. chat:final:{chat_id} 키에서 최종 결과 확인
7. FINAL_RESULT 전송
8. PROCESSING_STATUS (completed) 전송
9. 0_2 (app_end) 등록
```

### 3. WebSocket 메시지 타입

#### Client → Server
- **USER_MESSAGE**: 사용자 메시지
- **CANCEL_REQUEST**: 요청 취소
- **PING**: 연결 유지

#### Server → Client
- **CLASSIFICATION_RESULT**: 질문 분류 결과
- **PROCESSING_STATUS**: 처리 상태
- **STREAM_CHUNK**: 스트리밍 컨텐츠
- **SQL_STEP**: SQL 처리 단계
- **FINAL_RESULT**: 최종 결과
- **ERROR**: 에러
- **PONG**: 연결 응답

### 4. Redis 키 구조

#### 스트림 데이터
```
chat:stream:{chat_id}  # 실시간 스트리밍 데이터
chat:final:{chat_id}   # 최종 결과
```

#### 데이터 형식
```json
// 스트림 데이터
{
  "type": "content|process_update|question_type",
  "content": "스트리밍 텍스트",
  "processes": [...],
  "questionType": "sql|general"
}

// 최종 결과
{
  "content": "최종 응답",
  "responseType": "sql|general",
  "metadata": {...},
  "columns": [...],  // SQL인 경우
  "data": [...]       // SQL인 경우
}
```

## Redis Stat 타임스탬프 기록

WebSocket과 SSE 모두 동일한 타이밍에 stat 정보를 기록합니다:

### 타임스탬프 종류
- **0_0 (app_start)**: AI 서버 호출 성공 직후
- **0_1 (app_work)**: 처리 작업 시작 시점 (질문 분류 완료 후)
- **0_2 (app_end)**: 프론트엔드로 전송 완료 시점

### Redis 키 구조
```
{chat_id}:stat
  - 0_0: "1758095981" (Unix timestamp)
  - 0_1: "1758095982"
  - 0_2: "1758095990"
```

## 핵심 변경사항

### 1. chat_id 기반 메시지 관리
- **기존**: 프론트엔드에서 임의로 생성한 messageId 사용
- **변경**: AI 서버에서 받은 chat_id를 messageId로 사용
- **이점**: AI 서버와 완전한 동기화, 정확한 메시지 추적

### 2. Redis 스트림 기반 실시간 처리
- **기존**: SSE 기반 스트리밍
- **변경**: Redis 스트림(XREAD)을 사용한 실시간 데이터 읽기
- **이점**: 확장성 향상, 데이터 손실 방지

### 3. SQL 결과 데이터 포함
- FINAL_RESULT에 SQL 쿼리 결과 데이터(columns, data) 포함
- 실제 테이블 형태로 결과 표시 가능

## 환경 변수

```env
# WebSocket 서버
WEBSOCKET_PORT=8081

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI 서버
AI_SERVER_URL=http://localhost:3000
AI_API_KEY=

# 채팅 Redis
CHAT_REDIS_HOST=localhost
CHAT_REDIS_PORT=6380

# 스테이지 Redis
STAGE_REDIS_HOST=localhost
STAGE_REDIS_PORT=6381
```

## 에러 처리

### 1. AI 서버 연결 실패
- 임시 chat_id 생성 (temp_chat_xxx)
- 로컬 처리 후 응답

### 2. Redis 타임아웃
- 무한 대기 (타임아웃 없음)
- 사용자 취소 시만 중단
- 에러 발생 시 PROCESSING_STATUS (failed) 전송

### 3. WebSocket 연결 끊김
- 자동 재연결 시도 (최대 5회)
- 지수 백오프 (1초 → 2초 → 4초 → 8초 → 16초)

## 성능 최적화

### 1. Redis 스트림
- BLOCK 옵션으로 폴링 최소화
- 청크 단위 스트리밍으로 메모리 효율성
- chat_type 대기 로직으로 정확한 타입 구분
- 무한 대기 루프로 긴 처리 시간 대응

### 2. WebSocket
- 메시지별 핸들러 분리
- 하트비트로 연결 상태 유지
- 무한 대기 루프로 안정성 향상

### 3. 메시지 격리
- sessionId별 메시지 관리
- messageId 기반 이벤트 라우팅

## 모니터링 및 로깅

### 로그 확인
```bash
# WebSocket 서버 로그
docker logs orkis-backend-dev --follow

# 주요 로그 메시지
[MessageHandler] 사용자 메시지: userId=XXX, sessionId=XXX
[MessageHandler] AI 서버로부터 chat_id 수신: XXX
[MessageHandler] Redis 스트림 읽기 시작: messageId=XXX
```

### 디버깅 팁
1. WebSocket 연결 상태 확인
2. Redis 키 확인: `redis-cli -p 6380 keys "*"`
3. AI 서버 응답 확인
4. 브라우저 개발자 도구 Network 탭

## 향후 개선사항

1. **메시지 영속성**: 데이터베이스 저장
2. **재시도 메커니즘**: 실패한 메시지 재전송
3. **부하 분산**: 여러 WebSocket 서버 지원
4. **메트릭 수집**: Prometheus/Grafana 연동
5. **E2E 암호화**: 메시지 보안 강화