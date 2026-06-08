/**
 * 사용 형태 선택 로직 훅 — JSX/스타일 코드 없음
 * plan 선택 시 sessionStorage 저장 + 네비게이션 콜백, pro/admin은 영업팀 문의 모달로 분기
 */
import { useRef, useState } from "react";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("useUserType");

// --- 타입 ---

interface UseUserTypeOptions {
  onSelectPlan?: (planId: string) => void;
  onClose?: () => void;
}

interface UseUserTypeReturn {
  selectPlan: (planId: string) => void;
  close: () => void;
  contactModalOpen: boolean;
  closeContactModal: () => void;
}

const CONTACT_REQUIRED_PLANS = new Set(["pro", "admin"]);

// --- 훅 ---

/**
 * 요금제 선택 상태를 관리하는 훅.
 * free는 sessionStorage 저장 후 onSelectPlan 콜백, pro/admin은 영업팀 문의 모달을 표시한다.
 * @param options - plan 선택/닫기 시 호출할 콜백
 */
export function useUserType(options?: UseUserTypeOptions): UseUserTypeReturn {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // 유형 선택 페이지 진입 시 이전 선택값 초기화 (잔류 데이터 방지)
  const initialized = useRef(false);
  if (!initialized.current) {
    sessionStorage.removeItem("selectedUserType");
    initialized.current = true;
  }

  /**
   * 요금제 선택 핸들러.
   * pro/admin은 영업팀 문의 모달을 표시하고, free는 sessionStorage에 저장 후 onSelectPlan 콜백을 호출한다.
   * @param planId - 선택된 요금제 ID (예: "free", "pro", "admin")
   */
  const selectPlan = (planId: string) => {
    logger.info(`Plan selected: ${planId}`);

    if (CONTACT_REQUIRED_PLANS.has(planId)) {
      setContactModalOpen(true);
      return;
    }

    // sessionStorage에 선택 정보 저장 (SignupConnector에서 읽음)
    sessionStorage.setItem("selectedUserType", planId);

    options?.onSelectPlan?.(planId);
  };

  const closeContactModal = () => {
    setContactModalOpen(false);
  };

  /**
   * 요금제 선택 화면 닫기 핸들러. onClose 콜백을 호출한다.
   */
  const close = () => {
    options?.onClose?.();
  };

  return {
    selectPlan,
    close,
    contactModalOpen,
    closeContactModal,
  };
}
