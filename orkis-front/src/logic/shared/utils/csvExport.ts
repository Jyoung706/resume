/**
 * 쿼리 결과·데이터셋을 파일로 export 하는 공용 유틸.
 * chat / pro 양쪽에서 사용한다 (chat utils 가 아닌 shared 위치).
 */
import { showToast } from "@/logic/shared/utils/toast";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("csvExport");

// UTF-8 BOM (Excel 한글 깨짐 방지)
const UTF8_BOM = "﻿";

function timestampSlug(): string {
  return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

/**
 * 사용자 입력 (탭 제목 등) 을 OS·파일시스템 호환 슬러그로 변환.
 * - Windows 금지 문자 (\ / : * ? " < > |) 와 공백을 _ 로 치환
 * - 양끝 공백·마침표 제거 (Windows 는 trailing dot 금지)
 * - 길이 100자 상한
 * - 빈 문자열이면 fallback 반환
 */
function fileNameSlug(
  input: string | undefined | null,
  fallback: string,
): string {
  if (!input) return fallback;
  const slugged = input
    .replace(/[\\/:*?"<>| ]/g, "_")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 100);
  return slugged.length > 0 ? slugged : fallback;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // 일부 브라우저 (Safari, 구버전 Edge) 에서 link.click() 직후 동기 revoke 시
  // 다운로드가 시작되기 전에 URL 이 해제되어 실패할 수 있다. macrotask 로 지연.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 사용자 친화적 다운로드 파일명 생성.
 * - baseName 이 있으면 슬러그화 + timestamp 결합 (예: "users_2026-05-11T08-45-19.csv")
 * - 없으면 기본 fallback (sql_result_<timestamp>.<ext>)
 * - variant === "full" 시 "_full" 접두사 추가 (서버 streaming 전체 export 구분용)
 */
export function buildDownloadFilename(
  baseName: string | undefined | null,
  ext: "csv" | "json",
  variant: "screen" | "full" = "screen",
): string {
  const slug = fileNameSlug(baseName, "sql_result");
  const variantSuffix = variant === "full" ? "_full" : "";
  return `${slug}${variantSuffix}_${timestampSlug()}.${ext}`;
}

/**
 * 데이터를 CSV 파일로 다운로드
 */
export function downloadAsCSV(
  data: Array<Record<string, unknown>>,
  columns: string[],
  filename?: string,
): void {
  try {
    if (!data.length || !columns.length) {
      showToast("다운로드할 데이터가 없습니다", "error");
      return;
    }

    const header = columns.join(",");

    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col];
          if (value === null || value === undefined) return "";
          const str = String(value);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    );

    const csvContent = [header, ...rows].join("\n");

    const blob = new Blob([UTF8_BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const downloadName = filename || buildDownloadFilename(null, "csv");
    triggerDownload(blob, downloadName);

    showToast("CSV 파일이 다운로드되었습니다", "success");
  } catch (error) {
    logger.error("CSV 생성 중 오류:", error);
    showToast("CSV 다운로드 중 오류가 발생했습니다", "error");
  }
}

/**
 * 데이터를 JSON 파일로 다운로드
 * columns 순서를 따라 각 row 를 정렬된 객체로 직렬화한다.
 */
export function downloadAsJSON(
  data: Array<Record<string, unknown>>,
  columns: string[],
  filename?: string,
): void {
  try {
    if (!data.length || !columns.length) {
      showToast("다운로드할 데이터가 없습니다", "error");
      return;
    }

    const ordered = data.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        obj[col] = row[col] ?? null;
      }
      return obj;
    });

    const jsonContent = JSON.stringify(ordered, null, 2);
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });

    const downloadName = filename || buildDownloadFilename(null, "json");
    triggerDownload(blob, downloadName);

    showToast("JSON 파일이 다운로드되었습니다", "success");
  } catch (error) {
    logger.error("JSON 생성 중 오류:", error);
    showToast("JSON 다운로드 중 오류가 발생했습니다", "error");
  }
}
