# WebSocket 실시간 채팅 기능 분석 문서

작성일: 2025-09-21
분석자: Claude AI Assistant
프로젝트: ORKIS Backend/Frontend WebSocket System

## 목차
1. [시스템 개요](#시스템-개요)
2. [기능별 상세 분석](#기능별-상세-분석)
3. [테스트 케이스 및 결과](#테스트-케이스-및-결과)
4. [발견된 문제점](#발견된-문제점)
5. [개선 권고사항](#개선-권고사항)
6. [구현 로드맵](#구현-로드맵)

---

## 시스템 개요

### 아키텍처
- **Backend WebSocket Server**: 포트 8081에서 실행
- **Frontend WebSocket Client**: 테스트 컴포넌트만 존재 (실제 채팅 UI 미구현)
- **통신 프로토콜**: WebSocket (ws://)
- **인증 방식**: JWT 토큰 또는 세션 기반

### 주요 구성 요소

#### Backend Components
```
src/websocket/
├── WebSocketServer.ts       # 메인 서버 클래스
├── MessageHandler.ts        # 메시지 처리 로직
├── auth.ts                  # 인증 처리
├── types.ts                 # 타입 정의
├── QuestionClassifier.ts    # 질문 분류기
└── SqlProcessManager.ts     # SQL 프로세스 관리
```

#### Frontend Components
```
src/components/
└── WebSocketTest.tsx        # 테스트 컴포넌트 (실제 채팅 UI 없음)
```

---

## 기능별 상세 분석

### 1. 연결 및 인증 (Connection & Authentication)

#### 현재 구현 상태
- ✅ JWT 토큰 기반 인증 구현
- ✅ 세션 기반 인증 구현
- ✅ 연결 시 클라이언트 등록 및 관리
- ⚠️ 재연결 메커니즘 미구현

#### 코드 분석
```typescript
// WebSocketServer.ts
verifyClient: async (info, cb) => {
  const jwtPayload = await verifyWebSocketToken(info.req);
  const sessionAuth = await verifySessionAuth(info.req);

  if (jwtPayload || sessionAuth) {
    cb(true);
  } else {
    cb(false, 401, "Unauthorized");
  }
}
```

#### 문제점
- **문제 1**: 토큰 만료 시 자동 갱신 메커니즘 없음
- **문제 2**: 네트워크 단절 시 자동 재연결 미구현
- **문제 3**: 클라이언트 식별자가 단순 timestamp 기반

---

### 2. 메시지 타입 및 처리 흐름

#### 지원되는 메시지 타입

##### Client → Server
- `USER_MESSAGE`: 사용자 메시지 전송
- `CANCEL_REQUEST`: 요청 취소
- `UPDATE_TITLE`: 세션 제목 업데이트 ✅ (최근 추가)
- `PING`: 연결 상태 확인

##### Server → Client
- `CLASSIFICATION_RESULT`: 질문 분류 결과
- `PROCESSING_STATUS`: 처리 상태 업데이트
- `STREAM_CHUNK`: 스트리밍 응답 청크
- `SQL_STEP`: SQL 처리 단계
- `FINAL_RESULT`: 최종 결과
- `TITLE_UPDATED`: 제목 업데이트 완료 ✅ (최근 추가)
- `ERROR`: 에러 메시지
- `PONG`: 핑 응답

#### 메시지 처리 플로우
```
1. USER_MESSAGE 수신
   ↓
2. AI 서버 호출 (chat_id 획득)
   ↓
3. 질문 분류 (general/sql)
   ↓
4. 타입별 처리
   ├─ General: 일반 스트리밍
   └─ SQL: 단계별 프로세스 + 결과
   ↓
5. FINAL_RESULT 전송
```

#### 문제점
- **문제 4**: 대용량 메시지 처리 시 청킹 미구현
- **문제 5**: 메시지 큐잉 시스템이 있지만 활용 안됨
- **문제 6**: 에러 복구 메커니즘 부족

---

### 3. SQL 쿼리 처리

#### 현재 구현 상태
- ✅ SQL 프로세스 단계별 상태 전송
- ✅ Redis 기반 상태 관리
- ⚠️ SQL 결과 데이터 조회 개선 필요 (방금 수정)

#### SQL 처리 단계
1. `ANALYZING`: 질문 분석
2. `SCHEMA_LOADING`: 스키마 로딩
3. `QUERY_BUILDING`: 쿼리 생성
4. `VALIDATING`: 검증
5. `EXECUTING`: 실행
6. `FORMATTING`: 결과 포맷팅

#### 최근 수정사항
```typescript
// ChatDao.ts - getRagStatus 메서드 개선
// SQL 결과 데이터(columns, data) Redis에서 조회 추가
const resultKey = `${chatId}:result`;
const sqlResult = await redis.get(resultKey);
// columns, data, queryTitle 등 반환
```

#### 문제점
- **문제 7**: SQL 결과가 매우 큰 경우 처리 방안 없음
- **문제 8**: 쿼리 실행 타임아웃 설정 없음
- **문제 9**: 동시 다중 쿼리 처리 미지원

---

### 4. 스트리밍 응답 처리

#### 현재 구현 상태
- ✅ 실시간 스트리밍 구현
- ✅ AbortController 기반 취소 지원
- ⚠️ 백프레셔(Backpressure) 처리 없음

#### 스트리밍 플로우
```typescript
// MessageHandler.ts
await this.chatStreamService.streamMessage(
  userId,
  request,
  abortController.signal,
  (chunk: string) => {
    // 청크별 처리 및 전송
    this.sendMessage(ws, {
      type: MessageType.STREAM_CHUNK,
      payload: { content: chunk }
    });
  }
);
```

#### 문제점
- **문제 10**: 클라이언트가 느릴 때 버퍼 오버플로우 가능
- **문제 11**: 부분 메시지 재전송 메커니즘 없음

---

### 5. Frontend 통합

#### 현재 구현 상태
- ⚠️ WebSocketTest.tsx 테스트 컴포넌트만 존재
- ❌ 실제 채팅 UI 컴포넌트 없음
- ❌ WebSocket 서비스 레이어 없음
- ❌ 상태 관리 (Redux/Zustand) 통합 없음

#### 필요한 구현
```typescript
// 필요한 Frontend 구조
src/
├── services/
│   └── websocketService.ts      # WebSocket 서비스
├── hooks/
│   └── useWebSocket.ts          # React Hook
├── store/
│   └── chatStore.ts             # 채팅 상태 관리
└── components/
    ├── ChatInterface.tsx         # 채팅 UI
    ├── MessageList.tsx           # 메시지 목록
    ├── MessageInput.tsx          # 입력 컴포넌트
    └── SqlResultView.tsx         # SQL 결과 뷰어
```

#### 문제점
- **문제 12**: Frontend WebSocket 통합 완전 미구현
- **문제 13**: 오프라인 메시지 큐잉 없음
- **문제 14**: 메시지 동기화 메커니즘 없음

---

## 테스트 케이스 및 결과

### 테스트 시나리오

#### 1. 연결 테스트
```javascript
// 테스트 코드
const ws = new WebSocket('ws://localhost:8081/ws');
ws.onopen = () => console.log('연결 성공');
ws.onerror = (error) => console.error('연결 실패', error);
```
- **결과**: ❌ 인증 토큰 없이 연결 실패 (정상)
- **결과**: ✅ 토큰 포함 시 연결 성공

#### 2. 메시지 전송 테스트
```javascript
// USER_MESSAGE 전송
ws.send(JSON.stringify({
  id: 'test-123',
  type: 'USER_MESSAGE',
  timestamp: new Date(),
  payload: {
    content: 'Hello, World!',
    sessionId: 'session-123'
  }
}));
```
- **결과**: ✅ 메시지 처리 성공
- **문제**: 세션 ID 검증 없이 처리됨

#### 3. SQL 쿼리 테스트
```javascript
// SQL 질문 전송
ws.send(JSON.stringify({
  id: 'sql-test-456',
  type: 'USER_MESSAGE',
  payload: {
    content: 'Show me all users from the database',
    questionType: 'sql'
  }
}));
```
- **결과**: ⚠️ 프로세스 상태는 전송되나 결과 데이터 누락 (수정 완료)

#### 4. 제목 업데이트 테스트
```javascript
// UPDATE_TITLE 전송
ws.send(JSON.stringify({
  id: 'title-789',
  type: 'UPDATE_TITLE',
  payload: {
    sessionId: 'session-123',
    title: '새로운 채팅 제목',
    titleModified: true
  }
}));
```
- **결과**: ✅ 제목 업데이트 성공 (최근 구현)

#### 5. 스트림 취소 테스트
```javascript
// CANCEL_REQUEST 전송
ws.send(JSON.stringify({
  id: 'cancel-999',
  type: 'CANCEL_REQUEST',
  payload: {
    messageId: 'test-123'
  }
}));
```
- **결과**: ✅ 스트림 취소 동작

---

## 발견된 문제점

### 심각도: 높음 🔴
1. **Frontend WebSocket 통합 완전 미구현**
   - 실제 채팅 UI 없음
   - WebSocket 서비스 레이어 없음
   - 상태 관리 통합 없음

2. **메시지 동기화 메커니즘 부재**
   - 오프라인 메시지 처리 없음
   - 메시지 순서 보장 없음
   - 중복 메시지 방지 없음

3. **에러 복구 메커니즘 부족**
   - 자동 재연결 없음
   - 메시지 재전송 없음
   - 부분 실패 처리 없음

### 심각도: 중간 🟡
4. **성능 최적화 부재**
   - 대용량 데이터 처리 방안 없음
   - 백프레셔 처리 없음
   - 메시지 압축 없음

5. **보안 검증 미흡**
   - 세션 ID 검증 없음
   - 메시지 크기 제한 없음
   - Rate limiting 없음

6. **모니터링 및 로깅 부족**
   - 메트릭 수집 없음
   - 에러 추적 없음
   - 성능 모니터링 없음

### 심각도: 낮음 🟢
7. **코드 품질 개선 필요**
   - 타입 정의 일부 누락
   - 테스트 코드 없음
   - 문서화 부족

---

## 개선 권고사항

### 1단계: 긴급 수정 (1-2주)

#### Frontend WebSocket 기본 구현
```typescript
// websocketService.ts
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private messageQueue: Message[] = [];

  connect(token: string) {
    this.ws = new WebSocket(`ws://localhost:8081/ws?token=${token}`);
    this.setupEventHandlers();
    this.startHeartbeat();
  }

  private setupReconnect() {
    setTimeout(() => {
      if (this.reconnectAttempts < 5) {
        this.reconnectAttempts++;
        this.connect(this.token);
      }
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000));
  }

  sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }
}
```

#### React Hook 구현
```typescript
// useWebSocket.ts
export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const wsService = useRef<WebSocketService>();

  useEffect(() => {
    wsService.current = new WebSocketService();
    wsService.current.onMessage((msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => wsService.current?.disconnect();
  }, []);

  return { connected, messages, sendMessage: wsService.current?.sendMessage };
}
```

### 2단계: 핵심 기능 개선 (2-4주)

#### 메시지 동기화 시스템
```typescript
// 메시지 ID 기반 동기화
interface SyncedMessage {
  id: string;
  clientId: string;
  serverId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  retryCount: number;
  timestamp: number;
}

class MessageSyncManager {
  private pendingMessages = new Map<string, SyncedMessage>();

  async syncMessages() {
    const pending = Array.from(this.pendingMessages.values())
      .filter(m => m.status === 'pending' || m.status === 'failed');

    for (const msg of pending) {
      await this.retrySend(msg);
    }
  }
}
```

#### 에러 처리 개선
```typescript
// 에러 복구 시스템
class ErrorRecoveryManager {
  handleError(error: WebSocketError) {
    switch (error.code) {
      case 'CONNECTION_LOST':
        this.attemptReconnection();
        break;
      case 'AUTH_EXPIRED':
        this.refreshAuthToken();
        break;
      case 'MESSAGE_FAILED':
        this.requeueMessage(error.messageId);
        break;
    }
  }
}
```

### 3단계: 고급 기능 (4-6주)

#### 성능 최적화
```typescript
// 메시지 압축
class CompressionManager {
  compress(message: string): Uint8Array {
    // pako 또는 다른 압축 라이브러리 사용
    return pako.deflate(message);
  }

  decompress(data: Uint8Array): string {
    return pako.inflate(data, { to: 'string' });
  }
}

// 백프레셔 처리
class BackpressureManager {
  private buffer: Message[] = [];
  private sending = false;

  async send(message: Message) {
    this.buffer.push(message);
    if (!this.sending) {
      await this.flush();
    }
  }

  private async flush() {
    this.sending = true;
    while (this.buffer.length > 0) {
      const batch = this.buffer.splice(0, 10);
      await this.sendBatch(batch);
      await this.delay(100);
    }
    this.sending = false;
  }
}
```

#### 모니터링 시스템
```typescript
// 메트릭 수집
class MetricsCollector {
  private metrics = {
    messagesSet: 0,
    messagesReceived: 0,
    errors: 0,
    latency: [],
    reconnections: 0
  };

  trackMessage(direction: 'sent' | 'received') {
    if (direction === 'sent') {
      this.metrics.messagesSent++;
    } else {
      this.metrics.messagesReceived++;
    }
  }

  trackLatency(ms: number) {
    this.metrics.latency.push(ms);
  }

  getReport() {
    return {
      ...this.metrics,
      avgLatency: this.calculateAverage(this.metrics.latency)
    };
  }
}
```

---

## 구현 로드맵

### Phase 1: Foundation (Week 1-2)
- [ ] Frontend WebSocket 서비스 구현
- [ ] React Hook 및 컴포넌트 개발
- [ ] 기본 채팅 UI 구현
- [ ] 자동 재연결 메커니즘

### Phase 2: Core Features (Week 3-4)
- [ ] 메시지 동기화 시스템
- [ ] 에러 복구 메커니즘
- [ ] 오프라인 지원
- [ ] SQL 결과 뷰어 컴포넌트

### Phase 3: Enhancement (Week 5-6)
- [ ] 성능 최적화 (압축, 백프레셔)
- [ ] 보안 강화 (Rate limiting, 검증)
- [ ] 모니터링 대시보드
- [ ] 단위/통합 테스트

### Phase 4: Production Ready (Week 7-8)
- [ ] 부하 테스트
- [ ] 문서화 완성
- [ ] CI/CD 파이프라인
- [ ] 프로덕션 배포

---

## 결론

ORKIS 프로젝트의 WebSocket 실시간 채팅 시스템은 Backend 측면에서는 기본적인 구조가 잘 구현되어 있으나, Frontend 통합이 완전히 누락된 상태입니다.

### 주요 성과
- ✅ Backend WebSocket 서버 구현 완료
- ✅ 메시지 타입별 처리 로직 구현
- ✅ SQL 쿼리 처리 시스템 구현
- ✅ 최근 titleModified 기능 추가

### 시급한 개선 필요 사항
1. **Frontend WebSocket 통합** - 가장 시급
2. **메시지 동기화 메커니즘**
3. **에러 복구 시스템**
4. **성능 최적화**

이 문서에서 제시한 로드맵을 따라 단계적으로 개선한다면, 안정적이고 확장 가능한 실시간 채팅 시스템을 구축할 수 있을 것입니다.

---

## 부록: 테스트 스크립트

### WebSocket 연결 테스트
```javascript
// test-connection.js
const WebSocket = require('ws');

function testConnection() {
  const ws = new WebSocket('ws://localhost:8081/ws', {
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  });

  ws.on('open', () => {
    console.log('✅ Connected successfully');
    testMessages(ws);
  });

  ws.on('message', (data) => {
    console.log('📥 Received:', JSON.parse(data));
  });

  ws.on('error', (error) => {
    console.error('❌ Error:', error);
  });
}

function testMessages(ws) {
  // Test USER_MESSAGE
  ws.send(JSON.stringify({
    id: Date.now().toString(),
    type: 'USER_MESSAGE',
    timestamp: new Date(),
    payload: {
      content: 'Test message',
      sessionId: 'test-session'
    }
  }));
}

testConnection();
```

### 부하 테스트
```javascript
// load-test.js
const WebSocket = require('ws');

async function loadTest(numClients = 100, messagesPerClient = 10) {
  const clients = [];

  for (let i = 0; i < numClients; i++) {
    const ws = new WebSocket('ws://localhost:8081/ws');
    clients.push(ws);

    ws.on('open', async () => {
      for (let j = 0; j < messagesPerClient; j++) {
        ws.send(JSON.stringify({
          id: `${i}-${j}`,
          type: 'USER_MESSAGE',
          payload: { content: `Client ${i} Message ${j}` }
        }));
        await delay(100);
      }
    });
  }

  // Monitor results
  setTimeout(() => {
    console.log(`Test completed: ${numClients} clients, ${messagesPerClient} messages each`);
    clients.forEach(ws => ws.close());
  }, 30000);
}
```

---

*문서 끝*