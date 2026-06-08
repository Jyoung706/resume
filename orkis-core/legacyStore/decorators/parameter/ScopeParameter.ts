// import {
//   Constructor,
//   FILE_PROPERTY_KEY,
//   NEW_PROPERTY_KEY,
//   PARAMETER_META_KEY,
//   REQUEST_BODY_PROPERTY_KEY,
//   REQUEST_OBJ_PROPERTY_KEY,
//   REQUEST_PARAM_MAP_PROPERTY_KEY,
//   REQUEST_PARAM_PROPERTY_KEY,
//   REQUEST_PROPERTY_KEY,
//   RESPONSE_OBJ_PROPERTY_KEY,
//   SESSION_PROPERTY_KEY,
//   SINGLETON_PROPERTY_KEY
// } from "../../../../static";
// import { RequestDiSupplier } from "../../../../Inject/RequestDiSupplier";
// import { DaoDiSupplier } from "../../../../Inject/DaoDiSupplier";
// import { SingletonDiSupplier } from "../../../../Inject/SingletonDiSupplier";
// import { NewDiSupplier } from "../../../../Inject/NewDiSupplier";
// import { ScopeDecoratorGenerator } from "../../../../Inject/ScopeDecoratorFactory";
// import { SessionDiSupplier } from "../../../../Inject/SessionDiSupplier";
// import { FileDiSupplier } from "../../../../Inject/FileDiSupplier";
// import { RequestObjDiSupplier } from "../../../../Inject/RequestObjDiSupplier";
// import { ResponseObjDiSupplier } from "../../../../Inject/ResponseObjDiSupplier";

// // import { RequestBodyDiSupplier } from "../../../../Inject/RequestBodyDiSupplier";
// // import { RequestParamDiSupplier } from "../../../../Inject/RequestParamDiSupplier";
// // import { RequestParamMapDiSupplier } from "../../../../Inject/RequestParamMapDiSupplier";

// export class ScopeParameter {
//   public static REQUEST(...args: (string | Constructor)[]) {
//     return (target: any, paramName: string, index: number) => {
//       new ScopeDecoratorGenerator(
//         PARAMETER_META_KEY,
//         new RequestDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeParameter.request",
//           REQUEST_PROPERTY_KEY,
//           paramName,
//           index,
//           args
//         )
//         .appendMetadata();
//     };
//   }

//   public static SINGLETON(...args: (string | Constructor)[]) {
//     return (target: any, paramName: string, index: number) => {
//       new ScopeDecoratorGenerator(
//         PARAMETER_META_KEY,
//         new SingletonDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeParameter.singleton",
//           SINGLETON_PROPERTY_KEY,
//           paramName,
//           index,
//           args
//         )
//         .appendMetadata();
//     };
//   }

//   public static NEW(...args: (string | Constructor)[]) {
//     return (target: any, paramName: string, index: number) => {
//       new ScopeDecoratorGenerator(
//         PARAMETER_META_KEY,
//         new NewDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeParameter.new",
//           NEW_PROPERTY_KEY,
//           paramName,
//           index,
//           args
//         )
//         .appendMetadata();
//     };
//   }

//   public static SESSION(...args: (string | Constructor)[]) {
//     return (target: any, paramName: string, index: number) => {
//       new ScopeDecoratorGenerator(
//         PARAMETER_META_KEY,
//         new SessionDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeParameter.SESSION",
//           SESSION_PROPERTY_KEY,
//           paramName,
//           index,
//           args
//         )
//         .appendMetadata();
//     };
//   }

//   public static DAO(target: any, paramName: string, index: number) {
//     new ScopeDecoratorGenerator(PARAMETER_META_KEY, new DaoDiSupplier(), target)
//       .generateMetaData(
//         "ScopeParameter.DAO",
//         REQUEST_PROPERTY_KEY,
//         paramName,
//         index
//       )
//       .appendMetadata();
//   }
//   public static FILE(...args: string[]) {
//     return (target: any, paramName: string, index: number) => {
//       new ScopeDecoratorGenerator(
//         PARAMETER_META_KEY,
//         new FileDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeParameter.FILE",
//           FILE_PROPERTY_KEY,
//           paramName,
//           index,
//           args
//         )
//         .appendMetadata();
//     };
//   }
// }

// const Request = function (target: any, paramName: string, index: number) {
//   new ScopeDecoratorGenerator(
//     PARAMETER_META_KEY,
//     new RequestObjDiSupplier(),
//     target
//   )
//     .generateMetaData(
//       "ScopeParameter.Request.value",
//       REQUEST_OBJ_PROPERTY_KEY,
//       paramName,
//       index
//     )
//     .appendMetadata();
// };

// const Response = function (target: any, paramName: string, index: number) {
//   new ScopeDecoratorGenerator(
//     PARAMETER_META_KEY,
//     new ResponseObjDiSupplier(),
//     target
//   )
//     .generateMetaData(
//       "ScopeParameter.Response.value",
//       RESPONSE_OBJ_PROPERTY_KEY,
//       paramName,
//       index
//     )
//     .appendMetadata();
// };

// // export const RequestBody = function(target: any, paramName: string, index: number) {
// //     new ScopeDecoratorGenerator(PARAMETER_META_KEY, new RequestBodyDiSupplier(), target)
// //         .generateMetaData("ScopeParameter.RequestBody.value", REQUEST_BODY_PROPERTY_KEY, paramName, index)
// //         .appendMetadata();
// // }

// // export const RequestParam = (paramName?: string) => {
// //     return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
// //       new ScopeDecoratorGenerator(PARAMETER_META_KEY, new RequestParamDiSupplier(), target)
// //         .generateMetaData("ScopeParameter.RequestParam.value", REQUEST_PARAM_PROPERTY_KEY, paramName ?? '', parameterIndex)
// //         .appendMetadata();
// //     };
// //   };

// // export const RequestParamMap = function(target: any, paramName: string, index: number) {
// //     new ScopeDecoratorGenerator(PARAMETER_META_KEY, new RequestParamMapDiSupplier(), target)
// //         .generateMetaData("ScopeParameter.RequestParamMap.value", REQUEST_PARAM_MAP_PROPERTY_KEY, paramName, index)
// //         .appendMetadata();
// // }
