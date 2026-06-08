/**
 * 코드 관리 서비스
 * orkis-front의 codeService.ts를 Design ↔ Logic 구조에 맞게 이식
 *
 * API 엔드포인트:
 * - POST /codes/details { groupId } → CodeDetail[]
 * - POST /codes/groups → CodeGroup[]
 */
import { apiPost } from "@/logic/shared/services/request";
import type { CodeDetail, CodeGroup } from "../types/code";

export const codeService = {
  /** 그룹 ID로 코드 상세 목록 조회 */
  getCodeDetailsByGroup: (groupId: string) =>
    apiPost<CodeDetail[]>("/codes/details", { groupId }),

  /** 코드 그룹 목록 조회 */
  getCodeGroups: () => apiPost<CodeGroup[]>("/codes/groups"),

  /** 키워드 카테고리 목록 조회 (KEYWORD_CATEGORY 그룹) */
  getKeywordCategories: () =>
    codeService.getCodeDetailsByGroup("KEYWORD_CATEGORY")
};
