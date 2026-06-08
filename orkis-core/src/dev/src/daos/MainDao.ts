import { Dao, InjectConnection } from "../../../main/core";

@Dao()
export class MainDao {
  @InjectConnection("sqlite")
  private conn!: any;

  async getUsers() {
    return await this.conn.query("SELECT * FROM users");
  }

  async insertUser(name: string, age: number) {
    return await this.conn.query(
      "INSERT INTO users (name, age) VALUES (?, ?)",
      [name, age]
    );
  }
}
