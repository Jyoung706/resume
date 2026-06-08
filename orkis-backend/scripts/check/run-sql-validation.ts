/**
 * sqlValidation.isExportableQuery 의 spec 케이스 검증 runner.
 *
 * 목적:
 *   D18-(a) 의 multi-statement 차단 강화 동작을 case table 로 명세.
 *   신규 변경이 case 를 깨면 exit 1 - 회귀 감지.
 *
 * 사용:
 *   yarn check:sqlvalidation
 *
 * 케이스 그룹:
 *   B*  기본 허용 (SELECT / CTE / 주석 / 공백)
 *   R*  기본 거부 (INSERT / UPDATE / DELETE / DDL / 빈 입력)
 *   C*  주석 처리
 *   M*  multi-statement 차단 (D18-a)
 *   F*  보수적 차단의 false positive (spec 합의)
 *
 * 참조: docs/2026-06-01/bulk-download-streaming-plan.md (D18)
 */
import { isExportableQuery } from "../../src/main/query/sqlValidation";

interface Case {
  id: string;
  sql: string;
  expected: boolean;
  rationale: string;
}

const CASES: Case[] = [
  // 기본 허용
  {
    id: "B1-select",
    sql: "SELECT 1",
    expected: true,
    rationale: "단순 SELECT"
  },
  {
    id: "B2-select-lower",
    sql: "select 1",
    expected: true,
    rationale: "소문자 SELECT"
  },
  {
    id: "B3-cte",
    sql: "WITH x AS (SELECT 1) SELECT * FROM x",
    expected: true,
    rationale: "CTE (WITH 시작)"
  },
  {
    id: "B4-leading-ws",
    sql: "   SELECT 1",
    expected: true,
    rationale: "선두 공백"
  },

  // 기본 거부
  {
    id: "R1-insert",
    sql: "INSERT INTO t VALUES (1)",
    expected: false,
    rationale: "DML"
  },
  {
    id: "R2-update",
    sql: "UPDATE t SET x=1",
    expected: false,
    rationale: "DML"
  },
  {
    id: "R3-delete",
    sql: "DELETE FROM t",
    expected: false,
    rationale: "DML"
  },
  {
    id: "R4-drop",
    sql: "DROP TABLE t",
    expected: false,
    rationale: "DDL"
  },
  {
    id: "R5-empty",
    sql: "",
    expected: false,
    rationale: "빈 문자열"
  },
  {
    id: "R6-whitespace",
    sql: "    ",
    expected: false,
    rationale: "공백만"
  },

  // 주석
  {
    id: "C1-line-comment",
    sql: "-- comment\nSELECT 1",
    expected: true,
    rationale: "선두 라인 주석 제거 후 SELECT"
  },
  {
    id: "C2-block-comment",
    sql: "/* block */ SELECT 1",
    expected: true,
    rationale: "선두 블록 주석 제거 후 SELECT"
  },
  {
    id: "C3-comment-only",
    sql: "-- only comment",
    expected: false,
    rationale: "주석만 - stripped 후 빈"
  },

  // D18-(a) multi-statement 차단
  {
    id: "M1-multi-stmt",
    sql: "SELECT 1; DROP TABLE x",
    expected: false,
    rationale: "multi-statement injection (Critical 차단)"
  },
  {
    id: "M2-multi-select",
    sql: "SELECT 1; SELECT 2",
    expected: false,
    rationale: "multi-SELECT 도 거부"
  },
  {
    id: "M3-trailing-semi",
    sql: "SELECT 1;",
    expected: true,
    rationale: "trailing semicolon 만 - 정당한 SQL"
  },
  {
    id: "M4-trailing-ws",
    sql: "SELECT 1;   ",
    expected: true,
    rationale: "semicolon 후 공백만"
  },
  {
    id: "M5-trailing-cmt",
    sql: "SELECT 1;\n-- end",
    expected: true,
    rationale: "semicolon 후 주석만 - 주석 제거 후 빈"
  },

  // D18-(a) 의 보수적 false positive (spec 합의 - 정밀화는 후속 PR)
  {
    id: "F1-literal-semi",
    sql: "SELECT 'a;b'",
    expected: false,
    rationale: "문자열 리터럴 내부 semicolon - 휴리스틱 한계로 보수적 차단"
  }
];

function main(): void {
  let failed = 0;
  for (const c of CASES) {
    const actual = isExportableQuery(c.sql);
    if (actual === c.expected) {
      stdout(`[ok]   ${c.id}`);
    } else {
      failed++;
      stdout(`[FAIL] ${c.id}`);
      stdout(`         sql       = ${JSON.stringify(c.sql)}`);
      stdout(`         expected  = ${c.expected}`);
      stdout(`         actual    = ${actual}`);
      stdout(`         rationale = ${c.rationale}`);
    }
  }
  stdout(
    `\n총 ${CASES.length} 케이스 - ${CASES.length - failed} pass / ${failed} fail`
  );
  if (failed > 0) process.exit(1);
}

function stdout(line: string): void {
  process.stdout.write(line + "\n");
}

main();
