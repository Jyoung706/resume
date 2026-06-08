/** 카테고리 -> MaterialIcon 이름 + 색상 매핑 */

const CATEGORY_MAP: Record<string, { icon: string; iconColor: string }> = {
  Knowledge: { icon: "school", iconColor: "var(--color-category-knowledge)" },
  knowledge: { icon: "school", iconColor: "var(--color-category-knowledge)" },
  "\uD559\uC2B5": { icon: "school", iconColor: "var(--color-category-knowledge)" },
  Image: { icon: "image", iconColor: "var(--color-category-image)" },
  image: { icon: "image", iconColor: "var(--color-category-image)" },
  "\uC774\uBBF8\uC9C0": { icon: "image", iconColor: "var(--color-category-image)" },
  Coding: { icon: "code_blocks", iconColor: "var(--color-category-coding)" },
  coding: { icon: "code_blocks", iconColor: "var(--color-category-coding)" },
  Code: { icon: "code_blocks", iconColor: "var(--color-category-coding)" },
  code: { icon: "code_blocks", iconColor: "var(--color-category-coding)" },
  "\uCF54\uB529": { icon: "code_blocks", iconColor: "var(--color-category-coding)" },
  Data: { icon: "database", iconColor: "var(--color-category-data)" },
  data: { icon: "database", iconColor: "var(--color-category-data)" },
  "\uB370\uC774\uD130": { icon: "database", iconColor: "var(--color-category-data)" },
  SQL: { icon: "data_object", iconColor: "var(--color-category-sql)" },
  sql: { icon: "data_object", iconColor: "var(--color-category-sql)" }
};

const DEFAULT_ICON = {
  icon: "school",
  iconColor: "var(--color-category-knowledge)"
};
const FALLBACK_ICONS = ["school", "image", "code_blocks"];

export function getCategoryIcon(
  category: string,
  index: number
): { icon: string; iconColor: string } {
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];

  // 매칭 실패 시 인덱스 기반 순환
  return {
    icon: FALLBACK_ICONS[index % FALLBACK_ICONS.length],
    iconColor: DEFAULT_ICON.iconColor
  };
}
