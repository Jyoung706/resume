import {
  Box,
  Button,
  Icon,
  CloseIcon,
  Typography,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components";
import { FlexBox } from "@/components/layout";
import { Modal } from "@/components/ui/Modal";
import "./DataViewModal.scss";

export interface DataViewModalProps {
  open: boolean;
  onClose: () => void;
  columns: string[];
  data: Array<Record<string, unknown>>;
  title?: string;
  maxRows?: number;
  isLoading?: boolean;
  onCsvDownload?: () => void;
}

export function DataViewModal({
  open,
  onClose,
  columns,
  data,
  title = "전체 데이터",
  maxRows = 100,
  isLoading = false,
  onCsvDownload,
}: DataViewModalProps) {
  const displayData = data.slice(0, maxRows);
  const hasMoreData = data.length > maxRows;
  const isEmpty = !isLoading && data.length === 0;

  const subtitle = hasMoreData
    ? `${data.length}건 중 상위 ${maxRows}건 표시`
    : data.length > 0
      ? `${data.length}건 표시`
      : undefined;

  return (
    <Modal
      className="DataViewModal"
      open={open}
      onClose={onClose}
      title={
        <Box>
          <Typography className="DataViewModal__title">{title}</Typography>
          {subtitle && (
            <Typography className="DataViewModal__subtitle">
              {subtitle}
            </Typography>
          )}
        </Box>
      }
      size="xlarge"
      showClose
      actions={
        <FlexBox className="DataViewModal__actions">
          {onCsvDownload && (
            <Button variant="outlined" startIcon={<Icon mui>download</Icon>} onClick={onCsvDownload}>
              CSV 다운로드
            </Button>
          )}
          <Button variant="outlined" onClick={onClose}>
            <CloseIcon fontSize="small" />
            닫기
          </Button>
        </FlexBox>
      }
    >
      <Box className="DataViewModal__body">
        {isLoading ? (
          <FlexBox className="DataViewModal__loading">
            <CircularProgress size={32} />
          </FlexBox>
        ) : isEmpty ? (
          <FlexBox className="DataViewModal__empty">
            <Typography>조회된 데이터가 없습니다.</Typography>
          </FlexBox>
        ) : (
          <Box className="DataViewModal__table-wrapper">
            <Table stickyHeader size="small" className="DataViewModal__table">
              <TableHead>
                <TableRow className="DataViewModal__head-row">
                  {columns.map((col) => (
                    <TableCell key={col} className="DataViewModal__head-cell">
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayData.map((row, rowIdx) => (
                  <TableRow key={rowIdx} className="DataViewModal__body-row">
                    {columns.map((col) => (
                      <TableCell key={col} className="DataViewModal__body-cell">
                        {row[col] != null ? String(row[col]) : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
    </Modal>
  );
}
