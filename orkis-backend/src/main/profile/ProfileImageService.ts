import { Autowired, Service } from "@orkis/core/common";
import { ProfileImageDao } from "@/profile/ProfileImageDao";
import { BaseImageService } from "./BaseImageService";
import {
  ALLOWED_MIME_TYPES,
  ImageServiceConfig,
  IImageDao,
  ImageUploadResult,
  ImageInfo,
  UploadFile
} from "./ImageTypes";

// 최대 파일 크기 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 프로필 이미지용 DAO 어댑터
class ProfileImageDaoAdapter implements IImageDao {
  constructor(private dao: ProfileImageDao) {}

  async updateImagePath(userId: string, imagePath: string | null): Promise<void> {
    return this.dao.updateProfileImagePath(userId, imagePath);
  }

  async getImagePath(userId: string): Promise<string | null> {
    return this.dao.getProfileImagePath(userId);
  }
}

// 하위 호환성을 위한 타입 export
export type ProfileImageUploadResult = ImageUploadResult;
export type ProfileImageInfo = ImageInfo;

@Service({ name: "ProfileImageService" })
export class ProfileImageService extends BaseImageService {
  @Autowired("ProfileImageDao")
  private profileImageDao!: ProfileImageDao;

  private _daoAdapter?: ProfileImageDaoAdapter;
  private _config: ImageServiceConfig = {
    maxFileSize: MAX_FILE_SIZE,
    filePrefix: "profile",
    imageUrlPath: "/profile/image/{userId}",
    serviceName: "프로필"
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
      this._daoAdapter = new ProfileImageDaoAdapter(this.profileImageDao);
    }
    return this._daoAdapter;
  }

  // 하위 호환성을 위한 메서드 래퍼
  async uploadProfileImage(
    userId: string,
    file: UploadFile
  ): Promise<ProfileImageUploadResult> {
    return this.uploadImage(userId, file);
  }

  async deleteProfileImage(userId: string): Promise<{ message: string }> {
    return this.deleteImage(userId);
  }

  async getProfileImagePath(userId: string): Promise<string | null> {
    return this.getImagePath(userId);
  }

  async getProfileImageInfo(userId: string): Promise<ProfileImageInfo> {
    return this.getImageInfo(userId);
  }

  async getProfileImageFilePath(userId: string): Promise<string | null> {
    return this.getImageFilePath(userId);
  }
}
