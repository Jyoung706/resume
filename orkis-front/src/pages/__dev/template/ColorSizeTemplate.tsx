// ============================================
// 색상 & 사이즈 쇼케이스 페이지
// 현재 테마에 선언된 CSS 변수 기준으로
// 색상 팔레트, 사용법, 활용 범위 안내
// ============================================

import { useState } from "react";
import {
  Typography, Button, Box, IconButton, Divider, FlexBox, Stack, Icon,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

// ============================================
// ColorSwatch — 색상 미리보기 블록
// ============================================

function ColorSwatch({ variable, label, size = 48, border = false }: {
  variable: string;
  label?: string;
  size?: number;
  border?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`var(${variable})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <FlexBox
      direction="column"
      align="center"
      gap={0.5}
      style={{ cursor: "pointer" }}
      onClick={handleCopy}
    >
      <Box
        width={size}
        height={size}
        borderRadius={1}
        bgcolor={`var(${variable})`}
        border={border ? "1px solid var(--border-color)" : "none"}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {copied && <Icon mui color="white" size="small" sx={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))" }}>CheckIcon</Icon>}
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        textAlign="center"
        fontSize="0.625rem"
        maxWidth={size + 16}
        style={{ wordBreak: "break-all" }}
      >
        {label ?? variable.replace(/^--(ok-|mui-palette-)/, "")}
      </Typography>
    </FlexBox>
  );
}

// ============================================
// 데이터 정의
// ============================================

const INTENT_COLORS = [
  { intent: "Primary", description: "브랜드 메인 색상. CTA 버튼, 링크, 선택 상태, 주요 강조 UI에 사용", prefix: "--mui-palette-primary" },
  { intent: "Secondary", description: "보조 색상. 보조 버튼, 태그, 배지 등 Primary와 구분이 필요한 곳에 사용", prefix: "--mui-palette-secondary" },
  { intent: "Tertiary", description: "3차 색상. 서브 정보, 비활성 탭, 부가적인 장식 요소에 사용", prefix: "--mui-palette-tertiary" },
] as const;

const STATUS_COLORS = [
  { intent: "Error", description: "오류 상태. 폼 검증 실패, 삭제 확인, 에러 메시지에 사용", prefix: "--mui-palette-error" },
  { intent: "Warning", description: "경고 상태. 주의 알림, 입력값 경고, 변경 전 안내에 사용", prefix: "--mui-palette-warning" },
  { intent: "Info", description: "정보 상태. 안내 메시지, 도움말, 정보성 알림에 사용", prefix: "--mui-palette-info" },
  { intent: "Success", description: "성공 상태. 완료 메시지, 저장 확인, 승인 표시에 사용", prefix: "--mui-palette-success" },
] as const;

const PALETTE_VARIANTS = ["main", "light", "dark", "contrastText"] as const;

const GREY_SCALE = [
  "--grey-50", "--grey-100", "--grey-200",
  "--grey-300", "--grey-400", "--grey-500",
  "--grey-600", "--grey-700", "--grey-800",
  "--grey-900",
];

const SPACING_SCALE = [
  { var: "--space-0", desc: "0" },
  { var: "--space-0-5", desc: "0.125rem (2px)" },
  { var: "--space-1", desc: "0.25rem (4px)" },
  { var: "--space-1-5", desc: "0.375rem (6px)" },
  { var: "--space-2", desc: "0.5rem (8px)" },
  { var: "--space-3", desc: "0.75rem (12px)" },
  { var: "--space-4", desc: "1rem (16px)" },
  { var: "--space-5", desc: "1.25rem (20px)" },
  { var: "--space-6", desc: "1.5rem (24px)" },
  { var: "--space-8", desc: "2rem (32px)" },
  { var: "--space-10", desc: "2.5rem (40px)" },
  { var: "--space-12", desc: "3rem (48px)" },
  { var: "--space-16", desc: "4rem (64px)" },
];

const RADIUS_SCALE = ["none", "xs", "sm", "md", "lg", "xl", "xxl", "full"] as const;

const TEXT_SCALE = ["xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const;

const ICON_SIZES = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

// ============================================
// 메인 컴포넌트
// ============================================

export function ColorSizeTemplate() {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const copyVariable = async (v: string) => {
    await navigator.clipboard.writeText(v);
    setCopiedVar(v);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  return (
    <Stack className="ok-color-size-template" spacing={4}>
      <Typography variant="h4">Color & Size</Typography>

      {/* Intent Colors (Primary / Secondary / Tertiary) */}
      <ExampleBlock
        title="Intent Colors — Primary / Secondary / Tertiary"
        code={`// CSS에서 사용
.my-element {
  color: var(--primary);
  background: var(--primary-light);
  border-color: var(--primary-dark);
}

// MUI sx prop
<Button sx={{ color: "primary.main" }} />
<Box sx={{ bgcolor: "primary.light" }} />

// MUI color prop
<Button color="primary" variant="contained">Primary</Button>
<Button color="secondary" variant="outlined">Secondary</Button>

// Channel 변수로 투명도 조절
background: rgba(var(--mui-palette-primary-mainChannel) / 0.12);`}
      >
        <Stack spacing={3}>
          {INTENT_COLORS.map((group) => (
            <Box key={group.intent}>
              <FlexBox align="center" gap={1} mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>{group.intent}</Typography>
                <Typography variant="caption" color="text.secondary">
                  — {group.description}
                </Typography>
              </FlexBox>
              <FlexBox gap={2} wrap="wrap">
                {PALETTE_VARIANTS.map((v) => (
                  <ColorSwatch
                    key={v}
                    variable={`${group.prefix}-${v}`}
                    label={v}
                    size={56}
                    border={v === "contrastText"}
                  />
                ))}
                <FlexBox direction="column" align="center" gap={0.5}>
                  <Box
                    width={56}
                    height={56}
                    borderRadius={1}
                    border="1px dashed var(--border-color)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    style={{ background: `rgba(var(${group.prefix}-mainChannel) / 0.12)` }}
                  >
                    <Typography variant="caption" fontSize="0.5rem">12%</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" fontSize="0.625rem">
                    mainChannel
                  </Typography>
                </FlexBox>
              </FlexBox>
              <FlexBox gap={1} mt={1.5} wrap="wrap">
                <Button variant="contained" color={group.intent.toLowerCase() as any} size="small">
                  contained
                </Button>
                <Button variant="outlined" color={group.intent.toLowerCase() as any} size="small">
                  outlined
                </Button>
                <Button variant="text" color={group.intent.toLowerCase() as any} size="small">
                  text
                </Button>
              </FlexBox>
            </Box>
          ))}
        </Stack>
      </ExampleBlock>

      {/* Status Colors */}
      <ExampleBlock
        title="Status Colors — Error / Warning / Info / Success"
        code={`// Alert 컴포넌트
<Alert severity="error">오류가 발생했습니다.</Alert>
<Alert severity="warning">주의가 필요합니다.</Alert>
<Alert severity="info">참고 정보입니다.</Alert>
<Alert severity="success">성공적으로 완료되었습니다.</Alert>

// CSS에서 상태 색상 사용
.error-text { color: var(--error); }
.warning-bg { background: var(--warning-light); }

// MUI sx prop
<Box sx={{ bgcolor: "error.light", color: "error.dark" }}>에러</Box>
<Typography sx={{ color: "success.main" }}>저장됨</Typography>

// Channel로 투명도 조절
border: 1px solid rgba(var(--mui-palette-error-mainChannel) / 0.5);`}
      >
        <Stack spacing={3}>
          {STATUS_COLORS.map((group) => (
            <Box key={group.intent}>
              <FlexBox align="center" gap={1} mb={1}>
                <Typography variant="subtitle2" fontWeight={700}>{group.intent}</Typography>
                <Typography variant="caption" color="text.secondary">
                  — {group.description}
                </Typography>
              </FlexBox>
              <FlexBox gap={2} wrap="wrap" align="flex-end">
                {PALETTE_VARIANTS.map((v) => (
                  <ColorSwatch
                    key={v}
                    variable={`${group.prefix}-${v}`}
                    label={v}
                    size={48}
                    border={v === "contrastText"}
                  />
                ))}
              </FlexBox>
              <FlexBox gap={1} mt={1.5} wrap="wrap">
                <Button variant="contained" color={group.intent.toLowerCase() as any} size="small">
                  {group.intent} Button
                </Button>
                <Button variant="outlined" color={group.intent.toLowerCase() as any} size="small">
                  Outlined
                </Button>
              </FlexBox>
            </Box>
          ))}
        </Stack>
      </ExampleBlock>

      {/* Text Colors */}
      <ExampleBlock
        title="Text Colors"
        code={`// CSS 사용
h1 { color: var(--text-color); }
.subtitle { color: var(--text-muted); }
.hint { color: var(--text-faint); }

// MUI Typography color prop
<Typography color="text.primary">주요 텍스트</Typography>
<Typography color="text.secondary">보조 텍스트</Typography>
<Typography color="text.disabled">비활성 텍스트</Typography>

// MUI sx prop
<Box sx={{ color: "text.primary" }}>...</Box>`}
      >
        <Stack spacing={1}>
          <FlexBox align="center" gap={2}>
            <ColorSwatch variable="--text-color" label="text-default" size={40} />
            <Box>
              <Typography color="text.primary">text.primary — 제목, 본문 등 주요 텍스트</Typography>
              <Typography variant="caption" fontFamily="monospace" color="info.main">
                color: var(--text-color)
              </Typography>
            </Box>
          </FlexBox>
          <FlexBox align="center" gap={2}>
            <ColorSwatch variable="--text-muted" label="text-muted" size={40} />
            <Box>
              <Typography color="text.secondary">text.secondary — 부제목, 설명, 레이블</Typography>
              <Typography variant="caption" fontFamily="monospace" color="info.main">
                color: var(--text-muted)
              </Typography>
            </Box>
          </FlexBox>
          <FlexBox align="center" gap={2}>
            <ColorSwatch variable="--text-faint" label="text-faint" size={40} />
            <Box>
              <Typography color="text.disabled">text.disabled — 비활성 상태, 힌트 텍스트</Typography>
              <Typography variant="caption" fontFamily="monospace" color="info.main">
                color: var(--text-faint)
              </Typography>
            </Box>
          </FlexBox>
        </Stack>
      </ExampleBlock>

      {/* Background Colors */}
      <ExampleBlock
        title="Background Colors"
        code={`// 페이지 배경
body { background: var(--bg-color); }

// 카드/패널 배경
.card { background: var(--bg-paper); }

// MUI sx prop
<Box sx={{ bgcolor: "background.default" }}>Page</Box>
<Paper sx={{ bgcolor: "background.paper" }}>Card</Paper>

// 커스텀 Surface 변수
.surface { background: var(--bg-surface); }
.subtle { background: var(--bg-subtle); }`}
      >
        <FlexBox gap={2} wrap="wrap">
          {[
            { var: "--bg-color", label: "default", desc: "페이지 전체 배경" },
            { var: "--bg-paper", label: "paper", desc: "카드/패널 배경" },
            { var: "--color-bg-surface", label: "surface", desc: "표면 배경" },
            { var: "--color-bg-primary-subtle", label: "primary-subtle", desc: "Primary 강조 배경" },
          ].map((bg) => (
            <FlexBox key={bg.var} direction="column" align="center" gap={0.5}>
              <Box
                width={100}
                height={64}
                border="1px solid var(--border-color)"
                borderRadius={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                style={{ background: `var(${bg.var})` }}
              >
                <Typography variant="caption">{bg.label}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" fontSize="0.625rem">
                {bg.desc}
              </Typography>
            </FlexBox>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Action Colors */}
      <ExampleBlock
        title="Action Colors"
        code={`// hover 효과
.item:hover { background: var(--state-hover); }

// 선택 상태
.item.selected { background: var(--state-selected); }

// disabled 상태
.item:disabled {
  color: var(--state-disabled);
  background: var(--state-disabled);
}

// MUI sx prop
<ListItem sx={{ "&:hover": { bgcolor: "action.hover" } }} />
<MenuItem sx={{ bgcolor: selected ? "action.selected" : "transparent" }} />`}
      >
        <Stack spacing={1}>
          {[
            { var: "--state-active", label: "active", desc: "활성 아이콘/요소" },
            { var: "--state-hover", label: "hover", desc: "hover 시 배경 오버레이" },
            { var: "--state-selected", label: "selected", desc: "선택 상태 배경" },
            { var: "--state-disabled", label: "disabled", desc: "비활성 요소 색상" },
            { var: "--state-disabled", label: "disabledBg", desc: "비활성 배경" },
          ].map((item) => (
            <FlexBox key={item.var} align="center" gap={2}>
              <Box
                width={32}
                height={32}
                borderRadius={0.5}
                bgcolor={`var(${item.var})`}
                border="1px solid var(--border-color)"
                flexShrink={0}
              />
              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" width={240} flexShrink={0}>
                {item.var}
              </Typography>
              <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
            </FlexBox>
          ))}
        </Stack>
      </ExampleBlock>

      {/* Grey Scale */}
      <ExampleBlock
        title="Grey Scale"
        code={`// CSS에서 사용
.border { border-color: var(--grey-300); }
.bg-subtle { background: var(--grey-100); }
.text-hint { color: var(--grey-500); }

// MUI sx prop
<Box sx={{ bgcolor: "grey.100", borderColor: "grey.300" }} />
<Typography sx={{ color: "grey.600" }}>힌트 텍스트</Typography>

// Divider 변수
<Divider /> // 자동으로 --border-color 사용`}
      >
        <FlexBox gap={1} wrap="wrap">
          {GREY_SCALE.map((v) => (
            <ColorSwatch key={v} variable={v} size={52} border />
          ))}
        </FlexBox>
        <FlexBox align="center" gap={1} mt={2}>
          <Box flex={1} height={2} bgcolor="var(--border-color)" />
          <Typography variant="caption" color="text.secondary">--border-color</Typography>
          <Box flex={1} height={2} bgcolor="var(--border-color)" />
        </FlexBox>
      </ExampleBlock>

      {/* Common Colors */}
      <ExampleBlock
        title="Common Colors"
        code={`var(--common-white)         // #ffffff
var(--common-black)         // #000000
var(--mui-palette-common-background)    // 테마 따라 자동 전환
var(--mui-palette-common-onBackground)  // 테마 따라 자동 전환

// MUI sx prop
<Box sx={{ color: "common.white", bgcolor: "common.black" }} />`}
      >
        <FlexBox gap={2} wrap="wrap">
          <ColorSwatch variable="--common-white" label="white" size={56} border />
          <ColorSwatch variable="--common-black" label="black" size={56} />
          <ColorSwatch variable="--mui-palette-common-background" label="background" size={56} border />
          <ColorSwatch variable="--mui-palette-common-onBackground" label="onBackground" size={56} />
        </FlexBox>
      </ExampleBlock>

      {/* Spacing System */}
      <ExampleBlock
        title="Spacing System"
        code={`// CSS 변수
.element {
  padding: var(--space-4);        // 1rem (16px)
  margin-bottom: var(--space-2);  // 0.5rem (8px)
  gap: var(--space-3);            // 0.75rem (12px)
}

// MUI sx prop (8px 단위 theme.spacing)
<Box sx={{ p: 2 }} />       // padding: 16px (2 * 8px)
<Stack spacing={3} />       // gap: 24px (3 * 8px)
<Box sx={{ mt: 1.5 }} />    // margin-top: 12px (1.5 * 8px)`}
      >
        <Stack spacing={1}>
          {SPACING_SCALE.map((s) => (
            <FlexBox key={s.var} align="center" gap={2}>
              <Typography variant="caption" fontFamily="monospace" width={100} flexShrink={0} fontSize="0.7rem">
                {s.var}
              </Typography>
              <Box
                height={16}
                width={`var(${s.var})`}
                minWidth={2}
                bgcolor="primary.main"
                borderRadius={0.5}
              />
              <Typography variant="caption" color="text.secondary" fontSize="0.7rem" flexShrink={0}>
                {s.desc}
              </Typography>
            </FlexBox>
          ))}
        </Stack>
      </ExampleBlock>

      {/* Border Radius */}
      <ExampleBlock
        title="Border Radius"
        code={`// CSS 변수
.card { border-radius: var(--radius-md); }
.pill { border-radius: var(--radius-full); }

// 컴포넌트 rounded prop
<Paper rounded="md">내용</Paper>
<Button rounded="lg">버튼</Button>

// MUI sx prop
<Box sx={{ borderRadius: 1 }} />    // 4px
<Box sx={{ borderRadius: 2 }} />    // 8px`}
      >
        <FlexBox gap={2} wrap="wrap" align="flex-end">
          {RADIUS_SCALE.map((r) => (
            <FlexBox key={r} direction="column" align="center" gap={0.5}>
              <Box
                width={56}
                height={56}
                bgcolor="primary.main"
                borderRadius={`var(--radius-${r})`}
              />
              <Typography variant="caption" fontFamily="monospace" fontSize="0.65rem">
                {r}
              </Typography>
            </FlexBox>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Typography Scale */}
      <ExampleBlock
        title="Typography Scale"
        code={`// CSS 변수
h1 { font-size: var(--text-4xl); }
.body { font-size: var(--text-base); }
.small { font-size: var(--text-sm); }

// Font Weight 변수
.bold { font-weight: var(--font-weight-bold); }     // 700
.medium { font-weight: var(--font-weight-medium); } // 500

// MUI Typography variant
<Typography variant="h1">Heading 1</Typography>
<Typography variant="body1">Body text</Typography>`}
      >
        <Stack spacing={1}>
          {TEXT_SCALE.map((t) => (
            <FlexBox key={t} align="baseline" gap={2}>
              <Typography variant="caption" fontFamily="monospace" width={80} flexShrink={0} fontSize="0.7rem">
                --text-{t}
              </Typography>
              <Typography fontSize={`var(--text-${t})`} lineHeight={1.4}>
                ABCDEFG 1234567890
              </Typography>
            </FlexBox>
          ))}
        </Stack>
      </ExampleBlock>

      {/* Icon Sizes */}
      <ExampleBlock
        title="Icon Size Scale"
        code={`// CSS 변수
.icon { width: var(--icon-md); height: var(--icon-md); }

// 크기: xs=12px, sm=16px, md=20px, lg=24px, xl=32px, 2xl=40px`}
      >
        <FlexBox gap={3} wrap="wrap" align="flex-end">
          {ICON_SIZES.map((i) => (
            <FlexBox key={i} direction="column" align="center" gap={0.5}>
              <Box
                width={`var(--icon-${i})`}
                height={`var(--icon-${i})`}
                bgcolor="text.primary"
                borderRadius={0.5}
              />
              <Typography variant="caption" fontFamily="monospace" fontSize="0.65rem">
                {i}
              </Typography>
            </FlexBox>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Quick Reference Table */}
      <ExampleBlock
        title="Quick Reference"
        code={`// CSS 변수 -> MUI sx prop 매핑 요약
//
// var(--primary)     -> sx={{ color: "primary.main" }}
// var(--text-color)     -> sx={{ color: "text.primary" }}
// var(--bg-paper) -> sx={{ bgcolor: "background.paper" }}
// var(--grey-300)         -> sx={{ color: "grey.300" }}
// var(--state-hover)     -> sx={{ bgcolor: "action.hover" }}
// var(--border-color)          -> sx={{ borderColor: "divider" }}
//
// Channel 변수 (투명도 조절):
// background: rgba(var(--mui-palette-primary-mainChannel) / 0.08);
//
// 테마별 오버라이드:
// :root                -> 기본 (Light)
// [data-theme="dark"]  -> 다크 모드
// [data-theme="orkis"] -> ORKIS 브랜드`}
      >
        <Stack spacing={0} divider={<Divider />}>
          {[
            { purpose: "메인 브랜드 색상", css: "--primary", sx: 'color: "primary.main"', prop: 'color="primary"' },
            { purpose: "보조 브랜드 색상", css: "--secondary", sx: 'color: "secondary.main"', prop: 'color="secondary"' },
            { purpose: "에러 텍스트/아이콘", css: "--error", sx: 'color: "error.main"', prop: 'color="error"' },
            { purpose: "주요 텍스트", css: "--text-color", sx: 'color: "text.primary"', prop: 'color="text.primary"' },
            { purpose: "보조 텍스트", css: "--text-muted", sx: 'color: "text.secondary"', prop: 'color="text.secondary"' },
            { purpose: "카드 배경", css: "--bg-paper", sx: 'bgcolor: "background.paper"', prop: "—" },
            { purpose: "구분선", css: "--border-color", sx: 'borderColor: "divider"', prop: "—" },
            { purpose: "Hover 배경", css: "--state-hover", sx: 'bgcolor: "action.hover"', prop: "—" },
          ].map((row) => (
            <FlexBox key={row.css} align="center" gap={1} py={1} px={1}>
              <Box
                width={16}
                height={16}
                borderRadius={0.5}
                flexShrink={0}
                bgcolor={`var(${row.css})`}
                border="1px solid var(--border-color)"
              />
              <Typography variant="body2" width={120} flexShrink={0}>{row.purpose}</Typography>
              <FlexBox align="center" gap={0.5} flex={1} minWidth={0}>
                <Typography variant="caption" fontFamily="monospace" fontSize="0.7rem">
                  var({row.css})
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => copyVariable(`var(${row.css})`)}
                  title="복사"
                >
                  {copiedVar === `var(${row.css})` ? (
                    <Icon mui color="success" size="small">CheckIcon</Icon>
                  ) : (
                    <Icon mui size="small">ContentCopyIcon</Icon>
                  )}
                </IconButton>
              </FlexBox>
              <Typography
                variant="caption"
                fontFamily="monospace"
                fontSize="0.65rem"
                color="success.dark"
                flexShrink={0}
              >
                {row.sx}
              </Typography>
            </FlexBox>
          ))}
        </Stack>
      </ExampleBlock>
    </Stack>
  );
}
