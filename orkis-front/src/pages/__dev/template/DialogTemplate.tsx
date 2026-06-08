// ============================================
// Dialog 쇼케이스 페이지
// ============================================

import { useState } from "react";
import { Dialog } from "@/components/base/Dialog";
import {
  Typography, Stack, Button, FlexBox, Input,
  DialogTitle, DialogContent, DialogActions,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

export function DialogTemplate() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [scrollOpen, setScrollOpen] = useState(false);
  const [fullWidthOpen, setFullWidthOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState<string | null>(null);

  return (
    <Stack className="ok-dialog-template" spacing={4}>
      <Typography variant="h4">Dialog</Typography>

      {/* Basic Dialog */}
      <ExampleBlock
        title="Basic Dialog"
        code={`<Dialog open={open} onClose={() => setOpen(false)}>
  <DialogTitle>제목</DialogTitle>
  <DialogContent>
    <Typography>내용</Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setOpen(false)}>취소</Button>
    <Button variant="contained" onClick={() => setOpen(false)}>확인</Button>
  </DialogActions>
</Dialog>`}
      >
        <Button variant="outlined" onClick={() => setBasicOpen(true)}>
          기본 Dialog 열기
        </Button>

        <Dialog open={basicOpen} onClose={() => setBasicOpen(false)}>
          <DialogTitle>알림</DialogTitle>
          <DialogContent>
            <Typography>
              이것은 기본 Dialog 예시입니다.
              DialogTitle, DialogContent, DialogActions 를 조합하여 사용합니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBasicOpen(false)}>취소</Button>
            <Button variant="contained" onClick={() => setBasicOpen(false)}>
              확인
            </Button>
          </DialogActions>
        </Dialog>
      </ExampleBlock>

      {/* Form Dialog */}
      <ExampleBlock
        title="Form Dialog"
        code={`<Dialog open={open} onClose={handleClose}>
  <DialogTitle>로그인</DialogTitle>
  <DialogContent>
    <Input label="이메일" fullWidth />
    <Input label="비밀번호" type="password" fullWidth />
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>취소</Button>
    <Button variant="contained">로그인</Button>
  </DialogActions>
</Dialog>`}
      >
        <Button variant="outlined" onClick={() => setFormOpen(true)}>
          Form Dialog 열기
        </Button>

        <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
          <DialogTitle>로그인</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <Input label="이메일" type="email" fullWidth />
              <Input label="비밀번호" type="password" fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)}>취소</Button>
            <Button variant="contained" onClick={() => setFormOpen(false)}>
              로그인
            </Button>
          </DialogActions>
        </Dialog>
      </ExampleBlock>

      {/* Scrollable Dialog */}
      <ExampleBlock
        title="Scrollable Dialog"
        code={`<Dialog open={open} onClose={handleClose} scroll="paper">
  <DialogTitle>긴 내용</DialogTitle>
  <DialogContent dividers>
    ...긴 텍스트...
  </DialogContent>
</Dialog>`}
      >
        <Button variant="outlined" onClick={() => setScrollOpen(true)}>
          Scroll Dialog 열기
        </Button>

        <Dialog
          open={scrollOpen}
          onClose={() => setScrollOpen(false)}
          scroll="paper"
        >
          <DialogTitle>이용약관</DialogTitle>
          <DialogContent dividers>
            {Array.from({ length: 20 }, (_, i) => (
              <Typography key={i} mb={2}>
                {i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </Typography>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setScrollOpen(false)}>거절</Button>
            <Button variant="contained" onClick={() => setScrollOpen(false)}>
              동의
            </Button>
          </DialogActions>
        </Dialog>
      </ExampleBlock>

      {/* fullWidth + maxWidth */}
      <ExampleBlock
        title="fullWidth & maxWidth"
        code={`<Dialog open={open} fullWidth maxWidth="md">
  ...
</Dialog>`}
      >
        <Button variant="outlined" onClick={() => setFullWidthOpen(true)}>
          fullWidth Dialog 열기
        </Button>

        <Dialog
          open={fullWidthOpen}
          onClose={() => setFullWidthOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>넓은 Dialog</DialogTitle>
          <DialogContent>
            <Typography>
              fullWidth=true, maxWidth=&quot;md&quot; 설정으로 가로 폭을 넓힌 Dialog입니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFullWidthOpen(false)}>닫기</Button>
          </DialogActions>
        </Dialog>
      </ExampleBlock>

      {/* maxWidth sizes */}
      <ExampleBlock
        title="maxWidth Sizes"
        code={`// xs, sm, md, lg, xl
<Dialog fullWidth maxWidth="xs"> ... </Dialog>
<Dialog fullWidth maxWidth="sm"> ... </Dialog>
<Dialog fullWidth maxWidth="lg"> ... </Dialog>`}
      >
        <FlexBox gap={2} wrap="wrap">
          {(["xs", "sm", "md", "lg"] as const).map((mw) => (
            <Button
              key={mw}
              variant="outlined"
              onClick={() => setSizeOpen(mw)}
            >
              maxWidth=&quot;{mw}&quot;
            </Button>
          ))}
        </FlexBox>

        {(["xs", "sm", "md", "lg"] as const).map((mw) => (
          <Dialog
            key={mw}
            open={sizeOpen === mw}
            onClose={() => setSizeOpen(null)}
            fullWidth
            maxWidth={mw}
          >
            <DialogTitle>maxWidth=&quot;{mw}&quot;</DialogTitle>
            <DialogContent>
              <Typography>
                이 Dialog는 fullWidth=true, maxWidth=&quot;{mw}&quot; 입니다.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSizeOpen(null)}>닫기</Button>
            </DialogActions>
          </Dialog>
        ))}
      </ExampleBlock>
    </Stack>
  );
}
