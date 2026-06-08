// import async_hooks, {
//   AsyncHook,
//   executionAsyncId,
//   executionAsyncResource
// } from "async_hooks";
// import {
//   PACKET,
//   REQUEST_CONTEXT_INTERFACE,
//   REQUEST_CONTEXT_SYMBOL
// } from "../static";
// import DateUtil from "./DateUtil";
// import { ApplicationEnvironment } from "../config/ApplicationEnvironment";
// import * as ts from "typescript";

// const DEFAULT_PACKET: PACKET = {
//   header: {
//     transDate: "",
//     resultCode: "0000",
//     resultMsg: "정상"
//   },
//   body: {
//     request: {},
//     response: {}
//   }
// };

// export class RequestContext {
//   private static asyncHooks?: AsyncHook;

//   public static createHook() {
//     // async_hooks for request context
//     this.asyncHooks = async_hooks.createHook({
//       init(asyncId, type, triggerAsyncId, resource: any) {
//         const cr: any = async_hooks.executionAsyncResource();
//         if (cr) {
//           resource[REQUEST_CONTEXT_SYMBOL] = cr[REQUEST_CONTEXT_SYMBOL];
//         }
//       }
//       // before, after, destroy, promiseResolve
//     });
//   }

//   public static enableHook() {
//     this.asyncHooks?.enable();
//   }

//   public static disableHook() {
//     this.asyncHooks?.disable();
//   }

//   public static setRequestContext(
//     request: any,
//     response: any,
//     packet?: PACKET
//   ) {
//     let resourceValue: any = executionAsyncResource();
//     if (!packet) packet = Object.assign({}, DEFAULT_PACKET);
//     packet.header.transDate = DateUtil.getCurrentDateTime("yyyyMMdd H:i:s");

//     const contextParam: REQUEST_CONTEXT_INTERFACE = {
//       id: executionAsyncId(),
//       request: request,
//       response: response,
//       packet: packet
//     };

//     resourceValue[REQUEST_CONTEXT_SYMBOL] = contextParam;
//   }
//   public static getRequestContext(): REQUEST_CONTEXT_INTERFACE {
//     let resourceValue: any = executionAsyncResource();
//     return resourceValue[REQUEST_CONTEXT_SYMBOL] as REQUEST_CONTEXT_INTERFACE;
//   }

//   public static getRequest(): any {
//     return this.getRequestContext().request;
//   }

//   public static getResponse() {
//     return this.getRequestContext().response;
//   }

//   public static getPacket() {
//     return this.getRequestContext().packet;
//   }

//   public static getPacketParam(path?: string) {
//     if (!path) return this.getPacket().request;
//     let packet = this.getPacket();
//     try {
//       const datapath = ts.transpile(`packet.${path}`);
//       return eval(datapath);
//     } catch (e) {}
//     return null;
//   }

//   public static addPacketRes(key: string, data: any) {
//     this.getPacket().response[key] = data;
//   }

//   public static getRequestPath(isLower: boolean = true): string {
//     let req: any = this.getRequest();
//     let path: string = req.url;
//     path = path.replace(req.contextPath, "");
//     if (path.indexOf("?") != -1) {
//       path = path.substring(0, path.indexOf("?"));
//     }
//     // calling rest service like service.module
//     if (path.lastIndexOf(".") > -1) {
//       path = path.substring(0, path.lastIndexOf("."));
//     }

//     if (isLower) return path.toLocaleLowerCase();
//     return path;
//   }

//   public static getRequestService(serviceCategory?: string[]): string {
//     let path: string = this.getRequestPath();
//     let service: string = "";

//     let homeUri = !ApplicationEnvironment.__HOME_URI
//       ? "/"
//       : ApplicationEnvironment.__HOME_URI;
//     if (serviceCategory) {
//       for (let category of serviceCategory) {
//         let categoryPath = `${homeUri == "/" ? "" : homeUri}/${category}/`;
//         if (path.indexOf(categoryPath) != -1) {
//           service = path.substring(
//             path.indexOf(categoryPath) + categoryPath.length,
//             path.length
//           );
//           service = "/" + service.replace(/\./gi, "/");
//         }
//       }

//       if (!service) service = path;

//       return service;
//     } else {
//       let categoryPath = `${homeUri == "/" ? "" : homeUri}/`;
//       if (path.indexOf(categoryPath) != -1) {
//         service = path.substring(
//           path.indexOf(categoryPath) + categoryPath.length,
//           path.length
//         );
//         service = "/" + service.replace(/\./gi, "/");
//       } else {
//         service = path;
//       }

//       return service;
//     }

//     // if(path.indexOf("/bicns/transaction/") != -1){
//     //     service = path.substring(path.indexOf("/bicns/transaction/")+"/bicns/transaction/".length, path.length);
//     //     service = "/"+service.replace(/\./gi, "/");
//     // }else if(path.indexOf("/bicns/excel/") != -1){
//     //     service = path.substring(path.indexOf("/bicns/excel/")+"/bicns/excel/".length, path.length);
//     //     service = "/"+service.replace(/\./gi, "/");
//     // }else if(path.indexOf("/bicns/stream/") != -1){
//     //     service = path.substring(path.indexOf("/bicns/stream/")+"/bicns/stream/".length, path.length);
//     //     service = "/"+service.replace(/\./gi, "/");
//     // }else{
//     //     service = path;
//     // }
//     // return service;
//   }

//   // public static getRequestParam(req:any):string {
//   //     let path:string = req.url;
//   //     let paramString:string = "";
//   //     if(path.indexOf("?") != -1){
//   //         paramString = path.substring(path.indexOf("?")+1, path.length);
//   //     }
//   //     return paramString;
//   // }
//   // //
//   // public static getRequestParamMap(req:any):REQUEST_PARAM {
//   //     let paramString:string = this.getRequestParam(req);
//   //     let paramMap:REQUEST_PARAM = {};
//   //     if(paramString == ""){
//   //         const paramFair = paramString.split("&");
//   //         if (paramFair) {
//   //             paramFair.forEach((element,index)=>{
//   //                 const pSet = element.split("=");
//   //                 if (pSet && pSet.length == 2) {
//   //                     if(!pSet[1]) pSet[1] = "";
//   //                     let val:string = decodeURIComponent(pSet[1]);
//   //                     paramMap[pSet[0]] = val;
//   //                 }
//   //             })
//   //         }
//   //     }
//   //     return paramMap;
//   // }
//   //
//   //
//   // public static parseUri(uri:string|undefined):URI_INFO {
//   //     let parseUri:URI_INFO = {} as URI_INFO;
//   //
//   //     if (uri && uri.indexOf("?") > -1) {
//   //         let uriArr = uri.split("?");
//   //         parseUri.uri = uriArr[0];
//   //
//   //         let paramString:string = uriArr[1];
//   //         let paramMap:REQUEST_PARAM = {};
//   //         if(paramString != ""){
//   //             const paramFair = paramString.split("&");
//   //             if (paramFair) {
//   //                 paramFair.forEach((element,index)=>{
//   //                     const pSet = element.split("=");
//   //                     if (pSet && pSet.length == 2) {
//   //                         if(!pSet[1]) pSet[1] = "";
//   //                         let val:string = decodeURIComponent(pSet[1]);
//   //                         paramMap[pSet[0]] = val;
//   //                     }
//   //                 })
//   //             }
//   //         }
//   //         parseUri.param = paramMap;
//   //
//   //
//   //     }
//   //     else
//   //     {
//   //
//   //         parseUri.uri = !uri ? "" :uri;
//   //     }
//   //
//   //
//   //     if(parseUri.uri.indexOf("://") > -1)
//   //     {
//   //         let protocolParseArr = parseUri.uri.split("://");
//   //         parseUri.uri = protocolParseArr[0];
//   //         parseUri.protocol = protocolParseArr[1];
//   //     }
//   //
//   //     return parseUri;
//   // }
//   //
//   //
//   // public static parseRequestParamMap(uri:string|undefined):REQUEST_PARAM {
//   //     let paramString:string = "";
//   //     if (uri && uri.indexOf("?") > -1) {
//   //         paramString = uri.split("?")[1];
//   //     }
//   //     let paramMap:REQUEST_PARAM = {};
//   //     if(paramString != ""){
//   //         const paramFair = paramString.split("&");
//   //         if (paramFair) {
//   //             paramFair.forEach((element,index)=>{
//   //                 const pSet = element.split("=");
//   //                 if (pSet && pSet.length == 2) {
//   //                     if(!pSet[1]) pSet[1] = "";
//   //                     let val:string = decodeURIComponent(pSet[1]);
//   //                     paramMap[pSet[0]] = val;
//   //                 }
//   //             })
//   //         }
//   //     }
//   //     return paramMap;
//   // }
//   //
//   //
//   //
//   // public static getRequestMimeType(req:any):MIME_TYPE {
//   //     const url:string = this.getRequestPath(req);
//   //     let mime:MIME_TYPE = "any";
//   //     if(url.indexOf("/bicns/stream/") != -1 || url.indexOf("/bicns/excel/") != -1) {
//   //         mime = "bin";
//   //     }else if(url.indexOf("/bicns/transaction/") != -1){
//   //         mime = "rest";
//   //     }else if (url.lastIndexOf(".") > -1) {
//   //         try{
//   //             const ext:string = url.substring(url.lastIndexOf(".") + 1, url.length).toLowerCase();
//   //             mime = ext as MIME_TYPE;
//   //         }catch(e){
//   //             console.log(e);
//   //         }
//   //     }else{
//   //         mime = "view";
//   //     }
//   //     return mime;
//   // }
//   //
//   // public static getRequestMediaType(req:any):string {
//   //     if(!req) return MEDIA_TYPE_MAP.any;
//   //     const mimeType:MIME_TYPE = this.getRequestMimeType(req);
//   //     return MEDIA_TYPE_MAP[mimeType];
//   // }
// }
