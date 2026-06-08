import "reflect-metadata";
import {
  BEAN_OPTION,
  BEAN_SCAN_TYPES,
  BeanMetadata,
  COMPONENT_SCAN_BEAN_META_KEY,
  SCOPE_TYPES
} from "../../../../static";

export function Bean(_option?: BEAN_OPTION) {
  // logger.info("Bean ---------------- ");
  return function <T extends { new (...args: any): {} }>(target: T) {
    const className = target.name;

    let option: BEAN_OPTION = {
      SCOPE: SCOPE_TYPES.SINGLETON_SCOPE,
      SUBTYPE: ""
    };

    if (_option) Object.assign(option, _option);
    option.MODULE_NAME = `${target.name}`;

    const ProxyClass = {
      [className]: class extends target {
        constructor(...args: any) {
          let classScope = option.SCOPE;
          const protos = [
            target.prototype,
            Object.getPrototypeOf(target).__proto__
          ];
          protos.forEach((proto) => {
            if (!proto) return;
            Object.keys(proto).forEach((item) => {
              if (
                item.indexOf("__") == 0 &&
                item.lastIndexOf("__") == item.length - 2
              ) {
                proto[item].INVOKE(classScope);
              }
            });
          });
          super(...args);
        }
      }
    }[className];

    Reflect.defineMetadata(
      COMPONENT_SCAN_BEAN_META_KEY,
      {
        name: className,
        scanType: BEAN_SCAN_TYPES.BEAN,
        scope: option.SCOPE || SCOPE_TYPES.SINGLETON_SCOPE,
        proxyClass: ProxyClass,
        option
      } as BeanMetadata,
      target
    );

    return target;
  };
}
