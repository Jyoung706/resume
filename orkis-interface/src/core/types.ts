/**
 * Core Framework에서 Backend로 제공하는 타입 정의
 */

import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { FileArray } from 'express-fileupload';
import 'express-session';
declare module 'express-session' {
  interface SessionData {
    login_info?: {
      ID: string;
      EMAIL?: string;
      NAME?: string;
      AUTH_CODE?: string;
    };
    [key: string]: any;
  }
}

/**
 * 에러 응답 타입
 */
export interface ERROR_RESPONSE {
  errorCode: string;
  errorMessage: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: any;
}

/**
 * 커스텀 에러 기본 클래스 인터페이스
 */
export interface CustomErrorInterface {
  message: string;
  statusCode: number;
  errorCode: string;
  details?: any;
}

/**
 * Express Request 확장 타입 (Core에서 제공)
 */
export interface Request extends ExpressRequest {
  files?: FileArray | null;
  customData?: Record<string, any>;
  requestId?: string;
  startTime?: number;
}

/**
 * Express Response 확장 타입 (Core에서 제공)
 */
export interface Response extends ExpressResponse {
  // Core에서 추가하는 Response 확장 필드들
}

/**
 * 필터 타입 열거형
 */
export enum FILTER_TYPES {
  NONE = 'NONE',
  CHECK_SESSION = 'CHECK_SESSION',
  CHECK_AUTH = 'CHECK_AUTH',
  CORS = 'CORS',
}

/**
 * 요청 타입 열거형
 */
export enum REQUEST_TYPE {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

/**
 * 모니터링 로거 타입 열거형
 */
export enum MONITOR_LOGGER_TYPES {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  NONE = 'NONE',
}

/**
 * 인터셉터 실행 시점
 */
export enum INTERCEPTOR_EXECUTION {
  BEFORE = 'BEFORE',
  AFTER = 'AFTER',
  ERROR = 'ERROR',
}

/**
 * Core 로거 인터페이스
 */
export interface CoreLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

/**
 * Core 응답 유틸리티 인터페이스
 */
export interface ResponseUtil {
  success<T>(data: T, message?: string): any;
  error(message: string, statusCode?: number, errorCode?: string): any;
  paginated<T>(data: T[], total: number, page: number, limit: number): any;
}
