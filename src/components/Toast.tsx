"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  action?: ToastAction;
  duration?: number;
}

interface ToastMessage {
  id: string;
  text: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: ToastType = "info", opts?: ToastOptions) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type, action: opts?.action }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, opts?.duration ?? 3000);
  }, []);

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "#22c55e";
      case "error":
        return "#ef4444";
      default:
        return "var(--color-dark)";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 z-50 space-y-2 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-4 py-3 rounded-xl text-white text-sm font-medium animate-in slide-in-from-bottom-2 fade-in flex items-center justify-between gap-3"
            style={{ background: getBgColor(toast.type) }}
          >
            <span>{toast.text}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="shrink-0 font-bold underline underline-offset-2"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
