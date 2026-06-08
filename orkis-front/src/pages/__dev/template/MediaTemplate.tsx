// ============================================
// Link & Img 쇼케이스 페이지
// ============================================

import {
  Typography, Stack, FlexBox, Link, Img, Paper, Box,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function MediaTemplate() {
  const SAMPLE_IMG = "https://picsum.photos/seed/orkis/400/300";
  const SAMPLE_IMG2 = "https://picsum.photos/seed/design/400/300";

  return (
    <Stack className="ok-media-template" spacing={4}>
      <Typography variant="h4">Link & Img</Typography>

      {/* Link — Underline */}
      <ExampleBlock
        title="Link — Underline variants"
        code={`<Link href="#" underline="always">always</Link>
<Link href="#" underline="hover">hover</Link>
<Link href="#" underline="none">none</Link>`}
      >
        <FlexBox gap={3} wrap="wrap" align="center">
          <Link href="#" underline="always">underline always</Link>
          <Link href="#" underline="hover">underline hover</Link>
          <Link href="#" underline="none">underline none</Link>
        </FlexBox>
      </ExampleBlock>

      {/* Link — Color */}
      <ExampleBlock
        title="Link — Color"
        code={`<Link href="#" color="primary">primary</Link>
<Link href="#" color="secondary">secondary</Link>
<Link href="#" color="error">error</Link>
<Link href="#" color="inherit">inherit</Link>`}
      >
        <FlexBox gap={3} wrap="wrap" align="center">
          <Link href="#" color="primary">primary</Link>
          <Link href="#" color="secondary">secondary</Link>
          <Link href="#" color="error">error</Link>
          <Link href="#" color="text.secondary">text.secondary</Link>
          <Link href="#" color="inherit">inherit</Link>
        </FlexBox>
      </ExampleBlock>

      {/* Link — Typography variant */}
      <ExampleBlock
        title="Link — Typography variant"
        code={`<Link href="#" variant="h6">h6 링크</Link>
<Link href="#" variant="body1">body1 링크</Link>
<Link href="#" variant="caption">caption 링크</Link>`}
      >
        <FlexBox gap={3} wrap="wrap" align="center">
          <Link href="#" variant="h6">h6 링크</Link>
          <Link href="#" variant="body1">body1 링크</Link>
          <Link href="#" variant="body2">body2 링크</Link>
          <Link href="#" variant="caption">caption 링크</Link>
        </FlexBox>
      </ExampleBlock>

      {/* Img — object-fit */}
      <ExampleBlock
        title="Img — fit (object-fit)"
        code={`<Img src="..." fit="cover" width={200} height={150} />
<Img src="..." fit="contain" width={200} height={150} />
<Img src="..." fit="fill" width={200} height={150} />`}
      >
        <FlexBox gap={2} wrap="wrap">
          {(["cover", "contain", "fill", "none", "scale-down"] as const).map(
            (fitValue) => (
              <Box key={fitValue} textAlign="center">
                <Paper variant="outlined" p="xs">
                  <Img
                    src={SAMPLE_IMG}
                    alt={fitValue}
                    fit={fitValue}
                    width={180}
                    height={120}
                    rounded="sm"
                  />
                </Paper>
                <Typography variant="caption" mt={0.5}>
                  fit=&quot;{fitValue}&quot;
                </Typography>
              </Box>
            ),
          )}
        </FlexBox>
      </ExampleBlock>

      {/* Img — rounded + shadow */}
      <ExampleBlock
        title="Img — ConvenienceProps (rounded, shadow)"
        code={`<Img src="..." fit="cover" width={200} height={150} rounded="lg" shadow="card" />
<Img src="..." fit="cover" width={150} height={150} rounded="full" shadow="md" />`}
      >
        <FlexBox gap={3} wrap="wrap" align="center">
          <Img
            src={SAMPLE_IMG}
            alt="rounded lg"
            fit="cover"
            width={200}
            height={150}
            rounded="lg"
            shadow="card"
          />
          <Img
            src={SAMPLE_IMG2}
            alt="rounded full (원형)"
            fit="cover"
            width={150}
            height={150}
            rounded="full"
            shadow="md"
          />
          <Img
            src={SAMPLE_IMG}
            alt="no round"
            fit="cover"
            width={200}
            height={150}
            shadow="lg"
          />
        </FlexBox>
      </ExampleBlock>

      {/* Img — sizing */}
      <ExampleBlock
        title="Img — 크기 조절"
        code={`<Img src="..." fit="cover" width="100%" maxHeight={200} />
<Img src="..." fit="contain" width={120} height={120} />`}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" mb={1}>width=&quot;100%&quot; maxHeight=200</Typography>
            <Img
              src={SAMPLE_IMG}
              alt="full width"
              fit="cover"
              width="100%"
              maxHeight={200}
              rounded="md"
            />
          </Box>
          <FlexBox gap={2}>
            <Box>
              <Typography variant="body2" mb={1}>120×120</Typography>
              <Img src={SAMPLE_IMG2} alt="small" fit="cover" width={120} height={120} rounded="sm" />
            </Box>
            <Box>
              <Typography variant="body2" mb={1}>80×80</Typography>
              <Img src={SAMPLE_IMG} alt="tiny" fit="cover" width={80} height={80} rounded="full" />
            </Box>
          </FlexBox>
        </Stack>
      </ExampleBlock>
    </Stack>
  );
}
