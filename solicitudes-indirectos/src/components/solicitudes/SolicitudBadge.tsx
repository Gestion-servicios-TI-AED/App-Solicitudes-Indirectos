import { ESTADO_LABELS, ESTADO_COLORS } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SolicitudBadgeProps {
  estado: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SolicitudBadge({ estado, className = "" }: SolicitudBadgeProps) {
  const label = ESTADO_LABELS[estado] ?? estado;
  const colors = ESTADO_COLORS[estado] ?? "bg-gray-100 text-gray-700";

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full px-2.5 py-0.5
        text-xs font-medium leading-tight whitespace-nowrap
        ${colors}
        ${className}
      `}
    >
      {label}
    </span>
  );
}
