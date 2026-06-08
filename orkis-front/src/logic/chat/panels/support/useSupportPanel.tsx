/**
 * useSupportPanel -- 고객센터 패널 비즈니스 로직 훅
 *
 * 책임:
 * - 3개 섹션 전환 (FAQ / 문의하기 / 문의 내역)
 * - FAQ: 아코디언 단일 펼침, 조회수 증가
 * - 문의하기: 폼 상태, 입력 검증, 제출 + 중복 방지
 * - 문의 내역: 아코디언 단일 펼침, API→Design 매핑
 * - HTML 답변 새니타이징 (DOMPurify + html-react-parser)
 * - 연락처 정보 (기존 하드코딩 값 유지)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import DOMPurify from "dompurify";
import parse, {
  domToReact,
  type HTMLReactParserOptions,
  Element,
} from "html-react-parser";
import { useFaqStore } from "@/logic/common/faq";
import {
  useSupportStore,
  type SupportTicket,
  type SupportTicketData,
} from "@/logic/common/support";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useSupportPanel");

// --- 섹션 타입 ---

export type SupportSection = "faq" | "inquiry" | "tickets";

// --- 폼 타입 ---

export interface InquiryFormData {
  title: string;
  categoryCode: string;
  description: string;
}

export interface InquiryFormErrors {
  title?: string;
  categoryCode?: string;
  description?: string;
}

// --- 상수 ---

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;

const CONTACT_INFO = {
  phone: "02-6952-8164",
  email: "orkis-admin@bi-cns.com",
  hours: "평일 09:00 - 18:00",
};

const initialFormData: InquiryFormData = {
  title: "",
  categoryCode: "",
  description: "",
};

// --- HTML -> ReactNode 변환 (Notice 패턴 재사용) ---

const parserOptions: HTMLReactParserOptions = {
  replace(domNode) {
    if (domNode instanceof Element && domNode.name === "a") {
      const { href, ...rest } = domNode.attribs;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
          {domToReact(
            domNode.children as Parameters<typeof domToReact>[0],
            parserOptions
          )}
        </a>
      );
    }
  },
};

function toSafeReactNode(html: string): ReactNode {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "a", "ul", "ol", "li", "span"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });
  return parse(sanitized, parserOptions);
}

// --- 날짜 포맷 (Notice 패턴 재사용) ---

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  } catch {
    return isoString;
  }
}

// --- API -> Design 매핑 ---

function toSupportTicketData(ticket: SupportTicket): SupportTicketData {
  return {
    id: ticket.id,
    title: ticket.title,
    categoryName: ticket.categoryName || ticket.categoryCode,
    statusName: ticket.statusName || ticket.statusCode,
    statusCode: ticket.statusCode,
    createdAt: formatDate(ticket.createdAt),
    hasAnswer: ticket.hasAnswer,
    description: ticket.description,
    answer: ticket.answer,
    answeredAt: ticket.answeredAt ? formatDate(ticket.answeredAt) : undefined,
  };
}

// --- 폼 검증 ---

function validateForm(data: InquiryFormData): InquiryFormErrors {
  const errors: InquiryFormErrors = {};

  const trimmedTitle = data.title.trim();
  if (!trimmedTitle) {
    errors.title = "제목을 입력해주세요.";
  } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    errors.title = `제목은 ${TITLE_MAX_LENGTH}자 이내로 입력해주세요.`;
  }

  if (!data.categoryCode) {
    errors.categoryCode = "카테고리를 선택해주세요.";
  }

  const trimmedDesc = data.description.trim();
  if (!trimmedDesc) {
    errors.description = "내용을 입력해주세요.";
  } else if (trimmedDesc.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `내용은 ${DESCRIPTION_MAX_LENGTH}자 이내로 입력해주세요.`;
  }

  return errors;
}

// --- Hook ---

export function useSupportPanel() {
  // 스토어
  const {
    categories: faqCategories,
    items: faqItems,
    isLoading: faqLoading,
    loadFaqList,
    incrementViewCount,
  } = useFaqStore();

  const {
    tickets,
    categories: supportCategories,
    isLoading: supportLoading,
    error: supportError,
    loadTickets,
    createTicket,
    loadCategories,
  } = useSupportStore();

  // 섹션
  const [activeSection, setActiveSection] = useState<SupportSection>("faq");

  // FAQ 아코디언
  const [faqExpandedId, setFaqExpandedId] = useState<string | null>(null);

  // 문의 폼
  const [formData, setFormData] = useState<InquiryFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<InquiryFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 문의 내역 아코디언
  const [ticketExpandedId, setTicketExpandedId] = useState<string | null>(null);

  // --- 초기 로드 ---

  useEffect(() => {
    loadFaqList();
    loadCategories();
  }, [loadFaqList, loadCategories]);

  // 섹션 "tickets" 진입 시 티켓 목록 로드
  useEffect(() => {
    if (activeSection === "tickets") {
      loadTickets();
    }
  }, [activeSection, loadTickets]);

  // --- FAQ 핸들러 ---

  const onToggleFaq = useCallback(
    (id: string) => {
      setFaqExpandedId((prev) => {
        const next = prev === id ? null : id;
        if (next) {
          incrementViewCount(next);
        }
        return next;
      });
    },
    [incrementViewCount]
  );

  // --- 문의 폼 핸들러 ---

  const onFormChange = useCallback(
    (field: keyof InquiryFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // 해당 필드 에러 클리어
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
      setSubmitError(null);
    },
    []
  );

  const onSubmitInquiry = useCallback(async () => {
    if (submitting) return;

    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await createTicket({
        title: formData.title.trim(),
        categoryCode: formData.categoryCode,
        description: formData.description.trim(),
      });

      // 성공: 폼 초기화 + 문의 내역 섹션으로 전환
      setFormData(initialFormData);
      setFormErrors({});
      setActiveSection("tickets");
    } catch (error) {
      logger.error("문의 등록 실패:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "문의 등록에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setSubmitting(false);
    }
  }, [formData, submitting, createTicket]);

  // --- 문의 내역 핸들러 ---

  const onToggleTicket = useCallback((id: string) => {
    setTicketExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // --- Design 매핑 ---

  const ticketDataList: SupportTicketData[] = useMemo(
    () => tickets.map(toSupportTicketData),
    [tickets]
  );

  // 답변 HTML 새니타이징 매핑
  const ticketAnswerNodes = useMemo(() => {
    const map: Record<string, ReactNode> = {};
    for (const ticket of tickets) {
      if (ticket.answer) {
        map[ticket.id] = toSafeReactNode(ticket.answer);
      }
    }
    return map;
  }, [tickets]);

  // 폼 유효성 (제출 버튼 표시 조건)
  const isFormValid = useMemo(() => {
    return (
      formData.title.trim().length > 0 &&
      formData.categoryCode.length > 0 &&
      formData.description.trim().length > 0
    );
  }, [formData]);

  return {
    // 섹션
    activeSection,
    setActiveSection,

    // FAQ
    faqCategories,
    faqItems,
    faqLoading,
    faqExpandedId,
    onToggleFaq,

    // 문의하기
    supportCategories,
    formData,
    formErrors,
    submitting,
    submitError,
    isFormValid,
    onFormChange,
    onSubmitInquiry,

    // 문의 내역
    ticketDataList,
    ticketAnswerNodes,
    ticketExpandedId,
    supportLoading,
    supportError,
    onToggleTicket,

    // 연락처
    contactInfo: CONTACT_INFO,

    // 상수
    titleMaxLength: TITLE_MAX_LENGTH,
    descriptionMaxLength: DESCRIPTION_MAX_LENGTH,
  };
}
