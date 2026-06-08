import { Request, Response } from './types';

/**
 * Express 인터셉터 인터페이스
 */
export interface ExpressInterceptor {
  name: string;
  order?: number;
  before?(req: Request, res: Response, next: any): void | Promise<void>;
  after?(req: Request, res: Response, result: any, next: any): void | Promise<void>;
  error?(error: any, req: Request, res: Response, next: any): void | Promise<void>;
}

/**
 * Express 미들웨어 인터페이스
 */
export interface ExpressMiddleware {
  name: string;
  order?: number;
  handler(req: Request, res: Response, next: any): void | Promise<void>;
}

/**
 * 에러 처리 미들웨어 옵션
 */
export interface ErrorHandlerOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
  customErrorHandler?: (error: any, req: Request, res: Response) => any;
}

/**
 * CORS 미들웨어 옵션
 */
export interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string | string[];
  allowedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * 세션 미들웨어 옵션
 */
export interface SessionOptions {
  secret: string;
  resave?: boolean;
  saveUninitialized?: boolean;
  cookie?: {
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
  };
}

/**
 * 파일 업로드 미들웨어 옵션
 */
export interface UploadOptions {
  destination?: string;
  filename?: (req: Request, file: any) => string;
  limits?: {
    fileSize?: number;
    files?: number;
  };
  fileFilter?: (req: Request, file: any) => boolean;
}

/**
 * 로깅 미들웨어 옵션
 */
export interface LoggingOptions {
  format?: string;
  includeBody?: boolean;
  includeHeaders?: boolean;
  excludePaths?: string[];
}