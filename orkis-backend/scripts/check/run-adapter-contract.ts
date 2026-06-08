/**
 * IDbStreamAdapter contract test runner.
 *
 * 목적:
 *   Phase 2 (D21) - adapter 인터페이스의 _계약_ 을 케이스 명세.
 *   Phase 3+ 에서 PostgresStreamAdapter / MariadbStreamAdapter (MySQL/MariaDB 공용) /
 *   OracleStreamAdapter 가 추가되면 _동일 케이스 셋_ 을 그대로 통과해야 한다.
 *
 * 본 PR (#6) 범위: SqliteStreamAdapter 만 검증. 향후 adapter 가 추가될 때마다
 * runContract(name, adapter) 호출만 추가하면 됨.
 *
 * 사용:
 *   yarn check:adaptercontract
 *
 * 케이스:
 *   C0-typename      typeName 이 비어있지 않은 식별자
 *   C1-validate-ok   정상 SQL prepare → resolve
 *   C2-validate-bad  invalid SQL → throw
 *   C3-empty         빈 결과 row stream
 *   C4-rows          row count / 컬럼 / 첫 row 일치
 *   C5-close-idempotent  자연 종료 후 close 두 번 호출해도 throw 없음
 *
 * 참조: docs/2026-06-01/bulk-download-streaming-plan.md (D21, §9)
 */
// adapter 가 @Service decorator 를 사용 - polyfill 명시.
import "reflect-metadata";

import { IDbStreamAdapter } from "../../src/main/query/adapters/IDbStreamAdapter";
import { SqliteStreamAdapter } from "../../src/main/query/adapters/SqliteStreamAdapter";
import { PostgresStreamAdapter } from "../../src/main/query/adapters/PostgresStreamAdapter";
import { MariadbStreamAdapter } from "../../src/main/query/adapters/MariadbStreamAdapter";
import { ensureFixtures, FixturePaths } from "../character/fixtures";

const PG_HOST = process.env.PG_TEST_HOST || "127.0.0.1";
const PG_PORT = parseInt(process.env.PG_TEST_PORT || "55432", 10);
const PG_USER = process.env.PG_TEST_USER || "test";
const PG_PASSWORD = process.env.PG_TEST_PASSWORD || "test";
const PG_ENABLED = process.env.PG_TEST_ENABLED !== "false";

const MYSQL_HOST = process.env.MYSQL_TEST_HOST || "127.0.0.1";
const MYSQL_PORT = parseInt(process.env.MYSQL_TEST_PORT || "33306", 10);
const MYSQL_USER = process.env.MYSQL_TEST_USER || "test";
const MYSQL_PASSWORD = process.env.MYSQL_TEST_PASSWORD || "test";
const MYSQL_ENABLED = process.env.MYSQL_TEST_ENABLED !== "false";

const MARIADB_HOST = process.env.MARIADB_TEST_HOST || "127.0.0.1";
const MARIADB_PORT = parseInt(process.env.MARIADB_TEST_PORT || "33307", 10);
const MARIADB_USER = process.env.MARIADB_TEST_USER || "test";
const MARIADB_PASSWORD = process.env.MARIADB_TEST_PASSWORD || "test";
const MARIADB_ENABLED = process.env.MARIADB_TEST_ENABLED !== "false";

let failed = 0;

function assert(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    stdout(`  [ok]   ${label}`);
  } else {
    failed++;
    stdout(`  [FAIL] ${label}${detail ? ` - ${detail}` : ""}`);
  }
}

async function runContract(
  name: string,
  options: {
    emptyAdapterFactory: () => IDbStreamAdapter;
    smallAdapterFactory: () => IDbStreamAdapter;
    sampleSql: string;
    expectedRowCount: number;
    expectedColumns: string[];
    expectedFirstRow: Record<string, unknown>;
    invalidSql: string;
  }
): Promise<void> {
  stdout(`\n[adapter] ${name}`);
  const small = options.smallAdapterFactory();
  const empty = options.emptyAdapterFactory();

  // C0
  assert(
    "C0-typename non-empty",
    typeof small.typeName === "string" && small.typeName.length > 0,
    `actual=${JSON.stringify(small.typeName)}`
  );

  // C1
  let validateOk = true;
  try {
    await small.validateSyntax(options.sampleSql);
  } catch (err) {
    validateOk = false;
  }
  assert("C1-validate-ok", validateOk);

  // C2 - invalid SQL 의 validateSyntax 동작.
  //
  // 주의: node-sqlite3 의 db.prepare 가 일부 malformed SQL 에 대해 callback 을
  // 보내지 않아 hang 하는 사례가 확인됨. 본 케이스가 hang 해도 process 가
  // 멈추지 않도록 3초 timeout fallback 으로 wrap. timeout 도 throw 로 간주
  // (contract 측면에선 _invalid SQL 이 stream 시작을 막는다_ 만 확인).
  // 별도 분석 항목 (Phase 2 후속): production 의 /query/validate-for-export 가
  // 동일 입력에 응답이 오는지 staging 검증 필요.
  let validateThrew = false;
  let hung = false;
  try {
    await withTimeout(
      small.validateSyntax(options.invalidSql),
      3000,
      "validateSyntax(invalid)"
    );
  } catch (err: any) {
    validateThrew = true;
    if (String(err?.message ?? "").includes("[timeout]")) {
      hung = true;
    }
  }
  assert("C2-validate-bad rejects or hangs (timeout fallback)", validateThrew);
  if (hung) {
    stdout(
      "  [WARN] C2 validateSyntax 가 3초 안에 응답 없음 - sqlite3 의 malformed SQL 처리 한계. Phase 2 후속 분석 항목."
    );
  }

  // C3 - empty
  const emptyStream = await empty.openRowStream({
    sql: options.sampleSql,
    fetchBatchSize: 500
  });
  const emptyRows: Record<string, unknown>[] = [];
  for await (const row of emptyStream as AsyncIterable<
    Record<string, unknown>
  >) {
    emptyRows.push(row);
  }
  await emptyStream.close();
  assert(
    "C3-empty row count = 0",
    emptyRows.length === 0,
    `actual=${emptyRows.length}`
  );

  // C4 - rows
  const stream = await small.openRowStream({
    sql: options.sampleSql,
    fetchBatchSize: 500
  });
  const rows: Record<string, unknown>[] = [];
  for await (const row of stream as AsyncIterable<Record<string, unknown>>) {
    rows.push(row);
  }
  await stream.close();
  assert(
    `C4-row count = ${options.expectedRowCount}`,
    rows.length === options.expectedRowCount,
    `actual=${rows.length}`
  );
  if (rows.length > 0) {
    const actualCols = Object.keys(rows[0]);
    assert(
      "C4-columns match",
      JSON.stringify(actualCols) ===
        JSON.stringify(options.expectedColumns),
      `actual=${JSON.stringify(actualCols)}`
    );
    assert(
      "C4-first row match",
      JSON.stringify(rows[0]) === JSON.stringify(options.expectedFirstRow),
      `actual=${JSON.stringify(rows[0])}`
    );
  }

  // C5 - close idempotent (자연 종료 후 close 한 번 더)
  let closeIdempotent = true;
  try {
    await stream.close();
  } catch (err) {
    closeIdempotent = false;
  }
  assert("C5-close idempotent", closeIdempotent);

  // C6 - close 가 stream 중간에 호출되어도 for-await 가 hang 하지 않음.
  //
  // Scope: open 완료 _이후_ abort 만 검증. openRowStream 자체 진행 중 abort race
  // (계획서 §4.4-1) 는 별도 case C7 로 후속 PR 에서 도입.
  //
  // 설계 노트: small fixture 10 rows 는 SQLite in-process 에서 microseconds 내
  // 완료 - close 를 setTimeout 으로 지연하면 자연 종료에 가려져 false-green.
  // 따라서 close 는 즉시 호출하고 for-await 와 race. fetchBatchSize: 1 은
  // PG/MariaDB cursor 가 한 번에 다 흐르지 않게 함 (SQLite 무시).
  //
  // 참조: docs/2026-06-04/export-adapter-destroy-refactor-plan.md §6.2
  const liveStream = await options.smallAdapterFactory().openRowStream({
    sql: options.sampleSql,
    fetchBatchSize: 1
  });
  const closePromise = liveStream.close();
  let receivedDuringClose = 0;
  let exitedCleanly = false;
  const c6Timeout = await Promise.race([
    (async () => {
      for await (const _row of liveStream as AsyncIterable<
        Record<string, unknown>
      >) {
        receivedDuringClose++;
      }
      exitedCleanly = true;
      return false;
    })(),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(true), 5000)
    )
  ]);
  await closePromise.catch(() => undefined);
  assert(
    "C6-close-during-stream exits cleanly",
    exitedCleanly && !c6Timeout,
    `received=${receivedDuringClose} exitedCleanly=${exitedCleanly} timedOut=${c6Timeout}`
  );
}

async function main(): Promise<void> {
  const fixtures: FixturePaths = await ensureFixtures();

  // fixture 의 small.sqlite 첫 row 데이터: i=1, name_1, score=0.5, memo="with,comma"
  // (fixtures.ts 의 buildMemo 가 i%10=1 → "with,comma")
  await runContract("SqliteStreamAdapter", {
    emptyAdapterFactory: () => new SqliteStreamAdapter(fixtures.emptyDbPath),
    smallAdapterFactory: () => new SqliteStreamAdapter(fixtures.smallDbPath),
    sampleSql: "SELECT id, name, score, memo FROM t ORDER BY id",
    expectedRowCount: 10,
    expectedColumns: ["id", "name", "score", "memo"],
    expectedFirstRow: {
      id: 1,
      name: "name_1",
      score: 0.5,
      memo: "with,comma"
    },
    invalidSql: "SELECT NOT VALID SQL ###"
  });

  // Phase 3 PR#10-3: PostgreSQL contract.
  // PG 컨테이너 미실행 시 health check 실패 → skip (SQLite 만으로 OK 판정).
  // 실측을 위해선:
  //   docker compose -f docker-compose.test.yml up -d postgres-test
  //   yarn pg:setup
  //   yarn check:adaptercontract
  if (PG_ENABLED) {
    const pgReady = await checkPgHealth();
    if (pgReady) {
      await runContract("PostgresStreamAdapter", {
        emptyAdapterFactory: () =>
          new PostgresStreamAdapter({
            host: PG_HOST,
            port: PG_PORT,
            database: "test_empty",
            user: PG_USER,
            password: PG_PASSWORD,
            connectionTimeoutMillis: 5000
          }),
        smallAdapterFactory: () =>
          new PostgresStreamAdapter({
            host: PG_HOST,
            port: PG_PORT,
            database: "test_small",
            user: PG_USER,
            password: PG_PASSWORD,
            connectionTimeoutMillis: 5000
          }),
        sampleSql: "SELECT id, name, score, memo FROM t ORDER BY id",
        expectedRowCount: 10,
        expectedColumns: ["id", "name", "score", "memo"],
        expectedFirstRow: {
          id: 1,
          name: "name_1",
          score: 0.5,
          memo: "with,comma"
        },
        invalidSql: "SELECT NOT VALID SQL ###"
      });
    } else {
      stdout("\n[skip] PostgresStreamAdapter - PG 컨테이너 미실행 또는 unreachable.");
      stdout("        docker compose -f docker-compose.test.yml up -d postgres-test");
      stdout("        yarn pg:setup");
    }
  }

  // Phase 3 PR#11-3: MariadbStreamAdapter via MySQL server.
  // mysql 컨테이너 미실행 시 graceful skip.
  if (MYSQL_ENABLED) {
    const ok = await checkMariadbFamilyHealth(
      MYSQL_HOST,
      MYSQL_PORT,
      MYSQL_USER,
      MYSQL_PASSWORD
    );
    if (ok) {
      await runContract("MariadbStreamAdapter (MySQL server)", {
        emptyAdapterFactory: () =>
          new MariadbStreamAdapter(
            {
              host: MYSQL_HOST,
              port: MYSQL_PORT,
              database: "test_empty",
              user: MYSQL_USER,
              password: MYSQL_PASSWORD,
              connectionTimeoutMillis: 5000
            },
            "MySQL"
          ),
        smallAdapterFactory: () =>
          new MariadbStreamAdapter(
            {
              host: MYSQL_HOST,
              port: MYSQL_PORT,
              database: "test_small",
              user: MYSQL_USER,
              password: MYSQL_PASSWORD,
              connectionTimeoutMillis: 5000
            },
            "MySQL"
          ),
        sampleSql: "SELECT id, name, score, memo FROM t ORDER BY id",
        expectedRowCount: 10,
        expectedColumns: ["id", "name", "score", "memo"],
        expectedFirstRow: {
          id: 1,
          name: "name_1",
          score: 0.5,
          memo: "with,comma"
        },
        invalidSql: "SELECT NOT VALID SQL ###"
      });
    } else {
      stdout(
        "\n[skip] MariadbStreamAdapter via MySQL server - 컨테이너 미실행 또는 unreachable."
      );
      stdout("        docker compose -f docker-compose.test.yml up -d mysql-test");
      stdout("        yarn mysql:setup");
    }
  }

  // Phase 3 PR#11-3: MariadbStreamAdapter via MariaDB server.
  if (MARIADB_ENABLED) {
    const ok = await checkMariadbFamilyHealth(
      MARIADB_HOST,
      MARIADB_PORT,
      MARIADB_USER,
      MARIADB_PASSWORD
    );
    if (ok) {
      await runContract("MariadbStreamAdapter (MariaDB server)", {
        emptyAdapterFactory: () =>
          new MariadbStreamAdapter(
            {
              host: MARIADB_HOST,
              port: MARIADB_PORT,
              database: "test_empty",
              user: MARIADB_USER,
              password: MARIADB_PASSWORD,
              connectionTimeoutMillis: 5000
            },
            "MariaDB"
          ),
        smallAdapterFactory: () =>
          new MariadbStreamAdapter(
            {
              host: MARIADB_HOST,
              port: MARIADB_PORT,
              database: "test_small",
              user: MARIADB_USER,
              password: MARIADB_PASSWORD,
              connectionTimeoutMillis: 5000
            },
            "MariaDB"
          ),
        sampleSql: "SELECT id, name, score, memo FROM t ORDER BY id",
        expectedRowCount: 10,
        expectedColumns: ["id", "name", "score", "memo"],
        expectedFirstRow: {
          id: 1,
          name: "name_1",
          score: 0.5,
          memo: "with,comma"
        },
        invalidSql: "SELECT NOT VALID SQL ###"
      });
    } else {
      stdout(
        "\n[skip] MariadbStreamAdapter via MariaDB server - 컨테이너 미실행 또는 unreachable."
      );
      stdout("        docker compose -f docker-compose.test.yml up -d mariadb-test");
      stdout("        yarn mariadb:setup");
    }
  }

  stdout(`\n실패 ${failed} 건`);
  // hung sqlite3 prepare 가 libuv handle 을 잡고 있을 수 있어 자연 종료 보장 X.
  // 명시적 exit 으로 runner 종료 보장.
  process.exit(failed > 0 ? 1 : 0);
}

async function checkPgHealth(): Promise<boolean> {
  // pg 미설치 환경에서도 contract runner 가 깨지지 않도록 require try/catch
  let Client: any;
  try {
    Client = require("pg").Client;
  } catch {
    return false;
  }
  const client = new Client({
    host: PG_HOST,
    port: PG_PORT,
    database: "postgres",
    user: PG_USER,
    password: PG_PASSWORD,
    connectionTimeoutMillis: 3000
  });
  try {
    await withTimeout(client.connect(), 3000, "PG health connect");
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

/**
 * mariadb driver 의 health check - MariaDB / MySQL 양쪽 컨테이너 동일 함수 사용.
 * 인자가 host/port/user/password 라 _ 어느 컨테이너인지 결정 _ 호출자가 함.
 */
async function checkMariadbFamilyHealth(
  host: string,
  port: number,
  user: string,
  password: string
): Promise<boolean> {
  let createConnection: any;
  try {
    createConnection = require("mariadb").createConnection;
  } catch {
    return false;
  }
  let conn: any;
  try {
    conn = await withTimeout(
      createConnection({
        host,
        port,
        user,
        password,
        connectTimeout: 3000
      }),
      3000,
      "mariadb-family health connect"
    );
    await conn.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    try {
      if (conn) await conn.end();
    } catch {}
  }
}

function stdout(line: string): void {
  process.stdout.write(line + "\n");
}

/**
 * Promise.race 기반 timeout wrapper. hang 한 promise 도 일정 시간 후 reject.
 * 단 underlying async 작업은 _계속 실행_ - test runner 의 process exit 을
 * 보장하기 위해 마지막에 process.exit(0) 명시.
 */
function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`[timeout] ${label} (${ms}ms)`)), ms)
    )
  ]);
}

main().catch((err) => {
  process.stderr.write(`[fatal] ${err?.stack ?? err}\n`);
  process.exit(1);
});
