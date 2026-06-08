import { Autowired, Controller, Get } from "../../../main/core";
import { EagerTestService } from "../services/EagerTestService";

@Controller({ path: "/eager" })
export class EagerTestController {
  @Autowired("EagerTestService")
  private eagerTestService!: EagerTestService;

  // GET /eager/main-only - MainDao만 사용
  @Get("main-only")
  async mainOnly() {
    const result = await this.eagerTestService.onlyMainQuery();
    return { success: true, data: result };
  }

  // GET /eager/log-only - LogDao만 사용
  @Get("log-only")
  async logOnly() {
    const result = await this.eagerTestService.onlyLogQuery();
    return { success: true, data: result };
  }

  // GET /eager/both - 둘 다 사용
  @Get("both")
  async both() {
    const result = await this.eagerTestService.bothQuery();
    return { success: true, data: result };
  }
}
