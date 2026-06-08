import { Autowired, Service } from "@orkis/core/common";
import { BackgroundImageDao } from "@/profile/BackgroundImageDao";
import { BaseImageService } from "./BaseImageService";
import {
  ALLOWED_MIME_TYPES,
  ImageServiceConfig,
  IImageDao,
  ImageUploadResult,
  ImageInfo,
  UploadFile
} from "./ImageTypes";

// 최대 파일 크기 (10MB - 배경 이미지는 더 클 수 있음)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 배경 이미지용 DAO 어댑터
class BackgroundImageDaoAdapter implements IImageDao {
  constructor(private dao: BackgroundImageDao) {}

  async updateImagePath(userId: string, imagePath: string | null): Promise<void> {
    return this.dao.updateBackgroundImagePath(userId, imagePath);
  }

  async getImagePath(userId: string): Promise<string | null> {
    return this.dao.getBackgroundImagePath(userId);
  }
}

// 하위 호환성을 위한 타입 export
export type BackgroundImageUploadResult = ImageUploadResult;
export type BackgroundImageInfo = ImageInfo;

@Service({ name: "BackgroundImageService" })
export class BackgroundImageService extends BaseImageService {
  @Autowired("BackgroundImageDao")
  private backgroundImageDao!: BackgroundImageDao;

  private _daoAdapter?: BackgroundImageDaoAdapter;
  private _config: ImageServiceConfig = {
    maxFileSize: MAX_FILE_SIZE,
    filePrefix: "background",
    imageUrlPath: "/profile/background/get",
    serviceName: "배경"
  };

  // Static getter for constants (Controller에서 사용)
  static get ALLOWED_MIME_TYPES() {
    return ALLOWED_MIME_TYPES;
  }

  static get MAX_FILE_SIZE() {
    return MAX_FILE_SIZE;
  }

  protected get config(): ImageServiceConfig {
    return this._config;
  }

  protected get imageDao(): IImageDao {
    if (!this._daoAdapter) {
      this._daoAdapter = new BackgroundImageDaoAdapter(this.backgroundImageDao);
    }
    return this._daoAdapter;
  }

  // 하위 호환성을 위한 메서드 래퍼
  async uploadBackgroundImage(
    userId: string,
    file: UploadFile
  ): Promise<BackgroundImageUploadResult> {
    return this.uploadImage(userId, file);
  }

  async deleteBackgroundImage(userId: string): Promise<{ message: string }> {
    return this.deleteImage(userId);
  }

  async getBackgroundImagePath(userId: string): Promise<string | null> {
    return this.getImagePath(userId);
  }

  async getBackgroundImageInfo(userId: string): Promise<BackgroundImageInfo> {
    return this.getImageInfo(userId);
  }

  async getBackgroundImageFilePath(userId: string): Promise<string | null> {
    return this.getImageFilePath(userId);
  }
}
