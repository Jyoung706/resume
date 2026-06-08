# ORKIS Jobs - Claude Instructions

## 프로젝트 개요

- **프로젝트명**: ORKIS Jobs
- **기술 스택**: Node.js, TypeScript, Redis, node-cron
- **프레임워크**: Orkis Core Framework (부분 사용)
- **목적**: 백그라운드 작업 처리 (Redis 세션 관리, 데이터 정리)

## 아키텍처

### 주요 컴포넌트

#### Job Classes

- **ChatSessionCleanupJob**: 미완료 세션 강제 종료
  - 1시간 초과 미완료 세션 감지
  - 강제 완료 처리 및 종료 메시지 추가
  - 10초마다 스케줄 실행

- **RedisCleanupJob**: 완료된 세션 삭제
  - 모든 단계 완료된 세션 감지
  - Main Redis 및 Message Redis 데이터 삭제
  - 지속적 실행 (5초 간격)

#### Scheduler

- **JobScheduler**: 작업 스케줄링 관리
  - cron 기반 스케줄링
  - 백그라운드 지속 실행 관리
  - 수동 작업 실행 지원

#### Configuration

- **RedisConfig**: Redis 연결 설정
  - Main Redis (채팅 세션 데이터): 포트 6380
  - Message Redis (메시지 스트리밍): 포트 6381

## 환경 설정

### 환경변수 (.env)

```env
# Main Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6380

# Message Redis Configuration
REDIS_STAGE_HOST=localhost
REDIS_STAGE_PORT=6381

# Job Configuration
SESSION_CHECK_INTERVAL_SECONDS=10
SESSION_TIMEOUT_MINUTES=60
RUN_ON_STARTUP=true

# Application Configuration
NODE_ENV=development
PORT=3002
```

### 실행 방법

```bash
# 개발 환경
yarn install
yarn build
yarn start

# 또는 ts-node로 직접 실행
yarn dev
```

## Redis 데이터 구조

### 처리 단계 (REQUIRED_STEPS)

```
0_0: app_start   - Backend 애플리케이션 시작
0_1: app_work    - Backend 애플리케이션 작업
0_2: app_end     - Backend 애플리케이션 종료
1_0: ai_start    - AI 서버 시작
1_1: ai_work     - AI 서버 작업
1_2: ai_end      - AI 서버 종료
2_0: job_start   - Job 처리 시작 (orkis-jobs에서 처리 예정)
2_1: job_work    - Job 처리 작업 (orkis-jobs에서 처리 예정)
2_2: job_end     - Job 처리 종료 (orkis-jobs에서 처리 예정)
```

### Redis 키 패턴

```
{chatId}:stat    - 처리 단계별 타임스탬프
{chatId}:proc    - 처리 과정 메시지
{chatId}:*       - 기타 채팅 관련 데이터
```

## 주요 기능

### 1. 미완료 세션 정리 (ChatSessionCleanupJob)

- **목적**: 1시간 이상 미완료 상태인 세션 강제 종료
- **실행 주기**: 10초마다 (설정 가능)
- **처리 방식**:
  1. 모든 `{chatId}:stat` 키 검사
  2. 가장 최근 타임스탬프와 현재 시간 비교
  3. 60분 초과 시 누락 단계를 현재 시간으로 채움
  4. `{chatId}:proc`에 종료 메시지 추가

### 2. 완료된 세션 삭제 (RedisCleanupJob)

- **목적**: 모든 단계 완료된 세션의 Redis 데이터 삭제
- **실행 방식**: 지속적 실행 (5초 간격)
- **처리 방식**:
  1. 모든 `{chatId}:stat` 키 검사
  2. 9개 필수 단계 모두 완료 확인
  3. Main Redis 및 Message Redis에서 관련 키 삭제
  4. 삭제 결과 로그 출력

### 3. 수동 작업 실행

```typescript
// 사용 예시
jobScheduler.runJobManually("chat-cleanup"); // 미완료 세션 정리
jobScheduler.runJobManually("redis-cleanup", "chatId"); // 특정 세션 삭제
jobScheduler.runJobManually("force-delete", "chatId"); // 강제 세션 삭제
```

## @orkis/core DI 시스템 사용 가이드

### 현재 사용 방식 (수동 등록)

```typescript
// index.ts
const chatSessionCleanupJob = new ChatSessionCleanupJob();
const redisCleanupJob = new RedisCleanupJob();
const jobScheduler = new JobScheduler();

// 수동 의존성 주입
(jobScheduler as any).chatSessionCleanupJob = chatSessionCleanupJob;
(jobScheduler as any).redisCleanupJob = redisCleanupJob;
```

### DI 시스템 문제점

- **Application 클래스 방식**: Component Scan 인식 실패, Symbol 비교 오류 등
- **자세한 분석**: `doc/2025-08-14/orkis-jobs/@orkis/core-di-application-method-issues.md` 참조

## 개발 가이드라인

### 코드 스타일

- **STRICTLY NO EMOJIS**: 코드, 주석, 문서에 이모지 사용 금지
- **한글 주석**: 모든 주석은 한글로 작성
- **로깅**: console.log 대신 상황별 적절한 로그 레벨 사용

### 에러 처리

- **Redis 연결 오류**: 자동 재시도 및 로그 출력
- **Job 실행 오류**: 오류 로그 후 다음 실행 계속 진행
- **세션 처리 오류**: 개별 세션 오류가 전체 작업에 영향 없도록 격리

### 성능 고려사항

- **배치 처리**: 대량 키 처리 시 메모리 사용량 모니터링
- **Redis 부하**: 동시 키 조회/삭제 수 제한
- **로그 레벨**: 운영 환경에서는 상세 로그 최소화

## 향후 개발 계획

### 단기 계획

1. **Job 단계 처리 구현** (2_0, 2_1, 2_2)
   - Record DB 프로세스 신규 생성
   - 데이터 파일 저장 및 DB 저장 기능
2. **모니터링 기능 추가**
   - 처리 통계 수집
   - 성능 메트릭 모니터링

### 장기 계획

1. **@orkis/core DI 시스템 안정화 후 마이그레이션**
2. **분산 Job 처리 시스템 확장**
3. **실시간 모니터링 대시보드 구축**

## 문서 작성 규칙

### 기술 문서 위치

- **서버별 기술 문서**: `doc/YYYY-MM-DD/orkis-jobs/filename.md`
- **공통 기술 문서**: `doc/YYYY-MM-DD/filename.md`
- **API 문서**: `doc/api/filename.md`

### 파일명 규칙

- kebab-case 사용 (예: `redis-cleanup-implementation.md`)
- 한글 파일명 허용 (예: `작업-스케줄링-분석.md`)
- 서버명 명시 시 접두사 사용 (예: `orkis-jobs-performance-analysis.md`)

## 주의사항

### Redis 사용 시

- **읽기 전용 원칙**: 다른 서비스가 생성한 데이터는 읽기만 수행
- **안전한 삭제**: 완료 확인 후에만 삭제 수행
- **연결 안정성**: Redis 연결 실패 시 재시도 로직

### 메모리 관리

- **대량 키 처리**: 배치 크기 제한으로 메모리 사용량 관리
- **가비지 컬렉션**: 장시간 실행 시 메모리 누수 방지

### 로그 관리

- **로그 레벨**: 운영 환경과 개발 환경 구분
- **로그 로테이션**: 대용량 로그 파일 관리
- **민감정보**: Redis 키나 데이터에서 민감정보 노출 방지

이 문서는 ORKIS Jobs 서비스 개발 시 참조해야 할 모든 가이드라인을 포함합니다.
