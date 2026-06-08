import { Autowired, Service, Transactional } from "@orkis/core/common";
import logger from "@orkis/core/utils";
import { CodeDao } from "@/code/CodeDao";

export interface CodeDetail {
  groupId: string;
  codeId: string;
  codeName: string;
  codeNameEn?: string;
  description?: string;
  displayOrder: number;
  useYn: string;
  attr1?: string;
  attr2?: string;
  attr3?: string;
  attr4?: string;
  attr5?: string;
}

export interface CodeGroup {
  groupId: string;
  groupName: string;
  description?: string;
  displayOrder: number;
  useYn: string;
}

@Service("CodeService")
export class CodeService {
  @Autowired("CodeDao")
  private codeDao!: CodeDao;

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/code/CodeController.ts - getCodeDetailsByGroup() 메서드 (라인 29)
  @Transactional()
  async getCodeDetailsByGroup(groupId: string): Promise<CodeDetail[]> {
    try {      const result = await this.codeDao.getCodeDetailsByGroup(groupId);      return result;
    } catch (error) {
      logger.error("[CodeService] getCodeDetailsByGroup 에러:", error);
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/code/CodeController.ts - getCodeGroups() 메서드 (라인 54)
  @Transactional()
  async getCodeGroups(): Promise<CodeGroup[]> {
    try {      const result = await this.codeDao.getCodeGroups();      return result;
    } catch (error) {
      logger.error("[CodeService] getCodeGroups 에러:", error);
      throw error;
    }
  }
}
