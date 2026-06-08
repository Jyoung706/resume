import DiSupplier from "./DiSupplier";
import { FileUploadUtil } from "../utils/FileUploadUtil";

// process.env.UPLOAD_PATH

export class FileDiSupplier extends DiSupplier {
  public async scopeDiSupplierWorker(rc: any, fileName: string): Promise<any> {
    let result = await FileUploadUtil.getMultiparts(rc, fileName);
    return result;
  }
}

// public async scopeDiSupplierWorker(rc:RequestContext):Promise<any>
// {
//     let dao:CommonDao = await rc.getSqlSession().dao!;
// if(!dao){
//     return undefined
// }
// return dao;
// }
