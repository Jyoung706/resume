/**
 * 비밀번호 재설정 DAO (SQLite override)
 * SQLite override of src/main/password-reset/PasswordResetDao.ts
 * - placeholder: $N → ?
 * - RETURNING id 유지 (orkis-core db.each 처리)
 * - Date → ISO string (sqlite3 npm 은 Date 바인딩 미지원, expires_at 은 TEXT 컬럼)
 * - JOIN user_info, CURRENT_TIMESTAMP, LIMIT — SQLite 동일
 */

import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { PoolClient } from "pg";

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  email?: string;
  user_name?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  login_type: string;
}

export interface CreateTokenParams {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

@Dao("PasswordResetDao")
export class PasswordResetDao {
  @InjectConnection("main")
  private db!: PoolClient;

  /**
   * 이메일로 사용자 조회
   */
  async findUserByEmail(email: string): Promise<UserInfo | null> {
    try {
      const result = await this.db.query(
        `SELECT id, name, email, email_verified, login_type
         FROM user_info
         WHERE email = ?
         LIMIT 1`,
        [email]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as UserInfo;
    } catch (error) {
      logger.error("사용자 조회 실패:", error);
      throw error;
    }
  }

  /**
   * 사용자의 기존 미사용 토큰 삭제 (새 토큰 발급 전 호출)
   */
  async deleteUnusedTokensByUserId(userId: string): Promise<number> {
    try {
      const result = await this.db.query(
        `DELETE FROM password_reset_tokens
         WHERE user_id = ? AND used_at IS NULL`,
        [userId]
      );

      const deletedCount = result.rowCount || 0;
      return deletedCount;
    } catch (error) {
      logger.error("미사용 토큰 삭제 실패:", error);
      throw error;
    }
  }

  /**
   * 새 토큰 생성
   */
  async createToken(data: CreateTokenParams): Promise<string> {
    try {
      const result = await this.db.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
        [
          data.userId,
          data.token,
          data.expiresAt.toISOString(),
          data.ipAddress || null,
          data.userAgent || null
        ]
      );
      return result.rows[0].id;
    } catch (error) {
      logger.error("토큰 생성 실패:", error);
      throw error;
    }
  }

  /**
   * 토큰으로 조회 (사용자 정보 포함)
   */
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    try {
      const result = await this.db.query(
        `SELECT prt.*, u.email, u.name as user_name
         FROM password_reset_tokens prt
         JOIN user_info u ON prt.user_id = u.id
         WHERE prt.token = ?`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as PasswordResetToken;
    } catch (error) {
      logger.error("토큰 조회 실패:", error);
      throw error;
    }
  }

  /**
   * 토큰 사용 처리
   */
  async markAsUsed(token: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE password_reset_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE token = ?`,
        [token]
      );
    } catch (error) {
      logger.error("토큰 사용 처리 실패:", error);
      throw error;
    }
  }

  /**
   * 비밀번호 업데이트
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE user_info
         SET password = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [hashedPassword, userId]
      );
    } catch (error) {
      logger.error("비밀번호 업데이트 실패:", error);
      throw error;
    }
  }
}
