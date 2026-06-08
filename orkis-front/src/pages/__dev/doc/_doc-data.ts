// ============================================
// 컴포넌트 API 문서 데이터
// ============================================

import type { PropDef } from "./parts";

export type DocCategory = "base" | "layout" | "ui" | "domain" | "page-local";

export interface ComponentDoc {
  name: string;
  category: DocCategory;
  description: string;
  /** 상속/확장하는 타입 */
  extends?: string;
  /** 커스텀 props만 기록 (MUI/HTML 상속 props 제외) */
  props: PropDef[];
  /** 관련 MUI 문서 링크 */
  muiRef?: string;
  /** 관련 템플릿 페이지 경로 */
  templatePath?: string;
}

// ==========================================
// 공통 프리셋 참조
// ==========================================

export const CONVENIENCE_NOTE = "ConvenienceProps (p, px, py, m, mx, my, width, height, textColor, bgcolor, borderColor, rounded, shadow, grow, transition 등)를 지원합니다.";
export const VISUAL_NOTE = "VisualConvenienceProps (rounded, shadow, grow, transition)를 지원합니다.";

const CONVENIENCE_PROPS: PropDef[] = [
  { name: "p / px / py / pt / pb / pl / pr", type: "number | SpacingPreset", description: "패딩 (숫자: MUI spacing, 프리셋: none|xs|sm|md|lg|xl|xxl)" },
  { name: "m / mx / my / mt / mb / ml / mr", type: "number | SpacingPreset", description: "마진 (숫자: MUI spacing, 프리셋: none|xs|sm|md|lg|xl|xxl)" },
  { name: "width / height", type: "number | string", description: "크기" },
  { name: "minWidth / minHeight", type: "number | string", description: "최소 크기" },
  { name: "maxWidth / maxHeight", type: "number | string", description: "최대 크기" },
  { name: "textColor", type: "ColorPreset | string", description: "텍스트 색상 (primary, error, text.secondary 등)" },
  { name: "bgcolor", type: "BgColorPreset | string", description: "배경색 (default, paper, primary.subtle 등)" },
  { name: "borderColor", type: "ColorPreset | string", description: "보더 색상 (primary, black, text.primary 등). outlined 버튼 등에서 유용" },
  { name: "rounded", type: '"none"|"xs"|"sm"|"md"|"lg"|"xl"|"xxl"|"full"', description: "border-radius 프리셋" },
  { name: "shadow", type: '"sm"|"md"|"lg"|"xl"|"card"|"modal"|"dropdown"', description: "box-shadow 프리셋" },
  { name: "grow", type: "boolean", description: "flexGrow: 1 단축 — flex 컨테이너에서 남은 공간 차지" },
  { name: "transition", type: "string", description: 'CSS transition 단축 (예: "width 0.3s", "all 0.2s ease")' },
];

const VISUAL_PROPS: PropDef[] = [
  { name: "rounded", type: '"none"|"xs"|"sm"|"md"|"lg"|"xl"|"xxl"|"full"', description: "border-radius 프리셋" },
  { name: "shadow", type: '"sm"|"md"|"lg"|"xl"|"card"|"modal"|"dropdown"', description: "box-shadow 프리셋" },
  { name: "grow", type: "boolean", description: "flexGrow: 1 단축 — flex 컨테이너에서 남은 공간 차지" },
  { name: "transition", type: "string", description: 'CSS transition 단축 (예: "width 0.3s", "all 0.2s ease")' },
];

/** MUI system props — Box, Typography, Stack, Grid 등 MUI 시스템 컴포넌트가 네이티브로 지원하는 props */
const MUI_SYSTEM_PROPS: PropDef[] = [
  { name: "p / px / py / pt / pb / pl / pr", type: "number | string", description: "패딩 (MUI system)" },
  { name: "m / mx / my / mt / mb / ml / mr", type: "number | string", description: "마진 (MUI system)" },
  { name: "width / height", type: "number | string", description: "크기 (MUI system)" },
  { name: "minWidth / minHeight", type: "number | string", description: "최소 크기 (MUI system)" },
  { name: "maxWidth / maxHeight", type: "number | string", description: "최대 크기 (MUI system)" },
  { name: "color", type: "string", description: "텍스트 색상 (MUI system, e.g. 'primary.main', 'text.secondary')" },
  { name: "bgcolor", type: "string", description: "배경색 (MUI system, e.g. 'background.paper', 'primary.light')" },
  { name: "display", type: "string", description: "CSS display (MUI system)" },
  { name: "overflow", type: "string", description: "CSS overflow (MUI system)" },
  { name: "flexGrow / flexShrink", type: "number", description: "flex 속성 (MUI system)" },
];

const CONVENIENCE_NO_MAXWIDTH: PropDef[] = CONVENIENCE_PROPS.filter(
  (p) => p.name !== "maxWidth / maxHeight",
);

// ==========================================
// Base 컴포넌트
// ==========================================

export const ALL_DOCS: ComponentDoc[] = [
  // --- Box ---
  {
    name: "Box",
    category: "base",
    description: "MUI Box 래퍼. MUI system props(m, p, color 등)를 네이티브로 지원하며, VisualConvenienceProps를 추가합니다.",
    extends: "VisualConvenienceProps + MuiBoxProps",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "component", type: "ElementType", description: "렌더링할 HTML 요소 (e.g. 'div', 'span', 'main')" },
    ],
    muiRef: "https://mui.com/material-ui/react-box/",
  },

  // --- Typography ---
  {
    name: "Typography",
    category: "base",
    description: "MUI Typography 래퍼. MUI system props를 네이티브로 지원하며, VisualConvenienceProps를 추가합니다.",
    extends: "VisualConvenienceProps + MuiTypographyProps",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "variant", type: '"h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"subtitle1"|"subtitle2"|"body1"|"body2"|"caption"|"overline"', default: '"body1"', description: "텍스트 스타일" },
      { name: "align", type: '"left"|"center"|"right"|"justify"|"inherit"', default: '"inherit"', description: "텍스트 정렬" },
      { name: "noWrap", type: "boolean", description: "한 줄로 표시 (말줄임표)" },
      { name: "gutterBottom", type: "boolean", description: "하단 마진 추가" },
      { name: "paragraph", type: "boolean", description: "<p> 태그로 렌더링" },
      { name: "component", type: "ElementType", description: "렌더링할 HTML 요소" },
      { name: "fontWeight", type: "number | string", description: "글꼴 굵기 (MUI system)" },
    ],
    muiRef: "https://mui.com/material-ui/react-typography/",
    templatePath: "/template/typography",
  },

  // --- Paper ---
  {
    name: "Paper",
    category: "base",
    description: "MUI Paper 래퍼. 배경 표면, 카드, 섹션 등에 사용합니다.",
    extends: "ConvenienceProps + Omit<MuiPaperProps, 'color'>",
    props: [...CONVENIENCE_PROPS],
    muiRef: "https://mui.com/material-ui/react-paper/",
    templatePath: "/template/surface",
  },

  // --- Button ---
  {
    name: "Button",
    category: "base",
    description: "MUI Button 래퍼. MUI color는 테마 variant, 텍스트 색상은 textColor를 사용합니다.",
    extends: "ConvenienceProps + MuiButtonProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "color", type: '"inherit"|"primary"|"secondary"|"success"|"error"|"info"|"warning"', description: "MUI 버튼 테마 색상 (배경/보더 변경). 텍스트 색상은 textColor 사용 — 텍스트 색상은 textColor 사용" },
      { name: "variant", type: '"text"|"outlined"|"contained"', default: '"text"', description: "버튼 스타일" },
      { name: "size", type: '"small"|"medium"|"large"', default: '"medium"', description: "버튼 크기" },
    ],
    muiRef: "https://mui.com/material-ui/react-button/",
    templatePath: "/template/button",
  },

  // --- IconButton ---
  {
    name: "IconButton",
    category: "base",
    description: "MUI IconButton 래퍼. 아이콘 전용 버튼입니다.",
    extends: "ConvenienceProps + MuiIconButtonProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "color", type: '"inherit"|"default"|"primary"|"secondary"|"error"|"info"|"success"|"warning"', description: "MUI 아이콘버튼 테마 색상. 텍스트 색상은 textColor 사용 — 텍스트 색상은 textColor 사용" },
      { name: "size", type: '"small"|"medium"|"large"', default: '"medium"', description: "아이콘버튼 크기" },
      { name: "edge", type: '"start"|"end"|false', description: "엣지 정렬 (Toolbar 내)" },
    ],
    muiRef: "https://mui.com/material-ui/react-button/#icon-button",
    templatePath: "/template/button",
  },

  // --- Input ---
  {
    name: "Input",
    category: "base",
    description: "MUI TextField 래퍼. 기본 size='small'로 설정됩니다.",
    extends: "ConvenienceProps & MuiTextFieldProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "label", type: "string", description: "입력 필드 라벨" },
      { name: "variant", type: '"outlined"|"filled"|"standard"', default: '"outlined"', description: "입력 스타일" },
      { name: "size", type: '"small"|"medium"', default: '"small"', description: "입력 크기" },
      { name: "error", type: "boolean", description: "에러 상태" },
      { name: "helperText", type: "ReactNode", description: "도움말 텍스트" },
      { name: "fullWidth", type: "boolean", description: "전체 너비" },
    ],
    muiRef: "https://mui.com/material-ui/react-text-field/",
    templatePath: "/template/input",
  },

  // --- Alert ---
  {
    name: "Alert",
    category: "base",
    description: "MUI Alert 래퍼. 알림/경고 메시지를 표시합니다.",
    extends: "ConvenienceProps + MuiAlertProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "severity", type: '"success"|"info"|"warning"|"error"', default: '"success"', description: "알림 심각도" },
      { name: "variant", type: '"standard"|"filled"|"outlined"', default: '"standard"', description: "알림 스타일" },
      { name: "onClose", type: "() => void", description: "닫기 핸들러" },
      { name: "action", type: "ReactNode", description: "추가 액션 영역" },
    ],
    muiRef: "https://mui.com/material-ui/react-alert/",
    templatePath: "/template/alert",
  },

  // --- Divider ---
  {
    name: "Divider",
    category: "base",
    description: "MUI Divider 래퍼. 구분선을 표시합니다.",
    extends: "ConvenienceProps + Omit<MuiDividerProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "orientation", type: '"horizontal"|"vertical"', default: '"horizontal"', description: "방향" },
      { name: "variant", type: '"fullWidth"|"inset"|"middle"', default: '"fullWidth"', description: "구분선 여백" },
      { name: "textAlign", type: '"left"|"center"|"right"', description: "텍스트 위치 (children 있을 때)" },
      { name: "flexItem", type: "boolean", description: "Flex 컨테이너 내 높이 맞춤" },
    ],
    muiRef: "https://mui.com/material-ui/react-divider/",
    templatePath: "/template/surface",
  },

  // --- Link ---
  {
    name: "Link",
    category: "base",
    description: "MUI Link 래퍼. Typography 기반으로 MUI system props를 네이티브 지원합니다.",
    extends: "VisualConvenienceProps + MuiLinkProps",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "href", type: "string", description: "링크 URL" },
      { name: "underline", type: '"always"|"hover"|"none"', default: '"always"', description: "밑줄 표시 방식" },
      { name: "color", type: "string", description: "링크 색상 (MUI 네이티브)" },
      { name: "variant", type: '"h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"subtitle1"|"subtitle2"|"body1"|"body2"|"caption"|"overline"|"inherit"', default: '"inherit"', description: "Typography variant" },
      { name: "target", type: "string", description: "링크 타겟 (e.g. '_blank')" },
      { name: "rel", type: "string", description: "링크 관계 (e.g. 'noopener')" },
      { name: "component", type: "ElementType", description: "렌더링할 요소 (RouterLink 등)" },
      { name: "to", type: "string", description: "react-router Link 등 polymorphic component 사용 시 경로" },
    ],
    muiRef: "https://mui.com/material-ui/react-link/",
    templatePath: "/template/media",
  },

  // --- Img ---
  {
    name: "Img",
    category: "base",
    description: "네이티브 <img> + ConvenienceProps. MUI Box(component='img') 기반입니다.",
    extends: "ConvenienceProps + Omit<ImgHTMLAttributes, 'width'|'height'|'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "fit", type: '"cover"|"contain"|"fill"|"none"|"scale-down"', description: "object-fit 단축" },
      { name: "position", type: "string", default: '"center" (fit 있을 때)', description: "object-position 단축" },
      { name: "src", type: "string", required: true, description: "이미지 소스 URL" },
      { name: "alt", type: "string", description: "대체 텍스트" },
    ],
    muiRef: "https://mui.com/material-ui/react-box/",
    templatePath: "/template/media",
  },

  // --- Form ---
  {
    name: "Form",
    category: "base",
    description: "MUI Box(component='form') 래퍼. e.preventDefault() 자동 호출됩니다.",
    extends: "VisualConvenienceProps + Omit<BoxProps<'form'>, 'component'|'onSubmit'>",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "onSubmit", type: "(e: FormEvent) => void", description: "submit 핸들러 (preventDefault 자동)" },
      { name: "noValidate", type: "boolean", default: "true", description: "HTML5 유효성 검사 비활성화" },
    ],
    templatePath: "/template/form",
  },

  // --- Select ---
  {
    name: "Select",
    category: "base",
    description: "MUI Select 래퍼. variant별 union 타입이므로 ConvenienceProps 없이 단순 래핑합니다.",
    extends: "MuiSelectProps",
    props: [
      { name: "value", type: "unknown", description: "선택된 값" },
      { name: "onChange", type: "SelectChangeEvent handler", description: "변경 핸들러" },
      { name: "variant", type: '"outlined"|"filled"|"standard"', default: '"outlined"', description: "입력 스타일" },
      { name: "label", type: "string", description: "라벨 (InputLabel과 함께 사용)" },
      { name: "multiple", type: "boolean", description: "다중 선택 모드" },
      { name: "fullWidth", type: "boolean", description: "전체 너비" },
    ],
    muiRef: "https://mui.com/material-ui/react-select/",
    templatePath: "/template/select",
  },

  // --- MenuItem ---
  {
    name: "MenuItem",
    category: "base",
    description: "MUI MenuItem 래퍼. Select, Menu 내부 옵션으로 사용합니다.",
    extends: "ConvenienceProps + Omit<MuiMenuItemProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "value", type: "unknown", description: "항목 값" },
      { name: "selected", type: "boolean", description: "선택 상태" },
      { name: "disabled", type: "boolean", description: "비활성화" },
    ],
    muiRef: "https://mui.com/material-ui/api/menu-item/",
    templatePath: "/template/select",
  },

  // --- InputLabel ---
  {
    name: "InputLabel",
    category: "base",
    description: "MUI InputLabel 래퍼. FormControl + Select과 함께 라벨을 표시합니다.",
    extends: "ConvenienceProps + MuiInputLabelProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "color", type: '"primary"|"secondary"|"error"|"info"|"success"|"warning"', description: "MUI 라벨 포커스 색상. 텍스트 색상은 textColor 사용" },
    ],
    muiRef: "https://mui.com/material-ui/api/input-label/",
    templatePath: "/template/select",
  },

  // --- FormControl ---
  {
    name: "FormControl",
    category: "base",
    description: "MUI FormControl 래퍼. InputLabel, Select, FormHelperText 등을 그룹화합니다.",
    extends: "ConvenienceProps + MuiFormControlProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "color", type: '"primary"|"secondary"|"error"|"info"|"success"|"warning"', description: "MUI 폼 컨트롤 포커스 색상. 텍스트 색상은 textColor 사용" },
      { name: "fullWidth", type: "boolean", description: "전체 너비" },
      { name: "size", type: '"small"|"medium"', description: "크기" },
      { name: "error", type: "boolean", description: "에러 상태" },
      { name: "disabled", type: "boolean", description: "비활성화" },
    ],
    muiRef: "https://mui.com/material-ui/api/form-control/",
    templatePath: "/template/select",
  },

  // --- InputAdornment ---
  {
    name: "InputAdornment",
    category: "base",
    description: "MUI InputAdornment 래퍼. Input 내부 접두/접미 아이콘/텍스트를 표시합니다.",
    extends: "ConvenienceProps + Omit<MuiInputAdornmentProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "position", type: '"start"|"end"', required: true, description: "위치 (시작/끝)" },
    ],
    muiRef: "https://mui.com/material-ui/api/input-adornment/",
    templatePath: "/template/form",
  },

  // --- Dialog ---
  {
    name: "Dialog",
    category: "base",
    description: "MUI Dialog 래퍼. maxWidth는 MUI 네이티브 prop을 사용합니다.",
    extends: "Omit<ConvenienceProps, 'maxWidth'> + Omit<MuiDialogProps, 'color'>",
    props: [
      ...CONVENIENCE_NO_MAXWIDTH,
      { name: "open", type: "boolean", required: true, description: "열림 상태" },
      { name: "onClose", type: "(event, reason) => void", description: "닫기 핸들러" },
      { name: "maxWidth", type: '"xs"|"sm"|"md"|"lg"|"xl"|false', default: '"sm"', description: "최대 너비 (MUI 네이티브)" },
      { name: "fullWidth", type: "boolean", description: "전체 너비 (maxWidth 범위 내)" },
      { name: "fullScreen", type: "boolean", description: "전체 화면" },
    ],
    muiRef: "https://mui.com/material-ui/react-dialog/",
    templatePath: "/template/dialog",
  },

  // --- DialogTitle ---
  {
    name: "DialogTitle",
    category: "base",
    description: "MUI DialogTitle 래퍼. Dialog 내부 제목 영역입니다.",
    extends: "VisualConvenienceProps + MuiDialogTitleProps",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
    ],
    muiRef: "https://mui.com/material-ui/api/dialog-title/",
    templatePath: "/template/dialog",
  },

  // --- DialogContent ---
  {
    name: "DialogContent",
    category: "base",
    description: "MUI DialogContent 래퍼. Dialog 내부 콘텐츠 영역입니다.",
    extends: "VisualConvenienceProps + MuiDialogContentProps",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "dividers", type: "boolean", description: "상하 구분선 표시" },
    ],
    muiRef: "https://mui.com/material-ui/api/dialog-content/",
    templatePath: "/template/dialog",
  },

  // --- DialogActions ---
  {
    name: "DialogActions",
    category: "base",
    description: "MUI DialogActions 래퍼. Dialog 하단 버튼 영역입니다.",
    extends: "VisualConvenienceProps + MuiDialogActionsProps",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "disableSpacing", type: "boolean", description: "버튼 간 간격 제거" },
    ],
    muiRef: "https://mui.com/material-ui/api/dialog-actions/",
    templatePath: "/template/dialog",
  },

  // --- Drawer ---
  {
    name: "Drawer",
    category: "base",
    description: "MUI Drawer 래퍼. 사이드 패널을 표시합니다.",
    extends: "ConvenienceProps + Omit<MuiDrawerProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "open", type: "boolean", required: true, description: "열림 상태" },
      { name: "onClose", type: "(event) => void", description: "닫기 핸들러" },
      { name: "anchor", type: '"left"|"right"|"top"|"bottom"', default: '"left"', description: "표시 방향" },
      { name: "variant", type: '"permanent"|"persistent"|"temporary"', default: '"temporary"', description: "드로어 모드" },
    ],
    muiRef: "https://mui.com/material-ui/react-drawer/",
    templatePath: "/template/drawer",
  },

  // --- AppBar ---
  {
    name: "AppBar",
    category: "base",
    description: "MUI AppBar 래퍼. 상단 앱 바를 구성합니다.",
    extends: "ConvenienceProps + MuiAppBarProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "color", type: '"default"|"inherit"|"primary"|"secondary"|"transparent"', default: '"primary"', description: "MUI AppBar 테마 색상 (배경색 변경). 텍스트 색상은 textColor 사용" },
      { name: "position", type: '"fixed"|"absolute"|"sticky"|"static"|"relative"', default: '"fixed"', description: "CSS position" },
      { name: "elevation", type: "number", default: "4", description: "그림자 깊이" },
    ],
    muiRef: "https://mui.com/material-ui/react-app-bar/",
    templatePath: "/template/appbar",
  },

  // --- Toolbar ---
  {
    name: "Toolbar",
    category: "base",
    description: "MUI Toolbar 래퍼. AppBar 내부 콘텐츠 레이아웃에 사용합니다.",
    extends: "ConvenienceProps + Omit<MuiToolbarProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "variant", type: '"regular"|"dense"', default: '"regular"', description: "밀도" },
    ],
    muiRef: "https://mui.com/material-ui/api/toolbar/",
    templatePath: "/template/appbar",
  },

  // --- List ---
  {
    name: "List",
    category: "base",
    description: "MUI List 래퍼. 리스트 컨테이너입니다.",
    extends: "ConvenienceProps + Omit<MuiListProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "dense", type: "boolean", description: "좁은 패딩" },
      { name: "disablePadding", type: "boolean", description: "패딩 제거" },
      { name: "component", type: "ElementType", description: "렌더링할 HTML 요소" },
    ],
    muiRef: "https://mui.com/material-ui/react-list/",
    templatePath: "/template/list",
  },

  // --- ListItemButton ---
  {
    name: "ListItemButton",
    category: "base",
    description: "MUI ListItemButton 래퍼. 클릭 가능한 리스트 항목입니다.",
    extends: "ConvenienceProps + Omit<MuiListItemButtonProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "selected", type: "boolean", description: "선택 상태" },
      { name: "disabled", type: "boolean", description: "비활성화" },
      { name: "onClick", type: "() => void", description: "클릭 핸들러" },
    ],
    muiRef: "https://mui.com/material-ui/api/list-item-button/",
    templatePath: "/template/list",
  },

  // --- ListItemIcon ---
  {
    name: "ListItemIcon",
    category: "base",
    description: "MUI ListItemIcon 래퍼. 리스트 항목 좌측 아이콘 영역입니다.",
    extends: "ConvenienceProps + Omit<MuiListItemIconProps, 'color'>",
    props: [...CONVENIENCE_PROPS],
    muiRef: "https://mui.com/material-ui/api/list-item-icon/",
    templatePath: "/template/list",
  },

  // --- ListItemText ---
  {
    name: "ListItemText",
    category: "base",
    description: "MUI ListItemText 래퍼. 리스트 항목 텍스트 영역입니다.",
    extends: "ConvenienceProps + Omit<MuiListItemTextProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "primary", type: "ReactNode", description: "주 텍스트" },
      { name: "secondary", type: "ReactNode", description: "보조 텍스트" },
    ],
    muiRef: "https://mui.com/material-ui/api/list-item-text/",
    templatePath: "/template/list",
  },

  // --- Collapse ---
  {
    name: "Collapse",
    category: "base",
    description: "MUI Collapse 래퍼. 접히는 영역 애니메이션을 제공합니다.",
    extends: "ConvenienceProps + Omit<MuiCollapseProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "in", type: "boolean", required: true, description: "펼침 상태" },
      { name: "timeout", type: 'number | "auto"', default: '"auto"', description: "애니메이션 시간 (ms)" },
      { name: "unmountOnExit", type: "boolean", description: "닫히면 DOM에서 제거" },
    ],
    muiRef: "https://mui.com/material-ui/api/collapse/",
    templatePath: "/template/list",
  },

  // --- Snackbar ---
  {
    name: "Snackbar",
    category: "base",
    description: "MUI Snackbar 래퍼. 하단 알림 메시지를 표시합니다.",
    extends: "ConvenienceProps + Omit<MuiSnackbarProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "open", type: "boolean", required: true, description: "표시 여부" },
      { name: "onClose", type: "(event, reason) => void", description: "닫기 핸들러" },
      { name: "message", type: "ReactNode", description: "메시지 텍스트" },
      { name: "autoHideDuration", type: "number", description: "자동 숨김 시간 (ms)" },
      { name: "anchorOrigin", type: "{ vertical, horizontal }", default: "bottom-left", description: "표시 위치" },
      { name: "action", type: "ReactNode", description: "액션 버튼 영역" },
    ],
    muiRef: "https://mui.com/material-ui/react-snackbar/",
    templatePath: "/template/snackbar",
  },

  // --- AccordionBase ---
  {
    name: "AccordionBase",
    category: "base",
    description: "MUI Accordion 래퍼. UI Accordion 내부에서 사용하는 base 컴포넌트입니다.",
    extends: "ConvenienceProps + Omit<MuiAccordionProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "expanded", type: "boolean", description: "펼침 상태" },
      { name: "onChange", type: "(event, expanded) => void", description: "토글 핸들러" },
      { name: "disabled", type: "boolean", description: "비활성화" },
      { name: "disableGutters", type: "boolean", description: "좌우 패딩 제거" },
    ],
    muiRef: "https://mui.com/material-ui/react-accordion/",
    templatePath: "/template/accordion",
  },

  // --- AccordionSummary ---
  {
    name: "AccordionSummary",
    category: "base",
    description: "MUI AccordionSummary 래퍼. 아코디언 헤더 영역입니다.",
    extends: "ConvenienceProps + Omit<MuiAccordionSummaryProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "expandIcon", type: "ReactNode", description: "확장 아이콘" },
    ],
    muiRef: "https://mui.com/material-ui/api/accordion-summary/",
    templatePath: "/template/accordion",
  },

  // --- AccordionDetails ---
  {
    name: "AccordionDetails",
    category: "base",
    description: "MUI AccordionDetails 래퍼. 아코디언 내용 영역입니다.",
    extends: "ConvenienceProps + Omit<MuiAccordionDetailsProps, 'color'>",
    props: [...CONVENIENCE_PROPS],
    muiRef: "https://mui.com/material-ui/api/accordion-details/",
    templatePath: "/template/accordion",
  },

  // --- Container ---
  {
    name: "Container",
    category: "base",
    description: "MUI Container 래퍼. 콘텐츠 최대 너비 제한에 사용합니다. maxWidth는 MUI 네이티브 prop입니다.",
    extends: "Omit<ConvenienceProps, 'maxWidth'> + Omit<MuiContainerProps, 'color'>",
    props: [
      ...CONVENIENCE_NO_MAXWIDTH,
      { name: "maxWidth", type: '"xs"|"sm"|"md"|"lg"|"xl"|false', default: '"lg"', description: "최대 너비 (MUI 네이티브)" },
      { name: "fixed", type: "boolean", description: "고정 너비 사용" },
    ],
    muiRef: "https://mui.com/material-ui/react-container/",
    templatePath: "/template/layout",
  },

  // --- CardActionArea ---
  {
    name: "CardActionArea",
    category: "base",
    description: "MUI CardActionArea 래퍼. Paper/Card 내부에서 클릭 가능 영역을 만듭니다.",
    extends: "ConvenienceProps + Omit<MuiCardActionAreaProps, 'color'>",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "onClick", type: "() => void", description: "클릭 핸들러" },
    ],
    muiRef: "https://mui.com/material-ui/api/card-action-area/",
    templatePath: "/template/surface",
  },

  // --- Chip ---
  {
    name: "Chip",
    category: "base",
    description: "MUI Chip 래퍼. 태그, 뱃지, 필터 등 소형 요소를 표시합니다.",
    extends: "ConvenienceProps + MuiChipProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "label", type: "ReactNode", description: "칩 텍스트" },
      { name: "color", type: '"default"|"primary"|"secondary"|"success"|"error"|"info"|"warning"', default: '"default"', description: "MUI 칩 테마 색상. 텍스트 색상은 textColor 사용" },
      { name: "variant", type: '"filled"|"outlined"', default: '"filled"', description: "칩 스타일" },
      { name: "size", type: '"small"|"medium"', default: '"medium"', description: "칩 크기" },
      { name: "icon", type: "ReactElement", description: "좌측 아이콘" },
      { name: "deleteIcon", type: "ReactElement", description: "삭제 아이콘 커스텀" },
      { name: "onDelete", type: "() => void", description: "삭제 핸들러 (설정 시 삭제 아이콘 표시)" },
      { name: "onClick", type: "() => void", description: "클릭 핸들러 (설정 시 클릭 가능)" },
      { name: "disabled", type: "boolean", description: "비활성화" },
    ],
    muiRef: "https://mui.com/material-ui/react-chip/",
    templatePath: "/template/chip",
  },

  // --- Checkbox ---
  {
    name: "Checkbox",
    category: "base",
    description: "MUI Checkbox 래퍼. 체크박스 입력 요소입니다.",
    extends: "ConvenienceProps + MuiCheckboxProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "checked", type: "boolean", description: "체크 상태 (controlled)" },
      { name: "defaultChecked", type: "boolean", description: "초기 체크 상태 (uncontrolled)" },
      { name: "color", type: '"default"|"primary"|"secondary"|"success"|"error"|"info"|"warning"', default: '"primary"', description: "MUI 체크박스 테마 색상. 텍스트 색상은 textColor 사용" },
      { name: "size", type: '"small"|"medium"', default: '"medium"', description: "체크박스 크기 (MUI 네이티브)" },
      { name: "indeterminate", type: "boolean", description: "불확정 상태" },
      { name: "disabled", type: "boolean", description: "비활성화" },
      { name: "onChange", type: "(event, checked) => void", description: "변경 핸들러" },
    ],
    muiRef: "https://mui.com/material-ui/react-checkbox/",
    templatePath: "/template/checkbox",
  },

  // --- FormControlLabel ---
  {
    name: "FormControlLabel",
    category: "base",
    description: "MUI FormControlLabel 래퍼. Checkbox, Radio 등의 컨트롤에 라벨을 연결합니다.",
    extends: "ConvenienceProps + MuiFormControlLabelProps",
    props: [
      ...CONVENIENCE_PROPS,
      { name: "control", type: "ReactElement", required: true, description: "폼 컨트롤 요소 (Checkbox, Radio 등)" },
      { name: "label", type: "ReactNode", required: true, description: "라벨 텍스트" },
      { name: "labelPlacement", type: '"end"|"start"|"top"|"bottom"', default: '"end"', description: "라벨 위치" },
      { name: "disabled", type: "boolean", description: "비활성화" },
    ],
    muiRef: "https://mui.com/material-ui/api/form-control-label/",
    templatePath: "/template/checkbox",
  },

  // ==========================================
  // Layout 컴포넌트
  // ==========================================

  // --- FlexBox ---
  {
    name: "FlexBox",
    category: "layout",
    description: "Box 기반 Flex 레이아웃 유틸리티. display:flex가 기본 적용됩니다.",
    extends: "BoxProps (VisualConvenienceProps + MuiBoxProps)",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "direction", type: '"row"|"column"|"row-reverse"|"column-reverse"', default: '"row"', description: "flex-direction" },
      { name: "align", type: "string", description: "alignItems" },
      { name: "justify", type: "string", description: "justifyContent" },
      { name: "wrap", type: '"wrap"|"nowrap"|"wrap-reverse"', description: "flex-wrap" },
      { name: "gap", type: "number | string", description: "gap" },
      { name: "inline", type: "boolean", description: "inline-flex 사용" },
      { name: "component", type: "ElementType", description: "렌더링할 HTML 요소" },
    ],
    templatePath: "/template/layout",
  },

  // --- Stack ---
  {
    name: "Stack",
    category: "layout",
    description: "MUI Stack 래퍼. 1차원 레이아웃 유틸리티입니다 (layout/에서 재공개).",
    extends: "VisualConvenienceProps + MuiStackProps",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "direction", type: '"row"|"column"|"row-reverse"|"column-reverse"', default: '"column"', description: "배치 방향" },
      { name: "spacing", type: "number | string", description: "자식 간격" },
      { name: "divider", type: "ReactNode", description: "자식 사이 구분 요소" },
      { name: "component", type: "ElementType", description: "렌더링할 HTML 요소" },
    ],
    muiRef: "https://mui.com/material-ui/react-stack/",
    templatePath: "/template/layout",
  },

  // --- Grid ---
  {
    name: "Grid",
    category: "layout",
    description: "MUI Grid v2 래퍼. 12컬럼 그리드 시스템입니다 (layout/에서 재공개).",
    extends: "VisualConvenienceProps + MuiGridProps",
    props: [
      ...VISUAL_PROPS,
      ...MUI_SYSTEM_PROPS,
      { name: "container", type: "boolean", description: "그리드 컨테이너" },
      { name: "spacing", type: "number", description: "자식 간격" },
      { name: "size", type: "{ xs?, sm?, md?, lg?, xl? }", description: "반응형 컬럼 크기" },
      { name: "offset", type: "{ xs?, sm?, md?, lg?, xl? }", description: "반응형 컬럼 오프셋" },
      { name: "columns", type: "number", default: "12", description: "그리드 컬럼 수" },
    ],
    muiRef: "https://mui.com/material-ui/react-grid/",
    templatePath: "/template/layout",
  },

  // ==========================================
  // UI 컴포넌트
  // ==========================================

  // --- SearchInput ---
  {
    name: "SearchInput",
    category: "ui",
    description: "검색 전용 인풋. 검색 아이콘 + 초기화 버튼 + Enter 검색을 제공합니다.",
    extends: "Omit<InputProps, 'type'>",
    props: [
      { name: "onSearch", type: "(value: string) => void", description: "Enter 키 검색 핸들러" },
      { name: "onClear", type: "() => void", description: "초기화 버튼 핸들러" },
      { name: "value", type: "string", description: "controlled 값" },
      { name: "onChange", type: "ChangeEventHandler", description: "값 변경 핸들러" },
    ],
    templatePath: "/template/input",
  },

  // --- PasswordInput ---
  {
    name: "PasswordInput",
    category: "ui",
    description: "비밀번호 인풋. 표시/숨김 토글 버튼을 제공합니다.",
    extends: "Omit<InputProps, 'type'>",
    props: [
      { name: "showToggle", type: "boolean", default: "true", description: "표시/숨김 토글 버튼 표시 여부" },
    ],
    templatePath: "/template/input",
  },

  // --- Modal ---
  {
    name: "Modal",
    category: "ui",
    description: "프리셋 크기별 모달. Dialog + Title + Content + Actions를 조합합니다.",
    extends: "Omit<DialogProps, 'maxWidth'|'title'>",
    props: [
      { name: "open", type: "boolean", required: true, description: "열림 상태" },
      { name: "onClose", type: "(event, reason) => void", description: "닫기 핸들러" },
      { name: "title", type: "ReactNode", description: "모달 제목" },
      { name: "size", type: 'ComponentSize', default: '"medium"', description: "크기 (xsmall:16rem, small:20rem, medium:26.8rem, large:37.5rem, xlarge:50rem)" },
      { name: "actions", type: "ReactNode", description: "하단 액션 영역" },
      { name: "showClose", type: "boolean", default: "true", description: "닫기 버튼 표시" },
    ],
    templatePath: "/template/modal",
  },

  // --- ConfirmModal ---
  {
    name: "ConfirmModal",
    category: "ui",
    description: "확인/취소 다이얼로그. Modal 기반 표준 확인 패턴입니다.",
    extends: "Omit<ModalProps, 'title'|'actions'|'children'>",
    props: [
      { name: "open", type: "boolean", required: true, description: "열림 상태" },
      { name: "onClose", type: "(event, reason) => void", description: "닫기/취소 핸들러" },
      { name: "title", type: "string", required: true, description: "다이얼로그 제목" },
      { name: "message", type: "string", required: true, description: "확인 메시지 (줄바꿈 지원)" },
      { name: "onConfirm", type: "() => void", required: true, description: "확인 버튼 핸들러" },
      { name: "confirmText", type: "string", default: '"확인"', description: "확인 버튼 텍스트" },
      { name: "cancelText", type: "string", default: '"취소"', description: "취소 버튼 텍스트" },
      { name: "confirmColor", type: '"primary"|"error"|"warning"|"success"', default: '"primary"', description: "확인 버튼 색상" },
      { name: "size", type: 'ComponentSize', default: '"small"', description: "크기" },
    ],
    templatePath: "/template/modal",
  },

  // --- Accordion (UI) ---
  {
    name: "Accordion",
    category: "ui",
    description: "아코디언 UI 컴포넌트. AccordionBase를 래핑하여 일관된 패턴을 제공합니다.",
    extends: "Omit<AccordionBaseProps, 'onChange'|'title'|'children'>",
    props: [
      { name: "id", type: "string", required: true, description: "아코디언 고유 ID" },
      { name: "title", type: "ReactNode", required: true, description: "헤더 제목" },
      { name: "expanded", type: "boolean", required: true, description: "펼침 상태" },
      { name: "onChange", type: "(id: string) => void", required: true, description: "토글 핸들러 (id 전달)" },
      { name: "children", type: "ReactNode", required: true, description: "내용" },
      { name: "icon", type: "ReactNode", description: "헤더 좌측 아이콘" },
      { name: "expandIcon", type: "ReactNode", default: "<ExpandMoreIcon />", description: "확장 아이콘" },
      { name: "summarySx", type: "SxProps<Theme>", description: "AccordionSummary sx" },
      { name: "detailsSx", type: "SxProps<Theme>", description: "AccordionDetails sx" },
      { name: "titleSx", type: "SxProps<Theme>", description: "제목 Typography sx" },
      { name: "disableBorder", type: "boolean", default: "true", description: "테두리 제거" },
      { name: "disableExpandedMargin", type: "boolean", default: "true", description: "펼침 시 마진 변경 비활성화" },
    ],
    templatePath: "/template/accordion",
  },

  // --- Icon ---
  {
    name: "Icon",
    category: "ui",
    description: "통합 아이콘 컴포넌트. Material Symbols 웹 폰트(기본)와 MUI SVG 아이콘을 하나의 API로 제공합니다.",
    props: [
      { name: "children", type: "string", required: true, description: "아이콘 이름 (Material Symbols 이름 또는 MUI 아이콘 이름)" },
      { name: "mui", type: "boolean", default: "false", description: "true이면 MUI SVG 아이콘 모드" },
      { name: "size", type: '"small"|"medium"|"large"', default: '"medium"', description: "크기 (theme token --icon-size-small/medium/large)" },
      { name: "weight", type: "100-700", default: "300", description: "가중치 (Material Symbols only)" },
      { name: "fill", type: "boolean", default: "false", description: "채움 여부 (Material Symbols only)" },
      { name: "color", type: "string", description: "색상" },
      { name: "onClick", type: "(e) => void", description: "클릭 핸들러 (button role 자동)" },
      { name: "hoverable", type: "boolean", default: "false", description: "hover 효과" },
      { name: "hoverColor", type: "string", description: "hover 시 색상" },
      { name: "disabled", type: "boolean", default: "false", description: "비활성화" },
    ],
    templatePath: "/template/icon",
  },

  // --- Toast ---
  {
    name: "Toast",
    category: "ui",
    description: "Snackbar + Alert 기반 토스트. autoHideDuration 4초, 하단 중앙이 기본입니다.",
    extends: "Omit<SnackbarProps, 'children'>",
    props: [
      { name: "open", type: "boolean", required: true, description: "표시 여부" },
      { name: "severity", type: '"success"|"info"|"warning"|"error"', default: '"info"', description: "알림 심각도" },
      { name: "message", type: "string", required: true, description: "메시지 텍스트" },
      { name: "onClose", type: "() => void", description: "닫기 핸들러" },
    ],
    templatePath: "/template/alert",
  },

  // --- AppHeader ---
  {
    name: "AppHeader",
    category: "ui",
    description: "AppBar + Toolbar 복합 컴포넌트. 헤더 바를 빠르게 구성합니다.",
    props: [
      { name: "leftActions", type: "ReactNode", description: "좌측 액션 영역" },
      { name: "rightActions", type: "ReactNode", description: "우측 액션 영역" },
      { name: "children", type: "ReactNode", description: "중앙 콘텐츠" },
      { name: "elevation", type: "number", default: "1", description: "그림자 깊이" },
      { name: "color", type: '"default"|"primary"|"transparent"|"inherit"', default: '"default"', description: "AppBar 색상" },
      { name: "position", type: '"fixed"|"absolute"|"sticky"|"static"|"relative"', default: '"sticky"', description: "CSS position" },
    ],
    templatePath: "/template/navigation",
  },

  // --- Sidebar ---
  {
    name: "Sidebar",
    category: "ui",
    description: "Drawer 복합 컴포넌트. 사이드바 메뉴를 빠르게 구성합니다.",
    props: [
      { name: "open", type: "boolean", required: true, description: "열림 상태" },
      { name: "onClose", type: "() => void", description: "닫기 핸들러" },
      { name: "title", type: "ReactNode", description: "사이드바 상단 제목" },
      { name: "children", type: "ReactNode", required: true, description: "내용 (NavList 등)" },
      { name: "width", type: "number", default: "240", description: "너비 (px)" },
      { name: "variant", type: '"persistent"|"temporary"|"permanent"', default: '"persistent"', description: "드로어 모드" },
    ],
    templatePath: "/template/navigation",
  },

  // --- NavList ---
  {
    name: "NavList",
    category: "ui",
    description: "네비게이션 리스트 복합 컴포넌트. 중첩 메뉴를 지원합니다.",
    props: [
      { name: "items", type: "NavItem[]", required: true, description: "메뉴 항목 배열" },
      { name: "selectedPath", type: "string", description: "현재 선택된 경로" },
      { name: "onNavigate", type: "(path: string) => void", required: true, description: "네비게이션 핸들러" },
    ],
    templatePath: "/template/navigation",
  },

  // --- FormField ---
  {
    name: "FormField",
    category: "ui",
    description: "라벨 + 입력 영역 + 에러/도움말 복합 컴포넌트. 폼 행을 빠르게 구성합니다.",
    props: [
      { name: "label", type: "string", description: "필드 라벨 텍스트 (undefined: 라벨 영역 숨김, \"\": 빈 라벨 영역 유지)" },
      { name: "required", type: "boolean", description: "필수 표시 (*) 추가" },
      { name: "error", type: "string", description: "에러 메시지 (빨간색 표시)" },
      { name: "helpText", type: "string", description: "도움말 텍스트 (에러 없을 때 회색 표시)" },
      { name: "labelWidth", type: "string", default: '"7.5rem"', description: "라벨 영역 너비" },
      { name: "className", type: "string", description: "추가 CSS 클래스" },
      { name: "children", type: "ReactNode", required: true, description: "입력 요소 (Input, PasswordInput, FlexBox 등)" },
    ],
    templatePath: "/template/form-field",
  },

  // ==========================================
  // UserType 페이지 로컬 컴포넌트
  // ==========================================

  // --- PricingCard ---
  {
    name: "PricingCard",
    category: "page-local",
    description: "요금제 카드. 가격, 기능 목록, CTA 버튼을 포함합니다. (pages/auth/userType/parts)",
    props: [
      { name: "userType", type: "string", required: true, description: "요금제 이름 (Free, Pro 등)" },
      { name: "price", type: "string", required: true, description: "가격 표시 텍스트" },
      { name: "description", type: "string", required: true, description: "요금제 설명" },
      { name: "features", type: "PricingFeature[]", required: true, description: "기능 목록 ({ text, required? })" },
      { name: "cta", type: "ReactNode", description: "CTA 버튼 텍스트" },
      { name: "ctaVariant", type: '"free"|"admin"', description: "CTA 스타일" },
      { name: "contactLabel", type: "string", description: "영업팀 문의 텍스트 (cta 대체)" },
      { name: "onCtaClick", type: "() => void", description: "CTA 클릭 핸들러" },
      { name: "onContactClick", type: "() => void", description: "문의 클릭 핸들러" },
    ],
    templatePath: "/template/domain",
  },

  // --- ContactBar ---
  {
    name: "ContactBar",
    category: "page-local",
    description: "연락처 정보 바. 아이콘 + 텍스트 목록을 표시합니다. (pages/auth/userType/parts)",
    props: [
      { name: "items", type: "ContactItem[]", required: true, description: "연락처 항목 배열 ({ icon, label })" },
    ],
    templatePath: "/template/domain",
  },
];

/** 컴포넌트명으로 검색 */
export function findDoc(name: string): ComponentDoc | undefined {
  return ALL_DOCS.find(
    (d) => d.name.toLowerCase() === name.toLowerCase(),
  );
}

/** 카테고리별 그룹핑 */
export function groupByCategory(): Record<DocCategory, ComponentDoc[]> {
  return {
    base: ALL_DOCS.filter((d) => d.category === "base"),
    layout: ALL_DOCS.filter((d) => d.category === "layout"),
    ui: ALL_DOCS.filter((d) => d.category === "ui"),
    domain: ALL_DOCS.filter((d) => d.category === "domain"),
    "page-local": ALL_DOCS.filter((d) => d.category === "page-local"),
  };
}
