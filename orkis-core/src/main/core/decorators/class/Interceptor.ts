import { BEAN_SCAN_TYPES, IF_MODULE_TYPE, IF_POINT_CUT } from "../../constants";
import { COMPONENT_SCAN_BEAN_META_KEY } from "../../constants/internalKeys";
import { BeanMetadata, INTERCEPTOR_OPTION, SCOPE_TYPES } from "../../types";
import { BaseInterceptor } from "../../../application/server";

export const DEFAULT_INTERCEPTOR_OPTION: INTERCEPTOR_OPTION = {
  MODULE_TYPE: IF_MODULE_TYPE.REQUEST,
  PATH: ["*"],
  USE: true,
  POINT_CUT: IF_POINT_CUT.BEFORE
};

export function Interceptor(_option?: INTERCEPTOR_OPTION) {
  return function <T extends { new (...args: any[]): BaseInterceptor }>(
    target: T
  ) {
    const className = target.name;

    let option: INTERCEPTOR_OPTION = {
      ...DEFAULT_INTERCEPTOR_OPTION,
      MODULE_NAME: className
    };
    if (_option) Object.assign(option, _option);

    Reflect.defineMetadata(
      COMPONENT_SCAN_BEAN_META_KEY,
      {
        name: className,
        scanType: BEAN_SCAN_TYPES.INTERCEPTOR,
        scope: SCOPE_TYPES.SINGLETON_SCOPE,
        option
      } as BeanMetadata,
      target
    );

    return target;
  };
}
