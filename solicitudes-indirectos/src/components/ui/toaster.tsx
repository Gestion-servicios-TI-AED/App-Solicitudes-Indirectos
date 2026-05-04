"use client";

import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Global singleton (allows <Toaster /> as sibling, not wrapper) ────────────

// The context provider is mounted once at the root via Providers.tsx.
// However, since Providers.tsx renders <Toaster /> as a sibling (not wrapping
// children), we expose an imperative API through a module-level ref so that
// useToast() still works from anywhere in the tree via a separate provider.
//
// Architecture:
//   <SessionProvider>
//     {children}          ← app pages that call useToast()
//     <Toaster />         ← renders toasts + exposes ToastContext
//   </SessionProvider>
//
// To bridge the gap, Toaster registers itself in a module-level store that
// ToastProvider (re-exported as a no-op wrapper) and useToast both share.

type AddToastFn = (message: string, type?: ToastType) => void;

let _globalAddToast: AddToastFn | null = null;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);

  // If inside the ToastContext tree use that; otherwise fall back to global ref.
  if (ctx) return ctx;

  return {
    addToast: (message, type = "info") => {
      if (_globalAddToast) {
        _globalAddToast(message, type);
      } else {
        console.warn("[useToast] Toaster is not mounted yet.");
      }
    },
  };
}

// ─── Color / icon maps ────────────────────────────────────────────────────────

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error:   "bg-red-600   text-white",
  info:    "bg-blue-600  text-white",
};

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
};

// ─── Individual toast item ────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 min-w-[280px] max-w-sm w-full
        rounded-lg px-4 py-3 shadow-lg
        transition-all duration-300 ease-in-out
        ${typeStyles[toast.type]}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
    >
      <span className="text-base font-bold shrink-0 mt-0.5">
        {typeIcons[toast.type]}
      </span>
      <p className="text-sm leading-snug flex-1">{toast.message}</p>
      <button
        onClick={handleClose}
        className="shrink-0 ml-1 opacity-70 hover:opacity-100 transition-opacity text-base leading-none"
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
}

// ─── Toaster ──────────────────────────────────────────────────────────────────
// Can be used in two ways:
//
//   1. As a standalone sibling (current Providers.tsx pattern):
//        <SessionProvider>{children}<Toaster /></SessionProvider>
//      Pages call useToast() — it falls back to the global ref.
//
//   2. As a wrapper provider (optional future use):
//        <Toaster>{children}</Toaster>
//      Pages call useToast() — it uses the React context.

export function Toaster({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback<AddToastFn>(
    (message, type = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register in global ref so useToast() works even when Toaster is a sibling
  useEffect(() => {
    _globalAddToast = addToast;
    return () => {
      _globalAddToast = null;
    };
  }, [addToast]);

  const toastList = (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );

  // When used as a provider wrapper, supply context + render children
  if (children !== undefined) {
    return (
      <ToastContext.Provider value={{ addToast }}>
        {children}
        {toastList}
      </ToastContext.Provider>
    );
  }

  // When used as a standalone sibling, just render the toast stack
  return toastList;
}
