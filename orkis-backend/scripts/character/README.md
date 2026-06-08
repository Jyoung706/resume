# QueryExportService Character Test

Phase 0 (계획 문서 D23 의무) 의 산출물. 향후 인터페이스 추출 / adapter 분리 PR 에서 `QueryExportService` 의 행위가 변하지 않았는지 baseline 비교로 검증한다.

참조: [docs/2026-06-01/bulk-download-streaming-plan.md](../../../../docs/2026-06-01/bulk-download-streaming-plan.md)

## 구조

```
scripts/character/
  README.md
  fixtures.ts                  SQLite fixture 동적 생성 (run-time, .gitignore)
  mocks.ts                     Express Request/Response + DAO 의 최소 mock
  run-export-character.ts      runner. 시나리오 8건 실행 + baseline diff
  baseline/                    baseline JSON 파일 (commit 대상)
  fixtures/                    run-time 생성 SQLite (commit 대상 아님)
```

## 실행

```bash
# 최초 1회 - baseline 생성
yarn character:export --update

# 이후 - baseline 과 비교 (mismatch 시 exit 1)
yarn character:export
```

ts-node 가 사용된다. backend 의 dev 의존성에 이미 포함.

## 시나리오

| ID | 입력 | 검증 |
|----|------|------|
| S1-empty-csv  | 0 rows | 헤더 + UTF-8 BOM, body 종료 |
| S1-empty-json | 0 rows | `[\n` 으로 시작, 정상 종료 `]\n` |
| S2-small-csv  | 10 rows (CSV escape 케이스 포함) | 쉼표·따옴표·개행 escape 동작 |
| S2-small-json | 10 rows | JSON.stringify 결과 일치 |
| S3-large-csv  | 1000 rows | sha256 + 첫 512B preview 일치 |
| S3-large-json | 1000 rows | sha256 + 첫 512B preview 일치 |
| S4-abort      | 스트리밍 시작 직후 `req.close` | abort 정리 상태 (`ended`, `writableEnded`, `headersSent`). body 는 timing 의존이라 비교 제외 |
| S5-invalid-sql | 잘못된 SQL | 실측: BOM 까지 쓴 후 정상 resolve. spec 가정과 다른 동작이 baseline 으로 캡처됨 |

## 시나리오 5b (스트리밍 중 SQL 에러) 미포함 사유

SQLite 의 `db.each` 콜백 진행 중에 안정적으로 SQL 에러를 트리거하는 결정적 패턴이 없다 (런타임 division-by-zero 가 NULL 로 처리되는 등). 본 시나리오는 _staging 환경 수동 검증_ 항목으로 남긴다.

수동 검증 절차:
1. 거대한 SELECT 가 실행 도중 DB 파일이 부분 손상되도록 mock
2. 응답이 `res.headersSent === true` 인 시점에 에러가 발생하는지 확인
3. connection close 이후 클라이언트 측 파일이 partial 상태인지 (CSV 의 경우 `# EOF_OK` 마커 부재) 확인

## 한계 / 주의

- DI 컨테이너를 부트하지 않고 `new QueryExportService()` 후 `adapterFactory` 필드를 mock 으로 _직접 주입_ 한다. backend 의 `@Service`/`@Autowired` 패턴은 character test 범위에서 우회 — production 동작에는 영향 없음.
- mock adapter factory 는 _실제_ `SqliteStreamAdapter` 를 반환하므로 driver streaming 자체는 실측. service 의 orchestration (헤더 / preamble / abort / finalize) 만 mock 환경.
- `MockResponse` 는 Express Response 의 전체 API 가 아닌 `QueryExportService` 가 _실제로 호출하는 메서드_ 만 구현. service 가 새 메서드를 호출하기 시작하면 mock 도 갱신해야 한다.
- `sanitizeError` 가 SQLite 에러 메시지에서 경로 토큰을 마스킹한다. SQLite 버전 변경 시 메시지 자체가 달라질 수 있다 — baseline 갱신으로 대응.
- fixture SQLite 는 매 실행 시 _존재 여부만_ 확인하고 재생성하지 않는다. 스키마 변경 시 `scripts/character/fixtures/` 디렉터리를 _수동 삭제_ 후 재실행.

## baseline 갱신 정책

- baseline mismatch 발생 시 (의도된 동작 변경) `--update` 로 갱신 → 커밋. 변경 사유를 커밋 메시지 6요소 (Why/Intent/What/Before-After/검증/참조문서) 로 명시.
- 갱신 PR 의 diff 는 _리뷰어가 행위 변경의 정당성을 확인할 수 있어야_ 한다. 단순 일괄 `--update` 는 회피.
