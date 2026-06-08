export interface LogMiddlewareOptions {
  enabled?: boolean;
  excludePaths?: string[];
  slowRequestThreshold?: number;
}
