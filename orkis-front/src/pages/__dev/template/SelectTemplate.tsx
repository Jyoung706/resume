// ============================================
// Select + MenuItem 쇼케이스 페이지
// ============================================

import {
  Box,
  FlexBox,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from "@/components";
import { useState } from "react";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function SelectTemplate() {
  const [age, setAge] = useState("");
  const [fruit, setFruit] = useState("apple");
  const [size, setSize] = useState("medium");
  const [multi, setMulti] = useState<string[]>([]);

  return (
    <Stack className="ok-select-template" spacing={4}>
      <Typography variant="h4">Select & MenuItem</Typography>

      {/* Basic Select */}
      <ExampleBlock
        title="Basic Select"
        code={`<FormControl fullWidth>
  <InputLabel>나이</InputLabel>
  <Select
    value={age}
    label="나이"
    onChange={(e) => setAge(e.target.value as string)}
  >
    <MenuItem value={10}>10대</MenuItem>
    <MenuItem value={20}>20대</MenuItem>
    <MenuItem value={30}>30대</MenuItem>
  </Select>
</FormControl>`}
      >
        <FlexBox gap={3} wrap="wrap" align="flex-start">
          <FormControl style={{ minWidth: 200 }}>
            <InputLabel>나이</InputLabel>
            <Select
              value={age}
              label="나이"
              onChange={(e) => setAge(e.target.value as string)}
            >
              <MenuItem value="">
                <em>선택 없음</em>
              </MenuItem>
              <MenuItem value={10}>10대</MenuItem>
              <MenuItem value={20}>20대</MenuItem>
              <MenuItem value={30}>30대</MenuItem>
            </Select>
          </FormControl>
        </FlexBox>
      </ExampleBlock>

      {/* Select Variants */}
      <ExampleBlock
        title="Variants (outlined / filled / standard)"
        code={`<Select variant="outlined" ...>
<Select variant="filled" ...>
<Select variant="standard" ...>`}
      >
        <FlexBox gap={3} wrap="wrap" align="flex-start">
          {(["outlined", "filled", "standard"] as const).map((variant) => (
            <FormControl key={variant} style={{ minWidth: 180 }}>
              <InputLabel>{variant}</InputLabel>
              <Select
                variant={variant}
                value={fruit}
                label={variant}
                onChange={(e) => setFruit(e.target.value as string)}
              >
                <MenuItem value="apple">사과</MenuItem>
                <MenuItem value="banana">바나나</MenuItem>
                <MenuItem value="cherry">체리</MenuItem>
              </Select>
            </FormControl>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Select Size */}
      <ExampleBlock
        title="Size (small / medium)"
        code={`<Select size="small" ...>
<Select size="medium" ...>`}
      >
        <FlexBox gap={3} wrap="wrap" align="flex-start">
          {(["small", "medium"] as const).map((sz) => (
            <FormControl key={sz} size={sz} style={{ minWidth: 180 }}>
              <InputLabel>{sz}</InputLabel>
              <Select
                value={size}
                label={sz}
                onChange={(e) => setSize(e.target.value as string)}
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Multiple Select */}
      <ExampleBlock
        title="Multiple Select"
        code={`<Select
  multiple
  value={selected}
  onChange={(e) => setSelected(e.target.value as string[])}
>
  <MenuItem value="react">React</MenuItem>
  <MenuItem value="vue">Vue</MenuItem>
  <MenuItem value="angular">Angular</MenuItem>
</Select>`}
      >
        <FormControl style={{ minWidth: 280 }}>
          <InputLabel>기술 스택</InputLabel>
          <Select
            multiple
            value={multi}
            label="기술 스택"
            onChange={(e) => setMulti(e.target.value as string[])}
          >
            <MenuItem value="react">React</MenuItem>
            <MenuItem value="vue">Vue</MenuItem>
            <MenuItem value="angular">Angular</MenuItem>
            <MenuItem value="svelte">Svelte</MenuItem>
          </Select>
        </FormControl>
      </ExampleBlock>

      {/* Disabled / Error */}
      <ExampleBlock
        title="Disabled & Error"
        code={`<Select disabled ...>
<Select error ...>`}
      >
        <FlexBox gap={3} wrap="wrap" align="flex-start">
          <FormControl style={{ minWidth: 180 }} disabled>
            <InputLabel>Disabled</InputLabel>
            <Select value="a" label="Disabled">
              <MenuItem value="a">항목 A</MenuItem>
            </Select>
          </FormControl>

          <FormControl style={{ minWidth: 180 }} error>
            <InputLabel>Error</InputLabel>
            <Select value="" label="Error">
              <MenuItem value="">
                <em>선택해 주세요</em>
              </MenuItem>
              <MenuItem value="a">항목 A</MenuItem>
            </Select>
          </FormControl>
        </FlexBox>
      </ExampleBlock>

      {/* MenuItem ConvenienceProps */}
      <ExampleBlock
        title="MenuItem with ConvenienceProps"
        code={`<MenuItem p="md" bgcolor="primary.subtle">
  프리셋 패딩 + 배경색
</MenuItem>`}
      >
        <Box width={300}>
          <Select value="custom" fullWidth>
            <MenuItem value="default">기본 MenuItem</MenuItem>
            <MenuItem value="custom" p="md" bgcolor="primary.subtle">
              프리셋 패딩 + 배경색
            </MenuItem>
          </Select>
        </Box>
      </ExampleBlock>
    </Stack>
  );
}
