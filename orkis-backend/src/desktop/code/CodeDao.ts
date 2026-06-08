import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { PoolClient } from "pg";
import type { CodeDetail, CodeGroup } from "@/code/CodeService";

// SQLite override of src/main/code/CodeDao.ts
// - placeholder: $N → ?
// - SELECT only (code_detail, code_group). dialect 변환 부담 최소.
@Dao("CodeDao")
export class CodeDao {
  @InjectConnection("main")
  private db!: PoolClient;

  async getCodeDetailsByGroup(groupId: string): Promise<CodeDetail[]> {
    try {
      const query = `
        SELECT
          group_id as "groupId",
          code_id as "codeId",
          code_name as "codeName",
          code_name_en as "codeNameEn",
          description,
          display_order as "displayOrder",
          use_yn as "useYn",
          attr1,
          attr2,
          attr3,
          attr4,
          attr5
        FROM code_detail
        WHERE group_id = ?
          AND use_yn = 'Y'
        ORDER BY display_order ASC, code_name ASC
      `;

      const result = await this.db.query(query, [groupId]);
      return result.rows as CodeDetail[];
    } catch (error) {
      logger.error("[CodeDao] getCodeDetailsByGroup 에러:", error);
      throw error;
    }
  }

  async getCodeGroups(): Promise<CodeGroup[]> {
    try {
      const query = `
        SELECT
          group_id as "groupId",
          group_name as "groupName",
          description,
          display_order as "displayOrder",
          use_yn as "useYn"
        FROM code_group
        WHERE use_yn = 'Y'
        ORDER BY display_order ASC, group_name ASC
      `;

      const result = await this.db.query(query);
      return result.rows as CodeGroup[];
    } catch (error) {
      logger.error("[CodeDao] getCodeGroups 에러:", error);
      throw error;
    }
  }
}
