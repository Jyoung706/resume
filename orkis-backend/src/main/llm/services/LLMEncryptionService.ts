import { Service } from "@orkis/core/common";
import crypto from "crypto";

/**
 * LLM API 키 암호화/복호화 서비스
 * AES-256-CBC 알고리즘을 사용하여 API 키를 안전하게 저장
 */
@Service("LLMEncryptionService")
export class LLMEncryptionService {
  // DI Proxy에서 readonly 필드가 Proxy 클래스 상속 시 undefined로 초기화되는 문제
  // 해결책: 메서드로 상수 반환하거나 직접 리터럴 사용
  private encryptionKey: Buffer | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // DI Proxy 문제로 인해 lazy initialization 사용
  }

  /**
   * 암호화 알고리즘 상수 반환
   */
  private getAlgorithm(): string {
    return "aes-256-cbc";
  }

  /**
   * IV 길이 상수 반환
   */
  private getIvLength(): number {
    return 16;
  }

  /**
   * 암호화 키 초기화 (lazy initialization)
   */
  private initializeKey(): void {
    if (this.isInitialized) {
      return;
    }

    const key = process.env.LLM_ENCRYPTION_KEY;
    if (!key) {
      throw new Error("LLM_ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다.");
    }

    if (key.length !== 64) {
      throw new Error("LLM_ENCRYPTION_KEY는 64자(32바이트 hex)여야 합니다.");
    }

    this.encryptionKey = Buffer.from(key, "hex");
    this.isInitialized = true;
  }

  /**
   * API 키 암호화
   * @param apiKey 원본 API 키
   * @returns IV와 함께 암호화된 데이터 (형식: IV:암호화된데이터)
   */
  encrypt(apiKey: string): string {
    this.initializeKey();

    const key = this.encryptionKey;
    if (!key) {
      throw new Error("암호화 키 초기화 실패");
    }

    const iv = crypto.randomBytes(this.getIvLength());
    const cipher = crypto.createCipheriv(this.getAlgorithm(), key, iv);

    let encrypted = cipher.update(apiKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  }

  /**
   * API 키 복호화
   * @param encryptedData 암호화된 데이터 (형식: IV:암호화된데이터)
   * @returns 원본 API 키
   */
  decrypt(encryptedData: string): string {
    this.initializeKey();

    const key = this.encryptionKey;
    if (!key) {
      throw new Error("암호화 키 초기화 실패");
    }

    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      throw new Error("잘못된 암호화 데이터 형식입니다.");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(this.getAlgorithm(), key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * API 키 마스킹 처리
   * @param apiKey 원본 API 키
   * @returns 마스킹된 API 키 (예: sk-***************abc)
   */
  maskApiKey(apiKey: string): string {
    if (apiKey.length < 10) {
      return "***";
    }
    return `${apiKey.slice(0, 3)}***************${apiKey.slice(-3)}`;
  }

  /**
   * 암호화 키 생성 헬퍼 (초기 설정용)
   * @returns 32바이트 랜덤 키 (64자 hex)
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}
