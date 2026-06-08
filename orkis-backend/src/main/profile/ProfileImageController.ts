import type { MulterFile } from "@orkis/core/application";
import {
  Autowired,
  Body,
  Controller,
  Files,
  REQUEST_METHOD,
  REQUEST_TYPE,
  RequestMapping,
  Res,
  Session
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import * as fs from "fs";
import * as path from "path";
import { OrkisError } from "../error/OrkisError";
import { ProfileImageService } from "./ProfileImageService";

// MIME 타입 매핑
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp"
};

@Controller({ path: "/profile" })
export class ProfileImageController {
  @Autowired("ProfileImageService")
  private profileImageService!: ProfileImageService;

  // 프로필 이미지 업로드
  // CHECK_SESSION (기본값) - OrkisInterCeptor에서 세션 검증
  @RequestMapping({
    route: "/image/upload",
    method: REQUEST_METHOD.POST,
    requestType: REQUEST_TYPE.UPLOAD,
    multipartConfig: {
      maxFileSize: ProfileImageService.MAX_FILE_SIZE,
      allowedMimeTypes: ProfileImageService.ALLOWED_MIME_TYPES
    }
  })
  async uploadProfileImage(
    @Session() session: any,
    @Files("image") files: MulterFile[]
  ): Promise<any> {
    try {
      // 인터셉터에서 세션 검증 완료, session.login_info 보장됨
      const userId = String(session.login_info.ID);

      // 파일 확인
      if (!files || files.length === 0) {
        throw new OrkisError("업로드할 이미지 파일이 없습니다.");
      }

      const uploadedFile = files[0];      // 서비스 호출
      const result = await this.profileImageService.uploadProfileImage(userId, {
        path: uploadedFile.path,
        originalname: uploadedFile.originalname
      });

      // 세션 정보 업데이트
      session.login_info.PROFILE_IMAGE = result.imagePath;
      session.save();      return result;
    } catch (error: any) {
      logger.error("[ProfileImageController] uploadProfileImage 에러:", error);
      throw new OrkisError(
        error.message || "프로필 이미지 업로드에 실패했습니다."
      );
    }
  }

  // 프로필 이미지 삭제
  // CHECK_SESSION (기본값) - OrkisInterCeptor에서 세션 검증
  @RequestMapping({
    route: "/image/delete",
    method: REQUEST_METHOD.POST
  })
  async deleteProfileImage(@Session() session: any): Promise<any> {
    try {
      // 인터셉터에서 세션 검증 완료, session.login_info 보장됨
      const userId = String(session.login_info.ID);      // 서비스 호출
      const result = await this.profileImageService.deleteProfileImage(userId);

      // 세션 정보 업데이트
      session.login_info.PROFILE_IMAGE = null;
      session.save();      return result;
    } catch (error: any) {
      logger.error("[ProfileImageController] deleteProfileImage 에러:", error);
      throw new OrkisError(
        error.message || "프로필 이미지 삭제에 실패했습니다."
      );
    }
  }

  // 프로필 이미지 조회 (파일 서빙)
  // CHECK_SESSION (기본값) - OrkisInterCeptor에서 세션 검증
  // POST 방식으로 변경하여 userId를 body에서 받음
  @RequestMapping({
    route: "/image/get",
    method: REQUEST_METHOD.POST,
    requestType: REQUEST_TYPE.DOWNLOAD
  })
  async getProfileImage(
    @Body() body: { userId?: string },
    @Session() session: any,
    @Res() res: any
  ): Promise<void> {
    try {
      // body에서 userId를 받거나, 없으면 현재 로그인 사용자의 ID 사용
      const userId = String(body?.userId || session.login_info.ID);      if (!userId) {        res.status(400).json({ error: "사용자 ID가 필요합니다." });
        return;
      }

      // 서비스에서 파일 경로 조회
      const filePath =
        await this.profileImageService.getProfileImageFilePath(userId);      if (!filePath) {        res.status(200).json({ hasImage: false, imageData: null });
        return;
      }

      // 파일 확장자에서 MIME 타입 결정
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      // 파일을 동기적으로 읽어서 응답 (프레임워크 충돌 방지)
      const fileBuffer = fs.readFileSync(filePath);      // 응답 헤더 설정 및 파일 전송
      res.set("Content-Type", contentType);
      res.set("Content-Length", fileBuffer.length.toString());
      res.set("Cache-Control", "public, max-age=3600"); // 1시간 캐시
      res.send(fileBuffer);
    } catch (error: any) {
      logger.error("[ProfileImageController] getProfileImage 에러:", error);
      res.status(500).json({ error: "프로필 이미지 조회에 실패했습니다." });
    }
  }

  // 현재 로그인 사용자의 프로필 이미지 정보 조회
  // CHECK_SESSION (기본값) - OrkisInterCeptor에서 세션 검증
  @RequestMapping({
    route: "/image/info",
    method: REQUEST_METHOD.POST
  })
  async getProfileImageInfo(@Session() session: any): Promise<any> {
    try {
      // 인터셉터에서 세션 검증 완료, session.login_info 보장됨
      const userId = String(session.login_info.ID);      // 서비스 호출
      const result =
        await this.profileImageService.getProfileImageInfo(userId);      return result;
    } catch (error: any) {
      logger.error("[ProfileImageController] getProfileImageInfo 에러:", error);
      throw new OrkisError(
        error.message || "프로필 이미지 정보 조회에 실패했습니다."
      );
    }
  }
}
