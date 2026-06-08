/**
 * Image Service Common Types
 * 프로필 이미지 및 배경 이미지 서비스의 공통 타입 정의
 */

// 허용된 이미지 MIME 타입
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/octet-stream"
];

// 스토리지 경로 조회
export const getStoragePath = (): string => {
  return process.env.STORAGE_PATH || "./storage";
};

// 이미지 업로드 결과
export interface ImageUploadResult {
  message: string;
  imagePath: string;
  imageUrl: string;
}

// 이미지 정보
export interface ImageInfo {
  hasImage: boolean;
  imagePath: string | null;
  imageUrl: string | null;
}

// 업로드 파일 정보
export interface UploadFile {
  path: string;
  originalname: string;
}

// 이미지 DAO 인터페이스
export interface IImageDao {
  updateImagePath(userId: string, imagePath: string | null): Promise<void>;
  getImagePath(userId: string): Promise<string | null>;
}

// 이미지 서비스 설정
export interface ImageServiceConfig {
  maxFileSize: number;
  filePrefix: string;
  imageUrlPath: string;
  serviceName: string;
}
