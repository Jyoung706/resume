// ============================================
// KeywordCreateDialog — 키워드 등록 다이얼로그
// Design Layer: props 기반 (로직 없음)
// ============================================

import { useState, useEffect } from "react";
import { Dialog } from "@/components/base/Dialog";
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Select,
  MenuItem,
  CreateIcon,
  CloseIcon,
  FormControlLabel,
  Checkbox,
  FlexBox,
  InputLabel
} from "@/components";
import "./KeywordCreateDialog.scss";

// ============================================
// Props
// ============================================

export interface KeywordCreateDialogProps {
  /** 다이얼로그 열림 여부 */
  open: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 등록 핸들러 */
  onSubmit: (data: {
    text: string;
    category: string;
    isFavorite: boolean;
  }) => void;
  /** 카테고리 목록 */
  categories: { id: string; name: string }[];
  /** 카테고리 로딩 */
  categoriesLoading?: boolean;
  /** 등록 중 로딩 */
  submitLoading?: boolean;
}

// ============================================
// KeywordCreateDialog
// ============================================

export function KeywordCreateDialog({
  open,
  onClose,
  onSubmit,
  categories,
  categoriesLoading,
  submitLoading
}: KeywordCreateDialogProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("general");
  const [isFavorite, setIsFavorite] = useState(false);

  // open 시 폼 리셋
  useEffect(() => {
    if (open) {
      setText("");
      setCategory("general");
      setIsFavorite(false);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({ text: text.trim(), category, isFavorite });
  };

  return (
    <Dialog className="KeywordCreateDialog" open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>키워드 등록</DialogTitle>
      <DialogContent className="KeywordCreate__content">
        <FlexBox className="KeywordCreate__rows" direction="column" gap={2}>
          {/* 키워드 텍스트 */}
          <FlexBox className="KeywordCreate__row" direction="column" gap={0.5}>
            <InputLabel className="KeywordCreate__label">키워드</InputLabel>
            <Input
              className="KeywordCreate__form"
              placeholder="키워드를 입력하세요"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              autoFocus
            />
          </FlexBox>

          {/* 카테고리 선택 */}
          <FlexBox className="KeywordCreate__row" direction="column" gap={0.5}>
            <InputLabel className="KeywordCreate__label">카테고리</InputLabel>
            <Select
              className="KeywordCreate__form"
              value={category}
              onChange={(e) => setCategory(e.target.value as string)}
              disabled={categoriesLoading}
              size="small"
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FlexBox>

          {/* 즐겨찾기 */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
              />
            }
            label="즐겨찾기에 추가"
          />
        </FlexBox>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || submitLoading}
          variant="contained"
        >
          <CreateIcon fontSize="small" />
          등록
        </Button>
        <Button onClick={onClose} disabled={submitLoading}>
          <CloseIcon fontSize="small" />
          취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}
