// ============================================
// Preset 토큰 쇼케이스 페이지
// Spacing / Color / BgColor 프리셋 토큰 사용 예시
// ============================================

import {
  Typography, Button, Box, Paper, Alert,
  Divider, FlexBox, Stack, Input,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

// ============================================
// 데이터 정의
// ============================================

const SPACING_PRESETS = [
  { token: "none", css: "--space-0", px: "0" },
  { token: "xs", css: "--space-1", px: "4px" },
  { token: "sm", css: "--space-2", px: "8px" },
  { token: "md", css: "--space-4", px: "16px" },
  { token: "lg", css: "--space-6", px: "24px" },
  { token: "xl", css: "--space-8", px: "32px" },
  { token: "xxl", css: "--space-12", px: "48px" },
] as const;

const COLOR_PRESETS = [
  { token: "primary", desc: "주요 강조 (파랑)" },
  { token: "secondary", desc: "보조 강조 (오렌지)" },
  { token: "error", desc: "에러 (빨강)" },
  { token: "warning", desc: "경고 (오렌지)" },
  { token: "info", desc: "정보 (파랑)" },
  { token: "success", desc: "성공 (녹색)" },
  { token: "text.primary", desc: "기본 텍스트" },
  { token: "text.secondary", desc: "보조 텍스트" },
  { token: "text.disabled", desc: "비활성 텍스트" },
  { token: "white", desc: "흰색" },
  { token: "black", desc: "검정" },
] as const;

const BGCOLOR_PRESETS = [
  { token: "default", desc: "기본 배경" },
  { token: "paper", desc: "Paper/Card 배경" },
  { token: "surface", desc: "표면 배경" },
  { token: "primary", desc: "Primary 배경" },
  { token: "primary.subtle", desc: "약한 Primary 배경" },
  { token: "secondary", desc: "Secondary 배경" },
  { token: "error", desc: "Error 배경" },
  { token: "success", desc: "Success 배경" },
  { token: "grey.100", desc: "Grey 100" },
  { token: "grey.200", desc: "Grey 200" },
  { token: "transparent", desc: "투명" },
] as const;

// ============================================
// 메인 컴포넌트
// ============================================

export function PresetTemplate() {
  return (
    <Stack className="ok-preset-template" spacing={4}>
      <Typography variant="h4">Preset Tokens</Typography>
      <Typography variant="body1" color="text.secondary">
        ConvenienceProps의 spacing / textColor / bgcolor에 프리셋 토큰을 사용한 예시
      </Typography>

      {/* ========== Spacing Preset ========== */}
      <ExampleBlock
        title="Spacing Preset — p, m, px, py, mt, mb 등"
        code={`// 숫자 (MUI spacing 단위: 1 = 8px)
<Paper p={2}>padding: 16px</Paper>
<Paper p={4}>padding: 32px</Paper>

// 프리셋 토큰 (CSS 변수 --space-* 매핑)
<Paper p="xs">padding: 4px</Paper>
<Paper p="sm">padding: 8px</Paper>
<Paper p="md">padding: 16px</Paper>
<Paper p="lg">padding: 24px</Paper>
<Paper p="xl">padding: 32px</Paper>

// 프리셋은 모든 spacing props에 사용 가능
<Paper p="md" mt="sm" mb="lg">조합</Paper>
<Button px="lg" py="sm">버튼</Button>
<Alert p="md" mb="sm">알림</Alert>`}
      >
        <Stack spacing={2}>
          {/* 프리셋별 시각적 비교 */}
          <Typography variant="subtitle2" fontWeight={700}>프리셋 토큰 비교</Typography>
          <Stack spacing={1}>
            {SPACING_PRESETS.map((s) => (
              <FlexBox key={s.token} align="center" gap={2}>
                <Typography variant="caption" fontFamily="monospace" width={40} flexShrink={0}>
                  {`"${s.token}"`}
                </Typography>
                <Paper
                  p={s.token as any}
                  rounded="sm"
                  bgcolor="primary.subtle"
                  style={{ minWidth: 0 }}
                >
                  <Box
                    width={40}
                    height={20}
                    bgcolor="primary"
                    rounded="xs"
                  />
                </Paper>
                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                  {s.css} = {s.px}
                </Typography>
              </FlexBox>
            ))}
          </Stack>

          <Divider my={0.5} />

          {/* 실전 예시 */}
          <Typography variant="subtitle2" fontWeight={700}>실전 사용</Typography>
          <FlexBox gap={2} wrap="wrap">
            <Paper p="sm" rounded="md" shadow="sm">
              <Typography variant="caption">p=&quot;sm&quot;</Typography>
            </Paper>
            <Paper p="md" rounded="md" shadow="sm">
              <Typography variant="caption">p=&quot;md&quot;</Typography>
            </Paper>
            <Paper p="lg" rounded="md" shadow="sm">
              <Typography variant="caption">p=&quot;lg&quot;</Typography>
            </Paper>
            <Paper p="xl" rounded="md" shadow="sm">
              <Typography variant="caption">p=&quot;xl&quot;</Typography>
            </Paper>
          </FlexBox>

          <FlexBox gap={2} wrap="wrap">
            <Button p="xs" rounded="sm" variant="outlined" size="small">p=&quot;xs&quot;</Button>
            <Button px="lg" py="xs" rounded="md" variant="contained">px=&quot;lg&quot; py=&quot;xs&quot;</Button>
            <Button p="md" rounded="lg" variant="outlined">p=&quot;md&quot;</Button>
          </FlexBox>

          {/* Margin 프리셋 */}
          <Typography variant="subtitle2" fontWeight={700}>Margin 프리셋</Typography>
          <Paper p="sm" rounded="md" bgcolor="grey.100">
            <Paper p="sm" mb="xs" rounded="sm" shadow="sm">
              <Typography variant="caption">mb=&quot;xs&quot;</Typography>
            </Paper>
            <Paper p="sm" mb="sm" rounded="sm" shadow="sm">
              <Typography variant="caption">mb=&quot;sm&quot;</Typography>
            </Paper>
            <Paper p="sm" mb="md" rounded="sm" shadow="sm">
              <Typography variant="caption">mb=&quot;md&quot;</Typography>
            </Paper>
            <Paper p="sm" rounded="sm" shadow="sm">
              <Typography variant="caption">(마지막)</Typography>
            </Paper>
          </Paper>
        </Stack>
      </ExampleBlock>

      {/* ========== Color Preset ========== */}
      <ExampleBlock
        title="Color Preset — 텍스트 색상 토큰"
        code={`// 프리셋 토큰으로 텍스트 색상 지정
<Paper textColor="primary">Primary 텍스트</Paper>
<Paper textColor="error">Error 텍스트</Paper>
<Paper textColor="text.secondary">보조 텍스트</Paper>

// 커스텀 값도 가능
<Paper textColor="#ff6600">커스텀 색상</Paper>
<Paper textColor="var(--success-dark)">CSS 변수</Paper>

// Button, IconButton, Alert, AppBar의 color는 MUI 테마 variant
// 텍스트 색상은 textColor 사용
<Button color="primary">MUI color prop</Button>`}
      >
        <Stack spacing={2}>
          <Typography variant="subtitle2" fontWeight={700}>프리셋 토큰 목록</Typography>
          <Stack spacing={0.5}>
            {COLOR_PRESETS.map((c) => (
              <FlexBox key={c.token} align="center" gap={2}>
                <Paper
                  p="xs"
                  px="sm"
                  textColor={c.token}
                  rounded="sm"
                  width={200}
                  style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                >
                  textColor=&quot;{c.token}&quot;
                </Paper>
                <Typography variant="caption" color="text.secondary">
                  {c.desc}
                </Typography>
              </FlexBox>
            ))}
          </Stack>

          <Divider my={0.5} />

          {/* 실전 예시 */}
          <Typography variant="subtitle2" fontWeight={700}>실전 사용</Typography>
          <Paper p="md" rounded="md">
            <Paper textColor="text.primary" mb="xs">
              <Typography variant="h6">카드 제목</Typography>
            </Paper>
            <Paper textColor="text.secondary" mb="sm">
              <Typography variant="body2">이것은 보조 텍스트 색상을 사용한 설명입니다.</Typography>
            </Paper>
            <Paper textColor="primary">
              <Typography variant="body2" fontWeight={600}>더 알아보기 →</Typography>
            </Paper>
          </Paper>

          <FlexBox gap={2}>
            <Paper p="sm" textColor="error" rounded="md" bgcolor="grey.100">
              <Typography variant="body2">에러 메시지</Typography>
            </Paper>
            <Paper p="sm" textColor="success" rounded="md" bgcolor="grey.100">
              <Typography variant="body2">성공 메시지</Typography>
            </Paper>
            <Paper p="sm" textColor="warning" rounded="md" bgcolor="grey.100">
              <Typography variant="body2">경고 메시지</Typography>
            </Paper>
          </FlexBox>
        </Stack>
      </ExampleBlock>

      {/* ========== BgColor Preset ========== */}
      <ExampleBlock
        title="BgColor Preset — 배경 색상 토큰"
        code={`// 프리셋 토큰으로 배경 색상 지정
<Paper bgcolor="surface">표면 배경</Paper>
<Paper bgcolor="primary.subtle">약한 Primary 배경</Paper>
<Paper bgcolor="paper">Paper 배경</Paper>

// Intent 색상 배경
<Paper bgcolor="primary" textColor="white">Primary 배경</Paper>
<Paper bgcolor="error" textColor="white">Error 배경</Paper>

// Grey 배경
<Paper bgcolor="grey.100">Grey 100</Paper>
<Paper bgcolor="grey.200">Grey 200</Paper>

// 커스텀 값도 가능
<Paper bgcolor="#f0f0f0">커스텀 배경</Paper>`}
      >
        <Stack spacing={2}>
          <Typography variant="subtitle2" fontWeight={700}>프리셋 토큰 목록</Typography>
          <FlexBox gap={1.5} wrap="wrap">
            {BGCOLOR_PRESETS.map((bg) => (
              <FlexBox key={bg.token} direction="column" align="center" gap={0.5}>
                <Paper
                  bgcolor={bg.token}
                  width={80}
                  height={48}
                  rounded="sm"
                  style={{ border: "1px solid var(--border-color)" }}
                />
                <Typography variant="caption" fontFamily="monospace" fontSize="0.65rem">
                  {bg.token}
                </Typography>
              </FlexBox>
            ))}
          </FlexBox>

          <Divider my={0.5} />

          {/* 실전 예시: 카드 UI */}
          <Typography variant="subtitle2" fontWeight={700}>카드 UI 조합</Typography>
          <FlexBox gap={2} wrap="wrap">
            <Paper p="md" bgcolor="surface" rounded="lg" shadow="card" width={220}>
              <Paper textColor="text.primary" mb="xs">
                <Typography variant="subtitle2">Surface 카드</Typography>
              </Paper>
              <Paper textColor="text.secondary">
                <Typography variant="body2">bgcolor=&quot;surface&quot; 사용</Typography>
              </Paper>
            </Paper>
            <Paper p="md" bgcolor="primary.subtle" rounded="lg" shadow="card" width={220}>
              <Paper textColor="primary" mb="xs">
                <Typography variant="subtitle2">Primary Subtle 카드</Typography>
              </Paper>
              <Paper textColor="text.secondary">
                <Typography variant="body2">bgcolor=&quot;primary.subtle&quot;</Typography>
              </Paper>
            </Paper>
            <Paper p="md" bgcolor="primary" rounded="lg" shadow="card" width={220}>
              <Paper textColor="white" mb="xs">
                <Typography variant="subtitle2">Primary 카드</Typography>
              </Paper>
              <Paper textColor="white" style={{ opacity: 0.8 }}>
                <Typography variant="body2">bgcolor=&quot;primary&quot;</Typography>
              </Paper>
            </Paper>
          </FlexBox>

          {/* 상태 배경 */}
          <Typography variant="subtitle2" fontWeight={700}>상태 배경</Typography>
          <Stack spacing={1}>
            <Alert severity="info" p="sm" rounded="md">
              Alert는 MUI severity로 색상 결정 (기존 방식)
            </Alert>
            <Paper p="sm" bgcolor="primary.subtle" rounded="md" textColor="primary">
              <Typography variant="body2">
                Paper + bgcolor=&quot;primary.subtle&quot; + textColor=&quot;primary&quot;
              </Typography>
            </Paper>
            <Paper p="sm" bgcolor="error" rounded="md" textColor="white">
              <Typography variant="body2">
                Paper + bgcolor=&quot;error&quot; + textColor=&quot;white&quot;
              </Typography>
            </Paper>
            <Paper p="sm" bgcolor="success" rounded="md" textColor="white">
              <Typography variant="body2">
                Paper + bgcolor=&quot;success&quot; + textColor=&quot;white&quot;
              </Typography>
            </Paper>
          </Stack>
        </Stack>
      </ExampleBlock>

      {/* ========== 종합 예시 ========== */}
      <ExampleBlock
        title="종합 예시 — Spacing + Color + BgColor + Visual"
        code={`// Before (sx prop 직접 사용)
<Box
  sx={{
    p: 3,
    mb: 2,
    bgcolor: "var(--bg-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--mui-shadows-2)",
  }}
>
  <Typography sx={{ color: "var(--text-color)", mb: 1 }}>
    제목
  </Typography>
</Box>

// After (프리셋 토큰)
<Paper p="lg" mb="sm" bgcolor="surface" rounded="lg" shadow="card">
  <Paper textColor="text.primary" mb="xs">
    <Typography variant="h6">제목</Typography>
  </Paper>
  <Paper textColor="text.secondary">
    <Typography variant="body2">설명</Typography>
  </Paper>
</Paper>

// 모든 ConvenienceProps 조합
<Paper
  p="md"              // spacing 프리셋
  mt="sm"             // margin 프리셋
  bgcolor="surface"     // 배경 프리셋
  textColor="text.primary" // 텍스트 색상 프리셋
  rounded="lg"        // border-radius 프리셋
  shadow="card"       // box-shadow 프리셋
  width={300}         // size (숫자)
>
  콘텐츠
</Paper>`}
      >
        <Stack spacing={3}>
          {/* 대시보드 카드 */}
          <Typography variant="subtitle2" fontWeight={700}>대시보드 카드 예시</Typography>
          <FlexBox gap={2} wrap="wrap">
            <Paper p="md" bgcolor="surface" rounded="lg" shadow="card" width={280}>
              <FlexBox justify="space-between" align="center" mb="sm">
                <Paper textColor="text.secondary">
                  <Typography variant="caption">총 매출</Typography>
                </Paper>
                <Paper textColor="success">
                  <Typography variant="caption" fontWeight={600}>+12.5%</Typography>
                </Paper>
              </FlexBox>
              <Paper textColor="text.primary" mb="xs">
                <Typography variant="h5" fontWeight={700}>₩ 24,500,000</Typography>
              </Paper>
              <Paper textColor="text.secondary">
                <Typography variant="body2">전월 대비</Typography>
              </Paper>
            </Paper>

            <Paper p="md" bgcolor="primary.subtle" rounded="lg" shadow="card" width={280}>
              <FlexBox justify="space-between" align="center" mb="sm">
                <Paper textColor="primary">
                  <Typography variant="caption" fontWeight={600}>신규 가입</Typography>
                </Paper>
                <Paper textColor="error">
                  <Typography variant="caption" fontWeight={600}>-3.2%</Typography>
                </Paper>
              </FlexBox>
              <Paper textColor="text.primary" mb="xs">
                <Typography variant="h5" fontWeight={700}>1,234명</Typography>
              </Paper>
              <Paper textColor="text.secondary">
                <Typography variant="body2">이번 달</Typography>
              </Paper>
            </Paper>
          </FlexBox>

          <Divider my={0.5} />

          {/* 폼 영역 */}
          <Typography variant="subtitle2" fontWeight={700}>폼 영역 예시</Typography>
          <Paper p="lg" bgcolor="surface" rounded="lg" shadow="card" maxWidth={400}>
            <Paper textColor="text.primary" mb="md" elevation={0}>
              <Typography variant="h6">프로필 수정</Typography>
            </Paper>
            <Stack spacing={2}>
              <Input label="이름" placeholder="홍길동" fullWidth />
              <Input label="이메일" placeholder="user@example.com" fullWidth />
            </Stack>
            <FlexBox gap={1} mt="md" justify="flex-end">
              <Button variant="outlined" rounded="md">취소</Button>
              <Button variant="contained" rounded="md">저장</Button>
            </FlexBox>
          </Paper>
        </Stack>
      </ExampleBlock>

      {/* ========== 프리셋 vs 숫자 비교 ========== */}
      <ExampleBlock
        title="프리셋 vs 숫자 — 값 차이 주의"
        code={`// 숫자: MUI spacing 단위 (1 = 8px)
<Paper p={2}>padding: 16px (2 × 8px)</Paper>

// 프리셋: CSS 변수 매핑
<Paper p="sm">padding: var(--space-2) = 8px</Paper>

// 숫자 2 ≠ 프리셋 "sm"
// p={2} → 16px (MUI spacing)
// p="sm" → 8px (CSS 변수 --space-2)
//
// 프로젝트 규칙: 프리셋 토큰 우선 사용 권장`}
      >
        <Stack spacing={1}>
          <FlexBox align="center" gap={2}>
            <Paper
              p={2}
              bgcolor="grey.100"
              rounded="sm"
              width={200}
            >
              <Typography variant="caption" fontFamily="monospace">p=&#123;2&#125; → 16px</Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">MUI spacing (2 × 8px)</Typography>
          </FlexBox>
          <FlexBox align="center" gap={2}>
            <Paper
              p="sm"
              bgcolor="primary.subtle"
              rounded="sm"
              width={200}
            >
              <Typography variant="caption" fontFamily="monospace">p=&quot;sm&quot; → 8px</Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">CSS 변수 (--space-2 = 0.5rem)</Typography>
          </FlexBox>
          <FlexBox align="center" gap={2}>
            <Paper
              p="md"
              bgcolor="primary.subtle"
              rounded="sm"
              width={200}
            >
              <Typography variant="caption" fontFamily="monospace">p=&quot;md&quot; → 16px</Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary">CSS 변수 (--space-4 = 1rem)</Typography>
          </FlexBox>
        </Stack>
      </ExampleBlock>
    </Stack>
  );
}
