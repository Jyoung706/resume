/**
 * Toast CustomEvent 발생 헬퍼
 * Store/Hook 등 React 컴포넌트 외부에서 toast 알림을 발행할 때 사용
 */
export type ToastType = "success" | "error" | "info" | "warning";

const TITLE_BY_TYPE: Record<ToastType, string> = {
  success: "성공",
  error: "오류",
  info: "안내",
  warning: "경고",
};

export function showToast(message: string, type: ToastType = "success") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("toast:general", {
        detail: { title: TITLE_BY_TYPE[type], message, type },
      })
    );
  }
}
