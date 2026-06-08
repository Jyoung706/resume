/**
 * Pro 모드 export 영역의 SQL 검증 helper.
 *
 * 본 파일은 export 전용으로 사용된다. 동일 패턴(주석 무시 SELECT 검증)을
 * 기존 QueryExecutionService.executeSQLiteQuery 의 startsWith("select")
 * 결함에도 적용 가능하나, 영향 범위 확장은 별도 PR 로 처리한다.
 *
 * 변경 의도:
 *   - export 엔드포인트가 DELETE/UPDATE 등 비-SELECT 쿼리를 차단
 *   - 첫 줄 주석으로 시작하는 SELECT 쿼리도 SELECT 로 인식
 *   - WITH (CTE) 시작 쿼리도 export 허용
 */

/**
 * 한 줄 주석(--), 블록 주석(\/* *\/) 을 제거한 후 SQL 의 시작이 SELECT 또는
 * WITH 인지 확인. export 가 가능한 read-only 쿼리만 통과시키기 위함.
 *
 * 한계:
 *   - 문자열 리터럴 안의 "--" 같은 토큰은 구분하지 않는다 (단순 패턴 매치).
 *     실제 SQL parser 가 아니므로 false positive 가능성 있으나 export 같은
 *     사용자 의도 검증에는 충분히 보수적인 휴리스틱.
 */
export function isExportableQuery(sql: string): boolean {
  if (!sql || typeof sql !== "string") return false;

  const stripped = sql
    // 한 줄 주석 제거 (개행까지, 또는 입력 끝까지 — code-reviewer M-1 보정).
    // 마지막 라인이 주석 + trailing newline 없는 경우도 포함.
    .replace(/^\s*--[^\n]*(\n|$)/gm, "")
    // 블록 주석 제거 (다중 행 포함)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
    .toLowerCase();

  if (stripped.length === 0) return false;

  if (!stripped.startsWith("select") && !stripped.startsWith("with")) {
    return false;
  }

  // D18-(a) multi-statement injection 방어.
  //
  // PostgreSQL simple query 프로토콜 등 일부 driver 가 multi-statement 를 허용하여
  // `SELECT 1; DROP TABLE x` 같은 SQL 이 export 까지 도달 시 위험. 첫 semicolon
  // 이후에 비공백·비주석 문자가 남아 있으면 거부.
  //
  // 휴리스틱 한계 (spec D18 합의 - 보수적 차단):
  //   - 문자열 리터럴 내부의 `;` 도 false positive 로 차단. 예: SELECT 'a;b'
  //   - 정밀 토큰 파서 (node-sql-parser 등) 도입은 후속 PR 의 보강 항목 (계획
  //     문서 §13.3 참조).
  //
  // depth-in-defense 의 또 다른 layer 인 driver option (Phase 3+ 의
  // pg simple_query: false / mysql2 multipleStatements: false) 는 본 함수의
  // 범위 외. adapter 구현에서 명시한다.
  const semicolonIdx = stripped.indexOf(";");
  if (semicolonIdx !== -1) {
    const after = stripped.substring(semicolonIdx + 1).trim();
    if (after.length > 0) return false;
  }

  return true;
}
