import { Dao, InjectConnection } from "../../../main/core";
import { SQLiteAdapter } from "../../../main/database";

@Dao()
export class TestDao {
  @InjectConnection("sqlite")
  private conn!: SQLiteAdapter;

  async getAllUsers() {
    return await this.conn.query("SELECT * FROM users;");
  }

  async insertUser(user: { name: string; age: number }) {
    return await this.conn.query("INSERT INTO users (name,age) VALUES (?,?)", [
      user.name,
      user.age
    ]);
  }
}
