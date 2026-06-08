# Core Server 인터페이스

이 디렉토리는 Backend에서 Core 프레임워크와 통신할 때 사용하는 인터페이스를 정의합니다.

## 파일 구조

- `decorators.ts`: Core 데코레이터 인터페이스 (@Controller, @Service, @RequestMapping 등)
- `request.ts`: Core Request/Response 확장 타입
- `di.ts`: Core DI 컨테이너 관련 인터페이스
- `types.ts`: Core 프레임워크 기본 타입들
- `middleware.ts`: Core 미들웨어 인터페이스
- `utils.ts`: Core 유틸리티 인터페이스

## 주요 인터페이스

### 1. 데코레이터 (`decorators.ts`)

```typescript
// 컨트롤러 정의
interface ControllerOptions {
  path?: string;
  middleware?: any[];
}

// 서비스 정의
interface ServiceOptions {
  name?: string;
  scope?: 'singleton' | 'request' | 'transient';
}

// 요청 매핑
interface RequestMappingOptions {
  route: string;
  requestType: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  filteredType?: string;
}
```

### 2. 타입 시스템 (`types.ts`)

```typescript
// 확장된 Express Request
interface Request extends ExpressRequest {
  session?: {
    login_info?: {
      ID: string;
      EMAIL?: string;
      NAME?: string;
      AUTH_CODE?: string;
    };
  };
  files?: any[];
  customData?: Record<string, any>;
}

// 필터 타입
enum FILTER_TYPES {
  NONE = 'NONE',
  CHECK_SESSION = 'CHECK_SESSION',
  CHECK_AUTH = 'CHECK_AUTH',
  CORS = 'CORS'
}

// 요청 타입
enum REQUEST_TYPE {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}
```

### 3. 미들웨어 (`middleware.ts`)

```typescript
// Express 인터셉터
interface ExpressInterceptor {
  name: string;
  order?: number;
  before?(req: Request, res: Response, next: any): void | Promise<void>;
  after?(req: Request, res: Response, result: any, next: any): void | Promise<void>;
  error?(error: any, req: Request, res: Response, next: any): void | Promise<void>;
}

// Express 미들웨어
interface ExpressMiddleware {
  name: string;
  order?: number;
  handler(req: Request, res: Response, next: any): void | Promise<void>;
}
```

### 4. 유틸리티 (`utils.ts`)

```typescript
// 상태 관리
interface StateManager {
  saveState(state: string, provider: string, ttl?: number): Promise<void>;
  checkState(state: string): Promise<boolean>;
  getStateInfo(state: string): Promise<any>;
  removeState(state: string): Promise<void>;
}

// 토큰 관리
interface TokenManager {
  saveToken(token: string, userInfo: any, ttl?: number): Promise<void>;
  getTokenInfo(token: string): Promise<any>;
  removeToken(token: string): Promise<void>;
  loginHandler(userInfo: any): Promise<string>;
}
```

## Backend에서 사용하기

### 컨트롤러 정의

```typescript
import {
  Controller,
  RequestMapping,
  RequestBody,
  SessionParam,
  REQUEST_TYPE,
  FILTER_TYPES
} from 'orkis-interface_new';

@Controller({ path: "/api" })
export class MyController {
  
  @RequestMapping({
    route: "/test",
    requestType: REQUEST_TYPE.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION
  })
  async testEndpoint(
    @RequestBody() body: any,
    @SessionParam() session: any
  ) {
    return { success: true };
  }
}
```

### 서비스 정의

```typescript
import { Service, Autowired } from 'orkis-interface_new';

@Service("MyService")
export class MyService {
  
  @Autowired("SomeDao")
  private dao!: SomeDao;
  
  async businessLogic() {
    // 비즈니스 로직
  }
}
```

### 미들웨어 정의

```typescript
import { 
  ExpressMiddleware,
  Request,
  Response 
} from 'orkis-interface_new';

@ExpressMiddleware()
export class CustomMiddleware implements ExpressMiddleware {
  name = 'CustomMiddleware';
  order = 100;

  async handler(req: Request, res: Response, next: any) {
    // 미들웨어 로직
    console.log(`Request to: ${req.path}`);
    next();
  }
}
```

### 인터셉터 정의

```typescript
import { 
  ExpressInterceptor,
  Request,
  Response 
} from 'orkis-interface_new';

export class LoggingInterceptor implements ExpressInterceptor {
  name = 'LoggingInterceptor';
  
  async before(req: Request, res: Response, next: any) {
    console.log(`Before: ${req.method} ${req.path}`);
    next();
  }
  
  async after(req: Request, res: Response, result: any, next: any) {
    console.log(`After: ${req.method} ${req.path}`);
    next();
  }
}
```

## 장점

1. **타입 안정성**: Core 프레임워크 기능 사용 시 컴파일 타임 검증
2. **자동완성**: IDE에서 Core API 자동완성 지원
3. **일관성**: Core와 Backend 간 인터페이스 일관성 보장
4. **확장성**: 새로운 Core 기능 추가 시 인터페이스 확장 용이
5. **문서화**: 인터페이스 자체가 Core API 문서 역할