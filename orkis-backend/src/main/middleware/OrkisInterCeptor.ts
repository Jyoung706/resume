import logger from "@orkis/core/utils";
import { OrkisError } from "../error/OrkisError";
import { BaseInterceptor, Request } from "@orkis/core/application";
import {
  Autowired,
  FILTER_TYPES,
  IF_MODULE_TYPE,
  IF_POINT_CUT,
  Interceptor
} from "@orkis/core/common";
import { StateManagerService } from "../utils/StateManagerService";

@Interceptor({
  MODULE_TYPE: IF_MODULE_TYPE.REQUEST,
  PATH: ["/*"],
  USE: true,
  POINT_CUT: IF_POINT_CUT.FILTER,
  PRIORITY: 1
})
export default class OrkisInterCeptor extends BaseInterceptor {
  @Autowired("StateManagerService")
  private stateManager!: StateManagerService;

  public async handle(req: Request, res: Response): Promise<void> {
    try {
      // requestType 이 NONE 일 경우 권한 및 세션 체크 없이 진행.
      const requestMappingInfo = req.context?.requestMapping;

      if (
        !!requestMappingInfo &&
        requestMappingInfo.filteredType === FILTER_TYPES.NONE
      ) {
        return;
      }

      // 토큰으로부터 세션 복원 시도
      const authHeader = req.headers["authorization"];
      let shouldContinue = true;

      if (authHeader && typeof authHeader === "string") {
        const token = authHeader.split(" ")[1];
        if (token) {
          const tokenYn: boolean = await this.stateManager.checkToken(token);
          if (tokenYn) {
            // 토큰이 유효하면 토큰 정보로 세션 복원 시도
            const tokenInfo = await this.stateManager.getTokenInfo(token);
            if (tokenInfo && (!req.session || !req.session.login_info)) {
              // 토큰 정보로 세션 복원
              if (req.session) {
                req.session.login_info = tokenInfo;
              }
            }
          } else {
            shouldContinue = false;
          }
        }
      }

      // 세션 체크 (토큰으로 복원 후)
      if (!req.session || !req.session.login_info) {
        const errResult = {
          statusCode: 401,
          type: "Error",
          message: "Session 이 종료 되었습니다"
        };
        throw new OrkisError("Session 이 종료 되었습니다", errResult);
      }

      if (!shouldContinue) {
        const errResult = {
          statusCode: 401,
          type: "Error",
          message: "유효하지 않은 인증 토큰입니다"
        };

        throw new OrkisError("유효하지 않은 인증 토큰입니다", errResult);
      }

      // 토큰 형식 체크 (이미 위에서 토큰 유효성은 검증함)
      if (authHeader) {
        const token = authHeader.split(" ")[1];
        if (!token) {
          const errResult = {
            statusCode: 401,
            type: "Error",
            message: "인증 토큰 형식이 올바르지 않습니다"
          };

          throw new OrkisError("인증 토큰 형식이 올바르지 않습니다", errResult);
        }
      }

      // 모든 검증 통과
      return;
    } catch (error) {
      if (error instanceof OrkisError) {
        throw error;
      }
      logger.error("OrkisInterCeptor unexpected error:", error);
      const errResult = {
        statusCode: 500,
        type: "Error",
        message: "인증 처리 중 오류가 발생했습니다"
      };
      throw new OrkisError("인증 처리 중 오류가 발생했습니다", errResult);
    }
  }
}
