/**
 * 이메일 템플릿 서비스
 * HTML 템플릿 로드 및 변수 치환
 */

import { Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import * as fs from "fs";
import * as path from "path";

export interface TemplateAttachment {
  filename: string;
  contentId: string;
  path: string;
}

@Service("EmailTemplateService")
export class EmailTemplateService {
  private templateDir: string;
  private imageDir: string;

  constructor() {
    // 프로젝트 루트 기준 경로 설정
    this.templateDir = path.resolve(process.cwd(), "resources/templates");
    this.imageDir = path.resolve(process.cwd(), "resources/images");
  }

  /**
   * 템플릿 로드 및 변수 치환
   */
  async renderTemplate(
    templateName: string,
    data: Record<string, string>
  ): Promise<string> {
    const templatePath = path.join(this.templateDir, `${templateName}.html`);

    if (!fs.existsSync(templatePath)) {
      logger.error(`템플릿 파일을 찾을 수 없습니다: ${templatePath}`);
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templateName}.html`);
    }

    try {
      let htmlContent = fs.readFileSync(templatePath, "utf-8");

      // 변수 치환 ${variableName}
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, "g");
        htmlContent = htmlContent.replace(regex, value);
      });      return htmlContent;
    } catch (error) {
      logger.error(`템플릿 렌더링 실패 (${templateName}):`, error);
      throw error;
    }
  }

  /**
   * 템플릿에 사용되는 이미지 첨부 정보 반환
   */
  getTemplateAttachments(): TemplateAttachment[] {
    const attachments: TemplateAttachment[] = [];

    const logoLightPath = path.join(this.imageDir, "logo_light.png");
    const logoGrayPath = path.join(this.imageDir, "logo_gray.png");

    if (fs.existsSync(logoLightPath)) {
      attachments.push({
        filename: "logo_light.png",
        contentId: "logo",
        path: logoLightPath
      });
    } else {    }

    if (fs.existsSync(logoGrayPath)) {
      attachments.push({
        filename: "logo_gray.png",
        contentId: "logo_gray",
        path: logoGrayPath
      });
    } else {    }

    return attachments;
  }

  /**
   * 템플릿 디렉토리 경로 반환
   */
  getTemplateDir(): string {
    return this.templateDir;
  }

  /**
   * 이미지 디렉토리 경로 반환
   */
  getImageDir(): string {
    return this.imageDir;
  }
}
