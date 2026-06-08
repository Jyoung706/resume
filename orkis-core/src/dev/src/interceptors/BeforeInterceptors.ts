import {
  BaseInterceptor,
  Request,
  Response,
  ValidationError
} from "../../../main/application";
import { IF_MODULE_TYPE, IF_POINT_CUT, Interceptor } from "../../../main/core";

@Interceptor({
  MODULE_TYPE: IF_MODULE_TYPE.REQUEST,
  USE: true,
  POINT_CUT: IF_POINT_CUT.BEFORE,
  EXCLUDE: ["/my/*"]
})
export class BeforeInterceptor extends BaseInterceptor {
  async handle(req: Request, res: Response, error: Error) {
    const { t } = req.query;
    console.log("Before executed");

    if (t === "false") {
      const error = new ValidationError("before exception filtered");
      error.statusCode = 444;
      throw error;
    }
    const user = {
      name: "kim",
      id: 1
    };

    req.context.user = user;
    return;
  }
}
