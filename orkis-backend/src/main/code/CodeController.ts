import {
  Autowired,
  Controller,
  Body,
  RequestMapping,
  REQUEST_METHOD
} from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { CodeService } from "./CodeService";

@Controller({ path: "/codes" })
export class CodeController {
  @Autowired("CodeService")
  private codeService!: CodeService;
  @RequestMapping({
    route: "/details",
    method: REQUEST_METHOD.POST
  })
  async getCodeDetailsByGroup(@Body() body: { groupId: string }): Promise<any> {
    try {
      const { groupId } = body;      const result = await this.codeService.getCodeDetailsByGroup(groupId);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error("[CodeController] getCodeDetailsByGroup 에러:", error);
      return {
        success: false,
        message: "공통코드 조회 중 오류가 발생했습니다."
      };
    }
  }
  @RequestMapping({
    route: "/groups",
    method: REQUEST_METHOD.POST
  })
  async getCodeGroups(): Promise<any> {
    try {      const result = await this.codeService.getCodeGroups();

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error("[CodeController] getCodeGroups 에러:", error);
      return {
        success: false,
        message: "공통코드 그룹 조회 중 오류가 발생했습니다."
      };
    }
  }
}
