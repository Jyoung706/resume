/**
 * Phase 1 PR#5a - export 인코딩 인터페이스.
 *
 * 분리 의도:
 *   - CSV / JSON 의 byte 출력 흐름을 단일 인터페이스로 통일
 *   - 향후 XLSX / Parquet 등 추가 형식 도입 시 streaming 경로는 동일 유지
 *
 * 사용 흐름 (QueryExportService 내부):
 *   res.setHeader("Content-Type", encoder.contentType)
 *   res.write(encoder.preamble())
 *   for each row:
 *     res.write(encoder.encodeRow(row, isFirst, columns))
 *   res.write(encoder.finalize({ aborted }))
 *
 * 참조: docs/2026-06-01/bulk-download-streaming-plan.md (9.3)
 */
export interface IRowEncoder {
  /** HTTP Content-Type 헤더 값 */
  readonly contentType: string;
  /** 파일 확장자 (Content-Disposition filename 구성용) */
  readonly fileExtension: string;
  /** 응답 본문 시작. UTF-8 BOM 또는 JSON `[\n` 등 */
  preamble(): string;
  /**
   * 각 row 인코딩.
   *   - CSV: 첫 row 일 때 헤더 라인 + row 라인 (두 줄). 이후 row 라인만.
   *   - JSON: 첫 row 는 JSON.stringify 만. 이후 `,\n` prefix.
   */
  encodeRow(
    row: Record<string, unknown>,
    isFirst: boolean,
    columns: string[]
  ): string;
  /**
   * 정상 종료 또는 abort 시 마지막 청크.
   *   - CSV: 빈 문자열 (행위 무변경 유지. EOF 마커 D10 은 별도 PR)
   *   - JSON: 정상 종료 `\n]\n`, aborted 시 빈 문자열 (partial JSON)
   */
  finalize(opts: { aborted: boolean }): string;
}
