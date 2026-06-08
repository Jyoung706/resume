# ORKIS Interface - From-To 방향성 중심 구조

ORKIS 프로젝트의 간소화된 통신 계약 타입 정의 라이브러리

## 설계 원칙

- **통신 계약 중심**: 각 서버 간 통신에 필요한 interface만 정의
- **내부 타입은 각 프로젝트에**: 각 서버 내부에서만 사용하는 타입은 해당 프로젝트에 유지
- **From-To 방향성 명확화**: 폴더명과 JSDoc으로 통신 방향 명시
- **최소한의 공유**: 꼭 필요한 공통 타입만 interface 프로젝트에 포함

## 디렉토리 구조

```
orkis-interface/
├── src/
│   ├── backend/                           # Frontend → Backend 통신
│   │   ├── auth.ts                       # 인증 API (login, signup, logout)
│   │   ├── chat.ts                       # 채팅 API (send message, create session)
│   │   ├── menu.ts                       # 메뉴 API
│   │   └── index.ts
│   │
│   ├── core/                             # Backend → Core Framework 통신
│   │   ├── decorators.ts                 # @Controller, @Service 등 데코레이터 정의
│   │   ├── request.ts                    # Express Request 확장 타입  
│   │   ├── di.ts                         # 의존성 주입 컨테이너 타입
│   │   ├── types.ts                      # Core 기본 타입들
│   │   ├── middleware.ts                 # 미들웨어 인터페이스
│   │   ├── utils.ts                      # 유틸리티 인터페이스
│   │   └── index.ts
│   │
│   ├── ai/                               # Backend → AI Server 통신
│   │   ├── generation.ts                 # 텍스트/SQL 생성 요청
│   │   ├── streaming.ts                  # 스트리밍 응답 처리
│   │   ├── errors.ts                     # AI 에러 타입
│   │   └── index.ts
│   │
│   ├── shared/                           # 공통 데이터 모델 & 통신 타입
│   │   ├── models.ts                     # User, ChatMessage, ChatSession
│   │   ├── api.ts                        # ApiResponse, PaginatedResponse 등 공통 통신 타입
│   │   ├── constants.ts                  # 상수, 에러 코드, 상태값
│   │   └── index.ts
│   │
│   └── index.ts                          # 메인 export
│
├── package.json
├── tsconfig.json
└── README.md
```

## 사용 예시

### Backend 프로젝트에서
```typescript
// Frontend → Backend 통신 타입 & 공통 통신 타입
import { 
  Backend,
  ApiResponse,
  PaginatedResponse,
  User 
} from 'orkis-interface';

// Backend → Core Framework 데코레이터 및 Request 타입
import { Core, CoreRequest } from 'orkis-interface';

// Backend → AI Server 통신 타입  
import { Ai } from 'orkis-interface';

const handleLogin = async (req: Backend.LoginRequest): Promise<ApiResponse<Backend.LoginResponse>> => {
  // 로그인 처리 로직
};
```

### Frontend 프로젝트에서
```typescript
// Frontend → Backend 통신 타입
import { 
  Backend,
  User,
  ChatMessage 
} from 'orkis-interface';

const loginRequest: Backend.LoginRequest = {
  email: 'user@example.com',
  password: 'password',
  loginType: 'email'
};
```

### AI 서버에서
```typescript
// Backend → AI Server 통신 타입
import { Ai } from 'orkis-interface';

// 스트림 청크 사용 예시
const streamChunk: Ai.StreamChunk = {
  type: 'content',
  data: generatedText,
  timestamp: new Date().toISOString()
};
```

## 통신 흐름

```
Core ← Backend → Frontend
           ↓
      AI Server

Backend → Core: core/decorators.ts, request.ts, di.ts
Frontend → Backend: backend/auth.ts, chat.ts, menu.ts
Backend → AI Server: ai/generation.ts, streaming.ts, errors.ts
```

## 주요 특징

1. **양방향 통신 명확화**: Frontend ↔ Backend, Backend ↔ AI Server 등 양방향 통신 타입인지 명확
2. **JSDoc으로 용도 표시**: 각 interface마다 통신 방향 명시
3. **폴더명으로 구분**: `backend`, `core`, `ai`로 간결하게 구분
4. **네임스페이스 활용**: `Backend.LoginRequest`, `Ai.StreamChunk`로 맥락 명확
5. **통신 계약 중심**: 실제 통신에 사용되는 타입만 포함
6. **내부 구현 분리**: 각 프로젝트 내부 타입은 해당 프로젝트에서 관리

## 설치 및 빌드

```bash
# 의존성 설치
npm install

# 타입 체크
npm run type-check

# 빌드
npm run build

# 개발 모드 (watch)
npm run dev
```

## 마이그레이션 가이드

기존 orkis-interface에서 새 구조로 마이그레이션할 때:

### Before (기존)
```typescript
import { LoginRequest } from "orkis-interface/domains/auth";
```

### After (새 구조)
```typescript
import { FrontendBackendCommunication } from "orkis-interface";

const request: FrontendBackendCommunication.LoginRequest = { ... };
```

## 에러 처리

표준화된 에러 코드와 구조를 제공합니다:

```typescript
import { ERROR_CODES, ApiError } from 'orkis-interface';

const error: ApiError = {
  code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
  message: '로그인 정보가 올바르지 않습니다.',
  level: 'error'
};
```

---

**ORKIS Team** | MIT License