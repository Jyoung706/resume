import { META_KEYS } from "../../constants";
import {
  ConnectionMetadata,
  InjectConnectionOptions
} from "../../../database/types";

/**
 * Database Connection을 프로퍼티에 주입하는 데코레이터
 *
 * @param datasourceName - DatabaseConfig에 정의된 사용할 데이터소스 이름 (예: "main", "sqlite")
 *
 * @example
 * ```typescript
 * import { PoolClient } from 'pg';
 *
 * \@Dao("UserRepository")
 * export class UserRepository {
 *   \@InjectConnection("main")
 *   private conn!: PoolClient;
 *
 *   async findById(userId: string) {
 *     const result = await this.conn.query(
 *       "SELECT * FROM users WHERE id = $1",
 *       [userId]
 *     );
 *     return result.rows[0];
 *   }
 * }
 * ```
 */

export const InjectConnection = (
  datasourceName: string = "main",
  options: InjectConnectionOptions = {}
) => {
  return (target: any, propertyKey: string) => {
    const existingConnections: ConnectionMetadata[] =
      Reflect.getMetadata(
        META_KEYS.CONNECTION_PROPERTIES,
        target.constructor
      ) || [];

    existingConnections.push({
      propertyKey,
      datasourceName,
      options: {
        dynamic: options?.dynamic ?? false,
        type: options?.type ?? "wrapped"
      }
    });

    Reflect.defineMetadata(
      META_KEYS.CONNECTION_PROPERTIES,
      existingConnections,
      target.constructor
    );
  };
};
