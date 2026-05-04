"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Save, Settings } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Frente {
  id: number;
  nombre: string;
  proyecto: { id: number; nombre: string };
  aprobadorConfig?: { id: number; aprobadorId: string; frenteId: number } | null;
}

interface User {
  id: string;
  nombre: string;
  rol: string;
  cargo: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AprobadoresPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.rol;

  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [directors, setDirectors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-frente selected aprobador state
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [frentesRes, usersRes] = await Promise.all([
        fetch("/api/frentes"),
        fetch("/api/users"),
      ]);
      if (!frentesRes.ok) throw new Error("Error al cargar frentes");
      if (!usersRes.ok) throw new Error("Error al cargar usuarios");

      const [frentesData, usersData]: [Frente[], User[]] = await Promise.all([
        frentesRes.json(),
        usersRes.json(),
      ]);

      const dirs = usersData.filter((u) => u.rol === "DIRECTOR_PROYECTO");
      setFreentes(frentesData);
      setDirectors(dirs);

      // Init selections from current config
      const initial: Record<number, string> = {};
      for (const f of frentesData) {
        if (f.aprobadorConfig?.aprobadorId) {
          initial[f.id] = f.aprobadorConfig.aprobadorId;
        }
      }
      setSelections(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave(frenteId: number) {
    const aprobadorId = selections[frenteId];
    if (!aprobadorId) return;

    setSaving((s) => ({ ...s, [frenteId]: true }));
    setSaveErrors((s) => ({ ...s, [frenteId]: "" }));
    setSaved((s) => ({ ...s, [frenteId]: false }));

    try {
      const res = await fetch("/api/config/aprobadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frenteId, aprobadorId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }
      setSaved((s) => ({ ...s, [frenteId]: true }));
      // Reset saved indicator after 2s
      setTimeout(() => setSaved((s) => ({ ...s, [frenteId]: false })), 2000);
      fetchData();
    } catch (e) {
      setSaveErrors((s) => ({
        ...s,
        [frenteId]: e instanceof Error ? e.message : "Error al guardar",
      }));
    } finally {
      setSaving((s) => ({ ...s, [frenteId]: false }));
    }
  }

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Settings size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No tienes permiso para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  // Group frentes by project
  const byProject: Record<string, { proyectoNombre: string; frentes: Frente[] }> = {};
  for (const f of frentes) {
    const key = String(f.proyecto.id);
    if (!byProject[key]) {
      byProject[key] = { proyectoNombre: f.proyecto.nombre, frentes: [] };
    }
    byProject[key].frentes.push(f);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Aprobadores por Frente
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Asigna qué Director de Proyecto aprueba las solicitudes de cada frente.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={fetchData}
            className="text-sm text-blue-600 hover:underline"
          >
            Reintentar
          </button>
        </div>
      ) : frentes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400 italic">
            No hay frentes configurados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(byProject).map(({ proyectoNombre, frentes: pFreentes }) => (
            <div
              key={proyectoNombre}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">
                  {proyectoNombre}
                </h2>
              </div>
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Frente
                    </th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Director Asignado
                    </th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pFreentes.map((frente) => {
                    const currentAprobadorId = frente.aprobadorConfig?.aprobadorId;
                    const currentDirector = directors.find(
                      (d) => d.id === currentAprobadorId
                    );
                    const selectedId = selections[frente.id] ?? "";

                    return (
                      <tr key={frente.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {frente.nombre}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <select
                              value={selectedId}
                              onChange={(e) =>
                                setSelections((s) => ({
                                  ...s,
                                  [frente.id]: e.target.value,
                                }))
                              }
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                            >
                              <option value="">— Sin asignar —</option>
                              {directors.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.nombre}
                                  {d.cargo ? ` — ${d.cargo}` : ""}
                                </option>
                              ))}
                            </select>
                            {currentDirector && !saving[frente.id] && !saved[frente.id] && (
                              <p className="text-xs text-gray-400">
                                Actual: {currentDirector.nombre}
                              </p>
                            )}
                            {saveErrors[frente.id] && (
                              <p className="text-xs text-red-500">
                                {saveErrors[frente.id]}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleSave(frente.id)}
                            disabled={saving[frente.id] || !selectedId}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {saving[frente.id] ? (
                              <Spinner size="sm" />
                            ) : saved[frente.id] ? (
                              "Guardado"
                            ) : (
                              <>
                                <Save size={12} />
                                Guardar
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
