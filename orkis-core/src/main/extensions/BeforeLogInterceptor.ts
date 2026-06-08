import { BaseInterceptor } from "../application";
import { IF_POINT_CUT, Interceptor } from "../core";

/**
 * @description 코어 자체 기능 확장 예시코드
 */
@Interceptor({
  POINT_CUT: IF_POINT_CUT.BEFORE,
  PRIORITY: 1,
  USE: false
})
export class BeforeLogInterceptor extends BaseInterceptor {
  public async handle(req: any, res: any, error?: any): Promise<void> {
    console.log("here is before and core extensions");
  }
}
