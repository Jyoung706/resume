# Orkis Backend

Node.js + TypeScript 기반의 Orkis 백엔드 애플리케이션입니다.

## 기술 스택

- **Backend Framework**: Node.js + TypeScript + Orkis-Core
- **Authentication**: OAuth (Naver, Kakao, Google) + 패스워드 인증
- **Database**: File-based JSON Storage (개발용)
- **Build Tool**: TypeScript Compiler
- **Package Manager**: Yarn 4.9.0

## 주요 기능

- **OAuth 인증 시스템**: Naver, Kakao, Google 로그인 지원
- **채팅 시스템**: RAG 서버 통합 채팅 기능
- **세션 관리**: UUID 기반 토큰 인증
- **API 서버**: RESTful API 제공

## 시작하기

### 사전 요구사항

- Node.js 20.x 이상
- Yarn 4.9.0 (Corepack 사용)

### 설치

```bash
# Corepack 활성화
corepack enable

# 의존성 설치
yarn install 
```

### 환경 설정

1. 환경 변수 파일 설정:
```bash
cp .env.example resources/dev.env
```

2. `resources/dev.env` 파일에서 OAuth 클라이언트 ID/Secret 설정:
   - Naver Developers Console에서 앱 등록 후 클라이언트 정보 입력
   - Kakao Developers Console에서 앱 등록 후 클라이언트 정보 입력
   - Google Cloud Console에서 OAuth 설정 후 클라이언트 정보 입력

### 개발 서버 실행

```bash
# 개발 서버 시작
yarn start

# 또는
yarn dev

# Docker 환경에서 실행
yarn start:docker
```

서버는 기본적으로 `http://localhost:8080`에서 실행됩니다.

### 빌드 및 배포

```bash
# TypeScript 빌드
yarn build

# 프로덕션 서버 실행 (빌드 + 실행)
yarn prod
```

### Docker 사용

```bash
# Docker 이미지 빌드
yarn docker:build

# Docker Compose로 서비스 시작
yarn docker:run

# Docker 로그 확인
yarn docker:logs

# Docker 서비스 중지
yarn docker:down
```

## API 엔드포인트

### 인증 API (`/auth`)
- `POST /auth/login` - 패스워드 로그인
- `POST /auth/oauthToken` - OAuth 인증 시작
- `POST /auth/loginCheck` - OAuth 콜백 처리
- `POST /auth/logout` - 로그아웃

### 채팅 API (`/chat`)
- `POST /chat/sessions` - 새 채팅 세션 생성
- `POST /chat/sessions/list` - 채팅 세션 목록 조회
- `POST /chat/sessions/messages` - 세션 메시지 조회
- `POST /chat/messages` - 메시지 전송 (RAG 서버 통합)
- `POST /chat/sessions/:sessionId/delete` - 세션 삭제

## 프로젝트 구조

```
src/
├── main/                    # 핵심 애플리케이션 로직
│   ├── auth/               # 인증 시스템
│   │   ├── LoginController.ts
│   │   ├── LoginService.ts
│   │   └── LoginDao.ts
│   ├── chat/               # 채팅 시스템
│   │   ├── ChatController.ts
│   │   ├── ChatService.ts
│   │   └── ChatDao.ts
│   ├── middleware/         # Express 미들웨어
│   ├── service/           # 공유 서비스
│   └── utils/             # 유틸리티 함수
├── db_file/               # JSON 파일 데이터베이스
├── @type/                 # TypeScript 타입 정의
└── start.ts              # 애플리케이션 진입점
```

## 아키텍처

### Orkis-Core 프레임워크
- **의존성 주입**: `@Autowired`, `@Service`, `@Dao`, `@Controller`
- **데코레이터 라우팅**: `@RequestMapping`
- **미들웨어 시스템**: `@ExpressMiddleware`
- **라우트 필터링**: 인증 제어

### OAuth 인증 플로우
1. **시작**: `/auth/oauthToken`으로 상태값 생성 및 리다이렉트 URL 반환
2. **콜백**: OAuth 제공자에서 코드와 함께 콜백
3. **처리**: `/auth/loginCheck`에서 코드 검증 및 세션 생성
4. **세션**: UUID 기반 액세스 토큰으로 세션 관리

### RAG 서버 통합
- 외부 RAG 서버 `http://10.5.4.120:9001`와 연동
- 채팅 메시지를 RAG 서버로 전달하여 AI 응답 생성
- 스트리밍 응답 지원

## 개발 가이드

### 새 기능 추가

1. **컨트롤러 생성**:
```typescript
@Controller('/api/feature')
export class FeatureController {
  @Autowired
  private featureService: FeatureService;
  
  @RequestMapping({ path: '/action', method: ['POST'] })
  async handleAction(req: Request, res: Response) {
    // 구현
  }
}
```

2. **서비스 생성**:
```typescript
@Service
export class FeatureService {
  @Autowired
  private featureDao: FeatureDao;
  
  async processFeature(data: any) {
    // 비즈니스 로직
  }
}
```

3. **DAO 생성**:
```typescript
@Dao
export class FeatureDao {
  private database = new FileDatabase<FeatureType>('FEATURE_DATA.json');
  
  async findFeature(id: string) {
    return this.database.findById(id);
  }
}
```

### 보안 사항
- OAuth 상태값 검증으로 CSRF 공격 방지
- bcrypt를 사용한 패스워드 해싱
- 세션 기반 인증
- 입력값 검증 미들웨어 구현 권장

## 환경 변수

주요 환경 변수들은 `resources/dev.env` 파일에서 설정:

- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` - Naver OAuth 설정
- `KAKAO_CLIENT_ID` - Kakao OAuth 설정  
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth 설정
- `RAG_SERVER_URL` - RAG 서버 URL
- `USE_RAG_SERVER` - RAG 서버 사용 여부

## 배포

### Docker 배포
1. 환경 변수 설정 (`resources/docker.env`)
2. Docker 이미지 빌드: `yarn docker:build`
3. 서비스 실행: `yarn docker:run`

### 프로덕션 고려사항
- Redis를 사용한 세션 스토리지 설정
- PostgreSQL/MySQL로 데이터베이스 마이그레이션
- HTTPS 설정
- 로드 밸런싱
- 모니터링 및 로깅

## 라이선스

이 프로젝트는 비공개 소프트웨어입니다.

## 문서

더 자세한 개발 가이드는 [CLAUDE.md](./CLAUDE.md) 파일을 참고하세요.