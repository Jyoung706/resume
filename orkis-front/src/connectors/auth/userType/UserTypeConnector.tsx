/**
 * UserTypeConnector — Logic ↔ Design 접착 계층
 * useUserType 훅의 상태/액션을 UserTypeSelectionPage props로 매핑
 * 스타일 코드 없음, 비즈니스 로직 없음
 */
import { useNavigate } from "react-router-dom";
import { useUserType } from "@/logic/auth/userType/useUserType";
import { UserTypeSelectionPage } from "@/pages/auth/userType";

export function UserTypeConnector() {
  const navigate = useNavigate();

  const {
    selectPlan,
    close,
    contactModalOpen,
    closeContactModal,
  } = useUserType({
    onSelectPlan: (planId) => {
      // free 플랜은 바로 회원가입으로 (pro/admin은 훅 내부에서 모달 표시로 분기)
      navigate(`/auth/signup?userType=${planId}`);
    },
    onClose: () => navigate("/"),
  });

  return (
    <UserTypeSelectionPage
      onSelectPlan={selectPlan}
      onClose={close}
      contactModalOpen={contactModalOpen}
      onContactModalClose={closeContactModal}
    />
  );
}
