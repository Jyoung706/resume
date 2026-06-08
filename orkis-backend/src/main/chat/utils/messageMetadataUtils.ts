/**
 * 메시지 메타데이터 병합 유틸리티
 * Frontend와 일관성 있는 metadata 처리
 */

/**
 * 백엔드 메시지의 metadata와 aiMetadata를 병합
 * @param msg 백엔드 메시지 객체
 * @returns 병합된 메타데이터
 */
export function mergeMessageMetadata(msg: any): any {
  const combinedMetadata: any = {
    ...(msg.metadata || {}),
    ...(msg.aiMetadata || {})
  };

  // ragResponse는 최상위로 유지
  if (msg.ragResponse) {
    combinedMetadata.ragResponse = msg.ragResponse;
  }

  return combinedMetadata;
}

/**
 * processes 정보 추출 (우선순위 기반)
 * @param msg 백엔드 메시지 객체
 * @param metadata 병합된 메타데이터
 * @returns processes 배열 또는 undefined
 */
export function extractProcesses(msg: any, metadata: any): any[] | undefined {
  return (
    metadata?.processes ||
    msg.processes ||
    msg.sqlSteps ||
    msg.metadata?.processes ||
    msg.aiMetadata?.processes ||
    undefined
  );
}

/**
 * finalStatus 추출
 */
export function extractFinalStatus(msg: any, metadata: any): string | undefined {
  return (
    metadata?.finalStatus ||
    msg.finalStatus ||
    msg.metadata?.finalStatus ||
    undefined
  );
}

/**
 * questionType 추출 (processes가 있으면 'sql', 없으면 'general')
 */
export function extractQuestionType(
  msg: any,
  metadata: any,
  processes?: any[]
): "sql" | "general" {
  const explicitType =
    metadata?.questionType ||
    msg.questionType ||
    msg.metadata?.questionType;

  if (explicitType) {
    return explicitType as "sql" | "general";
  }

  // processes가 있으면 sql, 없으면 general
  return processes && processes.length > 0 ? "sql" : "general";
}

/**
 * 메타데이터가 비어있는지 확인
 */
export function hasMetadata(metadata: any): boolean {
  if (!metadata) return false;
  return Object.keys(metadata).length > 0;
}
