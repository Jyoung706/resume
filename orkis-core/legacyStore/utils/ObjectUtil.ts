import logger from "./Logger";
import { PARSE_TYPE } from "../core/constants";
import * as ts from "typescript";
import { NumberUtil } from "./NumberUtil";

export default class ObjectUtil {
  public static isNull(target: any): boolean {
    if (!target || target === null || target === undefined) return true;

    if (typeof target == "object" && Object.keys(target).length < 1) {
      return true;
    }
    if (typeof target == "string" && target === "") {
      return true;
    }

    return false;
  }

  public static isNotNull(target: any) {
    return !this.isNull(target);
  }

  public static parse(target: string, _type: PARSE_TYPE): any {
    switch (_type) {
      case PARSE_TYPE.JSON:
        try {
          return JSON.parse(target);
        } catch (e) {
          logger.debug("JSON PARSE FAILED : " + e);
          return undefined;
        }
      case PARSE_TYPE.XML:
        try {
          return {};
        } catch (e) {
          logger.debug("XML PARSE FAILED : " + e);
          return undefined;
        }
    }

    logger.debug("PARSE NOT SUPPORTED ");
    return undefined;
  }

  public static clone(target: any): any {
    return this.parse(JSON.stringify(target), PARSE_TYPE.JSON);
  }
  public static toJsonString(target: any): string {
    let json = "{}";
    if (target) {
      try {
        json = JSON.stringify(target);
      } catch (e) {}
    }
    return json;
  }

  public static getObject(target: any, key: string, defaultValue?: any) {
    let ret = defaultValue;
    try {
      ret = eval(`target.${key};`);
    } catch (e) {}
    return ret;
  }

  public static getString(
    target: any,
    path: string,
    defaultValue: string = ""
  ): string {
    try {
      const dataPath = ts.transpile(`target.${path}`);
      if (!dataPath) throw new Error("no path");
      const ret = eval(dataPath);
      if (ret == undefined) return defaultValue;
      return ret;
    } catch (e) {}
    return defaultValue;
  }

  public static getInt(target: any, path: string, defaultValue = 0): number {
    try {
      const ret = ObjectUtil.getString(target, path);
      if (!ret) throw new Error("no path");
      return parseInt(ret);
    } catch (e) {}
    return NumberUtil.isNull(defaultValue) ? 0 : defaultValue;
  }

  public static getFloat(target: any, path: string, defaultValue = 0): number {
    try {
      const ret = ObjectUtil.getString(target, path);
      if (!ret) throw new Error("no path");
      return parseFloat(ret);
    } catch (e) {}
    return NumberUtil.isNull(defaultValue) ? 0 : defaultValue;
  }

  public static createSafeObject(key: string) {
    let rootKey = key;
    let root: any = {};
    let depth: any = root;
    if (key.indexOf(".") > -1) rootKey = key.substring(0, key.indexOf("."));

    while (key.indexOf(".") > -1) {
      const key1 = key.substring(0, key.indexOf("."));
      depth[key1] = {};
      depth = depth[key1];
      key = key.substring(key.indexOf(".") + 1, key.length);
    }
    depth[key] = {};
    return {
      root: root,
      rootKey: rootKey,
      last: depth[key],
      lastKey: key
    };
  }

  public static isObject(variable: any) {
    return typeof variable === "object" && variable !== null;
  }

  public static isDict(v: any) {
    return (
      typeof v === "object" &&
      v !== null &&
      !(v instanceof Array) &&
      !(v instanceof Date)
    );
  }
}
