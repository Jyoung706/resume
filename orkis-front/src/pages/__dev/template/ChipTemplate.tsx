// ============================================
// Chip 쇼케이스 페이지
// ============================================

import {
  Typography, Stack, FlexBox, Chip, Icon,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const COLORS = ["default", "primary", "secondary", "success", "error", "info", "warning"] as const;

export function ChipTemplate() {
  return (
    <Stack className="ok-chip-template" spacing={4}>
      <Typography variant="h4">Chip</Typography>

      {/* Basic */}
      <ExampleBlock
        title="Basic"
        code={`<Chip label="Default" />
<Chip label="Outlined" variant="outlined" />`}
      >
        <FlexBox gap={1} wrap="wrap">
          <Chip label="Default" />
          <Chip label="Outlined" variant="outlined" />
        </FlexBox>
      </ExampleBlock>

      {/* Colors — Filled */}
      <ExampleBlock
        title="Colors (Filled)"
        code={`<Chip label="default" color="default" />
<Chip label="primary" color="primary" />
<Chip label="secondary" color="secondary" />
<Chip label="success" color="success" />
<Chip label="error" color="error" />
<Chip label="info" color="info" />
<Chip label="warning" color="warning" />`}
      >
        <FlexBox gap={1} wrap="wrap">
          {COLORS.map((color) => (
            <Chip key={color} label={color} color={color} />
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Colors — Outlined */}
      <ExampleBlock
        title="Colors (Outlined)"
        code={`<Chip label="primary" color="primary" variant="outlined" />
<Chip label="secondary" color="secondary" variant="outlined" />
<Chip label="success" color="success" variant="outlined" />`}
      >
        <FlexBox gap={1} wrap="wrap">
          {COLORS.map((color) => (
            <Chip key={color} label={color} color={color} variant="outlined" />
          ))}
        </FlexBox>
      </ExampleBlock>

      {/* Sizes */}
      <ExampleBlock
        title="Sizes"
        code={`<Chip label="Small" size="small" color="primary" />
<Chip label="Medium" size="medium" color="primary" />`}
      >
        <FlexBox gap={1} align="center">
          <Chip label="Small" size="small" color="primary" />
          <Chip label="Medium" size="medium" color="primary" />
        </FlexBox>
      </ExampleBlock>

      {/* Deletable */}
      <ExampleBlock
        title="Deletable"
        code={`<Chip label="Deletable" onDelete={() => {}} />
<Chip label="Custom delete" onDelete={() => {}} deleteIcon={<DoneIcon />} />
<Chip label="Outlined" variant="outlined" onDelete={() => {}} />`}
      >
        <FlexBox gap={1} wrap="wrap">
          <Chip label="Deletable" onDelete={() => {}} />
          <Chip label="Custom delete" onDelete={() => {}} deleteIcon={<Icon mui>DoneIcon</Icon>} />
          <Chip label="Outlined" variant="outlined" onDelete={() => {}} />
          <Chip label="Primary" color="primary" onDelete={() => {}} />
        </FlexBox>
      </ExampleBlock>

      {/* Clickable */}
      <ExampleBlock
        title="Clickable"
        code={`<Chip label="Clickable" onClick={() => {}} />
<Chip label="Clickable + Deletable" onClick={() => {}} onDelete={() => {}} />`}
      >
        <FlexBox gap={1} wrap="wrap">
          <Chip label="Clickable" onClick={() => {}} />
          <Chip label="Clickable Primary" color="primary" onClick={() => {}} />
          <Chip label="Clickable + Deletable" onClick={() => {}} onDelete={() => {}} />
        </FlexBox>
      </ExampleBlock>

      {/* With Icon */}
      <ExampleBlock
        title="With Icon"
        code={`<Chip icon={<Icon mui>FaceIcon</Icon>} label="With Icon" />
<Chip icon={<Icon mui>FaceIcon</Icon>} label="Primary" color="primary" />
<Chip icon={<Icon mui>FaceIcon</Icon>} label="Outlined" variant="outlined" />`}
      >
        <FlexBox gap={1} wrap="wrap">
          <Chip icon={<Icon mui>FaceIcon</Icon>} label="With Icon" />
          <Chip icon={<Icon mui>FaceIcon</Icon>} label="Primary" color="primary" />
          <Chip icon={<Icon mui>FaceIcon</Icon>} label="Outlined" variant="outlined" />
          <Chip icon={<Icon mui>FaceIcon</Icon>} label="Deletable" onDelete={() => {}} />
        </FlexBox>
      </ExampleBlock>

      {/* ConvenienceProps */}
      <ExampleBlock
        title="ConvenienceProps"
        code={`<Chip label="Custom BG" bgcolor="var(--success)" textColor="white" />
<Chip label="Rounded Full" rounded="full" color="primary" />
<Chip label="With Margin" m="sm" color="secondary" />`}
      >
        <FlexBox gap={1} wrap="wrap" align="center">
          <Chip label="Custom BG" bgcolor="var(--success)" textColor="white" />
          <Chip label="Rounded Full" rounded="full" color="primary" />
          <Chip label="With Margin" m="sm" color="secondary" />
        </FlexBox>
      </ExampleBlock>

      {/* Disabled */}
      <ExampleBlock
        title="Disabled"
        code={`<Chip label="Disabled" disabled />
<Chip label="Disabled" disabled color="primary" />
<Chip label="Disabled" disabled variant="outlined" />`}
      >
        <FlexBox gap={1} wrap="wrap">
          <Chip label="Disabled" disabled />
          <Chip label="Disabled" disabled color="primary" />
          <Chip label="Disabled" disabled variant="outlined" />
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
