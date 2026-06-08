import DiSupplier from "./DiSupplier";
import { ApplicationContext } from "../context";
import { Request } from "../@types";
// import {DefaultRequestSession} from "../session/DefaultRequestSession";

export class SessionDiSupplier extends DiSupplier {
  public async scopeDiSupplierWorker(
    rc: any,
    className?: string
  ): Promise<any> {
    // let session:any = await rc.request;
    if (!className) {
      return rc.getSession();
    }
    // let bean = applicationContext.findBean(className);
    let bean = ApplicationContext.getBean(className);
    if (bean) {
      return new bean.CLASS(rc.session);
    }
  }

  /**
   * 세션 객체 또는 특정 세션 키의 값을 반환합니다.
   * @param req Express Request 객체
   * @param sessionKey 특정 세션 키 (선택적)
   * @returns 세션 객체 또는 특정 키의 값
   */
  public static getSessionValue(req: Request, sessionKey?: string): any {
    if (!req.session) {
      return null;
    }
    return sessionKey ? req.session[sessionKey] : req.session;
  }
}
