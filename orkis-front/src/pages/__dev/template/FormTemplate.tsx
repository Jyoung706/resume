// ============================================
// Form & InputAdornment 쇼케이스 페이지
// ============================================

import { useState } from "react";
import {
  Typography, Stack, FlexBox, Form, Input, InputAdornment, Button, Box,
  SearchIcon, VisibilityIcon, AttachMoneyIcon,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function FormTemplate() {
  const [submitted, setSubmitted] = useState("");

  return (
    <Stack className="ok-form-template" spacing={4}>
      <Typography variant="h4">Form & InputAdornment</Typography>

      {/* Basic Form */}
      <ExampleBlock
        title="Form — 기본 submit"
        code={`<Form onSubmit={() => alert("submitted!")}>
  <Stack spacing={2}>
    <Input label="이름" />
    <Input label="이메일" type="email" />
    <Button type="submit" variant="contained">제출</Button>
  </Stack>
</Form>`}
      >
        <Box maxWidth={400}>
          <Form onSubmit={() => setSubmitted("제출됨! (" + new Date().toLocaleTimeString() + ")")}>
            <Stack spacing={2}>
              <Input label="이름" />
              <Input label="이메일" type="email" />
              <FlexBox gap={2} align="center">
                <Button type="submit" variant="contained">제출</Button>
                {submitted && (
                  <Typography variant="body2" color="success.main">
                    {submitted}
                  </Typography>
                )}
              </FlexBox>
            </Stack>
          </Form>
        </Box>
      </ExampleBlock>

      {/* Form with rounded/shadow */}
      <ExampleBlock
        title="Form — VisualConvenienceProps"
        code={`<Form rounded="md" shadow="card" p={3}>
  <Input label="검색" fullWidth />
</Form>`}
      >
        <Box maxWidth={400}>
          <Form
            rounded="md"
            shadow="card"
            p={3}
            bgcolor="background.paper"
          >
            <Stack spacing={2}>
              <Input label="사용자명" fullWidth />
              <Input label="비밀번호" type="password" fullWidth />
              <Button variant="contained" fullWidth>로그인</Button>
            </Stack>
          </Form>
        </Box>
      </ExampleBlock>

      {/* InputAdornment — Start */}
      <ExampleBlock
        title="InputAdornment — Start (접두)"
        code={`<Input
  label="검색"
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <SearchIcon />
      </InputAdornment>
    ),
  }}
/>`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Input
            label="검색"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Input
            label="금액"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoneyIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        </FlexBox>
      </ExampleBlock>

      {/* InputAdornment — End */}
      <ExampleBlock
        title="InputAdornment — End (접미)"
        code={`<Input
  label="비밀번호"
  type="password"
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        <VisibilityIcon />
      </InputAdornment>
    ),
  }}
/>`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Input
            label="비밀번호"
            type="password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <VisibilityIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Input
            label="무게"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">kg</InputAdornment>
                ),
              },
            }}
          />
        </FlexBox>
      </ExampleBlock>

      {/* InputAdornment — Both sides */}
      <ExampleBlock
        title="InputAdornment — 양쪽 동시"
        code={`<Input
  label="URL"
  InputProps={{
    startAdornment: <InputAdornment position="start">https://</InputAdornment>,
    endAdornment: <InputAdornment position="end">.com</InputAdornment>,
  }}
/>`}
      >
        <Box maxWidth={400}>
          <Input
            label="URL"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">https://</InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">.com</InputAdornment>
                ),
              },
            }}
          />
        </Box>
      </ExampleBlock>
    </Stack>
  );
}
