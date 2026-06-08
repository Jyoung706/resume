// import {
//   Constructor,
//   NEW_PROPERTY_KEY,
//   PROPERTY_META_KEY,
//   REQUEST_PROPERTY_KEY,
//   SESSION_PROPERTY_KEY,
//   SINGLETON_PROPERTY_KEY
// } from "../../../../static";
// import { RequestDiSupplier } from "../../../../Inject/RequestDiSupplier";
// import { DaoDiSupplier } from "../../../../Inject/DaoDiSupplier";
// import { SingletonDiSupplier } from "../../../../Inject/SingletonDiSupplier";
// import { NewDiSupplier } from "../../../../Inject/NewDiSupplier";
// import { ScopeDecoratorGenerator } from "../../../../Inject/ScopeDecoratorFactory";
// import { SessionDiSupplier } from "../../../../Inject/SessionDiSupplier";

// export class ScopeProperty {
//   public static REQUEST(...args: (string | Constructor)[]) {
//     return (target: any, paramName: string) => {
//       new ScopeDecoratorGenerator(
//         PROPERTY_META_KEY,
//         new RequestDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeProperty.request",
//           REQUEST_PROPERTY_KEY,
//           paramName,
//           undefined,
//           args
//         )
//         .appendMetadata();
//     };
//   }

//   public static SINGLETON(...args: (string | Constructor)[]) {
//     return (target: any, paramName: string) => {
//       new ScopeDecoratorGenerator(
//         PROPERTY_META_KEY,
//         new SingletonDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeProperty.singleton",
//           SINGLETON_PROPERTY_KEY,
//           paramName,
//           undefined,
//           args
//         )
//         .appendMetadata();
//     };
//   }

//   public static NEW(...args: (string | Constructor)[]) {
//     return (target: any, paramName: string) => {
//       new ScopeDecoratorGenerator(
//         PROPERTY_META_KEY,
//         new NewDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeProperty.new",
//           NEW_PROPERTY_KEY,
//           paramName,
//           undefined,
//           args
//         )
//         .appendMetadata();
//     };
//   }

//   public static SESSION(...args: (string | Constructor)[]) {
//     return (target: any, paramName: string) => {
//       new ScopeDecoratorGenerator(
//         PROPERTY_META_KEY,
//         new SessionDiSupplier(),
//         target
//       )
//         .generateMetaData(
//           "ScopeProperty.new",
//           SESSION_PROPERTY_KEY,
//           paramName,
//           undefined,
//           args
//         )
//         .appendMetadata();
//     };
//   }

//   public static DAO(target: any, paramName: string) {
//     new ScopeDecoratorGenerator(PROPERTY_META_KEY, new DaoDiSupplier(), target)
//       .generateMetaData("ScopeProperty.DAO", REQUEST_PROPERTY_KEY, paramName)
//       .appendMetadata();
//   }
// }
