// ============================================
// SupportPanel -- 고객센터 (FAQ + 문의하기 + 문의 내역)
// Design Layer: props 기반 (로직 없음)
// ============================================
// 섹션 탭 + FAQ/문의하기/문의 내역 + 연락처 카드
// ============================================

import type { ReactNode } from "react";
import {
  FlexBox,
  Paper,
  Icon,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
} from "@/components";
import { SupportFAQ, type FaqItemData } from "./SupportFAQ";
import {
  SupportInquiry,
  type InquiryFormProps,
  type InquiryFormErrorsProps,
  type InquiryCategoryData,
} from "./SupportInquiry";
import { SupportTicketList } from "./SupportTicketList";
import type { TicketItemData } from "./SupportTicketItem";
import "../panels.scss";
import "./SupportPanel.scss";

// ============================================
// Props
// ============================================

export interface SupportPanelProps {
  // --- 기존 Props (하위 호환) ---
  /** 전화번호 */
  phone?: string;
  /** 이메일 */
  email?: string;
  /** 운영시간 */
  hours?: string;
  /** 커스텀 콘텐츠 슬롯 */
  supportContent?: ReactNode;

  // --- 신규 Props ---
  /** 현재 활성 섹션 */
  activeSection?: "faq" | "inquiry" | "tickets";
  /** 전체 로딩 */
  loading?: boolean;

  // FAQ
  /** FAQ 항목 목록 */
  faqs?: FaqItemData[];
  /** FAQ 펼쳐진 항목 ID */
  faqExpandedId?: string | null;
  /** FAQ 토글 */
  onToggleFaq?: (id: string) => void;

  // 문의하기
  /** 문의 폼 데이터 */
  inquiryForm?: InquiryFormProps;
  /** 문의 폼 에러 */
  inquiryFormErrors?: InquiryFormErrorsProps;
  /** 카테고리 목록 */
  inquiryCategories?: InquiryCategoryData[];
  /** 제출 중 */
  inquirySubmitting?: boolean;
  /** 제출 에러 */
  inquirySubmitError?: string | null;
  /** 폼 유효 여부 */
  inquiryFormValid?: boolean;
  /** 제목 최대 길이 */
  titleMaxLength?: number;
  /** 내용 최대 길이 */
  descriptionMaxLength?: number;
  /** 필드 변경 */
  onInquiryFieldChange?: (field: "title" | "categoryCode" | "description", value: string) => void;
  /** 제출 */
  onInquirySubmit?: () => void;

  // 문의 내역
  /** 티켓 목록 */
  tickets?: TicketItemData[];
  /** 티켓 펼쳐진 항목 ID */
  ticketExpandedId?: string | null;
  /** 티켓 로딩 */
  ticketsLoading?: boolean;
  /** 티켓 토글 */
  onToggleTicket?: (id: string) => void;
  /** 새니타이징된 답변 ReactNode 매핑 */
  ticketAnswerNodes?: Record<string, ReactNode>;

  /** 섹션 변경 핸들러 */
  onSectionChange?: (section: "faq" | "inquiry" | "tickets") => void;
}

// ============================================
// 탭 매핑
// ============================================

const SECTION_TAB_MAP = {
  faq: 0,
  inquiry: 1,
  tickets: 2,
} as const;

const TAB_SECTION_MAP = ["faq", "inquiry", "tickets"] as const;

// ============================================
// SupportPanel
// ============================================

export function SupportPanel({
  // 기존 Props
  phone,
  email,
  hours,
  supportContent,
  // 신규 Props
  activeSection = "faq",
  loading,
  faqs = [],
  faqExpandedId = null,
  onToggleFaq,
  inquiryForm,
  inquiryFormErrors,
  inquiryCategories = [],
  inquirySubmitting,
  inquirySubmitError,
  inquiryFormValid,
  titleMaxLength,
  descriptionMaxLength,
  onInquiryFieldChange,
  onInquirySubmit,
  tickets = [],
  ticketExpandedId = null,
  ticketsLoading,
  onToggleTicket,
  ticketAnswerNodes,
  onSectionChange,
}: SupportPanelProps) {
  const hasContactInfo = phone || email || hours;
  const hasFullUI = onSectionChange && onToggleFaq;

  // 전체 로딩
  if (loading) {
    return (
      <FlexBox
        direction="column"
        className="ChatPage__support-panel Panel__container"
      >
        <FlexBox className="Panel__loading">
          <CircularProgress size="medium" />
        </FlexBox>
      </FlexBox>
    );
  }

  return (
    <FlexBox
      direction="column"
      className="ChatPage__support-panel Panel__container"
    >
      {hasFullUI ? (
        <>
          {/* 섹션 탭 */}
          <Tabs
            value={SECTION_TAB_MAP[activeSection]}
            onChange={(_, newValue: number) => {
              onSectionChange(TAB_SECTION_MAP[newValue]);
            }}
            className="SupportPanel__tabs"
            variant="fullWidth"
          >
            <Tab label="FAQ" className="SupportPanel__tab" />
            <Tab label="문의하기" className="SupportPanel__tab" />
            <Tab label="내 문의 내역" className="SupportPanel__tab" />
          </Tabs>

          {/* 섹션 콘텐츠 */}
          <FlexBox direction="column" className="SupportPanel__content">
            {activeSection === "faq" && (
              <SupportFAQ
                faqs={faqs}
                expandedId={faqExpandedId}
                onToggle={onToggleFaq}
              />
            )}

            {activeSection === "inquiry" && inquiryForm && onInquiryFieldChange && onInquirySubmit && (
              <SupportInquiry
                form={inquiryForm}
                formErrors={inquiryFormErrors}
                categories={inquiryCategories}
                submitting={inquirySubmitting}
                submitError={inquirySubmitError}
                isFormValid={inquiryFormValid}
                titleMaxLength={titleMaxLength}
                descriptionMaxLength={descriptionMaxLength}
                onFieldChange={onInquiryFieldChange}
                onSubmit={onInquirySubmit}
              />
            )}

            {activeSection === "tickets" && onToggleTicket && (
              <SupportTicketList
                tickets={tickets}
                expandedId={ticketExpandedId}
                loading={ticketsLoading}
                onToggle={onToggleTicket}
                answerNodes={ticketAnswerNodes}
              />
            )}
          </FlexBox>
        </>
      ) : (
        // 하위 호환: 커스텀 콘텐츠 또는 placeholder
        supportContent ?? (
          <FlexBox className="Panel__placeholder">
            <Typography className="Panel__placeholder-title">고객센터</Typography>
            <Typography className="Panel__placeholder-text">준비 중</Typography>
          </FlexBox>
        )
      )}

      {/* 빠른 연락처 카드 */}
      {hasContactInfo && (
        <Paper variant="outlined" className="SupportPanel__contact-card">
          <Typography className="SupportPanel__contact-title">
            빠른 연락처
          </Typography>

          {phone && (
            <FlexBox align="center" className="SupportPanel__contact-row">
              {/* <PhoneIcon className="SupportPanel__contact-icon" /> */}
              <Icon size="small" className="SupportPanel__contact-icon">phone</Icon>
              <Typography className="SupportPanel__contact-text">
                {phone}
              </Typography>
            </FlexBox>
          )}

          {email && (
            <FlexBox align="center" className="SupportPanel__contact-row">
              {/* <EmailIcon className="SupportPanel__contact-icon" /> */}
              <Icon size="small" className="SupportPanel__contact-icon">email</Icon>
              <Typography className="SupportPanel__contact-text">
                {email}
              </Typography>
            </FlexBox>
          )}

          {hours && (
            <FlexBox align="center" className="SupportPanel__contact-row">
              {/* <AccessTimeIcon className="SupportPanel__contact-icon" /> */}
              <Icon size="small" className="SupportPanel__contact-icon">schedule</Icon>
              <Typography className="SupportPanel__contact-text">
                {hours}
              </Typography>
            </FlexBox>
          )}
        </Paper>
      )}
    </FlexBox>
  );
}
