import { ApplicationContext } from "../context";
import DiSupplier from "./DiSupplier";
import logger from "../utils/Logger";
import { SCAN_TYPE, SCOPE_TYPES } from "../static";

export class RequestDiSupplier extends DiSupplier {
  public async scopeDiSupplierWorker(rc: any, className: string): Promise<any> {
    let bean: SCAN_TYPE | undefined = rc.getScopeData(className);
    if (!bean) {
      // bean = applicationContext.findBean(className);
      bean = ApplicationContext.getBean(className);
    }
    if (bean) {
      logger.info("bean.OPTION ----------------------- ", bean.OPTION);
      switch (bean.OPTION?.SCOPE) {
        case SCOPE_TYPES.SINGLETON_SCOPE:
          return bean.CLASS;
        case SCOPE_TYPES.REQUEST_SCOPE:
          let reqClass = new bean.CLASS();
          rc.addScopeData(className, reqClass);
          return reqClass;
        case SCOPE_TYPES.PROTOTYPE_SCOPE:
          let newClass = new bean.CLASS();
          rc.addScopeData(className, newClass);
          return newClass;
      }
    }
    // 등록된게 없다?
    // 그럼 new를 해야하는데 할수가없음 -> string이니까...
    logger.error(`[@SCOPE.request] no bean exist : ${className}`);
    return undefined;
  }
}
