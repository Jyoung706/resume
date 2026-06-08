import { Dao, InjectConnection } from "../../../main/core";

@Dao()
export class LogDao {
  @InjectConnection("log")
  private conn!: any;

  async getLogs() {
    return await this.conn.query("SELECT * FROM logs");
  }

  async insertLog(message: string) {
    return await this.conn.query("INSERT INTO logs (message) VALUES (?)", [
      message
    ]);
  }
}
