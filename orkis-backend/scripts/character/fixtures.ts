/**
 * Character test fixture - SQLite 동적 생성.
 *
 * 매 실행마다 deterministic 한 row 를 생성하여 baseline 비교가 안정적이도록 한다.
 * fixture 파일 자체는 .gitignore 대상 (run-time 생성).
 *
 * 생성되는 DB:
 *   - empty.sqlite : 컬럼만 있고 row 0 건
 *   - small.sqlite : 10 rows (deterministic)
 *   - large.sqlite : 1000 rows (deterministic)
 *
 * 모든 DB 의 스키마는 동일:
 *   CREATE TABLE t (
 *     id    INTEGER,
 *     name  TEXT,
 *     score REAL,
 *     memo  TEXT
 *   )
 */
import path from "path";
import fs from "fs";

const sqlite3 = require("sqlite3").verbose();

export interface FixturePaths {
  emptyDbPath: string;
  smallDbPath: string;
  largeDbPath: string;
}

const FIXTURE_DIR = path.join(__dirname, "fixtures");

export async function ensureFixtures(): Promise<FixturePaths> {
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  }

  const emptyDbPath = path.join(FIXTURE_DIR, "empty.sqlite");
  const smallDbPath = path.join(FIXTURE_DIR, "small.sqlite");
  const largeDbPath = path.join(FIXTURE_DIR, "large.sqlite");

  if (!fs.existsSync(emptyDbPath)) {
    await createDb(emptyDbPath, 0);
  }
  if (!fs.existsSync(smallDbPath)) {
    await createDb(smallDbPath, 10);
  }
  if (!fs.existsSync(largeDbPath)) {
    await createDb(largeDbPath, 1000);
  }

  return { emptyDbPath, smallDbPath, largeDbPath };
}

function createDb(filePath: string, rowCount: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const db = new sqlite3.Database(filePath, (openErr: any) => {
      if (openErr) {
        reject(openErr);
        return;
      }
      db.serialize(() => {
        db.run(
          "CREATE TABLE t (id INTEGER, name TEXT, score REAL, memo TEXT)",
          (createErr: any) => {
            if (createErr) {
              db.close(() => reject(createErr));
              return;
            }
            if (rowCount === 0) {
              db.close((closeErr: any) =>
                closeErr ? reject(closeErr) : resolve()
              );
              return;
            }
            const stmt = db.prepare(
              "INSERT INTO t (id, name, score, memo) VALUES (?, ?, ?, ?)"
            );
            for (let i = 1; i <= rowCount; i++) {
              // deterministic 한 값 - 시드 무관, 매 실행 동일 byte 생성
              stmt.run(
                i,
                `name_${i}`,
                Number((i * 0.5).toFixed(3)),
                buildMemo(i)
              );
            }
            stmt.finalize((finErr: any) => {
              if (finErr) {
                db.close(() => reject(finErr));
                return;
              }
              db.close((closeErr: any) =>
                closeErr ? reject(closeErr) : resolve()
              );
            });
          }
        );
      });
    });
  });
}

/**
 * CSV escape 검증을 위해 일부 row 의 memo 에 쉼표·따옴표·개행을 포함.
 * 결정적 패턴: i % 10 별로 다른 memo.
 */
function buildMemo(i: number): string {
  const mod = i % 10;
  if (mod === 0) return "plain";
  if (mod === 1) return "with,comma";
  if (mod === 2) return 'with "quote"';
  if (mod === 3) return "multi\nline";
  if (mod === 4) return ""; // empty string
  if (mod === 5) return "tab\there";
  return `memo_${i}`;
}
