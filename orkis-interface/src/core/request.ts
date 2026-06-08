import { Request as ExpressRequest } from 'express';
import { FileArray } from 'express-fileupload';

/**
 * Core에서 Backend로 제공하는 확장된 Request 타입
 */
export interface CoreRequest extends ExpressRequest {
  // 파일 업로드 정보
  files?: FileArray | null;

  // 커스텀 속성들
  customData?: Record<string, any>;

  // 요청 메타데이터
  requestId?: string;
  startTime?: number;
}

/**
 * Core에서 Backend로 제공하는 Response 유틸리티 타입
 */
export interface CoreResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}
