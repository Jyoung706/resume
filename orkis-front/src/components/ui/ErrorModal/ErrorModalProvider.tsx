// ============================================
// ui/ErrorModal/ErrorModalProvider
// `modal:error` CustomEvent를 수신하여 ErrorModal을 표시한다.
// (request.ts 및 globalErrorHandler가 이 이벤트를 발행)
// ============================================

import { useEffect, useState, type ReactNode } from "react";
import { ErrorModal, type ErrorModalType } from "./ErrorModal";

interface ModalState {
  title?: string;
  message: string;
  type: ErrorModalType;
}

// --- 중복 표시 방지 (3초 스로틀) ---
const recentKeys = new Map<string, number>();
const THROTTLE_MS = 3000;

function shouldShow(key: string): boolean {
  const now = Date.now();
  const last = recentKeys.get(key) ?? 0;
  if (now - last < THROTTLE_MS) return false;
  recentKeys.set(key, now);
  // 오래된 항목 정리
  for (const [k, t] of recentKeys) {
    if (now - t > 10_000) recentKeys.delete(k);
  }
  return true;
}

export function ErrorModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { title?: string; message?: string; type?: ErrorModalType }
        | undefined;
      if (!detail?.message) return;

      const key = `${detail.title ?? ""}:${detail.message}`;
      if (!shouldShow(key)) return;

      setModalState({
        title: detail.title,
        message: detail.message,
        type: detail.type ?? "error",
      });
    };

    window.addEventListener("modal:error", handler);
    return () => window.removeEventListener("modal:error", handler);
  }, []);

  return (
    <>
      {children}
      {modalState && (
        <ErrorModal
          open
          type={modalState.type}
          title={modalState.title}
          message={modalState.message}
          onClose={() => setModalState(null)}
          onConfirm={() => setModalState(null)}
        />
      )}
    </>
  );
}
