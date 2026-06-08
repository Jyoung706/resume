/**
 * Chat History Service — 채팅 이력 API 통신 계층
 * GET 방식 엔드포인트 (chatService.ts는 POST 전용)
 *
 * 주의: 백엔드 ChatHistoryController는 { success, data } 래핑 응답을 보내지만
 * timestamp 필드가 없어 request.ts의 자동 언래핑(isStandardResponse)이 동작하지 않음.
 * 따라서 서비스에서 수동으로 data 필드를 추출함.
 */
import { apiGet } from "@/logic/shared/services/request";
import type {
  ChatHistoryApiItem,
  ChatHistoryListResponse,
  ChatHistoryFilter,
} from "@/logic/common/chat/types/chat";

/** 백엔드 래핑 응답 타입 (timestamp 없는 { success, data } 형태) */
interface WrappedResponse<T> {
  success: boolean;
  data: T;
}

/** 세션별 채팅 이력 조회 */
async function getChatHistory(
  sessionId: string,
  filter?: ChatHistoryFilter
): Promise<ChatHistoryListResponse> {
  const params = new URLSearchParams();
  if (filter?.page) params.append("page", filter.page.toString());
  if (filter?.limit) params.append("limit", filter.limit.toString());
  if (filter?.startDate) params.append("startDate", filter.startDate);
  if (filter?.endDate) params.append("endDate", filter.endDate);

  const queryString = params.toString();
  const url = `/chat/history/${sessionId}${queryString ? `?${queryString}` : ""}`;

  const response = await apiGet<WrappedResponse<ChatHistoryListResponse> | ChatHistoryListResponse>(url);

  // 자동 언래핑이 안 된 경우 수동 추출
  if ("success" in response && "data" in response) {
    return (response as WrappedResponse<ChatHistoryListResponse>).data;
  }
  return response as ChatHistoryListResponse;
}

/** 특정 메시지 상세 조회 */
async function getHistoryDetail(
  sessionId: string,
  messageId: string,
  dateFolder?: string
): Promise<ChatHistoryApiItem | null> {
  const params = new URLSearchParams();
  if (dateFolder) params.append("dateFolder", dateFolder);

  const queryString = params.toString();
  const url = `/chat/history/${sessionId}/messages/${messageId}${queryString ? `?${queryString}` : ""}`;

  const response = await apiGet<WrappedResponse<ChatHistoryApiItem> | ChatHistoryApiItem>(url);

  if ("success" in response && "data" in response) {
    return (response as WrappedResponse<ChatHistoryApiItem>).data;
  }
  return response as ChatHistoryApiItem;
}

export const chatHistoryService = {
  getChatHistory,
  getHistoryDetail,
};
