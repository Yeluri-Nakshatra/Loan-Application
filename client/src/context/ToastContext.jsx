import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = "info", duration = 4000) => {
      // Prevent duplicate stacked messages
      setToasts((prev) => {
        if (prev.some((t) => t.message === message)) {
          return prev;
        }
        const id = Date.now() + Math.random().toString(36).substring(2, 7);
        if (duration > 0) {
          setTimeout(() => {
            removeToast(id);
          }, duration);
        }
        return [...prev, { id, message, type }];
      });
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg, duration) => addToast(msg, "success", duration),
      error: (msg, duration) => addToast(msg, "error", duration),
      info: (msg, duration) => addToast(msg, "info", duration),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-5 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-animate pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-xl shadow-xl border transition-all ${
              t.type === "success"
                ? "bg-white border-emerald-200 border-l-4 border-l-emerald-600 text-slate-900 shadow-slate-900/10"
                : t.type === "error"
                ? "bg-white border-red-200 border-l-4 border-l-red-600 text-slate-900 shadow-slate-900/10"
                : "bg-white border-blue-200 border-l-4 border-l-blue-600 text-slate-900 shadow-slate-900/10"
            }`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
              {t.type === "error" && (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              {t.type === "info" && <Info className="w-5 h-5 text-blue-600" />}
            </div>

            {/* Content */}
            <div className="flex-1 text-xs sm:text-sm font-medium text-slate-800 leading-snug">
              {t.message}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
