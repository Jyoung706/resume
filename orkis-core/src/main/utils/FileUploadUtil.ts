import fs from "fs-extra";
import path from "path";
import { systemLog } from "./Logger";

interface MulterFile extends Express.Multer.File {}

export interface SavedFileResult {
  filename: string;
  originalname: string;
  path: string;
  mimetype: string;
  size: number;
}

export class FileUploadUtil {
  private static getBasePath(): string {
    const basePath = process.env.FILE_UPLOAD_PATH;
    if (!basePath) {
      throw new Error(
        "FILE_UPLOAD_PATH environment variable is not set. " +
          "Please set it in your .env file (e.g., FILE_UPLOAD_PATH=/app/storage/uploads)"
      );
    }

    return path.resolve(basePath);
  }

  private static validatePathSegments(segments: string[]): void {
    for (const segment of segments) {
      if (
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\")
      ) {
        throw new Error(`Invalid path segment: "${segment}"`);
      }
    }
  }

  private static validateFilename(filename: string): void {
    if (
      !filename ||
      filename.includes("/") ||
      filename.includes("\\") ||
      filename.includes("..")
    ) {
      throw new Error(`Invalid filename: "${filename}"`);
    }
  }

  private static buildDestPath(subPaths: string[]): string {
    this.validatePathSegments(subPaths);
    const basePath = this.getBasePath();
    const destPath = path.join(basePath, ...subPaths);

    if (!destPath.startsWith(basePath)) {
      throw new Error("Path traversal detected");
    }

    return destPath;
  }

  /**
   * 단일 파일 저장
   * @param file - 업로드된 파일
   * @param subPaths - 하위 경로 배열 (예: ['users', 'avatars'])
   * @param filename - 저장할 파일명 (확장자 미포함 시 원본 확장자 자동 추가)
   * @returns 저장된 파일 정보
   *
   * @example
   * const result = await FileUploadUtil.saveFile(
   *   file,
   *   ['users', 'avatars'],
   *   'user-123'
   * );
   * // FILE_UPLOAD_PATH=/app/storage 일 때
   * // result.path: '/app/storage/users/avatars/user-123.jpg'
   */
  static async saveFile(
    file: MulterFile,
    subPaths: string[],
    filename: string
  ): Promise<SavedFileResult> {
    try {
      this.validateFilename(filename);
      const destDir = this.buildDestPath(subPaths);
      await fs.ensureDir(destDir);

      // 확장자가 없으면 원본 파일 확장자 추가
      const ext = path.extname(filename);
      const originalExt = path.extname(file.originalname);
      const finalFilename = ext ? filename : filename + originalExt;

      const destPath = path.join(destDir, finalFilename);
      await fs.move(file.path, destPath, { overwrite: false });

      return {
        filename: finalFilename,
        originalname: file.originalname,
        path: destPath,
        mimetype: file.mimetype,
        size: file.size
      };
    } catch (error: any) {
      systemLog.error(
        `[FileUpload] Failed to save file: ${file.originalname}`,
        error
      );

      if (error.code === "EEXIST") {
        throw new Error(
          `File already exists: ${filename}. Use a different filename.`
        );
      }

      throw error;
    }
  }

  /**
   * 복수 파일 저장
   * @param files - 업로드된 파일 배열
   * @param subPaths - 하위 경로 배열 (예: ['photos', 'gallery'])
   * @param filenameGenerator - 파일명 생성 함수
   * @returns 저장된 파일들의 정보 배열
   *
   * @example
   * const results = await FileUploadUtil.saveFiles(
   *   files,
   *   ['photos', 'gallery'],
   *   (file, index) => `${Date.now()}-${index}`
   * );
   */
  static async saveFiles(
    files: MulterFile[],
    subPaths: string[],
    filenameGenerator: (file: MulterFile, index: number) => string
  ): Promise<SavedFileResult[]> {
    const results: SavedFileResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = filenameGenerator(file, i);
      const result = await this.saveFile(file, subPaths, filename);
      results.push(result);
    }

    return results;
  }
}
