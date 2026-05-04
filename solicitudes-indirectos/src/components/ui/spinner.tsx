// ─── Types ────────────────────────────────────────────────────────────────────

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeStyles: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`
        inline-block rounded-full border-current border-t-transparent
        animate-spin
        ${sizeStyles[size]}
        ${className}
      `}
    />
  );
}
