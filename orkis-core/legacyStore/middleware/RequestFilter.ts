// import { ExpressInterceptor } from "../../model/ExpressInterceptor";
// import {
//   IF_MODULE_TYPE,
//   IF_POINT_CUT,
//   INTERCEPTOR_OPTION
// } from "../../../static";
// import { ExpressMiddleware } from "../decorators";
// import path from "path";
// import PathUtil from "../../../utils/PathUtil";

// @ExpressMiddleware({
//   MODULE_TYPE: IF_MODULE_TYPE.REQUEST,
//   PATH: ["*"],
//   USE: true,
//   POINT_CUT: IF_POINT_CUT.FILTER
// })
// export class RequestFilter extends ExpressInterceptor {
//   public option?: INTERCEPTOR_OPTION;

//   public async func(): Promise<boolean | undefined> {
//     // logger.info("RequestFilter func --------------------- ");
//     // Implement the logic for func
//     if (!this.option || !this.option?.PATH) return false;

//     let pass: boolean = false;
//     // check request path with filter path
//     this.option?.PATH?.every((p) => {
//       path.normalize(path.normalize(p));
//       pass = PathUtil.pathMatch(p);
//       return !pass;
//     });

//     return pass;
//   }
// }
