/**
 * 이메일 인증 서비스
 * 이메일 인증 요청 및 검증 처리
 */

import { Autowired, Service } from "@orkis/core/common";
import { v4 as uuidv4 } from "uuid";
import { EmailVerificationDao } from "@/email-verification/EmailVerificationDao";
import { EmailService } from "../email/EmailService";
import { OrkisError } from "../error/OrkisError";

export interface VerificationResult {
  email: string;
  verifiedAt: Date;
}

export interface VerificationStatus {
  email: string;
  emailVerified: boolean;
  verifiedAt?: Date;
}

@Service("EmailVerificationService")
export class EmailVerificationService {
  @Autowired("EmailVerificationDao")
  private dao!: EmailVerificationDao;

  @Autowired("EmailService")
  private emailService!: EmailService;

  /**
   * 이메일 인증 요청
   * - 기존 미사용 토큰 무효화
   * - 새 토큰 생성 (24시간 유효)
   * - 인증 이메일 발송
   */
  async requestEmailVerification(userId: string): Promise<void> {
    // 사용자 정보 조회
    const user = await this.dao.getUserInfo(userId);
    if (!user) {
      throw new OrkisError("사용자를 찾을 수 없습니다.");
    }

    if (!user.email) {
      throw new OrkisError("이메일 주소가 등록되어 있지 않습니다.");
    }

    if (user.email_verified) {
      throw new OrkisError("이미 이메일 인증이 완료되었습니다.");
    }

    // 기존 미사용 토큰 무효화
    await this.dao.deleteUnusedTokensByUserId(userId);

    // 새 토큰 생성 (24시간 유효)
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 토큰 저장
    await this.dao.createToken({
      userId,
      token,
      expiresAt
    });

    // 인증 이메일 발송
    await this.emailService.sendEmailVerification(
      user.email,
      token,
      user.name || "사용자"
    );  }

  /**
   * 이메일 인증 완료
   * - 토큰 유효성 검증
   * - 사용자 이메일 인증 상태 업데이트
   */
  async verifyEmail(token: string): Promise<VerificationResult> {
    // 토큰 조회
    const tokenRecord = await this.dao.findByToken(token);

    if (!tokenRecord) {
      throw new OrkisError("유효하지 않은 인증 링크입니다.");
    }

    // 만료 확인
    if (new Date() > new Date(tokenRecord.expires_at)) {
      throw new OrkisError(
        "인증 링크가 만료되었습니다. 환경설정에서 다시 요청해주세요."
      );
    }

    // 이미 사용됨 확인
    if (tokenRecord.used_at) {
      throw new OrkisError("이미 사용된 인증 링크입니다.");
    }

    // 이메일 인증 상태 업데이트
    const verifiedAt = new Date();
    await this.dao.updateUserEmailVerified(
      tokenRecord.user_id,
      true,
      verifiedAt
    );

    // 토큰 사용 처리
    await this.dao.markAsUsed(token);    return {
      email: tokenRecord.email || "",
      verifiedAt
    };
  }

  /**
   * 이메일 인증 상태 조회
   */
  async getVerificationStatus(userId: string): Promise<VerificationStatus> {
    const status = await this.dao.getVerificationStatus(userId);

    if (!status) {
      throw new OrkisError("사용자를 찾을 수 없습니다.");
    }

    return {
      email: status.email,
      emailVerified: status.email_verified,
      verifiedAt: status.email_verified_at || undefined
    };
  }
}
