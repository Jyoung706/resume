/**
 * 이메일 서비스
 * 이메일 인증 및 비밀번호 재설정 이메일 발송
 */

import { Autowired, Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { GraphEmailSender } from "./GraphEmailSender";
import { EmailTemplateService } from "./EmailTemplateService";

@Service("EmailService")
export class EmailService {
  @Autowired("GraphEmailSender")
  private graphSender!: GraphEmailSender;

  @Autowired("EmailTemplateService")
  private templateService!: EmailTemplateService;

  /**
   * 이메일 인증 메일 발송
   * 유효기간: 24시간
   */
  async sendEmailVerification(
    email: string,
    token: string,
    userName: string
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "https://orkis.kr";
    // 프론트엔드 라우트에 맞게 쿼리 파라미터 형식 사용
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    try {
      const htmlContent = await this.templateService.renderTemplate(
        "email-verification",
        {
          userName,
          verificationUrl,
          termsUrl: `${frontendUrl}/terms`,
          privacyUrl: `${frontendUrl}/privacy`
        }
      );

      await this.graphSender.sendEmail({
        to: email,
        subject: "ORKIS 이메일 인증",
        htmlContent,
        attachments: this.templateService.getTemplateAttachments()
      });    } catch (error) {
      logger.error(`이메일 인증 메일 발송 실패: ${email}`, error);
      throw error;
    }
  }

  /**
   * 비밀번호 재설정 메일 발송
   * 유효기간: 1시간
   */
  async sendPasswordReset(
    email: string,
    token: string,
    userName: string
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "https://orkis.kr";
    // 프론트엔드 라우트에 맞게 쿼리 파라미터 형식 사용
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    try {
      const htmlContent = await this.templateService.renderTemplate(
        "password-reset",
        {
          userName,
          resetUrl,
          expiresIn: "1시간",
          termsUrl: `${frontendUrl}/terms`,
          privacyUrl: `${frontendUrl}/privacy`
        }
      );

      await this.graphSender.sendEmail({
        to: email,
        subject: "ORKIS 비밀번호 재설정",
        htmlContent,
        attachments: this.templateService.getTemplateAttachments()
      });    } catch (error) {
      logger.error(`비밀번호 재설정 메일 발송 실패: ${email}`, error);
      throw error;
    }
  }
}
