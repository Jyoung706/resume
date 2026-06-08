import { Box, Button, CloseIcon } from "@/components";
import { Modal } from "@/components/ui/Modal";
import { MonacoSqlEditor } from "./MonacoSqlEditor";
import "./SqlViewModal.scss";

export interface SqlViewModalProps {
  open: boolean;
  onClose: () => void;
  sqlQuery: string;
  title?: string;
  isDark?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}

export function SqlViewModal({
  open,
  onClose,
  sqlQuery,
  title = "SQL 쿼리",
  isDark,
  onCopy,
  copied,
}: SqlViewModalProps) {
  return (
    <Modal
      className="SqlViewModal"
      open={open}
      onClose={onClose}
      title={title}
      size="xlarge"
      showClose
      actions={
        <Button variant="outlined" onClick={onClose}>
          <CloseIcon fontSize="small" />
          닫기
        </Button>
      }
    >
      <Box className="SqlViewModal__body">
        <MonacoSqlEditor
          value={sqlQuery}
          readOnly
          isDark={isDark}
          onCopy={onCopy}
          copied={copied}
        />
      </Box>
    </Modal>
  );
}
