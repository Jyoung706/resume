import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { PoolClient } from "pg";

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
        SET profile_image = $1, updated_at = NOW()
        WHERE id = $2
      `;
      await this.db.query(query, [imagePath, userId]);    } catch (error) {
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
        WHERE id = $1
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
