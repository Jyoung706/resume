import { Service, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { Pool } from "pg";

@Service()
export class QuestionCountJob {
  @InjectConnection("main", { type: "native" })
  private postgres!: Pool;

  async userQuestionInit(question_count: number) {
    const result = await this.postgres.query(
      `
      UPDATE user_info 
        SET question_count = $1
        WHERE question_count != $2;
      `,
      [question_count, question_count]
    );
    logger.info("유저 질문 카운트 초기화 적용 수 : ", result.rowCount);
  }
}
