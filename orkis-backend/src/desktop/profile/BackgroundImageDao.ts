import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { PoolClient } from "pg";

// SQLite override of src/main/profile/BackgroundImageDao.ts
// - placeholder: $N → ? (위치 순서 유지: imagePath, userId)
// - NOW() → datetime('now')
@Dao("BackgroundImageDao")
export class BackgroundImageDao {
  @InjectConnection("main")
  private db!: PoolClient;

  // 배경 이미지 경로 업데이트
  async updateBackgroundImagePath(
    userId: string,
    imagePath: string | null
  ): Promise<void> {
    try {
      const query = `
        UPDATE user_info
        SET background_image = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      await this.db.query(query, [imagePath, userId]);
    } catch (error) {
      logger.error(
        "[BackgroundImageDao] updateBackgroundImagePath 에러:",
        error
      );
      throw error;
    }
  }

  // 배경 이미지 경로 조회
  async getBackgroundImagePath(userId: string): Promise<string | null> {
    try {
      const query = `
        SELECT background_image
        FROM user_info
        WHERE id = ?
      `;
      const result = await this.db.query(query, [userId]);

      if (result.rows && result.rows.length > 0) {
        return result.rows[0].background_image;
      }
      return null;
    } catch (error) {
      logger.error("[BackgroundImageDao] getBackgroundImagePath 에러:", error);
      throw error;
    }
  }
}
