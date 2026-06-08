import logger from "@orkis/core/utils";
import { promises as fs } from "fs";
import path from "path";

export class FileDatabase<T> {
  private filePath: string;

  constructor(tableName: string) {
    this.filePath = path.resolve(
      __dirname,
      "../../db_file",
      `${tableName}.json`
    );
  }

  private async read(): Promise<T[]> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(data || "[]");
      return parsed;
    } catch (error) {
      logger.error(`[FileDatabase] 파일 읽기 실패: ${this.filePath}`, error);
      return [];
    }
  }

  private async write(data: T[]) {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async getAll(): Promise<T[]> {
    return await this.read();
  }

  //   async getById(id: string): Promise<T | undefined> {
  //     const data = await this.read();
  //     return data.find(d => d.id === id);
  //   }

  async create(item: T): Promise<void> {
    const data = await this.read();
    data.push(item);
    await this.write(data);
  }

  //   async update(id: string, update: Partial<T>): Promise<boolean> {
  //     const data = await this.read();
  //     const index = data.findIndex(d => d.id === id);
  //     if (index === -1) return false;
  //     data[index] = { ...data[index], ...update };
  //     await this.write(data);
  //     return true;
  //   }

  //   async delete(id: string): Promise<boolean> {
  //     const data = await this.read();
  //     const filtered = data.filter(d => d.id !== id);
  //     if (filtered.length === data.length) return false;
  //     await this.write(filtered);
  //     return true;
  //   }
}
