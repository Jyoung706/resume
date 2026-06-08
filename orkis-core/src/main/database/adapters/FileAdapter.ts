import path from "path";
import { systemLog } from "../../utils/Logger";
import { BaseAdapter } from "./BaseAdapter";
import * as fs from "fs/promises";
import { FileDatabaseConfig } from "../types";

interface FileSystemClient {
  basePath: string;
  encoding: BufferEncoding;
}

interface Transaction {
  id: string;
  startTime: Date;
  backup: Map<string, any>;
  locks: Set<string>;
  operations: Array<{ type: string; file: string }>;
}

export class FileAdapter extends BaseAdapter<
  FileSystemClient,
  FileDatabaseConfig
> {
  private basePath: string = "./data";
  private encoding: BufferEncoding = "utf-8";
  private fileExtension: string = ".json";
  private lockFiles: Map<string, boolean> = new Map();

  private transactions: Map<string, Transaction> = new Map();
  private globalLocks: Map<string, string> = new Map();

  async create(): Promise<void> {
    try {
      this.basePath = this.config.filePath || "./data";
      this.encoding = this.config.options?.encoding || "utf-8";
      this.fileExtension = this.config.options?.extension || ".json";

      await fs.mkdir(this.basePath, { recursive: true });

      this.connectionInstance = {
        basePath: this.basePath,
        encoding: this.encoding
      };

      const testFile = path.join(this.basePath, ".test");
      await fs.writeFile(testFile, "test", this.encoding);
      await fs.unlink(testFile);

      this._isConnected = true;
      systemLog.info(`Filesystem connected to ${this.basePath}`);
    } catch (error) {
      this.handleError(error, "connect");
    }
  }

  async connect(): Promise<FileSystemClient> {
    if (!this.connectionInstance) {
      throw new Error("FileSystem not created. Call create() first.");
    }
    return this.connectionInstance;
  }

  async disconnect(): Promise<void> {
    systemLog.info("Filesystem disconnect callded");
  }

  async destroy(): Promise<void> {
    try {
      // 모든 잠금 해제
      this.lockFiles.clear();

      // 진행 중인 트랜잭션 롤백
      for (const [txId, transaction] of this.transactions) {
        systemLog.warn(
          `[${this.adapterName}] Rolling back incomplete transaction: ${txId}`
        );
        // 백업 복원 로직 (필요시)
        for (const [file, backup] of transaction.backup) {
          try {
            await this.writeFile(file, backup);
          } catch (e) {
            systemLog.error(`Failed to restore backup for ${file}:`, e);
          }
        }
      }
      this.transactions.clear();
      this.globalLocks.clear();

      this.connectionInstance = null;
      this._isConnected = false;
      systemLog.info("FileSystem destroyed");
    } catch (error) {
      this.handleError(error, "destroy");
    }
  }

  async query(command: string, params?: any[]): Promise<any> {
    if (!this.connectionInstance) {
      throw new Error("FileSystem not connected");
    }

    const [operation, ...args] = command.trim().split(/\s+/);
    const upperOp = operation.toUpperCase();

    switch (upperOp) {
      case "READ":
        return await this.readFile(args[0] || params?.[0]);

      case "WRITE":
        return await this.writeFile(args[0] || params?.[0], params?.[1]);

      case "DELETE":
        return await this.deleteFile(args[0] || params?.[0]);

      case "EXISTS":
        return await this.fileExists(args[0] || params?.[0]);

      case "LIST":
        return await this.listFiles(args[0] || params?.[0]);

      case "MKDIR":
        return await this.createDirectory(args[0] || params?.[0]);

      case "RMDIR":
        return await this.removeDirectory(args[0] || params?.[0]);

      case "APPEND":
        return await this.appendToFile(args[0] || params?.[0], params?.[1]);

      case "RENAME":
        return await this.renameFile(
          args[0] || params?.[0],
          args[1] || params?.[1]
        );

      default:
        throw new Error(`Unsupported file operation: ${operation}`);
    }
  }

  public supportsTransaction(): boolean {
    return false;
  }

  private getFullPath(filename: string): string {
    if (!filename.includes(".")) {
      filename += this.fileExtension;
    }
    return path.join(this.basePath, filename);
  }

  private async acquireLock(
    filename: string,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (this.lockFiles.get(filename)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Lock timeout for file: ${filename}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.lockFiles.set(filename, true);
  }

  private releaseLock(filename: string): void {
    this.lockFiles.delete(filename);
  }

  private async readFile(filename: string): Promise<any> {
    const filePath = this.getFullPath(filename);

    try {
      const content = await fs.readFile(filePath, this.encoding);

      if (this.fileExtension === ".json") {
        return JSON.parse(content);
      }

      return content;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private async writeFile(filename: string, data: any): Promise<any> {
    const filePath = this.getFullPath(filename);

    await this.acquireLock(filename);

    try {
      let content = data;

      if (
        this.fileExtension === ".json" &&
        data !== null &&
        data !== undefined
      ) {
        content = JSON.stringify(data, null, 2);
      }

      await fs.writeFile(filePath, content, this.encoding);

      return { success: true, path: filePath };
    } finally {
      this.releaseLock(filename);
    }
  }

  private async deleteFile(filename: string): Promise<any> {
    const filePath = this.getFullPath(filename);

    try {
      await fs.unlink(filePath);
      return { success: true, deleted: filePath };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return { success: false, message: "File not found" };
      }
      throw error;
    }
  }

  private async fileExists(filename: string): Promise<boolean> {
    const filePath = this.getFullPath(filename);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async listFiles(pattern?: string): Promise<string[]> {
    try {
      const files = await fs.readdir(this.basePath);

      if (pattern) {
        const regex = new RegExp(pattern);
        return files.filter((file) => regex.test(file));
      }

      return files;
    } catch (error) {
      this.handleError(error, "listsFiles");
    }
  }

  private async createDirectory(dirname: string): Promise<any> {
    const dirPath = path.join(this.basePath, dirname);
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true, path: dirPath };
  }

  // rmdir관련 deprecated 설명 보기
  private async removeDirectory(dirname: string): Promise<any> {
    const dirPath = path.join(this.basePath, dirname);
    await fs.rmdir(dirPath, { recursive: true });
    return { success: true, deleted: dirPath };
  }

  private async appendToFile(filename: string, data: any): Promise<any> {
    const filepath = this.getFullPath(filename);

    await this.acquireLock(filename);

    try {
      let content = data;

      if (
        this.fileExtension === ".json" &&
        data !== null &&
        data !== undefined
      ) {
        const existing = await this.readFile(filename);

        let result: any;

        if (existing === null) {
          result = Array.isArray(data) ? data : [data];
        } else if (Array.isArray(existing)) {
          result = Array.isArray(data)
            ? [...existing, ...data]
            : [...existing, data];
        } else {
          result = Array.isArray(data) ? [existing, ...data] : [existing, data];
        }

        const content = JSON.stringify(result, null, 2);
        await fs.writeFile(filepath, content, this.encoding);

        return { success: true, path: filepath };
      }

      await fs.appendFile(filepath, content, this.encoding);
      return { success: true, path: filepath };
    } finally {
      this.releaseLock(filename);
    }
  }

  private async renameFile(oldName: string, newName: string): Promise<any> {
    const oldPath = this.getFullPath(oldName);
    const newPath = this.getFullPath(newName);

    await fs.rename(oldPath, newPath);
    return { success: true, oldPath, newPath };
  }

  async *readStream(
    filename: string,
    chumkSize: number = 1024
  ): AsyncGenerator<string> {
    const filePath = this.getFullPath(filename);
    const stream = (await import("fs")).createReadStream(filePath, {
      encoding: this.encoding,
      highWaterMark: chumkSize
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  async getFileInfo(filename: string): Promise<any> {
    const filePath = this.getFullPath(filename);
    const stats = await fs.stat(filePath);

    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    };
  }
}
