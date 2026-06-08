import { Autowired, Controller, Get, Param } from "../../../main/core";
import { DynamicService } from "../services/DynamicService";

@Controller({ path: "/dynamic" })
export class DynamicController {
  @Autowired("DynamicService")
  dynamicService!: DynamicService;

  @Get("/:userId")
  async getUserInfo(@Param("userId") userId: string) {
    const userInfo = await this.dynamicService.getUserInfo(userId);

    return {
      success: true,
      data: userInfo
    };
  }
}
