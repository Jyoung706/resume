/**
 * Phase 3 PR#10-3 - PostgreSQL fixture seed.
 *
 * docker compose 의 postgres-test 컨테이너에 연결하여 3개 DB (test_empty /
 * test_small / test_large) 생성 + SQLite fixture 와 동일 스키마/row 시드.
 *
 * 매 실행 idempotent - DROP + CREATE.
 *
 * 사용:
 *   docker compose -f docker-compose.test.yml up -d postgres-test
 *   yarn pg:setup
 *   yarn check:adaptercontract
 *
 * 환경변수 (default 값):
 *   PG_TEST_HOST=127.0.0.1
 *   PG_TEST_PORT=55432
 *   PG_TEST_USER=test
 *   PG_TEST_PASSWORD=test
 *
 * 참조: scripts/character/fixtures.ts 의 buildMemo 와 동일 패턴 유지 -
 *   contract runner 의 expectedFirstRow 가 양쪽에 동일하게 적용되어야 함.
 */
import "reflect-metadata";

const HOST = process.env.PG_TEST_HOST || "127.0.0.1";
const PORT = parseInt(process.env.PG_TEST_PORT || "55432", 10);
const USER = process.env.PG_TEST_USER || "test";
const PASSWORD = process.env.PG_TEST_PASSWORD || "test";

interface FixtureDef {
  readonly database: string;
  readonly rowCount: number;
}

const FIXTURES: readonly FixtureDef[] = [
  { database: "test_empty", rowCount: 0 },
  { database: "test_small", rowCount: 10 },
  { database: "test_large", rowCount: 1000 }
];

async function main(): Promise<void> {
  const { Client } = require("pg");

  // 1. admin (default postgres DB) 에 연결하여 3 DB DROP + CREATE
  stdout(`[setup] admin connect ${HOST}:${PORT}`);
  const admin = new Client({
    host: HOST,
    port: PORT,
    database: "postgres",
    user: USER,
    password: PASSWORD,
    connectionTimeoutMillis: 5000
  });
  await admin.connect();
  try {
    for (const f of FIXTURES) {
      // active connection 강제 종료 - DROP DATABASE 의 "in use" 에러 회피
      try {
        await admin.query(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()`,
          [f.database]
        );
      } catch {
        // 권한 없으면 무시 - 다음 DROP 에서 fail 하면 안내
      }
      try {
        await admin.query(`DROP DATABASE IF EXISTS ${f.database}`);
      } catch (dropErr: any) {
        stdout(
          `[warn] DROP DATABASE ${f.database} 실패 (계속 진행): ${dropErr?.message ?? dropErr}`
        );
      }
      await admin.query(`CREATE DATABASE ${f.database}`);
      stdout(`[ok]   DB created: ${f.database}`);
    }
  } finally {
    try {
      await admin.end();
    } catch {}
  }

  // 2. 각 DB 에 연결하여 schema + seed
  for (const f of FIXTURES) {
    const client = new Client({
      host: HOST,
      port: PORT,
      database: f.database,
      user: USER,
      password: PASSWORD,
      connectionTimeoutMillis: 5000
    });
    await client.connect();
    try {
      await client.query(`
        CREATE TABLE t (
          id INTEGER,
          name TEXT,
          score DOUBLE PRECISION,
          memo TEXT
        )
      `);
      if (f.rowCount > 0) {
        await seedRows(client, f.rowCount);
      }
      stdout(`[ok]   seed ${f.database}: ${f.rowCount} rows`);
    } finally {
      try {
        await client.end();
      } catch {}
    }
  }

  stdout(
    "\nPG fixture seed 완료. yarn check:adaptercontract 로 PG 케이스 검증."
  );
}

async function seedRows(client: any, rowCount: number): Promise<void> {
  // 단순 loop INSERT - setup 은 한 번만 실행이라 throughput 무관.
  // 1000 rows 가 commit overhead 로 ~5s 수준이면 OK.
  for (let i = 1; i <= rowCount; i++) {
    await client.query(
      "INSERT INTO t (id, name, score, memo) VALUES ($1, $2, $3, $4)",
      [i, `name_${i}`, Number((i * 0.5).toFixed(3)), buildMemo(i)]
    );
  }
}

/**
 * scripts/character/fixtures.ts 의 buildMemo 와 동일 패턴 유지.
 * contract runner 의 expectedFirstRow 가 양쪽에 동일하게 적용.
 */
function buildMemo(i: number): string {
  const mod = i % 10;
  if (mod === 0) return "plain";
  if (mod === 1) return "with,comma";
  if (mod === 2) return 'with "quote"';
  if (mod === 3) return "multi\nline";
  if (mod === 4) return "";
  if (mod === 5) return "tab\there";
  return `memo_${i}`;
}

function stdout(line: string): void {
  process.stdout.write(line + "\n");
}

main().catch((err) => {
  process.stderr.write(`[fatal] ${err?.stack ?? err}\n`);
  process.exit(1);
});
