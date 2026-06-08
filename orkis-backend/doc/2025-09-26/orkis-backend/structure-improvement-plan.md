# ORKIS Backend 구조 개선 방안

## 1. 현재 구조 분석

### 1.1 현재 아키텍처 현황

```
orkis-backend/
├── src/
│   ├── main/
│   │   ├── auth/         # Handler Pattern 적용 (부분적)
│   │   │   ├── handlers/ # 로그인 핸들러 구현
│   │   │   ├── LoginController.ts
│   │   │   ├── LoginService.ts
│   │   │   └── LoginDao.ts
│   │   ├── chat/         # Clean Architecture 적용 (완료)
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   └── types/
│   │   ├── menu/         # Clean Architecture 적용 (부분적)
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── MenuController.ts (Legacy)
│   │   │   ├── MenuService.ts (Legacy)
│   │   │   └── MenuDao.ts (Legacy)
│   │   ├── language-models/  # 전통적 MVC 구조
│   │   ├── database/     # DB 관리 분산
│   │   ├── service/      # 공통 서비스 (fileDatabase)
│   │   ├── redis/        # Redis 클라이언트
│   │   ├── middleware/   # Express 미들웨어
│   │   ├── config/       # 설정 파일
│   │   ├── error/        # 에러 처리
│   │   └── utils/        # 유틸리티
│   ├── websocket/        # WebSocket 서버 (독립적)
│   └── types/            # 타입 정의
└── db_file/              # 파일 기반 DB 저장소
```

### 1.2 식별된 문제점

#### 구조적 문제
- **일관성 부족**: 모듈마다 서로 다른 아키텍처 패턴 사용
- **레거시 혼재**: 새로운 구조와 기존 코드가 혼재되어 유지보수 어려움
- **계층 불명확**: Controller가 직접 Dao를 호출하는 경우 존재
- **의존성 관리**: 의존성 주입이 일관되지 않음

#### 데이터 액세스 계층
- **파일 DB 직접 접근**: Repository Pattern 미적용으로 데이터 소스 변경 어려움
- **트랜잭션 부재**: 파일 기반 DB에서 트랜잭션 처리 불가
- **캐싱 전략 부재**: 파일 I/O 최적화 미흡

#### 설정 관리
- **환경 설정 분산**: dev.env, AppConfig, 하드코딩된 값들이 혼재
- **설정 검증 부재**: 필수 환경 변수 누락 시 런타임 에러

#### 테스트 구조
- **테스트 코드 부재**: 단위 테스트, 통합 테스트 미구현
- **목업 시스템 부재**: 외부 의존성 테스트 어려움

## 2. 개선 방안

### 2.1 계층형 아키텍처 표준화

#### 제안 구조
```
src/
├── application/           # Application Layer
│   ├── controllers/       # API 엔드포인트
│   ├── middleware/        # Express 미들웨어
│   ├── websocket/         # WebSocket 핸들러
│   └── dto/              # Data Transfer Objects
│
├── domain/               # Domain Layer
│   ├── entities/         # 도메인 엔티티
│   ├── services/         # 도메인 서비스
│   ├── repositories/     # Repository 인터페이스
│   └── errors/          # 도메인 에러
│
├── infrastructure/       # Infrastructure Layer
│   ├── database/         # DB 구현체
│   │   ├── file/        # 파일 기반 DB
│   │   ├── redis/       # Redis 클라이언트
│   │   └── postgres/    # PostgreSQL (미래)
│   ├── repositories/     # Repository 구현체
│   ├── external/        # 외부 API 클라이언트
│   └── config/          # 설정 관리
│
├── shared/              # Shared/Common
│   ├── utils/           # 공통 유틸리티
│   ├── types/           # 공통 타입 정의
│   └── constants/       # 상수 정의
│
└── core/                # Core Framework Extensions
    ├── decorators/      # 커스텀 데코레이터
    ├── di/             # 의존성 주입 확장
    └── logger/         # 로깅 확장
```

### 2.2 모듈별 리팩토링 계획

#### Phase 1: 기반 구조 정립 (2주)
```typescript
// 1. Repository 인터페이스 정의
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: any): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// 2. 기본 Repository 구현체
abstract class BaseFileRepository<T> implements IRepository<T> {
  protected abstract filePath: string;

  async findById(id: string): Promise<T | null> {
    const data = await this.readFile();
    return data.find(item => item.id === id);
  }

  // ... 공통 파일 I/O 로직
}

// 3. Unit of Work 패턴 도입
class UnitOfWork {
  private repositories: Map<string, IRepository<any>>;
  private changes: Change[];

  async commit(): Promise<void> {
    // 트랜잭션성 보장
  }
}
```

#### Phase 2: 인증 모듈 개선 (1주)
```typescript
// 현재: Handler Pattern (유지하되 구조 개선)
// 개선 방향:
src/
├── domain/
│   └── auth/
│       ├── entities/
│       │   ├── User.ts
│       │   └── Session.ts
│       ├── services/
│       │   ├── AuthenticationService.ts
│       │   └── AuthorizationService.ts
│       └── repositories/
│           └── IUserRepository.ts
└── infrastructure/
    └── auth/
        ├── handlers/  # 기존 핸들러 유지
        └── repositories/
            └── FileUserRepository.ts
```

#### Phase 3: 메뉴 모듈 통합 (1주)
```typescript
// 현재: Legacy와 V2 혼재
// 개선: V2로 완전 통합

// 1. Legacy 코드를 Adapter Pattern으로 래핑
class MenuLegacyAdapter {
  constructor(
    private menuService: MenuBusinessService
  ) {}

  // Legacy API 호환성 유지
  async getMenus(request: LegacyRequest): Promise<LegacyResponse> {
    const modernResponse = await this.menuService.getUserMenus(request.userId);
    return this.convertToLegacyFormat(modernResponse);
  }
}

// 2. 점진적 마이그레이션
@Controller("/menu")
class MenuController {
  @RequestMapping({ route: "/list" }) // Legacy
  async getLegacyMenus() {
    return this.legacyAdapter.getMenus();
  }

  @RequestMapping({ route: "/v2/user-menus" }) // Modern
  async getUserMenus() {
    return this.menuService.getUserMenus();
  }
}
```

#### Phase 4: 데이터베이스 추상화 (2주)
```typescript
// 1. Database Adapter 인터페이스
interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(query: Query): Promise<T[]>;
  transaction(fn: TransactionFn): Promise<void>;
}

// 2. 파일 DB 어댑터
class FileDatabaseAdapter implements IDatabaseAdapter {
  private fileDatabase: FileDatabase;

  async query<T>(query: Query): Promise<T[]> {
    // 파일 기반 쿼리 실행
  }

  async transaction(fn: TransactionFn): Promise<void> {
    // 파일 잠금 기반 트랜잭션 시뮬레이션
  }
}

// 3. 마이그레이션 준비
class DatabaseMigrationService {
  async migrateFromFileToPostgres(): Promise<void> {
    // 점진적 마이그레이션 지원
  }
}
```

### 2.3 설정 관리 중앙화

#### 환경 설정 통합
```typescript
// src/infrastructure/config/Configuration.ts
class Configuration {
  private static instance: Configuration;
  private config: AppConfig;

  private constructor() {
    this.loadEnvironmentVariables();
    this.validateConfiguration();
    this.freezeConfiguration();
  }

  private validateConfiguration(): void {
    const required = ['PORT', 'RAG_SERVER_URL', 'REDIS_HOST'];
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }

  get<T = any>(key: string, defaultValue?: T): T {
    return this.config[key] ?? defaultValue;
  }
}

// 사용 예시
const port = Configuration.getInstance().get('PORT', 3000);
```

### 2.4 에러 처리 표준화

#### 계층별 에러 정의
```typescript
// Domain Layer 에러
class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
  }
}

class ValidationError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
  }
}

// Application Layer 에러 핸들링
class GlobalErrorHandler {
  handle(error: Error): ApiResponse {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      };
    }

    // 예상치 못한 에러
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    };
  }
}
```

### 2.5 테스트 구조 구축

#### 테스트 프레임워크 설정
```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

#### 테스트 구조
```
test/
├── unit/                    # 단위 테스트
│   ├── domain/
│   │   ├── services/
│   │   └── entities/
│   └── application/
│       └── controllers/
├── integration/            # 통합 테스트
│   ├── api/
│   └── database/
└── fixtures/              # 테스트 데이터
    └── mocks/            # 목 객체
```

#### 테스트 예시
```typescript
// test/unit/domain/services/AuthenticationService.test.ts
describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = createMockRepository<User>();
    service = new AuthenticationService(mockUserRepository);
  });

  describe('authenticate', () => {
    it('should authenticate valid credentials', async () => {
      // Given
      const credentials = { username: 'test', password: 'password' };
      mockUserRepository.findByUsername.mockResolvedValue(testUser);

      // When
      const result = await service.authenticate(credentials);

      // Then
      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
    });
  });
});
```

## 3. 구현 로드맵

### 3.1 단계별 구현 계획

#### 1단계: 기초 작업 (Week 1-2)
- [ ] 프로젝트 구조 재구성
- [ ] Repository 인터페이스 및 기본 구현체 작성
- [ ] 설정 관리 시스템 구축
- [ ] 에러 처리 표준화
- [ ] 로깅 시스템 개선

#### 2단계: 핵심 모듈 리팩토링 (Week 3-4)
- [ ] Auth 모듈 구조 개선
- [ ] Menu 모듈 V2 통합
- [ ] Language Model 모듈 Clean Architecture 적용
- [ ] WebSocket 모듈 통합

#### 3단계: 인프라 개선 (Week 5-6)
- [ ] Database Adapter 패턴 구현
- [ ] 캐싱 레이어 도입
- [ ] 트랜잭션 관리 개선
- [ ] 모니터링 시스템 구축

#### 4단계: 테스트 및 문서화 (Week 7-8)
- [ ] 단위 테스트 작성 (Coverage 70% 목표)
- [ ] 통합 테스트 구현
- [ ] API 문서 자동화 (OpenAPI Spec)
- [ ] 개발자 가이드 작성

### 3.2 마이그레이션 전략

#### 점진적 마이그레이션
1. **Strangler Fig Pattern** 적용
   - 새로운 구조를 병행 구축
   - 기능별로 점진적 이전
   - 안정화 후 레거시 제거

2. **Feature Toggle** 활용
   ```typescript
   if (FeatureToggle.isEnabled('USE_NEW_AUTH')) {
     return this.newAuthService.authenticate();
   } else {
     return this.legacyAuthService.authenticate();
   }
   ```

3. **API 버전 관리**
   - `/v1/*` - Legacy API (호환성 유지)
   - `/v2/*` - 새로운 구조 API
   - Deprecation 정책 수립

#### 위험 관리
- **롤백 계획**: 각 단계별 롤백 시나리오 준비
- **모니터링 강화**: 성능 지표 및 에러율 추적
- **단계별 배포**: 개발 → 스테이징 → 프로덕션
- **호환성 테스트**: Frontend와의 통합 테스트 강화

## 4. 기대 효과

### 4.1 개발 생산성
- **코드 재사용성 향상**: Repository Pattern으로 데이터 액세스 로직 통합
- **테스트 용이성**: 계층 분리로 단위 테스트 작성 용이
- **유지보수성 개선**: 일관된 구조로 신규 개발자 온보딩 시간 단축

### 4.2 시스템 품질
- **확장성**: 새로운 데이터 소스 추가 용이 (PostgreSQL, MongoDB 등)
- **안정성**: 에러 처리 표준화로 예외 상황 대응 개선
- **성능**: 캐싱 및 최적화된 데이터 액세스

### 4.3 운영 효율성
- **배포 안정성**: 테스트 커버리지 증가로 배포 위험 감소
- **모니터링**: 구조화된 로깅으로 문제 진단 용이
- **설정 관리**: 중앙화된 설정으로 환경별 관리 간소화

## 5. 주의사항

### 5.1 기존 기능 보존
- **API 호환성**: 모든 기존 API 엔드포인트 유지
- **데이터 무결성**: 마이그레이션 시 데이터 손실 방지
- **점진적 변경**: Big Bang 접근 지양, 단계별 안전한 전환

### 5.2 성능 고려사항
- **파일 I/O 최적화**: 캐싱 전략 필수
- **메모리 관리**: 대용량 데이터 처리 시 스트리밍 활용
- **동시성 처리**: 파일 잠금 및 Race Condition 방지

### 5.3 팀 협업
- **코드 리뷰**: 모든 구조 변경은 리뷰 필수
- **문서화**: 변경사항 즉시 문서 업데이트
- **교육**: 팀원 대상 새로운 구조 교육 세션

## 6. 참고 자료

### 아키텍처 패턴
- Clean Architecture by Robert C. Martin
- Domain-Driven Design by Eric Evans
- Repository Pattern
- Unit of Work Pattern
- Strangler Fig Pattern

### 기술 스택
- TypeScript Best Practices
- Node.js Design Patterns
- Express.js Middleware Pattern
- Jest Testing Framework

### 관련 문서
- `/doc/2025-08-07/orkis-backend-refactoring-plan.md`
- `/doc/2025-08-07/CHAT_REFACTORING_PLAN.md`
- `/doc/api/api명세.md`

---

*작성일: 2025-09-26*
*작성자: Claude*
*버전: 1.0*