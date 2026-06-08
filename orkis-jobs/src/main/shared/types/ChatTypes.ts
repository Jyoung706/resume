// Redis에 저장되는 프로세스 상태 타입
export interface ProcessStatus {
  app_start?: number;
  app_work?: number;
  app_end?: number;
  ai_start?: number;
  ai_work?: number;
  ai_end?: number;
  job_start?: number;
  job_work?: number;
  job_end?: number;
}

// Redis 키 형식
export interface RedisProcessData {
  "0_0"?: string; // app_start
  "0_1"?: string; // app_work
  "0_2"?: string; // app_end
  "1_0"?: string; // ai_start
  "1_1"?: string; // ai_work
  "1_2"?: string; // ai_end
  "2_0"?: string; // job_start
  "2_1"?: string; // job_work
  "2_2"?: string; // job_end
  // 인덱스 시그니처 추가 (동적 키 접근을 위해)
  [key: string]: string | undefined;
}

// 프로세스 상태 체크 결과
export interface SessionCheckResult {
  chatId: string;
  isIncomplete: boolean;
  missingSteps: string[];
  lastUpdateTime: number;
  elapsedMinutes: number;
}