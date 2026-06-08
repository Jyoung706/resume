// ============================================
// ui/Toast/ToastProvider — 전역 토스트 Context
// ============================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AlertColor } from "../../base/Alert";
import { Toast } from "./Toast";

interface ToastItem {
  id: number;
  message: string;
  severity: AlertColor;
}

interface ToastContextValue {
  showToast: (message: string, severity?: AlertColor) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const SEVERITY_MAP: Record<string, AlertColor> = {
  error: "error",
  success: "success",
  warning: "warning",
  info: "info",
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, severity: AlertColor = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, severity }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // toast:general CustomEvent 리스너 (request.ts의 handleApiError가 발생시킴)
  useEffect(() => {
    const handleToastGeneral = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { title?: string; message?: string; type?: string }
        | undefined;
      if (!detail?.message) return;
      const severity = SEVERITY_MAP[detail.type || ""] || "info";
      showToast(detail.message, severity);
    };

    window.addEventListener("toast:general", handleToastGeneral);
    return () => window.removeEventListener("toast:general", handleToastGeneral);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((t) => (
        <Toast
          key={t.id}
          open
          severity={t.severity}
          message={t.message}
          onClose={() => removeToast(t.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
