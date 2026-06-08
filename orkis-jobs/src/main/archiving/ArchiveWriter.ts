import * as fs from "fs";
import * as path from "path";
import { Service } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { SessionData } from "@/archiving/archiveTypes";

/**
 * archive 파일 atomic append 작성기.
 *
 * 디렉토리 규약: ${cwd}/${DATA_ARCHIVE_DIR_PATH ?? "data-archive"}/{chatroomId|chatId}/{YYYY-MM-DD}.json
 * (기존 DataArchiveJob.saveToFile L541-588 와 동일 규약)
 *
 * 절차: read existing → 동일 chatId record dedup skip → push → tmp write → fs.rename(atomic)
 */
@Service()
export class ArchiveWriter {
  private readonly baseDir =
    process.env.DATA_ARCHIVE_DIR_PATH ?? "data-archive";

  /**
   * 동일 chatId 가 이미 파일에 있으면 skip(written=false), 그렇지 않으면 atomic append.
   */
  async appendAtomic(sessionData: SessionData): Promise<{ written: boolean }> {
    const folderName = sessionData.chatroomId ?? sessionData.chatId;
    const dateString = new Date().toISOString().split("T")[0];
    const folderPath = path.join(process.cwd(), this.baseDir, folderName);
    const filePath = path.join(folderPath, `${dateString}.json`);
    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;

    await fs.promises.mkdir(folderPath, { recursive: true });

    const existing = await this.readExisting(filePath);

    // R7 dedup: 동일 chatId record 가 이미 있으면 skip
    if (existing.some((r) => r?.chatId === sessionData.chatId)) {
      logger.info(
        `[archive] skip duplicate record chatId=${sessionData.chatId}`
      );
      return { written: false };
    }

    existing.push(sessionData);
    const json = JSON.stringify(existing, null, 2);

    try {
      await fs.promises.writeFile(tmpPath, json, "utf8");
      await fs.promises.rename(tmpPath, filePath);
    } catch (err) {
      await fs.promises.unlink(tmpPath).catch(() => {
        // tmp 정리 실패는 무시 (다음 쓰기 시 덮어쓰기됨)
      });
      throw err;
    }

    logger.info(`[archive] written chatId=${sessionData.chatId} path=${filePath}`);
    return { written: true };
  }

  private async readExisting(
    filePath: string
  ): Promise<Array<{ chatId?: string }>> {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err: unknown) {
      const errno = (err as NodeJS.ErrnoException).code;
      if (errno === "ENOENT") return [];
      logger.warn(
        `[archive] read existing 실패, 빈 배열로 시작 path=${filePath} err=${String(
          err
        )}`
      );
      return [];
    }
  }
}
