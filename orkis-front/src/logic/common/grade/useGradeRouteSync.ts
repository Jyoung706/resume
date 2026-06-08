/**
 * useGradeRouteSync — 라우트 ↔ selectedGrade 양방향 자동 동기화
 *
 * 정책 (selectedGrade 가 SSoT):
 *   - selectedGrade="pro" + isProUser=true  + isChatRoute → /pro 로 자동 이동
 *   - selectedGrade="general" + isProRoute              → /chat 로 자동 이동
 *   - selectedGrade="pro" + isProUser=false             → setGrade("general") 강제 후 /chat
 *   - 그 외 (이미 일치 / grade 무관 라우트) 변경 없음
 *
 * 적용 범위: /chat, /pro prefix 라우트만.
 *   상위에서 본 훅을 호출하는 컴포넌트가 해당 prefix 라우트 element 를 감싸므로,
 *   다른 라우트(/auth 등) 에는 영향 없음.
 *
 * 무한 루프 방지: navigate 는 항상 { replace: true } — history 에 남기지 않음.
 *   exit_to_app 의 setGrade("general") 선행과 함께 ProModeConnector → /chat 흐름에서
 *   재진입 루프가 발생하지 않도록 보장.
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { useGradeStore } from "@/logic/common/grade/gradeStore";
import { isProUserByAuth } from "@/logic/common/grade/gradeUtils";

const PRO_PREFIX = "/pro";
const CHAT_PREFIX = "/chat";

export function useGradeRouteSync(): void {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const selectedGrade = useGradeStore((s) => s.selectedGrade);
  const setGrade = useGradeStore((s) => s.setGrade);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const isProRoute = pathname === PRO_PREFIX || pathname.startsWith(`${PRO_PREFIX}/`);
    const isChatRoute = pathname === CHAT_PREFIX || pathname.startsWith(`${CHAT_PREFIX}/`);
    if (!isProRoute && !isChatRoute) return;

    const proAllowed = isProUserByAuth(user);

    if (selectedGrade === "pro" && !proAllowed) {
      setGrade("general");
      if (isProRoute) navigate("/chat", { replace: true });
      return;
    }

    if (selectedGrade === "pro" && isChatRoute) {
      navigate("/pro", { replace: true });
      return;
    }

    if (selectedGrade === "general" && isProRoute) {
      navigate("/chat", { replace: true });
    }
  }, [pathname, selectedGrade, user, navigate, setGrade]);
}
