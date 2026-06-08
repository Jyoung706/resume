import { BEAN_SCAN_TYPES } from "../../constants";
import { COMPONENT_SCAN_BEAN_META_KEY } from "../../constants/internalKeys";
import { BeanMetadata, SCOPE_TYPES } from "../../types";

export function Dao(_option?: any) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const className = target.name;

    let option: any = {};
    if (_option) Object.assign(option, _option);

    Reflect.defineMetadata(
      COMPONENT_SCAN_BEAN_META_KEY,
      {
        name: className,
        scanType: BEAN_SCAN_TYPES.DAO,
        scope: SCOPE_TYPES.SINGLETON_SCOPE,
        option
      } as BeanMetadata,
      target
    );

    return target;
  };
}
