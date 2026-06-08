import { BaseInterceptor, Request, Response } from "../../../main/application";
import { IF_MODULE_TYPE, IF_POINT_CUT, Interceptor } from "../../../main/core";

@Interceptor({
  MODULE_TYPE: IF_MODULE_TYPE.REQUEST,
  USE: true,
  POINT_CUT: IF_POINT_CUT.EXCEPTION
})
export class ExceptionInterceptor extends BaseInterceptor {
  async handle(req: Request, res: Response, error: any) {
    if (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        detail: {
          name: error.name,
          message: error.message
        },
        result: "exception response"
      });
    }
  }
}
