// ============================================
// Alert 쇼케이스 페이지
// ============================================

import {
  Typography, Button, Stack, FlexBox, Alert, useToast,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const SEVERITIES = ["success", "info", "warning", "error"] as const;
const VARIANTS = ["standard", "filled", "outlined"] as const;

export function AlertTemplate() {
  const { showToast } = useToast();

  return (
    <Stack className="ok-alert-template" spacing={4}>
      <Typography variant="h4">Alert</Typography>

      {/* Severities × Variants */}
      {VARIANTS.map((variant) => (
        <ExampleBlock
          key={variant}
          title={variant.charAt(0).toUpperCase() + variant.slice(1)}
          code={`<Alert severity="success" variant="${variant}">success</Alert>
<Alert severity="info" variant="${variant}">info</Alert>
<Alert severity="warning" variant="${variant}">warning</Alert>
<Alert severity="error" variant="${variant}">error</Alert>`}
        >
          <Stack spacing={1.5}>
            {SEVERITIES.map((severity) => (
              <Alert key={severity} severity={severity} variant={variant}>
                {severity} — {variant} alert 메시지입니다.
              </Alert>
            ))}
          </Stack>
        </ExampleBlock>
      ))}

      {/* With Close */}
      <ExampleBlock
        title="Closable"
        code={`<Alert severity="success" onClose={() => {}}>
  닫기 버튼이 있는 alert
</Alert>`}
      >
        <Stack spacing={1.5}>
          {SEVERITIES.map((severity) => (
            <Alert key={severity} severity={severity} onClose={() => {}}>
              닫기 버튼이 있는 {severity} alert
            </Alert>
          ))}
        </Stack>
      </ExampleBlock>

      {/* With Title */}
      <ExampleBlock
        title="With Title"
        code={`<Alert severity="success">
  <Typography variant="subtitle2">성공</Typography>
  작업이 성공적으로 완료되었습니다.
</Alert>`}
      >
        <Stack spacing={1.5}>
          <Alert severity="success">
            <Typography variant="subtitle2">성공</Typography>
            작업이 성공적으로 완료되었습니다.
          </Alert>
          <Alert severity="error">
            <Typography variant="subtitle2">오류</Typography>
            요청을 처리하는 중 오류가 발생했습니다.
          </Alert>
        </Stack>
      </ExampleBlock>

      {/* Toast */}
      <ExampleBlock
        title="Toast"
        code={`const { showToast } = useToast();

<Button onClick={() => showToast("메시지", "success")}>
  success Toast
</Button>`}
      >
        <FlexBox gap={2} wrap="wrap">
          {SEVERITIES.map((severity) => (
            <Button
              key={severity}
              variant="outlined"
              onClick={() => showToast(`${severity} 토스트 메시지입니다.`, severity)}
            >
              {severity} Toast
            </Button>
          ))}
        </FlexBox>
      </ExampleBlock>
    </Stack>
  );
}
