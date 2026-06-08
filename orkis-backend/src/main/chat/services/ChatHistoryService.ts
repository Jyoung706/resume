import { Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import * as fs from "fs";
import type {
  ChatHistoryItem,
  GetChatHistoryRequest,
  GetChatHistoryResponse,
  ProcessStep
} from "@orkis-interface/backend/chat";
import { ChatHistoryMessageType } from "@orkis-interface/backend/chat";
import * as path from "path";

/**
 * Summary JSON 파일 형식 (AI 서버에서 생성)
 */
interface SummaryFile {
  success: boolean;
  q: string | null;
  a: string | null;
  sql: string | null;
  steps: Record<string, string>;
  last_step: number;
  end_time: number;
}

/**
 * 채팅 이력 조회 서비스
 * share/summary/{sessionId}/{YYMMDD}/{messageId}.json 파일 읽기
 */
@Service({ name: "ChatHistoryService" })
export class ChatHistoryService {
  /**
   * 프로세스 단계 이름 매핑
   */
  private readonly STEP_NAMES: Record<string, string> = {
    "0": "generate_hint",
    "1": "schema_linking",
    "2": "generate_sql",
    "3": "evaluate"
  };

  /**
   * 프로세스 단계 표시 이름 매핑
   */
  private readonly STEP_DISPLAY_NAMES: Record<string, string> = {
    generate_hint: "Generate_Hint",
    schema_linking: "Schema_Linking",
    generate_sql: "Generate_Sql",
    evaluate: "Evaluate"
  };

  /**
   * 프로세스 단계 진행 메시지 매핑
   */
  private readonly STEP_MESSAGES: Record<string, string> = {
    generate_hint: "적합한 힌트를 생성 중입니다.",
    schema_linking: "관련도가 높은 스키마를 선별 중입니다.",
    generate_sql: "SQL 을 생성 하고 있습니다.",
    evaluate: "생성된 SQL 을 검증 중입니다."
  };

  /**
   * Summary 폴더 경로 가져오기
   */
  private getSummaryBasePath(): string {
    return path.join(process.cwd(), "share", "summary");
  }

  /**
   * 채팅 이력 조회
   * @param userId 사용자 ID (현재는 미사용, 향후 권한 체크용)
   * @param request 조회 요청
   * @returns 채팅 이력 응답
   */
  async getChatHistory(
    userId: string,
    request: GetChatHistoryRequest
  ): Promise<GetChatHistoryResponse> {
    try {
      const { sessionId, page = 1, limit = 50, startDate, endDate } = request;      const summaryBasePath = this.getSummaryBasePath();
      const sessionPath = path.join(summaryBasePath, sessionId);

      // 세션 폴더 존재 확인
      if (!fs.existsSync(sessionPath)) {        return {
          history: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        };
      }

      // 날짜별 폴더 목록 조회 (YYMMDD 형식)
      const dateFolders = fs
        .readdirSync(sessionPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => /^\d{6}$/.test(name)) // YYMMDD 형식만 필터링
        .sort()
        .reverse(); // 최신 날짜 순

      // 모든 JSON 파일 수집
      const allMessages: ChatHistoryItem[] = [];

      for (const dateFolder of dateFolders) {
        const datePath = path.join(sessionPath, dateFolder);
        const files = fs.readdirSync(datePath);

        for (const file of files) {
          if (!file.endsWith(".json")) {
            continue;
          }

          try {
            const filePath = path.join(datePath, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const summary: SummaryFile = JSON.parse(content);

            // 날짜 필터링
            if (startDate || endDate) {
              const messageDate = this.parseDate(dateFolder);
              if (
                (startDate && messageDate < startDate) ||
                (endDate && messageDate > endDate)
              ) {
                continue;
              }
            }

            // ChatHistoryItem으로 변환
            const item = this.convertToHistoryItem(
              summary,
              file.replace(".json", ""),
              sessionId,
              dateFolder
            );

            allMessages.push(item);
          } catch (error) {
            logger.error(
              `[ChatHistoryService] JSON 파일 파싱 실패: ${file}`,
              error
            );
            // 개별 파일 오류는 무시하고 계속 진행
          }
        }
      }

      // 타임스탬프 기준으로 정렬 (최신순)
      allMessages.sort((a, b) => b.timestamp - a.timestamp);

      // 페이징 처리
      const total = allMessages.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const history = allMessages.slice(startIndex, endIndex);      return {
        history,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error(`[ChatHistoryService] 채팅 이력 조회 중 오류 발생`, error);
      throw error;
    }
  }

  /**
   * SummaryFile을 ChatHistoryItem으로 변환
   */
  private convertToHistoryItem(
    summary: SummaryFile,
    messageId: string,
    sessionId: string,
    dateFolder: string
  ): ChatHistoryItem {
    // 메시지 타입 결정: SQL이 있으면 'sql', 없으면 'general'
    const messageType: ChatHistoryMessageType =
      summary.sql && summary.sql.trim() !== ""
        ? ChatHistoryMessageType.SQL
        : ChatHistoryMessageType.GENERAL;

    // 프로세스 단계 변환 (SQL 타입일 때만)
    let steps: ProcessStep[] | undefined;
    if (messageType === ChatHistoryMessageType.SQL && summary.steps) {
      steps = this.convertProcessSteps(
        summary.steps,
        summary.last_step,
        summary.success
      );
    }

    // Unix 타임스탬프(초)를 밀리초로 변환 후 ISO 문자열로 변환
    // end_time이 유효하지 않은 경우 현재 시간 사용
    let createdAt: string;
    if (summary.end_time && summary.end_time > 0) {
      createdAt = new Date(summary.end_time * 1000).toISOString();
    } else {
      // end_time이 0이거나 없는 경우, dateFolder를 기반으로 날짜 생성
      const parsedDate = this.parseDate(dateFolder);
      createdAt = new Date(parsedDate).toISOString();    }

    return {
      messageId,
      sessionId,
      question: summary.q || "",
      answer: summary.a || "",
      messageType,
      sql: summary.sql || undefined,
      success: summary.success,
      steps,
      timestamp: summary.end_time,
      createdAt
    };
  }

  /**
   * 프로세스 단계 변환
   * @param steps 원본 단계 객체 {"0": "generate_hint", "1": "schema_linking", ...}
   * @param lastStep 마지막 완료 단계 (0-based index)
   * @param success 전체 프로세스 성공 여부
   * @returns 변환된 ProcessStep 배열
   */
  private convertProcessSteps(
    steps: Record<string, string>,
    lastStep: number,
    success: boolean = true
  ): ProcessStep[] {
    const processSteps: ProcessStep[] = [];

    // 단계 순서대로 처리
    const stepKeys = Object.keys(steps).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    for (const key of stepKeys) {
      const stepName = steps[key];
      const order = parseInt(key);

      // 상태 결정
      let status: "success" | "failed" | "pending";
      if (order < lastStep) {
        // lastStep 이전 단계는 성공
        status = "success";
      } else if (order === lastStep) {
        // 마지막 단계는 전체 성공 여부에 따라 결정
        status = success ? "success" : "failed";
      } else {
        // lastStep 이후 단계는 실패
        status = "failed";
      }

      processSteps.push({
        name: this.STEP_DISPLAY_NAMES[stepName] || stepName,
        status,
        order,
        message: this.STEP_MESSAGES[stepName] || undefined
      });
    }

    return processSteps;
  }

  /**
   * YYMMDD 형식을 YYYY-MM-DD로 변환
   * @param dateFolder YYMMDD 형식 문자열 (예: "251120")
   * @returns YYYY-MM-DD 형식 문자열 (예: "2025-11-20")
   */
  private parseDate(dateFolder: string): string {
    if (dateFolder.length !== 6) {
      return dateFolder;
    }

    const yy = dateFolder.substring(0, 2);
    const mm = dateFolder.substring(2, 4);
    const dd = dateFolder.substring(4, 6);

    // 20XX년대로 가정
    const year = `20${yy}`;

    return `${year}-${mm}-${dd}`;
  }

  /**
   * 특정 메시지 상세 조회
   * @param userId 사용자 ID
   * @param sessionId 세션 ID
   * @param messageId 메시지 ID
   * @param dateFolder 날짜 폴더 (YYMMDD)
   * @returns 채팅 이력 항목
   */
  async getMessageDetail(
    userId: string,
    sessionId: string,
    messageId: string,
    dateFolder?: string
  ): Promise<ChatHistoryItem | null> {
    try {
      const summaryBasePath = this.getSummaryBasePath();
      const sessionPath = path.join(summaryBasePath, sessionId);

      if (!fs.existsSync(sessionPath)) {
        return null;
      }

      // dateFolder가 지정되지 않은 경우 모든 날짜 폴더 검색
      const searchFolders = dateFolder
        ? [dateFolder]
        : fs
            .readdirSync(sessionPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .filter((name) => /^\d{6}$/.test(name));

      for (const folder of searchFolders) {
        const filePath = path.join(sessionPath, folder, `${messageId}.json`);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          const summary: SummaryFile = JSON.parse(content);

          return this.convertToHistoryItem(
            summary,
            messageId,
            sessionId,
            folder
          );
        }
      }

      return null;
    } catch (error) {
      logger.error(`[ChatHistoryService] 메시지 상세 조회 중 오류 발생`, error);
      throw error;
    }
  }
}
