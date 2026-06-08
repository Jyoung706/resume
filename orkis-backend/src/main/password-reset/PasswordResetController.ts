/**
 * 비밀번호 재설정 컨트롤러
 * 비밀번호 재설정 API 엔드포인트
 */

import {
  Autowired,
  Body,
  Controller,
  FILTER_TYPES,
  Req,
  REQUEST_METHOD,
  RequestMapping
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import {
  EmailNotVerifiedError,
  PasswordResetService,
  SocialLoginAccountError
} from "./PasswordResetService";

@Controller({ path: "/password-reset" })
export class PasswordResetController {
  @Autowired("PasswordResetService")
  private service!: PasswordResetService;

  /**
   * 비밀번호 재설정 요청
   * POST /password-reset/request
   */
  @RequestMapping({
    route: "/request",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async requestPasswordReset(
    @Body() body: { email: string },
    @Req() req: any
  ): Promise<any> {
    try {
      const { email } = body;

      if (!email) {
        return {
          success: false,
          message: "이메일 주소를 입력해주세요.",
          error: "EMAIL_REQUIRED"
        };
      }

      // IP 주소 및 User-Agent 추출
      const ipAddress =
        req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";
      const userAgent = req?.headers?.["user-agent"] || "unknown";

      await this.service.requestPasswordReset(email, ipAddress, userAgent);

      return {
        success: true,
        message: "비밀번호 재설정 링크가 이메일로 발송되었습니다.",
        data: {
          email,
          expiresIn: "1시간"
        }
      };
    } catch (error: any) {
      logger.error("비밀번호 재설정 요청 실패:", error);

      // 소셜 로그인 계정 처리
      if (
        error instanceof SocialLoginAccountError ||
        error.code === "SOCIAL_LOGIN_ACCOUNT"
      ) {
        return {
          success: false,
          message: error.message,
          error: "SOCIAL_LOGIN_ACCOUNT",
          data: {
            isSocialAccount: true,
            provider: error.provider || "unknown"
          }
        };
      }

      // 이메일 미인증 사용자 처리
      if (
        error instanceof EmailNotVerifiedError ||
        error.code === "EMAIL_NOT_VERIFIED"
      ) {
        return {
          success: false,
          message: error.message,
          error: "EMAIL_NOT_VERIFIED",
          data: {
            emailVerified: false,
            requireVerification: true
          }
        };
      }

      // 이메일 없음
      if (error.message?.includes("존재하지 않는")) {
        return {
          success: false,
          message: error.message,
          error: "EMAIL_NOT_FOUND"
        };
      }

      return {
        success: false,
        message: error.message || "비밀번호 재설정 요청에 실패했습니다.",
        error: "RESET_REQUEST_FAILED"
      };
    }
  }

  /**
   * 토큰 유효성 검증
   * POST /password-reset/validate
   * Body: { token: string }
   */
  @RequestMapping({
    route: "/validate",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async verifyResetToken(@Body() body: { token: string }): Promise<any> {
    const { token } = body || {};
    try {
      if (!token) {
        return {
          success: false,
          message: "토큰이 없습니다.",
          error: "TOKEN_MISSING"
        };
      }

      const result = await this.service.verifyResetToken(token);

      return {
        success: true,
        message: "유효한 토큰입니다.",
        data: result
      };
    } catch (error: any) {
      logger.error("토큰 검증 실패:", error);

      let errorCode = "TOKEN_INVALID";
      if (error.message?.includes("만료")) {
        errorCode = "TOKEN_EXPIRED";
      } else if (error.message?.includes("사용된")) {
        errorCode = "TOKEN_USED";
      }

      return {
        success: false,
        message: error.message || "유효하지 않은 토큰입니다.",
        error: errorCode
      };
    }
  }

  /**
   * 비밀번호 재설정
   * POST /password-reset/reset
   */
  @RequestMapping({
    route: "/reset",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async resetPassword(
    @Body()
    body: {
      token: string;
      newPassword: string;
      confirmPassword: string;
    }
  ): Promise<any> {
    try {
      const { token, newPassword, confirmPassword } = body;

      if (!token) {
        return {
          success: false,
          message: "토큰이 없습니다.",
          error: "TOKEN_MISSING"
        };
      }

      if (!newPassword || !confirmPassword) {
        return {
          success: false,
          message: "비밀번호를 입력해주세요.",
          error: "PASSWORD_REQUIRED"
        };
      }

      const result = await this.service.resetPassword(
        token,
        newPassword,
        confirmPassword
      );

      return {
        success: true,
        message: "비밀번호가 성공적으로 변경되었습니다.",
        data: result
      };
    } catch (error: any) {
      logger.error("비밀번호 재설정 실패:", error);

      let errorCode = "RESET_FAILED";
      if (error.message?.includes("일치하지 않")) {
        errorCode = "PASSWORD_MISMATCH";
      } else if (error.message?.includes("최소")) {
        errorCode = "PASSWORD_TOO_SHORT";
      } else if (error.message?.includes("만료")) {
        errorCode = "TOKEN_EXPIRED";
      } else if (
        error.message?.includes("사용된") ||
        error.message?.includes("유효하지 않은")
      ) {
        errorCode = "TOKEN_INVALID";
      }

      return {
        success: false,
        message: error.message || "비밀번호 재설정에 실패했습니다.",
        error: errorCode
      };
    }
  }
}
