import {
  Send,
  CheckCircle,
  FileText,
  PenLine,
  ClipboardCheck,
  ThumbsUp,
  Star,
  RotateCcw,
  Eye,
} from "lucide-react";
import { ESTADO_LABELS } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

// ─── Workflow definition ──────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { estado: "ENVIADA",              icon: Send,           label: "Enviada" },
  { estado: "APROBADA_DIRECTOR",    icon: CheckCircle,    label: "Aprobada por Director" },
  { estado: "EN_TRAMITE_CONTRATOS", icon: FileText,       label: "En Trámite Contratos" },
  { estado: "CREACION_MINUTA",      icon: PenLine,        label: "Creación de Minuta" },
  { estado: "EN_CONTROLES",         icon: ClipboardCheck, label: "Agregar Minuta" },
  { estado: "APROBACION_FINAL",     icon: ThumbsUp,       label: "Aprobación Final" },
  { estado: "COMPLETADA",           icon: Star,           label: "Completada" },
] as const;

const SIDE_STATES = ["DEVUELTA", "EN_REVISION", "BORRADOR"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistorialEntry {
  accion: string;
  fecha: string | Date;
  estado?: string;
}

interface EstadoTimelineProps {
  estadoActual: string;
  historial?: HistorialEntry[];
}

// ─── Helper: find date when a state was reached ───────────────────────────────

function getEstadoDate(
  estado: string,
  historial: HistorialEntry[]
): string | null {
  // Map estado to the accion that produces it
  const accionMap: Record<string, string> = {
    ENVIADA: "ENVIAR",
    APROBADA_DIRECTOR: "APROBAR_DIRECTOR",
    EN_TRAMITE_CONTRATOS: "APROBAR_DIRECTOR",
    EN_REVISION: "REVISAR",
    CREACION_MINUTA: "TRAMITAR_OK",
    EN_CONTROLES: "AVANZAR_CONTRATOS",
    APROBACION_FINAL: "REGISTRAR_ADPRO",
    COMPLETADA: "APROBAR_FINAL",
    DEVUELTA: "DEVOLVER",
  };
  const targetAccion = accionMap[estado];
  if (!targetAccion) return null;
  const entry = historial.find((h) => h.accion === targetAccion);
  return entry ? formatDate(entry.fecha) : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EstadoTimeline({
  estadoActual,
  historial = [],
}: EstadoTimelineProps) {
  const currentIndex = WORKFLOW_STEPS.findIndex(
    (s) => s.estado === estadoActual
  );
  const isSideState = (SIDE_STATES as readonly string[]).includes(estadoActual);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">
        Progreso del flujo
      </h3>

      {/* Side states banner */}
      {isSideState && (
        <div
          className={`
            mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium
            ${estadoActual === "DEVUELTA"
              ? "bg-red-50 border border-red-200 text-red-700"
              : estadoActual === "EN_REVISION"
              ? "bg-yellow-50 border border-yellow-200 text-yellow-700"
              : "bg-gray-50 border border-gray-200 text-gray-600"
            }
          `}
        >
          {estadoActual === "DEVUELTA" && <RotateCcw size={14} />}
          {estadoActual === "EN_REVISION" && <Eye size={14} />}
          <span>
            Estado actual:{" "}
            <strong>{ESTADO_LABELS[estadoActual] ?? estadoActual}</strong>
          </span>
        </div>
      )}

      {/* Main stepper */}
      <div className="relative">
        {/* Connector line */}
        <div
          className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200"
          aria-hidden="true"
        />

        <ol className="relative flex justify-between">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentIndex > index;
            const isCurrent = currentIndex === index && !isSideState;
            const date = getEstadoDate(step.estado, historial);

            return (
              <li
                key={step.estado}
                className="flex flex-col items-center gap-1.5 flex-1"
              >
                {/* Circle */}
                <div
                  className={`
                    relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 shrink-0
                    transition-colors
                    ${isCompleted
                      ? "bg-blue-600 border-blue-600 text-white"
                      : isCurrent
                      ? "bg-white border-blue-600 text-blue-600"
                      : "bg-white border-gray-300 text-gray-400"
                    }
                  `}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <Icon size={16} />
                </div>

                {/* Label */}
                <span
                  className={`
                    text-center text-xs leading-tight max-w-[72px]
                    ${isCurrent
                      ? "font-semibold text-blue-700"
                      : isCompleted
                      ? "font-medium text-gray-700"
                      : "text-gray-400"
                    }
                  `}
                >
                  {step.label}
                </span>

                {/* Date */}
                {date && (
                  <span className="text-[10px] text-gray-400 text-center leading-tight">
                    {date}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
