import { IF_POINT_CUT } from "../../core/constants";
import { INTERCEPTOR_OPTION } from "../../core/types";

export abstract class ExpressInterceptor {
  public abstract option?: INTERCEPTOR_OPTION;
  public abstract func(): Promise<boolean | undefined>;

  public async match(): Promise<boolean | undefined> {
    let ret = await this.func();
    if (ret === undefined || ret === true) return true;
    return false;
  }

  public async intercept(req?: any, res?: any, next?: any) {
    try {
      if (this.option?.USE == false) {
        next();
        return;
      }

      if (!(await this.match())) {
        let pointCutSTr = "";
        switch (this.option?.POINT_CUT) {
          case IF_POINT_CUT.FILTER:
            pointCutSTr = "Filter";
            break;
          case IF_POINT_CUT.BEFORE:
            pointCutSTr = "Before";
            break;
          case IF_POINT_CUT.AFTER:
            pointCutSTr = "After";
            break;
          case IF_POINT_CUT.OUT:
            pointCutSTr = "Out";
            break;
          case IF_POINT_CUT.EXCEPTION:
            pointCutSTr = "Exception";
            break;
        }

        next(
          new Error(
            ` [MIDDLEWARE ERROR] type:${pointCutSTr}, module:${this.option?.MODULE_NAME}`
          )
        );
        return;
      }

      next();
    } catch (e) {
      next(e);
    }
  }
}
