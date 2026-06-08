// import path from "path";

// export default class PathUtil {
//   public static pathMatch(targetPath: string): boolean {
//     let pass: boolean = false;
//     try {
//       targetPath = path.normalize(targetPath);

//       // const reqPath:string = req.pathname;

//       if (targetPath.startsWith("[")) {
//         const targetService: string = targetPath
//           .replace(/\[|\]/gi, "")
//           .toLocaleLowerCase();
//         const reqService: string =
//           RequestContext.getRequestService().toLocaleLowerCase();
//         if (
//           targetService.lastIndexOf("*") > -1 &&
//           reqService.startsWith(
//             targetService.substring(0, targetService.lastIndexOf("*"))
//           )
//         ) {
//           //모듈 필터 [test/module/*]
//           pass = true;
//         } else if (targetService == reqService) {
//           pass = true;
//         }
//       } else if (targetPath.lastIndexOf("*") > -1) {
//         const targetService: string = targetPath.substring(
//           0,
//           targetPath.lastIndexOf("*")
//         );
//         const reqService: string = RequestContext.getRequestPath();
//         if (reqService.startsWith(targetService)) {
//           //모듈 필터 auth/sample/login/*
//           pass = true;
//         }
//       } else if (targetPath == RequestContext.getRequestPath()) {
//         pass = true;
//       }
//     } catch (e) {}
//     return pass;
//   }
// }
