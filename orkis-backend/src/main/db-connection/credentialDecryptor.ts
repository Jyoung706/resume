/**
 * Phase 3 PR#10-1 - DB connection 비밀번호 복호화의 SSOT.
 *
 * 이전에는 SqlExecutionService 내부 private 메서드. Phase 3 의
 * PostgresStreamAdapter (PR#10-2) / MysqlStreamAdapter (PR#11) 도 동일
 * 알고리즘으로 메모리 한정 평문 비밀번호가 필요해 공통 함수로 추출.
 *
 * 알고리즘:
 *   AES-256-GCM, scrypt(ENCRYPTION_KEY, salt="salt", 32 bytes)
 *   buf 구조: iv(16) + authTag(16) + data(가변)
 *   ENCRYPTION_KEY: 환경변수 DB_PASSWORD_ENCRYPTION_KEY (default 는 운영 X)
 *
 * 시맨틱:
 *   실패 시 throw 가 아니라 undefined 반환. 호출자가 _password=undefined_ 를
 *   받고 다음 단계 (driver connect) 에서 _인증 실패_ 로 자연스럽게 보고되도록.
 *
 * 변경 시 주의:
 *   본 함수의 알고리즘 / salt / 키 도출 방식 변경은 기존 저장된 비밀번호 복호화
 *   불가를 의미. 마이그레이션 필요.
 *
 * 보안:
 *   평문 / Buffer 값은 절대 로그에 출력 금지. 디버깅 메타데이터 (errorName) 만 허용.
 */
import crypto from "crypto";
import logger from "@orkis/core/utils";

export function decryptStoredPassword(
  passwordEncrypted: unknown
): string | undefined {
  if (!passwordEncrypted) return undefined;
  try {
    const buf: Buffer = Buffer.isBuffer(passwordEncrypted)
      ? passwordEncrypted
      : Buffer.from(passwordEncrypted as Buffer);

    const ENCRYPTION_KEY =
      process.env.DB_PASSWORD_ENCRYPTION_KEY ||
      "default-key-change-me-in-production";

    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const iv = buf.subarray(0, 16);
    const authTag = buf.subarray(16, 32);
    const data = buf.subarray(32);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(data.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err: any) {
    logger.warn(
      `[credentialDecryptor] decrypt 실패 errorName=${err?.name}`
    );
    return undefined;
  }
}
