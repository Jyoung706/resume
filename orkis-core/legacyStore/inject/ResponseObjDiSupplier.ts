import DiSupplier from "./DiSupplier";

export class ResponseObjDiSupplier extends DiSupplier {
  public async scopeDiSupplierWorker(rc: any): Promise<any> {
    return rc.response;
  }
}
