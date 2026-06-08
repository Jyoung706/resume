# ORKIS Frontend - Claude Instructions

## 프로젝트 개요
- **프로젝트명**: ORKIS Frontend
- **기술 스택**: React, TypeScript, Vite
- **UI 프레임워크**: Material-UI, Styled Components
- **상태 관리**: React Context, Local State

## 프로젝트 구조

### 주요 디렉토리
```
src/
├── components/     # 재사용 가능한 컴포넌트
├── pages/         # 페이지 컴포넌트
├── hooks/         # 커스텀 훅
├── utils/         # 유틸리티 함수
├── services/      # API 호출 로직
├── types/         # TypeScript 타입 정의 (내부용)
└── styles/        # 스타일 관련 파일
```

### 인터페이스 구조
- **공유 인터페이스**: `orkis-interface` 서브모듈 사용
  - Backend API 호출: `orkis-interface/src/backend/`
  - 공통 타입: `orkis-interface/src/shared/`
- **내부 타입**: `src/types/`에서 프론트엔드 전용 타입 관리

## 주요 기능

### 인증 시스템
- **로그인 방식**:
  - ID/Password 로그인
  - OAuth (Naver, Kakao, Google)
- **인증 상태 관리**: React Context 기반
- **토큰 관리**: LocalStorage + 자동 갱신

### 채팅 시스템
- **실시간 채팅**: Fetch Streaming (SSE) 기반
  - `messageStreamStore.ts`: fetch + ReadableStream으로 SSE 처리
  - `POST /api/sse/chat/stream`: 메시지 전송 + 스트리밍 통합
  - AbortController로 취소 관리
- **세션 관리**: 채팅 세션 생성/조회/삭제
- **메시지 기록**: 대화 내역 저장 및 불러오기 (IndexedDB 캐시)

### SSE 이벤트 타입
- `message_id`: tempId -> 실제 messageId 매핑
- `chat_type`: sql / general 결정
- `step`, `steps`: SQL 프로세스 진행 상태
- `content`: 스트리밍 콘텐츠 청크
- `result`: 최종 결과 (SQL/General)
- `complete`: 스트리밍 완료
- `error`: 에러 발생

### UI/UX
- **반응형 디자인**: 모바일/데스크톱 대응
- **다크 모드**: 사용자 선택 가능
- **Loading/Error 상태**: 적절한 피드백 제공

## 개발 환경 설정

### 로컬 개발
```bash
# 의존성 설치
yarn install

# 개발 서버 시작
yarn dev

# 빌드
yarn build

# 미리보기
yarn preview
```

### 환경 변수
- **개발**: `.env.development`
- **프로덕션**: `.env.production`
- **주요 변수**:
  - `VITE_API_BASE_URL`: Backend API URL
  - `VITE_OAUTH_REDIRECT_URI`: OAuth 콜백 URL

## API 통신

### API 클라이언트
- **Base URL**: 환경변수에서 설정
- **인터셉터**: 요청/응답 전처리
- **에러 처리**: 공통 에러 처리 로직

### Backend API 호출
```typescript
// orkis-interface의 타입 사용 예시
import { LoginRequest, LoginResponse } from 'orkis-interface/src/backend/auth';
import { ApiResponse } from 'orkis-interface/src/shared/api';

const loginAPI = async (request: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
  // API 호출 로직
};
```

## 컴포넌트 구조

### 페이지 컴포넌트
- **LoginPage**: 로그인 화면
- **ChatPage**: 채팅 메인 화면
- **SettingsPage**: 사용자 설정

### 공통 컴포넌트
- **Header/Footer**: 레이아웃 컴포넌트
- **LoadingSpinner**: 로딩 표시
- **ErrorBoundary**: 에러 경계 처리
- **Modal/Dialog**: 팝업 컴포넌트

### 폼 컴포넌트
- **LoginForm**: 로그인 폼
- **ChatInput**: 채팅 입력
- **SearchForm**: 검색 폼

## 상태 관리

### Context API
```typescript
// AuthContext: 인증 상태
interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

// ChatContext: 채팅 상태
interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
}
```

## 라우팅

### React Router
- **Public Routes**: 로그인 불필요 (/, /login, /auth/callback)
- **Protected Routes**: 로그인 필요 (/chat, /settings)
- **OAuth Callback**: `/auth/callback` - OAuth 인증 완료 처리

## 스타일링

### CSS-in-JS
- **Styled Components**: 컴포넌트별 스타일
- **Theme**: 일관된 디자인 시스템
- **Media Queries**: 반응형 디자인

### Material-UI
- **컴포넌트**: Button, TextField, Dialog 등
- **커스터마이징**: 테마 오버라이드
- **아이콘**: Material Icons 사용

## 빌드 및 배포

### Vite 빌드
- **개발**: HMR(Hot Module Replacement) 지원
- **프로덕션**: 번들 최적화, 코드 분할
- **정적 자산**: public/ 폴더 자동 복사

### 배포 준비
- **환경별 설정**: 환경변수로 API URL 등 관리
- **빌드 최적화**: Tree shaking, 압축
- **브라우저 호환성**: Babel 트랜스파일링

## 개발 가이드라인

### 코딩 컨벤션
- **TypeScript**: 엄격한 타입 체크
- **ESLint**: 코드 품질 검사
- **Prettier**: 코드 포매팅
- **Naming**: camelCase, PascalCase 일관성 유지

### 컴포넌트 작성
- **함수형 컴포넌트**: React Hooks 사용
- **Props 인터페이스**: 명확한 타입 정의
- **재사용성**: 공통 컴포넌트 추출
- **성능**: React.memo, useCallback 적절히 활용

### 에러 처리
- **ErrorBoundary**: 컴포넌트 에러 처리
- **try-catch**: 비동기 함수 에러 처리
- **사용자 피드백**: Toast, Alert 메시지

## 최근 변경사항
- **Fetch Streaming (SSE) 마이그레이션 완료**
  - WebSocket/EventSource -> Fetch Streaming 전환
  - 레거시 파일 제거: `useChatMessage.ts`, `sseSessionStore.ts`, `SSEConnectionManager.ts`
  - `messageStreamStore.ts`가 모든 스트리밍 처리 담당
- orkis-interface 서브모듈로 타입 통합 완료
- 인증 시스템 Handler Pattern 대응 완료
- API 인터페이스 구조 개선 (ai/backend/core/shared)
- 서브모듈 동기화 완료 - 최신 인터페이스 버전 사용
- 개발 환경 안정화

## Frontend 코드 수정 시 필수 준수사항

### 컴포넌트 수정 시 안정성 보장

#### 기존 Props 인터페이스 보존
```typescript
//  올바른 방법: 기존 props는 유지하고 새로운 props 추가
interface MessageBoxProps {
  message: Message;           // 기존 필드 유지
  showStepper?: boolean;      // 기존 필드 유지
  onStepClick?: (stepId: string, stepIndex: number) => void;  // 기존 필드 유지
  // 새로운 props 추가
  processes?: ProcessStep[];  // Optional로 추가
  isProcessActive?: boolean;  // Optional로 추가
  theme?: 'light' | 'dark';   // Optional로 추가
}

// ❌ 잘못된 방법: 기존 props 이름 변경 또는 타입 변경
interface BadMessageBoxProps {
  msg: Message;              // ❌ message → msg 이름 변경 금지
  showProgress: boolean;     // ❌ showStepper → showProgress 이름 변경 금지
  onClick: Function;         // ❌ onStepClick 타입 변경 금지
}
```

#### 컴포넌트 렌더링 호환성 유지
```typescript
//  기존 렌더링 로직은 유지하고 새로운 기능 추가
const MessageBox: React.FC<MessageBoxProps> = ({
  message,
  showStepper = true,        // 기존 기본값 유지
  onStepClick,               // 기존 콜백 유지
  processes,                 // 새로운 prop
  isProcessActive = false    // 새로운 prop with 기본값
}) => {
  // 기존 렌더링 로직 유지
  if (!message) return null;

  // 기존 SQL 프로세스 렌더링 로직 유지
  if (showStepper && message.metadata?.processes) {
    return <SqlProcessStepper processes={message.metadata.processes} />;
  }

  // 새로운 기능 추가 (기존 로직에 영향 없음)
  if (processes && processes.length > 0) {
    return <NewProcessStepper processes={processes} active={isProcessActive} />;
  }

  // 기존 기본 렌더링 로직 유지
  return <div>{message.content}</div>;
};
```

### Context API 및 상태 관리 호환성

#### 기존 Context 구조 보존
```typescript
//  기존 Context interface는 절대 변경하지 않음
interface AuthContextType {
  user: UserInfo | null;           // 기존 필드 유지
  isAuthenticated: boolean;        // 기존 필드 유지
  login: (credentials: LoginRequest) => Promise<void>;    // 기존 메서드 유지
  logout: () => void;              // 기존 메서드 유지
  // 새로운 필드는 Optional로 추가
  permissions?: string[];          // 새로운 필드
  refreshToken?: () => Promise<void>;  // 새로운 메서드
}

// ❌ 기존 필드/메서드 변경 금지
interface BadAuthContextType {
  currentUser: UserInfo | null;    // ❌ user → currentUser 변경 금지
  signIn: (creds: any) => void;    // ❌ login → signIn 변경 금지
}
```

#### 훅(Hook) 호환성 유지
```typescript
//  기존 훅의 반환 형식 유지
export const useAuthStore = () => {
  const context = useContext(AuthContext);

  // 기존 반환 형식 그대로 유지
  return {
    user: context.user,
    isAuthenticated: context.isAuthenticated,
    login: context.login,
    logout: context.logout,
    // 새로운 기능은 별도로 추가
    ...context.permissions && { permissions: context.permissions },
    ...context.refreshToken && { refreshToken: context.refreshToken }
  };
};
```

### API 통신 호환성 보장

#### Service 함수 시그니처 유지
```typescript
//  기존 API 호출 함수는 그대로 유지
export const chatService = {
  // 기존 함수 (절대 변경하지 않음)
  sendMessageStream: (
    data: { sessionId: string; message: string },
    onMessage: (content: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    signal?: AbortSignal,
    onProcessUpdate?: (processes: ProcessStep[], sqlQuery?: string) => void,
    onTitleUpdate?: (sessionId: string, title: string) => void
  ): Promise<void> => {
    // 기존 로직 유지
  },

  // 새로운 함수 추가 (기존에 영향 없음)
  sendMessageStreamV2: (
    data: SendMessageRequestV2,
    callbacks: StreamCallbacks
  ): Promise<void> => {
    // 새로운 로직
  }
};
```

#### HTTP 클라이언트 요청 형식 보존
```typescript
//  기존 API 엔드포인트 요청 형식 유지
const sendMessage = async (sessionId: string, message: string) => {
  // 기존 요청 형식 절대 변경하지 않음
  return await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'      // 기존 헤더 유지
    },
    body: JSON.stringify({
      sessionId,                         // 기존 필드명 유지
      message                            // 기존 필드명 유지
    })
  });
};

// 새로운 API는 별도 함수로 분리
const sendMessageV2 = async (request: NewMessageRequest) => {
  return await fetch('/api/v2/chat/stream', { /* 새로운 형식 */ });
};
```

### 라우팅 및 네비게이션 보존

#### 기존 라우트 경로 유지
```typescript
//  기존 라우트는 절대 변경하지 않음
const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* 기존 라우트 유지 */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

      {/* 새로운 라우트 추가 */}
      <Route path="/chat/v2" element={<NewChatPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  </BrowserRouter>
);

// ❌ 기존 라우트 경로 변경 금지
// <Route path="/login" element={<LoginPage />} />  // ❌ "/" → "/login" 변경 금지
```

### 스타일링 및 테마 호환성

#### Material-UI 테마 확장 시
```typescript
//  기존 테마 설정은 유지하고 새로운 속성 추가
const theme = createTheme({
  // 기존 팔레트 유지
  palette: {
    primary: {
      main: '#1976d2',      // 기존 컬러 유지
    },
    secondary: {
      main: '#dc004e',      // 기존 컬러 유지
    },
    // 새로운 컬러 추가
    tertiary: {
      main: '#9c27b0',      // 새로운 컬러
    }
  },
  // 기존 타이포그래피 유지
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',  // 기존 폰트 유지
    // 새로운 variant 추가
    chatMessage: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    }
  }
});
```

### 이벤트 핸들링 호환성

#### 기존 이벤트 핸들러 시그니처 유지
```typescript
//  기존 이벤트 핸들러 형식 유지
interface ChatPageProps {
  onSendMessage?: (content: string) => void;           // 기존 시그니처 유지
  onStepClick?: (stepId: string, stepIndex: number) => void;  // 기존 시그니처 유지
  // 새로운 핸들러 추가
  onProcessUpdate?: (processes: ProcessStep[]) => void;     // 새로운 핸들러
  onMessageDelete?: (messageId: string) => Promise<void>;   // 새로운 핸들러
}

const ChatPage: React.FC<ChatPageProps> = ({
  onSendMessage,           // 기존 핸들러 사용
  onStepClick,            // 기존 핸들러 사용
  onProcessUpdate,        // 새로운 핸들러 사용
  onMessageDelete         // 새로운 핸들러 사용
}) => {
  // 기존 핸들링 로직 유지
  const handleSendMessage = (content: string) => {
    onSendMessage?.(content);  // 기존 방식 그대로 호출
  };
};
```

### 데이터 형식 및 타입 호환성

#### Interface 확장 시 하위 호환성 유지
```typescript
//  기존 Message 인터페이스 확장
interface Message {
  id: string;              // 기존 필드 유지
  sessionId: string;       // 기존 필드 유지
  content: string;         // 기존 필드 유지
  role: 'user' | 'assistant';  // 기존 타입 유지
  timestamp: string;       // 기존 필드 유지
  status?: MessageStatus;  // 기존 필드 유지
  // 새로운 필드 추가 (Optional)
  metadata?: MessageMetadata;    // 새로운 필드
  attachments?: FileAttachment[]; // 새로운 필드
}

// Union Type으로 타입 확장 (기존 타입 포함)
type MessageStatus = 'sending' | 'sent' | 'error' | 'stopped' | 'delivered' | 'read';
//                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 기존 타입 유지
//                                                            ^^^^^^^^^^^^^^^^^^^ 새로운 타입 추가
```

### 성능 최적화 시 기존 기능 보존

#### 메모이제이션 적용 시
```typescript
//  기존 컴포넌트 동작은 유지하면서 성능 최적화
const MessageBox = React.memo<MessageBoxProps>(({ message, showStepper, onStepClick }) => {
  // 기존 렌더링 로직 그대로 유지
  const isUser = message.role === "user";

  // 기존 조건부 렌더링 유지
  if (!message.content && message.status !== 'sending') {
    return null;
  }

  // 기존 JSX 구조 유지
  return (
    <Box className={isUser ? 'user-message' : 'assistant-message'}>
      {/* 기존 컴포넌트 구조 그대로 유지 */}
    </Box>
  );
}, (prevProps, nextProps) => {
  // 메모이제이션 조건 (기존 props 기준)
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content &&
         prevProps.showStepper === nextProps.showStepper;
});
```

### 에러 경계 및 예외 처리

#### 안전한 에러 처리
```typescript
//  기존 기능 실패 시 graceful degradation
const ChatPage: React.FC = () => {
  const [fallbackMode, setFallbackMode] = useState(false);

  const handleSendMessage = async (content: string) => {
    try {
      // 새로운 기능 시도
      if (!fallbackMode && isNewFeatureEnabled) {
        await chatService.sendMessageStreamV2(content);
        return;
      }
    } catch (error) {
      console.warn('New feature failed, falling back to legacy:', error);
      setFallbackMode(true);
    }

    // 실패 시 기존 방식으로 fallback
    try {
      await chatService.sendMessageStream(content);
    } catch (legacyError) {
      // 기존 방식마저 실패하면 사용자에게 알림
      alert('메시지 전송에 실패했습니다. 새로고침 후 다시 시도해주세요.');
    }
  };
};
```

### 환경변수 및 빌드 설정 호환성

#### Vite 설정 업데이트 시
```typescript
//  기존 환경변수는 유지하고 새로운 변수 추가
// vite.config.ts
export default defineConfig({
  // 기존 설정 유지
  base: '/',
  server: {
    port: 3000,
  },
  // 새로운 설정 추가
  define: {
    // 기존 환경변수 유지
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL),
    __OAUTH_REDIRECT_URI__: JSON.stringify(process.env.VITE_OAUTH_REDIRECT_URI),
    // 새로운 환경변수 추가
    __ENABLE_NEW_CHAT__: JSON.stringify(process.env.VITE_ENABLE_NEW_CHAT === 'true'),
  }
});
```

### 테스트 및 검증

#### 기존 기능 회귀 테스트
```typescript
// 기존 기능이 정상 동작하는지 반드시 테스트
describe('Frontend Legacy Compatibility Tests', () => {
  test('기존 로그인 플로우 정상 동작', async () => {
    render(<LoginPage />);
    // 기존 로그인 동작 테스트
  });

  test('기존 채팅 메시지 전송 정상 동작', async () => {
    render(<ChatPage />);
    // 기존 메시지 전송 동작 테스트
  });

  test('기존 SQL 프로세스 스테퍼 정상 표시', async () => {
    const message = { metadata: { processes: mockProcesses } };
    render(<MessageBox message={message} />);
    // 기존 프로세스 스테퍼 렌더링 테스트
  });
});
```

### 배포 및 빌드 체크리스트

#### 배포 전 필수 확인사항
- [ ] 기존 로그인/로그아웃 기능 정상 동작 확인
- [ ] 기존 채팅 전송/수신 기능 정상 동작 확인
- [ ] 기존 라우트 네비게이션 정상 동작 확인
- [ ] 기존 UI 컴포넌트 렌더링 정상 확인
- [ ] 모바일 반응형 기존 레이아웃 정상 확인
- [ ] 브라우저 호환성 (기존 지원 브라우저) 확인
- [ ] 번들 사이즈 기존 대비 50% 이상 증가 없음 확인
- [ ] 초기 로딩 속도 기존 대비 저하 없음 확인

## 주의사항
- **STRICTLY NO EMOJIS**: Absolutely do not use emojis, emoticons, or any decorative symbols in any file creation, source code modification, comments, documentation, or any other content. This applies to all files including but not limited to .ts, .js, .md, .json, and any other file types.
- **서브모듈**: orkis-interface 업데이트 시 동기화 필요
- **타입 안전성**: any 타입 사용 지양
- **성능**: 불필요한 리렌더링 방지
- **보안**: 민감한 정보 클라이언트 저장 금지
- **스타일 일관성**: 전문적인 코드 스타일 유지
- **하위 호환성**: 기존 컴포넌트 Props/State 구조 절대 변경 금지
- **점진적 개선**: 새로운 기능은 기존 기능과 병행 운영 후 단계적 적용

이러한 원칙을 준수하여 **기존 Frontend 기능의 안정성을 보장**하면서 새로운 기능을 안전하게 추가할 수 있습니다.

## 문서 작성 기준

### 기술 문서 위치 가이드라인
1. **Frontend 관련 기술 문서** → `doc/YYYY-MM-DD/orkis-front/filename.md`
   - 예: UI/UX 설계, 컴포넌트 아키텍처, 성능 최적화 방안
   - 날짜 형식: `YYYY-MM-DD` (예: 2025-08-14)
   
2. **공통/프로젝트 전체 문서** → `doc/YYYY-MM-DD/filename.md`
   - 예: 전체 시스템 아키텍처, 마이그레이션 계획
   
3. **프론트엔드 전용 문서** → 프로젝트 내 유지
   - README.md, 컴포넌트 가이드, 스타일 가이드

### 파일명 규칙
- kebab-case 사용 (예: `chat-ui-component-refactor.md`)
- 한글 파일명 허용 (예: `채팅-인터페이스-개선.md`)
- Frontend 관련임을 명시 시 접두사 사용 (예: `frontend-state-management.md`)
