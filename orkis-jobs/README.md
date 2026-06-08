# ORKIS Jobs

ORKIS 프로젝트의 백그라운드 작업 처리 서비스. Redis 세션 관리·정리, 세션 데이터 아카이브, 사용자 카운트 초기화 등 정기·연속 작업을 수행하며, 동시에 외부 트리거용 HTTP API 도 제공한다. orkis-core 의 DI/스케줄/HTTP 인프라 위에서 동작한다.

---

## 기술 스택

- Node.js 24 / TypeScript 5
- orkis-core (Application/Service/Controller/InjectConnection 등 데코레이터, ApplicationContext)
- Express (orkis-core 의 ExpressApplication 상속)
- node-cron — 주기 작업 스케줄링
- ioredis — Redis 클라이언트 (chatRedis / stageRedis)
- pg — PostgreSQL 풀 (`main` 커넥션)
- yarn 4.9.0 (Corepack)

---

## 아키텍처 개요

```
main.ts
  └── OrkisFactory.start()
        ├── resources/{dev|prod}.env 로드
        ├── 컴포넌트 스캔 (src/)
        │     - @DatabaseConfig: PostgresConfig / ChatRedisConfig / StageRedisConfig
        │     - @Service: 4개 Job, RedisService, JobScheduler
        │     - @Controller: DataArchiveController (... 도메인별 추가 예정)
        │     - @Application: JobsApplication
        ├── DB 커넥션 초기화 (chatRedis / stageRedis / main)
        ├── 빈 인스턴스화 + @Autowired / @InjectConnection 주입
        └── ExpressApplication.startServer (process.env.PORT)
              └── JobsApplication.onAfterStart
                    ├── ApplicationContext.getBean("JobScheduler")
                    ├── scheduler.startAllJobs() — cron 등록 + 지속 작업 시작
                    └── SIGINT/SIGTERM 셧다운 훅 등록
```

핵심 원칙: **수동 `new` 와 `DatabaseManager` 정적 매니저는 모두 제거**, 빈은 컴포넌트 스캔으로 자동 등록되고 의존성은 데코레이터로 주입.

---

## 폴더 구조

도메인별 폴더 구성. 각 도메인 안에 Job / Controller / (필요 시) Service 가 함께 위치.

```
orkis-jobs/
├── src/
│   ├── main.ts                          # 진입점 (OrkisFactory.start())
│   └── main/
│       ├── app.ts                       # @Application JobsApplication (lifecycle hook)
│       ├── database/                    # @DatabaseConfig 빈 (3개)
│       │   ├── PostgresConfig.ts        # databaseName: "main"
│       │   ├── ChatRedisConfig.ts       # databaseName: "chatRedis"
│       │   └── StageRedisConfig.ts      # databaseName: "stageRedis"
│       ├── session/                     # 미완료 세션 강제 종료
│       │   └── ChatSessionCleanupJob.ts
│       ├── redis/                       # 완료 세션 Redis 정리
│       │   └── RedisCleanupJob.ts
│       ├── archiving/                   # 세션 데이터 파일 저장
│       │   ├── DataArchiveJob.ts
│       │   └── DataArchiveController.ts # POST /archive/test
│       ├── question/                    # 사용자 question_count 초기화
│       │   └── QuestionCountJob.ts
│       ├── scheduler/                   # 도메인 횡단
│       │   └── JobScheduler.ts          # cron + 지속 실행 + 수동 트리거
│       └── shared/                      # 공용 유틸
│           ├── services/RedisService.ts
│           └── types/ChatTypes.ts
├── resources/
│   ├── dev.env                          # 로컬 개발 env (.gitignore — 시크릿 보호)
│   ├── prod.env                         # 운영 placeholder (실제 값은 ConfigMap/Secret 으로 주입)
│   └── .env.example                     # 템플릿
├── k8s/
│   ├── deployment.yaml                  # containerPort 8000, envFrom configmap+secret
│   └── svc.yaml                         # ClusterIP, 80 → 8000
├── .vscode/
│   └── launch.json                      # Docker attach 디버거 (.gitignore)
├── tsconfig.base.json                   # 공통 컴파일러 옵션
├── tsconfig.dev.json                    # extends base + sourceMap/incremental + ts-node 옵션
├── tsconfig.prod.json                   # extends base + 산출물 최적화 (sourceMap off 등)
├── tsconfig.json                        # extends tsconfig.dev.json (편의 fallback)
├── Dockerfile                           # prod (multi-stage)
├── Dockerfile.dev                       # dev (volume mount + ts-node)
├── Jenkinsfile                          # k8s deployment + svc apply
└── package.json
```

`db/` (`DatabaseManager` 등 옛 정적 매니저 폴더), `jobs/`, `services/`, `types/` (옛 레이어식 폴더), `index.ts`/`index2.ts` (옛 진입점) 은 **모두 제거됨**.

---

## 도메인별 Job 요약

### session — `ChatSessionCleanupJob`
- 미완료 상태로 방치된 채팅 세션 감지 + 강제 완료 처리
- cron 주기 실행 (`SESSION_CHECK_INTERVAL_SECONDS`, 기본 10초)
- 가장 최근 단계 타임스탬프와 현재 시간 비교 → `SESSION_TIMEOUT_MINUTES` 초과 시 누락 단계를 현재 시간으로 채우고 `{chatId}:proc` 에 종료 메시지 추가
- 최적화: SCAN + Pipeline (`ENABLE_REDIS_OPTIMIZATION=true`)

### redis — `RedisCleanupJob`
- 모든 단계 완료된 세션의 Redis 데이터 영구 삭제
- 5초 간격 지속 실행 (`startContinuousCleanup`)
- chatRedis 의 `{chatId}:*` + stageRedis 의 `{chatId}*` 모두 삭제
- 최적화: SCAN 으로 키 조회 + Pipeline 으로 배치 삭제

### archiving — `ArchiveService` + `DataArchiveController` (+ 보존 중인 `DataArchiveJob`)
- 완료된 세션 데이터를 `${DATA_ARCHIVE_DIR_PATH}/{chatroom_id}/YYYY-MM-DD.json` 형식으로 저장
- **[2026-05-08~] HTTP trigger 방식으로 전환** — Backend `ArchiveDispatcher` 가 `POST /archive/internal` 로 `{ chatId }` 전달 → `ArchiveService.enqueue(chatId)` 큐잉 → 비동기 chatId 단위 archive 작성
- cron 자동 등록은 비활성화 (`JobScheduler.scheduleDataArchive` 주석 처리). `DataArchiveJob` 클래스 본체와 수동 트리거(`runJobManually("data-archive" | "archive-session")`) 는 비상 롤백용으로 보존
- 새 구현은 stageRedis Stream entries(s/id/stat) 로부터 archive 파일 `proc` 필드 재구성
- HTTP 엔드포인트:
  - `POST /archive/test` — 동작 확인용
  - `POST /archive/internal` — Backend dispatch 진입점 (`{ chatId }`, malformed → 400, 큐 초과 → 503, 정상 → 200 즉시 반환)

### question — `QuestionCountJob`
- `user_info.question_count` 컬럼 일괄 초기화
- cron: 매일 자정 KST (`0 0 0 * * *`)
- 환경변수 `USER_QUESTION_COUNT` 로 초기화 값 지정

### scheduler — `JobScheduler`
- 4개 Job 을 `@Autowired` 로 주입받아 cron 등록 / 지속 실행 / 수동 트리거 통합 관리
- 현재 `startAllJobs()` 가 자동 등록하는 것: `ChatSessionCleanupJob` (cron) + `RedisCleanupJob` (지속 실행) + `QuestionCountJob` (cron, 매일 자정 KST)
- `DataArchiveJob` 은 클래스 본체와 `runJobManually` 트리거만 보존하고 cron 자동 등록은 비활성(주석) — 실제 archive 는 `POST /archive/internal` 로 동작
- `JobsApplication.onAfterStart` 에서 `ApplicationContext.getBean("JobScheduler").startAllJobs()` 호출

---

## 처리 단계 (REQUIRED_STEPS)

세션은 9개 단계를 거쳐 완료된다.

| 단계 | 의미 | 담당 |
|---|---|---|
| `0_0 / 0_1 / 0_2` | app_start / app_work / app_end | orkis-backend |
| `1_0 / 1_1 / 1_2` | ai_start / ai_work / ai_end | orkis-ai |
| `2_0 / 2_1 / 2_2` | job_start / job_work / job_end | orkis-jobs (DataArchiveJob) |

미완료 세션 감지 시:
1. 가장 최근 단계의 타임스탬프와 현재 시간 비교
2. `SESSION_TIMEOUT_MINUTES` 초과 시 누락 단계를 현재 시간으로 채움
3. `{chatId}:proc` 에 `| 9002 | Orkis-Backend 종료` 추가

---

## DI 사용 패턴

### DB 커넥션 정의 (`src/main/database/`)

```typescript
@DatabaseConfig({
  databaseName: "main",
  databaseType: DatabaseType.POSTGRESQL,
  pool: true,
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  // ...
})
export class PostgresConfig {}
```

`chatRedis`, `stageRedis` 도 동일 패턴.

### Job / Service 빈 등록 + 커넥션 주입

```typescript
@Service()
export class ChatSessionCleanupJob {
  @InjectConnection("chatRedis", { type: "native" })
  private chatRedis!: Redis;

  @InjectConnection("stageRedis", { type: "native" })
  private stageRedis!: Redis;
  // ...
}

@Service()
export class QuestionCountJob {
  @InjectConnection("main", { type: "native" })
  private postgres!: Pool;
  // ...
}
```

`{ type: "native" }` 는 wrap 클라이언트 대신 ioredis `Redis` / pg `Pool` 인스턴스를 그대로 주입받기 위한 옵션 (pipeline / scan / xrange 등 라이브러리 고유 API 사용).

### Job → Scheduler 의존성

```typescript
@Service()
export class JobScheduler {
  @Autowired("ChatSessionCleanupJob") private chatSessionCleanupJob!: ChatSessionCleanupJob;
  @Autowired("RedisCleanupJob")        private redisCleanupJob!: RedisCleanupJob;
  @Autowired("DataArchiveJob")         private dataArchiveJob!: DataArchiveJob;
  @Autowired("QuestionCountJob")       private questionCronJob!: QuestionCountJob;
  // ...
}
```

### Application 라이프사이클

```typescript
@Application({ requestLogging: true })
export class JobsApplication extends ExpressApplication {
  async onAfterStart() {
    const scheduler = ApplicationContext.getBean("JobScheduler") as JobScheduler;
    scheduler.startAllJobs();
    this.registerShutdownHooks(scheduler);
  }
  // SIGINT/SIGTERM → scheduler.stopAllJobs()
}
```

### Controller

```typescript
@Controller({ path: "archive" })
export class DataArchiveController {
  @Post("/test")
  async test() {
    return { message: "Data archive test successful" };
  }
}
```

---

## 환경변수

`resources/{dev|prod}.env` 에 정의 (orkis-core `loadConfig` 가 CLI 인자 `-e dev|prod` 에 따라 자동 로드).

| 항목 | 기본값 / 예시 | 설명 |
|---|---|---|
| `PORT` | `8000` | HTTP 서버 포트 |
| `NODE_ENV` | `development` / `production` | 외부 라이브러리용 표준 변수 |
| `LOG_LEVEL` | `DEBUG` | 로거 레벨 |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6380` | chatRedis (세션 stat/proc) |
| `REDIS_STAGE_HOST` / `REDIS_STAGE_PORT` | `localhost` / `6381` | stageRedis (Stream) |
| `POSTGRES_HOST` / `POSTGRES_PORT` | `localhost` / `5432` | PostgreSQL 호스트 |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB_NAME` | — | PostgreSQL 인증 |
| `SESSION_CHECK_INTERVAL_SECONDS` | `10` | ChatSessionCleanupJob 주기 |
| `SESSION_TIMEOUT_MINUTES` | `60` | 미완료 세션 타임아웃 |
| `DATA_ARCHIVE_INTERVAL_SECONDS` | `10` | (현재 미사용 — cron 비활성. 보존된 `scheduleDataArchive` 활성화 시에만 적용) |
| `DATA_ARCHIVE_DIR_PATH` | `data-archive` | 아카이브 저장 디렉터리 |
| `RUN_ON_STARTUP` | `true` | 시작 시 ChatSessionCleanupJob 즉시 1회 실행 |
| `RUN_ARCHIVE_ON_STARTUP` | `true` | (현재 미사용 — archiving HTTP trigger 전환으로 시작 시 자동 실행 없음) |
| `USER_QUESTION_COUNT` | `50` | 일별 question_count 초기화 값 |
| `ENABLE_REDIS_OPTIMIZATION` | `true` | SCAN + Pipeline 경로 사용 |
| `ENABLE_PERFORMANCE_METRICS` | `true` | 성능 메트릭 로그 출력 |
| `REDIS_SCAN_BATCH_SIZE` / `REDIS_PIPELINE_BATCH_SIZE` / `REDIS_DELETE_BATCH_SIZE` / `REDIS_CONCURRENT_SESSIONS` | `1000` / `100` / `50` / `5` | 배치 크기 튜닝 |

env 파일은 **존재하면 로드, 없으면 warn 후 진행** (`@orkis/core` 1.0.22+ 의 정책). prod 환경에서는 ConfigMap/Secret 으로 주입된 `process.env` 가 우선이므로 `prod.env` 는 placeholder 만 둬도 무방. dotenv 는 이미 `process.env` 에 있는 키를 덮어쓰지 않음.

`PORT` 는 코드에서 하드코딩하지 않는다 — `OrkisFactory.start()` 인자 없이 호출되어 `process.env.PORT` 로 결정된다.

---

## 실행

### 로컬 개발

```bash
yarn install
yarn dev          # NODE_ENV=development ts-node ... -e dev
yarn dev:debug    # node --inspect=0.0.0.0:9229 -r ts-node/register ...
```

`resources/dev.env` 가 자동 로드된다. DB·Redis 가 로컬에 떠 있어야 함 (또는 docker compose 사용).

### Docker Compose (workspace 통합)

워크스페이스 루트의 `docker/compose.yml` 을 사용하면 PostgreSQL / Redis (chat / session / stage) / orkis-backend / orkis-ai / orkis-jobs 가 함께 뜬다.

```bash
cd <workspace-root>/docker
docker compose up -d --build
docker logs orkis-jobs-dev -f
```

호스트 포트 매핑:
- `8000:8000` — HTTP
- `9230:9229` — Node 디버거 (`yarn dev:debug` 활성화 시)

### 빌드

```bash
yarn build:dev    # 로컬 검증용 (sourceMap on, 주석 유지, incremental 캐시)
yarn build:prod   # 배포용 (sourceMap off, 주석 제거, 캐시 없음) — Dockerfile 에서 호출
```

각각 `tsconfig.dev.json` / `tsconfig.prod.json` 을 명시적으로 사용. 산출물은 모두 `lib/` 아래 (진입점 `lib/main.js`).

### 프로덕션 실행

```bash
yarn start           # NODE_ENV=prod node ./lib/main.js -e prod
```

---

## HTTP API

orkis-core 의 `@Controller` / `@Post` / `@Get` 데코레이터로 라우트 등록. 도메인별 Controller 추가 시 자동으로 라우터에 매핑된다.

| Method | Path | 설명 |
|---|---|---|
| POST | `/archive/test` | DataArchiveController 동작 확인 |
| POST | `/archive/internal` | Backend ArchiveDispatcher 트리거 — `{ chatId }` 입력 시 archive 큐 enqueue (200 즉시 반환, 400 malformed, 503 큐 초과) |

(추후 도메인별 Controller 가 늘어나면 이 표에 추가)

부팅 시 라우트 목록은 시스템 로그에서 확인 가능:
```
[POST] /archive/test -> DataArchiveController.test()
[POST] /archive/internal -> DataArchiveController.internal()
```

---

## 디버깅

VS Code 에서 Docker 컨테이너에 attach:

1. `Dockerfile.dev` 의 `CMD` 를 `["yarn", "dev:debug"]` 로 변경 (또는 별도 디버그용 Dockerfile)
2. `docker compose up -d --force-recreate orkis-jobs`
3. VS Code → Run and Debug → "Attach to Docker (orkis-jobs)" 실행
4. 브레이크포인트 설정 후 트리거 (예: `curl -X POST localhost:8000/archive/test`)

`.vscode/launch.json` 의 `localRoot ↔ remoteRoot: /app` 매핑은 compose 의 `../apps/orkis-jobs/src:/app/src` 마운트와 정합.

---

## Kubernetes 배포

### 매니페스트 (이 repo)

- `k8s/deployment.yaml` — Pod, containerPort 8000, `envFrom` 으로 ConfigMap + Secret 주입, PVC `orkis-jobs-data-archive-pvc` 마운트
- `k8s/svc.yaml` — ClusterIP Service, `port 80 → targetPort 8000`. 클러스터 내부에서 `http://${APP_NAME}/...` 로 호출 가능

### ConfigMap / Secret (외부 repo)

`orkis-node-jobs-config` ConfigMap 과 `orkis-node-jobs-secret` Secret 은 별도 GitOps repo (`k8s-config`) 에서 관리된다. 환경변수 변경은 그 repo 의 `applications/orkis/jobs/orkis-jobs.config.yaml` 에서 수행.

`PORT` 도 ConfigMap 에서 주입 (`PORT: "8000"`). 코드는 `process.env.PORT` 만 참조 — 배포 시점 / 환경별로 자유롭게 변경 가능.

ConfigMap 변경 후 반영:
```bash
kubectl apply -f applications/orkis/jobs/orkis-jobs.config.yaml
kubectl rollout restart deployment ${APP_NAME} -n ${KUBE_NAMESPACE}
```

### Jenkins 파이프라인

`Jenkinsfile` 의 `deployApplication()` 이 `${APP_NAME}` `${KUBE_NAMESPACE}` `${IMAGE_NAME}` `${BUILD_NUMBER}` 를 envsubst 한 뒤 deployment / svc 를 모두 apply.

---

## 로깅

`@orkis/core` Logger 사용. 레벨 구분:

- **info** — 작업 시작/완료, 세션 삭제 결과
- **warn** — 연결 실패, fallback 실행
- **error** — Redis/PG 연결 오류, 작업 실행 실패
- **debug** — 상세 분석, 성능 메트릭 (`ENABLE_PERFORMANCE_METRICS=true` 시)

크래시 발생 시 `logs/crash-YYYY-MM-DD-HH-mm-ss.log` 자동 저장.

---

## 데이터 아카이브 세부

### 저장 경로

```
${DATA_ARCHIVE_DIR_PATH}/
└── {chatroom_id}/
    ├── 2026-05-07.json
    └── ...
```

### 저장 항목

각 세션마다:
- `chatId`, `chatroomId`, `timestamp`
- `stat` — 처리 단계별 타임스탬프
- `proc` — 처리 과정 메시지
- `messages[]` — backend `CHAT_MESSAGES.json` 의 실제 메시지 + stageRedis Stream 의 조각 합성 결과

### 동시성 / 멱등성

- `2_0/2_1/2_2` 단계 업데이트로 진행 상태 마킹 → 동일 세션 중복 처리 방지
- 동일 날짜 파일에 여러 세션이 누적되면 배열로 append

---

## 마이그레이션 히스토리 (2026-05-07)

이날 다음 변경이 한꺼번에 적용되었다:

1. **orkis-core DI 마이그레이션**
   - `DatabaseManager` 정적 매니저 + 수동 `new` 모두 제거
   - `@DatabaseConfig` 데코레이터 클래스로 DB 커넥션 정의
   - `@Service` / `@Autowired` / `@InjectConnection` 으로 빈 자동 등록 + 주입
   - `JobsApplication.onAfterStart` 에서 `ApplicationContext.getBean` 으로 스케줄러 부트스트랩
2. **폴더 구조 — 레이어식 → 도메인별 (이후 단순 명사로 정리)**
   - `jobs/`, `services/`, `types/` 폴더 해체
   - 도메인 폴더 도입: `session/`, `redis/`, `archiving/`, `question/`
   - 공용은 `shared/services`, `shared/types` 로 분리
3. **HTTP 서버 도입 (8000 포트)**
   - `OrkisFactory.start()` 진입점 + `@Application` JobsApplication
   - `DataArchiveController` 추가 — `POST /archive/test`
4. **포트 환경변수화**
   - `OrkisFactory.start(8000)` 인자 제거 → `process.env.PORT` 로 결정
   - ConfigMap (`PORT: "8000"`) 으로 통일 (이전 3002 잔재 제거)
5. **k8s 사설 네트워크 노출**
   - `k8s/svc.yaml` 추가 — ClusterIP `port 80 → targetPort 8000`
   - `Jenkinsfile` 에 svc apply 단계 추가
6. **개발 인프라 정비**
   - `resources/{dev,prod}.env` 도입 (orkis-core `loadConfig` 호환)
   - `dev:debug` 스크립트 + `.vscode/launch.json` (Docker attach) 추가
   - docker compose `depends_on.postgres.condition: service_healthy` 로 race condition 해결
7. **tsconfig 분리**
   - `tsconfig.base.json` / `tsconfig.dev.json` / `tsconfig.prod.json` 3단 구성 (`tsconfig.json` 은 dev fallback)
   - dev: `sourceMap: true`, `incremental: true`. prod: 동일하게 sourceMap on (운영 stack trace `.ts` 라인 매핑 위해 backend 와 일관)
   - 빌드 스크립트 `build:dev` / `build:prod` 로 명시 분리 (이전 `build:prod` 부재로 인한 Jenkins 빌드 실패 해결)
   - `rootDir: "./src"` 로 산출물 위치를 `lib/main.js` 로 고정 (IDE의 ts(5011) 권고 해소)
8. **`@orkis/core` 1.0.22 적용 — env 파일 정책 완화**
   - 기존: prod 모드에서 `resources/prod.env` 부재 시 FATAL throw → k8s ConfigMap-only 환경에서 부팅 실패
   - 변경: dev/prod 무관 파일 있으면 로드 / 없으면 warn 후 진행 (process.env 그대로 사용)
   - `resources/prod.env` placeholder 도 함께 추적 등록 (이전엔 `.gitignore` 의 `resources/` 가 디렉토리 통째 무시)
9. **도메인 폴더명 단순화**
   - `chat-session/` → `session/`, `redis-cleanup/` → `redis/`, `data-archive/` → `archiving/`, `question-count/` → `question/`
   - `.gitignore` 의 `data-archive/` 패턴이 도메인 폴더까지 무시하던 이슈 해소 (산출물 디렉토리는 `/data-archive/` 로 한정)
10. **archiving HTTP trigger 전환 (2026-05-08)**
    - 기존 cron 폴링(`DATA_ARCHIVE_INTERVAL_SECONDS` 10초) → Backend `ArchiveDispatcher` 가 `POST /archive/internal` 로 chatId 단위 dispatch
    - `JobScheduler.scheduleDataArchive()` 호출/메서드 본체 모두 라인 주석 처리(비상 롤백 시 주석 해제만으로 cron 부활 가능)
    - `ArchiveService` 도입 — enqueue 기반 비동기 처리, malformed → 400 / 큐 초과 → 503 / 성공 → 200 즉시 반환
    - archive 파일 `proc` 필드는 stageRedis Stream entries(s/id/stat) 로부터 재구성
