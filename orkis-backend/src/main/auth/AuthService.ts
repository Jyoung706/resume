import logger from "@orkis/core/utils";
import { LoginType, UserInfo } from "@orkis-interface/backend";
import { USER_INFO } from "../types/compatibility";
import { OrkisError } from "../error/OrkisError";
import { ValidationError } from "../error/ValidationError";
import { AuthDao } from "@/auth/AuthDao";
import { AUTH_CODES } from "./constants/AuthConstants";
import bcrypt from "bcrypt";
import { Autowired, Service, Transactional } from "@orkis/core/common";

interface OAuthConfig {
  tokenUrl: string;
  userInfoUrl: string;
  oauthBaseUrl: string;
  contentType: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope?: string;
}

interface LoginRequest {
  username?: string;
  password?: string;
  code?: string;
  state?: string;
  provider?: string;
  loginType?: LoginType;
}

interface OAuthUserInfo {
  email?: string;
  name?: string;
  id?: string | number;
}

interface LoginResponse {
  userInfo: UserInfo;
  isNewUser?: boolean;
  requiresRegistration?: boolean;
}

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

@Service("AuthService")
export class AuthService {
  @Autowired("AuthDao")
  public authDao!: AuthDao;

  // OAuth 설정 맵
  private getOAuthConfig(provider: string): OAuthConfig {
    const configs: Record<string, OAuthConfig> = {
      naver: {
        tokenUrl: process.env.NAVER_TOKEN_URL || "",
        userInfoUrl: process.env.NAVER_USER_URL || "",
        oauthBaseUrl: process.env.NAVER_OAUTH_URL || "",
        contentType: "application/x-www-form-urlencoded",
        clientId: process.env.NAVER_CLIENT_ID || "",
        clientSecret: process.env.NAVER_CLIENT_SECRET || "",
        redirectUri: process.env.NAVER_CALLBACK_URL || ""
      },
      kakao: {
        tokenUrl: process.env.KAKAO_TOKEN_URL || "",
        userInfoUrl: process.env.KAKAO_USER_URL || "",
        oauthBaseUrl: process.env.KAKAO_OAUTH_URL || "",
        contentType: "application/x-www-form-urlencoded",
        clientId: process.env.KAKAO_CLIENT_ID || "",
        clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
        redirectUri: process.env.KAKAO_CALLBACK_URL || ""
      },
      google: {
        tokenUrl: process.env.GOOGLE_TOKEN_URL || "",
        userInfoUrl: process.env.GOOGLE_USER_URL || "",
        oauthBaseUrl: process.env.GOOGLE_OAUTH_URL || "",
        contentType: "application/x-www-form-urlencoded",
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirectUri: process.env.GOOGLE_CALLBACK_URL || "",
        scope: "openid email profile"
      }
    };

    const config = configs[provider];
    if (!config) {
      throw new OrkisError(`지원하지 않는 OAuth 프로바이더입니다: ${provider}`);
    }
    return config;
  }

  // OAuth 사용자 정보 파싱
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseOAuthUserInfo(
    provider: string,
    userInfoResponse: any
  ): OAuthUserInfo {
    switch (provider) {
      case "naver":
        return {
          email: userInfoResponse.response?.email,
          name: userInfoResponse.response?.name,
          id: userInfoResponse.response?.id
        };
      case "kakao":
        return {
          email: userInfoResponse.kakao_account?.email,
          name: userInfoResponse.properties?.nickname,
          id: userInfoResponse.id
        };
      case "google":
        return {
          email: userInfoResponse.email,
          name: userInfoResponse.name,
          id: userInfoResponse.sub || userInfoResponse.id
        };
      default:
        throw new OrkisError(`지원하지 않는 프로바이더입니다: ${provider}`);
    }
  }

  // OAuth URL 생성
  async generateOAuthUrl(provider: string, state: string): Promise<string> {
    const config = this.getOAuthConfig(provider);
    const params: Record<string, string> = {
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      state: state
    };

    if (config.scope) {
      params.scope = config.scope;
    }

    const searchParams = new URLSearchParams(params);
    return `${config.oauthBaseUrl}?${searchParams.toString()}`;
  }

  // 통합 로그인 처리
  async processLogin(request: LoginRequest): Promise<LoginResponse> {
    // Password 로그인
    if (request.username && request.password) {
      return await this.handlePasswordLogin(request);
    }

    // OAuth 로그인
    if (request.code && request.state && request.provider) {
      return await this.handleOAuthLogin(request);
    }

    throw new OrkisError("지원하지 않는 로그인 방식입니다.");
  }

  // 회원가입 체크가 포함된 로그인 처리
  async processLoginWithRegistrationCheck(
    request: LoginRequest
  ): Promise<LoginResponse> {
    const response = await this.processLogin(request);

    return {
      userInfo: response.userInfo,
      isNewUser: response.isNewUser || false,
      requiresRegistration: response.requiresRegistration || false
    };
  }

  // Password 로그인 처리
  private async handlePasswordLogin(
    request: LoginRequest
  ): Promise<LoginResponse> {
    const { username, password } = request;

    const dbUser = await this.authDao.getUserById(username!);

    if (!dbUser) {
      throw new OrkisError("로그인 정보가 일치하지 않습니다.");
    }

    if (!password) {
      throw new OrkisError("비밀번호가 필요합니다.");
    }

    const match = await bcrypt.compare(
      password,
      (dbUser as USER_INFO).PASSWORD || ""
    );

    if (!match) {
      throw new OrkisError("로그인 정보가 일치하지 않습니다.");
    }

    let userInfo: UserInfo = {
      ID: dbUser.ID,
      EMAIL: dbUser.EMAIL,
      NAME: dbUser.NAME,
      PHONE: dbUser.PHONE,
      LOGIN_TYPE: LoginType.PASSWORD,
      AUTH_CODE: "",
      EMAIL_VERIFIED: dbUser.EMAIL_VERIFIED
    };

    userInfo = await this.assignUserAuth(userInfo);

    return {
      userInfo
    };
  }

  // OAuth 로그인 처리
  private async handleOAuthLogin(
    request: LoginRequest
  ): Promise<LoginResponse> {
    const { code, state, provider } = request;
    const config = this.getOAuthConfig(provider!);

    const tokenParams: any = {
      grant_type: "authorization_code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code: code
    };

    // 카카오는 state를 토큰 요청에 포함하지 않음
    if (provider !== "kakao") {
      tokenParams.state = state;
    }

    if (config.clientSecret) {
      tokenParams.client_secret = config.clientSecret;
    }

    const tokenRes = await api.post(
      config.tokenUrl,
      new URLSearchParams(tokenParams).toString(),
      {
        headers: {
          "Content-Type": config.contentType
        }
      }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      throw new OrkisError(
        "Access token을 받지 못했습니다: " + JSON.stringify(tokenRes.data)
      );
    }

    const userInfoRes = await api.get(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const socialUserInfo = this.parseOAuthUserInfo(provider!, userInfoRes.data);

    const existingUser = await this.authDao.getUserByEmail(
      socialUserInfo.email || "",
      provider
    );

    // 신규 사용자인 경우
    if (!existingUser) {
      const tempUserInfo: UserInfo = {
        ID: "",
        EMAIL: socialUserInfo.email,
        NAME: socialUserInfo.name || "",
        PHONE: "",
        LOGIN_TYPE: provider as LoginType,
        AUTH_CODE: "",
        EMAIL_VERIFIED: false, // 신규 사용자는 이메일 미인증 상태
        isNewUser: true,
        socialId: String(socialUserInfo.id),
        socialProvider: provider
      } as UserInfo & {
        isNewUser: boolean;
        socialId: string;
        socialProvider: string;
      };

      return {
        userInfo: tempUserInfo as UserInfo,
        isNewUser: true,
        requiresRegistration: true
      };
    }

    let userInfo: UserInfo = {
      ID: existingUser.ID,
      EMAIL: existingUser.EMAIL,
      NAME: existingUser.NAME,
      PHONE: existingUser.PHONE,
      LOGIN_TYPE: provider as LoginType,
      AUTH_CODE: "",
      EMAIL_VERIFIED: existingUser.EMAIL_VERIFIED
    };

    userInfo = await this.assignUserAuth(userInfo);

    return {
      userInfo
    };
  }

  // 사용자 권한 할당
  private async assignUserAuth(userInfo: UserInfo): Promise<UserInfo> {
    if (!userInfo.ID) {
      userInfo.AUTH_CODE = AUTH_CODES.GENERAL;
      return userInfo;
    }

    const strictMode = process.env.STRICT_ASSIGN_USER_AUTH === "true";

    if (strictMode) {
      const authResult = await this.authDao.getUserAuth(userInfo);
      userInfo.AUTH_CODE = authResult?.AUTH_CODE || AUTH_CODES.GENERAL;
    } else {
      try {
        const authResult = await this.authDao.getUserAuth(userInfo);
        userInfo.AUTH_CODE = authResult?.AUTH_CODE || AUTH_CODES.GENERAL;
      } catch (error) {
        logger.error("getUserAuth 실패 (구 동작: fallback)", error);
        userInfo.AUTH_CODE = AUTH_CODES.GENERAL;
      }
    }
    return userInfo;
  }

  // 기존 LoginController와의 호환성을 위한 메서드
  async commonLoginProcess(
    token: string,
    userParam: USER_INFO
  ): Promise<UserInfo> {
    const loginRequest: LoginRequest = {
      username: userParam.ID,
      password: userParam.PASSWORD,
      loginType: userParam.LOGIN_TYPE as LoginType,
      code: (userParam as any).code,
      state: (userParam as any).state
    };

    const response = await this.processLogin(loginRequest);
    return response.userInfo;
  }

  @Transactional()
  // 모든 권한 정보 조회
  async getAllAuthInfo(): Promise<any[]> {
    try {
      return await this.authDao.getAllAuthInfo();
    } catch (error) {
      logger.error("권한 정보 조회 실패:", error);
      throw new OrkisError("권한 정보 조회에 실패했습니다.");
    }
  }

  @Transactional()
  // 아이디 중복 확인
  async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const user = await this.authDao.getUserByUsername(username);
      return !!user;
    } catch (error) {
      logger.error("아이디 중복 확인 실패:", error);
      return false;
    }
  }

  @Transactional()
  // 사용자 존재 여부 확인 (이메일)
  async checkUserExists(email: string): Promise<boolean> {
    try {
      const user = await this.authDao.getUserByEmail(email);
      return !!user;
    } catch (error) {
      logger.error("사용자 존재 확인 실패:", error);
      return false;
    }
  }

  @Transactional()
  // 새 사용자 등록
  async registerUser(
    userInfo: any
  ): Promise<UserInfo & { USER_TYPE?: string }> {
    try {
      const initialQuestionCount = getInitialQuestionCount();
      const newUser: USER_INFO = {
        ID: userInfo.id,
        EMAIL: userInfo.email,
        NAME: userInfo.name,
        PHONE: userInfo.phone || "",
        LOGIN_TYPE: userInfo.loginType as LoginType,
        PASSWORD: userInfo.password,
        USER_TYPE: userInfo.userType,
        SOCIAL_ID: userInfo.socialId,
        SOCIAL_PROVIDER: userInfo.socialProvider ?? null, // Step 1: controller에서 명시 전달
        QUESTION_COUNT: initialQuestionCount,
        CREATED_AT: new Date().toISOString(),
        UPDATED_AT: new Date().toISOString(),
        ADDITIONAL_INFO: userInfo.additionalInfo || {}
      };

      await this.authDao.saveUser(newUser);
      await this.authDao.saveUserLicense(String(newUser.ID), newUser.USER_TYPE);

      const userInfoResult: UserInfo & { USER_TYPE?: string } = {
        ID: newUser.ID,
        EMAIL: newUser.EMAIL!,
        NAME: newUser.NAME,
        PHONE: newUser.PHONE,
        LOGIN_TYPE: newUser.LOGIN_TYPE,
        AUTH_CODE: "",
        USER_TYPE: newUser.USER_TYPE,
        EMAIL_VERIFIED: false // 신규 사용자는 이메일 미인증 상태
      };

      // 권한 정보 할당 (assignUserAuth가 AUTH_CODE 보장 - 기본값 "1")
      return await this.assignUserAuth(userInfoResult);
    } catch (error) {
      logger.error("사용자 등록 실패:", error);
      throw new OrkisError("사용자 등록에 실패했습니다.");
    }
  }

  // 지원하는 로그인 타입 조회
  async getSupportedLoginTypes(): Promise<string[]> {
    return [
      LoginType.PASSWORD,
      LoginType.NAVER,
      LoginType.KAKAO,
      LoginType.GOOGLE
    ];
  }

  // 질문 횟수 조회
  @Transactional()
  async getQuestionCount(userId: string): Promise<number> {
    try {
      return await this.authDao.getQuestionCount(userId);
    } catch (error) {
      logger.error("질문 횟수 조회 실패:", error);
      throw new OrkisError("질문 횟수 조회에 실패했습니다.");
    }
  }

  // 질문 횟수 차감
  @Transactional()
  async decrementQuestionCount(userId: string): Promise<number> {
    try {
      return await this.authDao.decrementQuestionCount(userId);
    } catch (error) {
      logger.error("질문 횟수 차감 실패:", error);
      throw new OrkisError("질문 횟수 차감에 실패했습니다.");
    }
  }

  // 비밀번호 변경
  @Transactional()
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. 사용자 정보 조회
      const user = await this.authDao.getUserById(userId);
      if (!user) {
        throw new ValidationError("사용자를 찾을 수 없습니다.");
      }

      // 2. 소셜 로그인 사용자 체크
      const loginType = (user as any).LOGIN_TYPE?.toUpperCase() || "";
      if (loginType && loginType !== "PASSWORD") {
        throw new ValidationError(
          "소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다."
        );
      }

      // 3. 현재 비밀번호 확인
      const storedPassword = (user as USER_INFO).PASSWORD || "";
      if (!storedPassword) {
        throw new ValidationError("비밀번호가 설정되어 있지 않습니다.");
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        storedPassword
      );
      if (!isCurrentPasswordValid) {
        throw new ValidationError("현재 비밀번호가 일치하지 않습니다.");
      }

      // 4. 새 비밀번호 유효성 검사
      if (newPassword.length < 8) {
        throw new ValidationError("새 비밀번호는 8자 이상이어야 합니다.");
      }

      // 5. 새 비밀번호 해시화 및 저장
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      const updated = await this.authDao.updatePassword(userId, hashedPassword);

      if (!updated) {
        throw new ValidationError("비밀번호 업데이트에 실패했습니다.");
      }
      return {
        success: true,
        message: "비밀번호가 성공적으로 변경되었습니다."
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error("비밀번호 변경 실패:", error);
      throw new ValidationError("비밀번호 변경에 실패했습니다.");
    }
  }
}
