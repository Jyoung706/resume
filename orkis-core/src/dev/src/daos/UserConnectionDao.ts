import { Dao, InjectConnection } from "../../../main/core";

export interface UserDbConnection {
  id: number;
  user_id: number;
  db_type: string;
  host: string;
  port: number;
  database_name: string;
  db_user: string;
  db_password: string;
}

@Dao()
export class UserConnectionDao {
  @InjectConnection("main")
  private mainDb!: any;

  async findConnectionByUserId(
    userId: number
  ): Promise<UserDbConnection | null> {
    const result = await this.mainDb.query(
      `SELECT id, user_id, db_type, host, port, database_name, db_user, db_password
       FROM user_db_connections
       WHERE user_id = ?
       ORDER BY id ASC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }
}
