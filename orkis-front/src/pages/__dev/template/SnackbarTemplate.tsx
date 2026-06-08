// ============================================
// Snackbar 쇼케이스 페이지
// ============================================

import { useState } from "react";
import {
  Typography, Stack, FlexBox, Button, Snackbar, Alert, IconButton, Box,
  CloseIcon,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

type AnchorOrigin = { vertical: "top" | "bottom"; horizontal: "left" | "center" | "right" };

export function SnackbarTemplate() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [posAnchor, setPosAnchor] = useState<AnchorOrigin>({
    vertical: "bottom",
    horizontal: "center",
  });
  const [alertOpen, setAlertOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);

  return (
    <Stack className="ok-snackbar-template" spacing={4}>
      <Typography variant="h4">Snackbar</Typography>

      {/* Basic Snackbar */}
      <ExampleBlock
        title="Basic Snackbar"
        code={`<Snackbar
  open={open}
  onClose={() => setOpen(false)}
  message="기본 스낵바 메시지입니다."
/>`}
      >
        <Button variant="contained" onClick={() => setBasicOpen(true)}>
          기본 스낵바 열기
        </Button>
        <Snackbar
          open={basicOpen}
          onClose={() => setBasicOpen(false)}
          message="기본 스낵바 메시지입니다."
          autoHideDuration={3000}
        />
      </ExampleBlock>

      {/* Position */}
      <ExampleBlock
        title="Snackbar — Position (anchorOrigin)"
        code={`<Snackbar
  anchorOrigin={{ vertical: "top", horizontal: "center" }}
  open={open}
  message="Top Center"
/>`}
      >
        <FlexBox gap={1} wrap="wrap">
          {(
            [
              { vertical: "top", horizontal: "left" },
              { vertical: "top", horizontal: "center" },
              { vertical: "top", horizontal: "right" },
              { vertical: "bottom", horizontal: "left" },
              { vertical: "bottom", horizontal: "center" },
              { vertical: "bottom", horizontal: "right" },
            ] as AnchorOrigin[]
          ).map((anchor) => (
            <Button
              key={`${anchor.vertical}-${anchor.horizontal}`}
              variant="outlined"
              size="small"
              onClick={() => {
                setPosAnchor(anchor);
                setPosOpen(true);
              }}
            >
              {anchor.vertical}-{anchor.horizontal}
            </Button>
          ))}
        </FlexBox>
        <Snackbar
          open={posOpen}
          onClose={() => setPosOpen(false)}
          anchorOrigin={posAnchor}
          message={`${posAnchor.vertical}-${posAnchor.horizontal}`}
          autoHideDuration={2000}
        />
      </ExampleBlock>

      {/* With Alert */}
      <ExampleBlock
        title="Snackbar — With Alert"
        code={`<Snackbar open={open} onClose={handleClose}>
  <Alert severity="success" onClose={handleClose}>
    저장되었습니다!
  </Alert>
</Snackbar>`}
      >
        <Button variant="contained" color="success" onClick={() => setAlertOpen(true)}>
          Alert 스낵바 열기
        </Button>
        <Snackbar
          open={alertOpen}
          onClose={() => setAlertOpen(false)}
          autoHideDuration={4000}
        >
          <Alert
            severity="success"
            variant="filled"
            onClose={() => setAlertOpen(false)}
          >
            저장되었습니다!
          </Alert>
        </Snackbar>
      </ExampleBlock>

      {/* With Action */}
      <ExampleBlock
        title="Snackbar — Action 버튼"
        code={`<Snackbar
  open={open}
  message="항목이 삭제되었습니다."
  action={
    <>
      <Button size="small" color="secondary">실행 취소</Button>
      <IconButton size="small" color="inherit" onClick={handleClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </>
  }
/>`}
      >
        <Button variant="outlined" color="error" onClick={() => setActionOpen(true)}>
          Action 스낵바 열기
        </Button>
        <Snackbar
          open={actionOpen}
          onClose={() => setActionOpen(false)}
          message="항목이 삭제되었습니다."
          autoHideDuration={6000}
          action={
            <>
              <Button
                size="small"
                color="secondary"
                onClick={() => {
                  setActionOpen(false);
                  alert("실행 취소!");
                }}
              >
                실행 취소
              </Button>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setActionOpen(false)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
        />
      </ExampleBlock>

      {/* AutoHide Duration */}
      <ExampleBlock
        title="Snackbar — AutoHide Duration"
        code={`<Snackbar
  open={open}
  autoHideDuration={2000}
  onClose={() => setOpen(false)}
  message="2초 후 자동 닫힘"
/>`}
      >
        <Box>
          <Button variant="contained" onClick={() => setAutoOpen(true)}>
            2초 자동 닫힘 스낵바
          </Button>
          <Typography variant="caption" color="text.secondary" ml={2}>
            autoHideDuration=2000
          </Typography>
        </Box>
        <Snackbar
          open={autoOpen}
          onClose={() => setAutoOpen(false)}
          autoHideDuration={2000}
          message="2초 후 자동으로 닫힙니다."
        />
      </ExampleBlock>
    </Stack>
  );
}
