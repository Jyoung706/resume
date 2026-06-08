import { RequestInit, Response, Headers } from "undici";

type ResponseType =
  | "json"
  | "text"
  | "arrayBuffer"
  | "blob"
  | "bytes"
  | "stream";

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, string | number>;
  responseType?: ResponseType;
}
interface HttpModuleOptions {
  baseURL?: string;
  timeout?: number;
  keepAliveTimeout?: number;
  connections?: number;
  headers?: Record<string, string>;
  socketPath?: string;
}

interface HttpModuleResponse<T = any> {
  data: T;
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
}

type BeforeInterceptor = (
  url: string,
  init: RequestInit
) =>
  | Promise<{ url: string; init: RequestInit }>
  | { url: string; init: RequestInit };

type AfterInterceptor = (
  response: Response,
  request: { url: string; init: RequestInit }
) => Promise<Response> | Response;

interface IHttpModule {
  get<T = any>(
    url: string,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>>;
  post<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>>;
  put<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>>;
  patch<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>>;
  delete<T = any>(
    url: string,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>>;
  beforeIntercept(fn: BeforeInterceptor): this;
  afterIntercept(fn: AfterInterceptor): this;
}

declare global {
  var api: IHttpModule;
}

export {
  ResponseType,
  HttpModuleResponse,
  BeforeInterceptor,
  AfterInterceptor,
  HttpModuleOptions,
  IHttpModule
};
