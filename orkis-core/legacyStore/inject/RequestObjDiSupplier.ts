import DiSupplier from "./DiSupplier";

export class RequestObjDiSupplier extends DiSupplier {
  public async scopeDiSupplierWorker(rc: any): Promise<any> {
    return rc.request;
  }
}
