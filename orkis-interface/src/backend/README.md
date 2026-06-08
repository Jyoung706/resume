# Backend Server 인터페이스

이 디렉토리는 Frontend와 Backend Server 간의 통신을 위한 인터페이스를 정의합니다.

## 파일 구조

- `auth.ts`: 인증 관련 API 인터페이스 (로그인, 로그아웃, OAuth 등)
- `chat.ts`: 채팅 관련 API 인터페이스 (세션, 메시지, 스트리밍 등)
- `menu.ts`: 메뉴 관련 API 인터페이스 (사용자 메뉴, 전체 메뉴 등)

## 도메인별 인터페이스

### 1. Auth 도메인 (`auth.ts`)

```typescript
// 로그인 API
POST /auth/login
interface PasswordLoginRequest {
  username: string;
  password: string;
}

// OAuth 시작
POST /auth/oauthToken
interface OAuthStartRequest {
  type: 'naver' | 'kakao' | 'google';
}

// OAuth 콜백
POST /auth/loginCheck
interface OAuthCallbackRequest {
  code: string;
  state: string;
}

// 토큰 갱신
POST /auth/refresh
interface RefreshTokenRequest {
  token: string;
}
```

### 2. Chat 도메인 (`chat.ts`)

```typescript
// 세션 생성
POST /chat/sessions
interface CreateSessionRequest {
  title?: string;
}

// 메시지 전송
POST /chat/messages
interface SendMessageRequest {
  sessionId: string;
  message: string;
  title?: string;
}

// 스트림 시작
POST /chat/stream
interface StreamMessageRequest {
  sessionId: string;
  message: string;
  title?: string;
}

// 세션 목록 조회
POST /chat/sessions/list
interface GetSessionsRequest {
  page?: number;
  limit?: number;
}
```

### 3. Menu 도메인 (`menu.ts`)

```typescript
// 사용자 메뉴 조회
GET /menu/user-menus
POST /menu/user-menus

// 전체 메뉴 조회
POST /menu/all
```

## Frontend에서 사용하기

### 타입 안정성이 보장된 API 호출

```typescript
import {
  PasswordLoginRequest,
  LoginSuccessResponse,
  SendMessageRequest,
  CreateSessionRequest,
  UserMenusResponse
} from 'orkis-interface_new';

// 로그인 API
const loginData: PasswordLoginRequest = {
  username: 'user@example.com',
  password: 'password123'
};

const response = await apiPost<LoginSuccessResponse>('/auth/login', loginData);

// 메시지 전송 API
const messageData: SendMessageRequest = {
  sessionId: 'session-123',
  message: '안녕하세요'
};

const messageResponse = await apiPost<SendMessageResponse>('/chat/messages', messageData);
```

### API Response 타입 활용

```typescript
import { 
  PasswordLoginApiResponse,
  SendMessageApiResponse,
  UserMenusApiResponse 
} from 'orkis-interface_new';

// 표준화된 API 응답 처리
const handleLogin = async (loginData: PasswordLoginRequest) => {
  try {
    const response: PasswordLoginApiResponse = await apiPost('/auth/login', loginData);
    if (response.success) {
      const { token, loginInfo } = response.data;
      // 로그인 성공 처리
    }
  } catch (error) {
    // 에러 처리
  }
};
```

## 마이그레이션 가이드

기존 Frontend 코드를 이 인터페이스로 마이그레이션하려면:

1. **타입 Import 추가**:
   ```typescript
   import { PasswordLoginRequest, LoginSuccessResponse } from 'orkis-interface_new';
   ```

2. **API 호출에 타입 적용**:
   ```typescript
   // 기존
   const response = await apiPost('/auth/login', { username, password });
   
   // 변경 후
   const loginData: PasswordLoginRequest = { username, password };
   const response = await apiPost<LoginSuccessResponse>('/auth/login', loginData);
   ```

3. **응답 데이터 타입 안정성 확보**:
   ```typescript
   // 변경 후
   if (response.data.token) {
     localStorage.setItem('token', response.data.token);
   }
   ```

## 장점

1. **타입 안정성**: 컴파일 타임에 API 인터페이스 오류 검출
2. **자동완성**: IDE에서 API 요청/응답 필드 자동완성 지원
3. **문서화**: 인터페이스 자체가 API 문서 역할
4. **리팩토링 안전성**: API 변경 시 관련 코드 자동 추적
5. **일관성**: Frontend와 Backend 간 데이터 형식 일관성 보장