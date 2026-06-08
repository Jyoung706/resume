/**
 * Phase 3 PR#11-3 - MariaDB/MySQL 공통 fixture seed 헬퍼.
 *
 * mariadb driver 가 _MariaDB 와 MySQL 모두_ wire protocol 호환이라 같은 코드로
 * 두 컨테이너 모두 시드 가능. setup-mariadb-fixture / setup-mysql-fixture 가
 * 본 헬퍼를 호출 - 포트/root password 만 다름.
 *
 * 시드 내용:
 *   3 schema (test_empty / test_small / test_large)
 *   각 schema 에 t (id INT, name VARCHAR, score DOUBLE, memo TEXT)
 *   row 패턴 buildMemo 는 character/fixtures.ts 와 동일 (i%10 분기)
 */

export interface SeedFamilyOptions {
  label: string;
  host: string;
  port: number;
  user: string;
  password: string;
  rootPassword: string;
}

interface FixtureDef {
  readonly schema: string;
  readonly rowCount: number;
}

const FIXTURES: readonly FixtureDef[] = [
  { schema: "test_empty", rowCount: 0 },
  { schema: "test_small", rowCount: 10 },
  { schema: "test_large", rowCount: 1000 }
];

export async function seedFamily(opts: SeedFamilyOptions): Promise<void> {
  const mariadb = require("mariadb");

  // 1. root 로 연결 - 3 schema DROP + CREATE + grant
  stdout(`[setup ${opts.label}] root connect ${opts.host}:${opts.port}`);
  const root = await mariadb.createConnection({
    host: opts.host,
    port: opts.port,
    user: "root",
    password: opts.rootPassword,
    connectTimeout: 10000,
    multipleStatements: false
  });
  try {
    for (const f of FIXTURES) {
      await root.query(`DROP SCHEMA IF EXISTS \`${f.schema}\``);
      await root.query(`CREATE SCHEMA \`${f.schema}\``);
      // GRANT 의 schema 이름은 동적이라 escape - parameter 사용 불가 (DDL).
      // schema 이름은 본 헬퍼 내부 hardcode 라 injection 무관.
      await root.query(
        `GRANT ALL ON \`${f.schema}\`.* TO ?@?`,
        [opts.user, "%"]
      );
      stdout(`[ok]   schema created: ${f.schema}`);
    }
    await root.query("FLUSH PRIVILEGES");
  } finally {
    try {
      await root.end();
    } catch {}
  }

  // 2. test user 로 각 schema 에 t table + seed
  for (const f of FIXTURES) {
    const conn = await mariadb.createConnection({
      host: opts.host,
      port: opts.port,
      user: opts.user,
      password: opts.password,
      database: f.schema,
      connectTimeout: 5000,
      multipleStatements: false
    });
    try {
      await conn.query(`
        CREATE TABLE t (
          id INT,
          name VARCHAR(255),
          score DOUBLE,
          memo TEXT
        )
      `);
      if (f.rowCount > 0) {
        await seedRows(conn, f.rowCount);
      }
      stdout(`[ok]   seed ${f.schema}: ${f.rowCount} rows`);
    } finally {
      try {
        await conn.end();
      } catch {}
    }
  }

  stdout(
    `\n${opts.label} fixture seed 완료. yarn check:adaptercontract 로 검증.`
  );
}

async function seedRows(conn: any, rowCount: number): Promise<void> {
  for (let i = 1; i <= rowCount; i++) {
    await conn.query(
      "INSERT INTO t (id, name, score, memo) VALUES (?, ?, ?, ?)",
      [i, `name_${i}`, Number((i * 0.5).toFixed(3)), buildMemo(i)]
    );
  }
}

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
