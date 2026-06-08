import { LoginType } from "@orkis-interface/backend";
import {
  Autowired,
  Body,
  Controller,
  FILTER_TYPES,
  MONITOR_LOGGER_TYPES,
  Param,
  Req,
  REQUEST_METHOD,
  RequestMapping,
  Res,
  Session
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { EmailVerificationService } from "../email-verification/EmailVerificationService";
import { OrkisError } from "../error/OrkisError";
import { USER_INFO } from "../types/compatibility";
import { StateManagerService } from "../utils/StateManagerService";
import { AuthService } from "./AuthService";
import { ALLOWED_USER_TYPES, UserType } from "./constants/AuthConstants";

@Controller({ path: "/auth" })
export class LoginController {
  @Autowired("AuthService")
  public authService!: AuthService;

  @Autowired("EmailVerificationService")
  private emailVerificationService!: EmailVerificationService;

  @Autowired("StateManagerService")
  private stateManager!: StateManagerService;

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-front/src/stores/authStore.ts - logout() 메서드 (208번째 줄)
  //            orkis-front/src/stores/sessionStore.ts - terminateSession() 메서드 (98번째 줄)
  @RequestMapping({ route: "/logout", filteredType: FILTER_TYPES.NONE })
  async logout(
    @Param("token") token: string,
    @Session() sessionObj: any,
    @Res() res: any
  ): Promise<any> {
    // 토큰이 있을 때만 Redis에서 제거 (desktop 경로)
    if (token) {
      await this.stateManager.removeToken(token);
    }

    return new Promise((resolve, reject) => {
      sessionObj.destroy((err: Error | null) => {
        if (err) {
          logger.error("세션 삭제 실패", err);
          return reject(new OrkisError("로그아웃 실패"));
        }
        // SessionPlugin 쿠키 설정과 동일한 옵션으로 삭제
        res.clearCookie("connect.sid", {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production"
        });
        resolve(true);
      });
    });
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-front-design/src/logic/common/auth/authStore.ts - checkAuth()
  // 쿠키 기반 현재 사용자 정보 반환 (Phase 2)
  @RequestMapping({
    route: "/me",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.NONE
  })
  async me(@Session() session: any): Promise<any> {
    if (!session || !session.login_info) {
      throw new OrkisError("인증이 필요합니다.");
    }
    return { user: session.login_info };
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-front/src/stores/authStore.ts - login() 메서드 (143번째 줄)
  // 통합 인증 처리 로직 (내부 메소드)
  @RequestMapping({
    route: "/login",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async processAuthentication(
    @Body() body: any,
    @Session() session: any,
    @Req() req: any
  ): Promise<any> {
    const { username, password, code, state } = body;
    const clientIp = req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";
    try {
      let userInfo: any;
      let token: string;

      // OAuth 콜백인 경우 (code와 state가 있음)
      if (code && state) {
        userInfo = await this.processOAuthCallback(code, state);

        // 신규 사용자인 경우 회원가입 필요 응답 반환
        if (userInfo.isNewUser) {
          return {
            isNewUser: true,
            requiresRegistration: true,
            userInfo: {
              email: userInfo.EMAIL,
              name: userInfo.NAME,
              provider: userInfo.socialProvider,
              socialId: userInfo.socialId
            },
            state: state // 회원가입 완료 후 사용하기 위해 state 유지
          };
        }

        // 기존 사용자인 경우에만 토큰 발급
        token = await this.stateManager.loginHandler(userInfo);
        await this.stateManager.removeState(state);
      }
      // 일반 로그인인 경우 (username과 password가 있음)
      else if (username && password) {
        const userdata: USER_INFO = {
          ID: username,
          PASSWORD: password,
          NAME: "",
          LOGIN_TYPE: LoginType.PASSWORD,
          QUESTION_COUNT: 0
        };

        // 먼저 로그인 처리하여 userInfo를 가져옴
        const tempToken = Math.random().toString(36).substring(2);
        userInfo = await this.authService.commonLoginProcess(
          tempToken,
          userdata
        );

        if (!userInfo) {
          throw new OrkisError("로그인 에러");
        }

        // loginHandler를 통해 정식 토큰 발급 및 저장
        token = await this.stateManager.loginHandler(userInfo);
      } else {
        throw new OrkisError("필수 파라미터가 없습니다.");
      }

      // 기존 사용자만 세션에 로그인 정보 저장 (신규 사용자는 저장하지 않음)
      if (userInfo && session && !userInfo.isNewUser) {
        session.login_info = userInfo;
        session.save();
      }

      return { token, loginInfo: userInfo };
    } catch (error: any) {
      throw error;
    }
  }

  // OAuth 콜백 처리 private 메소드
  private async processOAuthCallback(
    code: string,
    state: string
  ): Promise<any> {
    const exists = await this.stateManager.checkState(state);

    if (!exists) {
      throw new OrkisError("유효하지 않은 state입니다.");
    }

    const info = await this.stateManager.getStateInfo(state);
    if (!info) {
      throw new OrkisError("정상적인 로그인 요청이 아닙니다.");
    }

    // 새로운 핸들러 방식으로 처리
    const loginRequest = {
      code: code,
      state: state,
      provider: info.provider
    };

    const loginResponse =
      await this.authService.processLoginWithRegistrationCheck(loginRequest);

    // 신규 사용자인 경우 회원가입 필요 정보와 함께 반환
    if (loginResponse.isNewUser) {
      return {
        ...loginResponse.userInfo,
        isNewUser: true,
        requiresRegistration: true
      };
    }

    return loginResponse.userInfo;
  }
  @RequestMapping({
    route: "/loginCheck",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE,
    serviceLogType: MONITOR_LOGGER_TYPES.SELECT
  })
  async oauthCallback(
    @Body() body: any,
    @Session() session: any
  ): Promise<any> {
    const { code, state } = body;

    try {
      if (!code || !state) {
        throw new OrkisError("OAuth 콜백에 필요한 code 또는 state가 없습니다.");
      }

      const userInfo = await this.processOAuthCallback(code, state);
      // 신규 사용자인 경우 회원가입 필요 응답 반환
      if (userInfo.isNewUser) {
        // state는 유지하여 나중에 회원가입 완료 후 사용
        const responseData = {
          isNewUser: true,
          requiresRegistration: true,
          userInfo: {
            email: userInfo.EMAIL,
            name: userInfo.NAME,
            provider: userInfo.socialProvider,
            socialId: userInfo.socialId
          },
          state: state // 회원가입 완료 후 사용하기 위해 state 유지
        };
        return responseData;
      }

      // 기존 사용자인 경우 정상 로그인 처리
      const token = await this.stateManager.loginHandler(userInfo);
      await this.stateManager.removeState(state);

      // 세션에 로그인 정보 저장
      if (session) {
        session.login_info = userInfo;
        session.save();
      }

      const responseData = { token, loginInfo: userInfo };
      return responseData;
    } catch (error) {
      logger.error("OAuth 콜백 처리 실패:", error);
      throw error;
    }
  }
  // OAuth 인증 시작점 (기존 oauth 메소드 유지)
  @RequestMapping({
    route: "/oauthToken",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE,
    serviceLogType: MONITOR_LOGGER_TYPES.SELECT
  })
  async oauth(@Body() body: any, @Res() res: any): Promise<any> {
    const state = Math.random().toString(36).substring(2);

    let provider: LoginType = LoginType.PASSWORD;
    let redirectUrl: string = "";

    switch (body.type) {
      case "naver":
        provider = LoginType.NAVER;
        redirectUrl = this.buildOAuthUrl({
          baseUrl: process.env.NAVER_OAUTH_URL || "",
          response_type: "code",
          client_id: process.env.NAVER_CLIENT_ID || "",
          redirect_uri: process.env.NAVER_CALLBACK_URL || "",
          state: state
        });
        break;
      case "kakao":
        provider = LoginType.KAKAO;
        redirectUrl = this.buildOAuthUrl({
          baseUrl: process.env.KAKAO_OAUTH_URL || "",
          response_type: "code",
          client_id: process.env.KAKAO_CLIENT_ID || "",
          redirect_uri: process.env.KAKAO_CALLBACK_URL || "",
          state: state
        });
        break;
      case "google":
        provider = LoginType.GOOGLE;
        redirectUrl = this.buildOAuthUrl({
          baseUrl: process.env.GOOGLE_OAUTH_URL || "",
          response_type: "code",
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          redirect_uri: process.env.GOOGLE_CALLBACK_URL || "",
          state: state,
          scope: "openid email profile"
        });
        break;
      default:
        throw new OrkisError("지원하지 않는 OAuth 타입입니다.");
    }
    if (redirectUrl) {
      await this.stateManager.saveState(state, provider);
      return { url: redirectUrl };
    } else {
      throw new OrkisError("OAuth URL 생성에 실패했습니다.");
    }
  }

  // OAuth URL 생성 헬퍼 메서드
  private buildOAuthUrl(params: {
    baseUrl: string;
    response_type?: string;
    client_id?: string;
    redirect_uri?: string;
    state?: string;
    scope?: string;
  }): string {
    const queryParams = new URLSearchParams();
    if (params.response_type)
      queryParams.append("response_type", params.response_type);
    if (params.client_id) queryParams.append("client_id", params.client_id);
    if (params.redirect_uri)
      queryParams.append("redirect_uri", params.redirect_uri);
    if (params.state) queryParams.append("state", params.state);
    if (params.scope) queryParams.append("scope", params.scope);

    return `${params.baseUrl}?${queryParams.toString()}`;
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-front-design — useSessionRefresh 훅 (세션 갱신)
  //            orkis-desktop — orkis-front 토큰 갱신
  // 세션/토큰 갱신 API (web: 세션 전용, desktop: 토큰 + 세션)
  @RequestMapping({
    route: "/refresh",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async refreshToken(@Body() body: any, @Session() session: any): Promise<any> {
    try {
      const { token: currentToken } = body;

      if (currentToken) {
        // --- desktop 경로: 토큰으로 세션 복원 + 토큰 갱신 ---
        // FILTER_TYPES.NONE으로 인터셉터가 스킵되므로 여기서 직접 세션 복원
        const tokenInfo = await this.stateManager.getTokenInfo(currentToken);
        if (!tokenInfo) {
          throw new OrkisError("유효하지 않은 토큰입니다.");
        }

        // 토큰 정보로 세션 복원
        if (!session.login_info) {
          session.login_info = tokenInfo;
        }

        // 새 토큰 발급 + 기존 토큰 제거
        const newToken = await this.stateManager.loginHandler(session.login_info);
        await this.stateManager.removeToken(currentToken);

        session.login_info.lastRefreshed = new Date().toISOString();
        session.save();

        return {
          token: newToken,
          expiresIn: parseInt(process.env.TOKEN_TTL || "3600"),
          refreshedAt: Date.now(),
          loginInfo: session.login_info
        };
      }

      // --- web 경로: 세션만으로 갱신 ---
      if (!session || !session.login_info) {
        throw new OrkisError("유효한 세션이 없습니다.");
      }

      session.login_info.lastRefreshed = new Date().toISOString();
      session.save();

      return {
        expiresIn: parseInt(process.env.TOKEN_TTL || "3600"),
        refreshedAt: Date.now(),
        loginInfo: session.login_info
      };
    } catch (error: any) {
      logger.error("세션/토큰 갱신 실패", error);
      throw new OrkisError(`갱신 실패: ${error.message}`);
    }
  }

  // 호출 위치: orkis-front-design/src/logic/auth/signup/useSignup.ts (269-276)
  // 용도: OAuth 소셜 로그인 사용자의 회원가입 완료 처리
  // 소셜 로그인 사용자 회원가입 API
  @RequestMapping({
    route: "/register",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async registerSocialUser(
    @Body() body: any,
    @Session() session: any
  ): Promise<any> {

    try {
      const {
        email,
        name,
        phone,
        userType, // 사용자 요금제 (free/pro/admin)
        socialId,
        provider,
        state,
        additionalInfo // 추가 정보 (기업명, 부서 등)
      } = body;
      // 필수 정보 검증
      if (!email || !name || !socialId || !provider || !userType) {
        throw new OrkisError("필수 회원가입 정보가 누락되었습니다.");
      }

      // user_type 화이트리스트 검증
      const requestedUserType = (userType).toLowerCase() as UserType;
      if (!ALLOWED_USER_TYPES.includes(requestedUserType)) {
        throw new OrkisError(`허용되지 않은 user_type 값입니다: ${userType}`);
      }

      // 이메일 중복 체크
      const existingUser = await this.authService.checkUserExists(email);
      if (existingUser) {
        throw new OrkisError("이미 등록된 이메일입니다.");
      }

      // 사용자 등록
      const newUser = await this.authService.registerUser({
        id: additionalInfo.username,
        password: additionalInfo.username,
        email,
        name,
        phone: phone || "",
        userType: requestedUserType,
        loginType: provider, // naver, kakao, google (소문자 유지)
        socialId,
        socialProvider: provider, // Step 1: social_provider 컬럼 오염 방지 (문서 Step 1)
        additionalInfo
      });
      // 등록 성공 확인
      if (!newUser || !newUser.ID) {
        logger.error("[소셜 회원가입] 사용자 등록 실패");
        throw new OrkisError(
          "사용자 등록은 완료되었으나 로그인 정보를 가져올 수 없습니다."
        );
      }

      // 등록 성공 후 자동 로그인 처리
      const token = await this.stateManager.loginHandler(newUser);

      // 토큰 생성 확인
      if (!token) {
        throw new OrkisError("로그인 토큰 생성에 실패했습니다.");
      }

      // state가 있으면 제거
      if (state) {
        await this.stateManager.removeState(state);
      }

      // 세션에 로그인 정보 저장
      if (session) {
        session.login_info = newUser;
        session.save(); // 세션 저장 명시적 호출
      }

      // 로그 기록

      // 이메일이 있는 경우 인증 메일 자동 발송
      let emailVerificationSent = false;
      if (email) {
        try {
          await this.emailVerificationService.requestEmailVerification(
            newUser.ID
          );
          emailVerificationSent = true;
        } catch (emailError: any) {
          // 이메일 발송 실패해도 회원가입은 성공으로 처리
        }
      }

      return {
        success: true,
        token,
        loginInfo: newUser,
        message: emailVerificationSent
          ? "회원가입이 완료되었습니다. 인증 메일이 발송되었으니 이메일을 확인해주세요."
          : "회원가입이 완료되었습니다. 자동으로 로그인되었습니다.",
        isNewUser: false, // 이미 등록 완료되었으므로 false
        requiresRegistration: false,
        emailVerificationSent
      };
    } catch (error: any) {
      throw new OrkisError(`회원가입 실패: ${error.message}`);
    }
  }

  // 호출 위치: orkis-front-design/src/logic/auth/signup/useSignup.ts
  // 아이디 중복 체크 API
  @RequestMapping({
    route: "/check-username",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async checkUsernameExists(@Body() body: any): Promise<any> {
    try {
      const { username } = body;

      if (!username) {
        throw new OrkisError("아이디가 필요합니다.");
      }

      const exists = await this.authService.checkUsernameExists(username);

      return {
        exists,
        available: !exists
      };
    } catch (error) {
      throw new OrkisError("아이디 확인 중 오류가 발생했습니다.");
    }
  }

  // 호출 위치: orkis-front-design/src/logic/auth/signup/useSignup.ts, useChangePassword.ts
  // 이메일 중복 체크 API
  @RequestMapping({
    route: "/check-email",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async checkEmailExists(@Body() body: any): Promise<any> {
    try {
      const { email } = body;

      if (!email) {
        throw new OrkisError("이메일이 필요합니다.");
      }

      const exists = await this.authService.checkUserExists(email);

      return {
        exists,
        available: !exists
      };
    } catch (error) {
      throw new OrkisError("이메일 확인 중 오류가 발생했습니다.");
    }
  }

  // 호출 위치: orkis-front-design/src/logic/auth/signup/useSignup.ts (279-288)
  // 용도: 일반 ID/PW 회원가입 처리
  // 일반 회원가입 API
  @RequestMapping({
    route: "/signup",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.NONE
  })
  async signupGeneralUser(
    @Body() body: any,
    @Session() session: any
  ): Promise<any> {
    try {
      const { username, password, name, email, phone, userType } = body;
      // 필수 정보 검증
      if (!username || !password || !name) {
        throw new OrkisError(
          "필수 정보(아이디, 비밀번호, 이름)가 누락되었습니다."
        );
      }

      // user_type 화이트리스트 검증
      const requestedUserType = (userType || "free").toLowerCase() as UserType;
      if (!ALLOWED_USER_TYPES.includes(requestedUserType)) {
        throw new OrkisError(`허용되지 않은 user_type 값입니다: ${userType}`);
      }

      // 아이디 중복 확인
      const usernameExists = await this.authService.checkUsernameExists(
        username
      );
      if (usernameExists) {
        throw new OrkisError("이미 사용 중인 아이디입니다.");
      }

      // 이메일 중복 확인 (이메일이 제공된 경우)
      if (email) {
        const emailExists = await this.authService.checkUserExists(email);
        if (emailExists) {
          throw new OrkisError("이미 가입된 이메일입니다.");
        }
      }

      // 비밀번호 해싱
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 10);

      // 사용자 등록
      const newUser = await this.authService.registerUser({
        id: username,
        password: hashedPassword,
        email: email || "",
        name,
        phone: phone || "",
        userType: requestedUserType,
        loginType: "password" as LoginType,
        socialId: "",
        socialProvider: null, // Step 1: 일반 가입자는 social_provider 미사용
        additionalInfo: {}
      });
      // 등록 성공 확인
      if (!newUser || !newUser.ID) {
        throw new OrkisError("사용자 등록에 실패했습니다.");
      }

      // 자동 로그인 처리
      const token = await this.stateManager.loginHandler(newUser);

      if (!token) {
        throw new OrkisError("로그인 토큰 생성에 실패했습니다.");
      }

      // 세션에 로그인 정보 저장
      if (session) {
        session.login_info = newUser;
        session.save();
      }
      // 이메일이 있는 경우 인증 메일 자동 발송
      let emailVerificationSent = false;
      if (email) {
        try {
          await this.emailVerificationService.requestEmailVerification(
            newUser.ID
          );
          emailVerificationSent = true;
        } catch (emailError: any) {
          // 이메일 발송 실패해도 회원가입은 성공으로 처리
        }
      }

      // 응답 데이터 (ResponseHandler가 success를 추가하므로 여기서는 제외)
      const responseData = {
        token,
        loginInfo: newUser,
        message: emailVerificationSent
          ? "회원가입이 완료되었습니다. 인증 메일이 발송되었으니 이메일을 확인해주세요."
          : "회원가입이 완료되었습니다. 자동으로 로그인되었습니다.",
        emailVerificationSent
      };

      return responseData;
    } catch (error: any) {
      logger.error("일반 회원가입 오류:", error);
      throw new OrkisError(error.message || "회원가입 중 오류가 발생했습니다.");
    }
  }

  // 질문 횟수 조회 API
  @RequestMapping({
    route: "/question-count",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION
  })
  async getQuestionCount(@Session() session: any): Promise<any> {
    try {
      if (!session || !session.login_info || !session.login_info.ID) {
        throw new OrkisError("로그인이 필요합니다.");
      }

      const userId = session.login_info.ID;
      const count = await this.authService.getQuestionCount(userId);

      return {
        questionCount: count
      };
    } catch (error: any) {
      logger.error("질문 횟수 조회 실패:", error);
      throw new OrkisError(error.message || "질문 횟수 조회에 실패했습니다.");
    }
  }

  // 비밀번호 변경 API
  @RequestMapping({
    route: "/change-password",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION
  })
  async changePassword(
    @Body() body: any,
    @Session() session: any
  ): Promise<any> {
    try {
      // 로그인 확인
      if (!session || !session.login_info || !session.login_info.ID) {
        throw new OrkisError("로그인이 필요합니다.");
      }

      const { currentPassword, newPassword, confirmPassword } = body;

      // 필수 필드 검증
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new OrkisError(
          "현재 비밀번호, 새 비밀번호, 비밀번호 확인을 모두 입력해주세요."
        );
      }

      // 새 비밀번호 확인 일치 검증
      if (newPassword !== confirmPassword) {
        throw new OrkisError(
          "새 비밀번호와 비밀번호 확인이 일치하지 않습니다."
        );
      }

      const userId = session.login_info.ID;
      // 비밀번호 변경 서비스 호출
      const result = await this.authService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      return result;
    } catch (error: any) {
      logger.error("비밀번호 변경 실패:", error);
      throw new OrkisError(error.message || "비밀번호 변경에 실패했습니다.");
    }
  }
}
