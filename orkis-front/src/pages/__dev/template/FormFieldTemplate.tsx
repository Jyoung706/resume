// ============================================
// FormField 쇼케이스 페이지
// ============================================

import {
  Typography, Stack, FlexBox, Input, Button, PasswordInput,
  Checkbox, FormControlLabel, FormField,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function FormFieldTemplate() {
  return (
    <Stack className="FormField__template ok-form-field-template" spacing={4}>
      <Typography variant="h4">FormField</Typography>

      {/* Basic */}
      <ExampleBlock
        title="Basic"
        code={`<FormField label="이름">
  <Input placeholder="이름을 입력하세요" fullWidth />
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField label="이름">
            <Input placeholder="이름을 입력하세요" fullWidth />
          </FormField>
        </Stack>
      </ExampleBlock>

      {/* Required */}
      <ExampleBlock
        title="Required"
        code={`<FormField label="아이디" required>
  <Input placeholder="아이디를 입력하세요" fullWidth />
</FormField>
<FormField label="비밀번호" required>
  <PasswordInput placeholder="비밀번호를 입력하세요" fullWidth />
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField label="아이디" required>
            <Input placeholder="아이디를 입력하세요" fullWidth />
          </FormField>
          <FormField label="비밀번호" required>
            <PasswordInput placeholder="비밀번호를 입력하세요" fullWidth />
          </FormField>
        </Stack>
      </ExampleBlock>

      {/* With Error */}
      <ExampleBlock
        title="With Error"
        code={`<FormField label="아이디" required error="아이디는 6~20자 영문/숫자만 가능합니다.">
  <Input placeholder="아이디를 입력하세요" fullWidth error />
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField label="아이디" required error="아이디는 6~20자 영문/숫자만 가능합니다.">
            <Input placeholder="아이디를 입력하세요" fullWidth error />
          </FormField>
          <FormField label="비밀번호" required error="비밀번호는 8자 이상이어야 합니다.">
            <PasswordInput placeholder="비밀번호를 입력하세요" fullWidth error />
          </FormField>
        </Stack>
      </ExampleBlock>

      {/* With Help Text */}
      <ExampleBlock
        title="With Help Text"
        code={`<FormField label="이메일" helpText="알림을 받을 이메일 주소를 입력하세요.">
  <Input placeholder="email@example.com" fullWidth />
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField label="이메일" helpText="알림을 받을 이메일 주소를 입력하세요.">
            <Input placeholder="email@example.com" fullWidth />
          </FormField>
        </Stack>
      </ExampleBlock>

      {/* With Button */}
      <ExampleBlock
        title="With Button (Input + 버튼 조합)"
        code={`<FormField label="아이디" required>
  <FlexBox gap={1} width="100%">
    <Input placeholder="아이디를 입력하세요" grow />
    <Button variant="outlined" height="2.25rem">중복확인</Button>
  </FlexBox>
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField label="아이디" required>
            <FlexBox width="100%">
              <Input placeholder="아이디를 입력하세요" grow />
              <Button variant="outlined">중복확인</Button>
            </FlexBox>
          </FormField>
          <FormField label="이메일" required>
            <FlexBox width="100%">
              <Input placeholder="email@example.com" grow />
              <Button variant="outlined">중복확인</Button>
            </FlexBox>
          </FormField>
        </Stack>
      </ExampleBlock>

      {/* Without Label */}
      <ExampleBlock
        title="Without Label (label 생략)"
        code={`<FormField>
  <FormControlLabel
    control={<Checkbox />}
    label="이름에 아이디 사용하기"
  />
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField>
            <FormControlLabel
              control={<Checkbox />}
              label="이름에 아이디 사용하기"
            />
          </FormField>
        </Stack>
      </ExampleBlock>

      {/* Empty Label (라벨 영역 유지, 텍스트 없음) */}
      <ExampleBlock
        title='Empty Label (label="")'
        code={`<FormField label="아이디" required>
  <Input placeholder="아이디" fullWidth />
</FormField>
<FormField label="">
  <FormControlLabel control={<Checkbox />} label="이름에 아이디 사용하기" />
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField label="아이디" required>
            <Input placeholder="아이디" fullWidth />
          </FormField>
          <FormField label="">
            <FormControlLabel
              control={<Checkbox />}
              label="이름에 아이디 사용하기"
            />
          </FormField>
        </Stack>
      </ExampleBlock>

      {/* Custom Label Width */}
      <ExampleBlock
        title="Custom Label Width"
        code={`<FormField label="라벨" labelWidth="10rem">
  <Input placeholder="넓은 라벨 영역" fullWidth />
</FormField>
<FormField label="짧은" labelWidth="3rem">
  <Input placeholder="좁은 라벨 영역" fullWidth />
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField label="라벨" labelWidth="10rem">
            <Input placeholder="넓은 라벨 영역 (10rem)" fullWidth />
          </FormField>
          <FormField label="짧은" labelWidth="3rem">
            <Input placeholder="좁은 라벨 영역 (3rem)" fullWidth />
          </FormField>
        </Stack>
      </ExampleBlock>

      {/* Full Form Example */}
      <ExampleBlock
        title="Full Form Example"
        code={`<FormField label="아이디" required>
  <FlexBox gap={1} width="100%">
    <Input placeholder="아이디를 입력하세요" grow />
    <Button variant="outlined" height="2.25rem">중복확인</Button>
  </FlexBox>
</FormField>
<FormField label="">
  <FormControlLabel control={<Checkbox />} label="이름에 아이디 사용하기" />
</FormField>
<FormField label="이름(닉네임)" required>
  <Input placeholder="이름을 입력하세요" fullWidth />
</FormField>
<FormField label="비밀번호" required error="8자 이상, 대소문자+특수문자 포함">
  <PasswordInput placeholder="비밀번호" fullWidth error />
</FormField>
<FormField label="이메일" helpText="알림 수신용 이메일">
  <Input placeholder="email@example.com" fullWidth />
</FormField>`}
      >
        <Stack maxWidth="37.5rem">
          <FormField label="아이디" required>
            <FlexBox width="100%">
              <Input placeholder="아이디를 입력하세요" grow />
              <Button variant="outlined">중복확인</Button>
            </FlexBox>
          </FormField>
          <FormField label="">
            <FormControlLabel
              control={<Checkbox />}
              label="이름에 아이디 사용하기"
            />
          </FormField>
          <FormField label="이름(닉네임)" required>
            <Input placeholder="이름을 입력하세요" fullWidth />
          </FormField>
          <FormField label="비밀번호" required error="8자 이상, 대소문자+특수문자 포함">
            <PasswordInput placeholder="비밀번호" fullWidth error />
          </FormField>
          <FormField label="이메일" helpText="알림 수신용 이메일">
            <Input placeholder="email@example.com" fullWidth />
          </FormField>
        </Stack>
      </ExampleBlock>
    </Stack>
  );
}
