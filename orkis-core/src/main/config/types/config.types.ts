/**
 * Multipart 요청 설정
 */
export interface MultipartConfig {
  maxFileSize?: number;
  maxCount?: number;
  allowedMimeTypes?: string[];
}

/**
 * @Configuration 파일 업로드 전역 설정
 */
export interface IFileUploadConfig {
  /**
   * 파일당 최대 크기 (bytes)
   * @default 5242880 (5MB)
   * @example 20 * 1024 * 1024  // 20MB
   */
  maxFileSize?: number;

  /**
   * 필드당 최대 파일 개수
   * @default 1
   * @example 10  // 최대 10개 파일
   */
  maxCount?: number;

  /**
   * 허용할 MIME 타입 목록
   * @default [] (모든 타입 허용)
   * @example ["image/jpeg", "image/png", "application/pdf"]
   */
  allowedMimeTypes?: string[];

  /**
   * 임시 업로드 디렉토리
   * @default "./uploads/tmp"
   * @example "./storage/temp"
   */
  tempDir?: string;
}
