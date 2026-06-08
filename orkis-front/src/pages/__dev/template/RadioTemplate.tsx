// ============================================
// Radio + RadioGroup + FormControlLabel 쇼케이스 페이지
// ============================================

import {
  Divider,
  FlexBox,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioButtonGroup,
  RadioGroup,
  Stack,
  Typography
} from "@/components";
import { useState } from "react";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const COLORS = [
  "primary",
  "secondary",
  "success",
  "error",
  "info",
  "warning"
] as const;

export function RadioTemplate() {
  const [value, setValue] = useState("option1");
  const [group1, setGroup1] = useState("apple");
  const [group2, setGroup2] = useState("male");

  return (
    <Stack className="ok-radio-template" spacing={4}>
      <Typography variant="h4">Radio & RadioGroup</Typography>

      {/* Basic Radio */}
      <ExampleBlock
        title="Basic Radio"
        code={`<Radio />
<Radio defaultChecked />
<Radio disabled />
<Radio disabled checked />`}
      >
        <FlexBox gap={1} align="center">
          <Radio />
          <Radio defaultChecked />
          <Radio disabled />
          <Radio disabled checked />
        </FlexBox>
      </ExampleBlock>

      {/* RadioGroup with FormControlLabel */}
      <ExampleBlock
        title="RadioGroup with FormControlLabel"
        code={`<FormControl>
  <FormLabel>옵션 선택</FormLabel>
  <RadioGroup value={value} onChange={(e) => setValue(e.target.value)}>
    <FormControlLabel value="option1" control={<Radio />} label="옵션 1" />
    <FormControlLabel value="option2" control={<Radio />} label="옵션 2" />
    <FormControlLabel value="option3" control={<Radio />} label="옵션 3" />
  </RadioGroup>
</FormControl>`}
      >
        <FormControl>
          <FormLabel>옵션 선택</FormLabel>
          <RadioGroup value={value} onChange={(e) => setValue(e.target.value)}>
            <FormControlLabel
              value="option1"
              control={<Radio />}
              label="옵션 1"
            />
            <FormControlLabel
              value="option2"
              control={<Radio />}
              label="옵션 2"
            />
            <FormControlLabel
              value="option3"
              control={<Radio />}
              label="옵션 3"
            />
          </RadioGroup>
        </FormControl>
      </ExampleBlock>

      {/* Row Direction */}
      <ExampleBlock
        title="Row Direction"
        code={`<RadioGroup row defaultValue="a">
  <FormControlLabel value="a" control={<Radio />} label="A" />
  <FormControlLabel value="b" control={<Radio />} label="B" />
  <FormControlLabel value="c" control={<Radio />} label="C" />
</RadioGroup>`}
      >
        <RadioGroup row defaultValue="a">
          <FormControlLabel value="a" control={<Radio />} label="A" />
          <FormControlLabel value="b" control={<Radio />} label="B" />
          <FormControlLabel value="c" control={<Radio />} label="C" />
        </RadioGroup>
      </ExampleBlock>

      {/* Colors */}
      <ExampleBlock
        title="Colors"
        code={`<FormControlLabel control={<Radio defaultChecked color="primary" />} label="primary" />
<FormControlLabel control={<Radio defaultChecked color="secondary" />} label="secondary" />
<FormControlLabel control={<Radio defaultChecked color="success" />} label="success" />
<FormControlLabel control={<Radio defaultChecked color="error" />} label="error" />`}
      >
        <FlexBox gap={2} wrap="wrap">
          {COLORS.map((color) => (
            <FormControlLabel
              key={color}
              control={<Radio defaultChecked color={color} />}
              label={color}
            />
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Sizes */}
      <ExampleBlock
        title="Sizes"
        code={`<FormControlLabel control={<Radio defaultChecked size="small" />} label="Small" />
<FormControlLabel control={<Radio defaultChecked size="medium" />} label="Medium" />`}
      >
        <FlexBox gap={2} align="center">
          <FormControlLabel
            control={<Radio defaultChecked size="small" />}
            label="Small"
          />
          <FormControlLabel
            control={<Radio defaultChecked size="medium" />}
            label="Medium"
          />
        </FlexBox>
      </ExampleBlock>

      {/* Label Placement */}
      <ExampleBlock
        title="Label Placement"
        code={`<FormControlLabel control={<Radio />} label="End (기본)" labelPlacement="end" />
<FormControlLabel control={<Radio />} label="Start" labelPlacement="start" />
<FormControlLabel control={<Radio />} label="Top" labelPlacement="top" />
<FormControlLabel control={<Radio />} label="Bottom" labelPlacement="bottom" />`}
      >
        <FlexBox gap={3} wrap="wrap" align="center">
          <FormControlLabel
            control={<Radio defaultChecked />}
            label="End (기본)"
            labelPlacement="end"
          />
          <FormControlLabel
            control={<Radio defaultChecked />}
            label="Start"
            labelPlacement="start"
          />
          <FormControlLabel
            control={<Radio defaultChecked />}
            label="Top"
            labelPlacement="top"
          />
          <FormControlLabel
            control={<Radio defaultChecked />}
            label="Bottom"
            labelPlacement="bottom"
          />
        </FlexBox>
      </ExampleBlock>

      <Divider />

      {/* ─── RadioButtonGroup (UI 컴포넌트) ─── */}
      <Typography variant="h5">RadioButtonGroup (UI)</Typography>

      {/* Basic */}
      <ExampleBlock
        title="Basic — options 배열로 간편 생성"
        code={`<RadioButtonGroup
  label="과일 선택"
  options={[
    { label: "사과", value: "apple" },
    { label: "바나나", value: "banana" },
    { label: "포도", value: "grape" },
  ]}
  value={group1}
  onChange={(e) => setGroup1(e.target.value)}
/>`}
      >
        <RadioButtonGroup
          label="과일 선택"
          options={[
            { label: "사과", value: "apple" },
            { label: "바나나", value: "banana" },
            { label: "포도", value: "grape" }
          ]}
          value={group1}
          onChange={(e) => setGroup1(e.target.value)}
        />
      </ExampleBlock>

      {/* Row Direction */}
      <ExampleBlock
        title="Row Direction"
        code={`<RadioButtonGroup
  label="성별"
  row
  options={[
    { label: "남성", value: "male" },
    { label: "여성", value: "female" },
    { label: "기타", value: "other" },
  ]}
  value={group2}
  onChange={(e) => setGroup2(e.target.value)}
/>`}
      >
        <RadioButtonGroup
          label="성별"
          row
          options={[
            { label: "남성", value: "male" },
            { label: "여성", value: "female" },
            { label: "기타", value: "other" }
          ]}
          value={group2}
          onChange={(e) => setGroup2(e.target.value)}
        />
      </ExampleBlock>

      {/* Disabled & Per-option disabled */}
      <ExampleBlock
        title="Disabled"
        code={`{/* 그룹 전체 비활성화 */}
<RadioButtonGroup
  label="전체 비활성화"
  disabled
  options={[
    { label: "A", value: "a" },
    { label: "B", value: "b" },
  ]}
  defaultValue="a"
/>

{/* 개별 옵션 비활성화 */}
<RadioButtonGroup
  label="개별 비활성화"
  options={[
    { label: "활성", value: "enabled" },
    { label: "비활성", value: "disabled", disabled: true },
    { label: "활성", value: "enabled2" },
  ]}
  defaultValue="enabled"
/>`}
      >
        <FlexBox gap={4} wrap="wrap">
          <RadioButtonGroup
            label="전체 비활성화"
            disabled
            options={[
              { label: "A", value: "a" },
              { label: "B", value: "b" }
            ]}
            defaultValue="a"
            row
          />
          <RadioButtonGroup
            label="개별 비활성화"
            options={[
              { label: "활성", value: "enabled" },
              { label: "비활성", value: "disabled", disabled: true },
              { label: "활성", value: "enabled2" }
            ]}
            defaultValue="enabled"
          />
        </FlexBox>
      </ExampleBlock>

      {/* Size */}
      <ExampleBlock
        title="Size"
        code={`<RadioButtonGroup
  label="Small (기본)"
  size="small"
  options={[
    { label: "옵션 A", value: "a" },
    { label: "옵션 B", value: "b" },
  ]}
  defaultValue="a"
  row
/>

<RadioButtonGroup
  label="Medium"
  size="medium"
  options={[
    { label: "옵션 A", value: "a" },
    { label: "옵션 B", value: "b" },
  ]}
  defaultValue="a"
  row
/>`}
      >
        <FlexBox gap={4} wrap="wrap">
          <RadioButtonGroup
            label="Small (기본)"
            size="small"
            options={[
              { label: "옵션 A", value: "a" },
              { label: "옵션 B", value: "b" }
            ]}
            defaultValue="a"
            row
          />
          <RadioButtonGroup
            label="Medium"
            size="medium"
            options={[
              { label: "옵션 A", value: "a" },
              { label: "옵션 B", value: "b" }
            ]}
            defaultValue="a"
            row
          />
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
