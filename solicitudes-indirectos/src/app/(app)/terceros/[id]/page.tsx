"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SolicitudBadge } from "@/components/solicitudes/SolicitudBadge";
import { useToast } from "@/components/ui/toaster";
import { useSession } from "next-auth/react";
import { TIPO_SOLICITUD_LABELS, formatDate, formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  correoFirma: string;
  direccionRepresentante: string;
  telefonoRepresentante: string;
  nombreContacto?: string | null;
  telefonoContacto?: string | null;
  correoContacto?: string | null;
  tipoContrato: string;
  dd_identificacionContraparte: boolean;
  dd_consultaListasRestrictivas: boolean;
  dd_verificacionPep: boolean;
  dd_conocimientoNegocio: boolean;
  dd_monitoreoActualizacion: boolean;
  dd_senalesAlertaReporte: boolean;
  aprobadoDebidaDiligencia: boolean;
  fechaAprobacion?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

interface SolicitudSimple {
  id: number;
  consecutivo: string;
  tipo: string;
  estado: string;
  fechaSolicitud: string;
  valorFinal?: number | string | null;
  solicitante: { nombre: string };
}

// ─── DD fields config ─────────────────────────────────────────────────────────

const DD_CHECKS = [
  {
    field: "dd_identificacionContraparte" as const,
    label: "Identificación de la contraparte",
  },
  {
    field: "dd_consultaListasRestrictivas" as const,
    label: "Consulta de listas restrictivas vinculares",
  },
  {
    field: "dd_verificacionPep" as const,
    label: "Verificación de PEP",
  },
  {
    field: "dd_conocimientoNegocio" as const,
    label: "Conocimiento del negocio y perfil de riesgo",
  },
  {
    field: "dd_monitoreoActualizacion" as const,
    label: "Monitoreo continuo y actualización",
  },
  {
    field: "dd_senalesAlertaReporte" as const,
    label: "Señales de alerta y reporte",
  },
];

const TIPO_CONTRATO_LABEL: Record<string, string> = {
  OBRA: "Obra",
  DISENO: "Diseño",
  SERVICIOS: "Servicios",
};

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 shrink-0">
          <Icon size={13} className="text-gray-500" />
        </div>
      )}
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm text-gray-900">
          {value || <span className="text-gray-400 italic">—</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TerceroDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { addToast } = useToast();

  const id = params?.id as string;
  const rol = session?.user?.rol;
  const canEdit = rol === "CONTRATOS" || rol === "ADMIN";

  const [tercero, setTercero] = useState<Tercero | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // DD state (local copy for toggling)
  const [ddState, setDdState] = useState<
    Record<(typeof DD_CHECKS)[number]["field"], boolean>
  >({
    dd_identificacionContraparte: false,
    dd_consultaListasRestrictivas: false,
    dd_verificacionPep: false,
    dd_conocimientoNegocio: false,
    dd_monitoreoActualizacion: false,
    dd_senalesAlertaReporte: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [terceroRes, solRes] = await Promise.all([
        fetch(`/api/terceros/${id}`, { cache: "no-store" }),
        fetch(`/api/solicitudes`, { cache: "no-store" }),
      ]);

      if (terceroRes.status === 404) {
        router.push("/terceros");
        return;
      }

      if (terceroRes.ok) {
        const data: Tercero = await terceroRes.json();
        setTercero(data);
        setDdState({
          dd_identificacionContraparte: data.dd_identificacionContraparte,
          dd_consultaListasRestrictivas: data.dd_consultaListasRestrictivas,
          dd_verificacionPep: data.dd_verificacionPep,
          dd_conocimientoNegocio: data.dd_conocimientoNegocio,
          dd_monitoreoActualizacion: data.dd_monitoreoActualizacion,
          dd_senalesAlertaReporte: data.dd_senalesAlertaReporte,
        });
      }

      if (solRes.ok) {
        const allSols: SolicitudSimple[] = await solRes.json();
        setSolicitudes(
          allSols.filter(
            (s: SolicitudSimple & { terceroId?: number }) =>
              s.terceroId === parseInt(id, 10)
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function toggleDd(field: (typeof DD_CHECKS)[number]["field"]) {
    if (!canEdit) return;
    setDdState((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/terceros/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ddState),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.error ?? "Error al guardar cambios", "error");
        return;
      }

      setTercero(data);
      setDdState({
        dd_identificacionContraparte: data.dd_identificacionContraparte,
        dd_consultaListasRestrictivas: data.dd_consultaListasRestrictivas,
        dd_verificacionPep: data.dd_verificacionPep,
        dd_conocimientoNegocio: data.dd_conocimientoNegocio,
        dd_monitoreoActualizacion: data.dd_monitoreoActualizacion,
        dd_senalesAlertaReporte: data.dd_senalesAlertaReporte,
      });
      addToast("Cambios guardados exitosamente", "success");
    } catch {
      addToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-gray-500">Cargando tercero...</span>
      </div>
    );
  }

  if (!tercero) return null;

  const ddCount = DD_CHECKS.filter((c) => ddState[c.field]).length;
  const ddPct = Math.round((ddCount / 6) * 100);
  const allDdOk = ddCount === 6;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back + header */}
      <div>
        <Link
          href="/terceros"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver a Terceros
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tercero.razonSocial}
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{tercero.nit}</p>
          </div>
          {tercero.aprobadoDebidaDiligencia && (
            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-semibold px-3 py-1.5 rounded-full">
              <ShieldCheck size={15} />
              Debida Diligencia Aprobada
            </span>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Datos básicos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Datos del Tercero</h2>
          <InfoItem label="Razón Social" value={tercero.razonSocial} icon={Building2} />
          <InfoItem label="NIT" value={tercero.nit} icon={CreditCard} />
          <InfoItem
            label="Tipo de Contrato"
            value={TIPO_CONTRATO_LABEL[tercero.tipoContrato] ?? tercero.tipoContrato}
            icon={FileText}
          />
          {tercero.fechaAprobacion && (
            <InfoItem
              label="Fecha de Aprobación DD"
              value={formatDate(tercero.fechaAprobacion)}
              icon={CheckCircle}
            />
          )}
        </div>

        {/* Representante Legal */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Representante Legal
          </h2>
          <InfoItem
            label="Nombre"
            value={tercero.representanteLegal}
            icon={User}
          />
          <InfoItem
            label="Cédula"
            value={tercero.cedulaRepresentante}
            icon={CreditCard}
          />
          <InfoItem
            label="Correo Firma"
            value={tercero.correoFirma}
            icon={Mail}
          />
          <InfoItem
            label="Dirección"
            value={tercero.direccionRepresentante}
            icon={MapPin}
          />
          <InfoItem
            label="Teléfono"
            value={tercero.telefonoRepresentante}
            icon={Phone}
          />
        </div>
      </div>

      {/* Contacto */}
      {(tercero.nombreContacto ||
        tercero.telefonoContacto ||
        tercero.correoContacto) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Contacto Comercial
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoItem
              label="Nombre"
              value={tercero.nombreContacto}
              icon={User}
            />
            <InfoItem
              label="Teléfono"
              value={tercero.telefonoContacto}
              icon={Phone}
            />
            <InfoItem
              label="Correo"
              value={tercero.correoContacto}
              icon={Mail}
            />
          </div>
        </div>
      )}

      {/* Debida Diligencia */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-900">
            Debida Diligencia
          </h2>
          <span className="text-sm text-gray-500">
            {ddCount}/6 verificaciones completadas
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              allDdOk ? "bg-green-500" : ddCount >= 3 ? "bg-blue-500" : "bg-gray-400"
            }`}
            style={{ width: `${ddPct}%` }}
          />
        </div>

        {/* Approved banner */}
        {allDdOk && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <ShieldCheck size={18} className="text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-800">
              APROBADO — Todas las verificaciones de Debida Diligencia están completas.
            </p>
          </div>
        )}

        {/* Checkboxes */}
        <ul className="space-y-2">
          {DD_CHECKS.map(({ field, label }) => {
            const checked = ddState[field];
            return (
              <li key={field}>
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
                    ${canEdit ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}
                    ${checked ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDd(field)}
                    disabled={!canEdit}
                    className="sr-only"
                  />
                  <span className={`shrink-0 ${checked ? "text-green-600" : "text-gray-300"}`}>
                    {checked ? <CheckCircle size={18} /> : <Circle size={18} />}
                  </span>
                  <span
                    className={`text-sm ${
                      checked ? "font-medium text-green-800" : "text-gray-700"
                    }`}
                  >
                    {label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {canEdit && (
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} loading={saving}>
              Guardar cambios
            </Button>
          </div>
        )}
      </div>

      {/* Solicitudes asociadas */}
      {solicitudes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Solicitudes asociadas ({solicitudes.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {["Consecutivo", "Tipo", "Solicitante", "Valor", "Estado", "Fecha", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-600 whitespace-nowrap">
                      {s.consecutivo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {TIPO_SOLICITUD_LABELS[s.tipo] ?? s.tipo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {s.solicitante?.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {s.valorFinal ? formatCurrency(s.valorFinal) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SolicitudBadge estado={s.estado} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(s.fechaSolicitud)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/solicitudes/${s.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
