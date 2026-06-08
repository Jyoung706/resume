/**
 * Microsoft Graph API 이메일 발송 서비스
 * Azure AD 앱 인증을 통한 이메일 발송
 */

import { ClientSecretCredential, AccessToken } from "@azure/identity";
import {
  Client,
  AuthenticationProvider
} from "@microsoft/microsoft-graph-client";
import { Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import * as fs from "fs";

/**
 * Azure Identity 기반 AuthenticationProvider 구현
 * @microsoft/microsoft-graph-client/authProviders/azureTokenCredentials 의존성 제거
 */
class AzureAuthProvider implements AuthenticationProvider {
  private credential: ClientSecretCredential;
  private scopes: string[];
  private cachedToken: AccessToken | null = null;

  constructor(credential: ClientSecretCredential, scopes: string[]) {
    this.credential = credential;
    this.scopes = scopes;
  }

  async getAccessToken(): Promise<string> {
    // 토큰 만료 5분 전에 갱신
    const bufferTime = 5 * 60 * 1000;
    if (
      !this.cachedToken ||
      this.cachedToken.expiresOnTimestamp < Date.now() + bufferTime
    ) {
      this.cachedToken = await this.credential.getToken(this.scopes);
    }
    return this.cachedToken?.token || "";
  }
}

export interface EmailAttachment {
  filename: string;
  contentId: string;
  path: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  attachments?: EmailAttachment[];
}

@Service("GraphEmailSender")
export class GraphEmailSender {
  private graphClient: Client | null = null;

  /**
   * Graph API 클라이언트 초기화 (싱글톤)
   */
  private async getGraphClient(): Promise<Client> {
    if (this.graphClient) {
      return this.graphClient;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      throw new Error(
        "Azure AD 인증 정보가 설정되지 않았습니다. (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)"
      );
    }

    try {
      const credential = new ClientSecretCredential(
        tenantId,
        clientId,
        clientSecret
      );

      const authProvider = new AzureAuthProvider(credential, [
        "https://graph.microsoft.com/.default"
      ]);

      this.graphClient = Client.initWithMiddleware({ authProvider });      return this.graphClient;
    } catch (error) {
      logger.error("Graph API 클라이언트 초기화 실패:", error);
      throw error;
    }
  }

  /**
   * 이미지 파일을 Base64로 인코딩
   */
  private imageToBase64(imagePath: string): string {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString("base64");
    } catch (error) {
      logger.error(`이미지 로드 실패 (${imagePath}):`, error);
      throw error;
    }
  }

  /**
   * 이메일 발송
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const graphClient = await this.getGraphClient();
    const userEmail = process.env.AZURE_USER_EMAIL;

    if (!userEmail) {
      throw new Error(
        "발신자 이메일이 설정되지 않았습니다. (AZURE_USER_EMAIL)"
      );
    }

    // 첨부 이미지 처리
    const attachments =
      options.attachments?.map((att) => {
        const contentType = att.filename.endsWith(".png")
          ? "image/png"
          : "image/jpeg";
        return {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: att.filename,
          contentType: contentType,
          contentBytes: this.imageToBase64(att.path),
          contentId: att.contentId,
          isInline: true
        };
      }) || [];

    const message = {
      message: {
        subject: options.subject,
        body: {
          contentType: "HTML",
          content: options.htmlContent
        },
        toRecipients: [
          {
            emailAddress: { address: options.to }
          }
        ],
        attachments
      },
      saveToSentItems: true
    };

    try {
      await graphClient.api(`/users/${userEmail}/sendMail`).post(message);
    } catch (error: any) {
      logger.error(`이메일 발송 실패: ${options.to}`, error);

      if (error.message?.includes("BodyTooLarge")) {
        throw new Error("첨부 이미지 크기가 너무 큽니다. (최대 3MB)");
      }
      throw error;
    }
  }
}
