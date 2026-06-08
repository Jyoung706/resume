import logger from "@orkis/core/utils";
import * as fs from "fs";
import * as path from "path";
import { OrkisError } from "../error/OrkisError";
import {
  ALLOWED_MIME_TYPES,
  getStoragePath,
  ImageUploadResult,
  ImageInfo,
  UploadFile,
  IImageDao,
  ImageServiceConfig
} from "./ImageTypes";

/**
 * Base Image Service
 * 이미지 업로드/삭제/조회를 위한 공통 로직을 제공하는 추상 베이스 클래스
 */
export abstract class BaseImageService {
  // 하위 클래스에서 구현해야 하는 추상 속성/메서드
  protected abstract get config(): ImageServiceConfig;
  protected abstract get imageDao(): IImageDao;

  // Static getter for constants (Controller에서 사용)
  static get ALLOWED_MIME_TYPES() {
    return ALLOWED_MIME_TYPES;
  }

  // 이미지 업로드
  async uploadImage(
    userId: string,
    file: UploadFile
  ): Promise<ImageUploadResult> {
    try {
      const storagePath = getStoragePath();
      const userDir = path.join(storagePath, "user_file", userId);

      // 디렉토리 생성
      await this.ensureDirectoryExists(userDir);

      // 기존 이미지 삭제
      await this.deleteExistingImages(userDir);

      // 파일명 생성 ({prefix}_timestamp.확장자)
      const fileExt = path.extname(file.originalname).toLowerCase();
      const fileName = `${this.config.filePrefix}_${Date.now()}${fileExt}`;
      const filePath = path.join(userDir, fileName);

      // 파일 저장 (임시 파일을 최종 경로로 복사)
      await this.copyFileToDestination(file.path, filePath);

      // DB에 경로 저장 (상대 경로)
      const relativePath = `user_file/${userId}/${fileName}`;
      await this.imageDao.updateImagePath(userId, relativePath);

      return {
        message: `${this.config.serviceName} 이미지가 업로드되었습니다.`,
        imagePath: relativePath,
        imageUrl: this.buildImageUrl(userId)
      };
    } catch (error: any) {
      logger.error(
        `[${this.config.serviceName}] 이미지 업로드 실패:`,
        error
      );
      throw new OrkisError(
        error.message || `${this.config.serviceName} 이미지 업로드에 실패했습니다.`
      );
    }
  }

  // 이미지 삭제
  async deleteImage(userId: string): Promise<{ message: string }> {
    try {
      const storagePath = getStoragePath();
      const userDir = path.join(storagePath, "user_file", userId);

      // 기존 이미지 삭제
      await this.deleteExistingImages(userDir);

      // DB에서 경로 제거
      await this.imageDao.updateImagePath(userId, null);

      return {
        message: `${this.config.serviceName} 이미지가 삭제되었습니다.`
      };
    } catch (error: any) {
      logger.error(
        `[${this.config.serviceName}] 이미지 삭제 실패:`,
        error
      );
      throw new OrkisError(
        error.message || `${this.config.serviceName} 이미지 삭제에 실패했습니다.`
      );
    }
  }

  // 이미지 경로 조회
  async getImagePath(userId: string): Promise<string | null> {
    return await this.imageDao.getImagePath(userId);
  }

  // 이미지 정보 조회
  async getImageInfo(userId: string): Promise<ImageInfo> {
    try {
      const imagePath = await this.imageDao.getImagePath(userId);

      return {
        hasImage: !!imagePath,
        imagePath: imagePath,
        imageUrl: imagePath ? this.buildImageUrl(userId) : null
      };
    } catch (error: any) {
      logger.error(
        `[${this.config.serviceName}] 이미지 정보 조회 실패:`,
        error
      );
      throw new OrkisError(
        error.message || `${this.config.serviceName} 이미지 정보 조회에 실패했습니다.`
      );
    }
  }

  // 이미지 파일 경로 조회 (파일 서빙용)
  async getImageFilePath(userId: string): Promise<string | null> {
    const imagePath = await this.imageDao.getImagePath(userId);
    if (!imagePath) {
      return null;
    }

    const storagePath = getStoragePath();
    const fullPath = path.join(storagePath, imagePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return path.resolve(fullPath);
  }

  // 이미지 URL 생성 (하위 클래스에서 오버라이드 가능)
  protected buildImageUrl(userId: string): string {
    return this.config.imageUrlPath.replace("{userId}", encodeURIComponent(userId));
  }

  // 디렉토리 생성
  protected async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // 기존 이미지 삭제
  protected async deleteExistingImages(userDir: string): Promise<void> {
    if (!fs.existsSync(userDir)) {
      return;
    }

    const files = fs.readdirSync(userDir);
    for (const file of files) {
      if (file.startsWith(`${this.config.filePrefix}_`)) {
        const filePath = path.join(userDir, file);
        fs.unlinkSync(filePath);
      }
    }
  }

  // 임시 파일을 최종 경로로 복사
  protected async copyFileToDestination(
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.copyFile(sourcePath, destPath, (err) => {
        if (err) {
          logger.error(`[${this.config.serviceName}] 파일 복사 실패:`, err);
          reject(new OrkisError("파일 저장에 실패했습니다."));
        } else {
          // 임시 파일 삭제
          fs.unlink(sourcePath, () => {});
          resolve();
        }
      });
    });
  }
}
