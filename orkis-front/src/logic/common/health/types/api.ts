/**
 * API 응답 타입 (orkis-interface의 StandardResponse를 자체 정의)
 */
export interface StandardResponse<T = unknown> {
  success: boolean;
  data?: T;
  result?: T;
  error?: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  level?: string;
  details?: Record<string, unknown>;
}
