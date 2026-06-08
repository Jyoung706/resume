import { EventEmitter } from "events";
import { logger } from "../../utils";

/**
 * 성능 메트릭 데이터
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * 메모리 사용량 정보
 */
export interface MemoryInfo {
  rss: number; // Resident Set Size
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

/**
 * CPU 사용량 정보
 */
export interface CpuInfo {
  user: number;
  system: number;
  idle: number;
  total: number;
  usage: number; // 사용률 (%)
}

/**
 * 응답 시간 통계
 */
export interface ResponseTimeStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * 성능 모니터 클래스
 *
 * 애플리케이션의 성능 지표를 실시간으로 수집하고 분석합니다.
 */
export class PerformanceMonitor extends EventEmitter {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private responseTimesBuffer: number[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private gcMetrics: any = {};

  constructor(
    private config: {
      bufferSize?: number;
      monitoringInterval?: number;
      enableGCMetrics?: boolean;
    } = {}
  ) {
    super();

    this.config = {
      bufferSize: 1000,
      monitoringInterval: 5000,
      enableGCMetrics: true,
      ...config
    };
  }

  /**
   * 모니터링 시작
   */
  start(): void {
    if (this.isMonitoring) {
      logger.info("성능 모니터링이 이미 실행 중입니다");
      return;
    }

    this.isMonitoring = true;

    // 시스템 메트릭 수집 시작
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.monitoringInterval);

    // GC 메트릭 수집 설정
    if (this.config.enableGCMetrics) {
      this.setupGCMetrics();
    }

    logger.info("성능 모니터링 시작됨");
  }

  /**
   * 모니터링 중지
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    logger.info("성능 모니터링 중지됨");
  }

  /**
   * 커스텀 메트릭 기록
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsArray = this.metrics.get(name)!;
    metricsArray.push(metric);

    // 버퍼 크기 제한
    if (metricsArray.length > this.config.bufferSize!) {
      metricsArray.shift();
    }

    this.emit("metric", metric);
  }

  /**
   * 응답 시간 기록
   */
  recordResponseTime(duration: number, route?: string): void {
    this.responseTimesBuffer.push(duration);

    // 버퍼 크기 제한
    if (this.responseTimesBuffer.length > this.config.bufferSize!) {
      this.responseTimesBuffer.shift();
    }

    this.recordMetric(
      "response_time",
      duration,
      "ms",
      route ? { route } : undefined
    );
  }

  /**
   * 현재 메모리 사용량 조회
   */
  getMemoryInfo(): MemoryInfo {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    };
  }

  /**
   * CPU 사용량 조회
   */
  async getCpuInfo(): Promise<CpuInfo> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const elapsedTime = Date.now() - startTime;

        const user = currentUsage.user / 1000; // 마이크로초를 밀리초로
        const system = currentUsage.system / 1000;
        const total = user + system;
        const usage = (total / elapsedTime) * 100;

        resolve({
          user,
          system,
          idle: elapsedTime - total,
          total,
          usage: Math.round(usage * 100) / 100
        });
      }, 100);
    });
  }

  /**
   * 응답 시간 통계 조회
   */
  getResponseTimeStats(): ResponseTimeStats {
    if (this.responseTimesBuffer.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0
      };
    }

    const sorted = [...this.responseTimesBuffer].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: Math.round(sorted.reduce((sum, val) => sum + val, 0) / count),
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99)
    };
  }

  /**
   * 특정 메트릭 조회
   */
  getMetric(name: string, limit?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    return limit ? metrics.slice(-limit) : [...metrics];
  }

  /**
   * 모든 메트릭 이름 조회
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * 메트릭 요약 조회
   */
  getMetricSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [name, metrics] of this.metrics) {
      if (metrics.length === 0) continue;

      const values = metrics.map((m) => m.value);
      const latest = metrics[metrics.length - 1];

      summary[name] = {
        current: latest.value,
        unit: latest.unit,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg:
          Math.round(
            (values.reduce((sum, val) => sum + val, 0) / values.length) * 100
          ) / 100,
        lastUpdated: latest.timestamp
      };
    }

    return summary;
  }

  /**
   * 시스템 메트릭 수집
   */
  private collectSystemMetrics(): void {
    // 메모리 메트릭
    const memoryInfo = this.getMemoryInfo();
    this.recordMetric("memory_rss", memoryInfo.rss, "MB");
    this.recordMetric("memory_heap_used", memoryInfo.heapUsed, "MB");
    this.recordMetric("memory_heap_total", memoryInfo.heapTotal, "MB");
    this.recordMetric("memory_external", memoryInfo.external, "MB");

    // 이벤트 루프 지연 측정
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // 나노초를 밀리초로
      this.recordMetric("event_loop_lag", delay, "ms");
    });

    // 핸들 개수
    const handles = (process as any)._getActiveHandles().length;
    const requests = (process as any)._getActiveRequests().length;
    this.recordMetric("active_handles", handles, "count");
    this.recordMetric("active_requests", requests, "count");

    // CPU 사용량 (비동기)
    this.getCpuInfo().then((cpuInfo) => {
      this.recordMetric("cpu_usage", cpuInfo.usage, "%");
    });
  }

  /**
   * GC 메트릭 설정
   */
  private setupGCMetrics(): void {
    if (typeof (global as any).gc === "function") {
      const originalGc = (global as any).gc;

      (global as any).gc = (...args: any[]) => {
        const start = process.hrtime.bigint();
        const result = originalGc.apply(global, args);
        const duration = Number(process.hrtime.bigint() - start) / 1000000; // ms

        this.recordMetric("gc_duration", duration, "ms");
        this.gcMetrics.totalDuration =
          (this.gcMetrics.totalDuration || 0) + duration;
        this.gcMetrics.count = (this.gcMetrics.count || 0) + 1;

        return result;
      };
    }

    // GC 이벤트 리스너 설정 (Node.js v12+)
    try {
      const v8 = require("v8");
      if (v8.getHeapStatistics) {
        setInterval(() => {
          const heapStats = v8.getHeapStatistics();
          this.recordMetric(
            "heap_size_limit",
            Math.round(heapStats.heap_size_limit / 1024 / 1024),
            "MB"
          );
          this.recordMetric(
            "total_heap_size",
            Math.round(heapStats.total_heap_size / 1024 / 1024),
            "MB"
          );
          this.recordMetric(
            "used_heap_size",
            Math.round(heapStats.used_heap_size / 1024 / 1024),
            "MB"
          );
        }, this.config.monitoringInterval);
      }
    } catch (error) {
      logger.warn("V8 힙 통계 수집 설정 실패:", error);
    }
  }

  /**
   * 백분위수 계산
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * 성능 리포트 생성
   */
  generateReport(): any {
    return {
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: this.getMemoryInfo(),
      responseTime: this.getResponseTimeStats(),
      metrics: this.getMetricSummary(),
      gc: {
        totalDuration: this.gcMetrics.totalDuration || 0,
        count: this.gcMetrics.count || 0,
        averageDuration: this.gcMetrics.count
          ? Math.round(
              (this.gcMetrics.totalDuration / this.gcMetrics.count) * 100
            ) / 100
          : 0
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid
      }
    };
  }
}
