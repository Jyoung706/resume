/**
 * QueryExportService character test runner.
 *
 * 목적:
 *   docs/2026-06-01/bulk-download-streaming-plan.md 의 Phase 0 (D23) 의무.
 *   향후 인터페이스 추출·adapter 분리 PR 의 _행위 무변경_ 을 검증할 baseline 캡처.
 *
 * 사용:
 *   yarn character:export             - 시나리오 실행 + baseline diff
 *   yarn character:export --update    - baseline 갱신 (mismatch 시 덮어쓰기)
 *
 * 시나리오 (6개):
 *   S1-empty-csv      : 빈 결과 CSV
 *   S1-empty-json     : 빈 결과 JSON
 *   S2-small-csv      : 10 rows CSV (CSV escape 포함)
 *   S2-small-json     : 10 rows JSON
 *   S3-large-csv      : 1000 rows CSV (sha256 비교)
 *   S3-large-json     : 1000 rows JSON (sha256 비교)
 *   S4-abort          : 스트리밍 시작 후 req close - db.close 호출 + writableEnded 확인
 *   S5-invalid-sql    : 잘못된 SQL - validateForExport 단계에서 reject (headers 미전송)
 *
 * 시나리오 5b (스트리밍 중 SQL 에러) 는 SQLite 에서 안정적으로 trigger 하기 어려워 제외.
 * staging 환경 수동 검증 항목으로 README 에 기록.
 *
 * 종료 코드:
 *   0 : 모든 시나리오 baseline 일치 또는 --update 정상 완료
 *   1 : 1건 이상 mismatch / 실행 에러
 */
// @orkis/core 의 @InjectConnection 등 decorator 가 Reflect.getMetadata 를 사용한다.
// production 진입점(src/main.ts)은 OrkisFactory.start() 가 내부적으로 polyfill 을
// 로드하지만, character script 는 OrkisFactory 를 거치지 않으므로 명시 import 가 필요.
import "reflect-metadata";

import path from "path";
import fs from "fs";
import crypto from "crypto";
import { QueryExportService } from "../../src/main/query/QueryExportService";
import { ensureFixtures, FixturePaths } from "./fixtures";
import {
  MockRequest,
  MockResponse,
  makeMockAdapterFactory
} from "./mocks";

const BASELINE_DIR = path.join(__dirname, "baseline");
const UPDATE_FLAG =
  process.argv.includes("--update") || process.argv.includes("--update-baseline");

interface Snapshot {
  scenario: string;
  outcome: "streamed" | "rejected" | "aborted";
  statusCode: number;
  headers: Record<string, string>;
  body_size: number;
  body_sha256: string;
  /** 작은 body 는 그대로, 큰 body 는 head 만 */
  body_preview: string;
  ended: boolean;
  writableEnded: boolean;
  headersSent: boolean;
  rejectedError: string | null;
}

interface ScenarioResult {
  scenario: string;
  snapshot: Snapshot;
}

const PREVIEW_BYTES = 512;
const LARGE_THRESHOLD_BYTES = 4096;

async function main(): Promise<void> {
  const fixtures = await ensureFixtures();
  if (!fs.existsSync(BASELINE_DIR)) {
    fs.mkdirSync(BASELINE_DIR, { recursive: true });
  }

  const results: ScenarioResult[] = [];
  results.push(await runStream("S1-empty-csv", fixtures.emptyDbPath, "csv"));
  results.push(await runStream("S1-empty-json", fixtures.emptyDbPath, "json"));
  results.push(await runStream("S2-small-csv", fixtures.smallDbPath, "csv"));
  results.push(await runStream("S2-small-json", fixtures.smallDbPath, "json"));
  results.push(await runStream("S3-large-csv", fixtures.largeDbPath, "csv"));
  results.push(await runStream("S3-large-json", fixtures.largeDbPath, "json"));
  results.push(await runAbort("S4-abort", fixtures.largeDbPath));
  results.push(await runInvalidSql("S5-invalid-sql", fixtures.smallDbPath));

  const mismatches: string[] = [];
  for (const r of results) {
    const baselinePath = path.join(BASELINE_DIR, `${r.scenario}.json`);
    const serialized = serialize(r.snapshot);
    if (UPDATE_FLAG) {
      fs.writeFileSync(baselinePath, serialized, "utf8");
      stdout(`[update] ${r.scenario} baseline written`);
      continue;
    }
    if (!fs.existsSync(baselinePath)) {
      stdout(
        `[missing] ${r.scenario} - baseline 없음. --update 옵션으로 최초 생성 필요.`
      );
      mismatches.push(r.scenario);
      continue;
    }
    const baseline = fs.readFileSync(baselinePath, "utf8");
    if (baseline === serialized) {
      stdout(`[ok]      ${r.scenario}`);
    } else {
      stdout(`[diff]    ${r.scenario}`);
      printDiff(baseline, serialized);
      mismatches.push(r.scenario);
    }
  }

  if (mismatches.length > 0 && !UPDATE_FLAG) {
    stdout(`\n실패: ${mismatches.length} 시나리오 baseline 불일치.`);
    stdout(`baseline 을 갱신하려면 --update 옵션을 추가하세요.`);
    process.exit(1);
  }
  stdout(`\n총 ${results.length} 시나리오 검증 완료.`);
}

async function runStream(
  scenario: string,
  dbPath: string,
  format: "csv" | "json"
): Promise<ScenarioResult> {
  const service = buildService(dbPath);
  const req = new MockRequest();
  const res = new MockResponse();
  let rejectedError: string | null = null;
  try {
    await service.exportQuery({
      sqlQuery: "SELECT id, name, score, memo FROM t ORDER BY id",
      connectionId: 1,
      format,
      userId: "character-test",
      req: req as any,
      res: res as any
    });
  } catch (err: any) {
    rejectedError = err?.message ?? String(err);
  }
  return {
    scenario,
    snapshot: buildSnapshot(scenario, "streamed", res, rejectedError)
  };
}

async function runAbort(
  scenario: string,
  dbPath: string
): Promise<ScenarioResult> {
  const service = buildService(dbPath);
  const req = new MockRequest();
  const res = new MockResponse();

  // exportQuery 시작 직후 짧은 지연 후 abort.
  const exportPromise = service.exportQuery({
    sqlQuery: "SELECT id, name, score, memo FROM t ORDER BY id",
    connectionId: 1,
    format: "csv",
    userId: "character-test",
    req: req as any,
    res: res as any
  });

  // 첫 row 가 흐르기 전 close 트리거 - large DB 라 첫 row 출력 직후 시점
  await delay(10);
  req.triggerClose();

  let rejectedError: string | null = null;
  try {
    await exportPromise;
  } catch (err: any) {
    rejectedError = err?.message ?? String(err);
  }
  // 정리 대기 - db.close callback 도달 시간 확보
  await delay(50);

  return {
    scenario,
    snapshot: buildSnapshot(scenario, "aborted", res, rejectedError)
  };
}

async function runInvalidSql(
  scenario: string,
  dbPath: string
): Promise<ScenarioResult> {
  const service = buildService(dbPath);
  const req = new MockRequest();
  const res = new MockResponse();
  let rejectedError: string | null = null;
  try {
    await service.exportQuery({
      sqlQuery: "SELECT NOT VALID SQL ###",
      connectionId: 1,
      format: "csv",
      userId: "character-test",
      req: req as any,
      res: res as any
    });
  } catch (err: any) {
    // QueryExportService.exportQuery 는 prepare 단계 실패 시 reject 한다.
    // controller 가 catch 하여 4xx JSON 응답을 만든다. character test 는 service
    // 직접 호출이므로 reject 가 끝까지 올라온다. 메시지 prefix 만 캡처.
    rejectedError = sanitizeError(err?.message ?? String(err));
  }
  return {
    scenario,
    snapshot: buildSnapshot(scenario, "rejected", res, rejectedError)
  };
}

function buildService(dbPath: string): QueryExportService {
  const service = new QueryExportService();
  // DI bypass - service.adapterFactory 만 mock 으로 교체.
  // mock factory 는 실제 SqliteStreamAdapter 를 반환하므로 streaming 동작은 실측.
  (service as any).adapterFactory = makeMockAdapterFactory(dbPath);
  return service;
}

function buildSnapshot(
  scenario: string,
  outcome: Snapshot["outcome"],
  res: MockResponse,
  rejectedError: string | null
): Snapshot {
  const body = res.getBody();
  const sha256 = crypto.createHash("sha256").update(body).digest("hex");
  const preview =
    body.length > LARGE_THRESHOLD_BYTES
      ? body.subarray(0, PREVIEW_BYTES).toString("utf8")
      : body.toString("utf8");
  return {
    scenario,
    outcome,
    statusCode: res.statusCode,
    headers: { ...res.headers },
    body_size: body.length,
    body_sha256: sha256,
    body_preview: preview,
    ended: res.ended,
    writableEnded: res.writableEnded,
    headersSent: res.headersSent,
    rejectedError
  };
}

function serialize(s: Snapshot): string {
  // 안정적인 key 순서로 직렬화. line-ending 일관성 (LF only).
  // S4-abort 와 같은 outcome="aborted" 시나리오는 sqlite3 의 db.each 가 외부에서
  // 즉시 멈춰지지 않아 close 트리거 후에도 OS/CPU 스케줄링에 따라 캡처 byte 수가
  // 변동한다. body_size/sha256/preview 는 timing 의존이라 baseline 비교에서 제외.
  const isAborted = s.outcome === "aborted";
  const headers = Object.keys(s.headers)
    .sort()
    .reduce<Record<string, string>>((acc, k) => {
      acc[k] = s.headers[k];
      return acc;
    }, {});
  const ordered: Record<string, unknown> = {
    scenario: s.scenario,
    outcome: s.outcome,
    statusCode: s.statusCode,
    headers
  };
  if (isAborted) {
    ordered.body = "ABORT_TIMING_DEPENDENT_NOT_COMPARED";
  } else {
    ordered.body_size = s.body_size;
    ordered.body_sha256 = s.body_sha256;
    ordered.body_preview = s.body_preview;
  }
  ordered.ended = s.ended;
  ordered.writableEnded = s.writableEnded;
  ordered.headersSent = s.headersSent;
  ordered.rejectedError = s.rejectedError;
  return JSON.stringify(ordered, null, 2) + "\n";
}

function printDiff(baseline: string, current: string): void {
  const baseLines = baseline.split("\n");
  const curLines = current.split("\n");
  const max = Math.max(baseLines.length, curLines.length);
  for (let i = 0; i < max; i++) {
    if (baseLines[i] !== curLines[i]) {
      stdout(`  line ${i + 1}:`);
      stdout(`    - baseline: ${truncate(baseLines[i] ?? "<EOF>")}`);
      stdout(`    + current : ${truncate(curLines[i] ?? "<EOF>")}`);
    }
  }
}

function truncate(s: string): string {
  if (s.length <= 200) return s;
  return s.substring(0, 200) + "...(truncated)";
}

/**
 * SQL 에러 메시지에 sqlite 버전 / 경로 등 환경 의존 토큰이 들어갈 수 있음.
 * baseline 안정성을 위해 path 토큰을 마스킹.
 */
function sanitizeError(msg: string): string {
  return msg
    .replace(/[A-Za-z]:\\[^\s"']+/g, "<PATH>")
    .replace(/\/[^\s"']+\.sqlite[^\s"']*/g, "<PATH>");
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stdout(line: string): void {
  // utility script - logger 미사용. process.stdout 직접 출력.
  process.stdout.write(line + "\n");
}

main().catch((err) => {
  process.stderr.write(`[fatal] ${err?.stack ?? err}\n`);
  process.exit(1);
});
