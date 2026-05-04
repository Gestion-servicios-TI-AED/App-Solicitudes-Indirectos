"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { SolicitudBadge } from "@/components/solicitudes/SolicitudBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  ESTADO_LABELS,
  TIPO_SOLICITUD_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SolicitudRow {
  id: number;
  consecutivo: string;
  tipo: string;
  frentesIds: number[];
  tercero?: { razonSocial: string; nit: string } | null;
  solicitante: { nombre: string };
  valorFinal?: number | string | null;
  estado: string;
  fechaSolicitud: string;
}

// ─── Filter options ───────────────────────────────────────────────────────────

const ESTADO_OPTIONS = [
  { value: "", label: "Todos los estados" },
  ...Object.entries(ESTADO_LABELS).map(([value, label]) => ({ value, label })),
];

const TIPO_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  ...Object.entries(TIPO_SOLICITUD_LABELS).map(([value, label]) => ({ value, label })),
];

const PAGE_SIZE = 15;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SolicitudesPage() {
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterEstado, setFilterEstado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEstado) params.set("estado", filterEstado);
      if (filterTipo) params.set("tipo", filterTipo);

      const res = await fetch(`/api/solicitudes?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setSolicitudes(Array.isArray(data) ? data : []);
      }
    } catch {
      // Keep existing list on error
    } finally {
      setLoading(false);
    }
  }, [filterEstado, filterTipo]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [filterEstado, filterTipo, search]);

  // Client-side search filter
  const filtered = solicitudes.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.consecutivo.toLowerCase().includes(q) ||
      (s.tercero?.razonSocial ?? "").toLowerCase().includes(q) ||
      (s.tercero?.nit ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Solicitudes</h1>
        <Link href="/solicitudes/nueva">
          <Button>
            <Plus size={16} />
            Nueva Solicitud
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por consecutivo o tercero..."
              className="block w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm
                text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2
                focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="w-52">
          <Select
            options={ESTADO_OPTIONS}
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            placeholder="Estado"
          />
        </div>

        <div className="w-64">
          <Select
            options={TIPO_OPTIONS}
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            placeholder="Tipo"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
            <span className="ml-3 text-sm text-gray-500">Cargando solicitudes...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-3">
              <FileText size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              No se encontraron solicitudes
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {search || filterEstado || filterTipo
                ? "Prueba ajustando los filtros de búsqueda."
                : "Crea tu primera solicitud."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  {[
                    "Consecutivo",
                    "Tipo",
                    "Frente(s)",
                    "Tercero",
                    "Solicitante",
                    "Valor",
                    "Estado",
                    "Fecha",
                    "",
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
                {paginated.map((sol) => (
                  <tr
                    key={sol.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/solicitudes/${sol.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono font-semibold text-blue-600">
                        {sol.consecutivo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[180px]">
                      <span className="block truncate">
                        {TIPO_SOLICITUD_LABELS[sol.tipo] ?? sol.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {sol.frentesIds.length > 0
                        ? `${sol.frentesIds.length} frente${sol.frentesIds.length !== 1 ? "s" : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[180px]">
                      <span className="block truncate">
                        {sol.tercero?.razonSocial ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {sol.solicitante.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {sol.valorFinal ? formatCurrency(sol.valorFinal) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SolicitudBadge estado={sol.estado} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(sol.fechaSolicitud)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Link
                        href={`/solicitudes/${sol.id}`}
                        onClick={(e) => e.stopPropagation()}
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
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Mostrando {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, filtered.length)} de{" "}
              {filtered.length} resultados
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                <ChevronLeft size={14} />
                Anterior
              </Button>
              <span className="text-xs text-gray-600 font-medium">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Siguiente
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
