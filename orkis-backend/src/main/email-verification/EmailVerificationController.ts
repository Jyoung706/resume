/**
 * 이메일 인증 컨트롤러
 * 이메일 인증 API 엔드포인트
 */

import {
  Autowired,
  Controller,
  Body,
  RequestMapping,
  Session,
  FILTER_TYPES,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { EmailVerificationService } from "./EmailVerificationService";

@Controller({ path: "/email-verification" })
export class EmailVerificationController {
  @Autowired("EmailVerificationService")
  private service!: EmailVerificationService;

  /**
   * 인증 메일 발송
   * POST /email-verification/send
   */
  @RequestMapping({
    route: "/send",
    method: REQUEST_METHOD.POST
  })
  async sendVerificationEmail(@Session() session: any): Promise<any> {
    try {
      const loginInfo = session?.login_info;
      const userId = loginInfo?.USER_ID || loginInfo?.ID;

      if (!userId) {        return {
          success: false,
          message: "로그인이 필요합니다.",
          error: "UNAUTHORIZED"
        };
      }

      await this.service.requestEmailVerification(userId);

      return {
        success: true,
        message: "인증 메일이 발송되었습니다.",
        data: {
          expiresIn: "24시간"
        }
      };
    } catch (error: any) {
      logger.error("인증 메일 발송 실패:", error);
      return {
        success: false,
        message: error.message || "인증 메일 발송에 실패했습니다.",
        error: "VERIFICATION_REQUEST_FAILED"
      };
    }
  }

  /**
   * 이메일 인증 완료
   * POST /email-verification/verify
   * Body: { token: string }
   *
   * @authPolicy PUBLIC
   * 이메일 링크 클릭 흐름. 로그인 상태 무관, body 의 verification token 자체가
   * 인증 자료이므로 OrkisInterCeptor 우회가 본질.
   */
  @RequestMapping({
    route: "/verify",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async verifyEmail(@Body() body: { token: string }): Promise<any> {
    const { token } = body || {};
    try {
      if (!token) {
        return {
          success: false,
          message: "인증 토큰이 없습니다.",
          error: "TOKEN_MISSING"
        };
      }

      const result = await this.service.verifyEmail(token);

      return {
        success: true,
        message: "이메일 인증이 완료되었습니다.",
        data: result
      };
    } catch (error: any) {
      logger.error("이메일 인증 실패:", error);

      let errorCode = "VERIFICATION_FAILED";
      if (error.message?.includes("만료")) {
        errorCode = "TOKEN_EXPIRED";
      } else if (error.message?.includes("사용된")) {
        errorCode = "TOKEN_USED";
      } else if (error.message?.includes("유효하지")) {
        errorCode = "TOKEN_INVALID";
      }

      return {
        success: false,
        message: error.message || "이메일 인증에 실패했습니다.",
        error: errorCode
      };
    }
  }

  /**
   * 인증 상태 확인
   * GET /email-verification/status
   */
  @RequestMapping({
    route: "/status",
    method: REQUEST_METHOD.GET
  })
  async getVerificationStatus(@Session() session: any): Promise<any> {
    try {
      const loginInfo = session?.login_info;
      const userId = loginInfo?.USER_ID || loginInfo?.ID;

      if (!userId) {
        return {
          success: false,
          message: "로그인이 필요합니다.",
          error: "UNAUTHORIZED"
        };
      }

      const status = await this.service.getVerificationStatus(userId);

      return {
        success: true,
        data: status
      };
    } catch (error: any) {
      logger.error("인증 상태 조회 실패:", error);
      return {
        success: false,
        message: error.message || "인증 상태 조회에 실패했습니다.",
        error: "STATUS_CHECK_FAILED"
      };
    }
  }
}
