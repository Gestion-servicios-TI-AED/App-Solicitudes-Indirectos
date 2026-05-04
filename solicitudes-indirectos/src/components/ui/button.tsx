import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "@/components/ui/spinner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white border-transparent hover:bg-blue-700 focus-visible:ring-blue-500 disabled:bg-blue-300",
  secondary:
    "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400 disabled:bg-gray-50 disabled:text-gray-400",
  danger:
    "bg-red-600 text-white border-transparent hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300",
  ghost:
    "bg-transparent text-gray-600 border-transparent hover:bg-gray-100 focus-visible:ring-gray-400 disabled:text-gray-300",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8  px-3   text-xs  gap-1.5 rounded",
  md: "h-9  px-4   text-sm  gap-2   rounded-md",
  lg: "h-11 px-5   text-base gap-2  rounded-md",
};

const spinnerSizes: Record<ButtonSize, "sm" | "sm"> = {
  sm: "sm",
  md: "sm",
  lg: "sm",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium border
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
          disabled:cursor-not-allowed disabled:opacity-60
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <Spinner
            size={spinnerSizes[size]}
            className={
              variant === "primary" || variant === "danger"
                ? "text-white"
                : "text-gray-500"
            }
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
