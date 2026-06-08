# AI Server 인터페이스

이 디렉토리는 Backend와 RAG Server 간의 통신을 위한 인터페이스를 정의합니다.

## 파일 구조

- `generation.ts`: RAG 서버와의 대화 요청/응답 인터페이스
- `streaming.ts`: SSE 스트리밍 관련 인터페이스
- `errors.ts`: 에러 처리 관련 타입 및 메시지

## 주요 인터페이스

### 대화 요청/응답

```typescript
// RAG 서버로 대화 요청
interface RagConversationRequest {
  chatroom_id: string;  // 세션 ID
  question: string;     // 사용자 질문
  keywords?: string[];  // 키워드 (선택)
  hint?: string;       // 힌트 (선택)
  db_id?: string;      // 데이터베이스 ID (선택)
  with_title?: boolean; // 제목 생성 여부
}

// RAG 서버 응답
interface RagConversationResponse {
  chat_id: string;      // 채팅 ID
  title?: string;       // 생성된 제목 (첫 메시지인 경우)
  content?: string;     // 응답 내용
  status?: string;      // 상태
  error?: string;       // 에러 메시지
}
```

### 스트리밍

```typescript
// SSE 스트림 청크
interface StreamChunk {
  type: StreamDataType;
  data: any;
  timestamp?: string;
}

// 프로세스 업데이트
interface ProcessUpdate {
  sequence: string;
  process_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  name: string;
  description?: string;
}
```

### 에러 처리

```typescript
// 에러 타입
enum ChatErrorType {
  INVALID_REQUEST = 'INVALID_REQUEST',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  MESSAGE_SAVE_FAILED = 'MESSAGE_SAVE_FAILED',
  RAG_SERVER_ERROR = 'RAG_SERVER_ERROR',
  RAG_SERVER_TIMEOUT = 'RAG_SERVER_TIMEOUT',
  STREAM_ERROR = 'STREAM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## Backend에서 사용하기

```typescript
import {
  RagConversationRequest,
  RagConversationResponse,
  ChatErrorType,
  ChatErrorMessages
} from 'orkis-interface_new';

// RAG 서버 호출
const request: RagConversationRequest = {
  chatroom_id: sessionId,
  question: userMessage,
  with_title: isFirstMessage
};

// 에러 처리
if (error) {
  const errorInfo = ChatErrorMessages[ChatErrorType.RAG_SERVER_ERROR];
  throw new Error(errorInfo.userMessage);
}
```

## 마이그레이션 가이드

기존 하드코딩된 타입에서 이 인터페이스로 마이그레이션하려면:

1. `orkis-interface_new` 패키지 import
2. 하드코딩된 타입을 인터페이스로 교체
3. 에러 처리를 `ChatErrorType`과 `ChatErrorMessages` 사용하도록 변경