// ============================================
// 인풋 쇼케이스 페이지
// ============================================

import {
  Typography, Input, Stack, FlexBox, SearchInput, PasswordInput,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function InputTemplate() {
  return (
    <Stack className="ok-input-template" spacing={4}>
      <Typography variant="h4">Input</Typography>

      {/* Basic Input */}
      <ExampleBlock
        title="Basic Input"
        code={`<Input label="Default" />
<Input label="Filled" variant="filled" />
<Input label="Standard" variant="standard" />`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Input label="Default" />
          <Input label="Filled" variant="filled" />
          <Input label="Standard" variant="standard" />
        </FlexBox>
      </ExampleBlock>

      {/* Sizes */}
      <ExampleBlock
        title="Sizes"
        code={`<Input label="Small" size="small" />
<Input label="Medium" size="medium" />`}
      >
        <FlexBox gap={2} align="center">
          <Input label="Small" size="small" />
          <Input label="Medium" size="medium" />
        </FlexBox>
      </ExampleBlock>

      {/* States */}
      <ExampleBlock
        title="States"
        code={`<Input label="Disabled" disabled />
<Input label="Error" error helperText="오류 메시지" />
<Input label="Required" required />
<Input label="Read Only" slotProps={{ input: { readOnly: true } }} defaultValue="읽기 전용" />`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Input label="Disabled" disabled />
          <Input label="Error" error helperText="오류 메시지" />
          <Input label="Required" required />
          <Input label="Read Only" slotProps={{ input: { readOnly: true } }} defaultValue="읽기 전용" />
        </FlexBox>
      </ExampleBlock>

      {/* SearchInput */}
      <ExampleBlock
        title="SearchInput"
        code={`import { SearchInput } from "@/components/ui/SearchInput";

<SearchInput
  maxWidth={400}
  onSearch={(v) => console.log("검색:", v)}
/>`}
      >
        <SearchInput
          maxWidth={400}
          onSearch={(v) => console.log("검색:", v)}
        />
      </ExampleBlock>

      {/* PasswordInput */}
      <ExampleBlock
        title="PasswordInput"
        code={`import { PasswordInput } from "@/components/ui/PasswordInput";

<PasswordInput label="비밀번호" maxWidth={400} />`}
      >
        <PasswordInput label="비밀번호" maxWidth={400} />
      </ExampleBlock>
    </Stack>
  );
}
