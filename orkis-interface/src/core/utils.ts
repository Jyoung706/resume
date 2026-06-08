/**
 * Core Framework 유틸리티 인터페이스
 */

import { Request, Response } from './types';

/**
 * 응답 URL 유틸리티 인터페이스
 */
export interface ResponseUrlUtil {
  redirect(url: string, permanent?: boolean): any;
  json(data: any): any;
  html(content: string): any;
  file(path: string, filename?: string): any;
}

/**
 * 상태 관리 유틸리티 인터페이스
 */
export interface StateManager {
  saveState(state: string, provider: string, ttl?: number): Promise<void>;
  checkState(state: string): Promise<boolean>;
  getStateInfo(state: string): Promise<any>;
  removeState(state: string): Promise<void>;
}

/**
 * 토큰 관리 유틸리티 인터페이스
 */
export interface TokenManager {
  saveToken(token: string, userInfo: any, ttl?: number): Promise<void>;
  getTokenInfo(token: string): Promise<any>;
  removeToken(token: string): Promise<void>;
  loginHandler(userInfo: any): Promise<string>;
}

/**
 * 파일 처리 유틸리티 인터페이스
 */
export interface FileUtil {
  upload(files: any[], options?: any): Promise<string[]>;
  download(path: string, filename?: string): Promise<Buffer>;
  delete(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
}

/**
 * 데이터 검증 유틸리티 인터페이스
 */
export interface ValidationUtil {
  validate(data: any, schema: any): { isValid: boolean; errors: string[] };
  sanitize(data: any): any;
  escape(value: string): string;
}

/**
 * 캐시 유틸리티 인터페이스
 */
export interface CacheUtil {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * 암호화 유틸리티 인터페이스
 */
export interface CryptoUtil {
  hash(data: string, salt?: string): Promise<string>;
  compare(data: string, hash: string): Promise<boolean>;
  encrypt(data: string, key?: string): string;
  decrypt(encryptedData: string, key?: string): string;
}

/**
 * 날짜/시간 유틸리티 인터페이스
 */
export interface DateUtil {
  now(): string;
  format(date: Date, format?: string): string;
  parse(dateString: string): Date;
  addDays(date: Date, days: number): Date;
  diffInDays(date1: Date, date2: Date): number;
}