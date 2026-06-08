import { Dao, InjectConnection } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import type { DbType } from "@orkis-interface/backend/db-connection";
import { PoolClient } from "pg";

@Dao("DbTypeDao")
export class DbTypeDao {
  @InjectConnection("main")
  private pool!: PoolClient;

  async findAll(): Promise<DbType[]> {
    try {
      const query = `
        SELECT
          db_type_id as "dbTypeId",
          type_name as "typeName",
          display_name as "displayName",
          default_port as "defaultPort",
          driver_class as "driverClass",
          connection_string_template as "connectionStringTemplate",
          description,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt",
          category,
          logo_url as "logoUrl",
          color,
          features,
          use_cases as "useCases",
          popularity,
          display_order as "displayOrder"
        FROM db_types
        ORDER BY display_order NULLS LAST, db_type_id
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error("[DbTypeDao] findAll 에러:", error);
      throw error;
    }
  }

  async findById(dbTypeId: number): Promise<DbType | null> {
    try {
      const query = `
        SELECT
          db_type_id as "dbTypeId",
          type_name as "typeName",
          display_name as "displayName",
          default_port as "defaultPort",
          driver_class as "driverClass",
          connection_string_template as "connectionStringTemplate",
          description,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt",
          category,
          logo_url as "logoUrl",
          color,
          features,
          use_cases as "useCases",
          popularity,
          display_order as "displayOrder"
        FROM db_types
        WHERE db_type_id = $1
      `;

      const result = await this.pool.query(query, [dbTypeId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[DbTypeDao] findById 에러:", error);
      throw error;
    }
  }

  async findByTypeName(typeName: string): Promise<DbType | null> {
    try {
      const query = `
        SELECT
          db_type_id as "dbTypeId",
          type_name as "typeName",
          display_name as "displayName",
          default_port as "defaultPort",
          driver_class as "driverClass",
          connection_string_template as "connectionStringTemplate",
          description,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt",
          category,
          logo_url as "logoUrl",
          color,
          features,
          use_cases as "useCases",
          popularity,
          display_order as "displayOrder"
        FROM db_types
        WHERE type_name = $1
      `;

      const result = await this.pool.query(query, [typeName]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[DbTypeDao] findByTypeName 에러:", error);
      throw error;
    }
  }
}
