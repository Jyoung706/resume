/**
 * UUID v7 기반 Chat ID 유틸리티
 * - 16자리 hex 포맷 (48비트 타임스탬프 + 16비트 랜덤)
 * - 시간순 정렬 보장
 * - RFC 9562 표준 기반
 * - AI 서버의 chat_id와 동일한 값으로 사용됨
 * - orkis-front 프로덕션과 동일한 ID 체계
 */

/**
 * UUID v7 기반 Chat ID 생성
 * 포맷: 16자리 hex (48비트 타임스탬프 + 16비트 랜덤)
 * 예시: "018d5f3a7b2c4e8f"
 */
export function generateChatId(): string {
  const timestamp = Date.now(); // 48비트 Unix 타임스탬프 (ms)
  const random = crypto.getRandomValues(new Uint16Array(1))[0]; // 16비트 랜덤

  // 48비트 타임스탬프 (12자리 hex) + 16비트 랜덤 (4자리 hex) = 16자리
  const timestampHex = timestamp.toString(16).padStart(12, "0");
  const randomHex = random.toString(16).padStart(4, "0");

  return `${timestampHex}${randomHex}`;
}

/**
 * AI 응답 Chat ID 생성
 * 사용자 Chat ID + "a" suffix (17자리)
 */
export function generateAiChatId(userChatId: string): string {
  return `${userChatId}a`;
}

/**
 * Chat ID에서 타임스탬프 추출 (디버깅용)
 * @param chatId - 16자리 hex Chat ID
 * @returns Date 객체
 */
export function parseChatIdTimestamp(chatId: string): Date {
  // AI 응답 ID의 경우 suffix 제거
  const baseId = chatId.endsWith("a") ? chatId.slice(0, -1) : chatId;
  const timestampHex = baseId.substring(0, 12);
  const timestamp = parseInt(timestampHex, 16);
  return new Date(timestamp);
}

/**
 * Chat ID 유효성 검사
 * @param chatId - 검사할 Chat ID
 * @returns 유효한 ID인지 여부
 */
export function isValidChatId(chatId: string): boolean {
  // 16자리 또는 17자리 (AI 응답 suffix 'a' 포함)
  return /^[0-9a-f]{16}a?$/.test(chatId);
}
