import {
  Controller,
  Files,
  Get,
  Post,
  REQUEST_TYPE,
  Res
} from "../../main/core";
import { Response } from "../../main/application";
import logger, { FileUploadUtil } from "../../main/utils";
import { backApi } from "./CustomRequestModule/backendRequestModule";
import * as fs from "fs";
import * as path from "path";

@Controller({ path: "/my" })
export class MyController {
  @Get("a")
  public test() {
    logger.info("this is info");
    return "a test";
  }

  @Get("b")
  public test2() {
    return "b test";
  }

  @Post("c", {
    requestType: REQUEST_TYPE.UPLOAD
  })
  public async test3(@Files("files") files: any) {
    const [file] = files;

    await FileUploadUtil.saveFile(file, ["upload", "test"], "mytext.txt");

    return "sucess";
  }

  @Get("d")
  public async test4() {
    const result = await backApi.get("/health");

    console.log(result);

    return "success";
  }

  // 이미지 서빙 라우터
  @Get("image")
  public serveImage(@Res() res: Response) {
    const imagePath = path.join(__dirname, "static", "code.png");
    const imageBuffer = fs.readFileSync(imagePath);

    res.setHeader("Content-Type", "image/png");
    res.send(imageBuffer);
  }

  // request Module로 자기 자신에게 이미지 요청 테스트
  @Get("image-test")
  public async imageTest() {
    const result = await api.get("/my/image");

    logger.info("=== 이미지 요청 테스트 ===");
    logger.info("result.ok:", result.ok);
    logger.info("result.status:", result.status);
    logger.info("result.headers:", Object.fromEntries(result.headers));
    logger.info("result.data type:", typeof result.data);
    logger.info("result.data:", result.data);

    if (result.data instanceof ArrayBuffer) {
      logger.info("ArrayBuffer size:", result.data.byteLength);
    }

    logger.info("result : ", result);

    return {
      ok: result.ok,
      status: result.status,
      contentType: result.headers.get("content-type"),
      dataType: typeof result.data,
      isArrayBuffer: result.data instanceof ArrayBuffer,
      dataSize:
        result.data instanceof ArrayBuffer ? result.data.byteLength : null
    };
  }
}
