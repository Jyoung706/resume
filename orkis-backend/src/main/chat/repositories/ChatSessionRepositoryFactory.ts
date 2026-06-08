import { Autowired, Component } from "@orkis/core/common";
import { ChatSessionPostgreSQLRepository } from "./ChatSessionPostgreSQLRepository";
import { ChatSessionRepository } from "./ChatSessionRepository";

/**
 * ChatSession Repository Factory
 * 환경변수에 따라 적절한 Repository 구현체를 반환
 */
@Component("ChatSessionRepositoryFactory")
export class ChatSessionRepositoryFactory {
  @Autowired("ChatSessionRepository")
  private sessionRepository!: ChatSessionRepository;

  @Autowired("ChatSessionPostgreSQLRepository")
  private sessionPostgreSqlRepository!: ChatSessionPostgreSQLRepository;

  private selectedInstance:
    | ChatSessionRepository
    | ChatSessionPostgreSQLRepository
    | null = null;

  /**
   * Repository 인스턴스 반환
   * CHAT_DB_TYPE 환경변수에 따라 구현체 선택
   * - "postgresql" 또는 "postgres": PostgreSQL 사용
   * - "file" 또는 미설정: 파일 DB 사용 (기본값)
   */
  public getInstance():
    | ChatSessionRepository
    | ChatSessionPostgreSQLRepository {
    if (!this.selectedInstance) {
      const dbType = process.env.CHAT_DB_TYPE?.toLowerCase();

      if (dbType === "postgresql" || dbType === "postgres") {        this.selectedInstance = this.sessionPostgreSqlRepository;
      } else {
        this.selectedInstance = this.sessionRepository;
      }
    }

    return this.selectedInstance;
  }

  /**
   * 인스턴스 초기화 (테스트용)
   */
  public reset(): void {
    this.selectedInstance = null;
  }
}
