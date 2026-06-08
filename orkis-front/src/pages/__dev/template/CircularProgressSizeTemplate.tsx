// ============================================
// CircularProgress 사이즈 검증 페이지 (T1-0 검증용)
// ============================================
// 5단계 ComponentSize와 기존 리터럴이 동일 픽셀로 렌더되는지 시각 확인.
// devtools로 width/height computed value 측정 권장.
// ============================================

import {
  CircularProgress,
  FlexBox,
  Stack,
  Typography,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const SIZES = ["xsmall", "small", "medium", "large", "xlarge"] as const;

const SIZE_SPEC: Record<(typeof SIZES)[number], string> = {
  xsmall: "1rem (16px)",
  small: "1.25rem (20px)",
  medium: "1.5rem (24px)",
  large: "2rem (32px)",
  xlarge: "3rem (48px)",
};

export function CircularProgressSizeTemplate() {
  return (
    <Stack className="ok-circular-progress-size-template" spacing={4}>
      <Typography variant="h4">CircularProgress — 사이즈</Typography>

      <Typography variant="body2" color="text.secondary">
        T1-0 검증: ComponentSize 문자열 5단계가{" "}
        <code>--alias-circular-progress-size-*</code> 토큰을 통해 1rem / 1.25rem
        / 1.5rem / 2rem / 3rem 으로 정확히 렌더되는지 확인.
      </Typography>

      {/* ComponentSize 5단계 비교 */}
      <ExampleBlock
        title="ComponentSize 5단계 (alias 토큰 기반 — 표준)"
        code={`<CircularProgress size="xsmall" />   // 1rem
<CircularProgress size="small" />    // 1.25rem
<CircularProgress size="medium" />   // 1.5rem
<CircularProgress size="large" />    // 2rem
<CircularProgress size="xlarge" />   // 3rem`}
      >
        <FlexBox gap={4} align="center" wrap="wrap">
          {SIZES.map((size) => (
            <FlexBox
              key={size}
              direction="column"
              align="center"
              gap={0.5}
            >
              <CircularProgress size={size} />
              <Typography variant="caption">{size}</Typography>
              <Typography variant="caption" color="text.secondary">
                {SIZE_SPEC[size]}
              </Typography>
            </FlexBox>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* 기존 리터럴 vs ComponentSize 비교 (회귀 픽셀 검증) */}
      <ExampleBlock
        title="기존 리터럴 vs ComponentSize — 픽셀 일치 검증"
        code={`{/* 동일 픽셀이어야 함 */}
<CircularProgress size="1rem" />     === <CircularProgress size="xsmall" />
<CircularProgress size="1.25rem" />  === <CircularProgress size="small" />
<CircularProgress size="1.5rem" />   === <CircularProgress size="medium" />
<CircularProgress size={48} />       === <CircularProgress size="xlarge" />`}
      >
        <Stack spacing={3}>
          <FlexBox gap={3} align="center">
            <Typography variant="body2" width={140}>
              1rem === xsmall
            </Typography>
            <CircularProgress size="1rem" />
            <Typography variant="caption">vs</Typography>
            <CircularProgress size="xsmall" />
          </FlexBox>
          <FlexBox gap={3} align="center">
            <Typography variant="body2" width={140}>
              1.25rem === small
            </Typography>
            <CircularProgress size="1.25rem" />
            <Typography variant="caption">vs</Typography>
            <CircularProgress size="small" />
          </FlexBox>
          <FlexBox gap={3} align="center">
            <Typography variant="body2" width={140}>
              1.5rem === medium
            </Typography>
            <CircularProgress size="1.5rem" />
            <Typography variant="caption">vs</Typography>
            <CircularProgress size="medium" />
          </FlexBox>
          <FlexBox gap={3} align="center">
            <Typography variant="body2" width={140}>
              {`{24} === medium`}
            </Typography>
            <CircularProgress size={24} />
            <Typography variant="caption">vs</Typography>
            <CircularProgress size="medium" />
          </FlexBox>
          <FlexBox gap={3} align="center">
            <Typography variant="body2" width={140}>
              {`{48} === xlarge`}
            </Typography>
            <CircularProgress size={48} />
            <Typography variant="caption">vs</Typography>
            <CircularProgress size="xlarge" />
          </FlexBox>
        </Stack>
      </ExampleBlock>

      {/* 인라인 정렬 검증 (Pro 모드 사용처와 동일 컨텍스트) */}
      <ExampleBlock
        title="인라인 텍스트 옆 정렬 (Pro 모드 사용처 시뮬레이션)"
        code={`<FlexBox align="center" gap={0.5}>
  <CircularProgress size="small" />
  <Typography variant="caption">쿼리 실행 중...</Typography>
</FlexBox>`}
      >
        <Stack spacing={1.5}>
          <FlexBox align="center" gap={0.5}>
            <CircularProgress size="xsmall" />
            <Typography variant="caption">xsmall — 인라인 텍스트 옆</Typography>
          </FlexBox>
          <FlexBox align="center" gap={0.5}>
            <CircularProgress size="small" />
            <Typography variant="caption">
              small — 쿼리 실행 중... (ResultsPanel 사용처)
            </Typography>
          </FlexBox>
          <FlexBox align="center" gap={0.5}>
            <CircularProgress size="medium" />
            <Typography variant="body2">medium — 일반 본문 텍스트</Typography>
          </FlexBox>
        </Stack>
      </ExampleBlock>
    </Stack>
  );
}
