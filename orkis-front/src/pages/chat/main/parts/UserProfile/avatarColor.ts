// ============================================
// avatarColor — 사용자별 결정적 아바타 색상 유틸리티
// MUI 공식 stringToColor 해시 패턴 + 선별 팔레트
// ============================================

/** 디자이너 선별 15색 팔레트 — 채도/밝기가 보장된 색상만 사용 */
const AVATAR_PALETTE = [
  "#E57373",
  "#F06292",
  "#BA68C8",
  "#9575CD",
  "#7986CB",
  "#64B5F6",
  "#4FC3F7",
  "#4DD0E1",
  "#4DB6AC",
  "#81C784",
  "#AED581",
  "#FFD54F",
  "#FFB74D",
  "#FF8A65",
  "#A1887F"
] as const;

/** MUI 공식 패턴 기반 — 문자열 해시 생성 */
function stringToHash(string: string): number {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

/** 식별자 → 팔레트에서 결정적 색상 선택 */
export function stringToColor(identifier: string): string {
  const hash = stringToHash(identifier);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** 배경 밝기 기반 흑/백 텍스트 대비색 자동 결정 */
export function getContrastTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/** 식별자 → Avatar ConvenienceProps용 색상 객체 */
export function stringAvatar(identifier: string) {
  const bgcolor = stringToColor(identifier);
  const textColor = getContrastTextColor(bgcolor);
  return { bgcolor, textColor };
}
