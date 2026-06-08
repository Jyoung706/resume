// ============================================
// Icon 쇼케이스 페이지
// ============================================

import {
  Typography, Stack, FlexBox, Icon, useToast,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function IconTemplate() {
  const { showToast } = useToast();

  return (
    <Stack className="ok-material-icon-template" spacing={4}>
      <Typography variant="h4">Icon</Typography>

      {/* 크기 프리셋 */}
      <ExampleBlock
        title="크기 (Size)"
        code={`<Icon size="small">star</Icon>   // --icon-size-small
<Icon size="medium">star</Icon>  // --icon-size-medium (기본)
<Icon size="large">star</Icon>   // --icon-size-large`}
      >
        <FlexBox align="center" gap={3} wrap="wrap">
          {(["small", "medium", "large"] as const).map((size) => (
            <FlexBox key={size} direction="column" align="center" gap={0.5}>
              <Icon size={size}>star</Icon>
              <Typography variant="caption" color="text.secondary">
                {size}
              </Typography>
            </FlexBox>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* MUI 모드 */}
      <ExampleBlock
        title="MUI SVG vs Material Symbols"
        code={`<Icon mui>FavoriteIcon</Icon>   // MUI SVG 아이콘
<Icon>favorite</Icon>           // Material Symbols 웹 폰트 (기본)`}
      >
        <FlexBox align="center" gap={3} wrap="wrap">
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon mui size="large">FavoriteIcon</Icon>
            <Typography variant="caption" color="text.secondary">MUI SVG</Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon size="large">favorite</Icon>
            <Typography variant="caption" color="text.secondary">Material Symbols</Typography>
          </FlexBox>
        </FlexBox>
      </ExampleBlock>

      {/* Fill 변형 */}
      <ExampleBlock
        title="Fill 변형"
        code={`<Icon size="medium">favorite</Icon>        // Outlined
<Icon size="medium" fill>favorite</Icon>   // Filled`}
      >
        <FlexBox align="center" gap={3} wrap="wrap">
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon size="large">favorite</Icon>
            <Typography variant="caption" color="text.secondary">Outlined</Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon size="large" fill>favorite</Icon>
            <Typography variant="caption" color="text.secondary">Filled</Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon size="large">bookmark</Icon>
            <Typography variant="caption" color="text.secondary">Outlined</Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon size="large" fill>bookmark</Icon>
            <Typography variant="caption" color="text.secondary">Filled</Typography>
          </FlexBox>
        </FlexBox>
      </ExampleBlock>

      {/* Weight 변형 */}
      <ExampleBlock
        title="Weight 변형"
        code={`<Icon size="large" weight={100}>settings</Icon>
<Icon size="large" weight={300}>settings</Icon>  // 기본
<Icon size="large" weight={500}>settings</Icon>
<Icon size="large" weight={700}>settings</Icon>`}
      >
        <FlexBox align="center" gap={3} wrap="wrap">
          {([100, 200, 300, 400, 500, 600, 700] as const).map((w) => (
            <FlexBox key={w} direction="column" align="center" gap={0.5}>
              <Icon size="large" weight={w}>settings</Icon>
              <Typography variant="caption" color="text.secondary">{w}</Typography>
            </FlexBox>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* 색상 */}
      <ExampleBlock
        title="색상 (Color)"
        code={`<Icon size="large" color="#c84111">notifications_active</Icon>
<Icon size="large" color="#4caf50" fill>check_circle</Icon>
<Icon size="large" color="#FFA629" fill>warning</Icon>
<Icon size="large" color="#DE0719" fill>error</Icon>
<Icon size="large" color="#2196f3" fill>info</Icon>`}
      >
        <FlexBox align="center" gap={3} wrap="wrap">
          <Icon size="large" color="#c84111">notifications_active</Icon>
          <Icon size="large" color="#4caf50" fill>check_circle</Icon>
          <Icon size="large" color="#FFA629" fill>warning</Icon>
          <Icon size="large" color="#DE0719" fill>error</Icon>
          <Icon size="large" color="#2196f3" fill>info</Icon>
        </FlexBox>
      </ExampleBlock>

      {/* 클릭 가능 + 호버 */}
      <ExampleBlock
        title="클릭 & 호버"
        code={`<Icon
  size="large"
  color="#DE0719"
  hoverable
  onClick={() => showToast("삭제 클릭!", "error")}
>delete</Icon>

<Icon size="large" disabled>add_circle</Icon>`}
      >
        <FlexBox align="center" gap={3} wrap="wrap">
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon
              size="large"
              color="#DE0719"
              hoverable
              onClick={() => showToast("삭제 클릭!", "error")}
            >delete</Icon>
            <Typography variant="caption" color="text.secondary">Clickable</Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon
              size="large"
              color="#2196f3"
              hoverable
              onClick={() => showToast("편집 클릭!", "info")}
            >edit</Icon>
            <Typography variant="caption" color="text.secondary">Hoverable</Typography>
          </FlexBox>
          <FlexBox direction="column" align="center" gap={0.5}>
            <Icon size="large" disabled>add_circle</Icon>
            <Typography variant="caption" color="text.secondary">Disabled</Typography>
          </FlexBox>
        </FlexBox>
      </ExampleBlock>

      {/* 실사용 예시 */}
      <ExampleBlock
        title="실사용 예시"
        code={`<Icon size="medium" color="#c84111">database</Icon>
<Typography variant="body2">DB 연결됨</Typography>

<Icon size="medium" color="#4caf50" fill>smart_toy</Icon>
<Typography variant="body2">LLM 활성</Typography>`}
      >
        <FlexBox align="center" gap={2} wrap="wrap">
          <Icon size="medium" color="#c84111">database</Icon>
          <Typography variant="body2">DB 연결됨</Typography>
          <Icon size="medium" color="#4caf50" fill>smart_toy</Icon>
          <Typography variant="body2">LLM 활성</Typography>
          <Icon size="medium">search</Icon>
          <Typography variant="body2">검색</Typography>
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
