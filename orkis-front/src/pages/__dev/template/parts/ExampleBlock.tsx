// ============================================
// ExampleBlock — 예제 렌더링 + 소스코드 표시
// ============================================

import { useState } from "react";
import {
  Typography, Box, Paper, IconButton, FlexBox, Icon,
} from "@/components";

interface ExampleBlockProps {
  /** 섹션 제목 */
  title: string;
  /** 렌더링할 예제 컴포넌트 */
  children: React.ReactNode;
  /** 소스코드 문자열 */
  code: string;
}

export function ExampleBlock({ title, children, code }: ExampleBlockProps) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Paper rounded="md" style={{ overflow: "hidden" }}>
      {/* 헤더 */}
      <FlexBox
        align="center"
        justify="space-between"
        px={3}
        py={1.5}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <Typography variant="h6">{title}</Typography>
        <IconButton
          size="small"
          onClick={() => setShowCode((v) => !v)}
          aria-label="소스코드 토글"
          title="소스코드 보기"
          color={showCode ? "primary" : "default"}
        >
          <Icon mui size="small">CodeIcon</Icon>
        </IconButton>
      </FlexBox>

      {/* 예제 렌더링 영역 */}
      <Box p={3}>{children}</Box>

      {/* 소스코드 영역 */}
      {showCode && (
        <Box borderTop="1px solid" borderColor="divider" position="relative">
          {/* 복사 버튼 */}
          <IconButton
            size="small"
            onClick={handleCopy}
            aria-label="소스코드 복사"
            title="복사"
            color={copied ? "success" : "default"}
            style={{ position: "absolute", top: 8, right: 8 }}
          >
            {copied ? (
              <Icon mui size="small">CheckIcon</Icon>
            ) : (
              <Icon mui size="small">ContentCopyIcon</Icon>
            )}
          </IconButton>

          <Box
            component="pre"
            m={0}
            p={2}
            pr={6}
            overflow="auto"
            maxHeight={400}
            fontSize="0.8125rem"
            lineHeight={1.6}
            fontFamily='"Fira Code", "Consolas", "Monaco", monospace'
            bgcolor="var(--bg-paper, #f5f5f5)"
            color="var(--text-color)"
            whiteSpace="pre"
            style={{ tabSize: 2 }}
          >
            <code>{code.trim()}</code>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
