// ============================================
// SupportInquiry -- 문의 작성 폼
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  FlexBox,
  Typography,
  Input,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from "@/components";
import "../panels.scss";

// ============================================
// Types
// ============================================

export interface InquiryFormProps {
  title: string;
  categoryCode: string;
  description: string;
}

export interface InquiryFormErrorsProps {
  title?: string;
  categoryCode?: string;
  description?: string;
}

export interface InquiryCategoryData {
  codeId: string;
  codeName: string;
}

// ============================================
// Props
// ============================================

export interface SupportInquiryProps {
  /** 폼 데이터 */
  form: InquiryFormProps;
  /** 폼 에러 */
  formErrors?: InquiryFormErrorsProps;
  /** 카테고리 목록 */
  categories: InquiryCategoryData[];
  /** 제출 중 상태 */
  submitting?: boolean;
  /** 제출 에러 메시지 */
  submitError?: string | null;
  /** 폼 유효 여부 (제출 버튼 활성화) */
  isFormValid?: boolean;
  /** 제목 최대 길이 */
  titleMaxLength?: number;
  /** 내용 최대 길이 */
  descriptionMaxLength?: number;
  /** 필드 변경 핸들러 */
  onFieldChange: (field: "title" | "categoryCode" | "description", value: string) => void;
  /** 제출 핸들러 */
  onSubmit: () => void;
}

// ============================================
// SupportInquiry
// ============================================

export function SupportInquiry({
  form,
  formErrors,
  categories,
  submitting = false,
  submitError,
  isFormValid = false,
  titleMaxLength = 100,
  descriptionMaxLength = 1000,
  onFieldChange,
  onSubmit,
}: SupportInquiryProps) {
  return (
    <FlexBox direction="column" className="SupportInquiry">
      {/* 제출 에러 */}
      {submitError && (
        <Alert severity="error" className="SupportInquiry__error">
          {submitError}
        </Alert>
      )}

      {/* 제목 */}
      <FlexBox direction="column" className="SupportInquiry__field">
        <FlexBox justify="space-between" align="center" className="SupportInquiry__label-row">
          <Typography className="SupportInquiry__label">
            제목 <Typography component="span" className="SupportInquiry__required">*</Typography>
          </Typography>
          <Typography className="SupportInquiry__char-count">
            {form.title.length}/{titleMaxLength}
          </Typography>
        </FlexBox>
        <Input
          className="SupportInquiry__input"
          placeholder="문의 제목을 입력해주세요"
          value={form.title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          inputProps={{ maxLength: titleMaxLength }}
          error={!!formErrors?.title}
          disabled={submitting}
        />
        {formErrors?.title && (
          <Typography className="SupportInquiry__field-error">
            {formErrors.title}
          </Typography>
        )}
      </FlexBox>

      {/* 카테고리 */}
      <FlexBox direction="column" className="SupportInquiry__field">
        <Typography className="SupportInquiry__label">
          카테고리 <Typography component="span" className="SupportInquiry__required">*</Typography>
        </Typography>
        <FlexBox wrap="wrap" className="SupportInquiry__chips">
          {categories.map((cat) => (
            <Chip
              key={cat.codeId}
              label={cat.codeName}
              variant={form.categoryCode === cat.codeId ? "filled" : "outlined"}
              size="xsmall"
              color={form.categoryCode === cat.codeId ? "primary" : "default"}
              onClick={() => onFieldChange("categoryCode", cat.codeId)}
              className="SupportInquiry__chip"
              disabled={submitting}
            />
          ))}
        </FlexBox>
        {formErrors?.categoryCode && (
          <Typography className="SupportInquiry__field-error">
            {formErrors.categoryCode}
          </Typography>
        )}
      </FlexBox>

      {/* 내용 */}
      <FlexBox direction="column" className="SupportInquiry__field">
        <FlexBox justify="space-between" align="center" className="SupportInquiry__label-row">
          <Typography className="SupportInquiry__label">
            내용 <Typography component="span" className="SupportInquiry__required">*</Typography>
          </Typography>
          <Typography className="SupportInquiry__char-count">
            {form.description.length}/{descriptionMaxLength}
          </Typography>
        </FlexBox>
        <Input
          className="SupportInquiry__textarea"
          placeholder="문의 내용을 입력해주세요"
          value={form.description}
          onChange={(e) => onFieldChange("description", e.target.value)}
          multiline
          rows={5}
          inputProps={{ maxLength: descriptionMaxLength }}
          error={!!formErrors?.description}
          disabled={submitting}
        />
        {formErrors?.description && (
          <Typography className="SupportInquiry__field-error">
            {formErrors.description}
          </Typography>
        )}
      </FlexBox>

      {/* 제출 버튼 */}
      <Button
        className="SupportInquiry__submit-btn"
        variant="contained"
        color="primary"
        onClick={onSubmit}
        disabled={!isFormValid || submitting}
      >
        {submitting ? (
          <FlexBox align="center" className="SupportInquiry__submit-loading">
            <CircularProgress size="xsmall" />
            <Typography>등록 중...</Typography>
          </FlexBox>
        ) : (
          "문의 등록"
        )}
      </Button>
    </FlexBox>
  );
}
