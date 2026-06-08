import type { ReactNode } from "react";

export type VirtualTableSize = "small" | "medium";

export interface VirtualTableClassNames {
  /** TableVirtuoso 외곽 className */
  root?: string;
  /** 내부 scroll container (base/Box 로 렌더) */
  scroller?: string;
  /** base/Table */
  table?: string;
  /** sticky header section */
  tableHead?: string;
  /** 각 가시 행 (TableRow) */
  tableRow?: string;
  /** body section */
  tableBody?: string;
}

export interface VirtualTableProps<T> {
  /** 데이터 배열 (가상화로 5만행+ 가능) */
  data: T[];

  /** 각 행 렌더러 — <td>...</td> fragment 반환. <tr> 은 자동 래핑됨 */
  itemContent: (index: number, item: T) => ReactNode;

  /** sticky 헤더 행 — () => <tr>...</tr>. 미지정 시 헤더 없음 */
  fixedHeaderContent?: () => ReactNode;

  /** 슬롯별 className. 도메인 BEM 적용용 */
  classNames?: VirtualTableClassNames;

  /** base/Table size (기본 medium) */
  size?: VirtualTableSize;
}
