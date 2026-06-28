# 증거 수집 — submodule 분석 (jeonjunyeong 커밋 기준)

> 5개 탐색 에이전트가 10개 submodule을 `git log --author=jeonjunyeong` 기준으로 분석한 결과.
> **원칙: 본인 커밋이 있는 작업만 성과로 인정. 협업자(seoyujin 등) 작업은 제외/맥락 표기.**

---

## 귀속 요약 (정직성 기준)

| 저장소 | 본인 커밋 | LOC/규모 | 비중 판정 | 비고 |
|--------|:---:|---|---|---|
| **@orkis/core** | **305** | 7,658 LOC / 115파일 | **주도(메인)** | 자체 프레임워크 |
| **orkis-backend** | 1(스냅샷) | 32,906 LOC / 177파일 | **주도(메인)** | GitHub는 스냅샷 1커밋, 원본 327커밋(HANDOFF) |
| **orkis-jobs** | **68** | 3,342 LOC / 22파일 | **단독에 가까움** | |
| **orkis-desktop** | **91** | 순 +8,291 LOC | **단독 소유** | |
| **orkis-desktop-ai** | **54** | 순 +14,131 LOC | **단독에 가까움** | |
| **orkis-front** | **99** | — | 보조(데스크탑·인프라 주도) | 앱 로직은 타 개발자 |
| **orkis-ai** | **25** | — | 보조(순수 배포/운영) | 앱 코드 0, 컨테이너·k8s만 |
| **orkis-interface** | **4** | — | 미미(버그픽스만) | **과장 금지** |
| **orkis-ai-preprocess** | **0** | — | **본인 작업 아님** | 전부 seoyujin. 성과로 주장 X, 연동 맥락만 |
| **k8s-config** | **98 / 123** | — | **주도(~80%)** | seoyujin이 ai-service/preprocess 매니페스트 일부 |

총 경력: E3TS(2023.06~2024.08, 1년2개월) + 범익(2025.02~현재, ~1년4개월) ≈ **약 3년차**.

---

## 1. @orkis/core — 자체 백엔드 프레임워크 (305커밋, 주도)

- 규모: **305커밋 / 7,658 LOC / 115 TS파일 / 30개 데코레이터 / 5종 DB어댑터**. v1.0.30+ GitLab Package Registry 배포(yalc 개발 워크플로).
- **DI 컨테이너**: `@Controller/@Service/@Dao/@Component/@Autowired`, ComponentScan 자동 빈 등록. 순환참조 감지(BeanResolver), 싱글톤/프로토타입 스코프, `@InjectConnection(name,{dynamic})`, `@Value(env)`.
- **@Transactional 전파**: REQUIRED/REQUIRES_NEW/SUPPORTS(Symbol 기반). **Lazy Proxy**로 2+depth Bean만 clone(오버헤드 최소화). transactionResolver.ts 628 LOC.
- **동시성**: pending connection Promise Map으로 동시 connection 획득 직렬화(race 방지), 다중 connection 트랜잭션 부분 실패 추적(commit/rollback).
- **SQLite 동시성**: 비동기 mutex(waiter 큐)로 트랜잭션 직렬화 — "cannot start a transaction within a transaction" 방지. WAL 모드. sqlite3 npm v5 RETURNING 더블실행 버그를 `db.each()` 분기로 우회.
- **멀티 DB 추상화**: BaseAdapter<TConn,TConfig> — PostgreSQL/SQLite/MariaDB/Redis/File. `?` placeholder DB별 정규화, supportsTransaction() 분기.
- **동적 DB(멀티테넌시)**: DynamicConnectionSupport, prepareDynamicDBConnection() — 요청 userId로 런타임 connection 생성. Text-to-SQL 핵심 인프라.
- **HTTP 클라이언트**: undici 2계층(global Agent / Pool), keep-alive, before/after 인터셉터 체인, Unix socket.
- **스케줄러**: node-cron 4.x, `@Job`(cron|interval discriminated union), graceful shutdown(30s drain), pause/resume/trigger 런타임 제어.
- **인터셉터**: 4 point-cut(FILTER/BEFORE/AFTER/EXCEPTION), 우선순위 정렬, PATH 패턴 매칭+EXCLUDE.
- **SSE**: SSEStream(onClose), `@SSEConnection`. 파일 업로드(path traversal 방어), CORS/로깅/글로벌 에러 핸들러, k8s 대응.

## 2. orkis-backend — 백엔드 앱 (32,906 LOC / 177파일, 주도)

> GitHub는 스냅샷 1커밋이라 커밋수 무의미 → LOC·아키텍처 규모로 주도 입증. 원본 327커밋.

- **OAuth 3사**: 네이버·카카오·구글을 `AuthService`(407 LOC) 단일 오케스트레이터로 통합. parseOAuthUserInfo() 제공사별 정규화, bcrypt 패스워드 병행, Bearer.
- **RAG/LLM 챗 SSE 스트리밍**: `FetchStreamService`(EventSource 아닌 ReadableStream 기반), 단일 요청에 송신+스트리밍, `Map<string,ActiveStream>` 취소 관리. RagPreprocessingService(828 LOC) SQL 전처리+AI 실행. 토큰 스트리밍·제목생성·SQL실행·취소 전구간.
- **단일 코드베이스 cloud/desktop**: tsconfig.prod(`@/*→src/main`) vs tsconfig.desktop(`@/*→[src/desktop, src/main]` fallback) + tsc-alias 후처리. desktop은 DAO만 override, Controller/Service 재사용.
- **Redis 3종**: chatRedis(6380, 세션상태)/stageRedis(6381, 스트림청크)/sessionRedis.
- **Chat 클린 아키텍처(900+ LOC 리팩토링)**: Controller/Service/Repository(Factory) 분리. Export 5형식(JSON/TXT/CSV/MD/PDF)+ZIP/GZIP.
- 배포: 멀티스테이지 Dockerfile, k8s 무중단 롤링(maxSurge:1/maxUnavailable:0), PM2 클러스터.

## 3. orkis-jobs — 백그라운드 작업 (68커밋, 단독에 가까움)

- **5개 @Job 클래스**: AiServerHealthJob(30s, X1 재시도-4xx 즉시실패/5xx·timeout 1회재시도), ChatSessionCleanupJob(10s, 60분 타임아웃 강제완료), RedisCleanupJob(5s, 9스텝 완료세션 삭제), QuestionCountJob(일 자정 리셋), PreprocessProgressJob.
- **회복탄력 Redis**: ioredis backoff+jitter(최대 10회), 6종 이벤트 리스너, ping 헬스체크.
- **Redis 최적화**: SCAN(논블로킹, batch 1000, setImmediate로 5000키마다 yield) + Pipeline(batch 50) + 실패 시 순차 폴백. 세션당 에러 격리.
- **DI 마이그레이션**: 수동 JobScheduler/정적 DatabaseManager **1000줄+ 제거** → `@Job/@Autowired/@InjectConnection` 선언적 전환, 도메인 폴더 재편.
- 세션 데이터 NAS 아카이빙(`{chatroom_id}/YYYY-MM-DD.json`), cron→HTTP push 트리거 전환.

## 4. orkis-desktop — Electron 데스크탑 런처 (91커밋, 단독 소유)

- 규모: 순 +8,291 LOC. Electron 39 + electron-vite, backend/AI를 로컬 Podman 컨테이너로 구동.
- **PodmanEventsMonitor**(109줄): `podman events` 스트림 파싱→service:ready/unhealthy/down IPC push, 2s backoff 재연결, 상태 dedup. 소켓 헬스폴링 대체.
- **OrkisApplication**: 라이프사이클 프레임워크, ipcHandle<A,R>() 제네릭, safeOn() 에러격리, 통합 shutdown.
- **크로스플랫폼 네트워킹**: mac bridge / Windows-NAT(vEthernet WSL IP) / Windows-mirrored(.wslconfig 정규식 감지→`--network host`)를 ContainerNetConfig 단일 함수로.
- **통신 마이그레이션**: TCP 소켓 인프라(8파일) 제거→Podman HEALTHCHECK 이벤트, crypto secret 제거. `podman build --format docker`로 OCI HEALTHCHECK 메타데이터 보존.
- 세션쿠키: 수동 http.request 파싱(196줄)→Chromium net.fetch 자동 처리. Finder ENOENT(PATH miss) 절대경로 대응. dmg/pkg·nsis·AppImage 패키징, system tray, 플랫폼별 타이틀바.

## 5. orkis-desktop-ai — 데스크탑 Python AI 백엔드 (54커밋, 단독에 가까움)

- 규모: 순 +14,131 LOC. FastAPI 0.115/uvicorn 0.34, langgraph 0.4, faiss-cpu, duckdb, pydantic 2.11.
- **3계층**: controller(FastAPI+Pydantic DTO, request-scoped SSEStreamTransport+ContextVar) / service(프로토콜 독립, LangGraph 실행) / repository.
- **EventTransport ABC**: emit(event,data) 추상화. UDS/Named Pipe/TCP fallback chain→통합 HTTP/SSE. SSEStreamTransport(asyncio.Queue). TCP 소켓 전송 전면 제거, uvicorn+FastAPI 단일 수신.
- **asyncio 최적화**: FAISS 검색 `asyncio.to_thread()` 오프로드(이벤트루프 stall 방지), schema/data 전처리 병렬(`asyncio.gather`), ChatTaskManager(취소가능 태스크).
- FastAPI lifespan warmup, Dockerfile HEALTHCHECK, PORT 동적, uvicorn CLI를 PID1로(시그널 처리).

## 6. orkis-front — 웹 프론트 (99커밋, 보조: 데스크탑·인프라 주도)

- **Electron 데스크탑 전환**: `src/desktop/` 격리(12 TS파일), onAppReady() 부트, useElectronAuth(OAuth), serviceHealthStore(zustand persist), DesktopTitleBar.
- **CI/CD·인프라**: Jenkinsfile(Docker빌드→k8s배포 멀티컨테이너 pod), 멀티스테이지 Dockerfile(node24-alpine→nginx-alpine, Yarn4.9), k8s 롤링(maxSurge:1) + liveness/readiness, **nginx SSE 프록시**(proxy_buffering off, kube-dns resolver, upstream keepalive32, 대량 export 1800s timeout/gzip off).
- cloud/desktop 번들 격리(@app Vite alias swap).

## 7. orkis-ai — 클라우드 RAG 서버 (25커밋, 보조: 순수 배포)

- **앱코드 0, 컨테이너·k8s만**: deployment(롤링 maxSurge:0/maxUnavailable:1, 2~3.5CPU/4~7Gi, 4 PVC + /dev/shm 2Gi RAM디스크, imagePullPolicy:Always), Jenkinsfile, jenkins-agent-pod, prod.Dockerfile, 네임스페이스 마이그레이션(tts-app→orkis).

## 8. orkis-interface — 공유 타입 계약 패키지 (4커밋, 미미)

- v2.0.0 TS 타입 계약(backend↔front↔ai). **본인 기여는 core/request·types 정렬 버그픽스 + Yarn 버전 패치뿐**(~2-3%). 아키텍처/신규 API 아님. **이력서에서 과장 금지** — 언급한다면 "계약 기반 협업" 맥락 정도.

## 9. orkis-ai-preprocess — (본인 작업 아님)

- **93커밋 전부 seoyujin**. Ray 분산 ETL(FastAPI+Ray Actor+DuckDB+FAISS+DataSketch). **본인 성과로 주장 금지.** k8s 배포 매니페스트 연동 맥락으로만 언급 가능.

## 10. k8s-config — 연구소 쿠버네티스 플랫폼 (98/123커밋 ~80% 주도, GitOps/IaC)

- **클러스터**: KT Cloud ManagedKS, 3네임스페이스(orkis/cicd/ktc-nfs-provisioner), **노드풀 5종 분리**(ingress/jenkins/gitlab/orkis-database/orkis-ai) nodeSelector. metrics-server.
- **네트워킹**: ingress-nginx v4.15.1 **DaemonSet+hostNetwork**(전용노드 80/443, KT L4 LB 패스스루), proxy-body-size 2g. 6개 ingress 룰.
- **TLS**: cert-manager v1.20.2 + Let's Encrypt(prod/staging ClusterIssuer, HTTP-01) — orkis.kr/git.orkis.kr/registry/jenkins 자동발급·갱신.
- **SSE 인그레스**: `/api/sse→/sse` rewrite, 쿠키 Sticky(ORKIS_SSE_AFFINITY 86400s), **proxy-buffering off**, read/send 1800s.
- **스토리지**: NFS subdir provisioner(NAS 172.25.1.129), **StorageClass 4종**(nfs-retain-prod/nfs-delete-dev/nfs-static/local-postgres), 13 PV·15 PVC(~1,184Gi).
- **CI/CD 자체 호스팅**: GitLab EE 18.0.6 on k8s(git.orkis.kr, 6Gi~12Gi), Jenkins 2.541 LTS+JDK21(Kubernetes Plugin **동적 agent pod 생성→소멸**, JVM 3g). **크로스 네임스페이스 RBAC**(jenkins-agent@cicd→jenkins-deployer@orkis).
- **백업/DR 3종**: ① PG pg_dumpall 주간(토 18:00UTC, 14일보존) ② GitLab 전체 분기1회(STRATEGY=copy, ~12Gi, 90일압축/365일삭제) ③ **GitLab 미러 일간**(API페이지네이션 git fetch, **토큰을 디스크 origin에 미저장**-oauth2 URL only, 일요일 tar.gz 30일, 임의 git호스트 `push --mirror` 복원).
- **데이터**: PostgreSQL 17-alpine(fsGroup 999, 로컬PV), Redis 7-alpine **3종**(chat/stage/session) DB전용노드 배치.
- CVE 대응 업그레이드 이력(GitLab 2025-09, Jenkins 2026-04).

---

## E3TS (이전 직장, 2023.06~2024.08 / 1년2개월) — 기존 이력서 근거

- 사내 Git 도입 주도: GitLab CE·Jenkins 온프레미스 단독 구축, 도메인 SSL, Git flow 교육.
- 그룹웨어 메일: Postfix/Dovecot/Roundcube + Emailengine 릴레이, SPF/DKIM/DMARC, WAF(ModSecurity), Express API.
- 그룹웨어 채팅(풀스택 단독): Express·Socket.io·Redis, PM2 클러스터+redis-adapter 부하분산, 이중 반복문→Map 단일화. Vue·Electron 클라이언트.
- 발렛파킹 주차관제: Layered 백엔드, WebSocket 실시간.
- 신입에도 매주 고객사 미팅 참석(요구사항·공수 조율).
