import { Autowired, Component } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { v4 as uuidv4 } from "uuid";
import { LoginType } from "@orkis-interface/backend";
import { OAuthState } from "@/types/compatibility";
import { SessionStorageService } from "./SessionStorageService";

@Component("StateManagerService")
export class StateManagerService {
  @Autowired("SessionStorageService")
  private sessionStorage!: SessionStorageService;

  // state 저장
  async saveState(state: string, provider: LoginType): Promise<void> {
    const data: OAuthState = {
      provider: provider.toString(),
      state,
      createdAt: Date.now(),
      metadata: {}
    };
    await this.sessionStorage.saveData(`auth:state:${state}`, data, 300); // TTL 5분
  }

  // state 존재 확인
  async checkState(state: string): Promise<boolean> {
    return this.sessionStorage.exists(`auth:state:${state}`);
  }

  // state 정보 조회
  async getStateInfo(state: string): Promise<OAuthState | null> {
    return await this.sessionStorage.readData(`auth:state:${state}`);
  }

  // state 제거
  async removeState(state: string): Promise<boolean> {
    return await this.sessionStorage.deleteData(`auth:state:${state}`);
  }

  // token 정보 조회
  async getTokenInfo(token: string): Promise<any | null> {
    return await this.sessionStorage.readData(`auth:token:${token}`);
  }

  // token 제거
  async removeToken(token: string): Promise<boolean> {
    return await this.sessionStorage.deleteData(`auth:token:${token}`);
  }

  // token 존재 확인
  async checkToken(token: string): Promise<boolean> {
    return this.sessionStorage.exists(`auth:token:${token}`);
  }

  // 로그인 처리 후 accessToken 발급
  async loginHandler(userInfo: any): Promise<string> {
    const accessToken = uuidv4();
    // 환경변수에서 토큰 TTL 가져오기 (기본값: 3600초 = 1시간)
    const tokenTtl = parseInt(process.env.TOKEN_TTL || "3600");
    await this.sessionStorage.saveData(`auth:token:${accessToken}`, userInfo, tokenTtl);
    return accessToken;
  }
}
