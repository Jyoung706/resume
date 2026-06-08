import { Autowired, Body, Controller, Post } from "../../../main/core";
import { QueryService } from "../services/QueryService";

interface RunQueryBody {
  userId: number;
  sql: string;
  params?: any[];
}

@Controller({ path: "/query" })
export class QueryController {
  @Autowired("QueryService")
  private queryService!: QueryService;

  @Post("/run")
  async run(@Body() body: RunQueryBody) {
    if (!body?.userId || !body?.sql) {
      return { success: false, error: "userId and sql are required" };
    }

    try {
      const data = await this.queryService.runUserQuery(
        body.userId,
        body.sql,
        body.params
      );
      return { success: true, ...data };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message ?? String(err),
        code: err?.code
      };
    }
  }
}
