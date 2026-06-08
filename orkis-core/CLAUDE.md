# ORKIS Core Framework - Quick Reference

## Essential Info

- **Spring Boot-Style Framework**: Decorator-based programming for Node.js/TypeScript
- **DI Container**: Eager initialization with automatic dependency injection
- **Database Abstraction**: Unified API for PostgreSQL, SQLite, Redis, File storage
- **Transaction Management**: REQUIRED, REQUIRES_NEW, SUPPORTS propagation modes
- **SSE & Session**: Built-in Server-Sent Events and Session management
- **Package**: @orkis/core
- **Registry**: GitLab Package Registry (git.orkis.kr)

## Quick Start

```bash
yarn dev              # Start development server (src/dev/main.ts)
yarn build:dev        # TypeScript build with sourcemap
yarn build:prod       # Production build (no sourcemap)
yarn publish:dev      # Build dev + yalc publish
yarn publish:prod     # Build prod + npm publish to GitLab
yarn format           # Prettier format
yarn format:check     # Prettier check
```

## Publishing to GitLab Package Registry

### Requirements
- NPM_TOKEN environment variable (Personal Access Token with api, write_registry scopes)
- Token setup: `export NPM_TOKEN="glpat-xxxx..."` in ~/.zshrc

### Publish Flow
```bash
yarn version patch    # Update version (1.0.0 -> 1.0.1)
yarn publish:prod     # Build and publish
```

## Package Exports

```typescript
// Main entry
import { OrkisFactory, ApplicationContext } from '@orkis/core';

// Core (decorators, constants, types)
import {
  Application, Controller, Service, Dao, Configuration,
  Transactional, RequestMapping, Autowired, InjectConnection, Value,
  Param, Body, Query, Headers, Files, Part, ParamMap, Session, Sse, Req, Res,
  BEAN_SCAN_TYPES, REQUEST_TYPE, REQUEST_METHOD, IF_POINT_CUT
} from '@orkis/core/common';

// Application (server, routing, interceptor)
import {
  ExpressApplication, BaseInterceptor,
  CustomError, ValidationError
} from '@orkis/core/application';

// Plugins
import { SessionPlugin } from '@orkis/core/plugins';

// Database
import {
  DatabaseConnectionManager, DatabaseFactory, BaseAdapter,
  PostgreSQLAdapter, SQLiteAdapter, RedisAdapter, NewRedisAdapter,
  DatabaseType, REQUIRED, REQUIRES_NEW, SUPPORTS,
  DynamicConnectionSupport
} from '@orkis/core/database';

// Utils (Logger, SSE, HTTP Client)
import logger, { SSEStream, SSEEvent, HttpModule } from '@orkis/core/utils';

// Configs
import { ApplicationEnvironment } from '@orkis/core/configs';
```

## Core Decorators

### Class Decorators
| Decorator | Description |
|-----------|-------------|
| `@Application(option?)` | Main entry point (extends ExpressApplication), supports requestLogging, scanCoreExtensions, cors options |
| `@Controller(path)` | REST API controller with base route |
| `@Service` | Business logic layer |
| `@Dao` | Data access layer |
| `@Component` | General purpose component |
| `@Configuration` | Configuration class |
| `@DatabaseConfig(config)` | Database connection setup |
| `@Interceptor(option)` | Request interceptor |

### Property Decorators
| Decorator | Description |
|-----------|-------------|
| `@Autowired` | Dependency injection by bean name |
| `@InjectConnection(name, options)` | Database connection injection |
| `@Value(key)` | Environment variable injection |

### Method Decorators
| Decorator | Description |
|-----------|-------------|
| `@Get(route, options?)` | GET 요청 매핑 |
| `@Post(route, options?)` | POST 요청 매핑 |
| `@Put(route, options?)` | PUT 요청 매핑 |
| `@Patch(route, options?)` | PATCH 요청 매핑 |
| `@Delete(route, options?)` | DELETE 요청 매핑 |
| `@RequestMapping(config)` | HTTP route mapping (하위 호환용) |
| `@Transactional(config)` | Declarative transaction management |

### Parameter Decorators
| Decorator | Description |
|-----------|-------------|
| `@Param(name)` | URL/query/body parameters |
| `@Query(name)` | Query string parameters |
| `@Body()` | Request body injection |
| `@Headers(name)` | HTTP header extraction |
| `@Files(fieldName)` | Uploaded file extraction |
| `@ParamMap()` | All params merged object |
| `@Part(name)` | Multipart form field |
| `@Session(key)` | Session data extraction |
| `@Sse` | SSE stream injection |
| `@Req()` / `@Res()` | Express objects |

## HTTP Client (RequestModule)

서버 간 HTTP 통신을 위한 내장 클라이언트입니다. undici 기반으로 고성능 Connection Pool을 지원합니다.

### 구조

- **전역 api**: Agent 기반, 여러 호스트에 요청 가능 (코어에서 제공)
- **커스텀 HttpModule**: Pool 기반, 특정 호스트 전용 (백엔드에서 생성)

### Global Usage

```typescript
// 애플리케이션 시작 시 자동으로 global.api에 등록됨
const result = await api.get('https://api.example.com/users');
const created = await api.post('https://api.example.com/users', { name: 'John' });
```

### @Application에서 옵션 설정

```typescript
@Application({
  logLevel: 'info',           // 애플리케이션 로그 레벨
  httpModule: {               // Agent 옵션 설정
    connections: 200,
    keepAliveTimeout: 20_000,
    timeout: 60_000
  }
})
class MyApp extends ExpressApplication {}
```

### 커스텀 HttpModule 생성 (특정 호스트용 Pool)

```typescript
import { HttpModule } from '@orkis/core/utils';

const aiRq = new HttpModule({
  baseURL: 'https://ai-server.com',  // 필수
  timeout: 120_000,
  connections: 50,
  headers: { 'X-API-Key': 'secret' }
});

// 인터셉터 설정
aiRq.beforeIntercept(async (url, init) => {
  init.headers = { ...init.headers, 'Authorization': `Bearer ${getToken()}` };
  return { url, init };
});

const result = await aiRq.post('/v1/chat', { message: 'hello' });
```

### Methods

| Method | Description |
|--------|-------------|
| `get<T>(url, options?)` | GET request |
| `post<T>(url, body?, options?)` | POST request |
| `put<T>(url, body?, options?)` | PUT request |
| `patch<T>(url, body?, options?)` | PATCH request |
| `delete<T>(url, options?)` | DELETE request |

### Request Options

```typescript
interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, string | number>;  // Query string
  responseType?: 'json' | 'text' | 'arrayBuffer' | 'blob' | 'bytes' | 'stream';
}
```

### Interceptors

```typescript
// Before interceptor - 요청 전 URL/headers 수정
api.beforeIntercept(async (url, init) => {
  init.headers = { ...init.headers, 'X-Request-Id': generateId() };
  return { url, init };
});

// After interceptor - 응답 처리
api.afterIntercept(async (response, request) => {
  console.log(`${request.url}: ${response.status}`);
  return response;
});
```

### Connection Pool 구조

```
Agent (전역 api)
├── Pool (host1.com) ─┬─ Client (연결 1)
│                     ├─ Client (연결 2)
│                     └─ Client (연결 3)
└── Pool (host2.com) ─┬─ Client (연결 1)
                      └─ Client (연결 2)

Pool (커스텀 HttpModule) - 특정 호스트 전용 연결 관리
```

## Bootstrap Example

```typescript
import { OrkisFactory } from '@orkis/core';
import {
  Application, Controller, Service, Dao,
  DatabaseConfig, Get, Post, Autowired, InjectConnection, Transactional, Body
} from '@orkis/core/common';
import { ExpressApplication } from '@orkis/core/application';
import { SessionPlugin } from '@orkis/core/plugins';
import { DatabaseType } from '@orkis/core/database';

@Dao
class UserDao {
  @InjectConnection('main')
  private db: any;

  async findAll() {
    return (await this.db.query('SELECT * FROM users')).rows;
  }
}

@Service
class UserService {
  @Autowired private userDao: UserDao;

  @Transactional
  async getUsers() {
    return await this.userDao.findAll();
  }
}

@Controller('/api/users')
class UserController {
  @Autowired private userService: UserService;

  @Get('/')
  async getUsers() {
    return await this.userService.getUsers();
  }

  @Post('/')
  async createUser(@Body() body: any) {
    return await this.userService.createUser(body);
  }
}

@DatabaseConfig({
  databaseName: 'main',
  databaseType: DatabaseType.POSTGRESQL,
  host: 'localhost', port: 5432,
  database: 'myapp', user: 'postgres', password: 'secret',
  pool: true
})
@Application({ requestLogging: true }) // Enable request logging
class MyApp extends ExpressApplication {
  protected async onAfterInitialize() {
    await SessionPlugin.apply(this.app); // File-based session
  }

  protected async onAfterStart() {
    console.log('Server started');
  }
}

OrkisFactory.start(3000);
```

## Request Logger (LogMiddleware)

`@Application` 데코레이터의 `requestLogging` 옵션으로 요청 로깅을 활성화합니다.

```typescript
// 단순 활성화
@Application({ requestLogging: true })

// 상세 옵션
@Application({
  logLevel: 'debug',              // 애플리케이션 전체 로그 레벨
  requestLogging: {
    enabled: true,
    excludePaths: ['/health', '/metrics'],
    slowRequestThreshold: 3000    // 느린 요청 기준 ms (초과 시 WARN)
  }
})

// 환경변수: LOG_LEVEL=debug, ENABLE_REQUEST_LOGGING=true
```

로그 포맷: `GET /api/users - 200 (15ms) | IP: 127.0.0.1 | Agent: ... | Type: application/json`

## CORS Configuration

`@Application` 데코레이터의 `cors` 옵션으로 CORS 미들웨어를 설정합니다.

```typescript
// 기본 설정으로 활성화
@Application({ cors: true })

// 커스텀 설정
@Application({
  cors: {
    origin: ['https://myapp.com', 'https://admin.myapp.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
  }
})

// CORS 비활성화 (기본값: 옵션 미설정 시 비활성화)
@Application({ cors: false })
```

**CorsOptions 주요 옵션:**
| 옵션 | 타입 | 설명 |
|------|------|------|
| `origin` | `boolean \| string \| string[] \| function` | 허용할 출처. `true`면 요청 Origin 반영 |
| `credentials` | `boolean` | 쿠키/인증 정보 허용 |
| `methods` | `string[]` | 허용할 HTTP 메서드 |
| `allowedHeaders` | `string[]` | 허용할 요청 헤더 |
| `exposedHeaders` | `string[]` | 클라이언트에 노출할 응답 헤더 |
| `maxAge` | `number` | Preflight 캐시 시간(초) |

**참고**: `cors` 옵션은 `cors` npm 패키지의 `CorsOptions` 타입을 직접 사용합니다.

## SSE (Server-Sent Events)

```typescript
import { SSEStream, SSEEvent } from '@orkis/core/utils';
import { Controller, RequestMapping, Sse, REQUEST_TYPE, REQUEST_METHOD } from '@orkis/core/common';

@Controller('/api/events')
class EventController {
  @RequestMapping({ route: '/stream', method: REQUEST_METHOD.GET, requestType: REQUEST_TYPE.SSE })
  async stream(@Sse sse: SSEStream) {
    // Send events
    sse.send({ event: 'message', data: { text: 'Hello' } });
    sse.send({ data: 'Simple data' });

    // Handle client disconnect
    sse.onClose(() => {
      console.log('Client disconnected');
    });

    // Manual close when done
    sse.close();
  }
}
```

**SSEStream API:**
- `send(event: SSEEvent)` - Send event to client
- `onClose(callback)` - Register disconnect callback
- `close()` - Close connection
- `isClosed` - Check if closed

## Session Management

```typescript
import { SessionPlugin } from '@orkis/core/plugins';
import { DatabaseType } from '@orkis/core/database';
import { DatabaseConfig, Session } from '@orkis/core/common';

// Option 1: File-based session (default fallback)
await SessionPlugin.apply(app);

// Option 2: Redis session store
@DatabaseConfig({
  databaseName: 'session',
  databaseType: DatabaseType.NEW_REDIS,
  url: 'redis://localhost:6379',
  metadata: { type: 'session', prefix: 'sess:', ttl: 86400 }
})

await SessionPlugin.apply(app, 'session');

// Using session in controller
@Controller('/api/auth')
class AuthController {
  @RequestMapping({ route: '/me', method: REQUEST_METHOD.GET })
  getMe(@Session('user') user: any, @Session() session: any) {
    return { user, allSession: session };
  }
}
```

## Database Configuration

```typescript
import { DatabaseType } from '@orkis/core/database';
import { DatabaseConfig } from '@orkis/core/common';

// PostgreSQL
@DatabaseConfig({
  databaseName: 'main',
  databaseType: DatabaseType.POSTGRESQL,
  host: 'localhost', port: 5432,
  database: 'myapp', user: 'postgres', password: 'secret',
  pool: true  // or false for single client
})

// SQLite
@DatabaseConfig({
  databaseName: 'local',
  databaseType: DatabaseType.SQLITE,
  filePath: './data/app.db'
})

// Redis (ioredis)
@DatabaseConfig({
  databaseName: 'cache',
  databaseType: DatabaseType.REDIS,
  host: 'localhost', port: 6379
})

// New Redis (redis library - for session)
@DatabaseConfig({
  databaseName: 'session',
  databaseType: DatabaseType.NEW_REDIS,
  url: 'redis://localhost:6379',
  metadata: { type: 'session', prefix: 'orkis:session:', ttl: 86400 }
})
```

## Transaction Management

```typescript
import { REQUIRED, REQUIRES_NEW, SUPPORTS } from '@orkis/core/database';
import { Transactional, Service, Autowired } from '@orkis/core/common';

@Service
class AccountService {
  @Autowired private accountDao: AccountDao;

  @Transactional({ propagation: REQUIRED }) // default
  async transfer(from: string, to: string, amount: number) {
    await this.accountDao.debit(from, amount);
    await this.accountDao.credit(to, amount);
    // Auto-rollback on error
  }
}

// Propagation Modes:
// REQUIRED - Join existing or create new
// REQUIRES_NEW - Always create new independent transaction
// SUPPORTS - Join if exists, else run without transaction
```

## Dynamic Connection (Multi-tenant)

런타임에 동적으로 데이터베이스 연결을 생성하는 기능입니다. Multi-tenant 아키텍처에서 테넌트별로 다른 DB에 연결할 때 사용합니다.

```typescript
import { Service, Autowired, InjectConnection } from '@orkis/core/common';
import { DynamicConnectionSupport } from '@orkis/core/database';

@Service
class TenantService extends DynamicConnectionSupport {
  @Autowired private tenantDao: TenantDao;

  @InjectConnection('tenant', { dynamic: true })
  private tenantDb: any;

  async queryTenant(tenantId: string) {
    // 1. 테넌트별 DB 경로 조회
    const dbPath = await this.tenantDao.getDbPath(tenantId);

    // 2. 동적 연결 준비 (DynamicConnectionSupport 메서드)
    await this.prepareDynamicDBConnection({
      databaseType: 'sqlite',
      databaseName: 'tenant',
      filePath: dbPath
    });

    // 3. 동적 연결된 DB 쿼리
    return await this.tenantDb.query('SELECT * FROM data');
  }
}
```

**사용 조건:**
- `extends DynamicConnectionSupport` 필수
- `@InjectConnection(name, { dynamic: true })` 데코레이터 필요
- `@Transactional` 또는 Connection이 있는 메서드 내에서 호출

## Error Handling

```typescript
import {
  CustomError,
  ValidationError, UnauthorizedError, ForbiddenError, NotFoundError
} from '@orkis/core/application';

// Using built-in errors
throw new ValidationError('Invalid email format', { field: 'email' });
throw new UnauthorizedError('Token expired');
throw new NotFoundError('User not found');

// Custom error class
class PaymentError extends CustomError {
  constructor(message?: string) {
    super(message, 402, 'PAYMENT_FAILED');
  }
}

throw new PaymentError('Insufficient funds');
```

## Interceptor System

```typescript
import { Interceptor, IF_POINT_CUT, INTERCEPTOR_OPTION } from '@orkis/core/common';
import { BaseInterceptor, Request, Response, UnauthorizedError } from '@orkis/core/application';

@Interceptor({
  POINT_CUT: IF_POINT_CUT.BEFORE,  // FILTER, BEFORE, AFTER, EXCEPTION
  PRIORITY: 1,                      // Lower = higher priority
  PATH: ['*'],                      // Include patterns
  EXCLUDE: ['/api/health'],         // Exclude patterns (optional)
  USE: true
})
class AuthInterceptor extends BaseInterceptor {
  async handle(req: Request, res: Response) {
    if (!req.session?.user) {
      throw new UnauthorizedError('Unauthorized');
    }
    // 인증된 사용자 정보를 context에 저장
    req.context.user = req.session.user;
  }
}
```

## File Upload

```typescript
import { Controller, Post, Files, REQUEST_TYPE } from '@orkis/core/common';
import { FileUploadUtil, SavedFileResult } from '@orkis/core/utils';

// 환경변수 설정 필수: FILE_UPLOAD_PATH=/app/storage/uploads

@Controller('/api/files')
class FileController {
  @Post('/upload', { requestType: REQUEST_TYPE.UPLOAD, multipartConfig: { maxFileSize: 20 * 1024 * 1024, maxCount: 10 } })
  async upload(@Files('photos') files: MulterFile[]) {
    // 단일 파일 저장 (확장자 미지정 시 원본 확장자 자동 추가)
    // subPaths 배열을 사용하여 path traversal 방지
    const result = await FileUploadUtil.saveFile(
      files[0],
      ['users', 'avatars'],  // subPaths 배열
      'photo-001'
    );
    // FILE_UPLOAD_PATH=/app/storage 일 때
    // result.path: '/app/storage/users/avatars/photo-001.jpg'

    // 복수 파일 저장
    const results = await FileUploadUtil.saveFiles(
      files,
      ['photos', 'gallery'],
      (file, i) => `${Date.now()}-${i}`
    );

    return { success: true, results };
  }
}
```

## Project Structure

```
src/main/
├── index.ts                 # Main exports (OrkisFactory, ApplicationContext)
├── factory/OrkisFactory.ts  # Application starter
├── core/                    # Core framework
│   ├── constants/           # BEAN_SCAN_TYPES, META_KEYS, REQUEST_TYPE, etc.
│   ├── container/           # ApplicationContext, BeanResolver, ComponentScan, TransactionResolver
│   ├── decorators/          # All decorators (class, method, parameter, property)
│   └── types/               # Bean types, option types
├── application/             # Express integration
│   ├── server/              # ExpressApplication, BaseInterceptor
│   ├── routing/             # Router registry, parameter resolver
│   ├── middleware/          # LogMiddleware
│   ├── errors/              # CustomError, HttpErrors
│   ├── plugins/             # SessionPlugin
│   └── types/               # HTTP types, response types
├── database/                # Database abstraction
│   ├── adapters/            # PostgreSQL, SQLite, Redis, NewRedis, File
│   ├── connection/          # DatabaseConnectionManager, DatabaseFactory, DynamicConnectionSupport
│   ├── interfaces/          # IDatabaseConnection, DatabaseClient
│   └── types/               # DatabaseConfig, DatabaseType
├── config/                  # Configuration
│   └── ApplicationEnvironment.ts
├── extensions/              # Core 확장 기능 (자동 스캔)
│   └── BeforeLogInterceptor.ts  # 기본 로그 인터셉터
└── utils/                   # Utilities
    ├── Logger.ts            # 애플리케이션 로거 + systemLog (코어 전용)
    ├── SSEStream.ts
    ├── FileUploadUtil.ts
    └── http/                # HTTP Client (undici 기반)
        ├── BaseHttpModule.ts         # 공통 로직 (abstract)
        ├── InternalHttpModule.ts     # Agent 기반 (내부 전용)
        ├── HttpModule.ts             # Pool 기반 (백엔드 노출)
        ├── global.ts                 # global.api 등록
        └── types.ts                  # Request/Response types
```

## Database Adapters

| Adapter | Library | Transaction | Features |
|---------|---------|-------------|----------|
| PostgreSQLAdapter | pg | Yes | Pool/Client mode |
| SQLiteAdapter | sqlite3 | Yes | WAL mode, FK enabled |
| RedisAdapter | ioredis | No | Command parsing |
| NewRedisAdapter | redis | No | Session store compatible |
| FileAdapter | fs-extra | No | JSON storage |

## Lifecycle Hooks

```typescript
@Application
class MyApp extends ExpressApplication {
  protected async onBeforeInitialize(): Promise<void> {}  // Before Express setup
  protected async onAfterInitialize(): Promise<void> {}   // After middleware setup
  protected async onBeforeStart(): Promise<void> {}       // Before server.listen()
  protected async onAfterStart(): Promise<void> {}        // After server started
}
```

## Key Constants

```typescript
// Request Types
REQUEST_TYPE.DEFAULT   // 0 - Standard HTTP
REQUEST_TYPE.UPLOAD    // 1 - File upload
REQUEST_TYPE.DOWNLOAD  // 2 - File download
REQUEST_TYPE.SSE       // 3 - Server-Sent Events

// HTTP Methods
REQUEST_METHOD.GET, POST, PUT, PATCH, DELETE

// Interceptor Point Cuts
IF_POINT_CUT.FILTER     // 라우팅 전 필터링 (인증 등)
IF_POINT_CUT.BEFORE     // 컨트롤러 실행 전
IF_POINT_CUT.AFTER      // 컨트롤러 실행 후
IF_POINT_CUT.EXCEPTION  // 에러 처리

// Log Levels (로그 레벨 우선순위: 환경변수 > Application 옵션 > 기본값)
LOG_LEVEL.ERROR  // 0 - 에러만 출력
LOG_LEVEL.WARN   // 1 - 경고 이상 출력
LOG_LEVEL.INFO   // 2 - 정보 이상 출력 (기본값)
LOG_LEVEL.DEBUG  // 3 - 모든 로그 출력

// Bean Scan Types
BEAN_SCAN_TYPES.APPLICATION, CONTROLLER, SERVICE, DAO, COMPONENT, INTERCEPTOR, CONFIG
```

## Logger

```typescript
import logger from '@orkis/core/utils';

// 기본 사용
logger.error('Error message');
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message');

// 로그 레벨 설정
// 1순위: 환경변수 LOG_LEVEL=debug
// 2순위: @Application({ logLevel: 'debug' }) - 자동 설정됨
```

**systemLog (코어 전용)**: 코어 내부에서 사용하는 시스템 로그로, 로그 레벨과 관계없이 항상 출력되며 `SYSTEM` 라벨이 붙습니다. Bootstrap 로그 등 코어 동작 확인용으로 사용됩니다.

## Important Notes

- **Eager Initialization**: All singletons created at startup
- **Getter Proxy Pattern**: Autowired beans share transaction context
- **Auto-Rollback**: Exceptions trigger automatic rollback
- **File Cleanup**: Upload temp files auto-deleted in finally block
- **Session**: Requires `express-session`, supports Redis or file store
- **SSE**: Automatic header setup, client disconnect handling
- **Component Scan**: node_modules 자동 제외, Windows 경로 지원

## Core Extensions Scan

코어에서 제공하는 기본 인터셉터 등 확장 기능을 자동으로 스캔합니다.

```typescript
// 기본값: true (코어 extensions 폴더 자동 스캔)
@Application({ scanCoreExtensions: true })

// 비활성화
@Application({ scanCoreExtensions: false })

// 환경변수로 제어 (우선순위가 가장 높음)
// ORKIS_SCAN_CORE_EXTENSIONS=false
```

**우선순위**: 환경변수 > @Application 옵션 > 기본값 (true)

**스캔 경로**:
- 개발환경: `{project}/src/main/extensions/`
- 프로덕션: `{node_modules}/@orkis/core/extensions/`

## Internal Architecture Notes (December 2024 Refactoring)

### Decorator Architecture
- **Class decorators**: 메타데이터만 저장, proxyClass 패턴 제거
- **Interceptor option**: Bean 메타데이터에서 직접 참조 (내부 프로퍼티 사용 X)
- **Interceptor 간소화**: `func()`, `match()` 메서드 삭제, `handle()` 메서드만 사용

### DI Container
- **BeanResolver**: 클래스 데코레이터는 메타데이터만 저장, 실제 인스턴스 생성은 BeanResolver에서 처리
- **TransactionResolver**: TransactionHelper에서 이름 변경, Bean clone 최적화 적용
- **Service-to-Service injection**: Service에서 다른 Service property injection 지원

### Database
- **폴더 구조 변경**: `manager/` + `factory/` → `connection/` 통합
- **DatabaseConnectionManager**: 코어 싱글톤 클래스로 변경
- **DynamicConnectionSupport**: 동적 연결을 위한 추상 클래스, `extends`로 `prepareDynamicDBConnection` 메서드 사용
- **Dynamic Connection**: 런타임 DB 연결 지원, `instanceof DynamicConnectionSupport`로 주입 여부 판단
- **Adapter 공통화**: 모든 DB adapter에 `supportTransaction` 플래그 추가
- **InjectConnection**: `useNativeClient` 옵션으로 라이브러리 클라이언트 직접 사용 가능

### Router & Interceptor
- **ExpressRouterRegistry**: 라우터 로직 리팩토링, 글로벌 에러 핸들러 명시적 추가
- **ExpressRouterRegistry.normalizePath**: 경로 정규화 (슬래시 유무 상관없이 라우터 등록)
- **ExpressInterceptorRegistry**: PATH 매칭 기능 추가, EXCLUDE 패턴 지원, 레지스트리 간소화
- **Parameter Resolver**: SSEHelper를 req.context에서 제거, 파라미터 resolve 함수 리팩토링
- **Default Response**: 응답을 안 보냈을 시 기본 응답 자동 전송
- **RequestMapping 리팩토링**: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete` 데코레이터 추가, `createRequestMapping` 내부 함수로 코드 중복 제거

### File Structure
- **개발 코드 분리**: `src/main/main.ts` → `src/dev/main.ts`로 이동
- **Legacy 폴더**: 사용하지 않는 코드 `legacyStore/`로 이동 (ResponseHelper, build.ts 등)
- **HTTP Module**: `utils/http/` 폴더로 이동, HttpModule 리팩토링 (Agent/Pool 분리)
  - RequestModule → HttpModule로 네이밍 변경 (2024-12-19)
  - okClient → rq → api로 전역 변수명 변경 (2024-12-22)

### Build & Config
- **tsconfig 분리**: `tsconfig.dev.json`, `tsconfig.prod.json` 분리
- **ApplicationEnvironment 간소화**: 코어 내부 데코레이터 제거
- **Component Scan 최적화**: 중복 스캔 제거, 스캐닝 폴더 탐색 간소화

### Transaction System (January 2025 Refactoring)
- **Proxy Pattern 도입**: 중첩 Bean에 Lazy Proxy 적용, 실제 접근 시점에만 clone 생성
- **Lazy Adapter**: Database adapter를 eager에서 lazy 주입으로 변경, 실제 쿼리 실행 시점에 connection 획득
- **Promise.all 동시성 이슈 해결**: Race Condition 방지를 위한 pending Promise 관리
- **TransactionContext 외부 분리**: 함수 내부에서 외부 인터페이스로 분리하여 구조 개선
- **2단계 최적화**: Entry point Bean은 직접 clone, 2단계 이상 Bean은 Lazy Proxy로 불필요한 clone 생성 방지

### CORS Middleware (January 2025)
- **Application 데코레이터 옵션화**: CORS 설정을 `@Application({ cors: ... })`로 이동
- **조건부 활성화**: 옵션 미설정 시 CORS 비활성화 (명시적 설정 필요)
- **CorsOptions 타입 직접 사용**: `cors` 패키지 타입 re-export로 타입 안정성 보장
