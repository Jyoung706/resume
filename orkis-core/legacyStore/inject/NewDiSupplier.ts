import { ApplicationContext } from "../context";
import DiSupplier from "./DiSupplier";
import logger from "../utils/Logger";
import { SCAN_TYPE } from "../static";

export class NewDiSupplier extends DiSupplier {
  public async scopeDiSupplierWorker(rc: any, className: string): Promise<any> {
    let bean: SCAN_TYPE | undefined = rc.getScopeData(className);
    if (!bean) {
      bean = ApplicationContext.getBean(className);
    }
    if (bean) {
      return new bean.CLASS();
    }

    logger.error(`[@SCOPE.new] no bean exist : ${className}`);
    return undefined;
  }
}
