"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Users, Settings, Plus, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FrenteUsuario {
  userId: string;
  frenteId: number;
  user?: { id: string; nombre: string; rol: string; cargo: string | null };
}

interface Frente {
  id: number;
  nombre: string;
  proyecto: { id: number; nombre: string; activo: boolean };
  aprobadorConfig?: { aprobadorId: string } | null;
  usuarios?: FrenteUsuario[];
}

interface Proyecto {
  id: number;
  nombre: string;
  activo: boolean;
  _count?: { frentes: number };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FrentesPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.rol;

  const [frentes, setFreentes] = useState<Frente[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [proyectoModal, setProyectoModal] = useState(false);
  const [frenteModal, setFrenteModal] = useState(false);
  const [proyectoNombre, setProyectoNombre] = useState("");
  const [frenteNombre, setFrenteNombre] = useState("");
  const [frenteProyectoId, setFrenteProyectoId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fRes, pRes] = await Promise.all([
        fetch("/api/frentes"),
        fetch("/api/proyectos"),
      ]);
      if (!fRes.ok) throw new Error("Error al cargar frentes");
      if (!pRes.ok) throw new Error("Error al cargar proyectos");
      const [fData, pData] = await Promise.all([fRes.json(), pRes.json()]);
      setFreentes(Array.isArray(fData) ? fData : []);
      setProyectos(Array.isArray(pData) ? pData : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function crearProyecto(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: proyectoNombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear proyecto");
      setProyectoModal(false);
      setProyectoNombre("");
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function crearFrente(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/frentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: frenteNombre, proyectoId: frenteProyectoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear frente");
      setFrenteModal(false);
      setFrenteNombre("");
      setFrenteProyectoId("");
      fetchData();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  if (userRole && userRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-sm">
          <Settings size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No tienes permiso para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  // Group frentes by project
  const byProject: Record<string, { proyectoId: number; proyectoNombre: string; activo: boolean; frentes: Frente[] }> = {};
  for (const f of frentes) {
    const key = String(f.proyecto.id);
    if (!byProject[key]) {
      byProject[key] = { proyectoId: f.proyecto.id, proyectoNombre: f.proyecto.nombre, activo: f.proyecto.activo, frentes: [] };
    }
    byProject[key].frentes.push(f);
  }
  // Also include projects that have no frentes yet
  for (const p of proyectos) {
    if (!byProject[String(p.id)]) {
      byProject[String(p.id)] = { proyectoId: p.id, proyectoNombre: p.nombre, activo: p.activo, frentes: [] };
    }
  }
  const projects = Object.values(byProject).sort((a, b) => a.proyectoNombre.localeCompare(b.proyectoNombre));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos y Frentes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona proyectos, frentes y usuarios asignados.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setProyectoNombre(""); setFormError(null); setProyectoModal(true); }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus size={15} />
            Nuevo Proyecto
          </button>
          <button
            onClick={() => { setFrenteNombre(""); setFrenteProyectoId(""); setFormError(null); setFrenteModal(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Nuevo Frente
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : error ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchData} className="text-sm text-blue-600 hover:underline">Reintentar</button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <MapPin size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 italic">No hay proyectos configurados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.proyectoId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Project header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                    <MapPin size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{project.proyectoNombre}</h2>
                    <p className="text-xs text-gray-500">
                      {project.frentes.length} frente{project.frentes.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${project.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {project.activo ? "Activo" : "Inactivo"}
                  </span>
                  <button
                    onClick={() => { setFrenteNombre(""); setFrenteProyectoId(project.proyectoId); setFormError(null); setFrenteModal(true); }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={12} />
                    Agregar frente
                  </button>
                </div>
              </div>

              {/* Frentes */}
              {project.frentes.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-xs text-gray-400 italic">Sin frentes. Usa el botón "Agregar frente" para crear el primero.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {project.frentes.map((frente) => (
                    <div key={frente.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-800 mb-2">{frente.nombre}</h3>
                          {frente.usuarios && frente.usuarios.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Users size={13} className="text-gray-400" />
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Usuarios asignados</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {frente.usuarios.map((fu) => (
                                  <span key={fu.userId} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                                    {fu.user?.nombre ?? fu.userId}
                                    {fu.user?.cargo && <span className="ml-1 text-gray-400">— {fu.user.cargo}</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Sin usuarios asignados</p>
                          )}
                        </div>
                        {frente.aprobadorConfig?.aprobadorId && (
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-gray-400 mb-0.5">Aprobador</p>
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">Configurado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nuevo Proyecto */}
      {proyectoModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setProyectoModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Nuevo Proyecto</h2>
                <button onClick={() => setProyectoModal(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <form onSubmit={crearProyecto} className="px-6 py-4 space-y-4">
                {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Proyecto <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={proyectoNombre}
                    onChange={(e) => setProyectoNombre(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. Residencial Las Palmas"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setProyectoModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving && <Spinner size="sm" />}
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Modal: Nuevo Frente */}
      {frenteModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFrenteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Nuevo Frente</h2>
                <button onClick={() => setFrenteModal(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <form onSubmit={crearFrente} className="px-6 py-4 space-y-4">
                {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Proyecto <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={frenteProyectoId}
                    onChange={(e) => setFrenteProyectoId(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar proyecto...</option>
                    {proyectos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del Frente <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={frenteNombre}
                    onChange={(e) => setFrenteNombre(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. NORTE 1"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setFrenteModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving && <Spinner size="sm" />}
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
