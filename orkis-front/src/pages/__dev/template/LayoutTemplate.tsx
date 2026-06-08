// ============================================
// 레이아웃 쇼케이스 페이지
// ============================================

import { Typography, Box, FlexBox, Stack, Container, Grid } from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

function DemoBox({ label }: { label: string }) {
  return (
    <Box
      p={2}
      rounded="sm"
      bgcolor="primary.main"
      color="primary.contrastText"
      textAlign="center"
      minWidth={80}
    >
      {label}
    </Box>
  );
}

export function LayoutTemplate() {
  return (
    <Stack className="ok-layout-template" spacing={4}>
      <Typography variant="h4">Layout Components</Typography>

      {/* FlexBox Row */}
      <ExampleBlock
        title="FlexBox — Row"
        code={`<FlexBox gap={2}>
  <DemoBox label="A" />
  <DemoBox label="B" />
  <DemoBox label="C" />
</FlexBox>`}
      >
        <FlexBox gap={2}>
          <DemoBox label="A" />
          <DemoBox label="B" />
          <DemoBox label="C" />
        </FlexBox>
      </ExampleBlock>

      {/* FlexBox Column */}
      <ExampleBlock
        title="FlexBox — Column"
        code={`<FlexBox direction="column" gap={2} maxWidth={200}>
  <DemoBox label="A" />
  <DemoBox label="B" />
  <DemoBox label="C" />
</FlexBox>`}
      >
        <FlexBox direction="column" gap={2} maxWidth={200}>
          <DemoBox label="A" />
          <DemoBox label="B" />
          <DemoBox label="C" />
        </FlexBox>
      </ExampleBlock>

      {/* FlexBox justify & align */}
      <ExampleBlock
        title="FlexBox — justify & align"
        code={`<FlexBox justify="space-between" align="center" gap={2}>
  <DemoBox label="Start" />
  <DemoBox label="Center" />
  <DemoBox label="End" />
</FlexBox>`}
      >
        <FlexBox justify="space-between" align="center" gap={2} minHeight={100} p={2} borderRadius={1} border="1px dashed" borderColor="divider">
          <DemoBox label="Start" />
          <DemoBox label="Center" />
          <DemoBox label="End" />
        </FlexBox>
      </ExampleBlock>

      {/* Stack */}
      <ExampleBlock
        title="Stack"
        code={`<Stack direction="row" spacing={2}>
  <DemoBox label="1" />
  <DemoBox label="2" />
  <DemoBox label="3" />
</Stack>`}
      >
        <Stack direction="row" spacing={2}>
          <DemoBox label="1" />
          <DemoBox label="2" />
          <DemoBox label="3" />
        </Stack>
      </ExampleBlock>

      {/* Container */}
      <ExampleBlock
        title='Container (maxWidth="sm")'
        code={`<Container maxWidth="sm" py={2}>
  <Typography>Container 내부 콘텐츠</Typography>
</Container>`}
      >
        <Container maxWidth="sm" py={2}>
          <Typography>Container 내부 콘텐츠 — maxWidth="sm"</Typography>
        </Container>
      </ExampleBlock>

      {/* Grid — Basic */}
      <ExampleBlock
        title="Grid — Basic"
        code={`<Grid container spacing={2}>
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>A</Grid>
  <Grid size={{ xs: 12, sm: 6, md: 4 }}>B</Grid>
  <Grid size={{ xs: 12, sm: 12, md: 4 }}>C</Grid>
</Grid>`}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DemoBox label="xs=12 sm=6 md=4" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DemoBox label="xs=12 sm=6 md=4" />
          </Grid>
          <Grid size={{ xs: 12, sm: 12, md: 4 }}>
            <DemoBox label="xs=12 sm=12 md=4" />
          </Grid>
        </Grid>
      </ExampleBlock>

      {/* Grid — Nested & offset */}
      <ExampleBlock
        title="Grid — Nested & Offset"
        code={`<Grid container spacing={2}>
  <Grid size={{ xs: 12, md: 8 }}>Main</Grid>
  <Grid size={{ xs: 12, md: 4 }}>Sidebar</Grid>
  <Grid size={6}>Half</Grid>
  <Grid size={6}>Half</Grid>
</Grid>`}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <DemoBox label="Main (xs=12 md=8)" />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <DemoBox label="Sidebar (xs=12 md=4)" />
          </Grid>
          <Grid size={6}>
            <DemoBox label="Half (6)" />
          </Grid>
          <Grid size={6}>
            <DemoBox label="Half (6)" />
          </Grid>
        </Grid>
      </ExampleBlock>

      {/* Convenience Props */}
      <ExampleBlock
        title="Convenience Props"
        code={`<Box p={3} rounded="lg" shadow="card" bgcolor="background.paper">
  p=3, rounded="lg", shadow="card"
</Box>
<Box px={4} py={2} rounded="md" shadow="md" bgcolor="background.paper">
  px=4, py=2, rounded="md", shadow="md"
</Box>`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Box p={3} rounded="lg" shadow="card" bgcolor="background.paper">
            p=3, rounded="lg", shadow="card"
          </Box>
          <Box px={4} py={2} rounded="md" shadow="md" bgcolor="background.paper">
            px=4, py=2, rounded="md", shadow="md"
          </Box>
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
