// import RequestContext from "../scope/RequestContext";
import DiSupplier from "./DiSupplier";

export class DaoDiSupplier extends DiSupplier {
  public async scopeDiSupplierWorker(rc: any): Promise<any> {
    let dao = await rc.getSqlSession().dao!;
    if (!dao) {
      return undefined;
    }
    return dao;
  }
}
