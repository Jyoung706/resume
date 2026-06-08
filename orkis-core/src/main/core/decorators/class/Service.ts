import { BEAN_SCAN_TYPES } from "../../constants";
import { COMPONENT_SCAN_BEAN_META_KEY } from "../../constants/internalKeys";
import { BeanMetadata, SCOPE_TYPES } from "../../types";

export function Service(_option?: any) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const className = target.name;

    let option: any = {};

    if (_option) Object.assign(option, _option);

    const metadata: BeanMetadata = {
      name: className,
      scanType: BEAN_SCAN_TYPES.SERVICE,
      scope: SCOPE_TYPES.SINGLETON_SCOPE,
      option
    };

    Reflect.defineMetadata(COMPONENT_SCAN_BEAN_META_KEY, metadata, target);
  };
}
