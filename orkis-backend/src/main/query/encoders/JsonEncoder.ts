/**
 * JsonEncoder - 표준 JSON Array streaming 출력.
 *
 * 기존 QueryExportService 의 JSON 분기를 그대로 추출. 행위 동일성 보장.
 *   - preamble: `[\n`
 *   - 첫 row: JSON.stringify(row)
 *   - 이후 row: `,\n` + JSON.stringify(row)
 *   - 정상 종료: `\n]\n`
 *   - aborted: 빈 문자열 (`]` 부재로 partial 판정 가능)
 */
import { IRowEncoder } from "./IRowEncoder";

export class JsonEncoder implements IRowEncoder {
  readonly contentType = "application/json; charset=utf-8";
  readonly fileExtension = "json";

  preamble(): string {
    return "[\n";
  }

  encodeRow(
    row: Record<string, unknown>,
    isFirst: boolean,
    _columns: string[]
  ): string {
    if (isFirst) {
      return JSON.stringify(row);
    }
    return ",\n" + JSON.stringify(row);
  }

  finalize(opts: { aborted: boolean }): string {
    if (opts.aborted) return "";
    return "\n]\n";
  }
}
