import { type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100  text-gray-700  border-gray-200",
  success: "bg-green-100 text-green-700 border-green-200",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  error:   "bg-red-100   text-red-700   border-red-200",
  info:    "bg-blue-100  text-blue-700  border-blue-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full border px-2.5 py-0.5
        text-xs font-medium leading-tight whitespace-nowrap
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
