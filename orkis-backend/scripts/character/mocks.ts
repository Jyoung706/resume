/**
 * Character test 용 mock - Express Request / Response 와 adapter factory 의 최소 구현.
 *
 * QueryExportService 가 실제로 사용하는 메서드만 stub. 나머지는 의도적으로 미구현.
 *
 * Phase 1 PR#5b 갱신:
 *   - service 가 더 이상 DbConnectionDao / DbTypeDao 에 직접 의존하지 않으므로
 *     기존 makeMockDbConnectionDao / makeMockDbTypeDao 는 제거.
 *   - service.adapterFactory 만 mock 으로 교체하면 됨. mock factory 는 실제
 *     SqliteStreamAdapter 를 반환하므로 driver streaming 동작은 _실측_.
 */
import { EventEmitter } from "events";
import { IDbStreamAdapter } from "../../src/main/query/adapters/IDbStreamAdapter";
import { SqliteStreamAdapter } from "../../src/main/query/adapters/SqliteStreamAdapter";

/**
 * Express Response 의 streaming 동작을 capture 하는 mock.
 *
 * 캡처 대상:
 *   - statusCode / statusJson (status().json() 경로)
 *   - headers (setHeader)
 *   - body bytes (write 누계)
 *   - ended / writableEnded / headersSent
 *   - timeout (setTimeout)
 */
export class MockResponse extends EventEmitter {
  public statusCode = 200;
  public statusJson: any = null;
  public headers: Record<string, string> = {};
  public bodyChunks: Buffer[] = [];
  public ended = false;
  public writableEnded = false;
  public headersSent = false;
  public timeoutMs = 0;

  setHeader(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  status(code: number): this {
    this.statusCode = code;
    // .status(code).json(payload) 경로에서 headersSent 는 .json() 시점에 true
    return this;
  }

  json(payload: any): this {
    this.statusJson = payload;
    this.bodyChunks.push(Buffer.from(JSON.stringify(payload), "utf8"));
    this.ended = true;
    this.writableEnded = true;
    this.headersSent = true;
    return this;
  }

  write(chunk: string | Buffer): boolean {
    if (this.ended) return false;
    this.headersSent = true;
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
    this.bodyChunks.push(buf);
    return true;
  }

  end(chunk?: string | Buffer): this {
    if (chunk !== undefined) this.write(chunk);
    this.ended = true;
    this.writableEnded = true;
    return this;
  }

  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  /**
   * Node http.ServerResponse.flushHeaders 의 mock. character test 에서는 no-op.
   * service 가 D16-b 보정으로 호출하더라도 body capture 에 영향 없음.
   */
  public flushHeadersCalls = 0;
  flushHeaders(): void {
    this.flushHeadersCalls++;
  }

  getBody(): Buffer {
    return Buffer.concat(this.bodyChunks);
  }
}

/**
 * Express Request 의 mock. QueryExportService 는 req.on("close", ...) 만 사용.
 */
export class MockRequest extends EventEmitter {
  triggerClose(): void {
    this.emit("close");
  }
}

/**
 * adapter factory mock - fixture SQLite 파일을 사용하는 실제 SqliteStreamAdapter 반환.
 * 즉 streaming 동작은 mock 아닌 _실측_. service 의 orchestration 만 mock 대상.
 */
export function makeMockAdapterFactory(filePath: string) {
  return {
    resolve: async (_opts: unknown): Promise<IDbStreamAdapter> =>
      new SqliteStreamAdapter(filePath)
  };
}
