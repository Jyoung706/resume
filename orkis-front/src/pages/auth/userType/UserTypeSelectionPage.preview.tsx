/**
 * UserTypeSelectionPage 디자인 미리보기 래퍼
 * /user-type-selection 경로에서 기능 없이 디자인만 확인할 때 사용
 */
import { useState } from "react";
import { UserTypeSelectionPage } from "./UserTypeSelectionPage";

export function UserTypeSelectionPagePreview() {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <UserTypeSelectionPage
      onSelectPlan={(planId) => {
        if (planId === "pro" || planId === "admin") {
          setContactModalOpen(true);
          return;
        }
        alert(`${planId} 선택 (디자인 미리보기)`);
      }}
      onClose={() => alert("닫기 (디자인 미리보기)")}
      contactModalOpen={contactModalOpen}
      onContactModalClose={() => setContactModalOpen(false)}
    />
  );
}
