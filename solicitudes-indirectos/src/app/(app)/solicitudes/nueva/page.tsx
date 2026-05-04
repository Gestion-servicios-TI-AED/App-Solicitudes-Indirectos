"use client";

import { useRouter } from "next/navigation";
import {
  FileText,
  Briefcase,
  Clock,
  PlusCircle,
  Receipt,
  FileCheck,
  RefreshCw,
  CalendarClock,
  Award,
} from "lucide-react";
import { TIPO_SOLICITUD_LABELS } from "@/lib/utils";

// ─── Tipo config ──────────────────────────────────────────────────────────────

interface TipoCard {
  tipo: string;
  label: string;
  description: string;
  icon: React.ElementType;
  active: boolean;
}

const TIPOS: TipoCard[] = [
  {
    tipo: "CONTRATO",
    label: TIPO_SOLICITUD_LABELS.CONTRATO,
    description: "Solicitud de nuevo contrato de obra, diseño o servicios.",
    icon: Briefcase,
    active: true,
  },
  {
    tipo: "ORDEN_SERVICIO",
    label: TIPO_SOLICITUD_LABELS.ORDEN_SERVICIO,
    description: "Orden de servicio para proveedores o contratistas.",
    icon: FileText,
    active: false,
  },
  {
    tipo: "OTROSI_TIEMPO",
    label: TIPO_SOLICITUD_LABELS.OTROSI_TIEMPO,
    description: "Modificación del plazo de un contrato existente.",
    icon: Clock,
    active: false,
  },
  {
    tipo: "OTROSI_TIEMPO_CANTIDAD",
    label: TIPO_SOLICITUD_LABELS.OTROSI_TIEMPO_CANTIDAD,
    description: "Modificación de tiempo, cantidad y/o valor del contrato.",
    icon: PlusCircle,
    active: false,
  },
  {
    tipo: "TRAMITE_CUENTA",
    label: TIPO_SOLICITUD_LABELS.TRAMITE_CUENTA,
    description: "Trámite de cuenta individual para un contratista.",
    icon: Receipt,
    active: false,
  },
  {
    tipo: "TRAMITE_FACTURAS",
    label: TIPO_SOLICITUD_LABELS.TRAMITE_FACTURAS,
    description: "Trámite de facturas de proveedor.",
    icon: FileCheck,
    active: false,
  },
  {
    tipo: "TRAMITE_CUENTAS_RECURRENTES",
    label: TIPO_SOLICITUD_LABELS.TRAMITE_CUENTAS_RECURRENTES,
    description: "Cuentas de cobro con periodicidad fija.",
    icon: RefreshCw,
    active: false,
  },
  {
    tipo: "TRAMITE_CUENTAS_OCASIONALES",
    label: TIPO_SOLICITUD_LABELS.TRAMITE_CUENTAS_OCASIONALES,
    description: "Cuentas de cobro esporádicas u ocasionales.",
    icon: CalendarClock,
    active: false,
  },
  {
    tipo: "TRAMITE_BONIFICACIONES_COMISIONES",
    label: TIPO_SOLICITUD_LABELS.TRAMITE_BONIFICACIONES_COMISIONES,
    description: "Pagos de bonificaciones y comisiones.",
    icon: Award,
    active: false,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NuevaSolicitudPage() {
  const router = useRouter();

  function handleSelect(tipo: TipoCard) {
    if (!tipo.active) return;
    router.push(`/solicitudes/nueva/${tipo.tipo}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Nueva Solicitud — Selecciona el tipo
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Elige el tipo de solicitud que deseas crear para continuar con el formulario.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TIPOS.map((tipo) => {
          const Icon = tipo.icon;
          return (
            <div
              key={tipo.tipo}
              role="button"
              tabIndex={tipo.active ? 0 : -1}
              onClick={() => handleSelect(tipo)}
              onKeyDown={(e) => {
                if (tipo.active && (e.key === "Enter" || e.key === " ")) {
                  handleSelect(tipo);
                }
              }}
              className={`
                relative bg-white border rounded-xl p-5 transition-all
                ${tipo.active
                  ? "border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer"
                  : "border-gray-200 cursor-default opacity-75"
                }
              `}
            >
              {/* Coming soon overlay */}
              {!tipo.active && (
                <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center z-10">
                  <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1 rounded-full border border-gray-200">
                    Próximamente
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                    ${tipo.active
                      ? "bg-blue-50 text-blue-600"
                      : "bg-gray-100 text-gray-400"
                    }
                  `}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold leading-snug
                      ${tipo.active ? "text-gray-900" : "text-gray-500"}`}
                  >
                    {tipo.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    {tipo.description}
                  </p>
                </div>
              </div>

              {tipo.active && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs font-medium text-blue-600">
                    Crear solicitud →
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
