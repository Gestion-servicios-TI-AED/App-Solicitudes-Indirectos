"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalSize = "sm" | "md" | "lg" | "xl";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  // Close on ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll while open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          relative z-10 w-full ${sizeStyles[size]}
          bg-white rounded-xl shadow-2xl
          flex flex-col max-h-[90vh]
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* Header */}
        {(title !== undefined) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2
              id="modal-title"
              className="text-base font-semibold text-gray-900 leading-tight"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
