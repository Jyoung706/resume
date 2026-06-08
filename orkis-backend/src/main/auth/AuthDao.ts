import { UserInfo } from "@orkis-interface/backend";
import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { PoolClient } from "pg";
import { AUTH_USER_MAPPING, USER_INFO } from "../types/compatibility";
import {
  AUTH_NAMES,
  generateLicenseCode,
  getAuthCodeByUserType
} from "./constants/AuthConstants";

// 환경변수에서 초기 질문 횟수 설정 (기본값: 50)
const DEFAULT_INITIAL_QUESTION_COUNT = 50;
const getInitialQuestionCount = (): number => {
  const envValue = process.env.INITIAL_QUESTION_COUNT;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return DEFAULT_INITIAL_QUESTION_COUNT;
};

@Dao("AuthDao")
export class AuthDao {
  @InjectConnection("main")
  private db!: PoolClient;

  // 사용자 권한 정보 조회
  async getUserAuth(userinfo: UserInfo): Promise<AUTH_USER_MAPPING> {
    try {
      if (!userinfo.ID) {        return null as any;
      }

      const query = `
        SELECT
          id as "SEQ",
          auth_code as "AUTH_CODE",
          user_id as "USER_ID"
        FROM auth_license_user
        WHERE license_state = 'Y'
        AND CURRENT_DATE >= start_date
        AND CURRENT_DATE <= end_date
        AND user_id = $1
        LIMIT 1
      `;
      const result = await this.db.query(query, [userinfo.ID]);

      if (result.rows && result.rows.length > 0) {
        // logger.info(
        //   `getUserAuth 성공: ${userinfo.ID} => 권한코드: ${result.rows[0].AUTH_CODE}`
        // );
        return result.rows[0] as AUTH_USER_MAPPING;
      }
      return null as any;
    } catch (error) {
      logger.error("getUserAuth 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // 이메일로 사용자 정보 조회
  async getUserByEmail(email: string, loginType?: string): Promise<UserInfo> {
    try {
      const selectColumns = `
        SELECT
          id as "ID",
          password as "PASSWORD",
          name as "NAME",
          email as "EMAIL",
          phone as "PHONE",
          login_type as "LOGIN_TYPE",
          user_type as "USER_TYPE",
          social_id as "SOCIAL_ID",
          social_provider as "SOCIAL_PROVIDER",
          question_count as "QUESTION_COUNT",
          email_verified as "EMAIL_VERIFIED",
          profile_image as "PROFILE_IMAGE"
        FROM user_info
      `;

      if (loginType) {
        const query = `${selectColumns}
          WHERE email = $1
          AND login_type = $2
          LIMIT 1
        `;
        const result = await this.db.query(query, [email, loginType]);

        if (result.rows && result.rows.length > 0) {
          // logger.info(
          //   `getUserByEmail 성공: ${email} (loginType: ${loginType})`
          // );
          return result.rows[0] as UserInfo;
        }
      } else {
        const query = `${selectColumns}
          WHERE email = $1
          LIMIT 1
        `;
        const result = await this.db.query(query, [email]);

        if (result.rows && result.rows.length > 0) {          return result.rows[0] as UserInfo;
        }
      }      return null as any;
    } catch (error) {
      logger.error("getUserByEmail 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // ID로 사용자 정보 조회
  async getUserById(id: string | number): Promise<UserInfo> {
    try {
      const query = `
        SELECT
          id as "ID",
          password as "PASSWORD",
          name as "NAME",
          email as "EMAIL",
          phone as "PHONE",
          login_type as "LOGIN_TYPE",
          user_type as "USER_TYPE",
          social_id as "SOCIAL_ID",
          social_provider as "SOCIAL_PROVIDER",
          question_count as "QUESTION_COUNT",
          email_verified as "EMAIL_VERIFIED",
          profile_image as "PROFILE_IMAGE"
        FROM user_info
        WHERE id = $1
        LIMIT 1
      `;
      const result = await this.db.query(query, [id]);

      if (result.rows && result.rows.length > 0) {        return result.rows[0] as UserInfo;
      }      return null as any;
    } catch (error) {
      logger.error("getUserById 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // Username으로 사용자 정보 조회
  async getUserByUsername(username: string): Promise<UserInfo> {
    try {
      const query = `
        SELECT
          id as "ID",
          password as "PASSWORD",
          name as "NAME",
          email as "EMAIL",
          phone as "PHONE",
          login_type as "LOGIN_TYPE",
          user_type as "USER_TYPE",
          social_id as "SOCIAL_ID",
          social_provider as "SOCIAL_PROVIDER",
          question_count as "QUESTION_COUNT",
          email_verified as "EMAIL_VERIFIED",
          profile_image as "PROFILE_IMAGE"
        FROM user_info
        WHERE id = $1
        LIMIT 1
      `;
      const result = await this.db.query(query, [username]);

      if (result.rows && result.rows.length > 0) {        return result.rows[0] as UserInfo;
      }      return null as any;
    } catch (error) {
      logger.error("getUserByUsername 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // 모든 권한 정보 조회
  async getAllAuthInfo(): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM auth_main
        ORDER BY auth_id
      `;
      const result = await this.db.query(query);

      if (result.rows) {
        return result.rows;
      }
      return [];
    } catch (error) {
      logger.error("getAllAuthInfo 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // 새 사용자 저장
  async saveUser(userInfo: USER_INFO): Promise<void> {
    try {
      const query = `
        INSERT INTO user_info (
          id, email, name, phone, login_type,
          password, user_type, social_id, social_provider,
          question_count
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10
        )
      `;
      const values = [
        userInfo.ID,
        userInfo.EMAIL,
        userInfo.NAME,
        userInfo.PHONE,
        userInfo.LOGIN_TYPE,
        userInfo.PASSWORD || null,
        userInfo.USER_TYPE,
        userInfo.SOCIAL_ID,
        userInfo.SOCIAL_PROVIDER,
        userInfo.QUESTION_COUNT ?? getInitialQuestionCount()
      ];
      await this.db.query(query, values);    } catch (error) {
      logger.error("saveUser 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // 사용자 권한 등록
  async saveUserLicense(userId: string, userType?: string): Promise<void> {
    try {
      const authCode = getAuthCodeByUserType(userType);
      const authName = AUTH_NAMES[authCode as keyof typeof AUTH_NAMES];

      // 기존 권한 확인
      const checkQuery = `
        SELECT id FROM auth_license_user
        WHERE user_id = $1
        AND auth_code = $2
        AND license_state = 'Y'
        AND CURRENT_DATE <= end_date
        LIMIT 1
      `;
      const checkResult = await this.db.query(checkQuery, [userId, authCode]);

      if (checkResult.rows && checkResult.rows.length > 0) {        return;
      }

      // 라이센스 정보 생성
      const query = `
        INSERT INTO auth_license_user (
          user_id,
          auth_code,
          license_code,
          start_date,
          end_date,
          license_state
        ) VALUES (
          $1,
          $2,
          $3,
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '1 year',
          'Y'
        )
        ON CONFLICT (user_id, auth_code, license_code) DO NOTHING
      `;

      const licenseCode = generateLicenseCode(userId, authCode);
      const values = [userId, authCode, licenseCode];

      await this.db.query(query, values);
    } catch (error) {
      logger.error("saveUserLicense 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // 질문 횟수 차감
  async decrementQuestionCount(userId: string): Promise<number> {
    try {
      const query = `
        UPDATE user_info
        SET question_count = GREATEST(question_count - 1, 0)
        WHERE id = $1
        RETURNING question_count as "QUESTION_COUNT"
      `;
      const result = await this.db.query(query, [userId]);

      if (result.rows && result.rows.length > 0) {
        const newCount = result.rows[0].QUESTION_COUNT;        return newCount;
      }      return 0;
    } catch (error) {
      logger.error("decrementQuestionCount 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // 질문 횟수 조회
  async getQuestionCount(userId: string): Promise<number> {
    try {
      const query = `
        SELECT question_count as "QUESTION_COUNT"
        FROM user_info
        WHERE id = $1
      `;
      const result = await this.db.query(query, [userId]);

      if (result.rows && result.rows.length > 0) {
        return result.rows[0].QUESTION_COUNT || 0;
      }      return 0;
    } catch (error) {
      logger.error("getQuestionCount 쿼리 실행 중 오류:", error);
      throw error;
    }
  }

  // 비밀번호 업데이트
  async updatePassword(
    userId: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE user_info
        SET password = $1, updated_at = NOW()
        WHERE id = $2
      `;
      const result = await this.db.query(query, [hashedPassword, userId]);

      if (result.rowCount && result.rowCount > 0) {        return true;
      }      return false;
    } catch (error) {
      logger.error("updatePassword 쿼리 실행 중 오류:", error);
      throw error;
    }
  }
}
