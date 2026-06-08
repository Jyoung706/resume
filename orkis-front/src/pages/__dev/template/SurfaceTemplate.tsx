// ============================================
// Paper & Divider & CardActionArea 쇼케이스 페이지
// ============================================

import {
  Typography, Stack, FlexBox, Paper, Divider, Box, CardActionArea,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function SurfaceTemplate() {
  return (
    <Stack className="ok-surface-template" spacing={4}>
      <Typography variant="h4">Paper & Divider & CardActionArea</Typography>

      {/* Paper Elevation */}
      <ExampleBlock
        title="Paper — Elevation"
        code={`<Paper elevation={0}>elevation 0</Paper>
<Paper elevation={1}>elevation 1</Paper>
<Paper elevation={3}>elevation 3</Paper>
<Paper elevation={6}>elevation 6</Paper>
<Paper elevation={12}>elevation 12</Paper>`}
      >
        <FlexBox gap={2} wrap="wrap">
          {[0, 1, 3, 6, 12].map((el) => (
            <Paper key={el} elevation={el} p="md">
              <Typography variant="body2">elevation {el}</Typography>
            </Paper>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Paper Variant */}
      <ExampleBlock
        title="Paper — Variant"
        code={`<Paper variant="elevation">elevation (기본)</Paper>
<Paper variant="outlined">outlined</Paper>`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Paper variant="elevation" p="md">
            <Typography variant="body2">elevation (기본)</Typography>
          </Paper>
          <Paper variant="outlined" p="md">
            <Typography variant="body2">outlined</Typography>
          </Paper>
        </FlexBox>
      </ExampleBlock>

      {/* Paper rounded + shadow (ConvenienceProps) */}
      <ExampleBlock
        title="Paper — ConvenienceProps (rounded, shadow, textColor, bgcolor)"
        code={`<Paper rounded="lg" shadow="card" p="lg">
  rounded lg + shadow card
</Paper>
<Paper rounded="full" bgcolor="primary.subtle" p="md">
  rounded full + bgcolor
</Paper>
<Paper textColor="primary" p="md">
  textColor="primary" 텍스트 색상
</Paper>`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Paper rounded="lg" shadow="card" p="lg">
            <Typography variant="body2">rounded lg + shadow card</Typography>
          </Paper>
          <Paper rounded="full" bgcolor="primary.subtle" p="md">
            <Typography variant="body2">rounded full + bgcolor</Typography>
          </Paper>
          <Paper textColor="primary" p="md">
            <Typography variant="body2" color="inherit">textColor=&quot;primary&quot;</Typography>
          </Paper>
          <Paper textColor="error" bgcolor="grey.100" p="md" rounded="md">
            <Typography variant="body2" color="inherit">textColor error + bgcolor grey</Typography>
          </Paper>
        </FlexBox>
      </ExampleBlock>

      {/* Divider — Horizontal */}
      <ExampleBlock
        title="Divider — Horizontal"
        code={`<Divider />
<Divider variant="middle" />
<Divider variant="inset" />`}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" mb={1}>기본 (fullWidth)</Typography>
            <Divider />
          </Box>
          <Box>
            <Typography variant="body2" mb={1}>variant=&quot;middle&quot;</Typography>
            <Divider variant="middle" />
          </Box>
          <Box>
            <Typography variant="body2" mb={1}>variant=&quot;inset&quot;</Typography>
            <Divider variant="inset" />
          </Box>
        </Stack>
      </ExampleBlock>

      {/* Divider — With Text */}
      <ExampleBlock
        title="Divider — With Text"
        code={`<Divider>CENTER</Divider>
<Divider textAlign="left">LEFT</Divider>
<Divider textAlign="right">RIGHT</Divider>`}
      >
        <Stack spacing={2}>
          <Divider>CENTER</Divider>
          <Divider textAlign="left">LEFT</Divider>
          <Divider textAlign="right">RIGHT</Divider>
        </Stack>
      </ExampleBlock>

      {/* Divider — Vertical */}
      <ExampleBlock
        title="Divider — Vertical"
        code={`<FlexBox align="center" gap={2} height={40}>
  <Typography>항목 A</Typography>
  <Divider orientation="vertical" flexItem />
  <Typography>항목 B</Typography>
  <Divider orientation="vertical" flexItem />
  <Typography>항목 C</Typography>
</FlexBox>`}
      >
        <FlexBox align="center" gap={2} height={40}>
          <Typography>항목 A</Typography>
          <Divider orientation="vertical" flexItem />
          <Typography>항목 B</Typography>
          <Divider orientation="vertical" flexItem />
          <Typography>항목 C</Typography>
        </FlexBox>
      </ExampleBlock>

      {/* CardActionArea */}
      <ExampleBlock
        title="CardActionArea"
        code={`<Paper rounded="md" shadow="card">
  <CardActionArea onClick={() => alert("clicked!")}>
    <FlexBox direction="column" align="center" gap={1} p="md">
      <Typography variant="h6">클릭 가능한 카드</Typography>
      <Typography variant="body2" color="text.secondary">
        CardActionArea 로 전체 영역이 클릭 됩니다
      </Typography>
    </FlexBox>
  </CardActionArea>
</Paper>`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Paper rounded="md" shadow="card" width={240}>
            <CardActionArea onClick={() => alert("Card A clicked!")}>
              <FlexBox direction="column" align="center" gap={1} p="md">
                <Typography variant="h6">카드 A</Typography>
                <Typography variant="body2" color="text.secondary">
                  전체 영역 클릭
                </Typography>
              </FlexBox>
            </CardActionArea>
          </Paper>
          <Paper rounded="md" shadow="card" width={240}>
            <CardActionArea onClick={() => alert("Card B clicked!")}>
              <FlexBox direction="column" align="center" gap={1} p="md">
                <Typography variant="h6">카드 B</Typography>
                <Typography variant="body2" color="text.secondary">
                  호버 리플 효과
                </Typography>
              </FlexBox>
            </CardActionArea>
          </Paper>
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
