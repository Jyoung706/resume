/**
 * CsvEncoder - UTF-8 BOM + RFC 4180 escape.
 *
 * 기존 QueryExportService 의 csvEscape + db.each 내부 출력 로직을 그대로 추출.
 * 행위 동일성 보장 - character baseline (S1/S2/S3 csv) 가 byte 단위 일치해야 한다.
 *
 * BOM 표현:
 *   기존 코드: literal "﻿" (UTF-8 EF BB BF)
 *   본 파일:   "﻿" escape 시퀀스
 *   두 표현의 UTF-8 byte sequence 는 동일.
 */
import { IRowEncoder } from "./IRowEncoder";

export class CsvEncoder implements IRowEncoder {
  readonly contentType = "text/csv; charset=utf-8";
  readonly fileExtension = "csv";

  preamble(): string {
    // Excel 한글 호환을 위한 UTF-8 BOM
    return "﻿";
  }

  encodeRow(
    row: Record<string, unknown>,
    isFirst: boolean,
    columns: string[]
  ): string {
    const dataLine = columns.map((c) => csvEscape(row[c])).join(",") + "\n";
    if (isFirst) {
      const headerLine = columns.map(csvEscape).join(",") + "\n";
      return headerLine + dataLine;
    }
    return dataLine;
  }

  finalize(_opts: { aborted: boolean }): string {
    // 기존 코드와 동일 - 정상 종료 시에도 별도 마무리 청크 없음.
    // EOF 마커 (D10 의 `# EOF_OK`) 는 후속 PR 에서 별도 적용 - 본 PR 은 행위 무변경.
    return "";
  }
}

/**
 * CSV 값 escape - RFC 4180 호환.
 * 쉼표·따옴표·개행 포함 시 큰따옴표 감싸기 + 내부 따옴표 2배.
 * null/undefined 는 빈 문자열.
 */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
