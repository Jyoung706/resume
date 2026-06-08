# ORKIS Interface - Claude Instructions

## 프로젝트 개요

- **프로젝트명**: ORKIS Interface
- **목적**: 프로젝트 간 공유 인터페이스 및 타입 정의
- **기술 스택**: TypeScript
- **배포 방식**: Git Submodule

## 프로젝트 구조

### 폴더 구조

```
src/
├── ai/           # AI 서버 관련 인터페이스 (구 aiServer)
├── backend/      # 백엔드 API 인터페이스 (구 backendServer)
├── core/         # Core 프레임워크 인터페이스 (구 coreServer)
└── shared/       # 공통 사용 인터페이스
```

### 인터페이스 분류

#### AI 서버 인터페이스 (`src/ai/`)

Backend에서 RAG 서버 호출 시 사용하는 인터페이스

- **chat.ts**: 채팅 관련 AI 서버 API
- **query.ts**: 쿼리 처리 관련 API
- **embedding.ts**: 임베딩 처리 API

#### Backend 인터페이스 (`src/backend/`)

Frontend에서 Backend 호출 시 사용하는 인터페이스

- **auth.ts**: 인증/로그인 관련 API
- **chat.ts**: 채팅 기능 API
- **menu.ts**: 메뉴 관련 API
- **user.ts**: 사용자 관리 API

#### Core 인터페이스 (`src/core/`)

Backend에서 Core 프레임워크와 통신 시 사용하는 인터페이스

- **types.ts**: Core에서 제공하는 기본 타입
- **request.ts**: Request/Response 확장 타입
- **middleware.ts**: 미들웨어 관련 타입
- **utils.ts**: Core 유틸리티 인터페이스

#### 공유 인터페이스 (`src/shared/`)

모든 프로젝트에서 공통으로 사용하는 인터페이스

- **api.ts**: 공통 API 응답 형식
- **types.ts**: 기본 공통 타입
- **enums.ts**: 공통 열거형

## 사용법

### 타입 Import

```typescript
// Backend API 호출 (Frontend에서)
import { LoginRequest, LoginResponse } from 'orkis-interface/src/backend/auth';

// AI 서버 호출 (Backend에서)
import { ChatRequest, ChatResponse } from 'orkis-interface/src/ai/chat';

// Core 프레임워크 (Backend에서)
import { Request, Response } from 'orkis-interface/src/core/types';

// 공통 타입
import { ApiResponse, PaginationRequest } from 'orkis-interface/src/shared/api';
```

### Submodule로 사용

각 프로젝트에서 git submodule로 포함하여 사용:

```bash
# Submodule 추가
git submodule add https://github.com/your-org/orkis-interface.git

# Submodule 업데이트
git submodule update --remote orkis-interface

# 특정 커밋으로 고정
cd orkis-interface
git checkout <commit-hash>
cd ..
git add orkis-interface
git commit -m "Update orkis-interface to specific version"
```

## 개발 환경

### 빌드 및 검증

```bash
# 의존성 설치
yarn install

# 타입 체크
yarn typecheck

# 빌드 (TypeScript 컴파일)
yarn build

# 테스트
yarn test
```

### 패키지 설정

- **tsconfig.json**: TypeScript 컴파일 설정
- **package.json**: 패키지 메타데이터 및 스크립트
- **README.md**: 프로젝트 문서화

## 인터페이스 설계 원칙

### 1. 단일 책임 원칙

- 각 파일은 특정 도메인/기능의 인터페이스만 포함
- 관련성이 높은 인터페이스끼리 그룹화

### 2. 타입 안전성

- 모든 API 요청/응답에 명확한 타입 정의
- Optional 속성은 `?` 사용
- Union 타입으로 가능한 값 제한

### 3. 확장성

- 새로운 기능 추가 시 기존 인터페이스 변경 최소화
- Generic 타입 활용으로 재사용성 향상
- 상속을 통한 공통 속성 관리

### 4. 일관성

- 네이밍 컨벤션 통일 (PascalCase for interfaces, camelCase for properties)
- 공통 패턴 재사용 (ApiResponse, PaginationRequest 등)
- 에러 처리 방식 통일

## API 응답 표준 형식

### 성공 응답

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}
```

### 에러 응답

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
}
```

### 페이지네이션 응답

```typescript
interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## 주요 인터페이스

### 인증 관련 (`backend/auth.ts`)

```typescript
// 로그인 요청
interface LoginRequest {
  username: string;
  password?: string;
  loginType: 'password' | 'naver' | 'kakao' | 'google';
  code?: string; // OAuth 인증 코드
  state?: string; // OAuth 상태값
}

// 사용자 정보
interface UserInfo {
  ID: string;
  EMAIL?: string;
  NAME?: string;
  PHONE?: string;
  LOGIN_TYPE: string;
  AUTH_CODE?: string;
}
```

### 채팅 관련 (`backend/chat.ts`)

```typescript
// 채팅 세션
interface ChatSession {
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// 메시지
interface ChatMessage {
  messageId: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: Record<string, any>;
}
```

### AI 서버 관련 (`ai/chat.ts`)

```typescript
// AI 채팅 요청
interface AIChatRequest {
  message: string;
  sessionId?: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

// AI 채팅 응답
interface AIChatResponse {
  response: string;
  sessionId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

## 버전 관리

### Semantic Versioning

- **Major (X.0.0)**: Breaking changes (기존 API 호환성 깨짐)
- **Minor (0.X.0)**: 새로운 기능 추가 (하위 호환성 유지)
- **Patch (0.0.X)**: 버그 수정, 문서 업데이트

### 릴리즈 프로세스

1. **개발**: feature 브랜치에서 작업
2. **테스트**: 타입 체크 및 빌드 검증
3. **PR**: main 브랜치로 Pull Request
4. **태깅**: 릴리즈 시 git tag 생성
5. **배포**: 각 프로젝트에서 submodule 업데이트

## 마이그레이션 가이드

### 기존 프로젝트에서 orkis-interface 적용

1. **Submodule 추가**: `git submodule add <repo-url> orkis-interface`
2. **Import 경로 수정**: 기존 상대 경로를 orkis-interface 경로로 변경
3. **타입 호환성 확인**: 기존 타입과 새 인터페이스 호환성 검증
4. **점진적 마이그레이션**: 파일별로 순차적으로 마이그레이션

### Breaking Changes 처리

- **호환성 레이어**: 기존 타입과 새 타입 간 변환 레이어 제공
- **Deprecated 마킹**: 구버전 인터페이스에 @deprecated 주석 추가
- **마이그레이션 가이드**: 변경사항 및 마이그레이션 방법 문서화

## 개발 가이드라인

### 새로운 인터페이스 추가

1. **적절한 폴더 선택**: ai/backend/core/shared 중 해당 영역
2. **네이밍 컨벤션**: 명확하고 일관된 인터페이스명 사용
3. **문서화**: JSDoc 주석으로 인터페이스 목적 설명
4. **테스트**: 타입 체크 및 빌드 검증

### 기존 인터페이스 수정

1. **하위 호환성**: 기존 사용처에 영향 없는지 확인
2. **Optional vs Required**: 신중한 속성 추가
3. **버전업**: 변경 규모에 따른 적절한 버전 증가

## 최근 업데이트

- **폴더 구조 개선**: aiServer→ai, backendServer→backend, coreServer→core로 변경
- **서브모듈 동기화**: Frontend/Backend 모두 최신 버전 사용 (커밋: 039f1a3)
- **CLAUDE.md 추가**: 프로젝트 가이드 문서 생성
- **타입 안전성 강화**: 엄격한 인터페이스 정의 및 호환성 유지
- **빌드 안정화**: TypeScript 컴파일 및 배포 프로세스 개선

## 문서 작성 기준

- **새로운 설계/분석 문서**: 메인 프로젝트의 `doc/YYYY-MM-DD/` 폴더에 생성
- **인터페이스 전용 문서**: 이 프로젝트 내 유지 (README.md 등)
- **공통 문서**: 메인 프로젝트 루트 레벨에서 관리

## Interface 수정 시 필수 준수사항

### 하위 호환성 절대 보장 원칙

#### 기존 인터페이스 절대 변경 금지

```typescript
//  올바른 방법: 기존 인터페이스는 그대로 유지하고 새로운 인터페이스 추가
// 기존 인터페이스 (절대 변경하지 않음)
export interface LoginRequest {
  username: string; // 기존 필드 유지
  password?: string; // 기존 필드 유지
  loginType: 'password' | 'naver' | 'kakao' | 'google'; // 기존 타입 유지
  code?: string; // 기존 필드 유지
  state?: string; // 기존 필드 유지
}

// 새로운 인터페이스 추가 (기존에 영향 없음)
export interface LoginRequestV2 extends LoginRequest {
  deviceInfo?: DeviceInfo; // 새로운 필드
  rememberMe?: boolean; // 새로운 필드
  mfaToken?: string; // 새로운 필드
}

// Union Type으로 점진적 확장
export type AnyLoginRequest = LoginRequest | LoginRequestV2;

// ❌ 잘못된 방법: 기존 인터페이스 변경
// export interface LoginRequest {
//   email: string;           // ❌ username → email 이름 변경 금지
//   password: string;        // ❌ Optional에서 Required로 변경 금지
//   type: LoginType;         // ❌ loginType → type 이름 변경 금지
// }
```

#### 프로퍼티 추가 시 반드시 Optional

```typescript
//  새로운 필드는 반드시 Optional로 추가
export interface ChatMessage {
  messageId: string; // 기존 필드 유지
  sessionId: string; // 기존 필드 유지
  content: string; // 기존 필드 유지
  role: 'user' | 'assistant'; // 기존 타입 유지
  timestamp: string; // 기존 필드 유지
  metadata?: Record<string, any>; // 기존 Optional 필드 유지

  // 새로운 필드들 (모두 Optional)
  attachments?: FileAttachment[]; // 새로운 Optional 필드
  replyTo?: string; // 새로운 Optional 필드
  reactions?: MessageReaction[]; // 새로운 Optional 필드
}

// ❌ 새로운 Required 필드 추가 금지
// export interface ChatMessage {
//   // ... 기존 필드들
//   version: string;         // ❌ 새로운 Required 필드 금지
// }
```

### Union Type 확장 시 기존 타입 보존

#### 열거형 타입 확장

```typescript
//  기존 Union Type에 새로운 값 추가 (하위 호환)
export type LoginType = 'password' | 'naver' | 'kakao' | 'google' | 'github' | 'microsoft';
//                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 기존 타입 유지
//                                                                   ^^^^^^^^^^^^^^^^^^^ 새로운 타입 추가

//  별도 타입으로 확장
export type ExtendedLoginType = LoginType | 'apple' | 'twitter';

// ❌ 기존 타입 제거 또는 이름 변경 금지
// export type LoginType = 'email' | 'oauth';  // ❌ 기존 타입 제거 금지
```

### API 응답 형식 호환성 보장

#### ApiResponse 인터페이스 확장

```typescript
//  기존 ApiResponse 구조는 절대 변경하지 않음
export interface ApiResponse<T> {
  success: boolean; // 기존 필드 유지
  data: T; // 기존 필드 유지
  timestamp: string; // 기존 필드 유지
  requestId?: string; // 기존 Optional 필드 유지
}

//  새로운 응답 형식은 기존 형식을 확장
export interface EnhancedApiResponse<T> extends ApiResponse<T> {
  version?: string; // 새로운 Optional 필드
  metadata?: ResponseMetadata; // 새로운 Optional 필드
}

// ❌ 기존 필드 이름 변경 또는 타입 변경 금지
// export interface ApiResponse<T> {
//   isSuccess: boolean;   // ❌ success → isSuccess 변경 금지
//   result: T;           // ❌ data → result 변경 금지
//   time: number;        // ❌ timestamp 타입 변경 금지
// }
```

### 폴더 구조 변경 시 호환성 유지

#### Import 경로 호환성 보장

```typescript
//  기존 import 경로는 반드시 지원
// 기존 경로 (절대 제거하지 않음)
export * from './backend/auth';
export * from './ai/chat';
export * from './shared/api';

// 새로운 경로 추가 (기존 경로와 병행)
export * from './v2/backend/auth';
export * from './v2/ai/chat';

//  호환성 re-export 제공
// legacy.ts 파일로 기존 경로 지원
export { LoginRequest, LoginResponse } from './v2/backend/auth';
export { ChatRequest, ChatResponse } from './v2/ai/chat';
```

### 제네릭 타입 확장 시 하위 호환성

#### 제네릭 파라미터 추가 시 기본값 제공

```typescript
//  기존 제네릭 사용법은 그대로 유지되도록 기본값 제공
// 기존 인터페이스
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// 새로운 제네릭 파라미터 추가 시 기본값 제공
export interface EnhancedPaginatedResponse<T, M = any> extends PaginatedResponse<T> {
  metadata?: M;
}

// 기존 사용법이 여전히 작동함
// const response: PaginatedResponse<ChatMessage> = ...;  // 여전히 유효
// const enhanced: EnhancedPaginatedResponse<ChatMessage> = ...; // 새로운 사용법
```

### 네임스페이스 및 모듈 구조 보존

#### 기존 export 구조 절대 변경 금지

```typescript
//  package.json exports 기존 구조 유지
{
  "exports": {
    // 기존 export 경로 유지 (절대 제거하지 않음)
    "./src/backend/auth": "./dist/backend/auth.js",
    "./src/ai/chat": "./dist/ai/chat.js",
    "./src/shared/api": "./dist/shared/api.js",

    // 새로운 export 경로 추가
    "./v2/backend/auth": "./dist/v2/backend/auth.js",
    "./types": "./dist/types/index.d.ts"
  }
}

//  index.ts에서 기존 export 유지
// 기존 export (절대 제거하지 않음)
export * from './backend/auth';
export * from './ai/chat';
export * from './shared/api';

// 새로운 export 추가
export * as V2 from './v2';
export * from './enhanced';
```

### 타입 안전성 보장하며 확장

#### 타입 가드 및 유틸리티 타입 활용

```typescript
//  기존 타입과 새로운 타입을 안전하게 구분
export function isLoginRequestV2(req: AnyLoginRequest): req is LoginRequestV2 {
  return 'deviceInfo' in req || 'rememberMe' in req || 'mfaToken' in req;
}

//  조건부 타입으로 하위 호환성 보장
export type ResponseFor<T> = T extends 'v1'
  ? ApiResponse<any>
  : T extends 'v2'
    ? EnhancedApiResponse<any>
    : ApiResponse<any>; // 기본값은 v1 형식

//  유틸리티 타입으로 마이그레이션 지원
export type MigrateToV2<T> = T extends LoginRequest ? LoginRequestV2 : T;
```

### 문서화 및 Deprecation 관리

#### Deprecated 타입 표시 및 마이그레이션 가이드

```typescript
/**
 * @deprecated Use LoginRequestV2 instead. This interface will be removed in v3.0.0
 * @see LoginRequestV2 for the new interface
 */
export interface OldLoginRequest {
  user: string;
  pass: string;
}

/**
 * Enhanced login request interface with additional security features
 * @since v2.1.0
 */
export interface LoginRequestV2 extends LoginRequest {
  /** Device information for security tracking */
  deviceInfo?: DeviceInfo;
  /** Remember login session */
  rememberMe?: boolean;
  /** Multi-factor authentication token */
  mfaToken?: string;
}
```

### 버전 관리 엄격 준수

#### Semantic Versioning 엄격 적용

```json
// package.json 버전 관리
{
  "version": "2.3.1"
  // MAJOR: 기존 API 호환성 깨지는 변경 (절대적으로 피해야 함)
  // MINOR: 새로운 인터페이스/필드 추가 (하위 호환)
  // PATCH: 문서 업데이트, 타입 오류 수정 (하위 호환)
}
```

#### Breaking Changes 절대 금지 원칙

- **Field 제거**: 절대 금지
- **Field 이름 변경**: 절대 금지
- **Required로 변경**: 절대 금지
- **타입 제거**: 절대 금지
- **Import 경로 변경**: 절대 금지

### 테스트 및 검증

#### 하위 호환성 회귀 테스트 필수

```typescript
// 기존 인터페이스 사용법이 여전히 작동하는지 테스트
describe('Interface Backward Compatibility Tests', () => {
  test('기존 LoginRequest 인터페이스 여전히 유효', () => {
    const loginReq: LoginRequest = {
      username: 'test',
      password: 'test123',
      loginType: 'password',
    };

    // 기존 사용법이 여전히 타입 오류 없이 작동해야 함
    expect(typeof loginReq.username).toBe('string');
  });

  test('기존 import 경로 여전히 작동', async () => {
    // 기존 import가 여전히 작동하는지 확인
    const { LoginRequest } = await import('orkis-interface/src/backend/auth');
    expect(LoginRequest).toBeDefined();
  });
});
```

### Submodule 업데이트 시 주의사항

#### 점진적 Submodule 업데이트

```bash
#  안전한 submodule 업데이트 절차
# 1. 로컬에서 먼저 테스트
cd orkis-interface
git fetch origin
git checkout v2.3.1  # 검증된 버전으로

# 2. 기존 기능 회귀 테스트 실행
cd ../orkis-backend
npm test

# 3. Frontend 호환성 테스트
cd ../orkis-front
npm test

# 4. 모든 테스트 통과 후 커밋
cd ..
git add orkis-interface
git commit -m "Update orkis-interface to v2.3.1 (tested)"
```

### 배포 체크리스트

#### Interface 배포 전 필수 확인사항

- [ ] 기존 모든 인터페이스 그대로 유지됨
- [ ] 새로운 필드는 모두 Optional로 추가됨
- [ ] 기존 import 경로 모두 정상 작동
- [ ] TypeScript 컴파일 오류 없음
- [ ] 기존 Union Type 값 모두 유지됨
- [ ] ApiResponse 구조 변경 없음
- [ ] Backend/Frontend 프로젝트 호환성 테스트 통과
- [ ] 문서 업데이트 완료

## 주의사항

- **STRICTLY NO EMOJIS**: Absolutely do not use emojis, emoticons, or any decorative symbols in any file creation, source code modification, comments, documentation, or any other content. This applies to all files including but not limited to .ts, .js, .md, .json, and any other file types.
- **Breaking Changes 절대 금지**: 기존 코드 호환성 100% 보장
- **타입 엄격성**: any 타입 사용 지양
- **문서화 필수**: 모든 public 인터페이스 문서화
- **Submodule 동기화**: 각 프로젝트에서 적절한 버전 사용
- **스타일 일관성**: 전문적인 코드 스타일 유지
- **하위 호환성**: 신규 필드는 반드시 Optional, 기존 필드는 절대 변경 금지
- **점진적 확장**: 새로운 기능은 기존 인터페이스를 확장하는 방식으로만 추가

이러한 원칙을 준수하여 **Interface의 절대적 하위 호환성을 보장**하면서 새로운 기능을 안전하게 추가할 수 있습니다.
