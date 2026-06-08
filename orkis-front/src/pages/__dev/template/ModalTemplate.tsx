// ============================================
// 모달 + ConfirmModal 쇼케이스 페이지
// ============================================

import { useState } from "react";
import {
  Typography, Button, FlexBox, Stack, Modal, ConfirmModal, useToast,
} from "@/components";
import { ExampleBlock } from "./parts";
import "./Template.scss";

const SIZES = ["xsmall", "small", "medium", "large", "xlarge"] as const;

export function ModalTemplate() {
  const [openSize, setOpenSize] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);
  const { showToast } = useToast();

  return (
    <Stack className="ok-modal-template" spacing={4}>
      <Typography variant="h4">Modal & ConfirmModal</Typography>

      {/* Modal Sizes */}
      <ExampleBlock
        title="Modal Sizes"
        code={`<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Medium Modal"
  size="medium"
  actions={
    <>
      <Button onClick={handleClose}>취소</Button>
      <Button variant="contained" onClick={handleClose}>확인</Button>
    </>
  }
>
  <Typography>모달 내용</Typography>
</Modal>`}
      >
        <FlexBox gap={2} wrap="wrap">
          {SIZES.map((size) => (
            <Button
              key={size}
              variant="outlined"
              onClick={() => setOpenSize(size)}
            >
              {size.toUpperCase()} Modal
            </Button>
          ))}
        </FlexBox>

        {SIZES.map((size) => (
          <Modal
            key={size}
            open={openSize === size}
            onClose={() => setOpenSize(null)}
            title={`${size.toUpperCase()} Modal`}
            size={size}
            actions={
              <>
                <Button onClick={() => setOpenSize(null)}>취소</Button>
                <Button variant="contained" onClick={() => setOpenSize(null)}>
                  확인
                </Button>
              </>
            }
          >
            <Typography>
              이것은 {size.toUpperCase()} 크기의 모달입니다.
              모달 컴포넌트는 xsmall, small, medium, large, xlarge 프리셋 크기를 지원합니다.
            </Typography>
          </Modal>
        ))}
      </ExampleBlock>

      {/* ConfirmModal */}
      <ExampleBlock
        title="ConfirmModal"
        code={`<ConfirmModal
  open={open}
  onClose={() => setOpen(false)}
  onConfirm={() => { setOpen(false); showToast("확인됨", "success"); }}
  title="작업 확인"
  message="이 작업을 진행하시겠습니까?"
/>

// 삭제 확인 (error 색상)
<ConfirmModal
  open={open}
  onClose={handleClose}
  onConfirm={handleDelete}
  title="삭제 확인"
  message={"삭제합니다.\\n되돌릴 수 없습니다."}
  confirmText="삭제"
  confirmColor="error"
/>`}
      >
        <FlexBox gap={2} wrap="wrap">
          <Button
            variant="outlined"
            onClick={() => setConfirmOpen("default")}
          >
            기본 확인
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setConfirmOpen("delete")}
          >
            삭제 확인
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => setConfirmOpen("warning")}
          >
            경고 확인
          </Button>
        </FlexBox>

        <ConfirmModal
          open={confirmOpen === "default"}
          onClose={() => setConfirmOpen(null)}
          onConfirm={() => {
            setConfirmOpen(null);
            showToast("확인되었습니다.", "success");
          }}
          title="작업 확인"
          message="이 작업을 진행하시겠습니까?"
        />

        <ConfirmModal
          open={confirmOpen === "delete"}
          onClose={() => setConfirmOpen(null)}
          onConfirm={() => {
            setConfirmOpen(null);
            showToast("삭제되었습니다.", "error");
          }}
          title="삭제 확인"
          message={"선택한 항목을 삭제합니다.\n이 작업은 되돌릴 수 없습니다."}
          confirmText="삭제"
          confirmColor="error"
        />

        <ConfirmModal
          open={confirmOpen === "warning"}
          onClose={() => setConfirmOpen(null)}
          onConfirm={() => {
            setConfirmOpen(null);
            showToast("계속 진행합니다.", "warning");
          }}
          title="경고"
          message="변경사항이 저장되지 않았습니다. 계속하시겠습니까?"
          confirmText="계속"
          cancelText="돌아가기"
          confirmColor="warning"
        />
      </ExampleBlock>
    </Stack>
  );
}
