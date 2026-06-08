import { Autowired, Component } from "@orkis/core/common";
import { ChatSessionSqliteRepository } from "./ChatSessionSqliteRepository";

// desktop 전용 ChatSessionRepositoryFactory.
// - cloud factory(ChatSessionRepositoryFactory)는 CHAT_DB_TYPE 으로 PG/파일 repo 를 분기하지만,
//   desktop 은 SQLite 단일이므로 cloud factory + PG/file/BaseRepository 갈래를 통째 exclude 하고
//   이 factory 가 같은 @Component 이름으로 대체한다. (ChatSessionService 무수정)
// - getInstance() 는 분기 없이 SQLite repo 만 반환.
@Component("ChatSessionRepositoryFactory")
export class ChatSessionRepositoryFactory {
  @Autowired("ChatSessionSqliteRepository")
  private sqliteRepository!: ChatSessionSqliteRepository;

  public getInstance(): ChatSessionSqliteRepository {
    return this.sqliteRepository;
  }

  public reset(): void {
    // single-instance — no-op (cloud factory 의 테스트용 reset 인터페이스 호환)
  }
}
