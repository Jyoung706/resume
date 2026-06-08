// import { ApplicationContext } from "../context/ApplicationContext";
// import {
//   PROPERTY_MATA_KEY_TYPES,
//   PROPERTY_META_INTERFACE,
//   SCOPE_TYPE,
//   DATABASE_ADAPTER_META_KEY,
//   DATABASE_NATIVE_CLIENT_META_KEY
// } from "../static";
// import logger from "../utils/Logger";

// export default class MetaDataResolver {
//   private static genericPropertyResolver(
//     target: any,
//     metaKey: symbol,
//     resolver: (metadata: PROPERTY_META_INTERFACE<string>) => any,
//     logPrefix?: string
//   ) {
//     const injectMetas: string[] = Reflect.getMetadataKeys(target, metaKey);
//     const returnObject: any = {};

//     if (injectMetas && injectMetas.length > 0) {
//       injectMetas.forEach((propKey) => {
//         const metadata: PROPERTY_META_INTERFACE<string> = Reflect.getMetadata(
//           propKey,
//           target,
//           metaKey
//         ) as PROPERTY_META_INTERFACE<string>;

//         const value = resolver(metadata);
//         if (value !== undefined) {
//           returnObject[metadata.name] = value;

//           if (logPrefix) {
//             logger.debug(
//               `[${logPrefix} Injected ${metadata.name} with '${metadata.args}']`
//             );
//           }
//         }
//       });
//     }

//     Object.assign(target, returnObject);
//     return target;
//   }

//   public static propertyMetaDataResolver(target: any, scope?: SCOPE_TYPE) {
//     if (!target || typeof target != "object") {
//       logger.error(" propertyMetaDataResolver's target must exist ");
//       return target;
//     }

//     target = this.propertyValueMetaResolver(target);
//     target = this.propertyAutowiredMetaResolver(target, scope);
//     target = this.propertyDatabaseAdapterResolver(target);
//     target = this.propertyDatabaseNativeClientResolver(target);

//     return target;
//   }

//   public static propertyAutowiredMetaResolver(target: any, scope?: SCOPE_TYPE) {
//     return this.genericPropertyResolver(
//       target,
//       PROPERTY_MATA_KEY_TYPES.AUTOWIRED,
//       (metadata) => {
//         const beanKey = metadata.args || metadata.name;
//         return ApplicationContext.getBean(beanKey, scope);
//       }
//     );
//   }

//   public static propertyValueMetaResolver(target: any) {
//     return this.genericPropertyResolver(
//       target,
//       PROPERTY_MATA_KEY_TYPES.VALUE,
//       (metadata) => {
//         try {
//           return eval(metadata.args);
//         } catch (e) {
//           return "";
//         }
//       }
//     );
//   }

//   public static parameterMetaDataResolver() {}

//   public static propertyDatabaseAdapterResolver(target: any) {
//     return this.genericPropertyResolver(
//       target,
//       DATABASE_ADAPTER_META_KEY,
//       (metadata) => {
//         const databaseManager = ApplicationContext.getDatabaseManager();
//         return databaseManager?.getAdapter(metadata.args);
//       },
//       "DatabaseAdapter"
//     );
//   }

//   public static propertyDatabaseNativeClientResolver(target: any) {
//     return this.genericPropertyResolver(
//       target,
//       DATABASE_NATIVE_CLIENT_META_KEY,
//       (metadata) => {
//         const databaseManager = ApplicationContext.getDatabaseManager();
//         return databaseManager?.getNativeClient(metadata.args);
//       },
//       "DatabaseNativeClient"
//     );
//   }
// }
