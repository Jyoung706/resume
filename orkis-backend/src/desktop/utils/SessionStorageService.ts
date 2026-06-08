import { Component } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import fs from "fs";
import path from "path";

const KEY_PREFIX = "orkis:session:";

interface StorageEntry {
  data: any;
  expiresAt: number | null; // epoch ms, null = no expiry
}

@Component("SessionStorageService")
export class SessionStorageService {
  private storePath: string;
  private store: Map<string, StorageEntry> = new Map();
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const dataRoot = process.env.DATA_PATH || process.cwd();
    this.storePath = path.resolve(dataRoot, "session", "session-storage.json");
    this.loadFromDisk();
  }

  async saveData(key: string, data: any, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = KEY_PREFIX + key;
      const entry: StorageEntry = {
        data,
        expiresAt:
          ttlSeconds && ttlSeconds > 0
            ? Date.now() + ttlSeconds * 1000
            : null
      };
      this.store.set(fullKey, entry);
      this.schedulFlush();
    } catch (error) {
      logger.error(`[SessionStorage] saveData error (key: ${key}):`, error);
      throw error;
    }
  }

  async readData(key: string): Promise<any | null> {
    try {
      const fullKey = KEY_PREFIX + key;
      const entry = this.store.get(fullKey);
      if (!entry) {
        return null;
      }
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.store.delete(fullKey);
        this.schedulFlush();
        return null;
      }
      return entry.data;
    } catch (error) {
      logger.error(`[SessionStorage] readData error (key: ${key}):`, error);
      return null;
    }
  }

  async deleteData(key: string): Promise<boolean> {
    try {
      const fullKey = KEY_PREFIX + key;
      const deleted = this.store.delete(fullKey);
      if (deleted) {
        this.schedulFlush();
      }
      return deleted;
    } catch (error) {
      logger.error(`[SessionStorage] deleteData error (key: ${key}):`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = KEY_PREFIX + key;
      const entry = this.store.get(fullKey);
      if (!entry) {
        return false;
      }
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.store.delete(fullKey);
        this.schedulFlush();
        return false;
      }
      return true;
    } catch (error) {
      logger.error(`[SessionStorage] exists error (key: ${key}):`, error);
      return false;
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, "utf-8");
        const entries: [string, StorageEntry][] = JSON.parse(raw);
        const now = Date.now();
        for (const [key, entry] of entries) {
          if (!entry.expiresAt || now <= entry.expiresAt) {
            this.store.set(key, entry);
          }
        }
        logger.info(
          `[SessionStorage] Loaded ${this.store.size} entries from disk`
        );
      }
    } catch (error) {
      logger.warn("[SessionStorage] Failed to load from disk, starting fresh");
      this.store.clear();
    }
  }

  private flushToDisk(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!dir) return;
      fs.mkdirSync(dir, { recursive: true });

      const now = Date.now();
      const entries: [string, StorageEntry][] = [];
      for (const [key, entry] of this.store.entries()) {
        if (!entry.expiresAt || now <= entry.expiresAt) {
          entries.push([key, entry]);
        }
      }

      fs.writeFileSync(this.storePath, JSON.stringify(entries), "utf-8");
      this.dirty = false;
    } catch (error) {
      logger.error("[SessionStorage] Failed to flush to disk:", error);
    }
  }

  private schedulFlush(): void {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (this.dirty) {
        this.flushToDisk();
      }
    }, 1000);
  }
}
