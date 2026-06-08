import { Configuration } from "@orkis/core/common";
import { IFileUploadConfig } from "@orkis/core/configs";

@Configuration()
export class FileUploadConfig implements IFileUploadConfig {
  maxFileSize: number = 5 * 1024 * 1024;
  maxCount: number = 3;

  // core 기본값으로 사용하도록 세팅
  // allowedMimeTypes?: string[] | undefined;
  // tempDir?: string | undefined;
}
