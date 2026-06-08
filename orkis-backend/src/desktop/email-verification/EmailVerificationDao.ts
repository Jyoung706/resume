/**
 * 이메일 인증 DAO (SQLite override)
 * SQLite override of src/main/email-verification/EmailVerificationDao.ts
 * - placeholder: $N → ?
 * - RETURNING id 유지 (orkis-core db.each 처리)
 * - Date → ISO string (sqlite3 npm 은 Date 바인딩 미지원, expires_at/verified_at 은 TEXT 컬럼)
 * - boolean email_verified → 1/0 (INTEGER 컬럼)
 */

import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { PoolClient } from "pg";

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
  email?: string;
  user_name?: string;
}

export interface CreateTokenParams {
  userId: string;
  token: string;
  expiresAt: Date;
}

@Dao("EmailVerificationDao")
export class EmailVerificationDao {
  @InjectConnection("main")
  private db!: PoolClient;

  /**
   * 사용자의 기존 미사용 토큰 삭제 (새 토큰 발급 전 호출)
   */
  async deleteUnusedTokensByUserId(userId: string): Promise<number> {
    try {
      const result = await this.db.query(
        `DELETE FROM email_verification_tokens
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
        `INSERT INTO email_verification_tokens (user_id, token, expires_at)
         VALUES (?, ?, ?)
         RETURNING id`,
        [data.userId, data.token, data.expiresAt.toISOString()]
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
  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    try {
      const result = await this.db.query(
        `SELECT evt.*, u.email, u.name as user_name
         FROM email_verification_tokens evt
         JOIN user_info u ON evt.user_id = u.id
         WHERE evt.token = ?`,
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as EmailVerificationToken;
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
        `UPDATE email_verification_tokens
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
   * 사용자 이메일 인증 상태 업데이트
   */
  async updateUserEmailVerified(
    userId: string,
    verified: boolean,
    verifiedAt: Date
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE user_info
         SET email_verified = ?, email_verified_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [verified ? 1 : 0, verifiedAt.toISOString(), userId]
      );
    } catch (error) {
      logger.error("이메일 인증 상태 업데이트 실패:", error);
      throw error;
    }
  }

  /**
   * 사용자 인증 상태 조회
   */
  async getVerificationStatus(userId: string): Promise<{
    email: string;
    email_verified: boolean;
    email_verified_at: Date | null;
  } | null> {
    try {
      const result = await this.db.query(
        `SELECT email, email_verified, email_verified_at
         FROM user_info
         WHERE id = ?`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error("인증 상태 조회 실패:", error);
      throw error;
    }
  }

  /**
   * 사용자 정보 조회 (이름, 이메일)
   */
  async getUserInfo(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    email_verified: boolean;
  } | null> {
    try {
      const result = await this.db.query(
        `SELECT id, name, email, email_verified
         FROM user_info
         WHERE id = ?`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error("사용자 정보 조회 실패:", error);
      throw error;
    }
  }
}
