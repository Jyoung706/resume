import { ApplicationContext } from "../context";
import DiSupplier from "./DiSupplier";
import logger from "../utils/Logger";
import { SCAN_TYPE, SCOPE_TYPES } from "../static";

export class SingletonDiSupplier extends DiSupplier {
  public async scopeDiSupplierWorker(rc: any, className: string): Promise<any> {
    // let bean:SCAN_TYPE | undefined = applicationContext.findBean(className);
    let bean: SCAN_TYPE | undefined = ApplicationContext.getBean(className);
    if (bean && bean.OPTION?.SCOPE === SCOPE_TYPES.SINGLETON_SCOPE) {
      return bean.BEAN;
    }
    logger.error(`[@SCOPE.singleton] no bean exist : ${className}`);
    return undefined;
  }
}
