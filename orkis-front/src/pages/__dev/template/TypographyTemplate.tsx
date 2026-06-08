// ============================================
// 타이포그래피 쇼케이스 페이지
// ============================================

import { Typography, Stack, FlexBox, Divider, Link, Box } from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const VARIANTS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "subtitle1", "subtitle2",
  "body1", "body2",
  "caption", "overline",
] as const;

export function TypographyTemplate() {
  return (
    <Stack className="ok-typography-template" spacing={4}>
      <Typography variant="h4">Typography</Typography>

      {/* All Variants */}
      <ExampleBlock
        title="MUI Variants"
        code={`<Typography variant="h1">h1</Typography>
<Typography variant="h2">h2</Typography>
<Typography variant="body1">body1</Typography>
<Typography variant="caption">caption</Typography>`}
      >
        <Stack spacing={1} divider={<Divider />}>
          {VARIANTS.map((v) => (
            <Typography key={v} variant={v}>
              {v} — The quick brown fox jumps over the lazy dog
            </Typography>
          ))}
        </Stack>
      </ExampleBlock>

      {/* CSS Variable Scale */}
      <ExampleBlock
        title="CSS Variable Scale"
        code={`<Typography fontSize="var(--text-xs)">--text-xs</Typography>
<Typography fontSize="var(--text-sm)">--text-sm</Typography>
<Typography fontSize="var(--text-base)">--text-base</Typography>
<Typography fontSize="var(--text-lg)">--text-lg</Typography>
<Typography fontSize="var(--text-xl)">--text-xl</Typography>`}
      >
        <Stack spacing={1}>
          {["--text-xs", "--text-sm", "--text-base", "--text-md", "--text-lg", "--text-xl", "--text-2xl", "--text-3xl", "--text-4xl"].map((v) => (
            <Typography key={v} fontSize={`var(${v})`}>
              {v}: 다람쥐 헌 쳇바퀴 타고파 ABCDEFG 1234567890
            </Typography>
          ))}
        </Stack>
      </ExampleBlock>

      {/* Colors */}
      <ExampleBlock
        title="Text Colors"
        code={`<Typography color="text.primary">text.primary</Typography>
<Typography color="text.secondary">text.secondary</Typography>
<Typography color="text.disabled">text.disabled</Typography>
<Typography color="primary">primary</Typography>
<Typography color="error">error</Typography>`}
      >
        <Stack spacing={1}>
          <Typography color="text.primary">text.primary — 기본 텍스트</Typography>
          <Typography color="text.secondary">text.secondary — 보조 텍스트</Typography>
          <Typography color="text.disabled">text.disabled — 비활성 텍스트</Typography>
          <Typography color="primary">primary — 주요 색상</Typography>
          <Typography color="secondary">secondary — 보조 색상</Typography>
          <Typography color="error">error — 오류 색상</Typography>
        </Stack>
      </ExampleBlock>
      {/* Divider */}
      <ExampleBlock
        title="Divider"
        code={`import { Divider } from "@/components/base/Divider";

<Divider />
<Divider textAlign="center">OR</Divider>
<Divider variant="middle" />

// 세로 구분선
<Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
  <span>A</span>
  <span>B</span>
  <span>C</span>
</Stack>`}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" mb={1}>기본</Typography>
            <Divider />
          </Box>
          <Box>
            <Typography variant="body2" mb={1}>텍스트 포함</Typography>
            <Divider>OR</Divider>
          </Box>
          <Box>
            <Typography variant="body2" mb={1}>textAlign="left"</Typography>
            <Divider textAlign="left">섹션</Divider>
          </Box>
          <Box>
            <Typography variant="body2" mb={1}>variant="middle"</Typography>
            <Divider variant="middle" />
          </Box>
          <Box>
            <Typography variant="body2" mb={1}>세로 구분선 (orientation="vertical")</Typography>
            <FlexBox gap={2} align="center">
              <Typography>항목 A</Typography>
              <Divider orientation="vertical" flexItem />
              <Typography>항목 B</Typography>
              <Divider orientation="vertical" flexItem />
              <Typography>항목 C</Typography>
            </FlexBox>
          </Box>
        </Stack>
      </ExampleBlock>

      {/* Link */}
      <ExampleBlock
        title="Link"
        code={`import { Link } from "@/components/base/Link";

<Link href="#">기본 링크</Link>
<Link href="#" underline="hover">Hover 밑줄</Link>
<Link href="#" underline="none">밑줄 없음</Link>
<Link href="#" color="secondary">Secondary 색상</Link>
<Link href="#" color="error">Error 색상</Link>`}
      >
        <FlexBox gap={3} wrap="wrap" align="center">
          <Link href="#" onClick={(e) => e.preventDefault()}>기본 링크</Link>
          <Link href="#" underline="hover" onClick={(e) => e.preventDefault()}>Hover 밑줄</Link>
          <Link href="#" underline="none" onClick={(e) => e.preventDefault()}>밑줄 없음</Link>
          <Link href="#" color="secondary" onClick={(e) => e.preventDefault()}>Secondary</Link>
          <Link href="#" color="error" onClick={(e) => e.preventDefault()}>Error</Link>
          <Link href="#" color="text.secondary" fontSize="0.875rem" onClick={(e) => e.preventDefault()}>
            text.secondary (0.875rem)
          </Link>
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
