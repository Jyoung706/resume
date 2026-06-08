// ============================================
// Checkbox + FormControlLabel 쇼케이스 페이지
// ============================================

import {
  Typography, Stack, FlexBox, Checkbox, FormControlLabel,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const COLORS = ["primary", "secondary", "success", "error", "info", "warning"] as const;

export function CheckboxTemplate() {
  return (
    <Stack className="ok-checkbox-template" spacing={4}>
      <Typography variant="h4">Checkbox & FormControlLabel</Typography>

      {/* Basic Checkbox */}
      <ExampleBlock
        title="Basic Checkbox"
        code={`<Checkbox />
<Checkbox defaultChecked />
<Checkbox disabled />
<Checkbox disabled checked />`}
      >
        <FlexBox gap={1} align="center">
          <Checkbox />
          <Checkbox defaultChecked />
          <Checkbox disabled />
          <Checkbox disabled checked />
        </FlexBox>
      </ExampleBlock>

      {/* With FormControlLabel */}
      <ExampleBlock
        title="With FormControlLabel"
        code={`<FormControlLabel control={<Checkbox />} label="라벨 텍스트" />
<FormControlLabel control={<Checkbox defaultChecked />} label="기본 체크됨" />
<FormControlLabel control={<Checkbox />} label="비활성화" disabled />`}
      >
        <Stack spacing={0.5}>
          <FormControlLabel control={<Checkbox />} label="라벨 텍스트" />
          <FormControlLabel control={<Checkbox defaultChecked />} label="기본 체크됨" />
          <FormControlLabel control={<Checkbox />} label="비활성화" disabled />
        </Stack>
      </ExampleBlock>

      {/* Colors */}
      <ExampleBlock
        title="Colors"
        code={`<FormControlLabel control={<Checkbox defaultChecked color="primary" />} label="primary" />
<FormControlLabel control={<Checkbox defaultChecked color="secondary" />} label="secondary" />
<FormControlLabel control={<Checkbox defaultChecked color="success" />} label="success" />
<FormControlLabel control={<Checkbox defaultChecked color="error" />} label="error" />`}
      >
        <FlexBox gap={2} wrap="wrap">
          {COLORS.map((color) => (
            <FormControlLabel
              key={color}
              control={<Checkbox defaultChecked color={color} />}
              label={color}
            />
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Sizes */}
      <ExampleBlock
        title="Sizes"
        code={`<FormControlLabel control={<Checkbox defaultChecked size="small" />} label="Small" />
<FormControlLabel control={<Checkbox defaultChecked size="medium" />} label="Medium" />`}
      >
        <FlexBox gap={2} align="center">
          <FormControlLabel
            control={<Checkbox defaultChecked size="small" />}
            label="Small"
          />
          <FormControlLabel
            control={<Checkbox defaultChecked size="medium" />}
            label="Medium"
          />
        </FlexBox>
      </ExampleBlock>

      {/* Label Placement */}
      <ExampleBlock
        title="Label Placement"
        code={`<FormControlLabel control={<Checkbox />} label="End (기본)" labelPlacement="end" />
<FormControlLabel control={<Checkbox />} label="Start" labelPlacement="start" />
<FormControlLabel control={<Checkbox />} label="Top" labelPlacement="top" />
<FormControlLabel control={<Checkbox />} label="Bottom" labelPlacement="bottom" />`}
      >
        <FlexBox gap={3} wrap="wrap" align="center">
          <FormControlLabel control={<Checkbox defaultChecked />} label="End (기본)" labelPlacement="end" />
          <FormControlLabel control={<Checkbox defaultChecked />} label="Start" labelPlacement="start" />
          <FormControlLabel control={<Checkbox defaultChecked />} label="Top" labelPlacement="top" />
          <FormControlLabel control={<Checkbox defaultChecked />} label="Bottom" labelPlacement="bottom" />
        </FlexBox>
      </ExampleBlock>

      {/* Indeterminate */}
      <ExampleBlock
        title="Indeterminate"
        code={`<Checkbox indeterminate />
<FormControlLabel control={<Checkbox indeterminate />} label="일부 선택됨" />`}
      >
        <FlexBox gap={2} align="center">
          <Checkbox indeterminate />
          <FormControlLabel control={<Checkbox indeterminate />} label="일부 선택됨" />
        </FlexBox>
      </ExampleBlock>

      {/* ConvenienceProps */}
      <ExampleBlock
        title="ConvenienceProps"
        code={`<FormControlLabel
  control={<Checkbox defaultChecked />}
  label="커스텀 스타일"
  p="sm"
  rounded="md"
  bgcolor="var(--state-hover)"
/>`}
      >
        <Stack spacing={1}>
          <FormControlLabel
            control={<Checkbox defaultChecked />}
            label="배경 + 패딩 + 라운드"
            p="sm"
            rounded="md"
            bgcolor="var(--state-hover)"
          />
          <FormControlLabel
            control={<Checkbox defaultChecked color="success" />}
            label="마진 적용"
            ml="md"
          />
        </Stack>
      </ExampleBlock>
    </Stack>
  );
}
