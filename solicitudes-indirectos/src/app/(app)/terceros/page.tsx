"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Search, Users, CheckCircle, Clock,
  Eye, Pencil, RefreshCw, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tercero {
  id: number;
  razonSocial: string;
  nit: string;
  tipoContrato: string;
  confidencialidad: boolean;           // ← NUEVO
  dd_identificacionContraparte: boolean;
  dd_consultaListasRestrictivas: boolean;
  dd_verificacionPep: boolean;
  dd_conocimientoNegocio: boolean;
  dd_monitoreoActualizacion: boolean;
  dd_senalesAlertaReporte: boolean;
  aprobadoDebidaDiligencia: boolean;
}

const DD_FIELDS = [
  "dd_identificacionContraparte",
  "dd_consultaListasRestrictivas",
  "dd_verificacionPep",
  "dd_conocimientoNegocio",
  "dd_monitoreoActualizacion",
  "dd_senalesAlertaReporte",
] as const;

function ddCount(t: Tercero): number {
  return DD_FIELDS.filter((f) => t[f]).length;
}

const TIPO_CONTRATO_LABEL: Record<string, string> = {
  OBRA: "Obra",
  DISENO: "Diseño",
  SERVICIOS: "Servicios",
  PROYECTOS: "Proyectos",
  LICITACIONES: "Licitaciones",
};

// ─── Toast simple ─────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

let toastId = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function TercerosPage() {
  const { data: session } = useSession();
  const rol = session?.user?.rol;
  const canEdit = rol === "CONTRATOS" || rol === "ADMIN";

  const [terceros, setTerceros]   = useState<Tercero[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [search, setSearch]       = useState("");
  const [toasts, setToasts]       = useState<Toast[]>([]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const addToast = (type: Toast["type"], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchTerceros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/terceros", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTerceros(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTerceros(); }, [fetchTerceros]);

  // ── Sync SharePoint ───────────────────────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/terceros/sync-sharepoint", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        addToast("success", data.message);
        await fetchTerceros();          // recargar tabla
      } else {
        addToast("error", data.message ?? "Error al sincronizar");
      }
    } catch {
      addToast("error", "No se pudo conectar con el servidor");
    } finally {
      setSyncing(false);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────────

  const filtered = terceros.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.razonSocial.toLowerCase().includes(q) ||
      t.nit.toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg text-white
              ${t.type === "success" ? "bg-green-600" : "bg-red-600"}`}
          >
            {t.type === "success" ? <CheckCircle size={15} className="mt-0.5 shrink-0" /> : <X size={15} className="mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Terceros / Debida Diligencia
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de proveedores y contratistas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar SharePoint"}
          </Button>
          <Link href="/terceros/nuevo">
            <Button>
              <Plus size={16} />
              Nuevo Tercero
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón social o NIT..."
            className="block w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm
              text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2
              focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
            <span className="ml-3 text-sm text-gray-500">Cargando terceros...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <Users size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {search ? "No se encontraron terceros" : "Sin terceros registrados"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {search
                ? "Prueba con otro término de búsqueda."
                : "Registra el primer tercero o sincroniza desde SharePoint."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {[
                    "Razón Social",
                    "Tipo Contrato",
                    "DD Progress",
                    "Debida Diligencia",
                    "Confidencialidad",
                    "Acciones",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => {
                  const count = ddCount(t);
                  const pct   = Math.round((count / 6) * 100);

                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{t.razonSocial}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {TIPO_CONTRATO_LABEL[t.tipoContrato] ?? t.tipoContrato}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                count === 6 ? "bg-green-500" : count >= 3 ? "bg-blue-500" : "bg-gray-400"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">{count}/6</span>
                        </div>
                      </td>

                      {/* Debida Diligencia badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.aprobadoDebidaDiligencia ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 rounded-full px-2.5 py-0.5">
                            <CheckCircle size={11} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5">
                            <X size={11} /> No
                          </span>
                        )}
                      </td>

                      {/* Confidencialidad badge — NUEVO */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.confidencialidad ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5">
                            <CheckCircle size={11} /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5">
                            <X size={11} /> No
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/terceros/${t.id}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <Eye size={13} /> Ver Detalle
                          </Link>
                          {canEdit && (
                            <Link
                              href={`/terceros/${t.id}`}
                              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                            >
                              <Pencil size={12} /> Editar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}