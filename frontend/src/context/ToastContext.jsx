import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return idCounter;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = nextId();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, "success", duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, "error", duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, "warning", duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const typeStyles = {
  success: "bg-success-container text-on-success-container border-success",
  error: "bg-error-container text-on-error-container border-error",
  warning: "bg-warning-container text-on-warning-container border-warning",
  info: "bg-surface-container-high text-on-surface border-outline-variant",
};

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center gap-2 pt-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex min-w-[16rem] max-w-md items-center gap-2 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all ${typeStyles[t.type] || typeStyles.info}`}
          role="alert"
        >
          <span className="text-sm font-medium">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="ml-auto rounded p-1 opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
