/** 코드 관리 타입 — orkis-front codeService 타입 이식 */

/** 코드 상세 항목 (코드 그룹 내 개별 코드) */
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

/** 코드 그룹 */
export interface CodeGroup {
  groupId: string;
  groupName: string;
  description?: string;
  displayOrder: number;
  useYn: string;
}
