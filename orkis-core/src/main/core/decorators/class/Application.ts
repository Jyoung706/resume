import { BEAN_SCAN_TYPES, APPLICATION_TYPE } from "../../constants";
import { COMPONENT_SCAN_BEAN_META_KEY } from "../../constants/internalKeys";
import { APPLICATION_OPTION, SCOPE_TYPES, BeanMetadata } from "../../types";
import { ExpressApplication } from "../../../application/server";

export function Application(_option?: APPLICATION_OPTION) {
  return function <T extends { new (...args: any[]): ExpressApplication }>(
    target: T
  ) {
    const className = target.name;

    let option: APPLICATION_OPTION = {
      type: APPLICATION_TYPE.EXPRESS_SERVER
    };

    if (_option) Object.assign(option, _option);

    Reflect.defineMetadata(
      COMPONENT_SCAN_BEAN_META_KEY,
      {
        name: className,
        scanType: BEAN_SCAN_TYPES.APPLICATION,
        scope: SCOPE_TYPES.SINGLETON_SCOPE,
        option
      } as BeanMetadata,
      target
    );

    return target;
  };
}
