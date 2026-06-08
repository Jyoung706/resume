# @orkis/core

Node.js + TypeScript 환경에서 Spring Boot 스타일의 데코레이터 기반 웹 애플리케이션 개발을 지원하는 프레임워크입니다.

## 개요

@orkis/core는 Express.js 기반의 TypeScript 웹 애플리케이션 프레임워크로, Java Spring Boot의 어노테이션 기반 개발 패턴을 Node.js 환경에서 구현합니다. 의존성 주입, 데코레이터 패턴, 트랜잭션 관리, 데이터베이스 추상화를 통해 대규모 Node.js 애플리케이션의 개발 생산성을 향상시킵니다.

## 주요 기능

- **데코레이터 기반 개발**: `@Controller`, `@Service`, `@Autowired` 등 Spring Boot 스타일 데코레이터
- **의존성 주입 (DI)**: Eager initialization 기반 자동 의존성 주입 시스템
- **데이터베이스 추상화**: PostgreSQL, SQLite, Redis, File 스토리지 통합 API
- **트랜잭션 관리**: REQUIRED, REQUIRES_NEW, SUPPORTS 전파 모드 지원
- **SSE & Session**: Server-Sent Events 및 세션 관리 내장
- **인터셉터 시스템**: 요청/응답 파이프라인 커스터마이징
- **HTTP Client**: undici 기반 고성능 서버 간 HTTP 클라이언트
- **TypeScript 완전 지원**: 강력한 타입 안정성

## 설치

### GitLab Package Registry에서 설치

```bash
# .yarnrc.yml 또는 .npmrc에 registry 설정 필요
yarn add @orkis/core
```

### 로컬 개발 (yalc)

```bash
# orkis-core에서
yarn publish:dev

# 사용하는 프로젝트에서
yalc link @orkis/core
```

## 빠른 시작

### 1. 기본 애플리케이션 생성

```typescript
import { OrkisFactory } from "@orkis/core";
import {
  Application,
  Controller,
  RequestMapping,
  REQUEST_METHOD
} from "@orkis/core/common";
import { ExpressApplication } from "@orkis/core/application";

@Controller("/api")
class HelloController {
  @RequestMapping({ route: "/hello", method: REQUEST_METHOD.GET })
  hello() {
    return { message: "Hello, Orkis Core!" };
  }
}

@Application({ requestLogging: true }) // 요청 로깅 활성화
class MyApp extends ExpressApplication {
  protected async onAfterStart() {
    console.log("Server started!");
  }
}

OrkisFactory.start(3000);
```

### 2. 서비스와 의존성 주입

```typescript
import { Service, Controller, Autowired, Get } from "@orkis/core/common";

@Service
class UserService {
  getUsers() {
    return [
      { id: 1, name: "John" },
      { id: 2, name: "Jane" }
    ];
  }
}

@Controller("/api/users")
class UserController {
  @Autowired
  private userService: UserService;

  @Get("/")
  getUsers() {
    return this.userService.getUsers();
  }
}
```

### 3. 데이터베이스 연동

```typescript
import { Dao, InjectConnection, Transactional } from "@orkis/core/common";
import { DatabaseType } from "@orkis/core/database";

@Dao
class UserDao {
  @InjectConnection("main")
  private db: any;

  async findAll() {
    return (await this.db.query("SELECT * FROM users")).rows;
  }
}

@Service
class UserService {
  @Autowired
  private userDao: UserDao;

  @Transactional
  async getUsers() {
    return await this.userDao.findAll();
  }
}
```

### 4. 동적 데이터베이스 연결 (Multi-tenant)

```typescript
import { Service, Autowired, InjectConnection } from "@orkis/core/common";
import { DynamicConnectionSupport } from "@orkis/core/database";

@Service
class TenantService extends DynamicConnectionSupport {
  @Autowired
  private tenantDao: TenantDao;

  @InjectConnection("tenant", { dynamic: true })
  private tenantDb: any;

  async queryTenant(tenantId: string) {
    // 테넌트별 DB 경로 조회
    const dbPath = await this.tenantDao.getDbPath(tenantId);

    // 동적 연결 준비
    await this.prepareDynamicDBConnection({
      databaseType: "sqlite",
      databaseName: "tenant",
      filePath: dbPath
    });

    // 동적 연결된 DB 쿼리
    return await this.tenantDb.query("SELECT * FROM data");
  }
}
```

### 5. 인터셉터 (미들웨어)

```typescript
import { Interceptor, IF_POINT_CUT } from "@orkis/core/common";
import {
  BaseInterceptor,
  Request,
  Response,
  UnauthorizedError
} from "@orkis/core/application";

@Interceptor({
  POINT_CUT: IF_POINT_CUT.BEFORE,
  PATH: ["/api/*"],
  EXCLUDE: ["/api/health"], // 제외할 경로
  PRIORITY: 1,
  USE: true
})
class AuthInterceptor extends BaseInterceptor {
  async handle(req: Request, res: Response) {
    if (!req.headers.authorization) {
      throw new UnauthorizedError("Authorization required");
    }
    // 인증된 사용자 정보를 context에 저장
    req.context.user = { id: 1, name: "user" };
  }
}
```

### 6. HTTP 클라이언트 (서버 간 통신)

```typescript
// 글로벌 api 객체 사용 (Agent 기반, 여러 호스트 요청 가능)
const users = await api.get<User[]>("https://api.example.com/users");
const created = await api.post<User>("https://api.example.com/users", {
  name: "John"
});

// 커스텀 HttpModule 생성 (Pool 기반, 특정 호스트 전용)
import { HttpModule } from "@orkis/core/utils";

const aiRq = new HttpModule({
  baseURL: "https://ai-server.com", // 필수
  timeout: 120_000,
  connections: 50
});

// 인터셉터 설정
aiRq.beforeIntercept(async (url, init) => {
  init.headers = { ...init.headers, Authorization: `Bearer ${getToken()}` };
  return { url, init };
});

const data = await aiRq.post("/v1/chat", { message: "hello" });
```

## 모듈 Import

```typescript
// Main entry
import { OrkisFactory, ApplicationContext } from "@orkis/core";

// Core (decorators, constants, types)
import {
  Application,
  Controller,
  Service,
  Dao,
  Configuration,
  Transactional,
  RequestMapping,
  Autowired,
  InjectConnection,
  Value,
  Param,
  Body,
  Query,
  Headers,
  Files,
  Part,
  ParamMap,
  Session,
  Sse,
  Req,
  Res,
  BEAN_SCAN_TYPES,
  REQUEST_TYPE,
  REQUEST_METHOD,
  IF_POINT_CUT
} from "@orkis/core/common";

// Application (server, routing, interceptor)
import {
  ExpressApplication,
  BaseInterceptor,
  CustomError,
  ValidationError
} from "@orkis/core/application";

// Plugins
import { SessionPlugin } from "@orkis/core/plugins";

// Database
import {
  DatabaseConnectionManager,
  DatabaseFactory,
  BaseAdapter,
  PostgreSQLAdapter,
  SQLiteAdapter,
  RedisAdapter,
  NewRedisAdapter,
  DatabaseType,
  REQUIRED,
  REQUIRES_NEW,
  SUPPORTS,
  DynamicConnectionSupport
} from "@orkis/core/database";

// Utils (Logger, SSE, HTTP Client)
import logger, { SSEStream, SSEEvent, HttpModule } from "@orkis/core/utils";

// Configs
import { ApplicationEnvironment } from "@orkis/core/configs";
```

## 주요 데코레이터

### 클래스 데코레이터

| 데코레이터                | 설명                                                             |
| ------------------------- | ---------------------------------------------------------------- |
| `@Application(option?)`   | 메인 애플리케이션 (requestLogging, scanCoreExtensions, cors 옵션 지원) |
| `@Controller(path)`       | REST API 컨트롤러                                                |
| `@Service`                | 비즈니스 로직 서비스                                             |
| `@Dao`                    | 데이터 액세스 레이어                                             |
| `@Component`              | 범용 컴포넌트                                                    |
| `@Configuration`          | 설정 클래스                                                      |
| `@DatabaseConfig(config)` | 데이터베이스 연결 설정                                           |
| `@Interceptor(option)`    | 요청 인터셉터                                                    |

### 프로퍼티 데코레이터

| 데코레이터                | 설명                   |
| ------------------------- | ---------------------- |
| `@Autowired`              | 의존성 주입            |
| `@InjectConnection(name)` | 데이터베이스 연결 주입 |
| `@Value(key)`             | 환경변수 주입          |

### 메서드 데코레이터

| 데코레이터                 | 설명                         |
| -------------------------- | ---------------------------- |
| `@Get(route, options?)`    | GET 요청 매핑                |
| `@Post(route, options?)`   | POST 요청 매핑               |
| `@Put(route, options?)`    | PUT 요청 매핑                |
| `@Patch(route, options?)`  | PATCH 요청 매핑              |
| `@Delete(route, options?)` | DELETE 요청 매핑             |
| `@RequestMapping(config)`  | HTTP 라우트 매핑 (하위 호환) |
| `@Transactional(config)`   | 트랜잭션 관리                |

### 파라미터 데코레이터

| 데코레이터          | 설명                    |
| ------------------- | ----------------------- |
| `@Param(name)`      | URL 파라미터            |
| `@Query(name)`      | 쿼리스트링 파라미터     |
| `@Body()`           | 요청 본문               |
| `@Headers(name)`    | HTTP 헤더               |
| `@Files(fieldName)` | 업로드 파일             |
| `@Part(name)`       | Multipart form 필드     |
| `@ParamMap()`       | 모든 파라미터 병합 객체 |
| `@Session(key)`     | 세션 데이터             |
| `@Sse`              | SSE 스트림              |
| `@Req()` / `@Res()` | Express 객체            |

## 프로젝트 구조

```
src/main/
├── index.ts                 # Main exports (OrkisFactory, ApplicationContext)
├── factory/OrkisFactory.ts  # Application starter
├── core/                    # Core framework
│   ├── constants/           # BEAN_SCAN_TYPES, META_KEYS, REQUEST_TYPE, etc.
│   ├── container/           # ApplicationContext, BeanResolver, ComponentScan
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
└── utils/                   # Utilities
    ├── Logger.ts
    ├── SSEStream.ts
    ├── FileUploadUtil.ts
    └── http/                # HTTP Client (undici 기반)
        ├── BaseHttpModule.ts         # 공통 로직 (abstract)
        ├── InternalHttpModule.ts     # Agent 기반 (내부 전용)
        ├── HttpModule.ts             # Pool 기반 (백엔드 노출)
        ├── global.ts                 # global.api 등록
        └── types.ts                  # Request/Response types
```

## 데이터베이스 어댑터

| Adapter           | Library  | Transaction | Features                 |
| ----------------- | -------- | ----------- | ------------------------ |
| PostgreSQLAdapter | pg       | Yes         | Pool/Client mode         |
| SQLiteAdapter     | sqlite3  | Yes         | WAL mode, FK enabled     |
| RedisAdapter      | ioredis  | No          | Command parsing          |
| NewRedisAdapter   | redis    | No          | Session store compatible |
| FileAdapter       | fs-extra | No          | JSON storage             |

## 개발 명령어

```bash
# 개발 서버 실행 (src/dev/main.ts)
yarn dev

# TypeScript 빌드 (sourcemap 포함)
yarn build:dev

# 프로덕션 빌드 (sourcemap 제외)
yarn build:prod

# 로컬 yalc 배포
yarn publish:dev

# GitLab Package Registry 배포
yarn publish:prod

# 코드 포맷팅
yarn format
yarn format:check
```

## GitLab Package Registry 배포

### 초기 설정

1. **GitLab Personal Access Token 발급**
   - git.orkis.kr > User Settings > Access Tokens
   - Scopes: `api`, `write_registry`

2. **환경변수 설정**

   ```bash
   # ~/.zshrc 또는 ~/.bashrc
   export NPM_TOKEN="glpat-xxxxxxxxxxxx"
   ```

3. **.yarnrc.yml 설정** (이미 구성됨)
   ```yaml
   npmScopes:
     orkis:
       npmRegistryServer: "https://git.orkis.kr/api/v4/projects/6/packages/npm/"
       npmPublishRegistry: "https://git.orkis.kr/api/v4/projects/6/packages/npm/"
       npmAuthToken: "${NPM_TOKEN}"
   ```

### 배포

```bash
# 버전 업데이트
yarn version patch   # 1.0.0 -> 1.0.1
yarn version minor   # 1.0.0 -> 1.1.0
yarn version major   # 1.0.0 -> 2.0.0

# Registry 배포
yarn publish:prod
```

## Lifecycle Hooks

```typescript
@Application
class MyApp extends ExpressApplication {
  protected async onBeforeInitialize(): Promise<void> {} // Express 설정 전
  protected async onAfterInitialize(): Promise<void> {} // 미들웨어 설정 후
  protected async onBeforeStart(): Promise<void> {} // server.listen() 전
  protected async onAfterStart(): Promise<void> {} // 서버 시작 후
}
```

## 주요 상수

```typescript
// Request Types
REQUEST_TYPE.DEFAULT; // 0 - 일반 HTTP
REQUEST_TYPE.UPLOAD; // 1 - 파일 업로드
REQUEST_TYPE.DOWNLOAD; // 2 - 파일 다운로드
REQUEST_TYPE.SSE; // 3 - Server-Sent Events

// HTTP Methods
(REQUEST_METHOD.GET, POST, PUT, PATCH, DELETE);

// Interceptor Point Cuts
IF_POINT_CUT.FILTER; // 라우팅 전 필터링
IF_POINT_CUT.BEFORE; // 컨트롤러 실행 전
IF_POINT_CUT.AFTER; // 컨트롤러 실행 후
IF_POINT_CUT.EXCEPTION; // 에러 처리

// Transaction Propagation
REQUIRED; // 기존 트랜잭션 참여 또는 새로 생성
REQUIRES_NEW; // 항상 새 트랜잭션 생성
SUPPORTS; // 있으면 참여, 없으면 트랜잭션 없이 실행
```

## Request Logger (LogMiddleware)

`@Application` 데코레이터의 `requestLogging` 옵션으로 요청 로깅을 활성화합니다.

```typescript
@Application({ requestLogging: true })  // 단순 활성화
@Application({
  logLevel: 'debug',  // 애플리케이션 전체 로그 레벨 설정
  requestLogging: {
    enabled: true,
    excludePaths: ['/health', '/metrics'],
    slowRequestThreshold: 3000     // 느린 요청 기준 ms (초과 시 WARN)
  }
})
// 환경변수: LOG_LEVEL=debug, ENABLE_REQUEST_LOGGING=true
```

## CORS Configuration

`@Application` 데코레이터의 `cors` 옵션으로 CORS 미들웨어를 설정합니다.

```typescript
// 기본 설정으로 활성화
@Application({ cors: true })

// 커스텀 설정
@Application({
  cors: {
    origin: ['https://myapp.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
})
```

**주요 옵션**: `origin`, `credentials`, `methods`, `allowedHeaders`, `exposedHeaders`, `maxAge`

## File Upload Utils

```typescript
import { FileUploadUtil, SavedFileResult } from "@orkis/core/utils";

// 환경변수 설정 필수: FILE_UPLOAD_PATH=/app/storage/uploads

// 단일 파일 저장 (확장자 미지정 시 원본 확장자 자동 추가)
const result = await FileUploadUtil.saveFile(
  file,
  ["users", "avatars"], // subPaths 배열 (path traversal 방지)
  "photo-001"
);
// FILE_UPLOAD_PATH=/app/storage 일 때 result.path: '/app/storage/users/avatars/photo-001.jpg'

// 복수 파일 저장
const results = await FileUploadUtil.saveFiles(
  files,
  ["photos", "gallery"],
  (file, i) => `${Date.now()}-${i}`
);
```

## ApplicationEnvironment / Env 파일 로딩

`OrkisFactory.start()` 가 호출되면 CLI 인자 `-e dev | prod` 에 따라 `resources/{mode}.env` 를 로드한다.

```
-e dev   →  resources/dev.env
-e prod  →  resources/prod.env  (default)
```

**파일 부재 정책 (1.0.22+)**

- 파일이 있으면 `dotenv` 로 로드 + info 로그
- 파일이 없으면 **warn 로그 후 그대로 진행** (FATAL throw 하지 않음)
- 이미 `process.env` 에 있는 키는 dotenv 가 덮어쓰지 않음 → k8s ConfigMap / Secret 으로 주입한 값이 우선

> 이전(1.0.21 이하) 동작: prod 모드에서 `resources/prod.env` 부재 시 FATAL throw → ConfigMap-only 환경에서 부팅 불가. 1.0.22 부터 완화되어 placeholder 파일 또는 파일 자체가 없어도 동작.

## 변경 이력 (요약)

### 1.0.22

- `ApplicationEnvironment.loadConfiguration`: prod 모드에서 `resources/prod.env` 부재 시 FATAL throw 제거
- 정책: dev / prod 무관 파일 있으면 로드 / 없으면 warn 후 진행
- 동기: k8s ConfigMap / Secret 주입 환경에서 placeholder 파일을 강제하던 부담 제거

## 라이선스

MIT License

## 작성자

**권운호** - [gdmanian@icloud.com](mailto:gdmanian@icloud.com)
