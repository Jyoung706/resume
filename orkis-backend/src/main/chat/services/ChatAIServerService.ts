import { Autowired, InjectConnection, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import Redis from "ioredis";
import {
  ChatError,
  ChatErrorMessages,
  ChatErrorType
} from "../../error/ChatError";
import { LLMModelDao } from "../../llm/repositories/LLMModelDao";
import { LLMModelService } from "../../llm/services/LLMModelService";
import { ChatSessionPostgreSQLRepository } from "../repositories/ChatSessionPostgreSQLRepository";

@Service("ChatAIServerService")
export class ChatAIServerService {
  @Autowired("ChatSessionPostgreSQLRepository")
  private sessionRepository!: ChatSessionPostgreSQLRepository;

  @Autowired("LLMModelService")
  private llmModelService!: LLMModelService;

  @Autowired("LLMModelDao")
  private llmModelDao!: LLMModelDao;

  @InjectConnection("chatRedis", { type: "native" })
  private chatRedisClient!: Redis;

  /**
   * AI 서버에 메시지를 전송하고 chatId/title을 받아옴
   *
   * NOTE: chatId 변환 로직 제거됨 - Frontend에서 UUID v7 기반 messageId 생성
   * AI 서버에 messageId를 전달하여 동일한 ID로 Redis 키 생성
   */
  async sendMessageAndGetChatId(
    userId: string,
    request: {
      sessionId: string;
      chatId?: string;
      message: string;
      modelId?: string;
      keywords?: string[];
      selectedSchema?: any;
      dbId?: string;
      apiKey?: string;
    }
  ): Promise<{ chatId: string; title?: string }> {
    try {
      // 첫 메시지인지 확인
      const session = await this.sessionRepository.findSessionById(
        request.sessionId
      );
      const isFirstMessage =
        !session || (session.messageCount === 0 && !session.titleModified);

      const isDev =
        process.env.NODE_ENV === "development" ||
        process.env.ENV_TYPE === "dev";
      const ragServerUrl =
        process.env.RAG_SERVER_URL ||
        (isDev ? "http://10.5.4.120:9001" : "https://orkis-ai/v1");
      const endpoint = `${ragServerUrl}/conversation`;

      // 모델 해석 (env 폴백 없음 - llm_user_models 단일 진실 원천)
      let resolved: {
        modelId: string;
        modelName: string;
        apiKey: string;
      } | null = null;

      if (request.modelId) {
        resolved = await this.llmModelService.resolveByIdForInternal(
          userId,
          request.modelId
        );
        if (!resolved) {
          throw new ChatError(
            ChatErrorMessages[ChatErrorType.MODEL_LOOKUP_FAILED].userMessage,
            ChatErrorType.MODEL_LOOKUP_FAILED,
            400,
            {
              remediation: {
                action: "select_default_model",
                url: "/settings/llm"
              }
            } as any
          );
        }
      } else {
        resolved = await this.llmModelService.resolveDefaultForInternal(userId);
        if (!resolved) {
          const userModels = await this.llmModelDao.findByUserId(userId);
          const errType =
            userModels.length === 0
              ? ChatErrorType.MODEL_NOT_CONFIGURED
              : ChatErrorType.MODEL_NOT_SELECTED;
          throw new ChatError(
            ChatErrorMessages[errType].userMessage,
            errType,
            400,
            {
              remediation: {
                action:
                  errType === ChatErrorType.MODEL_NOT_CONFIGURED
                    ? "register_model"
                    : "select_default_model",
                url: "/settings/llm"
              }
            } as any
          );
        }
      }

      const apiKey = resolved.apiKey;
      const llmModelName = resolved.modelName;

      const Body: Record<string, any> = {
        chatroom_id: request.sessionId,
        question: request.message,
        keywords:
          request.keywords && request.keywords.length > 0
            ? request.keywords
            : [],
        hint: "",
        db_id: request.dbId || "superhero",
        generate_title: isFirstMessage,
        llm_model: llmModelName,
        api_key: apiKey
      };

      if (request.chatId) {
        Body.chat_id = request.chatId;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(Body)
      });

      const headersObj: { [key: string]: string } = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI 서버 응답 오류: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const aiChatId = data?.result?.chat_id || data?.chat_id;
      const title = data?.result?.title || data?.title;

      const chatId = request.chatId || aiChatId;

      if (!chatId) {
        logger.error("[AI 서버 응답 파싱 실패]", {
          "request.chatId": request.chatId,
          "data.result?.chat_id": data?.result?.chat_id,
          "data.chat_id": data?.chat_id,
          "응답 구조": Object.keys(data || {})
        });
        throw new Error("AI 서버로부터 chat_id를 받지 못했습니다");
      }

      // AI 서버 호출 직후 0_0 (app_start) Redis에 등록
      try {
        const redis = this.chatRedisClient;
        const startTime = Math.floor(Date.now() / 1000);
        const statKey = `${chatId}:stat`;
        await redis.hsetnx(statKey, "0_0", startTime.toString());
      } catch (redisError) {
        // 0_0 등록 실패는 critical하지 않으므로 계속 진행
      }

      // 제목이 있고 첫 메시지인 경우 세션 제목 업데이트
      if (title && isFirstMessage) {
        try {
          await this.sessionRepository.updateSessionTitle(
            request.sessionId,
            title
          );
        } catch (updateError) {
          logger.error("[세션 제목 업데이트 실패]", updateError);
        }
      }

      return { chatId, title };
    } catch (error) {
      if (error instanceof ChatError) {
        throw error;
      }

      logger.error("[AI 서버 호출 실패]", {
        오류타입: error instanceof Error ? error.name : "Unknown",
        오류메시지: error instanceof Error ? error.message : String(error),
        스택: error instanceof Error ? error.stack : "N/A"
      });

      const tempId = request.chatId || `chat_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`;
      return { chatId: tempId, title: undefined };
    }
  }

  /**
   * AI 서버에 취소 요청 (동기식)
   */
  async cancelRagServerProcessSync(chatId: string): Promise<boolean> {
    try {
      const isDev =
        process.env.NODE_ENV === "development" ||
        process.env.ENV_TYPE === "dev";
      const ragServerUrl =
        process.env.RAG_SERVER_URL ||
        (isDev ? "http://10.5.4.120:9001" : "https://orkis.kr/api-ai/v1");
      const endpoint = `${ragServerUrl}/cancel`;

      const Body = {
        chat_id: chatId,
        force: true,
        timeout: 1
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const success = response.ok;
        if (success) {
          try {
            const responseData = await response.json();
          } catch (jsonError) {
          }
        }

        if (success) {
          return true;
        }

        await this.sendForceCancelRequest(chatId, endpoint);

        return success;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError?.name === "AbortError") {
          return false;
        }

        throw fetchError;
      }
    } catch (error) {
      logger.error("RAG 서버 동기식 취소 요청 실패", error);
      return false;
    }
  }

  /**
   * 강제 취소 요청 (여러 번 시도)
   */
  private async sendForceCancelRequest(
    chatId: string,
    endpoint: string
  ): Promise<void> {
    try {
      const cancelRequests = [
        { chat_id: chatId, force: false },
        { chat_id: chatId, force: true },
        { chat_id: chatId, force: true, immediate: true },
        { chat_id: chatId, action: "kill_sql" },
        { chat_id: chatId, action: "kill_all" }
      ];

      for (let i = 0; i < cancelRequests.length; i++) {
        const Body = cancelRequests[i];
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "ORKIS-Backend-Force/1.0"
            },
            body: JSON.stringify(Body),
            signal: AbortSignal.timeout(2000)
          });
          if (response.ok) {
            return;
          }
        } catch (error) {
        }

        if (i < cancelRequests.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      logger.error("강제 취소 요청 생성 중 오류", error);
    }
  }
}
