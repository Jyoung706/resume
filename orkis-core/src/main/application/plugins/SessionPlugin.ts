import { Express } from "express";
import { DatabaseConnectionManager, NewRedisAdapter } from "../../database";
import { DatabaseType } from "../../database/types";
import { systemLog } from "../../utils/Logger";
import { CookieOptions } from "express-session";

export class SessionPlugin {
  private static readonly defaultCookieOption: CookieOptions = {
    maxAge: 86400 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const
  };

  private static readonly defaultSessionOption = {
    secret: process.env.SESSION_SECRET || "orkis-default-secret",
    resave: false,
    saveUninitialized: false
  };

  static async apply(app: Express, dbName?: string): Promise<void> {
    systemLog.info("[SessionPlugin] Initializing session store...");

    try {
      if (dbName) {
        const dbManager = DatabaseConnectionManager.getInstance();
        const adapter = dbManager.getAdapter<NewRedisAdapter>(dbName);
        await this.setupDatabaseSession(app, adapter);
        return;
      }

      await this.setupFileSession(app);
    } catch (error) {
      systemLog.error("[SessionPlugin] Failed to initialize:", error);
      throw error;
    }
  }

  private static async setupDatabaseSession(app: Express, adapter: any) {
    const config = adapter.config;
    const databaseType = config.databaseType;

    switch (databaseType) {
      case DatabaseType.NEW_REDIS:
        await this.setupRedisSessionStore(app, adapter);
        break;
      // 추후 다른 db로 처리 가능하도록 남겨둠
      default:
        throw new Error(
          `[SessionPlugin] Unsupported session database type: ${databaseType}. ` +
            `Supported types: NEW_REDIS`
        );
    }
  }

  private static async setupRedisSessionStore(
    app: Express,
    adapter: NewRedisAdapter
  ) {
    const metadata = adapter.getMetadata();
    const redisClient = adapter.getConnectionInstance();

    const { RedisStore } = await import("connect-redis");
    const session = (await import("express-session")).default;

    app.use(
      session({
        store: new RedisStore({
          client: redisClient,
          prefix: metadata.prefix || "orkis:session:",
          ttl: metadata.ttl || 86400
        }),
        cookie: this.defaultCookieOption,
        ...this.defaultSessionOption
      })
    );

    systemLog.info(
      `[SessionPlugin] Redis session store initialized (prefix: ${metadata.prefix})`
    );
  }

  private static async setupFileSession(app: Express): Promise<void> {
    systemLog.warn(
      "[SessionPlugin] No session database configured, using file-based session store (fallback)"
    );

    const session = (await import("express-session")).default;
    const FileStoreModule = await import("session-file-store");
    const FileStore = FileStoreModule.default(session);

    app.use(
      session({
        store: new FileStore({
          path: process.env.SESSION_PATH || "./session",
          ttl: parseInt(process.env.SESSION_TTL || "86400")
        }),
        cookie: this.defaultCookieOption,
        ...this.defaultSessionOption
      })
    );

    systemLog.info("[SessionPlugin] File session store initialized (fallback)");
  }
}
