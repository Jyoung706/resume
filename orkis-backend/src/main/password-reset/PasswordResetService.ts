/**
 * 비밀번호 재설정 서비스
 * 비밀번호 재설정 요청 및 처리
 */

import { Autowired, Service } from "@orkis/core/common";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { PasswordResetDao } from "@/password-reset/PasswordResetDao";
import { EmailService } from "../email/EmailService";
import { OrkisError } from "../error/OrkisError";

export interface ResetTokenInfo {
  tokenValid: boolean;
  email: string;
  expiresAt: Date;
}

export interface ResetResult {
  email: string;
  changedAt: Date;
}

// 이메일 미인증 사용자 에러
export class EmailNotVerifiedError extends OrkisError {
  public code: string = "EMAIL_NOT_VERIFIED";

  constructor(message: string = "이메일 인증이 완료되지 않았습니다.") {
    super(message);
    this.name = "EmailNotVerifiedError";
  }
}

// 소셜 로그인 계정 에러
export class SocialLoginAccountError extends OrkisError {
  public code: string = "SOCIAL_LOGIN_ACCOUNT";
  public provider: string;

  constructor(provider: string) {
    const providerNames: Record<string, string> = {
      google: "Google",
      kakao: "Kakao",
      naver: "Naver"
    };
    const providerName = providerNames[provider] || provider;
    super(
      `${providerName} 소셜 로그인 계정입니다. 비밀번호 재설정 대신 ${providerName} 로그인을 이용해주세요.`
    );
    this.name = "SocialLoginAccountError";
    this.provider = provider;
  }
}

@Service("PasswordResetService")
export class PasswordResetService {
  @Autowired("PasswordResetDao")
  private dao!: PasswordResetDao;

  @Autowired("EmailService")
  private emailService!: EmailService;

  private readonly SALT_ROUNDS = 10;
  private readonly MIN_PASSWORD_LENGTH = 8;

  /**
   * 비밀번호 재설정 요청
   * - 소셜 로그인 계정 여부 확인
   * - 이메일 인증 여부 확인
   * - 기존 미사용 토큰 무효화
   * - 새 토큰 생성 (1시간 유효)
   * - 재설정 이메일 발송
   */
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // 사용자 조회
    const user = await this.dao.findUserByEmail(email);
    if (!user) {      throw new OrkisError("존재하지 않는 이메일입니다.");
    }

    // 소셜 로그인 계정 확인
    // [중요] 소셜 로그인 계정은 비밀번호 재설정 불가
    // 일반 로그인 타입: local, password
    const localLoginTypes = ["password"];
    if (user.login_type && !localLoginTypes.includes(user.login_type)) {
      throw new SocialLoginAccountError(user.login_type);
    }

    // 이메일 인증 확인
    // [중요] 미인증 사용자에게는 비밀번호 재설정 이메일을 발송하지 않음
    if (!user.email_verified) {      throw new EmailNotVerifiedError(
        "이메일 인증이 완료되지 않아 비밀번호 재설정 메일을 발송할 수 없습니다."
      );
    }

    // 기존 미사용 토큰 무효화
    await this.dao.deleteUnusedTokensByUserId(user.id);

    // 새 토큰 생성 (1시간 유효)
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // 토큰 저장
    await this.dao.createToken({
      userId: user.id,
      token,
      expiresAt,
      ipAddress,
      userAgent
    });

    // 비밀번호 재설정 이메일 발송
    await this.emailService.sendPasswordReset(
      email,
      token,
      user.name || "사용자"
    );  }

  /**
   * 토큰 유효성 검증
   */
  async verifyResetToken(token: string): Promise<ResetTokenInfo> {
    const tokenRecord = await this.dao.findByToken(token);

    if (!tokenRecord) {
      throw new OrkisError("유효하지 않은 재설정 링크입니다.");
    }

    // 만료 확인
    if (new Date() > new Date(tokenRecord.expires_at)) {
      throw new OrkisError("재설정 링크가 만료되었습니다. 다시 요청해주세요.");
    }

    // 이미 사용됨 확인
    if (tokenRecord.used_at) {
      throw new OrkisError("이미 사용된 재설정 링크입니다.");
    }

    return {
      tokenValid: true,
      email: tokenRecord.email || "",
      expiresAt: new Date(tokenRecord.expires_at)
    };
  }

  /**
   * 비밀번호 재설정
   * - 토큰 유효성 검증
   * - 비밀번호 일치 확인
   * - 비밀번호 암호화 및 저장
   */
  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<ResetResult> {
    // 비밀번호 일치 확인
    if (newPassword !== confirmPassword) {
      throw new OrkisError("비밀번호가 일치하지 않습니다.");
    }

    // 비밀번호 강도 검증
    if (newPassword.length < this.MIN_PASSWORD_LENGTH) {
      throw new OrkisError(
        `비밀번호는 최소 ${this.MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
      );
    }

    // 토큰 검증
    const tokenRecord = await this.dao.findByToken(token);
    if (!tokenRecord) {
      throw new OrkisError("유효하지 않은 재설정 링크입니다.");
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      throw new OrkisError("재설정 링크가 만료되었습니다.");
    }

    if (tokenRecord.used_at) {
      throw new OrkisError("이미 사용된 재설정 링크입니다.");
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // 비밀번호 업데이트
    await this.dao.updatePassword(tokenRecord.user_id, hashedPassword);

    // 토큰 사용 처리
    await this.dao.markAsUsed(token);

    const changedAt = new Date();    return {
      email: tokenRecord.email || "",
      changedAt
    };
  }
}
