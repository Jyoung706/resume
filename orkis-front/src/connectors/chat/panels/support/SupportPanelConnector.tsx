// ============================================
// SupportPanelConnector -- 고객센터 커넥터
// Logic(useSupportPanel) <-> Design(SupportPanel) 접착
// ============================================

import { SupportPanel } from "@/pages/chat/panels/support/SupportPanel";
import { useSupportPanel } from "@/logic/chat/panels/support";

export function SupportPanelConnector() {
  const panel = useSupportPanel();

  return (
    <SupportPanel
      // 연락처
      phone={panel.contactInfo.phone}
      email={panel.contactInfo.email}
      hours={panel.contactInfo.hours}
      // 섹션
      activeSection={panel.activeSection}
      onSectionChange={panel.setActiveSection}
      loading={panel.faqLoading && panel.supportLoading}
      // FAQ
      faqs={panel.faqItems.map((item) => ({
        id: item.id,
        categoryName: item.categoryName,
        question: item.question,
        answer: item.answer,
        isPinned: item.isPinned,
        viewCount: item.viewCount,
      }))}
      faqExpandedId={panel.faqExpandedId}
      onToggleFaq={panel.onToggleFaq}
      // 문의하기
      inquiryForm={panel.formData}
      inquiryFormErrors={panel.formErrors}
      inquiryCategories={panel.supportCategories.map((cat) => ({
        codeId: cat.codeId,
        codeName: cat.codeName,
      }))}
      inquirySubmitting={panel.submitting}
      inquirySubmitError={panel.submitError}
      inquiryFormValid={panel.isFormValid}
      titleMaxLength={panel.titleMaxLength}
      descriptionMaxLength={panel.descriptionMaxLength}
      onInquiryFieldChange={panel.onFormChange}
      onInquirySubmit={panel.onSubmitInquiry}
      // 문의 내역
      tickets={panel.ticketDataList}
      ticketExpandedId={panel.ticketExpandedId}
      ticketsLoading={panel.supportLoading}
      onToggleTicket={panel.onToggleTicket}
      ticketAnswerNodes={panel.ticketAnswerNodes}
    />
  );
}
