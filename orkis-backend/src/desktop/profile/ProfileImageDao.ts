import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { PoolClient } from "pg";

// SQLite override of src/main/profile/ProfileImageDao.ts
// - placeholder: $N → ? (위치 순서 유지: imagePath, userId)
// - NOW() → datetime('now')
@Dao("ProfileImageDao")
export class ProfileImageDao {
  @InjectConnection("main")
  private db!: PoolClient;

  // 프로필 이미지 경로 업데이트
  async updateProfileImagePath(
    userId: string,
    imagePath: string | null
  ): Promise<void> {
    try {
      const query = `
        UPDATE user_info
        SET profile_image = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      await this.db.query(query, [imagePath, userId]);
    } catch (error) {
      logger.error("[ProfileImageDao] updateProfileImagePath 에러:", error);
      throw error;
    }
  }

  // 프로필 이미지 경로 조회
  async getProfileImagePath(userId: string): Promise<string | null> {
    try {
      const query = `
        SELECT profile_image
        FROM user_info
        WHERE id = ?
      `;
      const result = await this.db.query(query, [userId]);

      if (result.rows && result.rows.length > 0) {
        return result.rows[0].profile_image;
      }
      return null;
    } catch (error) {
      logger.error("[ProfileImageDao] getProfileImagePath 에러:", error);
      throw error;
    }
  }
}
