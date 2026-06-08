import { Dispatcher, fetch, RequestInit, Response } from "undici";
import {
  AfterInterceptor,
  BeforeInterceptor,
  RequestOptions,
  ResponseType,
  HttpModuleResponse
} from "./types";

export abstract class BaseHttpModule {
  protected abstract dispatcher: Dispatcher;
  protected abstract baseURL: string;

  protected timeout: number;
  protected defaultHeaders: Record<string, string>;
  protected beforeInterceptors: BeforeInterceptor[] = [];
  protected afterInterceptors: AfterInterceptor[] = [];

  constructor(timeout: number = 30_000, headers: Record<string, string> = {}) {
    this.timeout = timeout;
    this.defaultHeaders = headers;
  }

  public beforeIntercept(fn: BeforeInterceptor): this {
    this.beforeInterceptors.push(fn);
    return this;
  }

  public afterIntercept(fn: AfterInterceptor): this {
    this.afterInterceptors.push(fn);
    return this;
  }

  protected buildUrl(
    path: string,
    params?: Record<string, string | number>
  ): string {
    const base = this.baseURL ? `${this.baseURL}${path}` : path;
    if (!params || Object.keys(params).length === 0) return base;

    const url = new URL(base, this.baseURL || "http://dummy");
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return this.baseURL
      ? `${this.baseURL}${url.pathname}${url.search}`
      : `${url.pathname}${url.search}`;
  }

  protected async parseResponse<T>(
    response: Response,
    responseType?: ResponseType
  ): Promise<T> {
    if (responseType) {
      switch (responseType) {
        case "json":
          return (await response.json()) as T;
        case "text":
          return (await response.text()) as T;
        case "arrayBuffer":
          return (await response.arrayBuffer()) as T;
        case "blob":
          return (await response.blob()) as T;
        case "bytes":
          return new Uint8Array(await response.arrayBuffer()) as T;
        case "stream":
          return response.body as T;
      }
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const text = await response.text();
      if (!text) return undefined as T;
      return JSON.parse(text) as T;
    }

    if (contentType.includes("text/")) {
      return (await response.text()) as T;
    }

    if (
      contentType.includes("image/") ||
      contentType.includes("audio/") ||
      contentType.includes("video/") ||
      contentType.includes("application/octet-stream") ||
      contentType.includes("application/pdf")
    ) {
      return (await response.arrayBuffer()) as T;
    }

    const text = await response.text();
    if (!text) return undefined as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  protected async execute<T>(
    method: string,
    path: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<HttpModuleResponse<T>> {
    let url = this.buildUrl(path, options.params);

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers
    };

    let serializedBody: any = undefined;

    if (body !== undefined && body !== null) {
      const isRawBody =
        typeof body === "string" ||
        body instanceof URLSearchParams ||
        body instanceof ArrayBuffer ||
        body instanceof Uint8Array ||
        (typeof Buffer !== "undefined" && Buffer.isBuffer(body));

      if (!headers["Content-Type"]) {
        if (body instanceof URLSearchParams) {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        } else if (isRawBody) {
          headers["Content-Type"] = "text/plain";
        } else {
          headers["Content-Type"] = "application/json";
        }
      }

      serializedBody = isRawBody ? body : JSON.stringify(body);
    }

    let init: RequestInit = {
      method,
      headers,
      body: serializedBody
    };

    for (const interceptor of this.beforeInterceptors) {
      const result = await interceptor(url, init);
      url = result.url;
      init = result.init;
    }

    let response = await fetch(url, {
      ...init,
      dispatcher: this.dispatcher,
      signal: AbortSignal.timeout(options.timeout ?? this.timeout)
    } as any);

    // stream 응답은 body를 한 번만 읽을 수 있으므로 afterInterceptor 스킵
    if (options.responseType !== "stream") {
      for (const interceptor of this.afterInterceptors) {
        response = await interceptor(response, { url, init });
      }
    }

    const data = await this.parseResponse<T>(response, options.responseType);

    return {
      data,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      url
    };
  }

  public async get<T = any>(
    url: string,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>> {
    return this.execute<T>("GET", url, undefined, options);
  }

  public async post<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>> {
    return this.execute<T>("POST", url, body, options);
  }

  public async put<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>> {
    return this.execute<T>("PUT", url, body, options);
  }

  public async patch<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>> {
    return this.execute<T>("PATCH", url, body, options);
  }

  public async delete<T = any>(
    url: string,
    options?: RequestOptions
  ): Promise<HttpModuleResponse<T>> {
    return this.execute<T>("DELETE", url, undefined, options);
  }
}
