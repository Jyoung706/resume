import {
  Autowired,
  Body,
  Controller,
  FILTER_TYPES,
  REQUEST_METHOD,
  RequestMapping
} from "@orkis/core/common";
import { NoticeService } from "../notice/NoticeService";
import { ChatSessionService } from "../chat/services/ChatSessionService";
import { DbConnectionService } from "../db-connection/DbConnectionService";

interface PerformanceTestRequest {
  user_id?: string;
}

interface PerformanceTestResponse {
  unread_count: number;
  execution_time_ms: number;
  timestamp: string;
}

/**
 * 성능 테스트용 API 컨트롤러
 * 인증 없이 접근 가능
 */
@Controller({ path: "/api/performance" })
export class NoticePerformanceApi {
  @Autowired("NoticeService")
  private noticeService!: NoticeService;

  @Autowired("ChatSessionService")
  private chatSessionService!: ChatSessionService;

  @Autowired("DbConnectionService")
  private dbConnectionService!: DbConnectionService;

  /**
   * 읽지 않은 공지사항 개수 조회 - 성능 테스트용
   * POST /api/performance/notice/unread-count
   *
   * 인증 없이 테스트 가능
   * Body: { user_id?: string }
   */
  @RequestMapping({
    route: "/notice/unread-count",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async apiGetUnreadCount(
    @Body() body?: PerformanceTestRequest
  ): Promise<PerformanceTestResponse> {
    const userId = body?.user_id || "test-user";

    const startTime = performance.now();
    const count = await this.noticeService.getUnreadCount(userId);
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    return {
      unread_count: count,
      execution_time_ms: Math.round(executionTime * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 단순 응답 테스트 (baseline)
   * POST /api/performance/ping
   */
  @RequestMapping({
    route: "/ping",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async ping(): Promise<{ message: string; timestamp: string }> {
    return {
      message: "pong",
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 세션 리스트 조회 - 성능 테스트용
   * POST /api/performance/chat/sessions
   *
   * 인증 없이 테스트 가능
   * Body: { user_id?: string }
   */
  @RequestMapping({
    route: "/chat/sessions",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async getSessions(
    @Body() body?: PerformanceTestRequest
  ): Promise<{
    sessions: any[];
    session_count: number;
    execution_time_ms: number;
    timestamp: string;
  }> {
    const userId = body?.user_id || "test-user";

    const startTime = performance.now();
    const result = await this.chatSessionService.getUserSessions(userId);
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    return {
      sessions: result.sessions,
      session_count: result.sessions.length,
      execution_time_ms: Math.round(executionTime * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * DB 연결 리스트 조회 - 성능 테스트용
   * POST /api/performance/db-connection/list
   *
   * 인증 없이 테스트 가능
   * Body: { user_id?: string }
   */
  @RequestMapping({
    route: "/db-connection/list",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async getDbConnections(
    @Body() body?: PerformanceTestRequest
  ): Promise<{
    connections: any[];
    connection_count: number;
    execution_time_ms: number;
    timestamp: string;
  }> {
    const userId = body?.user_id || "test-user";

    const startTime = performance.now();
    const result = await this.dbConnectionService.getDbConnections(userId);
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    return {
      connections: result.connections,
      connection_count: result.connections.length,
      execution_time_ms: Math.round(executionTime * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }
}
